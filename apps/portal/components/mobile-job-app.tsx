"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [onMyWaySent, setOnMyWaySent] = useState<Record<string, boolean>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
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

  const syncQueue = useCallback(async (nextQueue: MobileJobAction[]) => {
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
  }, [online]);

  useEffect(() => {
    void syncQueue(readQueue());
  }, [online, syncQueue]);

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

  function startJob(jobId: string) {
    setLocalStatuses((s) => ({ ...s, [jobId]: "in_progress" }));
    enqueue({
      jobId,
      type: "status",
      value: "in_progress",
      occurredAt: new Date().toISOString()
    });
  }

  function markComplete(jobId: string) {
    setLocalStatuses((s) => ({ ...s, [jobId]: "complete" }));
    enqueue({
      jobId,
      type: "status",
      value: "complete",
      occurredAt: new Date().toISOString()
    });
  }

  async function sendOnMyWay(jobId: string) {
    setOnMyWaySent((s) => ({ ...s, [jobId]: true }));
    try {
      await fetch(`/api/tenant/jobs/${jobId}/on-my-way`, {
        method: "POST",
        redirect: "manual"
      });
    } catch {
      // best-effort — ETA SMS fired server-side
    }
  }

  return (
    <div className="stack">
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div>
          <div className="eyebrow">Offline-ready operator mode</div>
          <h1 className="mb-2">Field view</h1>
          <p className="text-sm text-muted-foreground">
            Actions queue locally when offline, then sync back into FlowLab when connectivity returns.
          </p>
        </div>
        <div className="cards-3">
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="text-sm font-semibold">Status</div>
            <div className={online ? "text-green-400 text-sm" : "text-amber-300 text-sm"}>
              {online ? "Online" : "Offline"}
            </div>
          </div>
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="text-sm font-semibold">Queued actions</div>
            <div className="text-sm text-muted-foreground">{queue.length}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="text-sm font-semibold">Active timers</div>
            <div className="text-sm text-muted-foreground">{Object.keys(activeTimers).length}</div>
          </div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No scheduled or in-progress jobs for today.
        </div>
      ) : null}

      {jobs.map((job) => {
        const isRunning = Boolean(activeTimers[job.id]);
        const effectiveStatus = localStatuses[job.id] ?? job.status;
        const sentOnMyWay = Boolean(onMyWaySent[job.id]);

        return (
          <div key={job.id} className="rounded-lg border bg-card p-4 space-y-4">
            <div className="space-y-1">
              <div className="eyebrow">
                <Link className="inline-entity-link" href={getCustomerRecordHref(job.customerId)}>
                  {job.customerName}
                </Link>
              </div>
              <h2 className="text-base font-semibold leading-snug">
                <Link className="inline-entity-link" href={getJobRecordHref(job.id)}>
                  {job.summary}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">
                {job.suburb ?? "Suburb not set"}
                {job.scheduledFor
                  ? ` · ${new Date(job.scheduledFor).toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" })}`
                  : " · Unscheduled"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {effectiveStatus === "scheduled" ? (
                <button
                  className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  type="button"
                  onClick={() => startJob(job.id)}
                >
                  Start job →
                </button>
              ) : null}

              {effectiveStatus === "in_progress" ? (
                <>
                  {!isRunning ? (
                    <button
                      className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      type="button"
                      onClick={() => startTimer(job.id)}
                    >
                      Start timer
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center justify-center rounded-lg border bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
                      type="button"
                      onClick={() => stopTimer(job.id)}
                    >
                      Stop timer
                    </button>
                  )}

                  <button
                    className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold ${
                      sentOnMyWay
                        ? "bg-green-700/30 text-green-300 cursor-default"
                        : "bg-secondary/40"
                    }`}
                    type="button"
                    disabled={sentOnMyWay}
                    onClick={() => { void sendOnMyWay(job.id); }}
                  >
                    {sentOnMyWay ? "ETA sent ✓" : "On my way →"}
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg border bg-green-700 px-4 py-2 text-sm font-semibold text-white"
                    type="button"
                    onClick={() => markComplete(job.id)}
                  >
                    Mark complete
                  </button>
                </>
              ) : null}

              {effectiveStatus === "complete" ? (
                <div className="text-sm text-green-400 font-medium py-2">
                  ✓ Marked complete — syncing
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
