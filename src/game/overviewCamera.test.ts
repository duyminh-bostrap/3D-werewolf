import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleOverview } from './followCamera';

test('overview returns to the previous player camera', () => {
  assert.equal(toggleOverview('first', 'first'), 'overview');
  assert.equal(toggleOverview('overview', 'first'), 'first');
  assert.equal(toggleOverview('overview', 'follow'), 'follow');
});
