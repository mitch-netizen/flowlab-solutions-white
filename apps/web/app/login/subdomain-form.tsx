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
    <div className="subdomain-form">
      <input
        ref={inputRef}
        id="slug"
        type="text"
        placeholder="yourbusiness"
        onKeyDown={handleKeyDown}
      />
      <span className="muted" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
        .{root}/login
      </span>
      <button
        type="button"
        onClick={navigate}
        className="cta ghost"
      >
        Go
      </button>
    </div>
  );
}
