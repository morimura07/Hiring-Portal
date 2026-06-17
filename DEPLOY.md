# Deploying to Vercel (internal / single team)

This app is ready for Vercel. Two serverless-specific pieces are already wired up:

- **Attachments → Vercel Blob** (local disk is only a dev fallback).
- **Auto-refresh → Vercel Cron** hitting `/api/cron/ingest` (the in-process timer is skipped on Vercel).

## 1. Prerequisites
- A **NeonDB** project (you already have one). Use the **pooled** `DATABASE_URL` and the **direct** `DIRECT_URL`.
- A **Google Cloud OAuth** client with the **Gmail API** enabled (you already have one).
- A Vercel account + this repo pushed to GitHub.

## 2. Create the Vercel project
1. Vercel → **Add New → Project** → import the repo.
2. Framework preset: **Next.js** (auto). Build command + output: defaults.
3. **Storage → Create → Blob** store, connect it to the project. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically.

## 3. Environment variables (Vercel → Settings → Environment Variables)
Set these for **Production** (and Preview if you use it):

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL |
| `DIRECT_URL` | Neon **direct** URL |
| `NEXTAUTH_SECRET` | strong 32-byte random (generated for you) |
| `NEXTAUTH_URL` | `https://<your-app>.vercel.app` |
| `APP_ENC_KEY` | strong 32-byte random (generated for you) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `GOOGLE_REDIRECT_URI` | `https://<your-app>.vercel.app/api/google/callback` |
| `CRON_SECRET` | strong random (generated for you) — protects the cron route |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | your admin login (strong password) |
| `GROQ_API_KEY` | optional (each user can set their own in Settings) |
| `BLOB_READ_WRITE_TOKEN` | auto-added when you connect Blob |

## 4. Update Google OAuth
In Google Cloud → **Credentials → your OAuth client → Authorized redirect URIs**, add:
```
https://<your-app>.vercel.app/api/google/callback
```
Keep the app in **Testing** mode and add your team's Gmail addresses under **Test users** (no Google verification needed for an internal team).

## 5. First deploy + database setup
1. Deploy. Once live, run migrations + seed against the production DB **from your machine** (env pointing at prod):
   ```bash
   DATABASE_URL=... DIRECT_URL=... pnpm db:migrate   # or: prisma migrate deploy
   DATABASE_URL=... SEED_ADMIN_PASSWORD=... pnpm db:seed
   ```
   *(Or add `prisma migrate deploy` to the Vercel build command.)*
2. Sign in at `https://<your-app>.vercel.app/login` with your seeded admin.
3. **Connect Gmail** (Settings), add your **Groq key**, and add team members (Users).
4. Click **Refresh** on Discovery to load jobs, and enable **Automatic updates** in Settings.

## 6. Cron frequency note
`vercel.json` runs the cron **once a day** (`0 6 * * *`) — this deploys on the free **Hobby** plan.
The route only ingests when your Settings interval is due, so on Hobby auto-refresh effectively runs **at most once/day**.

To get the finer intervals (2h / 5h / 8h) you have two options:
- **Vercel Pro** — then change the schedule to `0 * * * *` (hourly) and any interval is honored.
- **Free external pinger** (e.g. cron-job.org, GitHub Actions) hitting the endpoint as often as you like — works on Hobby:
  ```
  GET https://<your-app>.vercel.app/api/cron/ingest   Header: Authorization: Bearer <CRON_SECRET>
  ```

The manual **Refresh** button on Discovery works on any plan, anytime.

## 7. Function duration
The discovery ingest takes ~15–20s. Vercel **Hobby caps functions at 60s**, **Pro at 300s** (`maxDuration` is set to 300). If the ingest grows, prefer Pro.

## Security checklist before launch
- [ ] Strong `NEXTAUTH_SECRET`, `APP_ENC_KEY`, `CRON_SECRET` (don't reuse dev values).
- [ ] **Rotate the Neon DB password** (and update both URLs).
- [ ] Strong admin password; never commit `.env`.
- [ ] Verify only your team emails are OAuth **Test users**.
