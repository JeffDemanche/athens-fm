# Athens FM — Architecture & Concepts

Living record of product concepts, technical architecture, and agent-facing conventions.
Agents must **read this before making structural changes** and **update it when those details change**.

Last updated: 2026-07-13

---

## Product

- **Name**: Athens FM
- **Pitch**: A democratic DJ — listeners shape what plays.
- **Repo**: TypeScript monorepo with a Vite React frontend and an Express/MongoDB/Redis API.

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | Vite + React + Tailwind CSS + shadcn/ui frontend (`@athens-fm/web`) |
| `apps/api` | Express + Mongoose + Redis API (`@athens-fm/api`) |
| `api/` | Vercel serverless entry that re-exports the Express app |
| `docker-compose.yml` | Local full stack: mongo, redis, api (tsx watch), web (Vite HMR) |
| `Dockerfile.dev` | Shared Node 22 image used by api/web compose services |
| `docs/` | Living architecture / concept docs (this file and peers) |
| `.cursor/rules/` | Agent rules (including keep-this-doc-updated) |

Workspaces are npm workspaces (`apps/*`). Root scripts orchestrate Dockerized `dev`, builds, tests, and typecheck.

## Local Docker stack

| Command | What it does |
|---------|----------------|
| `npm run dev` | `docker compose up --build` — builds images, starts mongo + redis + api + web, watches source |
| `npm run dev:stop` | `docker compose down --remove-orphans` — stops the stack |
| `npm run dev:local` | Host-only web+api (no Docker); use when mongo/redis already run elsewhere |

Compose services:
- **mongo** — MongoDB 7 (compose network only; not published to host to avoid local Mongo port clashes)
- **redis** — Redis 7 (compose network only)
- **api** — Express via `tsx watch`, mounts `apps/api/src`, waits for healthy mongo/redis, published on `3001`
- **web** — Vite HMR on `0.0.0.0:5173`, published as `WEB_HOST_PORT` (default `5173`), mounts `apps/web/src` (+ key config files), proxies `/api` → `http://api:3001`
- **Host port overrides**: `.env` → `WEB_HOST_PORT`, `API_HOST_PORT` (Vite HMR `clientPort` follows `WEB_HOST_PORT`)

Vite in Docker uses `CHOKIDAR_USEPOLLING=true` and `server.hmr.clientPort: 5173` so HMR works through published ports.

## Frontend (`apps/web`)

- **Stack**: Vite, React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui under `src/components/ui`.
- **Path alias**: `@/*` → `src/*`
- **API proxy**: `VITE_API_PROXY_TARGET` (default `http://localhost:3001`; Docker sets `http://api:3001`).
- **Tests**: Jest + Testing Library (`jest.config.ts`, `jest.setup.ts`).
- **UI convention**: Prefer shadcn components; add with `npx shadcn@latest add <name>` from `apps/web`.
- **shadcn path resolution**: Keep `@/*` → `./src/*` in `apps/web/tsconfig.json` (not only `tsconfig.app.json`), otherwise the CLI writes files under a literal `@/` directory.

## Backend (`apps/api`)

- **Stack**: Express 5, Mongoose, ioredis, Zod, TypeScript (NodeNext ESM).
- **Entry**: `src/index.ts` listens on `0.0.0.0:$PORT` (default `3001`).
- **App factory**: `createApp()` in `src/app.ts` — used by tests, local server, and the Vercel adapter.
- **Routes**: Mounted under `/api/...` (e.g. `GET /api/health` reports mongo + redis status).
- **Database**: MongoDB via `MONGODB_URI`.
- **Cache/broker**: Redis via `REDIS_URL` (`src/config/redis.ts`).
- **Tests**: Jest + Supertest against `createApp()` (no live DB/Redis required for health).

## Vercel deployment

- **Config**: Root `vercel.json`
  - Builds `@athens-fm/web` → `apps/web/dist`
  - Rewrites `/api/*` → `/api` serverless function
- **Serverless entry**: `api/index.ts` exports the Express app and lazily connects MongoDB when `MONGODB_URI` is set.
- **Env vars** (set in Vercel project + local `.env`):
  - `MONGODB_URI` — Atlas (or other) connection string
  - `REDIS_URL` — managed Redis (e.g. Upstash) when needed in production
  - `CORS_ORIGIN` — production web origin(s), comma-separated if multiple
  - `PORT` — local/docker only
- **Local Vercel parity**: `vercel dev` from repo root after `vercel link`.
- **Recommended**: One Vercel project rooted at the monorepo.

## Testing

| Command | What it runs |
|---------|----------------|
| `npm test` | Jest in web and api workspaces |
| `npm run test:web` | Frontend only |
| `npm run test:api` | API only |

Both packages use TypeScript Jest configs. Keep new features covered at least with a focused unit/integration test in the owning package.

## Agent conventions for this doc

1. Before changing architecture, package boundaries, deploy shape, route prefixes, or shared env contracts — read this file.
2. After any of those changes land — update the relevant section here in the same change set.
3. Prefer short factual bullets over essays; date the “Last updated” line.
4. Put deep feature design notes in sibling files under `docs/` and link them from here.

## Open / undecided

- Product domain models (rooms, queues, votes, tracks) are not defined yet.
- Auth strategy not chosen.
- Real-time transport (WebSocket vs polling vs SSE) not chosen.
- Production Redis provider not chosen.
