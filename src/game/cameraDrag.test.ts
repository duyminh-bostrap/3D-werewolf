import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraDrag } from './cameraDrag';

test('camera drag tracks its own pointer and distinguishes a swipe from a tap', () => {
  const drag = new CameraDrag();
  drag.start(1, 100, 100);
  assert.equal(drag.move(2, 400, 100), null);
  assert.deepEqual(drag.move(1, 120, 100), { dx: 20, dy: 0 });
  assert.equal(drag.end(2, 400, 100), null);
  assert.equal(drag.end(1, 120, 100), false);
  drag.start(3, 10, 10);
  assert.equal(drag.end(3, 11, 11), true);
});
