import { formatLabel } from "./format";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const SUCCESS_STATUSES = new Set([
  "active",
  "connected",
  "paid",
  "complete",
  "completed",
  "invoiced",
  "sent",
  "accepted",
  "success",
  "signed",
  "ready",
  "enabled"
]);

const WARNING_STATUSES = new Set([
  "trial",
  "quoted",
  "scheduled",
  "in_progress",
  "pending",
  "draft",
  "overdue"
]);

const DANGER_STATUSES = new Set([
  "error",
  "failed",
  "suspended",
  "cancelled",
  "voided",
  "disconnected"
]);

export function getStatusTone(status: string | null | undefined): BadgeTone {
  if (!status) return "neutral";
  const normalized = status.toLowerCase();

  if (SUCCESS_STATUSES.has(normalized)) return "success";
  if (WARNING_STATUSES.has(normalized)) return "warning";
  if (DANGER_STATUSES.has(normalized)) return "danger";

  return "neutral";
}

export function formatStatusLabel(status: string | null | undefined, fallback = "Unknown") {
  if (!status) return fallback;
  return formatLabel(status, fallback);
}
