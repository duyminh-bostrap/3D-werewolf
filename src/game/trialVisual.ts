import type { GamePhase } from './rules';

export type TrialVisual = { playerId: string; executedAt: number | null };
export function advanceTrialVisual(previous: TrialVisual | null, phase: GamePhase, accusedId: string | null, previousPlayerAlive: boolean, now: number): TrialVisual | null {
  if (phase === 'day_trial' && accusedId) return { playerId: accusedId, executedAt: null };
  if (!previous) return null;
  if (previous.executedAt !== null) return now - previous.executedAt < 3.5 ? previous : null;
  return previousPlayerAlive ? null : { ...previous, executedAt: now };
}
