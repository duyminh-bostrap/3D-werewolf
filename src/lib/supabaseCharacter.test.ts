import test from 'node:test';
import assert from 'node:assert/strict';
import { syncCharacter } from './supabaseCharacter';
import { APPEARANCE_PRESETS } from '../game/rules';

test('a locally edited character is uploaded instead of being overwritten by stale cloud data', async () => {
  const local = { name: 'Mới', appearance: APPEARANCE_PRESETS[0] };
  const remote = { name: 'Cũ', appearance: APPEARANCE_PRESETS[0] };
  let saved: unknown;
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: remote, error: null }) }) }),
      upsert: async (value: unknown) => { saved = value; return { error: null }; },
    }),
  };
  assert.deepEqual(await syncCharacter(client as never, local, true), local);
  assert.deepEqual(saved, { id: 'user-1', ...local });
});
