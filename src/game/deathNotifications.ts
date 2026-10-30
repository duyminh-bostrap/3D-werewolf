type LifeState = { id: string; name: string; isAlive: boolean };
export function newlyDeadPlayers<T extends LifeState>(previous: ReadonlyMap<string, boolean>, players: T[]): T[] {
  return players.filter((p) => previous.get(p.id) === true && !p.isAlive);
}
export function deathNotice(player: Pick<LifeState, 'name'>): string {
  return `${player.name} đã qua đời.`;
}
