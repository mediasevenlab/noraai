FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile --network-concurrency 1 \
  || bun install --frozen-lockfile --network-concurrency 1

ARG PUBLIC_WEBSITE_URL=https://24ainews.site
ARG PUBLIC_WEBAPP_URL=https://24ainews.site
ENV PUBLIC_WEBSITE_URL=$PUBLIC_WEBSITE_URL
ENV PUBLIC_WEBAPP_URL=$PUBLIC_WEBAPP_URL

RUN bun run --cwd website build
ENV VITE_API_URL=""
RUN bun run --cwd webapp build

FROM nginx:1.28-alpine

COPY deploy/nora/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/website/dist /usr/share/nginx/landing
COPY --from=build /app/webapp/dist /usr/share/nginx/app
