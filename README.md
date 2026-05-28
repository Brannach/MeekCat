# MeekCat

[![CI](https://github.com/Brannach/MeekCat/actions/workflows/ci.yml/badge.svg)](https://github.com/Brannach/MeekCat/actions/workflows/ci.yml)

A lightweight project & task tracker built as a learning project: a **Kanban board** for day-to-day tasks and a **Roadmap** (swimlane Gantt) for the bigger picture. A React (Vite) frontend served by a Node.js + Express REST API, with persistent storage in SQLite locally and **Turso** in production, Playwright UI tests, a multi-stage Dockerfile, and a GitHub Actions pipeline that builds, tests, and auto-deploys to Azure Container Apps.

**Live:** https://meekcat.livelysky-e7562e25.brazilsouth.azurecontainerapps.io

## Features

- **Board** — a three-column Kanban (To Do / In Progress / Done). Add tasks with a priority, move cards between columns, and delete them. Tasks persist across page reloads, server restarts, and full cloud redeploys.
- **Roadmap** — a swimlane Gantt across a one-year timeline, one lane per category. Quarter gridlines, quarterly review flags, milestone diamonds, a "today" marker that crosses every lane, and automatic vertical stacking so overlapping tasks never collide. Added items persist the same way Board tasks do.
- **Theme** — light/dark toggle, persisted in the browser.

## Tech stack

- **Frontend:** React 18, Vite 5, Tailwind CSS v4, React Router
- **Backend:** Node.js + Express (REST API + serves the built client)
- **Database:** SQLite via `@libsql/client` — a local file in development, **Turso** (free tier, SQLite-compatible) in production
- **Tests:** Playwright
- **Delivery:** Docker, GitHub Actions, GitHub Container Registry, Azure Container Apps

## Project structure

```
.
├── client/                 # React + Vite frontend (Tailwind v4)
│   └── src/pages/          # HomePage, BoardPage, RoadmapPage, SettingsPage
├── server/                 # Node.js + Express REST API
│   ├── index.js            # routes + async startup (await init() before listen)
│   ├── db.js               # libSQL client, schema, seed, reset helpers
│   └── data/               # local SQLite file lives here (gitignored)
├── tests/                  # Playwright tests (board, roadmap, smoke)
├── .github/workflows/ci.yml
├── Dockerfile
├── DEPLOYMENT.md           # full cloud deployment + CD + Turso guide
├── playwright.config.js
└── package.json            # root scripts (dev, build, test:e2e)
```

## Prerequisites

- Node.js 20+
- npm 10+
- (Optional) Docker, for container build/deploy

## Install

```bash
npm run install:all
```

## Run in development

Runs the Vite dev server and the Express API together. Vite proxies `/api/*` to the Node server, and the client hot-reloads on save.

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3000

The `dev:server` script sets `SEED_DB=true`, so the local SQLite file at `server/data/meekcat.db` is populated with example tasks and roadmap items on first run. Subsequent restarts reuse whatever's already in the file — adds, edits, and deletes persist across dev sessions.

## Build & run production locally

```bash
npm run build        # builds React into client/dist
npm start            # Node serves API + built client on http://localhost:3000
```

`npm start` doesn't set `SEED_DB`, so the DB starts empty unless populated some other way. To point the local server at your real Turso DB instead of a local file, set the env vars before running:

```bash
DATABASE_URL=libsql://<your-db>.turso.io DATABASE_AUTH_TOKEN=<token> npm start
```

## Run tests

```bash
npm run test:install   # one-time: download Playwright's chromium
npm run test:e2e       # builds the client, starts the server, runs Playwright
```

Playwright's `webServer` config builds + starts the server with `DATABASE_URL=:memory:`, so tests never touch your dev data and start from a clean slate. Each test resets the DB via a test-only endpoint (`POST /api/test/reset`, disabled in production) and creates only the fixtures it needs. The suite covers the home page, the Board (render, add, move, delete, persistence) and the Roadmap (render, add, overlap stacking, persistence).

## Database

The server uses a small set of env vars to decide where its data lives and whether to seed:

- `DATABASE_URL` — libSQL connection string.
  - **Unset** (default): a local SQLite file at `server/data/meekcat.db`.
  - `:memory:`: an ephemeral in-memory DB (what tests use).
  - `libsql://...`: a remote Turso (or other libSQL) database.
- `DATABASE_AUTH_TOKEN` — only required for remote `libsql://` URLs.
- `SEED_DB=true` — opt-in: populates an empty DB with example data on startup. The `npm run dev` script sets this; production and tests do not.

The same code paths handle all three modes — local file, in-memory, remote — through env vars alone, with no per-environment code changes.

## Docker

Build and run the production image locally:

```bash
docker build -t meekcat .
docker run --rm -p 3000:3000 meekcat
```

Then open http://localhost:3000.

## Deployment

MeekCat runs on **Azure Container Apps**, with the image hosted on **GitHub Container Registry** and persistent data on **Turso**. Every push to `main` runs the pipeline (test → build & push image → deploy), so releases are fully automated and data added to the live app survives across deploys.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete step-by-step guide — Azure account, CLI, GHCR, Container Apps, OIDC-based continuous deployment, and the Turso persistence layer — plus a cost summary and troubleshooting reference.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. **test** — installs dependencies, builds the client, and runs the Playwright suite (uploads the HTML report as an artifact).
2. **docker** — builds the multi-stage image and pushes it to `ghcr.io/<owner>/meekcat` (`:latest` and `:<sha>`). Runs only on pushes to `main`.
3. **deploy** — authenticates to Azure via OIDC and rolls the Container App to the new image. Runs only on pushes to `main`.

Azure-side env vars used by the deployed app: `DATABASE_URL` (plain value) and `DATABASE_AUTH_TOKEN` (Container Apps secret, referenced from the env via `secretref:`).

## API

The Express server exposes a small REST API:

| Method | Path                          | Description                                                    |
|--------|-------------------------------|----------------------------------------------------------------|
| GET    | `/api/board/tasks`            | List board tasks                                               |
| POST   | `/api/board/tasks`            | Create a task (`{ title, priority }`)                          |
| PATCH  | `/api/board/tasks/:id`        | Update title / status / priority                               |
| DELETE | `/api/board/tasks/:id`        | Delete a task                                                  |
| GET    | `/api/roadmap/items`          | List roadmap items                                             |
| POST   | `/api/roadmap/items`          | Create an item (`{ category, title, start, end, percent }`)    |
| GET    | `/api/roadmap/milestones`     | List roadmap milestones                                        |
| GET    | `/api/health`                 | Health check — `{ status: "ok" }`                              |
| GET    | `/api/hello`                  | Sample endpoint — `{ message, from, timestamp }`               |
| POST   | `/api/test/reset`             | Wipe all tables (dev/test only, gated by `NODE_ENV !== 'production'`) |
