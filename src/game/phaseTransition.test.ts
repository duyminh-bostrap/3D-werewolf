import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentStage, PHASE_TRANSITION_MS, transitionProgress } from './phaseTransition';

test('night, defense and daytime select distinct environment stages', () => {
  assert.equal(environmentStage('night'), 'night');
  assert.equal(environmentStage('role_reveal'), 'night');
  assert.equal(environmentStage('day_trial'), 'dusk');
  assert.equal(environmentStage('day_discussion'), 'day');
  assert.equal(environmentStage('day_voting'), 'day');
});
test('all environment changes use the same five-second, clamped smooth countdown', () => {
  const t = { from: 'night' as const, to: 'day' as const, startedAt: 10000, endsAt: 10000 + PHASE_TRANSITION_MS };
  assert.equal(transitionProgress(t, 9000), 0);
  assert.equal(transitionProgress(t, 10000), 0);
  assert.equal(transitionProgress(t, 12500), 0.5);
  assert.equal(transitionProgress(t, 15000), 1);
  assert.equal(transitionProgress(t, 16000), 1);
  for (let now = 10000; now < 15000; now += 100) assert.ok(transitionProgress(t, now) <= transitionProgress(t, now + 100));
});
