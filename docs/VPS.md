# 24nutrition VPS release

Production for this product is the current VPS behind `https://24nutrition.site`, not DigitalOcean App Platform. DigitalOcean specs in `.do/` remain an optional alternate path.

Do not deploy from this runbook unless the user explicitly asked to deploy.

## Release source

Every release is a Git SHA, not a local dirty tree.

```bash
bun scripts/vps/preflight.mjs
```

The preflight refuses to continue when:

- the worktree has modified, deleted, or untracked files;
- `origin` still points at the vibe coding template (`github.com/di-sukharev/vibe.git`) and no product remote is configured;
- `HEAD` is not a full 40-character SHA that `git rev-parse HEAD` can print.

Do not run `git reset`, `git checkout --`, `git clean`, or `git stash` to make a deploy possible. Stop and report the blocker.

## Target layout

Typical VPS layout:

- App root: `/opt/nutrition-app`
- Backend systemd unit: `nutrition-backend.service` (API + Telegram poller in one process)
- Optional website/webapp static files served by nginx
- Landing (Astro `website/dist`) at `/` and `/_astro/` under `/var/www/nutrition-landing`
- Landing static assets also under the same root: `/landing/` and `/fonts/` (nginx must `root` those prefixes to `nutrition-landing`, not the webapp SPA)
- Authenticated CSR app (`webapp/dist`) for `/login`, `/signup`, `/app`, … under `/var/www/nutrition-app`
- PostgreSQL on the host or a managed instance, reached via `DATABASE_URL`
- Durable meal images via S3-compatible object storage (`SPACES_*`). Do not keep user photos only on the API container disk.

Run **one** Telegram meals poller and **one** notifications poller. Each takes a PostgreSQL advisory lock; a second replica should not also poll the same bot token. Meal-notification *delivery* goes through n8n (`mentor-meal-notify` webhook), not the meals bot.

## Apply a SHA

On the VPS, after SSH with a key (never commit passwords):

```bash
export RELEASE_SHA=<40-char-sha>
cd /opt/nutrition-app
git fetch --tags origin
git checkout --detach "$RELEASE_SHA"
bun install
cd backend
bun run prisma:generate
bun run prisma:deploy
# backfills that belong to db:deploy, including meal clientKey / versions
bun run db:deploy
systemctl restart nutrition-backend
```

Health:

```bash
curl -sf http://127.0.0.1:3000/health
```

nginx should proxy `https://24nutrition.site/api/` and `/health` to that backend. Keep TLS at nginx.

Example unit and nginx snippets live in `scripts/vps/`.

## Rollback

Rollback is `git checkout --detach <previous-sha>` plus `systemctl restart nutrition-backend`.

Prisma migrations are forward-only. If a release added a migration, rolling back the app SHA without a matching database rollback can leave schema ahead of code. Prefer reverting product behavior in a new SHA when a migration already ran.

## Env

Copy from `backend/.env.example`. Production must set:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS` (exact `https://24nutrition.site` and any extra browser origins)
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true` and a matching trusted client-ip header for nginx
- `INTERNAL_SERVICE_TOKEN` when n8n/internal meal routes are used
- `TELEGRAM_MEALS_BOT_TOKEN` and `TELEGRAM_MEALS_BOT_USERNAME` when the meals poller is on
- `TELEGRAM_NOTIFY_BOT_TOKEN`, `TELEGRAM_NOTIFY_BOT_USERNAME`, and `N8N_MENTOR_NOTIFY_WEBHOOK_URL` when mentor meal notifications are on
- `SPACES_*` when meal images are stored in object storage

Password reset remains available on the API for anti-enumeration, but the webapp hides `/forgot-password` and `/reset-password` until a real email provider is chosen.

## Cron and workers

The API process owns in-process background tasks and the Telegram pollers. Do not start a second poller via cron. Use `backend` cron entrypoints only for named product jobs that are already registered.
