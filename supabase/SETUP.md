# Supabase setup

Social login is temporarily hidden (`SOCIAL_LOGIN_ENABLED = false` in `src/lib/socialAuth.ts`). Startup continues directly as a guest after the intro, and the account panel is hidden in settings. Existing local characters and background profile sync are preserved. Set this flag to true after the provider setup below is complete.

The app supports guest play, Google and Apple. Guest profiles can be linked to a provider to retain the same user ID and saved character. Existing account login loads the remote character instead of overwriting it with local guest edits.

1. Run `profiles.sql` and `friends.sql` in the project's SQL Editor. The new friends table uses owner-specific RLS; the SQL closes the previous public-access table without deleting it.
2. Authentication > Providers: enable Anonymous, Google and Apple. Enable manual identity linking for upgrading guests.
3. Google: create a Web OAuth client in Google Auth Platform. Add your app origin (local: `http://localhost:3000`) and this authorized redirect URI: `https://xxdahuhhtadwabdbhvms.supabase.co/auth/v1/callback`. Enter its Client ID and Client Secret in Supabase's Google provider.
4. Apple: configure a Services ID, Team ID, Key ID and signing key through Apple Developer, with the same Supabase callback. Enter the Apple OAuth credentials in Supabase. Web OAuth client secrets must be renewed at least every six months.
5. Authentication > URL Configuration: set the production Site URL, and allow the app callback URLs, including `http://localhost:3000/` for local testing.
6. Keep provider secrets in Supabase, never in Vite variables. The app only uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.

## Current project checklist (31 October 2026)

The public Auth settings endpoint currently reports `google: false`, `apple: false`, `anonymous_users: true`. Code deployment cannot enable providers with a publishable key.

- Providers dashboard: https://supabase.com/dashboard/project/xxdahuhhtadwabdbhvms/auth/providers
- URL settings: https://supabase.com/dashboard/project/xxdahuhhtadwabdbhvms/auth/url-configuration
- Site URL: `https://bloodmoon-village-preview.onrender.com`
- Add Redirect URLs: `https://bloodmoon-village-preview.onrender.com/**` and `http://localhost:3000/**` (includes room invite query strings).
- Provider callback for both Google and Apple: `https://xxdahuhhtadwabdbhvms.supabase.co/auth/v1/callback` (this differs from the app return URL).
- Google requires a Web OAuth Client ID and Client Secret. Apple requires an enabled Sign in with Apple App ID, Services ID, Team ID, Key ID and generated OAuth secret. Enter credentials directly in the provider dashboard, not in chat or client source.
- Enable manual identity linking for existing guests. Verify guest upgrades preserve the same user ID; test existing-account sign-in separately.
- After enabling, test each provider in a normal top-level browser on the preview URL; verify callback, saved character and room query restoration. A settings flag alone does not prove the entire OAuth flow works.

OAuth is opened at the top level because providers can block embedded sign-in. The development phone preview is bypassed on OAuth callback URLs.

The friends list is a saved contact list with room links, not mutual friend requests or live presence. Client player IDs in the WebSocket game are currently separate from Supabase Auth; game-server identity verification is not part of this OAuth change.

Official docs:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/social-sign-in/auth-apple
- https://supabase.com/docs/guides/auth/auth-identity-linking
