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
  } finally {
    globalThis.document = original;
  }
});
