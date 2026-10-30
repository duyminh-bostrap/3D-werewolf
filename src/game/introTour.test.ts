import test from 'node:test';
import assert from 'node:assert/strict';
import { introTourAngle, INTRO_TOUR_SECONDS } from './introTour';

test('intro camera makes exactly one full turn and stops at the starting view', () => {
  assert.equal(introTourAngle(0), 0);
  assert.ok(Math.abs(introTourAngle(INTRO_TOUR_SECONDS / 2) - Math.PI) < 1e-10);
  assert.ok(Math.abs(introTourAngle(INTRO_TOUR_SECONDS) - 2 * Math.PI) < 1e-10);
  assert.equal(introTourAngle(INTRO_TOUR_SECONDS + 2), introTourAngle(INTRO_TOUR_SECONDS));
});
