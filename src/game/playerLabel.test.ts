import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayerLabelSprite } from '../three/proceduralAssets';

test('night nameplates stay readable and only living speakers receive a separate mic indicator', () => {
  const original = globalThis.document;
  const context = new Proxy({}, { get: () => () => {} });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) } as unknown as Document;
  try {
    for (const [alive, speaking] of [[true, true], [true, false], [false, true]]) {
      const label = createPlayerLabelSprite('Mike', '', 0, alive, speaking, 0, true, false, true, true);
      assert.equal(label.material.fog, false);
      assert.equal(label.material.toneMapped, false);
      assert.equal(label.material.depthTest, true);
      const mic = label.getObjectByName('speaking_mic') as THREE.Sprite | undefined;
      assert.equal(Boolean(mic), alive && speaking);
      if (mic) {
        assert.equal(mic.material.fog, false);
        assert.equal(mic.material.transparent, true);
      }
      label.traverse((object) => {
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
    }
    const bubble = createPlayerLabelSprite('Lan', '', 0, true, true, 0, false, false, true, false, 'Xin chào mọi người');
    assert.equal(bubble.material.fog, false);
    assert.equal(bubble.scale.y, 3 * 94 / 384);
    assert.ok(bubble.position.y - bubble.scale.y / 2 > 2.95);
    assert.ok(bubble.getObjectByName('speaking_mic'));
    bubble.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
  } finally {
    globalThis.document = original;
  }
});
