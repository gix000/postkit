import "server-only";

const ARABIC = /[؀-ۿݐ-ݿ]/;

/**
 * Image and video models understand English best. Arabic (or mixed) prompts are
 * translated first with a strong multilingual model; English passes through untouched.
 */
export async function toEnglishPrompt(prompt: string): Promise<string> {
  if (!ARABIC.test(prompt)) return prompt;
  // Hugging Face if its token is set, otherwise Qwen3 on Runpod (pay per word, fractions of a cent).
  const hf = process.env.HF_TOKEN;
  const rp = process.env.RUNPOD_API_KEY;
  if (!hf && !rp) return prompt;
  try {
    const res = await fetch(hf ? "https://router.huggingface.co/v1/chat/completions" : "https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${hf ?? rp}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: hf ? "Qwen/Qwen2.5-72B-Instruct" : "Qwen/Qwen3-32B-AWQ",
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You translate prompts for an image and video generator into vivid, precise English. Keep every visual detail, brand name and quoted text exactly. Reply with the English prompt only.",
          },
          { role: "user", content: hf ? prompt : `${prompt} /no_think` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return prompt;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    const out = typeof raw === "string" ? raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : "";
    return out || prompt;
  } catch {
    return prompt;
  }
}
