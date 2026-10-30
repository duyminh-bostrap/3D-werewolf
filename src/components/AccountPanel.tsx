import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseCharacter';
import { isSocialProviderEnabled, startSocialLogin } from '../lib/socialAuth';

export function AccountPanel({ onContinue }: { onContinue?: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [intent, setIntent] = useState<'link' | 'login'>('link');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!supabase) return onContinue ? <button type="button" onClick={onContinue} className="min-h-11 w-full rounded-xl bg-[#9e1b24] text-sm font-semibold text-white">Chơi khách</button> : null;
  const permanent = Boolean(user && !user.is_anonymous);
  const login = async (provider: 'google' | 'apple') => {
    setBusy(true); setError('');
    try {
      const enabled = await isSocialProviderEnabled(provider, import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      if (!enabled) {
        setError(`${provider === 'google' ? 'Google' : 'Apple'} chưa được bật cho game. Bạn có thể chọn Chơi khách trong lúc chờ cấu hình.`);
        setBusy(false);
        return;
      }
      const redirect = new URL(window.location.pathname, window.location.origin);
      const room = new URLSearchParams(window.location.search).get('room');
      if (room) redirect.searchParams.set('room', room);
      const url = await startSocialLogin(supabase!, provider, intent, redirect.href);
      localStorage.setItem('gothic_auth_intent', intent);
      const target = window.top ?? window;
      target.location.href = url;
    } catch (cause) {
      const code = (cause as { code?: string })?.code;
      setError(code === 'manual_linking_disabled'
        ? 'Game chưa bật liên kết tài khoản khách. Vui lòng liên hệ quản trị viên.'
        : 'Chưa thể đăng nhập. Vui lòng kiểm tra kết nối hoặc thử lại sau.');
      setBusy(false);
    }
  };
  return (
    <section className="rounded-xl border border-white/10 bg-[#181324] p-3 space-y-3" aria-label="Tài khoản">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-amber-100">Tài khoản</h3><span className="text-xs text-slate-400">{permanent ? 'Đã đăng nhập' : 'Đang chơi khách'}</span></div>
      {permanent ? <p className="break-all text-xs text-slate-300">{user?.email || 'Tài khoản đã liên kết'}</p> : <>
        <p className="text-xs leading-relaxed text-slate-400">Liên kết tài khoản để giữ nhân vật khi đổi thiết bị.</p>
        <label className="flex min-h-9 items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={intent === 'login'} onChange={(e) => setIntent(e.target.checked ? 'login' : 'link')} /> Tôi đã có tài khoản, tải nhân vật đã lưu</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => void login('google')} className="min-h-11 rounded-lg border border-white/20 bg-white text-xs font-bold text-slate-900 disabled:opacity-40">Google</button>
          <button type="button" disabled={busy} onClick={() => void login('apple')} className="min-h-11 rounded-lg border border-white/25 bg-black text-xs font-bold text-white disabled:opacity-40">Apple</button>
        </div>
      </>}
      {onContinue && <button type="button" onClick={onContinue} disabled={busy} className="min-h-11 w-full rounded-xl border border-[#d4af37]/40 bg-[#9e1b24] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-40">{permanent ? 'Tiếp tục' : 'Chơi khách'}</button>}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </section>
  );
}
