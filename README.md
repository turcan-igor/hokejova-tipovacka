# IIHF 2026 Tipovacka

Czech prediction competition app for the 2026 IIHF Men's World Championship.

The app is designed for free-tier hosting:

- **Vercel Hobby** hosts the Next.js website.
- **Supabase Free** provides Auth, Postgres, Row Level Security, Edge Functions, and Cron.
- **Supabase Cron + Edge Function** performs frequent IIHF schedule/result sync, because Vercel Hobby cron is only suitable for low-frequency jobs.

## 1. What You Need

Install these on your computer:

- Git
- Node.js LTS, ideally Node 20 or newer
- npm, included with normal Node.js installers
- Supabase CLI
- A GitHub account
- A Vercel account
- A Supabase account

Useful official docs:

- Vercel Next.js deployment: https://vercel.com/docs/concepts/next.js/overview
- Supabase CLI: https://supabase.com/docs/reference/cli
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase scheduled functions: https://supabase.com/docs/guides/functions/schedule-functions

## 2. Local Check Before Deploying

From the project folder:

```powershell
cd "D:\OneDrive - Thermo Fisher Scientific\Work\Codex\Hokejova_tipovacka"
npm install
npm run test
npm run build
```

Expected result:

- `npm install` creates `node_modules`.
- `npm run test` passes scoring/parser tests.
- `npm run build` finishes without TypeScript or Next.js errors.

If `npm` is not recognized, install Node.js from https://nodejs.org and reopen PowerShell.

## 3. Create Supabase Project

1. Open https://supabase.com/dashboard.
2. Create a new project.
3. Save these values from **Project Settings -> API**:
   - Project URL
   - anon public key
   - service_role key
4. Save your project ref from the project URL:

```text
https://PROJECT_REF.supabase.co
```

Keep the `service_role` key private. Never paste it into browser-side code.

## 4. Create The Database

Use either the Dashboard SQL Editor or the Supabase CLI.

### Option A: Dashboard SQL Editor

1. Open Supabase Dashboard.
2. Go to **SQL Editor**.
3. Open `supabase/migrations/001_initial.sql` locally.
4. Paste the full SQL into the editor.
5. Run it.

This creates:

- users profile table
- invite codes
- teams
- matches
- match predictions
- medal predictions
- final medals
- notification preferences
- sync run log
- admin audit log
- RLS policies
- scoring recompute function
- seed invite code `IIHF2026`

### Option B: Supabase CLI

Login and link the local folder to your Supabase project:

```powershell
supabase login
supabase link --project-ref PROJECT_REF
supabase db push
```

## 5. Configure Supabase Auth

In Supabase Dashboard:

1. Go to **Authentication -> Providers**.
2. Enable **Email**.
3. For the easiest colleague setup, disable mandatory email confirmation, or keep it enabled if you want users to verify email.
4. Go to **Authentication -> URL Configuration**.
5. Add your future Vercel URL after deployment, for example:

```text
https://your-project.vercel.app
```

The first registered user becomes `ADMIN`. Register yourself first.

## 6. Local Environment File

Create `.env.local` in the project root:

```powershell
Copy-Item .env.example .env.local
```

Fill it like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SYNC_SECRET=make-a-long-random-secret
IIHF_SCHEDULE_URL=https://www.iihf.com/en/events/2026/wm/schedule
```

Generate `SYNC_SECRET` as any long random string. Example shape:

```text
v9x7-replace-this-with-your-own-long-secret-2026
```

Run locally:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## 7. First Local Smoke Test

1. Open `/prihlaseni`.
2. Register yourself with invite code:

```text
IIHF2026
```

3. Log in.
4. Confirm you see **Admin** in the navigation.
5. Open `/admin`.
6. Click **Spustit sync**.
7. Open `/zapasy`.
8. Confirm matches appear.
9. Enter one match tip with a non-draw score, for example `3:2`.
10. Open `/medailove-tipy` and save gold/silver/bronze.
11. Open `/zebricek` and confirm your user appears.

If the sync button fails, check:

- `.env.local` values
- Supabase database migration was run
- `SUPABASE_SERVICE_ROLE_KEY` is correct
- internet access to `https://www.iihf.com/en/events/2026/wm/schedule`

## 8. Push Code To GitHub

Create a new GitHub repository, then from the project folder:

```powershell
git init
git add .
git commit -m "Initial IIHF 2026 tipovacka app"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

Do not commit `.env.local`. It is already ignored.

## 9. Deploy Website To Vercel

1. Open https://vercel.com.
2. Click **Add New -> Project**.
3. Import your GitHub repository.
4. Framework should be detected as **Next.js**.
5. Add environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SYNC_SECRET=same-long-random-secret-as-local
IIHF_SCHEDULE_URL=https://www.iihf.com/en/events/2026/wm/schedule
```

6. Deploy.
7. Copy the deployed Vercel URL.
8. Add that URL in Supabase **Authentication -> URL Configuration**.

After deployment, open:

```text
https://your-project.vercel.app
```

## 10. Deploy Supabase Edge Function

The frequent result sync lives here:

```text
supabase/functions/sync-iihf-results/index.ts
```

Deploy it:

```powershell
supabase login
supabase link --project-ref PROJECT_REF
supabase functions deploy sync-iihf-results --no-verify-jwt
```

Set Edge Function secrets:

```powershell
supabase secrets set SUPABASE_URL=https://PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SYNC_SECRET=your-long-random-secret
supabase secrets set IIHF_SCHEDULE_URL=https://www.iihf.com/en/events/2026/wm/schedule
```

Test the Edge Function manually:

```powershell
curl -X POST "https://PROJECT_REF.supabase.co/functions/v1/sync-iihf-results" `
  -H "Authorization: Bearer your-long-random-secret" `
  -H "Content-Type: application/json" `
  -d "{}"
```

Expected response:

```json
{"ok":true,"matchesSeen":64}
```

The exact `matchesSeen` number can change if IIHF updates the schedule page.

## 11. Schedule Supabase Cron

Open `supabase/cron/sync_iihf_results.sql`.

Before running it, store secrets in Supabase Vault from SQL Editor:

```sql
select vault.create_secret('https://PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('your-long-random-secret', 'sync_secret');
```

Then run the rest of `supabase/cron/sync_iihf_results.sql` in SQL Editor.

Default schedule:

```text
*/10 * * * *
```

That means every 10 minutes.

To check cron exists:

```sql
select * from cron.job;
```

To check recent cron runs:

```sql
select * from cron.job_run_details order by start_time desc limit 20;
```

To disable the job later:

```sql
select cron.unschedule('sync-iihf-results');
```

## 12. Production Verification Checklist

After Vercel and Supabase are deployed:

1. Open the Vercel URL.
2. Register your own account first with invite code `IIHF2026`.
3. Confirm you can see **Admin**.
4. In Admin, click **Spustit sync**.
5. Confirm `/zapasy` shows IIHF matches.
6. Register a second test user.
7. As the second user, save:
   - one match tip
   - one medal tip
8. Confirm `/tipy-ostatnich` does not show unlocked match tips.
9. In Admin, override one match to `final` with a non-draw score.
10. Confirm:
    - `/zebricek` updates points
    - `/tipy-ostatnich` shows that locked match’s tips
    - Admin audit log contains the override
11. In Admin, set final medals.
12. Confirm medal points update in `/zebricek`.
13. Check Supabase `sync_runs` table after cron has had time to run.

Useful SQL checks:

```sql
select count(*) from profiles;
select count(*) from matches;
select count(*) from match_predictions;
select * from sync_runs order by started_at desc limit 10;
select * from admin_audit_log order by created_at desc limit 10;
```

## 13. Invite Colleagues

By default, the app has this invite code:

```text
IIHF2026
```

You can create a different invite code in Supabase SQL Editor:

```sql
insert into invite_codes (code, max_uses)
values ('YOUR-CODE-HERE', null);
```

Or limit usage:

```sql
insert into invite_codes (code, max_uses)
values ('TEAM-2026', 30);
```

Deactivate an old code:

```sql
update invite_codes
set is_active = false
where code = 'IIHF2026';
```

## 14. How Scoring Works

Match tips:

- Exact final score: 3 points.
- Correct winner, different score: 1 point.
- Wrong winner: 0 points.
- Draw predictions are rejected.
- Tips lock at match start.

Medal tips:

- Correct gold: 5 points.
- Correct silver: 5 points.
- Correct bronze: 5 points.
- Medal tips lock at the first tournament game.

Leaderboard:

- Total = match points + medal points.
- Users with equal points share the same rank.

## 15. Troubleshooting

### I cannot register

Check:

- invite code exists and is active
- Supabase env variables are correct
- Supabase Auth Email provider is enabled
- browser console/network tab for `/api/auth/register`

### I registered but I am not admin

Only the first profile becomes admin automatically.

To manually promote yourself:

```sql
update profiles
set role = 'ADMIN'
where email = 'your.email@example.com';
```

### Matches are empty

Run sync manually from Admin or call:

```powershell
curl -X POST "https://your-project.vercel.app/api/sync" `
  -H "Authorization: Bearer your-long-random-secret"
```

Then check:

```sql
select * from sync_runs order by started_at desc limit 5;
select count(*) from matches;
```

### Cron is not syncing

Check:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
select * from sync_runs order by started_at desc limit 20;
```

Also verify:

- Vault secret `project_url`
- Vault secret `sync_secret`
- Edge Function deployed
- Edge Function secrets set
- `SYNC_SECRET` is the same everywhere

### Leaderboard points look wrong

Run:

```sql
select recompute_scores();
```

Then refresh `/zebricek`.

### Vercel build fails

Run locally:

```powershell
npm install
npm run test
npm run build
```

Fix the first shown error, commit, and push again.

## 16. Phase 2 Notifications

The database already has `notification_preferences`.

Planned extension:

- find users missing tips for upcoming matches
- send email reminders first
- optionally add Teams reminders later if Microsoft permissions are available

No scoring or leaderboard changes should be needed for that phase.
