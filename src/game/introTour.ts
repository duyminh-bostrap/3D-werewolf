export const INTRO_TOUR_SECONDS = 10;
export function introTourAngle(elapsed: number): number {
  const progress = Math.max(0, Math.min(1, elapsed / INTRO_TOUR_SECONDS));
  return 2 * Math.PI * progress - Math.sin(2 * Math.PI * progress);
}
