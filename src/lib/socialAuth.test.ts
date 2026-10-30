import test from 'node:test';
import assert from 'node:assert/strict';
import { startSocialLogin } from './socialAuth';

test('linking preserves the anonymous user; existing account login uses OAuth', async () => {
  const calls: string[] = [];
  const client = { auth: {
    getSession: async () => ({ data: { session: { user: { is_anonymous: true } } }, error: null }),
    linkIdentity: async () => { calls.push('link'); return { data: { url: 'https://auth.example/link' }, error: null }; },
    signInWithOAuth: async () => { calls.push('login'); return { data: { url: 'https://auth.example/login' }, error: null }; },
  } };
  assert.equal(await startSocialLogin(client as never, 'google', 'link', 'http://localhost:3000/'), 'https://auth.example/link');
  assert.equal(await startSocialLogin(client as never, 'apple', 'login', 'http://localhost:3000/'), 'https://auth.example/login');
  assert.deepEqual(calls, ['link', 'login']);
});
