import type { CharacterAppearance } from '../game/rules';

export type Character = { name: string; appearance: CharacterAppearance };
type CharacterStorage = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'gothic_character';

export function loadCharacter(storage: CharacterStorage): Character | null {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    const fields = ['cloakColor', 'trimColor', 'headgear', 'lanternColor', 'skinTone', 'epithet'];
    if (!value || typeof value.name !== 'string' || !value.name.trim() || !value.appearance ||
      !fields.every((field) => typeof value.appearance[field] === 'string')) return null;
    return value;
  } catch { return null; }
}

export function saveCharacter(storage: CharacterStorage, character: Character): boolean {
  try { storage.setItem(key, JSON.stringify(character)); return true; }
  catch { return false; }
}
