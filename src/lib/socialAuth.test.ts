import test from 'node:test';
import assert from 'node:assert/strict';
import { isSocialProviderEnabled, startSocialLogin } from './socialAuth';

test('disabled providers are detected before leaving the app; failed checks are not treated as disabled', async () => {
  const request = (async (url, options) => {
    assert.equal(String(url), 'https://auth.example/auth/v1/settings');
    assert.equal(options?.cache, 'no-store');
    return new Response(JSON.stringify({ external: { google: true, apple: false } }));
  }) as typeof fetch;
  assert.equal(await isSocialProviderEnabled('google', 'https://auth.example', 'public-key', request), true);
  assert.equal(await isSocialProviderEnabled('apple', 'https://auth.example', 'public-key', request), false);
  await assert.rejects(isSocialProviderEnabled('google', 'https://auth.example', 'public-key', async () => new Response('', { status: 503 })));
  await assert.rejects(isSocialProviderEnabled('google', 'https://auth.example', 'public-key', async () => new Response('{}')));
});

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
