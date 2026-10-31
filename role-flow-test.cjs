const assert = require('node:assert/strict');
const WebSocket = require('ws');
const clients = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(check) {
  for (let i = 0; i < 400; i++) { if (check()) return; await delay(30); }
  throw Error('Timed out waiting for authoritative state');
}
function send(client, message) { client.ws.send(JSON.stringify(message)); }
async function match(overrides, count) {
  const room = `AUDIT${Date.now()}`;
  const group = [];
  for (let i = 0; i < count; i++) {
    const client = { id: `${room}_${i}`, ws: new WebSocket(process.env.WS_URL || 'ws://localhost:3112'), state: null };
    clients.push(client); group.push(client);
    client.ws.on('message', (raw) => { const msg = JSON.parse(raw); if (msg.type === 'room:state') client.state = msg.state; });
    await new Promise((resolve, reject) => { client.ws.once('open', resolve); client.ws.once('error', reject); });
    send(client, { type: 'room:join', playerId: client.id, playerName: `Player ${i}`, roomCode: room });
    await wait(() => client.state);
  }
  send(group[0], { type: 'room:set-player-count', targetCount: count });
  await wait(() => group[0].state.maxPlayers === count);
  const keys = ['werewolf', 'alpha_wolf', 'white_wolf', 'cursed_wolf', 'seer', 'aura_seer', 'bodyguard', 'witch', 'hunter', 'cupid', 'elder', 'little_girl', 'mayor', 'jester'];
  send(group[0], { type: 'room:update-deck', roleDeck: { ...Object.fromEntries(keys.map((key) => [key, 0])), ...overrides } });
  for (const client of group.slice(1)) send(client, { type: 'player:toggle-ready', isReady: true });
  await wait(() => group[0].state.players.every((p) => p.isHost || p.isReady));
  send(group[0], { type: 'game:start' });
  await wait(() => group.every((c) => c.state.phase === 'role_reveal'));
  const role = (name) => group.filter((c) => c.state.players.find((p) => p.id === c.id).role === name);
  send(group[0], { type: 'game:enter-night' });
  await wait(() => group.every((c) => c.state.phase === 'night'));
  return { group, role };
}
async function action(client, actionType, target, lovers) {
  send(client, { type: 'game:night-action', actionType, targetId: target?.id, lovers });
  await wait(() => client.state.myNightActionSubmitted || client.state.phase !== 'night');
}
(async () => {
  const { group, role } = await match({ werewolf: 1, seer: 2, aura_seer: 1, bodyguard: 2, witch: 2, hunter: 2, cupid: 1, elder: 1, little_girl: 1, mayor: 1 }, 15);
  const [wolf] = role('werewolf'), [seer1, seer2] = role('seer'), [aura] = role('aura_seer'), [witch1, witch2] = role('witch'), [elder] = role('elder');
  send(seer1, { type: 'game:night-action', actionType: 'seer', targetId: 'missing' });
  await delay(100); assert.equal(seer1.state.myNightActionSubmitted, false);
  await action(seer1, 'seer', wolf); await action(seer2, 'seer', elder); await action(aura, 'aura_seer', witch1);
  assert.equal(seer1.state.seerInspection.targetId, wolf.id); assert.equal(seer2.state.seerInspection.targetId, elder.id);
  assert.equal(wolf.state.seerInspection, null); assert.deepEqual(wolf.state.nightRecaps, []);
  await action(wolf, 'werewolf', elder);
  for (const guard of role('bodyguard')) await action(guard, 'bodyguard', witch1);
  await action(witch1, 'poison', wolf); await action(witch2, 'heal');
  for (const hunter of role('hunter')) await action(hunter, 'hunter', elder);
  const [cupid] = role('cupid'); await action(cupid, 'cupid', null, [elder.id, aura.id]);
  const [girl] = role('little_girl'); await action(girl, 'little_girl_peek');
  await wait(() => group.every((c) => c.state.phaseTransition?.to === 'day'));
  assert.equal(group[0].state.phaseTransition.endsAt - group[0].state.phaseTransition.startedAt, 5000);
  assert.ok(group.every((c) => c.state.phase === 'night'));
  await delay(1000); assert.equal(group[0].state.phase, 'night');
  await wait(() => group.every((c) => c.state.phase === 'ended'));
  const result = group[0].state;
  assert.equal(result.winner, 'villagers'); assert.equal(result.nightRecaps.length, 1);
  assert.equal(result.players.find((p) => p.id === wolf.id).deathPeriod, 'night');
  assert.equal(result.players.find((p) => p.id === elder.id).isAlive, true);
  assert.equal(witch1.state.witchState.hasPoisonPotion, false); assert.equal(witch2.state.witchState.hasPoisonPotion, true);
  assert.ok(girl.state.littleGirlClue); assert.equal(wolf.state.littleGirlClue, null);
  send(group[0], { type: 'game:reset-lobby' }); await wait(() => group[0].state.phase === 'lobby');
  assert.deepEqual(group[0].state.nightRecaps, []);
  console.log('PASS: independent inspections/potions, invalid targets rejected, private clues, night death, recap only after end, reset clears recap.');

  const second = await match({ werewolf: 1, hunter: 2 }, 7);
  const [w] = second.role('werewolf'), [h1, h2] = second.role('hunter'), villagers = second.role('villager');
  await action(w, 'werewolf', villagers[0]); await action(h1, 'hunter', h2); await action(h2, 'hunter', villagers[1]);
  await wait(() => second.group[0].state.phase === 'day_discussion');
  for (const c of second.group) if (c.state.players.find((p) => p.id === c.id).isAlive) send(c, { type: 'game:submit-vote', targetId: h1.id });
  await wait(() => second.group[0].state.phase === 'day_trial');
  for (const c of second.group) if (c.id !== h1.id && c.state.players.find((p) => p.id === c.id).isAlive) send(c, { type: 'game:submit-trial-vote', choice: 'kill' });
  await wait(() => second.group[0].state.phaseTransition?.to === 'night');
  assert.equal(second.group[0].state.phaseTransition.from, 'dusk');
  assert.ok(second.group.every((c) => c.state.phase === 'day_trial'));
  send(second.group[0], { type: 'game:resolve-trial' });
  await delay(1000); assert.equal(second.group[0].state.phase, 'day_trial');
  await wait(() => second.group[0].state.phase === 'night' && !second.group[0].state.phaseTransition);
  for (const id of [h1.id, h2.id, villagers[1].id]) assert.equal(second.group[0].state.players.find((p) => p.id === id).deathPeriod, 'day');
  const livingVillager = second.group[0].state.players.find((p) => p.isAlive && p.role === 'villager');
  await action(w, 'werewolf', { id: livingVillager.id });
  await wait(() => second.group[0].state.phase === 'ended');
  assert.equal(second.group[0].state.nightRecaps.length, 2);
  assert.ok(second.group[0].state.nightRecaps[0].lines.some((line) => line.startsWith('Ban ngày:')));
  console.log('PASS: daytime Hunter revenge chain, correct day/night metadata, two-night recap with daytime trial.');
  const third = await match({ werewolf: 1, seer: 1 }, 5);
  await action(third.role('werewolf')[0], 'skip_night_role');
  await action(third.role('seer')[0], 'skip_night_role');
  await wait(() => third.group[0].state.phase === 'day_discussion');
  for (const c of third.group) send(c, { type: 'game:submit-vote', targetId: 'skip' });
  await wait(() => third.group[0].state.phaseTransition?.to === 'night');
  assert.equal(third.group[0].state.phaseTransition.from, 'day');
  const locked = third.group[0].state.dayVotes[third.group[0].id];
  send(third.group[0], { type: 'game:submit-vote', targetId: third.group[1].id });
  await delay(200); assert.equal(third.group[0].state.dayVotes[third.group[0].id], locked);
  await wait(() => third.group[0].state.phase === 'night');
  assert.equal(third.group[0].state.dayNumber, 2);
  await action(third.role('werewolf')[0], 'skip_night_role');
  await action(third.role('seer')[0], 'skip_night_role');
  await wait(() => third.group[0].state.phaseTransition);
  send(third.group[0], { type: 'game:reset-lobby' });
  await wait(() => third.group[0].state.phase === 'lobby');
  await delay(5200);
  assert.equal(third.group[0].state.phase, 'lobby');
  assert.equal(third.group[0].state.phaseTransition, null);
  console.log('PASS: 5-second no-accused transition, votes locked, reset cancels pending countdown.');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => clients.forEach((client) => client.ws.close()));
