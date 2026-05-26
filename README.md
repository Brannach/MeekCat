# MeekCat

[![CI](https://github.com/Brannach/MeekCat/actions/workflows/ci.yml/badge.svg)](https://github.com/Brannach/MeekCat/actions/workflows/ci.yml)

A lightweight project & task tracker built as a learning project: a **Kanban board** for day-to-day tasks and a **Roadmap** (swimlane Gantt) for the bigger picture. A React (Vite) frontend served by a small Node.js + Express backend, with Playwright UI tests, a multi-stage Dockerfile, and a GitHub Actions pipeline that builds, tests, and auto-deploys to Azure Container Apps.

**Live:** https://meekcat.livelysky-e7562e25.brazilsouth.azurecontainerapps.io

## Features

- **Board** — a three-column Kanban (To Do / In Progress / Done). Add tasks with a priority, move cards between columns, and delete them.
- **Roadmap** — a swimlane Gantt across a one-year timeline, one lane per category. Quarter gridlines, quarterly review flags, milestone diamonds, a "today" marker that crosses every lane, and automatic vertical stacking so overlapping tasks never collide.
- **Theme** — light/dark toggle, persisted in the browser.

## Tech stack

- Frontend: React 18, Vite 5, Tailwind CSS v4, React Router
- Backend: Node.js + Express (serves the API and the built client)
- Tests: Playwright
- Delivery: Docker, GitHub Actions, GitHub Container Registry, Azure Container Apps

## Project structure

```
.
├── client/                 # React + Vite frontend (Tailwind v4)
│   └── src/pages/          # HomePage, BoardPage, RoadmapPage, SettingsPage
├── server/                 # Node.js + Express (serves API + built client)
├── tests/                  # Playwright tests (board, roadmap, smoke)
├── .github/workflows/ci.yml
├── Dockerfile
├── DEPLOYMENT.md           # full cloud deployment + CD guide
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

## Build & run production locally

```bash
npm run build        # builds React into client/dist
npm start            # Node serves API + built client on http://localhost:3000
```

## Run tests

```bash
npm run test:install   # one-time: download Playwright's chromium
npm run test:e2e       # builds the client, starts the server, runs Playwright
```

Playwright's `webServer` config handles the build + start automatically. The suite covers the home page, the Board (render, add, move, delete), and the Roadmap (render, add, overlap stacking).

## Docker

Build and run the production image locally:

```bash
docker build -t meekcat .
docker run --rm -p 3000:3000 meekcat
```

Then open http://localhost:3000.

## Deployment

MeekCat runs on **Azure Container Apps**, with the image hosted on **GitHub Container Registry**. Every push to `main` runs the pipeline (test → build & push image → deploy), so releases are fully automated.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the complete step-by-step guide — Azure account, CLI, GHCR, Container Apps, and OIDC-based continuous deployment — plus a cost summary and troubleshooting reference.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. **test** — installs dependencies, builds the client, and runs the Playwright suite (uploads the HTML report as an artifact).
2. **docker** — builds the multi-stage image and pushes it to `ghcr.io/<owner>/meekcat` (`:latest` and `:<sha>`). Runs only on pushes to `main`.
3. **deploy** — authenticates to Azure via OIDC and rolls the Container App to the new image. Runs only on pushes to `main`.

## API

The Express server also exposes a couple of small endpoints:

- `GET /api/health` → `{ status: "ok" }` — health check, handy for cloud probes
- `GET /api/hello` → `{ message, from, timestamp }` — sample endpoint
