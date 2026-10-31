import test from 'node:test';
import assert from 'node:assert/strict';
import { chatChannels } from './chatChannels';
import { type PlayerState } from './rules';

const player = (id: string, role: PlayerState['role'], isAlive = true) => ({ id, role, isAlive } as PlayerState);
test('lobby is public and daytime supports public chat plus authorized teams', () => {
  const lovers: [string, string] = ['a', 'b'];
  assert.deepEqual(chatChannels('lobby', player('a', 'werewolf'), lovers), ['global']);
  assert.deepEqual(chatChannels('day_discussion', player('a', 'werewolf'), lovers), ['global', 'wolves', 'cupid']);
  assert.deepEqual(chatChannels('day_discussion', player('c', 'cupid'), lovers), ['global', 'cupid']);
  assert.deepEqual(chatChannels('day_discussion', player('d', 'villager'), lovers), ['global']);
});
test('night excludes public chat; Cupid and both lovers share their channel only after pairing', () => {
  const lovers: [string, string] = ['a', 'b'];
  for (const id of ['a', 'b']) assert.deepEqual(chatChannels('night', player(id, 'villager'), lovers), ['cupid']);
  assert.deepEqual(chatChannels('night', player('c', 'cupid'), lovers), ['cupid']);
  assert.deepEqual(chatChannels('night', player('c', 'cupid'), null), []);
  assert.deepEqual(chatChannels('night', player('d', 'villager'), lovers), []);
  assert.deepEqual(chatChannels('night', player('w', 'werewolf'), lovers), ['wolves']);
  assert.deepEqual(chatChannels('night', player('w', 'werewolf', false), lovers), []);
});
