import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_CATALOG, isWolfPackRole, type RoleId } from './rules';
import { canUseVoice, canShareVoice } from './voiceChannel';

test('night voice is private to living pack members across every role pair', () => {
  for (const role of Object.keys(ROLE_CATALOG) as RoleId[]) {
    const a = { role, isAlive: true };
    assert.equal(canUseVoice('night', a), isWolfPackRole(role));
    assert.equal(canUseVoice('night', { ...a, isAlive: false }), false);
    for (const other of Object.keys(ROLE_CATALOG) as RoleId[]) {
      const b = { role: other, isAlive: true };
      assert.equal(canShareVoice('night', a, b), isWolfPackRole(role) && isWolfPackRole(other));
      assert.equal(canShareVoice('day_discussion', a, b), true);
      assert.equal(canShareVoice('night', a, { ...b, isAlive: false }), false);
    }
  }
  assert.equal(canShareVoice('night', undefined, undefined), false);
});

test('day restores voice eligibility without allowing dead players to speak', () => {
  const villager = { role: 'villager' as const, isAlive: true };
  for (const phase of ['lobby', 'day_discussion', 'day_voting', 'day_trial', 'ended'] as const) {
    assert.equal(canUseVoice(phase, villager), true);
    assert.equal(canUseVoice(phase, { ...villager, isAlive: false }), false);
  }
});
