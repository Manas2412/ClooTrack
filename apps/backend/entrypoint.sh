#!/bin/sh
set -e
cd /app/packages/db
bunx prisma migrate deploy
cd /app
exec bun run apps/backend/index.ts
