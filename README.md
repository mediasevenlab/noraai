# 24nutrition

Live product: [https://24nutrition.site](https://24nutrition.site). Production is the current VPS; see [docs/VPS.md](docs/VPS.md). Demo UI stays under `/demo` and is not a production home.

Local development still uses this Bun monorepo: Hono backend, React webapp, Astro website, and shared contracts.

<p align="center">
  <img src="docs/assets/vibe_tmpl_schema.png" alt="24nutrition architecture schema" width="100%">
</p>

## This checkout

This repository **is** 24nutrition. It is not a fresh vibe-template install and must not be treated as one.

- Live product: [https://24nutrition.site](https://24nutrition.site)
- GitHub (private): [https://github.com/mediasevenlab/24nutrition](https://github.com/mediasevenlab/24nutrition)
- Working branch (and GitHub default): `hybrid`

If you cloned this repo to work on 24nutrition, skip template intake. Read this README, `CLAUDE.md` / `AGENTS.md`, [docs/LOCAL_DATABASE.md](docs/LOCAL_DATABASE.md), then follow Quick Start. Do **not** detach or replace `origin`. Do **not** globally rename npm packages, cookie names, or Compose database names (`@web-app-demo/*`, `web_app_demo`) unless that dedicated migration is explicitly requested.

### Surfaces in this branch

- `webapp` — signed-in app: diary, plans, feed, mentor, admin
- `website` — public landing and SEO pages
- `backend` — Hono API + Prisma + PostgreSQL
- `hybrid/` — shipped Android shell (Capacitor around `webapp`)
- Expo `mobile/` — **not** in this checkout; see [mobile/README.md](mobile/README.md)

Local PostgreSQL is Docker Compose only. Production and VPS notes live in [docs/VPS.md](docs/VPS.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What's Inside

- `backend` - Bun + Hono + Prisma + PostgreSQL, custom JWT auth, Zod validation, and OpenAPI output.
- `webapp` - React + Vite + TanStack Query/Form/Router CSR browser client with the baseline auth flow.
- `website` - a separate Astro project for public SSG/SSR pages (landing, content sites, marketplace).
- `hybrid/` — shipped Android shell (Capacitor around `webapp`). Not the Expo `mobile` client.
- `mobile/README.md` — Expo is not in this `hybrid` checkout; see that file for the `mobile` branch.
- `packages/contracts` - shared Zod schemas and TypeScript API types.
- `.do` - committed DigitalOcean App Platform spec templates; generate concrete specs into `.scratch/deploy` with `bun run deploy:do:specs`.
- `docker-compose.yml` - local PostgreSQL 18 through the official `postgres:18-alpine` image on port `54329`; test runners use a repository-derived port by default, or `POSTGRES_TEST_PORT` when set. PostgreSQL 18 is intentional because the backend schema uses strict database-generated UUIDv7 IDs.
- `docs/TESTING.md` - the backend and Playwright testing contract. Mobile Maestro guidance lives on the `mobile` branch.
- `docs/LOCAL_DATABASE.md` - cross-platform local PostgreSQL setup for Windows, macOS, and Linux.
- `docs/STORAGE.md` - DigitalOcean Spaces, CDN, uploads, and image/media storage rules.
- `docs/N8N.md` - isolated local n8n workflow automation setup and integration boundaries.
- `docs/YANDEX_CLOUD.md` - optional Yandex Cloud deployment path when the user explicitly chooses it.

## Choosing `webapp` vs `website`

24nutrition ships two browser surfaces. Put a feature in the surface that matches how the page is found, not by habit.

- Build it in **`website`** (Astro, static by default, SSR/hybrid only when needed) when pages must be **public and found by search engines or shared with rich link previews**: marketing/landing pages, content sites, blogs, docs, and the public storefront of a **marketplace**. For a marketplace, this usually means the landing page, category/search landing pages, public listing/product pages, SEO metadata, and rich previews.
- Build it in **`webapp`** (React, client-side rendered) when screens live **behind sign-in and do not need SEO**: login-adjacent app flows after redirect, buyer account, seller/admin panels, checkout/account workflows, dashboards, settings, and authenticated tools. No crawler needs these, so CSR is the simpler, cheaper choice.

Rule of thumb: *if a page must rank in search or preview nicely when shared, it belongs in `website`; if it is only reachable after login, it belongs in `webapp`.* Both surfaces reuse `@web-app-demo/contracts` until a dedicated rename lands. Do not rebuild SEO pages inside `webapp`. Do not move the signed-in app into Astro.

Astro stays the public-site stack because it is content-first and static-first. Do not switch website frameworks unless the product explicitly needs that platform.

## Quick Start

Install dependencies first:

```bash
bun install
```

Check Docker first. Docker Compose runs local PostgreSQL for this product:

```bash
docker compose version
docker info
```

If either command fails, install and start Docker before continuing:

- Windows: install Docker Desktop, enable the WSL 2 backend, start Docker Desktop, then rerun `docker compose version` and `docker info`.
- macOS: install and start Docker Desktop, or another Docker Engine with Compose v2, then rerun `docker compose version` and `docker info`.
- Linux: install Docker Engine and the Docker Compose plugin, start the Docker service, then rerun `docker compose version` and `docker info`.

Do not switch to native PostgreSQL for local setup. Docker Compose is the documented path.

### Backend/API Or Full-Stack

Only run this block when backend/API, full-stack, or DB-backed validation is active.

Create the backend env file:

```bash
# macOS, Linux, or Git Bash on Windows
cp backend/.env.example backend/.env
```

```powershell
# Windows PowerShell
Copy-Item backend/.env.example backend/.env
```

Then start PostgreSQL with that app-local env file:

```bash
docker compose --env-file backend/.env pull postgres
docker compose --env-file backend/.env up -d postgres
```

Then apply migrations:

```bash
bun run --cwd backend prisma:deploy
```

Registration and social sign-in always create the `user` role. To make the local
administrator usable, set `ADMIN_SEED_PASSWORD` in `backend/.env`, then run the
idempotent seed:

```bash
bun run --cwd backend prisma:seed
```

Without a seed password, `admin@example.com` is still created as `admin`, but its
password credential remains locked. Re-running the seed without a password never
clears an existing password hash; re-running it with the already configured
password preserves existing sessions.

### Run The Active Surfaces

Start only the app surfaces you need in separate terminals:

```bash
bun run dev:backend
bun run dev:webapp
bun run dev:website
```

Website-only setups can skip backend/PostgreSQL. A webapp-only project can skip it only after replacing or removing the included auth golden path; the committed webapp's register/login/session journey intentionally requires the backend.

Local webapp defaults to same-origin `/api` via the Vite proxy (`webapp/.env` with empty `VITE_API_URL`). That keeps auth cookies working on both `localhost` and `127.0.0.1`. Only set a concrete `VITE_API_URL` when you intentionally call the backend directly on the same hostname as the page.

Test runners use the separate Docker Compose `postgres_test` service and the `TEST_DATABASE_URL` shape from `backend/.env.example`. Webapp Playwright E2E starts `postgres_test`, applies migrations to `web_app_demo_test`, runs the browser flow, and tears down its test database volume by default.

## Workspace Commands

- `bun run dev` - start all workspace projects in parallel dev mode.
- `bun run dev:backend` - start the backend API.
- `bun run dev:webapp` - start the Vite CSR webapp.
- `bun run dev:website` - start the Astro website project.
- `bun run typecheck` - run TypeScript checks across workspaces.
- `bun run build` - run production build/typecheck/export scripts for workspaces that define them.
- `bun run test` - run contract, backend, and webapp unit/integration tests.
- `bun run test:contracts` - run shared Zod contract tests.
- `bun run test:backend` - run backend unit and integration tests.
- `bun run test:backend:integration` - run DB-backed auth tests through `postgres_test`.
- `bun run test:webapp` - run webapp client tests.
- `bun run deploy:do:specs` - safely generate concrete DigitalOcean specs under `.scratch/deploy`.
- `bun run e2e:webapp` - run the Playwright auth smoke test through backend + Vite.
- `bun run --cwd backend prisma:migrate` - create/apply a Prisma migration in development.
- `bun run --cwd backend prisma:deploy` - apply existing Prisma migrations on a server.
- `bun run --cwd backend prisma:seed` - idempotently create or unlock the local administrator.
- `bun run --cwd backend db:deploy` - production pre-deploy: migrate, optionally bootstrap the first administrator, and require a login-capable administrator.

## Project READMEs

- [backend/README.md](backend/README.md) - API, auth, Prisma, and backend validation.
- [docs/LOCAL_DATABASE.md](docs/LOCAL_DATABASE.md) - Docker Compose PostgreSQL setup and reset workflow.
- [docs/STORAGE.md](docs/STORAGE.md) - DigitalOcean Spaces, CDN, uploads, and image/media storage rules.
- [docs/YANDEX_CLOUD.md](docs/YANDEX_CLOUD.md) - optional Yandex Cloud deployment path when explicitly selected.
- [webapp/README.md](webapp/README.md) - CSR browser client setup, env, and Playwright smoke.
- [mobile/README.md](mobile/README.md) - Expo is not in this `hybrid` checkout; shipped Android is `hybrid/`.
- [website/README.md](website/README.md) - Astro website commands, hybrid rendering, and publishing model.
- [packages/contracts/README.md](packages/contracts/README.md) - shared schema and DTO rules.

## License

This project is licensed under the Apache License 2.0. If you distribute a fork, copy, or derivative work, keep both [LICENSE](LICENSE) and [NOTICE](NOTICE) with the attribution to Dima Sukharev, GitHub profile, and the original repository.

## Architecture Notes

API contracts live in `packages/contracts` and are imported by every active layer. The backend validates input with those Zod schemas, and the webapp client reuses the same schemas in TanStack Form and API calls. `UserDto.role` is the shared `user | admin` role contract; authorization uses the current database record rather than a role embedded in JWT claims. The backend API flow is `route -> validation -> auth/session guard -> service -> Prisma -> DTO`. Routes stay thin, auth business logic lives in the feature service, and API, worker, and cron entrypoints share `src/runtime.ts` for env and Prisma setup.

Keep the architecture monolithic. Add a worker or scheduled-job component from the same Docker image only when a concrete background or periodic task exists. For real-time fan-out across multiple backend instances, use managed Redis-compatible Pub/Sub (DigitalOcean Managed Valkey by default, or Yandex Managed Service for Valkey when that path is chosen).

Ongoing engineering guidance lives in [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/TESTING.md](docs/TESTING.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). First-run setup lives in this README.

## Current Upstream Documentation

For framework, API, deployment, or testing questions, consult the current upstream documentation linked here first. The repository docs describe 24nutrition conventions; the linked docs are the authoritative source for tool behavior and provider-specific changes.

- Runtime and package manager: [Bun docs](https://bun.sh/docs)
- Backend framework: [Hono docs](https://hono.dev/docs)
- Database ORM: [Prisma docs](https://www.prisma.io/docs) and [PostgreSQL docs](https://www.postgresql.org/docs/)
- Validation and contracts: [Zod docs](https://zod.dev/)
- JWT library: [jose documentation](https://github.com/panva/jose)
- Web stack: [React docs](https://react.dev/reference/react), [Vite guide](https://vite.dev/guide/), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [TanStack Form](https://tanstack.com/form/latest/docs/framework/react/quick-start), and [TanStack Router](https://tanstack.com/router/latest/docs/overview)
- Testing: [Playwright docs](https://playwright.dev/docs/intro)
- Website: [Astro docs](https://docs.astro.build/en/getting-started/)
- Local infrastructure: [Docker Compose docs](https://docs.docker.com/compose/) and [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)
- Deployment and storage: [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/), [DigitalOcean App specs](https://docs.digitalocean.com/products/app-platform/reference/app-spec/), [DigitalOcean Static Sites](https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/), [DigitalOcean Managed Databases in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/), [DigitalOcean Valkey](https://docs.digitalocean.com/products/databases/valkey/), [DigitalOcean Dockerfile builds](https://docs.digitalocean.com/products/app-platform/reference/dockerfile/), [DigitalOcean Bun buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/bun/), [doctl](https://docs.digitalocean.com/reference/doctl/), [doctl apps spec validate](https://docs.digitalocean.com/reference/doctl/reference/apps/spec/validate/), [DigitalOcean Container Registry](https://docs.digitalocean.com/products/container-registry/), [DigitalOcean Spaces](https://docs.digitalocean.com/products/spaces/), [DigitalOcean Spaces CDN](https://docs.digitalocean.com/products/spaces/how-to/enable-cdn/), and [external CDN in front of App Platform](https://docs.digitalocean.com/products/app-platform/how-to/configure-external-cdn/)
- Optional Yandex Cloud path: [Yandex Cloud CLI](https://yandex.cloud/en/docs/cli/quickstart), [Yandex Serverless Containers](https://yandex.cloud/en/docs/serverless-containers/), [Yandex Container Registry](https://yandex.cloud/en/docs/container-registry/quickstart), [Yandex Managed PostgreSQL](https://yandex.cloud/en/docs/managed-postgresql/), [Yandex Managed Service for Valkey](https://yandex.cloud/en/docs/managed-redis/), [Yandex Object Storage static hosting](https://yandex.cloud/en/docs/storage/operations/hosting/setup), [Yandex Object Storage AWS CLI](https://yandex.cloud/en/docs/storage/tools/aws-cli), [Yandex Cloud CDN](https://yandex.cloud/en/docs/cdn/concepts/), and [Yandex Cloud Marketplace Image Resizer](https://yandex.cloud/en/marketplace/products/yc/image-resizer)
