"use client";

import { useEffect, useState } from "react";
import AdminPageScaffold, { AdminPageCard } from "../../../components/admin/page-scaffold";

interface SupportMessage {
  id: string;
  createdAt: string;
  body: string;
  fromAdmin: boolean;
}

interface SupportThread {
  id: string;
  createdAt: string;
  updatedAt: string;
  subject: string;
  status: string;
  tenant: {
    slug: string;
    profile: { businessName: string } | null;
  };
  messages: SupportMessage[];
  _count: { messages: number };
}

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeThread, setActiveThread] = useState<SupportThread | null>(null);
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | "resolved">("open");
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadThreads(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/threads?status=${status}`);
      const data = (await res.json()) as { threads?: SupportThread[] };
      setThreads(data.threads ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadThread(id: string) {
    const res = await fetch(`/api/admin/support/threads/${id}`);
    const data = (await res.json()) as { thread?: SupportThread };
    if (data.thread) setActiveThread(data.thread);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/support/threads?status=${statusFilter}`);
        const data = (await res.json()) as { threads?: SupportThread[] };
        if (!cancelled) setThreads(data.threads ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [statusFilter]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/support/threads/${activeThread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText })
      });
      if (res.ok) {
        setReplyText("");
        await loadThread(activeThread.id);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve() {
    if (!activeThread) return;
    await fetch(`/api/admin/support/threads/${activeThread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" })
    });
    await loadThread(activeThread.id);
    await loadThreads(statusFilter);
  }

  async function handleReopen() {
    if (!activeThread) return;
    await fetch(`/api/admin/support/threads/${activeThread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" })
    });
    await loadThread(activeThread.id);
    await loadThreads(statusFilter);
  }

  return (
    <AdminPageScaffold
      title="Support inbox"
      description="Messages from tenants — reply directly below."
    >
      {/* Filter tabs */}
      <AdminPageCard>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["open", "all", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setActiveThread(null); }}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: statusFilter === s ? 600 : 400,
                background: statusFilter === s ? "rgba(59,130,246,0.15)" : "transparent",
                color: statusFilter === s ? "#93c5fd" : "#64748b",
                border: "1px solid",
                borderColor: statusFilter === s ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)",
                cursor: "pointer"
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>Loading…</p>
        ) : threads.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>No {statusFilter === "all" ? "" : statusFilter} threads.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {threads.map((thread) => {
              const businessName = thread.tenant.profile?.businessName ?? thread.tenant.slug;
              const lastMsg = thread.messages[0];
              const isActive = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => loadThread(thread.id)}
                  style={{
                    padding: "10px 14px", textAlign: "left", borderRadius: 8, cursor: "pointer",
                    background: isActive ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
                    width: "100%"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{thread.subject}</span>
                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                      {thread._count.messages} msg
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {businessName}
                    {lastMsg && (
                      <span style={{ color: "#475569" }}> · {lastMsg.fromAdmin ? "You: " : "Tenant: "}{lastMsg.body.slice(0, 60)}{lastMsg.body.length > 60 ? "…" : ""}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    {new Date(thread.updatedAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                    <span style={{ color: thread.status === "resolved" ? "#64748b" : "#93c5fd" }}>{thread.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </AdminPageCard>

      {/* Thread detail */}
      {activeThread && (
        <AdminPageCard>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{activeThread.subject}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {activeThread.tenant.profile?.businessName ?? activeThread.tenant.slug} ·{" "}
                <a
                  href={`/admin/tenant/${(activeThread as SupportThread & { tenantId?: string }).tenantId ?? ""}`}
                  style={{ color: "#3b82f6", textDecoration: "underline" }}
                >
                  View tenant
                </a>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {activeThread.status === "open" ? (
                <button
                  onClick={handleResolve}
                  style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer" }}
                >
                  Mark resolved
                </button>
              ) : (
                <button
                  onClick={handleReopen}
                  style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)", cursor: "pointer" }}
                >
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto", marginBottom: 16 }}>
            {activeThread.messages.map((msg) => (
              <div
                key={msg.id}
                style={{ alignSelf: msg.fromAdmin ? "flex-end" : "flex-start", maxWidth: "80%" }}
              >
                <div style={{
                  background: msg.fromAdmin ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "8px 12px",
                  fontSize: 13, lineHeight: 1.5, color: "#e2e8f0", whiteSpace: "pre-wrap"
                }}>
                  {msg.body}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, textAlign: msg.fromAdmin ? "right" : "left" }}>
                  {msg.fromAdmin ? "You (admin)" : "Tenant"} · {new Date(msg.createdAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))}
          </div>

          {/* Reply form */}
          <form onSubmit={handleReply} style={{ display: "flex", gap: 8 }}>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to this thread…"
              required
              style={{ resize: "vertical", flex: 1 }}
            />
            <button
              type="submit"
              disabled={submitting || !replyText.trim()}
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              style={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}
            >
              {submitting ? "Sending…" : "Send reply"}
            </button>
          </form>
        </AdminPageCard>
      )}
    </AdminPageScaffold>
  );
}
