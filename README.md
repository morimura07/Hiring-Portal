# Startup Hiring Intelligence Portal

A private, team-only platform for startup discovery, outreach management, application
tracking, and inbox-based communication.

> Built on the design language of the original fluid-CTA UI template (deep blue brand,
> Inter Tight / JetBrains Mono, framer-motion polish).

## Stack

- **Next.js 14** (App Router) · **TypeScript**
- **PostgreSQL** (NeonDB) · **Prisma**
- **Auth.js / NextAuth** (Credentials, JWT sessions)
- **Tailwind v4** · shadcn-style UI primitives · Radix

## Status — Phase 1 · Foundation

| Area | State |
|------|-------|
| Auth (credentials, no public registration) | ✅ |
| Role-based access (Admin / Member) | ✅ |
| Full database schema (10 tables) | ✅ |
| App shell (sidebar, topbar, module routes) | ✅ |
| Discovery / Applications / Inbox / Users / Audit Logs modules | ⏳ next |

## Getting started

1. **Create a NeonDB project** at <https://neon.tech> and copy both connection strings.

2. **Configure environment** — copy `.env.example` to `.env` and fill in:

   ```
   DATABASE_URL=   # Neon pooled connection (host contains "-pooler")
   DIRECT_URL=     # Neon direct connection (no "-pooler")
   NEXTAUTH_SECRET=  # openssl rand -base64 32
   ```

3. **Install, migrate, seed, ingest real data:**

   ```bash
   pnpm install
   pnpm db:migrate      # creates tables (uses DIRECT_URL)
   pnpm db:seed         # admin + member login accounts ONLY (no mock data)
   pnpm ingest          # pulls REAL job postings from live sources
   ```

4. **Run:**

   ```bash
   pnpm dev             # development (slower; compiles on demand)
   # or, for real daily use — much faster:
   pnpm build && pnpm start
   ```

   Sign in at <http://localhost:3000/login> with the seeded admin
   (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, default `admin@portal.local` /
   `ChangeMe123!`). A `member@portal.local` account is also seeded.

## Real data ingestion

All company/job data is **real** — pulled from live sources, no mock data.

```bash
pnpm ingest                      # all sources
pnpm ingest remoteok remotive    # only specific sources
```

Sources: **HN "Who's Hiring"** (includes contact emails), **RemoteOK**, **Remotive**,
**Greenhouse** & **Lever** boards. Admins can also click **Sync now** on the Discovery
page. Extend ATS coverage without code via env:

```
GREENHOUSE_BOARDS="stripe,ramp,vercel"
LEVER_BOARDS="leadiq,kandji"
```

Run `pnpm ingest` on a schedule (cron / Task Scheduler) to keep discovery fresh; each
run stamps new postings with that day's discovery date.

## Performance notes

- **Use the production build for real use:** `pnpm build && pnpm start`. `pnpm dev`
  compiles routes on first visit and is much slower — that's expected.
- The DB is remote (Neon). If you're far from the region, create the Neon project in a
  **nearby region** (e.g. Tokyo/Seoul for Korea) to cut query latency.
- Neon free tier "cold starts" after idle (~0.5s on the first query).

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start the dev server (development) |
| `pnpm build && pnpm start` | Production server (fast) |
| `pnpm ingest` | Pull real job postings from live sources |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed login accounts only |
| `pnpm db:studio` | Open Prisma Studio |

## Data model

```
Company ── Application ── Conversation ── Messages
   │            (one per company per user)
   ├── Contacts
   ├── Signals
   └── LeadScore
```

Tables: `users, companies, contacts, signals, lead_scores, applications,
conversations, messages, audit_logs, email_templates`.

## Roadmap

- **Phase 1** — Auth, Discovery, Applications, Inbox, User Management, Audit Logs.
- **Phase 2** — Email sync, reply detection, AI summaries, AI-generated outreach, realtime.
