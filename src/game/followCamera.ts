export function followCameraPose(x: number, z: number, yaw: number, pitch: number) {
  const angle = Math.max(-0.45, Math.min(0.75, 0.24 + pitch * 0.2));
  const distance = 5.2;
  const horizontal = Math.cos(angle) * distance;
  const eyeY = 1.65;
  return {
    x: x + Math.sin(yaw) * horizontal,
    y: eyeY + Math.sin(angle) * distance,
    z: z + Math.cos(yaw) * horizontal,
    lookX: x - Math.sin(yaw) * 2,
    lookY: eyeY - Math.tan(angle) * 2,
    lookZ: z - Math.cos(yaw) * 2,
  };
}
import type { CameraPreset } from '../three/GothicVillageScene';
export function toggleOverview(current: CameraPreset, previous: 'first' | 'follow'): CameraPreset {
  return current === 'overview' ? previous : 'overview';
}
