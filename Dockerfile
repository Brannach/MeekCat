# --- Stage 1: build the React client ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: install server deps ---
FROM node:20-bookworm-slim AS server-deps
WORKDIR /app/server

# better-sqlite3 has no prebuilt for this Node/libc combo, so compile from source.
# These build tools live in this stage only — the final image stays slim.
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
RUN npm ci --omit=dev

# --- Stage 3: final runtime image ---
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/index.js"]