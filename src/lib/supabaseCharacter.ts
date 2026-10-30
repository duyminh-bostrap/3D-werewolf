import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadCharacter, type Character } from './characterStorage';

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
let sessionPromise: Promise<string> | null = null;

async function userId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session.user.id;
  if (!sessionPromise) {
    sessionPromise = client.auth.signInAnonymously().then((result) => {
      if (result.error) throw result.error;
      if (!result.data.user) throw new Error('Không thể tạo phiên Supabase');
      return result.data.user.id;
    }).finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

export async function syncCharacter(client: SupabaseClient, local: Character | null, localChanged: boolean): Promise<Character | null> {
  const id = await userId(client);
  const { data, error } = await client.from('profiles').select('name, appearance').eq('id', id).maybeSingle();
  if (error) throw error;
  const remote = data ? loadCharacter({ getItem: () => JSON.stringify(data), setItem: () => {} }) : null;
  if (data && !remote) throw new Error('Hồ sơ Supabase không hợp lệ');
  if (local && (localChanged || !remote)) {
    const result = await client.from('profiles').upsert({ id, ...local });
    if (result.error) throw result.error;
    return local;
  }
  return remote;
}
