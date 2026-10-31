import type { GamePhase } from './rules';

export type EnvironmentStage = 'day' | 'dusk' | 'night';
export interface PhaseTransition {
  from: EnvironmentStage;
  to: EnvironmentStage;
  startedAt: number;
  endsAt: number;
}
export const PHASE_TRANSITION_MS = 5000;
export function environmentStage(phase: GamePhase): EnvironmentStage {
  if (phase === 'night' || phase === 'role_reveal') return 'night';
  return phase === 'day_trial' ? 'dusk' : 'day';
}
export function transitionProgress(transition: PhaseTransition, now: number): number {
  const t = Math.max(0, Math.min(1, (now - transition.startedAt) / (transition.endsAt - transition.startedAt)));
  return t * t * (3 - 2 * t);
}
