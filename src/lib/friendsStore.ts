import { supabase } from './supabaseCharacter';

export interface FriendEntry {
  id: string;
  name: string;
  roomCode: string;
  note: string;
  createdAt: number;
  lastSeenAt: number;
}
const LEGACY_KEY = 'gothic_werewolf_friends_v1';
const TABLE = 'friend_entries';
export const isCloudFriendsEnabled = Boolean(supabase);
type Pending = { id: string; friend?: FriendEntry };
let owner: string | null = null;
let operation = Promise.resolve();
async function identifyOwner() {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  owner = data.session?.user.id ?? null;
}
function storageKey() { return owner ? `${LEGACY_KEY}_${owner}` : LEGACY_KEY; }
function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private storage may be unavailable. */ }
}
function readLocal(): FriendEntry[] {
  const key = storageKey();
  if (owner && !read<boolean>('gothic_friends_migrated', false)) {
    write(key, read<FriendEntry[]>(LEGACY_KEY, []));
    write('gothic_friends_migrated', true);
  }
  const list = read<FriendEntry[]>(key, []);
  return Array.isArray(list) ? list.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string').map((f) => ({ ...f, roomCode: f.roomCode || '', note: f.note || '' })).sort((a, b) => b.lastSeenAt - a.lastSeenAt) : [];
}
function queue(pending: Pending) {
  const key = `${storageKey()}_pending`;
  const existing = read<Pending[]>(key, []);
  write(key, [...existing.filter((item) => item.id !== pending.id), pending]);
}
async function flush() {
  if (!supabase || !owner) return;
  const key = `${storageKey()}_pending`;
  const pending = read<Pending[]>(key, []);
  for (const item of pending) {
    const f = item.friend;
    const { error } = f
      ? await supabase.from(TABLE).upsert({ owner_id: owner, id: f.id, name: f.name, room_code: f.roomCode, note: f.note, created_at: new Date(f.createdAt).toISOString(), last_seen_at: new Date(f.lastSeenAt).toISOString() })
      : await supabase.from(TABLE).delete().eq('owner_id', owner).eq('id', item.id);
    if (error) throw error;
    write(key, read<Pending[]>(key, []).filter((entry) => entry.id !== item.id));
  }
}
function serial<T>(run: () => Promise<T>): Promise<T> {
  const result = operation.then(run);
  operation = result.then(() => {}, () => {});
  return result;
}
export function loadFriends(): Promise<FriendEntry[]> {
  return serial(async () => {
    await identifyOwner();
    const local = readLocal();
    if (!supabase || !owner) return local;
    try {
      // Migrate locally saved contacts before the first cloud read.
      if (!read<boolean>(`${storageKey()}_cloud_initialized`, false)) {
        for (const friend of local) if (!read<Pending[]>(`${storageKey()}_pending`, []).some((p) => p.id === friend.id)) queue({ id: friend.id, friend });
      }
      await flush();
      const { data, error } = await supabase.from(TABLE).select('*').eq('owner_id', owner).order('last_seen_at', { ascending: false });
      if (error) throw error;
      const list = (data ?? []).map((r) => ({ id: r.id, name: r.name, roomCode: r.room_code ?? '', note: r.note ?? '', createdAt: Date.parse(r.created_at), lastSeenAt: Date.parse(r.last_seen_at) }));
      write(storageKey(), list);
      write(`${storageKey()}_cloud_initialized`, true);
      return list;
    } catch { return local; }
  });
}
export function saveFriend(input: { name: string; roomCode: string; note: string; playerId?: string }): Promise<FriendEntry[]> {
  return serial(async () => {
    await identifyOwner();
    const local = readLocal();
    const name = input.name.trim().slice(0, 24);
    if (!name) return local;
    const existing = local.find((f) => input.playerId ? f.id === input.playerId : f.name.toLowerCase() === name.toLowerCase());
    const now = Date.now();
    const friend = { id: input.playerId || existing?.id || `f_${crypto.randomUUID()}`, name, roomCode: input.roomCode.trim().toUpperCase().slice(0, 12), note: input.note.trim().slice(0, 80), createdAt: existing?.createdAt ?? now, lastSeenAt: now };
    const next = [friend, ...local.filter((f) => f.id !== friend.id)];
    write(storageKey(), next); queue({ id: friend.id, friend });
    try { await flush(); } catch { /* Retry pending edits on the next load. */ }
    return next;
  });
}
export function removeFriend(id: string): Promise<FriendEntry[]> {
  return serial(async () => {
    await identifyOwner();
    const next = readLocal().filter((f) => f.id !== id);
    write(storageKey(), next); queue({ id });
    try { await flush(); } catch { /* Retry pending edits on the next load. */ }
    return next;
  });
}
export function formatLastSeen(ts: number): string {
  const mins = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} ngày trước` : new Date(ts).toLocaleDateString('vi-VN');
}
