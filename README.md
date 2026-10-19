# PostKit Hub

A model and dataset hub built with Next.js 16. It browses everything on the Hugging Face Hub through the public API, hosts your users' own models and datasets, and runs chat and image models in a playground.

## What's inside

| Area | What it does | Built on |
| --- | --- | --- |
| Models | Search, task filters, sort, pagination, model cards, file lists, "Use this model" code | Hugging Face Hub API |
| Datasets | Same as models, plus a preview table of the first rows of each split | Hub API + datasets-server |
| Community repos | Signed-in users publish models/datasets with a card and files | Supabase (Postgres + Storage) |
| Accounts | GitHub or email-link sign-in, profiles, saved repos | Supabase Auth |
| Playground | Streaming chat and text-to-image with any supported model | Hugging Face Inference Providers |

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev
```

Open http://localhost:3000. The hub works with no keys at all; accounts and the playground switch on as you add them.

### 1. Hugging Face token (playground)

Create a fine-grained token at https://huggingface.co/settings/tokens with **Make calls to Inference Providers**, and set `HF_TOKEN`. Runs are billed to that account, so the playground requires sign-in whenever accounts are on, and each user gets `PLAYGROUND_RATE_PER_MIN` runs per minute.

### 2. Supabase (accounts, uploads, saves)

1. Create a project at https://supabase.com.
2. SQL editor → paste and run `supabase/schema.sql`. It creates `profiles`, `repos`, `saves`, the public `repos` storage bucket and all row-level security policies.
3. Authentication → URL configuration: set Site URL to your domain and add `https://YOUR_DOMAIN/auth/callback` (and `http://localhost:3000/auth/callback`) to Redirect URLs.
4. Authentication → Providers: turn on GitHub (paste a GitHub OAuth app's client id/secret) and keep Email on.
5. Copy the project URL and anon key into `NEXT_PUBLIC_HUB_SUPABASE_URL` and `NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY`.
6. Storage → `repos` bucket: raise the file size limit if you expect large weights (the free plan caps uploads at 50 MB per file).

## Deploy to Vercel

Push to GitHub, import the repo in Vercel, add the same environment variables, deploy. Nothing else is required.

## Project map

```
src/
  app/
    page.tsx                     home: search + trending
    models/ datasets/            index pages and [...id] detail pages
    c/[username]/[kind]/[slug]/  community repo page (+ owner settings)
    u/[username]/                profile: repos and saves
    new/ settings/ login/        publish, profile, sign-in
    playground/                  chat + image UI
    api/chat  api/image          inference (streams through router.huggingface.co)
    api/search                   header search: Hub quicksearch + community repos
  lib/hf.ts                      Hub API client
  lib/community.ts               Supabase queries
  proxy.ts                       keeps the auth session fresh (Next 16's middleware)
supabase/schema.sql
```

## Notes

- The design, name and mark are PostKit's own. Hub content shown on the site belongs to its authors; each page links back to the original repo.
- `HF_ENDPOINT` points the hub client at a mirror if you need one.
- Hub pages are cached for 5 minutes (`revalidate: 300` in `lib/hf.ts`).
