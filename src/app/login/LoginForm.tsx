"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function emailLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    if (!sb) return;
    setState("sending");
    setError(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    if (error) {
      setError(error.message);
      setState("idle");
    } else setState("sent");
  }

  async function github() {
    const sb = createClient();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: "github", options: { redirectTo: redirectTo() } });
    if (error) setError(error.message);
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-rule bg-surface p-6">
        <p className="font-medium">Check your inbox.</p>
        <p className="text-sm text-muted mt-1">
          We sent a sign-in link to <span className="text-ink">{email}</span>. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={github}
        className="w-full h-11 rounded-md bg-ink text-paper text-sm font-medium hover:opacity-90"
      >
        Continue with GitHub
      </button>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-rule" />
        or
        <span className="h-px flex-1 bg-rule" />
      </div>
      <form onSubmit={emailLink} className="space-y-3">
        <label htmlFor="email" className="text-sm font-medium block">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 rounded-md border border-rule bg-surface px-3 focus:outline-none focus:border-cobalt"
        />
        <button
          disabled={state === "sending"}
          className="w-full h-11 rounded-md border border-rule bg-surface text-sm font-medium hover:border-ink disabled:opacity-50"
        >
          {state === "sending" ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
