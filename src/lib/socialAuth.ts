import type { SupabaseClient } from '@supabase/supabase-js';

export const SOCIAL_LOGIN_ENABLED = false;

export async function isSocialProviderEnabled(provider: 'google' | 'apple', url: string, key: string, request: typeof fetch = fetch): Promise<boolean> {
  const response = await request(new URL('/auth/v1/settings', url), { headers: { apikey: key }, cache: 'no-store' });
  if (!response.ok) throw new Error('Không thể kiểm tra dịch vụ đăng nhập.');
  const settings = await response.json();
  if (typeof settings.external?.[provider] !== 'boolean') throw new Error('Cấu hình đăng nhập không hợp lệ.');
  return settings.external[provider];
}

export async function startSocialLogin(client: SupabaseClient, provider: 'google' | 'apple', intent: 'link' | 'login', redirectTo: string): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const options = { redirectTo, skipBrowserRedirect: true };
  const result = intent === 'link' && data.session
    ? await client.auth.linkIdentity({ provider, options })
    : await client.auth.signInWithOAuth({ provider, options });
  if (result.error) throw result.error;
  if (!result.data.url) throw new Error('Không thể mở trang đăng nhập.');
  return result.data.url;
}
