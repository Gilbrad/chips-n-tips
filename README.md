# Chips n' Tips

Offline-first personal finance tracking built with Next.js, Supabase Auth,
IndexedDB, and Recharts.

## Getting Started

Create `.env.local` from `.env.example`, then add your Supabase project URL and
publishable key.

Import `supabase/schema.sql` in the Supabase SQL editor to create the app tables,
RLS policies, and default category seeding.

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Supabase Auth Setup

Google is the only OAuth provider used by the app.

1. In Google Cloud, create a Web application OAuth client.
2. Add the Supabase callback URL shown on the Supabase Google provider page to
   Google's authorized redirect URIs.
3. In Supabase, open Authentication > Providers > Google, enable Google, and add
   the Google client ID and secret.
4. Add `http://localhost:3000/auth/callback` and the production callback URL to
   Supabase's redirect allow list.

Email/password signup must not require confirmation emails for this project. In
the Supabase dashboard, disable **Confirm email** under the email Auth provider
settings. With Confirm email disabled, Supabase returns a session immediately
after signup and does not send a signup confirmation email. Email signup is
blocked by the app until both steps are complete:

1. Disable Confirm email in Supabase.
2. Set `NEXT_PUBLIC_ENABLE_EMAIL_SIGNUP=true` in `.env`.

The app stores finance data in IndexedDB first. Supabase Auth gives users an
account and session, while Supabase Database acts as a background backup and
cross-device restore source.

## Offline-First Data Flow

- Every screen reads from IndexedDB.
- Every finance edit is committed to IndexedDB before any network request.
- Signed-in users sync in the background after edits, when the app opens, and
  when the device comes back online.
- Logging in on another device restores that account's Supabase backup into a
  separate, user-scoped IndexedDB cache.
- Anonymous device data is never automatically attached to an account. After a
  user authenticates, the app asks whether they want to import it.

IndexedDB records are partitioned by Supabase user ID, so accounts do not show
each other's cached data inside the app. Anonymous offline data belongs to the
browser profile itself and is visible whenever nobody is signed in. IndexedDB
is not encrypted storage, so people with access to the same OS/browser profile
can inspect it using browser developer tools.

## PWA And Offline Access

Production builds use Serwist to precache the application shell, finance pages,
and required Next.js assets. After a user opens the deployed app once while
online, the installed PWA can launch and continue reading or editing its
IndexedDB ledger without internet. Pending changes sync to Supabase when the
device comes back online.

Authentication, first-time installation, and cloud synchronization require an
internet connection. PWA installation also requires an HTTPS production
deployment; the service worker is intentionally disabled during `pnpm dev`.
