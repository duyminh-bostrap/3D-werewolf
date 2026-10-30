import test from 'node:test';
import assert from 'node:assert/strict';
import { canSeeWolfOutline } from './wolfOutline';

test('wolf teammate outlines are visible only to living wolves at night', () => {
  const viewer = { id: 'a', role: 'werewolf' as const, isAlive: true };
  const ally = { id: 'b', role: 'alpha_wolf' as const, isAlive: true };
  assert.equal(canSeeWolfOutline('night', viewer, ally), true);
  assert.equal(canSeeWolfOutline('day_discussion', viewer, ally), false);
  assert.equal(canSeeWolfOutline('night', { ...viewer, role: 'villager' }, ally), false);
  assert.equal(canSeeWolfOutline('night', { ...viewer, isAlive: false }, ally), false);
  assert.equal(canSeeWolfOutline('night', viewer, viewer), false);
});
