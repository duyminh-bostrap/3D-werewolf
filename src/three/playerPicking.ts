import * as THREE from 'three';

export function createPlayerHitbox(playerId: string): THREE.Mesh {
  const hitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.6, 10), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.position.y = 1.3;
  hitbox.userData.playerId = playerId;
  return hitbox;
}

export function selectableHit(hits: THREE.Intersection[], localPlayerId: string): THREE.Intersection | undefined {
  const others = hits.filter((hit) => hit.object.userData.playerId !== localPlayerId);
  return others.find((hit) => hit.object.userData.isPlayerLabel) ?? others[0];
}
