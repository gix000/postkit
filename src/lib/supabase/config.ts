export const SUPABASE_URL = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY ?? "";
export const STORAGE_BUCKET = "repos";

/** Accounts, uploads and saves are off until Supabase keys are set. The hub still works without them. */
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
