import express from "express";
import { prisma, Category, Priority, Status } from "db";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// API key from env only — never hardcode
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * LLM classification prompt (reviewable in codebase).
 * Output format: exactly one line with two words, "category priority".
 * - Categories: billing (payments, invoices, refunds), technical (bugs, errors, API, features),
 *   account (login, password, access), general (everything else).
 * - Priorities: critical (outage, urgent, down), high (blocked, important), medium (default),
 *   low (minor, suggestion, when possible).
 */
const CLASSIFY_SYSTEM_PROMPT = `You classify support ticket descriptions into one category and one priority.

Reply with exactly two words on a single line, separated by one space: first the category, then the priority. No other text.

Categories (use exactly one):
- billing: payments, invoices, refunds, subscription, charges
- technical: bugs, errors, crashes, API issues, features, integration
- account: login, password, email, access, sign-in, account settings
- general: anything that doesn't fit above

Priorities (use exactly one):
- critical: outage, system down, urgent, asap, cannot work
- high: blocked, important, need soon
- medium: normal request
- low: minor, suggestion, when possible, no rush

Example: technical high`;

// --- Helpers: validate enums and build filter ---
const CATEGORIES = Object.values(Category) as readonly Category[];
const PRIORITIES = Object.values(Priority) as readonly Priority[];
const STATUSES = Object.values(Status) as readonly Status[];

function parseOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value).toLowerCase();
  return allowed.includes(s as T) ? (s as T) : undefined;
}

// --- POST /api/tickets/classify/ ---
// Frontend calls this as the user types (or on blur/submit), then pre-fills category/priority
// dropdowns; user can accept or override before submitting. If LLM fails, we fall back to
// keyword-based suggestions so the flow never blocks ticket submission.
app.post("/api/tickets/classify/", async (req, res) => {
  const description = req.body?.description;
  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "description is required" });
  }

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
        max_tokens: 20,
      });
      const text =
        completion.choices[0]?.message?.content?.trim().toLowerCase() ?? "";
      const parts = text.split(/\s+/).filter(Boolean);
      const rawCategory = parts[0];
      const rawPriority = parts[1];
      const validCategory =
        rawCategory && CATEGORIES.includes(rawCategory as Category);
      const validPriority =
        rawPriority && PRIORITIES.includes(rawPriority as Priority);
      if (validCategory && validPriority) {
        return res.json({
          suggested_category: rawCategory,
          suggested_priority: rawPriority,
        });
      }
      // Garbage or malformed response: use fallback so we never return invalid suggestions
      console.warn("LLM returned invalid format, using fallback:", text);
    } catch (err) {
      // LLM unreachable or error: fall back so ticket submission is never blocked
      console.warn("LLM classify failed, using fallback:", err);
    }
  }

  // No API key or LLM failure: keyword-based fallback (ticket submission always works).
  const lower = description.toLowerCase();
  let suggested_category: Category = "general";
  if (/\b(bill|payment|charge|invoice|subscription|refund)\b/.test(lower))
    suggested_category = "billing";
  else if (/\b(login|password|account|email|access|sign)\b/.test(lower))
    suggested_category = "account";
  else if (/\b(error|bug|crash|slow|broken|feature|api|integration)\b/.test(lower))
    suggested_category = "technical";

  let suggested_priority: Priority = "medium";
  if (/\b(urgent|critical|down|outage|immediately|asap)\b/.test(lower))
    suggested_priority = "critical";
  else if (/\b(important|asap|soon|blocked)\b/.test(lower))
    suggested_priority = "high";
  else if (/\b(minor|whenever|suggestion)\b/.test(lower))
    suggested_priority = "low";

  return res.json({ suggested_category, suggested_priority });
});

// --- POST /api/tickets/ ---
app.post("/api/tickets/", async (req, res) => {
  const { title, description, category, priority } = req.body ?? {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required (max 200 chars)" });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: "title must be at most 200 characters" });
  }
  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "description is required" });
  }

  const cat = parseOptionalEnum(category, CATEGORIES) ?? "general";
  const pri = parseOptionalEnum(priority, PRIORITIES) ?? "medium";

  try {
    const ticket = await prisma.ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: cat,
        priority: pri,
        status: "open",
      },
    });
    return res.status(201).json(ticket);
  } catch (e) {
    console.error("Create ticket error:", e);
    return res.status(500).json({ error: "Failed to create ticket" });
  }
});

// --- GET /api/tickets/ ---
app.get("/api/tickets/", async (req, res) => {
  const category = parseOptionalEnum(req.query.category as string, CATEGORIES);
  const priority = parseOptionalEnum(req.query.priority as string, PRIORITIES);
  const status = parseOptionalEnum(req.query.status as string, STATUSES);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const where: Parameters<typeof prisma.ticket.findMany>[0]["where"] = {};
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
    return res.json(tickets);
  } catch (e) {
    console.error("List tickets error:", e);
    return res.status(500).json({ error: "Failed to list tickets" });
  }
});

// --- GET /api/tickets/stats/ --- (DB-level aggregation only; must be before :id)
app.get(["/api/tickets/stats", "/api/tickets/stats/"], async (_req, res) => {
  try {
    const [totalResult, openResult, byPriority, byCategory, dateRange] =
      await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.count({ where: { status: "open" } }),
        prisma.ticket.groupBy({ by: ["priority"], _count: { priority: true } }),
        prisma.ticket.groupBy({ by: ["category"], _count: { category: true } }),
        prisma.ticket.aggregate({
          _min: { created_at: true },
          _max: { created_at: true },
        }),
      ]);

    const total_tickets = totalResult;
    const open_tickets = openResult;

    let avg_tickets_per_day = 0;
    const minDate = dateRange._min.created_at;
    const maxDate = dateRange._max.created_at;
    if (minDate && maxDate && total_tickets > 0) {
      const days = Math.max(
        1,
        (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      avg_tickets_per_day = Math.round((total_tickets / days) * 10) / 10;
    }

    const priority_breakdown: Record<Priority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const row of byPriority) {
      priority_breakdown[row.priority] = row._count.priority;
    }

    const category_breakdown: Record<Category, number> = {
      billing: 0,
      technical: 0,
      account: 0,
      general: 0,
    };
    for (const row of byCategory) {
      category_breakdown[row.category] = row._count.category;
    }

    return res.json({
      total_tickets,
      open_tickets,
      avg_tickets_per_day,
      priority_breakdown,
      category_breakdown,
    });
  } catch (e) {
    console.error("Stats error:", e);
    return res.status(500).json({ error: "Failed to compute stats" });
  }
});

// --- PATCH /api/tickets/:id ---
app.patch("/api/tickets/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Ticket id required" });

  const body = req.body ?? {};
  const data: Parameters<typeof prisma.ticket.update>[0]["data"] = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim())
      return res.status(400).json({ error: "title must be a non-empty string" });
    if (body.title.length > 200)
      return res.status(400).json({ error: "title must be at most 200 characters" });
    data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string")
      return res.status(400).json({ error: "description must be a string" });
    data.description = body.description.trim();
  }
  const cat = parseOptionalEnum(body.category, CATEGORIES);
  if (cat !== undefined) data.category = cat;
  const pri = parseOptionalEnum(body.priority, PRIORITIES);
  if (pri !== undefined) data.priority = pri;
  const st = parseOptionalEnum(body.status, STATUSES);
  if (st !== undefined) data.status = st;

  if (Object.keys(data).length === 0) {
    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });
    return res.json(existing);
  }

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data,
    });
    return res.json(ticket);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025")
      return res.status(404).json({ error: "Ticket not found" });
    console.error("Update ticket error:", e);
    return res.status(500).json({ error: "Failed to update ticket" });
  }
});

// --- GET /api/tickets/:id (optional, for single ticket view) ---
app.get("/api/tickets/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Ticket id required" });
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    return res.json(ticket);
  } catch (e) {
    console.error("Get ticket error:", e);
    return res.status(500).json({ error: "Failed to get ticket" });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
