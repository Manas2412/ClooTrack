# 🎫 Support Ticket System

A modern, AI-assisted support ticket platform.  
Built for speed. Designed for resilience. Ready to ship.

Spin up the entire stack — database, backend, and frontend — with one command.

## ⚡ Run It

```bash
docker-compose up --build
```

**Open:**

- **🌐 App** → http://localhost:3001
- **🔧 API** → http://localhost:3000

### Port 3001 busy?

```bash
FRONTEND_PORT=3002 docker-compose up --build
```

Then open: http://localhost:3002

No local Postgres.  
No manual migrations.  
No extra setup.

---

## 🧠 AI-Powered (Optional)

This system supports automatic ticket classification using OpenAI.

Create a `.env` file in the root:

```env
OPENAI_API_KEY=sk-your-key
```

**If the key is missing?** No problem.

The system automatically falls back to a keyword-based classifier.  
Ticket creation never breaks.

---

## 🤖 LLM Choice

**Model:** `gpt-4o-mini`

**Why this model?**

- ⚡ Fast inference for short prompts
- 💰 Cost-efficient for classification
- 🎯 Reliable structured output
- 🔁 Easy validation + safe fallback

The model returns exactly:

```
<category> <priority>
```

**Example:** `technical high`

**Allowed categories:** `billing` · `technical` · `account` · `general`

**Allowed priorities:** `low` · `medium` · `high` · `critical`

If the response is invalid → fallback kicks in automatically.

*Resilience > novelty.*

---

## 🏗 Architecture

Built as a Turbo monorepo:

```
apps/
  backend/
  frontend/

packages/
  db/
  ui/
```

**Why this structure?**

- Single clone
- Single command to run
- Shared database layer
- Clean separation of concerns
- Easy scaling later

---

## 🐘 Database

- PostgreSQL runs entirely in Docker
- `DATABASE_URL` is injected via compose
- Backend runs `prisma migrate deploy` on startup
- Zero manual migration steps

---

## ⚡ Runtime: Bun

Both backend and frontend use Bun inside Docker.

**Why?**

- Faster installs
- Faster builds
- Works cleanly with Prisma + Next.js
- Leaner containers

---

## 🎨 Frontend

Built with Next.js.

**Includes:**

- 📝 Ticket creation form (debounced classification)
- 📋 Ticket list
- 🔍 Filters + search
- 📊 Stats dashboard

The frontend talks to the backend via:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Configured at build time for clean host access.

---

## 🌐 API Design

Simple REST API:

- `POST /tickets`
- `GET /tickets`
- `PATCH /tickets/:id`
- `GET /stats`

Stats are computed using Prisma: `count`, `groupBy`, `aggregate`.

No in-memory aggregation loops. Database does the heavy lifting.

---

## 🛡 Built for Failure

This system is designed to fail safely:

- **LLM down?** → fallback works
- **Invalid AI output?** → rejected + fallback
- **Fresh environment?** → migrations auto-run
- **No local DB?** → Docker handles it

The user flow never blocks.

---

## 🧩 Tech Stack

- **Next.js** (Frontend)
- **Express** (Backend)
- **PostgreSQL**
- **Prisma**
- **Bun**
- **Docker + Docker Compose**
- **OpenAI** (`gpt-4o-mini`)

---

## 🎯 Philosophy

This isn’t just a CRUD app.

It demonstrates:

- Clean monorepo architecture
- Production-safe migrations
- AI integration with guardrails
- Fail-safe design
- Single-command reproducibility

*If you can run it with one command, you can ship it.*
