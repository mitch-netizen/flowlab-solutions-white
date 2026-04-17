"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { MobileJobAction } from "@flowlab/contracts";
import { getCustomerRecordHref, getJobRecordHref } from "../lib/dashboard-links";

type JobCard = {
  id: string;
  summary: string;
  suburb: string | null;
  status: string;
  scheduledFor: string | null;
  customerId: string;
  customerName: string;
};

const STORAGE_KEY = "flowlab-mobile-queue";

function readQueue(): MobileJobAction[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as MobileJobAction[];
  } catch {
    return [];
  }
}

function writeQueue(queue: MobileJobAction[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function MobileJobApp({ jobs }: { jobs: JobCard[] }) {
  const [queue, setQueue] = useState<MobileJobAction[]>([]);
  const [online, setOnline] = useState(true);
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const syncingRef = useRef(false);

  useEffect(() => {
    setQueue(readQueue());
    setOnline(window.navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function syncQueue(nextQueue = queue) {
    if (!online || nextQueue.length === 0 || syncingRef.current) {
      return;
    }

    syncingRef.current = true;

    try {
      const response = await fetch("/api/tenant/mobile/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ actions: nextQueue })
      });

      if (response.ok) {
        setQueue([]);
        writeQueue([]);
      }
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    void syncQueue();
  }, [online]);

  function enqueue(action: MobileJobAction) {
    const nextQueue = [...readQueue(), action];
    writeQueue(nextQueue);
    setQueue(nextQueue);
    void syncQueue(nextQueue);
  }

  function startTimer(jobId: string) {
    setActiveTimers((current) => ({ ...current, [jobId]: Date.now() }));
    enqueue({
      jobId,
      type: "start_timer",
      value: "started",
      occurredAt: new Date().toISOString()
    });
  }

  function stopTimer(jobId: string) {
    const startedAt = activeTimers[jobId];
    const elapsedHours = startedAt ? Number(((Date.now() - startedAt) / 3_600_000).toFixed(2)) : 0;
    setActiveTimers((current) => {
      const next = { ...current };
      delete next[jobId];
      return next;
    });
    enqueue({
      jobId,
      type: "stop_timer",
      value: String(elapsedHours),
      occurredAt: new Date().toISOString()
    });
  }

  return (
    <div className="stack">
      <div className="rounded-lg border bg-card p-4">
        <div className="eyebrow">Offline-ready operator mode</div>
        <h1 style={{ marginBottom: 8 }}>Installable mobile workflow</h1>
        <p style={{ color: "#cbd5e1", marginTop: 0 }}>
          Actions queue locally when offline, then sync back into FlowLab when connectivity returns.
        </p>
        <div className="cards-3">
          <div className="rounded-lg border bg-card/60 p-4">
            <strong>Status</strong>
            <div style={{ marginTop: 8, color: online ? "#86efac" : "#fcd34d" }}>{online ? "Online" : "Offline"}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-4">
            <strong>Queued actions</strong>
            <div style={{ marginTop: 8, color: "#cbd5e1" }}>{queue.length}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-4">
            <strong>Active timers</strong>
            <div style={{ marginTop: 8, color: "#cbd5e1" }}>{Object.keys(activeTimers).length}</div>
          </div>
        </div>
      </div>
      {jobs.map((job) => {
        const isRunning = Boolean(activeTimers[job.id]);
        return (
          <div key={job.id} className="rounded-lg border bg-card p-4">
            <div className="eyebrow">
              <Link className="inline-entity-link" href={getCustomerRecordHref(job.customerId)}>{job.customerName}</Link>
            </div>
            <h2 style={{ marginBottom: 8 }}>
              <Link className="inline-entity-link" href={getJobRecordHref(job.id)}>{job.summary}</Link>
            </h2>
            <p style={{ color: "#cbd5e1", marginTop: 0 }}>
              {job.suburb ?? "Suburb not set"} · {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : "Unscheduled"}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {!isRunning ? (
                <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="button" onClick={() => startTimer(job.id)}>
                  Start timer
                </button>
              ) : (
                <button className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" type="button" onClick={() => stopTimer(job.id)}>
                  Stop timer
                </button>
              )}
              <button
                className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                type="button"
                onClick={() =>
                  enqueue({
                    jobId: job.id,
                    type: "checklist",
                    value: "Checklist completed: arrival, scope, cleanup",
                    occurredAt: new Date().toISOString()
                  })
                }
              >
                Complete checklist
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                type="button"
                onClick={() =>
                  enqueue({
                    jobId: job.id,
                    type: "photo",
                    value: "Photo captured locally and queued for upload",
                    occurredAt: new Date().toISOString()
                  })
                }
              >
                Queue photo note
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold"
                type="button"
                onClick={() =>
                  enqueue({
                    jobId: job.id,
                    type: "status",
                    value: "complete",
                    occurredAt: new Date().toISOString()
                  })
                }
              >
                Mark complete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
