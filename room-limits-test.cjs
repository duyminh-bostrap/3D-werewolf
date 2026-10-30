const WebSocket = require('ws');
const assert = require('node:assert/strict');
const clients = [];
const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function join(id, room) {
  const c = { ws: new WebSocket('ws://localhost:3112'), state: null, error: null };
  clients.push(c);
  c.ws.on('message', raw => { const m = JSON.parse(raw); if (m.type === 'room:state') c.state = m.state; if (m.type === 'room:error') c.error = m.message; });
  await new Promise(r => c.ws.once('open', r));
  c.ws.send(JSON.stringify({ type: 'room:join', playerId: id, playerName: id, roomCode: room }));
  await wait(() => c.state || c.error);
  return c;
}
async function wait(fn) { for (let i=0; i<100; i++) { if (fn()) return; await delay(30); } throw Error('timeout'); }
const send = (c, data) => c.ws.send(JSON.stringify(data));
(async () => {
  const room = 'LIMIT_' + Date.now();
  const host = await join('host', room);
  assert.equal(host.state.players.length, 1);
  assert.equal(host.state.players.some(p => p.isBot), false);
  send(host, { type: 'room:set-player-count', targetCount: 15 });
  await delay(120);
  assert.equal(host.state.players.length, 1);
  for (let i=1; i<15; i++) await join('p'+i, room);
  await wait(() => host.state.players.length === 15);
  const rejected = await join('extra', room);
  assert.ok(rejected.error);
  send(host, { type: 'room:add-bot' });
  await delay(120);
  assert.equal(host.state.players.length, 15);
  console.log('PASS: 1 real player, capacity changes never add AI, 16th player rejected, AI cannot exceed 15.');
  const smallRoom = room + 'S';
  const small = [];
  for (let i=0; i<4; i++) { const c = await join('s'+i, smallRoom); small.push(c); if (i) send(c, { type:'player:toggle-ready', isReady:true }); }
  send(small[0], {type:'game:start'}); await delay(150);
  assert.equal(small[0].state.phase, 'lobby');
  const fifth = await join('s4', smallRoom); send(fifth,{type:'player:toggle-ready',isReady:true});
  await wait(() => small[0].state.players.filter(p => p.isHost || p.isReady).length === 5);
  send(small[0],{type:'game:start'}); await wait(() => small[0].state.phase === 'role_reveal');
  console.log('PASS: 4 cannot start, 5 ready players can start without filling the room.');
})().catch(e => { console.error(e); process.exitCode=1; }).finally(() => { for (const c of clients) c.ws.close(); });
