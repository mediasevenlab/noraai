FROM oven/bun:1.3.14 AS build

WORKDIR /app

# Copy the repository instead of enumerating workspace manifests. The master branch
# intentionally has no mobile package, while the mobile branch does; this build must
# remain valid for both repository shapes.
COPY . .

# One sequential install: BuildKit otherwise races a full install and a production
# install, and bun can hang for hours extracting @prisma/dev. Low network
# concurrency plus one retry keeps Prisma's large tarball extract reliable.
RUN bun install --frozen-lockfile --network-concurrency 1 --filter @web-app-demo/backend \
  || bun install --frozen-lockfile --network-concurrency 1 --filter @web-app-demo/backend

WORKDIR /app/backend

RUN DATABASE_URL="postgresql://superuser:superpassword@localhost:5432/web_app_demo?schema=public" bun run prisma:generate

# Prune after generate so the runtime image does not ship the Prisma CLI.
WORKDIR /app

RUN bun install --frozen-lockfile --production --network-concurrency 1 --filter @web-app-demo/backend

FROM oven/bun:1.3.14 AS runtime

WORKDIR /app

COPY --from=build /app/package.json /app/bun.lock /app/bunfig.toml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/backend ./backend

WORKDIR /app/backend

ENV NODE_ENV=production

# The process runs as bun. The copied tree belongs to root, so the recording
# folder has to exist and be writable before the user switch.
RUN mkdir -p /app/backend/uploads/meetings /app/backend/uploads/knowledge \
  && chown -R bun:bun /app/backend/uploads

USER bun

CMD ["bun", "src/index.ts"]
