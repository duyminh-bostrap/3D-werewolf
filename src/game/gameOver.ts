import type { Faction, GamePhase } from './rules';
export function shouldShowGameOver(shell: string, phase: GamePhase, winner: 'ongoing' | Faction): boolean {
  return shell === 'gameover' && phase === 'ended' && winner !== 'ongoing';
}
