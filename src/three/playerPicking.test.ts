import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayerHitbox, selectableHit } from './playerPicking';

test('player hitbox covers the body without selecting the surrounding empty space', () => {
  const body = createPlayerHitbox('other'); body.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0.4, 1.3, 5), new THREE.Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(body).length > 0, true);
  ray.ray.origin.x = 0.8;
  assert.equal(ray.intersectObject(body).length, 0);
  body.geometry.dispose(); (body.material as THREE.Material).dispose();
});
test('self never blocks selecting others; an explicitly tapped name takes priority over a body', () => {
  const self = new THREE.Object3D(); self.userData.playerId = 'me';
  const other = new THREE.Object3D(); other.userData.playerId = 'other';
  const label = new THREE.Object3D(); label.userData = { playerId: 'named', isPlayerLabel: true };
  const hit = (object: THREE.Object3D, distance: number): THREE.Intersection => ({ object, distance, point: new THREE.Vector3() });
  assert.equal(selectableHit([hit(self, 1), hit(other, 2)], 'me')?.object, other);
  assert.equal(selectableHit([hit(self, 1), hit(other, 2), hit(label, 3)], 'me')?.object, label);
  assert.equal(selectableHit([hit(self, 1)], 'me'), undefined);
});
