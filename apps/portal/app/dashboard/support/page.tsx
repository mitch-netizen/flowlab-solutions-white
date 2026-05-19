"use client";

import { useEffect, useState, useRef } from "react";

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
  messages: SupportMessage[];
  _count: { messages: number };
}

type View = "list" | "new" | "thread";

export default function SupportPage() {
  const [view, setView] = useState<View>("list");
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeThread, setActiveThread] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadThreads() {
    setLoading(true);
    try {
      const res = await fetch("/api/tenant/support/threads");
      const data = (await res.json()) as { threads?: SupportThread[] };
      setThreads(data.threads ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadThread(id: string) {
    const res = await fetch(`/api/tenant/support/threads/${id}`);
    const data = (await res.json()) as { thread?: SupportThread };
    if (data.thread) {
      setActiveThread(data.thread);
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tenant/support/threads");
        const data = (await res.json()) as { threads?: SupportThread[] };
        setThreads(data.threads ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (view === "thread") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [view, activeThread?.messages]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject, message: newMessage })
      });
      const data = (await res.json()) as { thread?: SupportThread; error?: string };
      if (!data.thread) { setError(data.error ?? "Could not create thread"); return; }
      setNewSubject("");
      setNewMessage("");
      await loadThreads();
      setActiveThread(data.thread);
      setView("thread");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/support/threads/${activeThread.id}/reply`, {
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

  async function openThread(thread: SupportThread) {
    setView("thread");
    await loadThread(thread.id);
  }

  const openCount = threads.filter((t) => t.status === "open").length;

  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Support</h1>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
            Chat directly with the FlowLab team.
          </p>
        </div>
        <button
          onClick={() => setView("new")}
          className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + New request
        </button>
      </div>

      {/* New thread form */}
      {view === "new" && (
        <div className="rounded-lg border bg-card p-4" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>New support request</h2>
            <button onClick={() => setView("list")} style={{ color: "#64748b", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
          </div>
          {error && <div className="rounded-lg border bg-card/60 p-3" style={{ color: "#fca5a5", marginBottom: 12, fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="flex flex-col gap-1 text-sm text-muted-foreground">
              Subject
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="What do you need help with?"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted-foreground">
              Message
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe your issue in detail…"
                required
                style={{ resize: "vertical" }}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {submitting ? "Sending…" : "Send request"}
            </button>
          </form>
        </div>
      )}

      {/* Thread view */}
      {view === "thread" && activeThread && (
        <div className="rounded-lg border bg-card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => { setView("list"); loadThreads(); }}
              style={{ color: "#94a3b8", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}
            >
              ← Back
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{activeThread.subject}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {activeThread.status === "resolved" ? "Resolved" : "Open"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, minHeight: 200, maxHeight: 420, overflowY: "auto" }}>
            {activeThread.messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.fromAdmin ? "flex-start" : "flex-end",
                  maxWidth: "75%"
                }}
              >
                <div style={{
                  background: msg.fromAdmin ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#e2e8f0",
                  whiteSpace: "pre-wrap"
                }}>
                  {msg.body}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, textAlign: msg.fromAdmin ? "left" : "right" }}>
                  {msg.fromAdmin ? "FlowLab support" : "You"} · {new Date(msg.createdAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply form */}
          {activeThread.status !== "resolved" && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <form onSubmit={handleReply} style={{ display: "flex", gap: 8 }}>
                <textarea
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a message…"
                  required
                  style={{ resize: "none", flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(e); }
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  style={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}
                >
                  {submitting ? "…" : "Send"}
                </button>
              </form>
            </div>
          )}
          {activeThread.status === "resolved" && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", color: "#64748b", fontSize: 12, textAlign: "center" }}>
              This thread has been resolved. Open a new request if you need further help.
            </div>
          )}
        </div>
      )}

      {/* Thread list */}
      {(view === "list" || view === "new") && (
        <div>
          {loading ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>Loading…</p>
          ) : threads.length === 0 ? (
            <div className="rounded-lg border bg-card p-6" style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
              No support requests yet. Use <strong>New request</strong> to get in touch.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {threads.length > 0 && (
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                  {openCount} open · {threads.length - openCount} resolved
                </div>
              )}
              {threads.map((thread) => {
                const lastMsg = thread.messages[0];
                return (
                  <button
                    key={thread.id}
                    onClick={() => openThread(thread)}
                    className="rounded-lg border bg-card"
                    style={{ padding: "12px 16px", textAlign: "left", width: "100%", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{thread.subject}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                        background: thread.status === "resolved" ? "rgba(100,116,139,0.2)" : "rgba(59,130,246,0.15)",
                        color: thread.status === "resolved" ? "#64748b" : "#93c5fd"
                      }}>
                        {thread.status}
                      </span>
                    </div>
                    {lastMsg && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lastMsg.fromAdmin ? "FlowLab: " : "You: "}{lastMsg.body}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                      {new Date(thread.updatedAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })} · {thread._count.messages} message{thread._count.messages !== 1 ? "s" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
