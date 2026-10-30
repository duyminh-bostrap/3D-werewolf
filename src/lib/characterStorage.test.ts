import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCharacter, saveCharacter } from './characterStorage';
import { APPEARANCE_PRESETS } from '../game/rules';

test('saved character survives reload and invalid data falls back safely', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(loadCharacter(storage), null);
  const character = { name: 'Linh', appearance: APPEARANCE_PRESETS[1] };
  saveCharacter(storage, character);
  assert.deepEqual(loadCharacter(storage), character);
  values.set('gothic_character', '{bad json');
  assert.equal(loadCharacter(storage), null);
});
