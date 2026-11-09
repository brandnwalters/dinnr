# Production: Neon, GitHub Actions and Vercel

```
GitHub Actions (cron, .github/workflows/scrape.yml)
  dinnr-migrate, then dinnr-scrape  ──writes──▶  Neon Postgres  ◀──reads──  Next.js app on Vercel (web/)
```

- **Database**: one Neon Postgres database. The scraper owns the schema: every workflow run applies
  pending migrations before scraping, so a merged migration reaches production on the next run.
- **Scraper**: `.github/workflows/scrape.yml` runs twice daily: at 09:30 UTC (04:30 EST / 05:30 EDT,
  before the 7am weekday breakfast) and at 17:00 UTC (12:00 EST / 13:00 EDT, to catch changes made
  during the day, well before 5pm dinner). The reasoning is in the workflow file. The midday run
  updates the day's menu in place. It also runs on demand from the Actions tab
  (`workflow_dispatch`). It reads one repository secret, `DATABASE_URL`. A failure fails the run, and
  GitHub emails the repo owner.
- **Web app**: the Vercel project builds `web/`. The build needs no database (the home page renders
  at request time), and at runtime `web/src/lib/db.ts` reads `DATABASE_URL`.

No secrets live in the repo. `.env` and `.env.*` are gitignored.

## One-time setup (human)

These steps need accounts and credentials, so they are done by hand.

### 1. Create the Neon database

1. At <https://console.neon.tech>, create a project (e.g. `dinnr`). Pick a US East region
   (AWS `us-east-1` / `us-east-2`) to sit near Vercel's default `iad1` functions.
2. From **Connect**, copy two connection strings for the default database:
   - the **direct** one (host without `-pooler`), for GitHub Actions (migrations and scraper), and
   - the **pooled** one (host contains `-pooler`), for Vercel (many short-lived serverless
     connections).
   Both look like `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require&channel_binding=require`.
   Keep `sslmode=require`.

Alternative: the Neon CLI. In `web/`, `neon init` links the project (`web/neon.ts` holds the branch
policy; the `web/.neon` link file is gitignored) and `neon env pull` writes `DATABASE_URL` (pooled)
and `DATABASE_URL_UNPOOLED` (direct) to `web/.env.local`. The GitHub secret in step 2 takes the
`DATABASE_URL_UNPOOLED` value; Vercel in step 4 takes `DATABASE_URL`.

Alternative: install Neon from the Vercel Marketplace (Vercel project → Storage → Neon). It creates
the database and sets `DATABASE_URL` (pooled) on the Vercel project for you. You still copy the
direct string for step 2.

### 2. Add the GitHub Actions secret

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

- Name: `DATABASE_URL`
- Value: the Neon **direct** connection string

Or with the CLI: `gh secret set DATABASE_URL --repo brandnwalters/dinnr` (paste when prompted).

### 3. Run the workflow once

Actions tab → **scrape** → **Run workflow** (or `gh workflow run scrape.yml --repo
brandnwalters/dinnr`). This creates the schema in Neon and saves today's menu. Check the run is
green. (Scheduled runs only fire for the workflow on the default branch, so merge to `main` first.)

### 4. Create the Vercel project

1. At <https://vercel.com/new>, import `brandnwalters/dinnr`.
2. **Root Directory**: `web`. Framework preset: Next.js (auto-detected). Leave build and install
   commands at their defaults: `web/vercel.json` overrides them to run pnpm 12.18.0 via `npx`.
   Vercel's own pnpm detection can't read the pnpm 12 lockfile, and its corepack support didn't
   pick up `packageManager`. `engines.node` in `web/package.json` pins Node 24. Keep the dashboard's Install
   and Build Command overrides off: they take precedence over `vercel.json`.
3. **Environment Variables** (Production, and Preview if you want previews to work):
   - `DATABASE_URL` = the Neon **pooled** connection string (skip if the Marketplace integration
     already set it).
4. Deploy. Pushes to `main` then deploy to production automatically.

### 5. Check it

Open the production URL, <https://dinnr-unc.vercel.app>. It should show today's Lenoir menu from
Neon. `/api/health` round-trips to the database and returns `{"ok":true,"migrations":N}`. If the
page is empty, check the latest **scrape** run succeeded today. (Per-deployment URLs such as
`dinnr-<hash>-brandnwalters.vercel.app` sit behind Vercel Authentication; use the production URL.)

## Operating notes

- Re-running the workflow the same day is safe: the scraper updates rows instead of duplicating them.
- To run migrations or the scraper against Neon from your machine:
  `cd scraper && uv run dinnr-migrate --database-url "$NEON_URL"` (same for `dinnr-scrape`). This
  hits the live UNC site through the polite fetcher; don't loop it.
- GitHub disables scheduled workflows after 60 days without repository activity. If the menu stops
  updating, check the Actions tab and re-enable the workflow.
- **Raw page archive**: every run saves a gzipped copy of each page it fetched, named by location and
  run time (`archive/<YYYYMMDDTHHMMSSZ>/<location-slug>.html.gz`, nutrition responses as
  `recipe-<id>.json.gz`), so past days can be re-parsed after a parser bug is fixed. Locally this goes
  to `scraper/archive/` (gitignored; override with `--archive-dir` or `$DINNR_ARCHIVE_DIR`). In CI the
  folder is uploaded as the `raw-pages-<run id>-<attempt>` artifact, even when the scrape fails.
  **GitHub deletes artifacts after 90 days**, so download any you need before then. The planned
  long-term home is Vercel Blob or a storage bucket (not built yet).
