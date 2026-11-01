# Architecture Overview — Nghệ An Departures

Shape: **fullstack** (frontend + backend + database). This project ships a
public storefront, a Supplier/Admin CMS, and the booking/payment state
machines the brief marks MVP — all three parts are needed.

## 1. Stack

| Part | Choice | Notes |
|---|---|---|
| Frontend | Vite 6 + React 18 + TypeScript + Tailwind v3 | Already built and approved (`code/frontend`) — this task does not touch it beyond `.env.example` |
| Backend | Go 1.25, stdlib `net/http` | One `main` package at `cmd/api`, per the committed Dockerfile |
| Database | PostgreSQL 16 | Driver: `github.com/jackc/pgx/v5/stdlib` (the stdlib `database/sql` interface, so no new query API to learn) |
| Migrations | Hand-rolled, embedded | `//go:embed` bakes `migrations/*.sql` into the binary at build time; a `schema_migrations` table tracks what has run |

**Rejected: a migration library (golang-migrate, goose).** A single extra
dependency for what ~40 lines of `database/sql` already does; the project's
migration needs (ordered `.up.sql`/`.down.sql` files, one tracking table) are
exactly the textbook case stdlib covers. Add one if migrations ever need
branching/rollback orchestration beyond "apply what hasn't run".

## 2. Repository layout

```
code/backend/
  cmd/api/main.go        entrypoint: env → connect → migrate → listen
  internal/migrate/      the migration runner (Run, against any embed.FS)
  migrations/            migrations.go (the //go:embed) + NNNN_name.up/down.sql
  .env.example
code/frontend/           the approved design — unchanged except .env.example
docs/architecture/
  overview.md             this file
  erd.md, services.md     written in the next phase (ERD + service design)
```

Every later story's backend work adds Go packages under `internal/` and SQL
files under `migrations/`; it never adds a second `main` package — the
Dockerfile's `go build -o /bin/server ./cmd/api` resolves exactly one.

## 3. Naming conventions

- Go: standard `gofmt`/`go vet` conventions; package names lower\_case, no
  stutter (`migrate.Run`, not `migrate.MigrateRun`).
- SQL migrations: `NNNN_description.up.sql` / `.down.sql`, four-digit,
  zero-padded, strictly increasing — the runner sorts and applies by filename.
- API routes: `GET /v1/<collection>` and `GET /v1/<collection>/<id>` for the
  `data` module's read layer (see `docs/data/SRS.md`); every other module's
  write endpoints are `POST/PATCH /v1/<resource>...`, decided in
  `docs/architecture/services.md` once it is written.
- Table names: snake\_case plural, one per `schema.json` collection
  (`products`, `departures`, `suppliers`, …) — the ERD phase maps `schema.json`
  field types to columns; this phase does not invent the schema.

## 4. Database connection and migrations

`cmd/api/main.go`, in order:

1. Read `DATABASE_URL` (required — the runtime always injects it).
2. Open the connection via `pgx/v5/stdlib` (`sql.Open("pgx", ...)`).
3. Run every pending migration embedded from `migrations/*.sql`
   (`internal/migrate.Run`), tracked in `schema_migrations(version text
   primary key, applied_at timestamptz)` — created by the runner itself
   before looking at any file, so the first boot on an empty database works.
4. Listen on `$PORT` (fallback `$APP_PORT`, then `8080`).

`/healthz` returns 200 only once step 3 has succeeded **and** a fresh
`SELECT 1` against the database succeeds on that request — a crashed
database after a healthy boot must flip the check, not hide behind a cached
"migrated OK" flag.

The scaffold ships one migration, `0001_init`: `CREATE EXTENSION IF NOT
EXISTS pgcrypto` (needed later for `gen_random_uuid()` primary keys). It
creates no product tables — that is `docs/architecture/erd.md`'s job, run
next, against the 15 collections in `code/frontend/src/data/schema.json`
(products, destinations, categories, departures, guides, reviews, suppliers,
bookings, payouts, users, vouchers, campaigns, complaints, audit,
notifications, settings) plus `payments` (payments module) and an OTP/session
store (auth module) that `schema.json` does not carry because the frontend
mock never needed them.

## 5. How to run

```
docker compose --profile local up -d --wait   # postgres + backend + frontend
```

CI runs the same command (`container.yml`). For local iteration without
Docker: `cd code/backend && go run ./cmd/api` with `DATABASE_URL` and `PORT`
set; `cd code/frontend && npm run dev`.

## 6. Environment variables

`code/backend/.env.example`:

| Key | Comment |
|---|---|
| `DATABASE_URL` | Injected by the runtime; `postgres://user:pass@host:5432/db?sslmode=disable` locally |
| `PORT` | Injected by the runtime; defaults to 8080 if unset |
| `VNPAY_TMN_CODE` | VNPay merchant terminal code (payments module) |
| `VNPAY_HASH_SECRET` | VNPay callback/signature secret — server-side only, never logged |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google sign-in (auth module) |
| `SMS_OTP_API_KEY` | Phone OTP channel (auth module) — provider decided when that story lands |
| `EMAIL_SMTP_*` / `ZALO_OA_API_KEY` | Notifications module's two channels |
| `MEDIA_STORAGE_*` | Shared upload endpoint (suppliers module, SUPPLIERS-006) — CDN/storage credentials, provider decided when that story lands |

`code/frontend/.env.example`:

| Key | Comment |
|---|---|
| `VITE_API_URL` | Base URL the frontend's `src/data/index.ts` calls once the `data` module lands; defaults to `/api` when unset |

Root `.env.example` carries the compose-level Postgres credentials
(`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) that `docker-compose.yml`
already reads with defaults.

## 7. Key decisions

| Decision | Alternative considered | Why rejected |
|---|---|---|
| `database/sql` + `pgx/v5/stdlib`, hand-rolled migrations | `golang-migrate`/`goose` CLI tool | A whole dependency plus a CLI step in the Dockerfile for a need stdlib already meets at this project's size |
| One `payments` table outside `schema.json` | Reuse `bookings` columns for payment state | The SRS requires a payment record independent of the booking (retries, duplicate-callback de-dup per PAYMENTS-001 AC-4) — folding it into `bookings` loses that history |
| Seat hold/release as an atomic SQL update (`UPDATE departures SET seats = seats - :n WHERE seats >= :n`), not a row lock held across the request | Advisory lock or `SELECT ... FOR UPDATE` held for the whole booking transaction | The single conditional `UPDATE` is race-safe (BOOKING-001 AC-4) without holding a lock across any network round-trip (payment gateway calls, email sends) — a long-held lock is the more common way this kind of hold ships broken |
| `/healthz` checks `SELECT 1` on every call | Cache a "last migration succeeded" boolean after boot | A boolean never learns the database went away after boot; the Dockerfile's healthcheck depends on compose restarting a backend that genuinely cannot serve, not one that merely booted once |

## 8. Security and operational notes

- `password_hash`, `VNPAY_HASH_SECRET`, OTP codes: server-side only, never
  logged, never returned to a client — carried into every module's SRS
  already and repeated here because it is this layer's job to enforce it.
- Every `/v1/*` write endpoint added by a later story validates its input
  at the handler boundary and uses parameterized queries — no string-built
  SQL anywhere, including the `data` module's filter query builder.
- The backend container runs as `nobody`, `read_only`, no Linux
  capabilities (already set in the committed Dockerfile/compose) — nothing
  a later story adds should need to write to disk outside `/tmp`.

## 9. What is deferred to later phases

- `docs/architecture/erd.md` — the full table-by-table schema for all 17
  tables named in §4, with foreign keys and indexes.
- `docs/architecture/services.md` — the endpoint contract per module
  (request/response shapes, status codes, auth requirements).

This phase deliberately stops at the skeleton: an empty database, a server
that boots and migrates, and the conventions the next two phases build on.
