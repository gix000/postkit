// Central place for environment values. Server-only values throw when read
// without being set, so a missing secret fails loudly instead of silently.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM ?? "",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  aiEditor: process.env.NEXT_PUBLIC_AI_EDITOR === "1",
};

export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** False until Supabase is set up; the marketing pages still work without it. */
  configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const serverEnv = {
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  whish: () => ({
    mode: process.env.WHISH_MODE === "production" ? "production" : "sandbox",
    channel: process.env.WHISH_CHANNEL ?? "",
    secret: process.env.WHISH_SECRET ?? "",
    websiteUrl: process.env.WHISH_WEBSITE_URL ?? site.url,
    // Fake mode can never run against production Whish.
    fake: process.env.WHISH_FAKE === "1" && process.env.WHISH_MODE !== "production",
  }),
  licensePrivateKey: () => required("LICENSE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  licensePublicKey: () => required("LICENSE_PUBLIC_KEY").replace(/\\n/g, "\n"),
  downloads: () => ({
    win: process.env.DOWNLOAD_URL_WIN ?? "",
    mac: process.env.DOWNLOAD_URL_MAC ?? "",
  }),
};
