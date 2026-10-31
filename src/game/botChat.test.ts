import test from 'node:test';
import assert from 'node:assert/strict';
import { botChatText } from './botChat';

const bot = { id: 'bot', name: 'Corvus', isAlive: true, isBot: true, seatIndex: 1 };
const human = { id: 'human', name: 'Lan', isAlive: true, isBot: false, seatIndex: 0 };
test('bots discuss public names, votes and deaths without needing hidden role information', () => {
  const players = [bot, human, { ...human, id: 'dead', name: 'Silas', isAlive: false }];
  assert.match(botChatText(bot, players, {bot: 'human'}, 2, 2)!, /Lan/);
  assert.match(botChatText(bot, players, {}, 2, 3)!, /Silas/);
  assert.equal(botChatText({...bot, isAlive:false}, players, {}, 2, 0), null);
  assert.equal(botChatText(human, players, {}, 2, 0), null);
  assert.equal(botChatText(bot, [bot], {}, 2, 0), null);
});
test('only the living accused bot sends its defense', () => {
  assert.match(botChatText(bot, [bot, human], {}, 1, 0, 'bot')!, /bằng chứng/);
  assert.equal(botChatText(bot, [bot, human], {}, 1, 0, 'human'), null);
  assert.equal(botChatText({...bot,isAlive:false}, [bot, human], {}, 1, 0, 'bot'), null);
});
