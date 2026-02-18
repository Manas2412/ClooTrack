"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Category,
  type Priority,
  type Status,
  type Ticket,
  type Stats,
  classify,
  createTicket,
  listTickets,
  updateTicket,
  getStats,
} from "./lib/api";
import styles from "./page.module.css";

const CATEGORIES: Category[] = ["billing", "technical", "account", "general"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const STATUSES: Status[] = ["open", "in_progress", "resolved", "closed"];

const TRUNCATE_LEN = 80;

function truncate(s: string, len: number) {
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [priority, setPriority] = useState<Priority>("medium");
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Status | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const classifyAbortRef = useRef<AbortController | null>(null);
  const classifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const data = await listTickets({
        category: filterCategory || undefined,
        priority: filterPriority || undefined,
        status: filterStatus || undefined,
        search: search.trim() || undefined,
      });
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [filterCategory, filterPriority, filterStatus, search]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced classify when description changes
  useEffect(() => {
    const trimmed = description.trim();
    if (!trimmed) return;

    if (classifyTimeoutRef.current) clearTimeout(classifyTimeoutRef.current);
    classifyTimeoutRef.current = setTimeout(() => {
      classifyTimeoutRef.current = null;
      if (classifyAbortRef.current) classifyAbortRef.current.abort();
      classifyAbortRef.current = new AbortController();
      setClassifyLoading(true);
      classify(trimmed)
        .then((res) => {
          setCategory(res.suggested_category);
          setPriority(res.suggested_priority);
        })
        .catch(() => {})
        .finally(() => {
          setClassifyLoading(false);
          classifyAbortRef.current = null;
        });
    }, 500);

    return () => {
      if (classifyTimeoutRef.current) clearTimeout(classifyTimeoutRef.current);
      if (classifyAbortRef.current) classifyAbortRef.current.abort();
    };
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) return;
    if (t.length > 200) {
      setSubmitError("Title must be at most 200 characters");
      return;
    }
    setSubmitLoading(true);
    try {
      const created = await createTicket({
        title: t,
        description: d,
        category,
        priority,
      });
      setTitle("");
      setDescription("");
      setCategory("general");
      setPriority("medium");
      setLastCreatedId(created.id);
      await Promise.all([fetchTickets(), fetchStats()]);
      setTimeout(() => setLastCreatedId(null), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTicketClick = (t: Ticket) => {
    if (editingId === t.id) return;
    setEditingId(t.id);
    setEditStatus(t.status);
  };

  const handleStatusChange = async (id: string, newStatus: Status) => {
    setSavingStatus(true);
    try {
      await updateTicket(id, { status: newStatus });
      setEditStatus(newStatus);
      const updated = await listTickets({
        category: filterCategory || undefined,
        priority: filterPriority || undefined,
        status: filterStatus || undefined,
        search: search.trim() || undefined,
      });
      setTickets(updated);
      await fetchStats();
    } catch {
      // keep previous state
    } finally {
      setSavingStatus(false);
    }
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditStatus(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Support Ticket System</h1>
      </header>

      <main className={styles.main}>
        {/* Stats Dashboard */}
        <section className={styles.section}>
          <h2>Stats</h2>
          {statsLoading ? (
            <p className={styles.muted}>Loading stats…</p>
          ) : stats ? (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.total_tickets}</span>
                <span className={styles.statLabel}>Total tickets</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.open_tickets}</span>
                <span className={styles.statLabel}>Open</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats.avg_tickets_per_day}</span>
                <span className={styles.statLabel}>Avg per day</span>
              </div>
              <div className={styles.statCard}>
                <div className={styles.breakdown}>
                  <span className={styles.statLabel}>Priority</span>
                  {PRIORITIES.map((p) => (
                    <span key={p}>
                      {p}: {stats.priority_breakdown[p]}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.breakdown}>
                  <span className={styles.statLabel}>Category</span>
                  {CATEGORIES.map((c) => (
                    <span key={c}>
                      {c}: {stats.category_breakdown[c]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>Could not load stats.</p>
          )}
        </section>

        {/* Submit form */}
        <section className={styles.section}>
          <h2>New Ticket</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label>
              Title (required, max 200)
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                className={styles.input}
              />
              <span className={styles.charCount}>{title.length}/200</span>
            </label>
            <label>
              Description (required)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className={styles.input}
                placeholder="Describe your issue…"
              />
              {classifyLoading && (
                <span className={styles.loading}>Suggesting category & priority…</span>
              )}
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={styles.select}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={styles.select}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            {submitError && <p className={styles.error}>{submitError}</p>}
            <button type="submit" disabled={submitLoading} className={styles.button}>
              {submitLoading ? "Submitting…" : "Submit ticket"}
            </button>
          </form>
          {lastCreatedId && (
            <p className={styles.success}>Ticket created. It appears in the list below.</p>
          )}
        </section>

        {/* Ticket list */}
        <section className={styles.section}>
          <h2>Tickets</h2>
          <div className={styles.filters}>
            <input
              type="search"
              placeholder="Search title & description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {ticketsLoading ? (
            <p className={styles.muted}>Loading tickets…</p>
          ) : (
            <ul className={styles.ticketList}>
              {tickets.length === 0 ? (
                <li className={styles.muted}>No tickets match the filters.</li>
              ) : (
                tickets.map((t) => (
                  <li
                    key={t.id}
                    className={`${styles.ticketCard} ${lastCreatedId === t.id ? styles.highlight : ""}`}
                    onClick={() => handleTicketClick(t)}
                  >
                    <div className={styles.ticketRow}>
                      <strong>{t.title}</strong>
                      <span className={styles.ticketMeta}>
                        {t.category} · {t.priority} · {t.status}
                      </span>
                      <time className={styles.ticketTime}>{formatDate(t.created_at)}</time>
                    </div>
                    <p className={styles.ticketDesc}>{truncate(t.description, TRUNCATE_LEN)}</p>
                    {editingId === t.id ? (
                      <div className={styles.editStatus} onClick={(e) => e.stopPropagation()}>
                        <label>
                          Status
                          <select
                            value={editStatus ?? t.status}
                            onChange={(e) =>
                              handleStatusChange(t.id, e.target.value as Status)
                            }
                            disabled={savingStatus}
                            className={styles.select}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={closeEdit}
                          className={styles.buttonSmall}
                        >
                          Close
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
