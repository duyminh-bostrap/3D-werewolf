import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTrialVisual } from './trialVisual';

test('only a guilty verdict keeps the gallows visible for the execution effect', () => {
  const trial = advanceTrialVisual(null, 'day_trial', 'p1', true, 0);
  assert.equal(trial?.playerId, 'p1');
  const executed = advanceTrialVisual(trial, 'night', null, false, 1);
  assert.equal(executed?.executedAt, 1);
  assert.equal(advanceTrialVisual(executed, 'night', null, false, 5), null);
  assert.equal(advanceTrialVisual(trial, 'night', null, true, 1), null);
});
