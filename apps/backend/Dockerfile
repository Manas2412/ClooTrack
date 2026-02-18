# Build from repo root: docker build -f apps/backend/Dockerfile .
FROM oven/bun:1-alpine AS base
WORKDIR /app

COPY package.json bun.lock* turbo.json ./
COPY apps/backend ./apps/backend
COPY packages/db ./packages/db

RUN bun install --frozen-lockfile && cd packages/db && bunx prisma generate

EXPOSE 3000
ENV PORT=3000
# OPENAI_API_KEY set via docker-compose or .env for LLM classification
WORKDIR /app
CMD ["bun", "run", "apps/backend/index.ts"]
