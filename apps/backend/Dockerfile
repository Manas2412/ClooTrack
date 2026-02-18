# Build from repo root: docker build -f apps/backend/Dockerfile .
FROM oven/bun:1-alpine AS base
WORKDIR /app

COPY package.json bun.lock* turbo.json ./
COPY apps/backend ./apps/backend
COPY packages/db ./packages/db

RUN bun install && cd packages/db && bunx prisma generate

RUN chmod +x /app/apps/backend/entrypoint.sh

EXPOSE 3000
ENV PORT=3000
# OPENAI_API_KEY and DATABASE_URL set via docker-compose / .env
ENTRYPOINT ["/app/apps/backend/entrypoint.sh"]
