// The panel runs inside Premiere (a local file:// page), so its API calls are
// cross-origin. These routes use tokens, never cookies, so any origin is safe.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function withCors(res: Response) {
  for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v);
  return res;
}
