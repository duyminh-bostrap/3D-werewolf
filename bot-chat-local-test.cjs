const assert = require('node:assert/strict');
const WebSocket = require('ws');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const client = { ws: new WebSocket(process.env.WS_URL || 'ws://localhost:3112'), state: null };
const send = message => client.ws.send(JSON.stringify(message));
async function wait(check, timeout = 12000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (check()) return; await delay(40); }
  throw Error('Timed out waiting for bot chat state');
}
client.ws.on('message', raw => { const message = JSON.parse(raw); if (message.type === 'room:state') client.state = message.state; });
async function enterDay() {
  send({type:'game:start',preferredRole:'werewolf'});
  await wait(() => client.state.phase === 'role_reveal');
  assert.equal(client.state.players.find(p => p.id === 'host').role, 'werewolf');
  send({type:'game:enter-night'});
  await wait(() => client.state.phase === 'night');
  send({type:'game:night-action',actionType:'skip_night_role'});
  await wait(() => client.state.phase === 'day_discussion');
}
(async () => {
  await new Promise((resolve,reject) => {client.ws.once('open',resolve);client.ws.once('error',reject);});
  send({type:'room:join',roomCode:`BOTCHAT${Date.now()}`,playerId:'host',playerName:'Local test'});
  await wait(() => client.state);
  send({type:'room:set-player-count',targetCount:5});
  const roles = ['alpha_wolf','white_wolf','cursed_wolf','seer','aura_seer','bodyguard','witch','hunter','cupid','elder','little_girl','mayor','jester'];
  send({type:'room:update-deck',roleDeck:{...Object.fromEntries(roles.map(role=>[role,0])),werewolf:1}});
  for(let i=0;i<4;i++) send({type:'room:add-bot'});
  await wait(() => client.state.players.length === 5);
  const botIds = new Set(client.state.players.filter(p=>p.isBot).map(p=>p.id));
  const chats = () => client.state.messages.filter(m=>botIds.has(m.senderId));
  await enterDay();
  await wait(() => chats().length === 1);
  send({type:'game:reset-lobby'});
  await wait(() => client.state.phase === 'lobby');
  const afterReset = chats().length;
  await delay(4800);
  assert.equal(chats().length,afterReset,'pending discussion must stop after reset');
  console.log('PASS: bots send real global chat and stop pending discussion after reset.');
  await enterDay();
  await wait(() => chats().length === afterReset + 4, 20000);
  const discussion = chats().slice(afterReset);
  assert.equal(new Set(discussion.map(m=>m.senderId)).size,4);
  assert.ok(discussion.every(m=>m.channel === 'global' && m.text.length > 20));
  assert.equal(client.state.phase,'day_discussion');
  console.log('PASS: all four living bots discuss in turn, with public messages visible in the room.');
  send({type:'game:reset-lobby'});
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>client.ws.close());
