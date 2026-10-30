import { isWolfPackRole, type GamePhase, type PlayerState } from './rules';
type VisiblePlayer = Pick<PlayerState, 'id' | 'role' | 'isAlive'>;
export function canSeeWolfOutline(phase: GamePhase, viewer: VisiblePlayer | undefined, target: VisiblePlayer): boolean {
  return phase === 'night' && Boolean(viewer?.isAlive && target.isAlive && viewer.id !== target.id && isWolfPackRole(viewer.role) && isWolfPackRole(target.role));
}
