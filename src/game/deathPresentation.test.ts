import test from 'node:test';
import assert from 'node:assert/strict';
import { deathPresentation } from './deathPresentation';
import type { PlayerState } from './rules';

test('death appearance uses recorded time of death, even when the current phase has advanced', () => {
  const day = deathPresentation({ deathPeriod: 'day', deathRound: 2 } as PlayerState);
  const night = deathPresentation({ deathPeriod: 'night', deathRound: 2 } as PlayerState);
  assert.notEqual(day.color, night.color);
  assert.match(day.caption, /ban ngày.*Ngày 2/);
  assert.match(night.caption, /ban đêm.*Đêm 2/);
});
