import test from 'node:test';
import assert from 'node:assert/strict';
import { newlyDeadPlayers, deathNotice } from './deathNotifications';

test('notifies only newly deceased players, without revealing their role', () => {
  const previous = new Map([['a', true], ['b', false], ['c', true]]);
  const players = [{ id: 'a', name: 'Lan', isAlive: false }, { id: 'b', name: 'Minh', isAlive: false }, { id: 'c', name: 'Anh', isAlive: true }];
  assert.deepEqual(newlyDeadPlayers(previous, players).map((p) => p.id), ['a']);
  assert.equal(deathNotice(players[0]), 'Lan đã qua đời.');
});
