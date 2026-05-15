"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Stage = "loading" | "form" | "success" | "error";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "recovery") {
      setErrorMsg("This reset link is invalid or has expired. Please request a new one.");
      setStage("error");
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setErrorMsg("This reset link has expired. Please request a new one.");
          setStage("error");
        } else {
          // Clear the tokens from the URL so they can't be bookmarked or reused
          window.history.replaceState(null, "", window.location.pathname);
          setStage("form");
        }
      });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message ?? "Could not update password. Please try again.");
      setSubmitting(false);
    } else {
      setStage("success");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  }

  return (
    <main>
      <section className="hero-grid">
        <div className="rounded-lg border bg-card p-4">
          <h1>Set a new password</h1>
          <p style={{ color: "#cbd5e1" }}>
            Choose a strong password for your operator account.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          {stage === "loading" && (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Verifying reset link…</p>
          )}

          {stage === "error" && (
            <>
              <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#fca5a5" }}>
                {errorMsg}
              </div>
              <a
                href="/forgot-password"
                className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Request a new link
              </a>
            </>
          )}

          {stage === "success" && (
            <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#86efac" }}>
              Password updated. Taking you to your dashboard…
            </div>
          )}

          {stage === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg ? (
                <div className="rounded-lg border bg-card/60 p-4" style={{ color: "#fca5a5" }}>
                  {errorMsg}
                </div>
              ) : null}

              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                New password
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                Confirm password
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <button
                className="inline-flex items-center justify-center rounded-lg border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
