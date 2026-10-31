import { isWolfPackRole, type GamePhase, type PlayerState } from './rules';

type VoicePlayer = Pick<PlayerState, 'isAlive' | 'role'>;

export function canUseVoice(phase: GamePhase, player: VoicePlayer): boolean {
  return player.isAlive && (phase !== 'night' || isWolfPackRole(player.role));
}

export function canShareVoice(phase: GamePhase, a?: VoicePlayer, b?: VoicePlayer): boolean {
  return Boolean(a && b && canUseVoice(phase, a) && canUseVoice(phase, b));
}
