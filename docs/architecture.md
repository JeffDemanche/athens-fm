# Athens FM — Architecture & Concepts

Living record of product concepts, technical architecture, and agent-facing conventions.
Agents must **read this before making structural changes** and **update it when those details change**.

Last updated: 2026-07-22

---

## Product

- **Name**: Athens FM
- **Pitch**: A democratic DJ — listeners shape what plays.
- **Repo**: TypeScript monorepo with a Vite React frontend and an Express/MongoDB/Redis API.

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | Vite + React + Tailwind CSS + shadcn/ui frontend (`@athens-fm/web`) |
| `apps/api` | Express + Apollo GraphQL + Mongoose + Redis API (`@athens-fm/api`) |
| `api/` | Vercel serverless entry: exports `http.Server` (Express + graphql-ws) from `createHttpServer()` |
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
| `npm run db:reset` | Drops the `athens-fm` DB inside the running `athens-fm-mongo` container (`scripts/reset-mongo.sh`) |

Compose services:
- **mongo** — MongoDB 7 (compose network only; not published to host to avoid local Mongo port clashes)
- **redis** — Redis 7 (compose network only)
- **api** — Express via `tsx watch`, mounts `apps/api/src`, waits for healthy mongo/redis, published on `3001`
- **web** — Vite HMR on `0.0.0.0:5173`, published as `WEB_HOST_PORT` (default `5173`), mounts `apps/web/src` (+ key config files), proxies `/api` → `http://api:3001` (HTTP + WebSocket)
- **Host port overrides**: `.env` → `WEB_HOST_PORT`, `API_HOST_PORT` (Vite HMR `clientPort` follows `WEB_HOST_PORT`)

Vite in Docker uses `CHOKIDAR_USEPOLLING=true` and `server.hmr.clientPort: 5173` so HMR works through published ports.

**Dependency installs**: `node_modules` lives in the image (`npm ci` in `Dockerfile.dev`), not a bind mount. After changing `package.json` / `package-lock.json`, rebuild/recreate (`npm run dev` or `docker compose up --build`) or Vite will fail to resolve new imports (e.g. `@apollo/client/react`).

## Frontend (`apps/web`)

- **Stack**: Vite, React 19, React Router, Apollo Client, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui primitives.
- **Path alias**: `@/*` → `src/*`
- **UI layers** (atomic-style):
  - `src/primitives/` — base UI (Button, Input, Text, …); shadcn `ui` alias targets here
  - `src/composites/` — composed building blocks (PageShell, RoomHeader, DeskPanel, …)
  - `src/features/` — product behaviors (create-room, room-detail, …)
  - `src/views/` — route-level screens
- **Routes**:
  - `/` — landing
  - `/rooms/:roomId/host` — host desk (full-viewport layout)
  - `/rooms/:roomId` — participant room view (mobile-web oriented)
- **Host desk layout** (`views/host-room` + `features/host-desk`):
  - Top bar — room name + room code + end-room control (cast/moderator desk; no participant-view link)
  - Main row — large **viewer** (YouTube IFrame Player / now playing held in host local state after soft-pop) left; narrower **activity** feed right
  - Bottom row — horizontal **playlist** of upcoming `QueueItem`s left-to-right by vote score (oldest wins ties)
  - Panel chrome via `composites/desk-panel`
  - **Activity feed** — chronological `RoomEvent` stream (join/leave); seeded via `roomEvents` query + live via `roomEventAdded` subscription (not a participant list)
  - **Queue** — seeded via `queueItems` query + live via `queueItemAdded` / `queueItemPopped` / `queueItemUpdated` subscriptions (`features/queue/use-room-queue`); ordered by net vote score desc, then oldest `createdAt`; viewer votes loaded separately via `myQueueVotes`
  - **Player** — provider-agnostic `MediaPlayer` (`features/player/`); `YouTubeMediaPlayer` wraps the YouTube IFrame Player API (no API key required); factory `createMediaPlayer(type)`. Playlist tiles show persisted `title` + `thumbnailUrl` from the API. Host desk soft-pops (`popQueueItem`) as soon as an item starts playing so votes cannot reshuffle the active track; on embed `ENDED`, clears local now-playing and advances to the next queue head the same way.
  - **Participant room** — YouTube URL/id submit form (`addQueueItem`) + live horizontal queue list of all upcoming room tracks with per-item up/down vote toggles (`voteOnQueueItem`)
- **GraphQL client**: Apollo Client → `VITE_GRAPHQL_URL` (default `/api/graphql`)
  - HTTP for queries/mutations; WebSocket (`graphql-ws`) for subscriptions on the same path
  - Client retries WS reconnects indefinitely with exponential backoff (Vercel Functions close sockets at `maxDuration`)
- **API proxy**: `VITE_API_PROXY_TARGET` (default `http://localhost:3001`; Docker sets `http://api:3001`). Proxies `/api/*` including GraphQL HTTP + WS (`ws: true` in Vite).
- **Tests**: Jest + Testing Library (`jest.config.ts`, `jest.setup.ts`).
- **UI convention**: Prefer shadcn components; add with `npx shadcn@latest add <name>` from `apps/web`.
- **shadcn path resolution**: Keep `@/*` → `./src/*` in `apps/web/tsconfig.json`; `components.json` maps `ui` → `@/primitives`.

## Backend (`apps/api`)

- **Stack**: Express 5, Apollo Server, TypeGraphQL, Typegoose (Mongoose), ioredis, Zod, TypeScript (NodeNext ESM).
- **Layered architecture**:
  - **Entities** — `src/entities/` shared Typegoose + TypeGraphQL classes (single source of truth for Mongo schema + GraphQL object types)
  - **GraphQL API** — `src/graphql/` (`buildSchema` from TypeGraphQL resolvers, Apollo server, context, Redis-backed pub/sub, `graphql-ws` subscriptions)
  - **Service** — `src/services/` (business rules; e.g. `roomService`, `participantService`, `roomEventService`, `queueItemService`, `voteService`)
  - **Repository** — `src/repositories/` (Mongo access via Typegoose models)
- **Entry**: `src/index.ts` listens on `0.0.0.0:$PORT` (default `3001`) via `http.Server`; loads `reflect-metadata` for decorators; attaches WebSocket subscriptions on `/api/graphql`.
- **App factory**: async `createApp()` in `src/app.ts` — HTTP GraphQL only. Shared bootstrap `createHttpServer()` in `src/createHttpServer.ts` wires Mongo/Redis/pubsub + Express + `graphql-ws` (used by Docker entry and the Vercel adapter).
- **HTTP routes**: `/api/health` (REST health); GraphQL at `POST /api/graphql` + `WS /api/graphql` (subscriptions).
- **Domain**:
  - `Room` — `id` (Mongo), `shortId` (5-char join code), `name`, timestamps; `room(id)` accepts shortId or ObjectId; `participants` field lists members; `events` lists `RoomEvent`s chronologically; `queueItems` lists active `QueueItem`s by vote score
  - `Participant` — `id`, `roomId`, `role` (`HOST` | `GUEST`), optional `name`/`nameKey` for guests only (unique per room, case-insensitive); hosts are unnamed desk operators
  - `RoomEvent` — `id`, `roomId`, `participantId`, optional `participantName` + `participantRole` (denormalized), `type` (`JOINED` | `LEFT`), timestamps; persisted on join/leave and published over Redis pub/sub for live subscribers
  - `QueueItem` — `id`, `roomId`, `participantId` (submitter), `type` (`YOUTUBE` only for now), `externalId`, `title`, `thumbnailUrl` (fetched once via YouTube Data API at submit), `finished` (soft-pop flag; finished items stay in Mongo but are omitted from playlist queries), `score` (net up−down votes), computed `embedUrl`, timestamps; one room → many queue items
  - `Vote` — `id`, `roomId`, `queueItemId`, `participantId`, `value` (`UP` | `DOWN`), timestamps; unique per `(queueItemId, participantId)` — one vote per participant per item
  - Embed resolution — `src/lib/mediaEmbed.ts` parses provider media refs (YouTube URL/id) and builds privacy-enhanced embed URLs
  - Media metadata — `src/lib/mediaMetadata.ts` (`MediaMetadataProvider`); YouTube implementation calls Data API `videos.list` (`part=snippet`) using server env `YOUTUBE_API_KEY`
- **Room shortId**: Ambiguity-safe alphabet (`A–Z` / `2–9`, no `0/O/1/I/L`); unique; used in `/rooms/:roomId` URLs and join form.
- **Participant API**: `createRoom(name)` → `{ room, participant }` (unnamed host); `joinRoom(roomId, name)` → named guest; `leaveRoom(participantId)`; `participant(id)`
- **RoomEvent API**: `roomEvents(roomId)`; `Room.events`; subscription `roomEventAdded(roomId)` (accepts shortId or ObjectId; fans out by Mongo room id)
- **QueueItem API**: `queueItems(roomId)` / `Room.queueItems` (active/`finished: false` only, sorted by `score` desc then `createdAt` asc); `addQueueItem(participantId, type, mediaRef)`; `popQueueItem(id)` marks `finished: true` without deleting; field `viewerVote(participantId)` on `QueueItem`; subscriptions `queueItemAdded(roomId)`, `queueItemPopped(roomId)`, `queueItemUpdated(roomId)`
- **Vote API**: `myQueueVotes(roomId, participantId)`; `voteOnQueueItem(participantId, queueItemId, value)` → `{ queueItem, value }` — upserts one vote per participant per item; submitting the same value again clears the vote; adjusts denormalized `score` and publishes `queueItemUpdated`
- **Realtime**: TypeGraphQL + `@graphql-yoga/subscription`; Redis via `@graphql-yoga/redis-event-target` when `REDIS_URL` is set, otherwise in-memory pub/sub (single process / tests). Topics: `ROOM_EVENT`, `QUEUE_ITEM_ADDED`, `QUEUE_ITEM_POPPED`, `QUEUE_ITEM_UPDATED`. Transport: `graphql-ws` over WebSockets.
- **Browser membership** (`apps/web/src/lib/membership.ts`): `localStorage` key `athens-fm.active-membership` stores `{ participantId, roomId, roomShortId, role, participantName? }`. One active room per browser — create/join blocked while set; leave clears it. Hosts stay on `/rooms/:id/host` (no participant view).
- **Display names**: Required for guests only; rejected with a user-facing error when already taken in that room (case-insensitive).
- **Database**: MongoDB via `MONGODB_URI` (Mongoose 8 + Typegoose).
- **Cache/broker**: Redis via `REDIS_URL` (`src/config/redis.ts` for health/general; separate ioredis publisher+subscriber clients for GraphQL pub/sub).
- **Tests**: Jest + Supertest against `createApp()`; GraphQL Room/Participant/RoomEvent/QueueItem tests use `mongodb-memory-server`.

## Vercel deployment

- **Config**: Root `vercel.json`
  - Fluid compute enabled (`fluid: true`); `api/index.ts` `maxDuration` 300s
  - Install: `npm install --include=dev --workspaces -w @athens-fm/web -w @athens-fm/api` (+ root `.npmrc` `include=dev`)
    - Vercel detects this repo as Express (`api/`) and otherwise runs an API-only filtered workspace install (~591 packages) that skips `@athens-fm/web` (no Vite) even when Vite is in `dependencies`
    - Explicit `-w` / `--workspaces` forces both app packages to install
  - Web build toolchain (`vite`, `typescript`, Tailwind plugins, React types) lives in `@athens-fm/web` `dependencies`; Jest stays in `devDependencies` and is excluded from production `tsc -b`
  - Builds `@athens-fm/web` → `apps/web/dist`
  - Rewrites `/api/*` → `/api` serverless function
  - SPA fallback rewrite for client routes (`/rooms/...`)
- **Serverless entry**: `api/index.ts` exports an `http.Server` from `createHttpServer()` (Express + Apollo HTTP + `graphql-ws` WebSockets). Matches [Vercel Functions WebSockets](https://vercel.com/docs/functions/websockets) (native Node `ws`, not `experimental_upgradeWebSocket`).
  - Sockets are pinned to one Function instance; `REDIS_URL` + Yoga Redis event target fans out pub/sub across instances
  - Connections close when the Function hits `maxDuration`; the web client reconnects via `graphql-ws` retry backoff
  - `attachDatabasePool` from `@vercel/functions` is applied to Mongo + Redis clients for Fluid idle pool release
- **Env vars** (set in Vercel project + local `.env`):
  - `MONGODB_URI` — Atlas (or other) connection string
  - `REDIS_URL` — **required for multi-listener production** (e.g. Upstash / Vercel Marketplace Redis); without it, pub/sub is in-memory per instance only
  - `CORS_ORIGIN` — production web origin(s), comma-separated if multiple
  - `PORT` — local/docker only
  - `YOUTUBE_API_KEY` — YouTube Data API v3 key (server-only; used when adding queue items to resolve title/thumbnail)
  - `VITE_GRAPHQL_URL` — optional; defaults to `/api/graphql`
- **Local Vercel parity**: `vercel dev` from repo root after `vercel link` (needed to exercise the WS export path).
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

- Auth strategy not chosen.
- Production Redis provider not chosen (Upstash vs other); local Docker Redis is the default broker for subscriptions. Vercel multi-instance rooms require a shared `REDIS_URL`.
- Additional embed providers beyond YouTube not implemented (player/embed interfaces are ready for adapters).
