import { canBodyguardProtect, doesRoleHaveNightAction, isWolfPackRole, type PlayerState, type WitchPotionState } from './rules';

export interface NightChoice { type: string; targetId?: string | null; lovers?: [string, string] }

export function validNightChoice(actor: PlayerState, choice: NightChoice, players: PlayerState[], day: number, potions: WitchPotionState, hasLovers: boolean, lastProtected: string | null, acted: string[]): boolean {
  if (!actor.isAlive || acted.includes(actor.id) || !doesRoleHaveNightAction(actor.role, day, potions, hasLovers)) return false;
  if (choice.type === 'skip_night_role') return true;
  const target = players.find((p) => p.id === choice.targetId && p.isAlive);
  switch (actor.role) {
    case 'werewolf': case 'alpha_wolf': case 'white_wolf':
      if (choice.type === 'white_wolf_kill') return actor.role === 'white_wolf' && Boolean(target && target.id !== actor.id && isWolfPackRole(target.role));
      if (choice.type === 'alpha_convert' && (actor.role !== 'alpha_wolf' || potions.hasAlphaConvert === false)) return false;
      return (choice.type === actor.role || choice.type === 'alpha_convert') && Boolean(target && !isWolfPackRole(target.role));
    case 'bodyguard': return choice.type === actor.role && Boolean(target && canBodyguardProtect(lastProtected, target.id));
    case 'seer': case 'aura_seer': case 'hunter': return choice.type === actor.role && Boolean(target && target.id !== actor.id);
    case 'witch': return choice.type === 'heal' ? potions.hasHealPotion && Boolean(target) : choice.type === 'poison' && potions.hasPoisonPotion && Boolean(target && target.id !== actor.id);
    case 'cupid': return choice.type === 'cupid' && Boolean(choice.lovers && choice.lovers[0] !== choice.lovers[1] && choice.lovers.every((id) => players.some((p) => p.id === id && p.isAlive)));
    case 'little_girl': return choice.type === 'little_girl_peek';
    default: return false;
  }
}

export function littleGirlHint(players: PlayerState[], actorId: string, rng = Math.random): string {
  const wolves = players.filter((p) => p.isAlive && isWolfPackRole(p.role));
  const villagers = players.filter((p) => p.isAlive && p.id !== actorId && !isWolfPackRole(p.role));
  if (!wolves.length || !villagers.length) return 'Không nhận ra bóng người trong đêm.';
  const suspects = [wolves[Math.floor(rng() * wolves.length)].name, villagers[Math.floor(rng() * villagers.length)].name];
  if (rng() < 0.5) suspects.reverse();
  return `Bóng dáng khả nghi: ${suspects.join(' / ')}`;
}
