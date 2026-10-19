"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/repo-actions";

const input = "mt-1 w-full h-10 rounded-md border border-rule bg-surface px-3 focus:outline-none focus:border-cobalt";

export default function ProfileForm({ initial }: { initial: { username: string; display_name: string; bio: string } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await updateProfile(v);
        setBusy(false);
        if (res.ok) {
          setMsg({ ok: true, text: "Profile saved." });
          router.push(`/u/${res.username}`);
          router.refresh();
        } else setMsg({ ok: false, text: res.error });
      }}
    >
      <div>
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input id="username" value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} className={`${input} font-mono text-[14px]`} />
        <p className="text-xs text-muted mt-1">Changing it changes the links to all your repos.</p>
      </div>
      <div>
        <label htmlFor="display_name" className="text-sm font-medium">
          Display name
        </label>
        <input id="display_name" value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} className={input} />
      </div>
      <div>
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          maxLength={300}
          value={v.bio}
          onChange={(e) => setV({ ...v, bio: e.target.value })}
          className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-2 focus:outline-none focus:border-cobalt"
        />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} className="h-10 px-4 rounded-md bg-ink text-paper text-sm font-medium disabled:opacity-50">
          Save profile
        </button>
        {msg && (
          <span role="status" className={`text-sm ${msg.ok ? "text-live" : "text-danger"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
