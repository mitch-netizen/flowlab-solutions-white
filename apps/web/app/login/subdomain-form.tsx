"use client";

import { useRef } from "react";

export function SubdomainForm({ root }: { root: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function navigate() {
    const slug = inputRef.current?.value.trim();
    if (slug) {
      window.location.href = `https://${slug}.${root}/login`;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") navigate();
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
      <input
        ref={inputRef}
        id="slug"
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        type="text"
        placeholder="yourbusiness"
        style={{ flex: 1, minWidth: 140 }}
        onKeyDown={handleKeyDown}
      />
      <span className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
        .{root}/login
      </span>
      <button
        type="button"
        onClick={navigate}
        className="inline-flex items-center justify-center rounded-lg border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
      >
        Go →
      </button>
    </div>
  );
}
