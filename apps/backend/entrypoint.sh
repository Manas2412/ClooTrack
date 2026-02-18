#!/bin/sh
set -e
cd /app/packages/db
echo "Running database migrations..."
bunx prisma migrate deploy
cd /app
echo "Starting backend..."
exec bun run apps/backend/index.ts
