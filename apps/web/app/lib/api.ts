const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type Category = "billing" | "technical" | "account" | "general";
export type Priority = "low" | "medium" | "high" | "critical";
export type Status = "open" | "in_progress" | "resolved" | "closed";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  created_at: string;
}

export interface Stats {
  total_tickets: number;
  open_tickets: number;
  avg_tickets_per_day: number;
  priority_breakdown: Record<Priority, number>;
  category_breakdown: Record<Category, number>;
}

export interface ClassifyResponse {
  suggested_category: Category;
  suggested_priority: Priority;
}

export async function classify(description: string): Promise<ClassifyResponse> {
  const res = await fetch(`${API_BASE}/api/tickets/classify/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw new Error("Classify failed");
  return res.json();
}

export async function createTicket(body: {
  title: string;
  description: string;
  category: Category;
  priority: Priority;
}): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create ticket");
  }
  return res.json();
}

export async function listTickets(params: {
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
}): Promise<Ticket[]> {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.priority) q.set("priority", params.priority);
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  const res = await fetch(`${API_BASE}/api/tickets/?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to load tickets");
  return res.json();
}

export async function updateTicket(
  id: string,
  data: Partial<Pick<Ticket, "title" | "description" | "category" | "priority" | "status">>
): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update ticket");
  }
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/tickets/stats/`);
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}
