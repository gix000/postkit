import "server-only";

const ARABIC = /[؀-ۿݐ-ݿ]/;

/**
 * Image and video models understand English best. Arabic (or mixed) prompts are
 * translated first with a strong multilingual model; English passes through untouched.
 */
export async function toEnglishPrompt(prompt: string): Promise<string> {
  if (!ARABIC.test(prompt) || !process.env.HF_TOKEN) return prompt;
  try {
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.HF_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You translate prompts for an image and video generator into vivid, precise English. Keep every visual detail, brand name and quoted text exactly. Reply with the English prompt only.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return prompt;
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content;
    return typeof out === "string" && out.trim() ? out.trim() : prompt;
  } catch {
    return prompt;
  }
}
