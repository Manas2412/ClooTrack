# Build from repo root: docker build -f apps/web/Dockerfile .
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Copy full monorepo for workspace resolution
COPY package.json bun.lock* turbo.json ./
COPY apps/web ./apps/web
COPY packages/db ./packages/db
COPY packages/ui ./packages/ui
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

RUN bun install
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN cd packages/db && bunx prisma generate
RUN cd apps/web && bun run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app/apps/web
CMD ["bun", "run", "start"]