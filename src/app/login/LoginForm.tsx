"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Dict } from "@/lib/i18n";

type Copy = Dict["login"];

export function LoginForm({ t, next }: { t: Copy; next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.errors.email);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setError(t.errors.send);
      return;
    }
    setCode("");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createBrowserSupabase().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setBusy(false);
      setError(t.errors.code);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form className="form" onSubmit={sendCode} noValidate>
        <div className="field">
          <label htmlFor="email">{t.email}</label>
          <input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
          {error && (
            <p id="login-error" className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? t.sending : t.sendCode}
        </button>
      </form>
    );
  }

  return (
    <form className="form" onSubmit={verify} noValidate>
      <p className="form-note" role="status">
        {t.codeSent.replace("{email}", email)}
      </p>
      <div className="field">
        <label htmlFor="code">{t.code}</label>
        <input
          id="code"
          className="code"
          dir="ltr"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6,10}"
          maxLength={10}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
          aria-invalid={!!error}
          aria-describedby={error ? "code-error" : undefined}
        />
        {error && (
          <p id="code-error" className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button className="btn btn--primary" type="submit" disabled={busy || code.length < 6}>
        {busy ? t.verifying : t.verify}
      </button>
      <div className="actions">
        <button type="button" className="link-button" onClick={() => sendCode()} disabled={busy}>
          {t.resend}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
        >
          {t.changeEmail}
        </button>
      </div>
    </form>
  );
}
