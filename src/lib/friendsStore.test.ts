import test from 'node:test';
import assert from 'node:assert/strict';
import { saveFriend, loadFriends, removeFriend } from './friendsStore';

test('saved contacts use player IDs and deletion survives reload', async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) }, configurable: true });
  await saveFriend({ playerId: 'a', name: 'Lan', roomCode: 'room1', note: '' });
  await saveFriend({ playerId: 'b', name: 'Lan', roomCode: 'room2', note: '' });
  assert.equal((await loadFriends()).length, 2);
  await saveFriend({ playerId: 'a', name: 'Lan mới', roomCode: 'room3', note: '' });
  assert.equal((await loadFriends()).length, 2);
  await removeFriend('a');
  assert.deepEqual((await loadFriends()).map((f) => f.id), ['b']);
});
