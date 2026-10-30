import type { SupabaseClient } from '@supabase/supabase-js';

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
