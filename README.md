# Athens FM

A democratic DJ.

## Monorepo

| Package | Stack |
|---------|--------|
| `apps/web` | Vite, React, React Router, Apollo Client, Tailwind CSS, shadcn/ui |
| `apps/api` | Express, Apollo GraphQL, MongoDB (Mongoose), Redis |

Architecture details for humans and agents live in [`docs/architecture.md`](docs/architecture.md).

## Prerequisites

- Docker Desktop (or compatible Docker Engine + Compose)
- Node.js 20+ (for host-side `npm test` / optional `dev:local`)

## Setup

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

## Development (Docker — preferred)

```bash
npm run dev        # build images + run mongo, redis, api, Vite HMR
npm run dev:stop   # stop the whole stack
npm run db:reset   # drop the local Docker Mongo `athens-fm` database
```

Open the Vite app on `WEB_HOST_PORT` (default http://localhost:5173). HMR and API reload run inside containers with source mounts.

| Service | Host port |
|---------|-----------|
| Web (Vite HMR) | `WEB_HOST_PORT` (default `5173`) |
| API | `API_HOST_PORT` (default `3001`) |

Mongo and Redis stay on the Docker network (`mongo:27017`, `redis:6379`) so they do not clash with local installs. Override ports in `.env` if `5173`/`3001` are already taken.

## Host-only apps (optional)

```bash
npm install
npm run dev:local   # web + api on the host (expects mongo/redis reachable)
```

## Test

```bash
npm install
npm test
```

## Build

```bash
npm run build
```

## Vercel

1. Import this repo in Vercel (root directory = monorepo root). Fluid compute is enabled in `vercel.json`.
2. Set `MONGODB_URI`, `REDIS_URL` (required for multi-listener GraphQL subscriptions), `CORS_ORIGIN`, and `YOUTUBE_API_KEY` in the project env.
3. Deploy — `vercel.json` builds the Vite app and routes `/api/*` to the serverless `http.Server` in `api/` (Express + `graphql-ws` WebSockets).

Local WS parity: `vercel dev` after `vercel link`.
