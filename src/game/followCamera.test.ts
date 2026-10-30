import test from 'node:test';
import assert from 'node:assert/strict';
import { followCameraPose } from './followCamera';

test('follow camera stays anchored to the local player as they move and look around', () => {
  const a = followCameraPose(10, -5, 0, 0);
  const b = followCameraPose(14, -2, 0, 0);
  assert.equal(b.x - a.x, 4);
  assert.equal(b.z - a.z, 3);
  assert.equal(b.lookX - a.lookX, 4);
  assert.equal(b.lookZ - a.lookZ, 3);
  const turned = followCameraPose(10, -5, Math.PI / 2, 0);
  assert.ok(turned.x > 10 && turned.lookX < 10);
});
