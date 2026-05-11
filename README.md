# Hello World — React + Node.js

A minimal full-stack web app: a React (Vite) frontend that calls a Node.js + Express backend, with Playwright UI tests, a Dockerfile for cloud deploy, and a GitHub Actions CI workflow.

## Project structure

```
.
├── client/                 # React + Vite frontend
├── server/                 # Node.js + Express backend (serves API and built client)
├── tests/                  # Playwright UI/API tests
├── .github/workflows/ci.yml
├── Dockerfile
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

Runs the Vite dev server and the Express API together. Vite proxies `/api/*` to the Node server.

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
npm run test:install   # one-time: download Playwright browser
npm run test:e2e       # builds the client, starts the server, runs Playwright
```

Playwright's `webServer` config handles the build + start automatically.

## Docker

Build and run the production image:

```bash
docker build -t hello-world-react-node .
docker run --rm -p 3000:3000 hello-world-react-node
```

Then open http://localhost:3000.

## Deploy to the cloud

The Docker image is portable — deploy it anywhere that runs containers:

- **Fly.io:** `fly launch` then `fly deploy`
- **Render:** create a Web Service, point at this repo, runtime "Docker"
- **Google Cloud Run:** `gcloud run deploy --source .`
- **AWS App Runner / ECS:** push the image to ECR and create a service
- **Azure Container Apps:** `az containerapp up --source .`

All of these will respect the `PORT` env var that the server reads.

## CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. Installs dependencies for root, `client/`, and `server/`
2. Installs Playwright's chromium browser
3. Builds the client, starts the server, and runs the Playwright suite
4. Uploads the Playwright HTML report as a workflow artifact
5. Builds the Docker image (cached via GitHub Actions cache)

## API

- `GET /api/hello` → `{ message, from, timestamp }`
- `GET /api/health` → `{ status: "ok" }`
