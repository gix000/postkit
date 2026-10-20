"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useT } from "@/components/I18n";

/** Email + 6-digit code sign-in. Needs no redirect URL in Supabase. */
export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setBusy(false);
      setError(error.message.includes("expired") ? t.login.expired : t.login.wrong);
      return;
    }
    router.push(next);
    router.refresh();
  }

  const input = "w-full h-11 rounded-xl border border-rule bg-surface px-3 focus:outline-none focus:border-cobalt";

  if (step === "code") {
    return (
      <form onSubmit={verify} className="space-y-3">
        <p className="text-sm text-muted">{t.login.codeSent(email)}</p>
        <label htmlFor="code" className="text-sm font-medium block">
          {t.login.code}
        </label>
        <input
          id="code"
          inputMode="numeric"
          dir="ltr"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className={`${input} font-mono text-lg tracking-[0.3em]`}
        />
        <button disabled={busy || code.length < 6} className="tap w-full h-11 rounded-full bg-ink text-paper text-sm font-medium disabled:opacity-50">
          {busy ? t.login.signingIn : t.login.signIn}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="text-sm text-muted underline underline-offset-2 hover:text-ink"
        >
          {t.login.otherEmail}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-3">
      <label htmlFor="email" className="text-sm font-medium block">
        {t.login.email}
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={input}
      />
      <button disabled={busy} className="tap w-full h-11 rounded-full bg-ink text-paper text-sm font-medium disabled:opacity-50">
        {busy ? t.login.sendingCode : t.login.sendCode}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
