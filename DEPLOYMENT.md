# Deployment Guide

This repo now includes a Docker Compose stack that runs every backend dependency needed for SuperApp.

## Services

- **postgres** – PostgreSQL 15. Exposes port **5433** on the host while keeping the internal port at 5432. Data is persisted in the `postgres_data` volume.
- **backend** – `backenBun/` Bun application. Builds with the provided Dockerfile and runs on port **8080**. Loads defaults from `backenBun/.env` and overrides connection details to talk to the `postgres` and `ws-gateway` services.
- **ws-gateway** – `ws-gateway/` OCPP WebSocket gateway. Builds via a dedicated Dockerfile and runs on port **3000**, proxying to the `backend` service.

All services share the `csms-network` bridge network.

## Before You Start

1. Ensure Docker Desktop / Docker Engine with Compose v2 is installed.
2. Update `backenBun/.env` and `ws-gateway/.env` with production secrets (Omise keys, JWT, etc.). These files are loaded automatically when the containers start.
3. If you need a different public frontend URL, export `FRONTEND_URL` before running Compose:

   ```bash
   export FRONTEND_URL=https://app.example.com
   ```

## Build & Run

```bash
docker compose up -d --build
```

This command:

- Builds `backenBun` and `ws-gateway` images.
- Starts Postgres on `localhost:5433`.
- Starts the backend on `http://localhost:8080`.
- Starts the WebSocket gateway on `ws://localhost:3000`.

## Applying Prisma Migrations (optional)

If you need to run migrations after the stack is up:

```bash
docker compose exec backend bunx prisma migrate deploy
```

## Logs & Lifecycle

- Follow logs: `docker compose logs -f backend ws-gateway postgres`
- Stop stack: `docker compose down`
- Remove volumes (including Postgres data): `docker compose down -v`
