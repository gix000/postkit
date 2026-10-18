# PostKit — website

Bilingual (English / Arabic) sales and account site for the PostKit Premiere Pro panel.
Next.js 15 (App Router) on Vercel, Supabase for accounts and data, Whish Pay for checkout.

## What's in it

| Area | Where |
| --- | --- |
| Landing page with live timeline demo, tools, caption styles, pricing, FAQ | `src/app/[locale]/page.tsx` |
| Email-code sign-in (no passwords) | `src/app/[locale]/login` |
| Account: plan, downloads, computers, payments, AI credits | `src/app/[locale]/account` |
| Whish checkout → return page | `src/app/api/checkout`, `src/app/[locale]/checkout` |
| Whish callback (always re-checks status with Whish) | `src/app/api/whish/callback` |
| Panel licence API: sign in, register computer, heartbeat | `src/app/api/panel/{login,verify,check}` |
| Prices and plan lengths (one file) | `src/lib/plans.ts` |
| All copy, both languages | `src/lib/dict/en.ts`, `src/lib/dict/ar.ts` |
| Database schema, RLS and fulfilment function | `supabase/migrations/0001_init.sql` |

## Set up

1. **Install**

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Supabase**
   - Create a project; copy the URL, anon key and service-role key into `.env.local`.
   - SQL editor → run `supabase/migrations/0001_init.sql`.
   - Authentication → Email templates → **Magic Link**: put the code in the email, e.g.
     `Your PostKit code is {{ .Token }}`. Sign-in uses the code (6–10 digits, per your Supabase OTP length setting), not the link.
   - Authentication → URL configuration: set the Site URL to your domain.

3. **Licence keys** — run `npm run keys` and paste both lines into `.env.local`.
   Ship `LICENSE_PUBLIC_KEY` inside the panel so it can check its token offline.

4. **Run locally** — `npm run dev`. With `WHISH_FAKE=1`, every payment is approved
   instantly so you can test the whole flow without Whish.

5. **Whish** — ask Whish for merchant (collect) credentials: `channel`, `secret`, and the
   website URL they register. Test in `WHISH_MODE=sandbox` with `WHISH_FAKE=0`.
   Sandbox test payer: phone `96170902894`, OTP `111111`.
   Before going live, confirm the endpoints in `src/lib/whish.ts` against the documentation
   Whish sends you — they come from a community client, not official docs.

6. **Deploy** — push to GitHub, import into Vercel, add every variable from `.env.example`,
   set `NEXT_PUBLIC_SITE_URL` to the live domain, `WHISH_MODE=production`, `WHISH_FAKE=0`.

## How a payment works

1. Buyer picks a plan → `POST /api/checkout` creates a `pending` order and asks Whish for a payment page.
2. Buyer approves in Whish → Whish calls `/api/whish/callback?order=…` and sends the buyer to `/checkout/return`.
3. Both places call `settleOrder`, which asks Whish for the real status. On `success`,
   the database function `fulfil_order` marks the order paid and extends the plan **once**,
   however many times it's called.
4. If Whish is slow, the return page keeps checking every few seconds.

Paying again adds a new term to the end of the current one. Nothing renews automatically.

## Panel licence API

All bodies are JSON. Tokens are ES256 JWTs valid for up to 7 days offline and never past the plan's end.

| Call | Body | Returns |
| --- | --- | --- |
| `POST /api/panel/login` | `{ email }` | Emails a sign-in code (6–10 digits) |
| `POST /api/panel/verify` | `{ email, code, device: { hash, name?, platform? } }` | `{ token, planExpires, credits }` |
| `POST /api/panel/check` | `{ token }` | Fresh `{ token, planExpires, credits }` — call on launch and daily |

Errors come back as `{ error, message }`: `no_plan` / `plan_expired` (402), `device_limit` (409),
`device_removed` / `bad_token` (401). `device.hash` is a 32–128 character hex fingerprint of the machine.

## Switching things on later

- **AI credits** — set `NEXT_PUBLIC_AI_EDITOR=1` to show the credit pack and balance. Plans already grant credits.
- **Downloads** — set `DOWNLOAD_URL_WIN` / `DOWNLOAD_URL_MAC`; they show only to active subscribers.
- **Prices** — edit `src/lib/plans.ts`; the pricing section and checkout both read from it.
