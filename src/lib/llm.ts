import "server-only";

/**
 * Kimi K2.6 on Runpod: much better Arabic and Lebanese dialect than Qwen (about $0.002 per caption set).
 * Thinking is switched off for speed; the model only accepts its default temperature.
 */
export async function chatKimi(system: string, user: string, maxTokens = 1500): Promise<string> {
  const rp = process.env.RUNPOD_API_KEY;
  if (!rp) throw new Error("not configured");
  const res = await fetch("https://api.runpod.ai/v2/moonshot-kimi/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${rp}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "kimi-k2.6",
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const data = await res.json().catch(() => null);
  const raw: unknown = data?.choices?.[0]?.message?.content;
  if (!res.ok || typeof raw !== "string") throw new Error(`kimi ${res.status}`);
  return raw.trim();
}

/** Kimi first; Qwen if Kimi is busy or down. */
export async function chatBest(system: string, user: string, maxTokens = 1500): Promise<string> {
  try {
    return await chatKimi(system, user, maxTokens);
  } catch {
    return await chat(system, user, { maxTokens });
  }
}

/** One chat completion on Qwen (Hugging Face if its token is set, otherwise Qwen3 on Runpod). */
export async function chat(system: string, user: string, opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  const hf = process.env.HF_TOKEN;
  const rp = process.env.RUNPOD_API_KEY;
  if (!hf && !rp) throw new Error("not configured");
  const res = await fetch(hf ? "https://router.huggingface.co/v1/chat/completions" : "https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${hf ?? rp}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: hf ? "Qwen/Qwen2.5-72B-Instruct" : "Qwen/Qwen3-32B-AWQ",
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: hf ? user : `${user} /no_think` },
      ],
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const data = await res.json().catch(() => null);
  const raw: unknown = data?.choices?.[0]?.message?.content;
  if (!res.ok || typeof raw !== "string") throw new Error(`llm ${res.status}`);
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Pulls the first JSON object out of a model reply (it sometimes adds words or code fences). */
export function parseJson<T>(text: string): T | null {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  const raw = text.slice(s, e + 1);
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Models sometimes put real line breaks or tabs inside strings: escape them and retry.
    let out = "";
    let inStr = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"' && raw[i - 1] !== "\\") inStr = !inStr;
      if (inStr && ch === "\n") out += "\\n";
      else if (inStr && ch === "\r") continue;
      else if (inStr && ch === "\t") out += " ";
      else out += ch;
    }
    try {
      return JSON.parse(out) as T;
    } catch {
      return null;
    }
  }
}
