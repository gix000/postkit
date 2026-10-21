import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pages you just saw open instantly when you go back to them.
    staleTimes: { dynamic: 30, static: 300 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "huggingface.co" },
      { protocol: "https", hostname: "cdn-avatars.huggingface.co" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
