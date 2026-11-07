# Contributing / dev notes

## Layout

- `scraper/`: Python package (managed with `uv`). Entry points `dinnr-scrape` and `dinnr-migrate`.
- `migrations/`: plain SQL migrations, `NNNN_description.sql`, applied in filename order. The Python
  side owns them; the schema is the contract between scraper and web app. Never edit an applied
  migration: add a new one.
- `web/`: Next.js (TypeScript, App Router) app. Reads the database; never writes the schema.
- `fixtures/unc/`: saved UNC pages for tests. See `fixtures/unc/README.md` for provenance.

Prerequisites: Docker, `uv`, Node 20+, `pnpm`.

## Start the database

```sh
docker compose up -d --wait     # Postgres 17 on localhost:5432, user/password/db: dinnr
```

The compose project name is fixed (`dinnr`), so every checkout or git worktree shares one container
and volume. Set `DINNR_PG_PORT` to publish on another port. Avoid `docker compose down -v` on a
shared machine: it deletes everyone's data.

## Migrate

```sh
cd scraper
uv run dinnr-migrate                                   # uses $DATABASE_URL, default the local dev DB
uv run dinnr-migrate --database-url postgresql://...   # any other database
```

Already-applied migrations (tracked in `schema_migrations`) are skipped. Each migration runs in its
own transaction.

## Run the scraper

```sh
cd scraper
uv run dinnr-scrape                                   # uses $DATABASE_URL, default the local dev DB
uv run dinnr-scrape --database-url postgresql://...
```

This fetches the **live** UNC pages (through the polite fetcher: robots.txt checked, ~5 s between
requests) and saves today's menu (America/New_York date) for every hall in
`scraper/src/dinnr/locations.py`. Re-running the same day updates rows in place.

Every fetched page is also saved gzipped to `scraper/archive/<run timestamp>/` (gitignored; change
with `--archive-dir`). CI keeps these as an artifact for 90 days: see "Raw page archive" in
[`docs/deploy.md`](docs/deploy.md).

## Tests

Both suites need the Docker Postgres running. They create and **drop** their own databases, so
never point them at real data.

```sh
cd scraper && uv run pytest
cd web && pnpm install && pnpm test
```

### Test database (configurable, for parallel work)

Both suites read one env var:

| Variable | Default |
| --- | --- |
| `DINNR_TEST_DATABASE_URL` | `postgresql://dinnr:dinnr@localhost:5432/dinnr_test` |

From that base name `<db>`:

- pytest uses `<db>` (fresh and migrated once per session) and `<db>_scratch` (an empty DB recreated
  for migration tests).
- vitest uses `<db>_web` (fresh and migrated once per run, by calling `dinnr-migrate` through `uv`).

So pytest and vitest can run at the same time, and separate checkouts sharing the one Postgres just
need different base names, e.g.:

```sh
export DINNR_TEST_DATABASE_URL=postgresql://dinnr:dinnr@localhost:5432/dinnr_test_ticket7
```

Databases are created on demand (the user `dinnr` is the superuser in the Docker image), so there is
no setup step per name.

## Web app

```sh
cd web
pnpm dev        # http://localhost:3000, reads $DATABASE_URL (default the local dev DB)
```

## Polite scraping

The live UNC site is touched only by the scraper itself, never by tests. Never request `?date=` URLs
(robots.txt disallows them). Use the User-Agent
`dinnr/<version> (+https://github.com/brandnwalters/dinnr; contact: bmwal@unc.edu)` and pause several
seconds between requests.

## Production

The scheduled scrape (`.github/workflows/scrape.yml`) writes to Neon Postgres and the web app runs on
Vercel. Architecture, the cron-time reasoning and the one-time human setup are in
[`docs/deploy.md`](docs/deploy.md).
