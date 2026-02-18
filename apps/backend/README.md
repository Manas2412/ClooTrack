# Backend — Support Ticket System

## Setup

From the repo root (or with `DATABASE_URL` and optional `OPENAI_API_KEY` set):

```bash
bun install
```

Set environment variables (e.g. in `.env` in `packages/db` or when running):

- **`DATABASE_URL`** — PostgreSQL connection string (required for DB). Prisma config reads this from `packages/db` (see `packages/db/prisma.config.ts`).
- **`OPENAI_API_KEY`** — Optional. If set, `POST /api/tickets/classify/` uses OpenAI to suggest category and priority; otherwise a keyword-based fallback is used.
- **`PORT`** — Server port (default: 3000).

Apply migrations (from repo root or `packages/db`):

```bash
cd packages/db && bunx prisma migrate dev
```

Run the server (from repo root so `db` workspace is available):

```bash
bun run apps/backend/index.ts
# or from apps/backend (with workspace deps installed): bun run index.ts
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/api/tickets/` | Create a ticket. Body: `title`, `description`, optional `category`, `priority`. Returns 201. |
| **GET** | `/api/tickets/` | List tickets (newest first). Query: `?category=`, `?priority=`, `?status=`, `?search=` (title + description). |
| **PATCH** | `/api/tickets/:id` | Update a ticket (e.g. status, category, priority). |
| **GET** | `/api/tickets/stats/` | Aggregated stats (total, open, avg per day, priority/category breakdown). |
| **POST** | `/api/tickets/classify/` | Body: `{ "description": "..." }`. Returns LLM-suggested `{ "category", "priority" }`. |

**Enums:** `category`: billing | technical | account | general. `priority`: low | medium | high | critical. `status`: open | in_progress | resolved | closed (default: open).

**Stats response shape:**

```json
{
  "total_tickets": 124,
  "open_tickets": 67,
  "avg_tickets_per_day": 8.3,
  "priority_breakdown": { "low": 30, "medium": 52, "high": 31, "critical": 11 },
  "category_breakdown": { "billing": 28, "technical": 55, "account": 22, "general": 19 }
}
```

Stats use database-level aggregation (Prisma `count`, `groupBy`, `aggregate`), not application-level loops.
