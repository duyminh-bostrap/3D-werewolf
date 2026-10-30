import type { PlayerState } from './rules';

export function deathPresentation(player: PlayerState) {
  return player.deathPeriod === 'day'
    ? { color: 0xfb7b45, caption: `Mất mạng ban ngày · Ngày ${player.deathRound ?? 1}` }
    : { color: 0x8994ff, caption: `Mất mạng ban đêm · Đêm ${player.deathRound ?? 1}` };
}
