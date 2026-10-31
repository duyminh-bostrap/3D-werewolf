import { isWolfPackRole, type GamePhase, type PlayerState } from './rules';

export type ChatChannel = 'global' | 'wolves' | 'cupid';
export const CHAT_CHANNEL_NAMES: Record<ChatChannel, string> = { global: 'Chung', wolves: 'Sói', cupid: 'Cupid' };

export function chatChannels(phase: GamePhase, player: PlayerState, lovers: [string, string] | null): ChatChannel[] {
  if (!player.isAlive) return [];
  if (phase === 'lobby' || phase === 'ended') return ['global'];
  const channels: ChatChannel[] = phase === 'night' ? [] : ['global'];
  if (isWolfPackRole(player.role)) channels.push('wolves');
  if (lovers && (player.role === 'cupid' || lovers.includes(player.id))) channels.push('cupid');
  return channels;
}
