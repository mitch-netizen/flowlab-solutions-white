import Link from "next/link";

import {
  actionSuggestionCategoryLabels,
  getTenantActionInbox
} from "@flowlab/db";

import DashboardPageScaffold from "../../../components/dashboard/page-scaffold";
import { requireTenantSession } from "../../../lib/session";
import ActionSuggestionCard from "./ActionSuggestionCard";

const priorityOptions = [
  { value: "all", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
];

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "snoozed", label: "Snoozed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All statuses" }
];

const categoryOptions = [
  { value: "all", label: "All groups" },
  ...Object.entries(actionSuggestionCategoryLabels).map(([category, label]) => ({
    value: category,
    label: `${label} - ${category.replace(/_/g, " ")}`
  }))
];

export default async function ActionInboxPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireTenantSession();
  const params = searchParams ? await searchParams : {};
  const priority = params.priority ?? "all";
  const category = params.category ?? "all";
  const status = params.status ?? "open";
  const returnTo = `/dashboard/actions?status=${encodeURIComponent(status)}&priority=${encodeURIComponent(priority)}&category=${encodeURIComponent(category)}`;

  const [actions, openActions, snoozedActions, dismissedActions] = await Promise.all([
    getTenantActionInbox(session.tenantId, { refresh: true, status: status as "open" | "snoozed" | "dismissed" | "all", priority, category }),
    getTenantActionInbox(session.tenantId, { status: "open", limit: 100 }),
    getTenantActionInbox(session.tenantId, { status: "snoozed", limit: 100 }),
    getTenantActionInbox(session.tenantId, { status: "dismissed", limit: 100 })
  ]);

  return (
    <DashboardPageScaffold
      eyebrow="Co-pilot"
      title="Action Inbox"
      description="A practical list of the operational gaps FlowLab can see right now. Open the workflow, then dismiss or snooze the recommendation when it no longer needs attention."
      section="home"
      actions={(
        <>
          <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard">Back to today</Link>
          <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/dashboard/quotes/new">Create quote</Link>
        </>
      )}
    >
      {params.notice === "resolved" ? (
        <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#86efac" }}>
          Action updated.
        </div>
      ) : params.notice === "not_found" || params.error === "invalid_action" ? (
        <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#fca5a5" }}>
          That action update was not recognised or is no longer available.
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Open</div>
            <div className="text-3xl font-semibold">{openActions.length}</div>
            <p className="text-sm text-muted-foreground">Visible recommendations waiting for an operator.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Snoozed</div>
            <div className="text-3xl font-semibold">{snoozedActions.length}</div>
            <p className="text-sm text-muted-foreground">Hidden until they are worth seeing again.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Dismissed</div>
            <div className="text-3xl font-semibold">{dismissedActions.length}</div>
            <p className="text-sm text-muted-foreground">Closed recommendations kept for context.</p>
          </div>
        </div>
      </div>

      <form className="rounded-lg border bg-card p-4" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <label className="flex flex-col gap-2 text-sm text-muted-foreground">
          Status
          <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="status" defaultValue={status}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-muted-foreground">
          Priority
          <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="priority" defaultValue={priority}>
            {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-muted-foreground">
          Group
          <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" name="category" defaultValue={category}>
            {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
          Filter
        </button>
        <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/actions">Reset</Link>
      </form>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <div className="eyebrow">Recommended work</div>
          <h2 style={{ margin: 0 }}>Operator-safe next actions</h2>
          <p className="text-sm text-muted-foreground" style={{ margin: 0 }}>
            These actions only navigate to the right workflow. Customer sends, schedule moves, and billing changes still require operator review.
          </p>
        </div>

        <div className="space-y-3">
          {actions.length > 0 ? actions.map((action) => (
            <ActionSuggestionCard key={action.id} action={action} returnTo={returnTo} />
          )) : (
            <div className="rounded-lg border bg-card/60 p-4 space-y-3">
              <h3 style={{ margin: 0 }}>All clear</h3>
              <p className="text-sm text-muted-foreground" style={{ margin: 0 }}>
                No recommendations match these filters. You can still keep momentum by creating a quote, checking the run sheet, or reviewing customer requests.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/dashboard/quotes/new">Create quote</Link>
                <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/scheduler">Open schedule</Link>
                <Link className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" href="/dashboard/crm">Review requests</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardPageScaffold>
  );
}
