import Link from "next/link";

import { getActionSuggestionDisplayStatus, getActionSuggestionGroup } from "@flowlab/db";
import { Badge, formatDateTime } from "@flowlab/ui";

type ActionSuggestionView = {
  id: string;
  category: string;
  priority: string;
  title: string;
  reason: string;
  targetUrl: string;
  suggestedAction: string;
  status: string;
  snoozedUntil: Date | null;
  createdAt: Date;
};

function getPriorityTone(priority: string) {
  return priority === "high" ? "danger" : priority === "medium" ? "warning" : "neutral";
}

function getVisibleStatus(action: ActionSuggestionView) {
  const status = getActionSuggestionDisplayStatus(action.status, action.snoozedUntil);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ActionSuggestionCard({
  action,
  returnTo,
  compact = false
}: {
  action: ActionSuggestionView;
  returnTo: string;
  compact?: boolean;
}) {
  const visibleStatus = getVisibleStatus(action);

  return (
    <div className="setup-row">
      <div className="setup-row-main">
        <div className="setup-row-meta">
          <Badge tone={getPriorityTone(action.priority)}>{action.priority}</Badge>
          <Badge tone={visibleStatus === "Open" ? "neutral" : "warning"}>{visibleStatus}</Badge>
          <span>{getActionSuggestionGroup(action.category)}</span>
          {!compact ? <span>{formatDateTime(action.createdAt)}</span> : null}
        </div>
        <h3>{action.title}</h3>
        <p>{action.reason}</p>
        {visibleStatus === "Snoozed" && action.snoozedUntil ? (
          <p className="text-sm text-muted-foreground">Returns {formatDateTime(action.snoozedUntil)}.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={action.targetUrl}>
          {action.suggestedAction}
        </Link>
        {visibleStatus !== "Dismissed" ? (
          <>
            {visibleStatus !== "Snoozed" ? (
              <form action={`/api/tenant/actions/${action.id}/resolve`} method="post">
                <input type="hidden" name="action" value="snooze" />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
                  Snooze
                </button>
              </form>
            ) : null}
            <form action={`/api/tenant/actions/${action.id}/resolve`} method="post">
              <input type="hidden" name="action" value="dismiss" />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className="inline-flex items-center justify-center rounded-lg border bg-secondary/40 px-4 py-2 text-sm font-semibold" type="submit">
                Dismiss
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
