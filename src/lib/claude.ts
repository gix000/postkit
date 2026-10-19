import "server-only";

// Calls the Claude Messages API and forces a single tool call, so the answer is JSON
// that matches the tool's schema.

export type Content =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png"; data: string } };

export class AiError extends Error {}

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

export async function callTool<T>({
  system,
  content,
  tool,
  maxTokens = 8000,
  model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  timeoutMs = 110_000,
}: {
  system: string;
  content: Content[];
  tool: { name: string; description: string; input_schema: Record<string, unknown> };
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
}): Promise<{ input: T; usage: { input_tokens: number; output_tokens: number } }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("The AI editor isn't set up on the server yet.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err) => {
    throw new AiError(err?.name === "TimeoutError" ? "The AI took too long. Try again." : "Couldn't reach the AI service.");
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("claude error", res.status, body.slice(0, 500));
    throw new AiError(res.status === 529 || res.status === 503 ? "The AI is busy right now. Try again in a minute." : "The AI service returned an error. Try again.");
  }
  const data = (await res.json()) as { content: { type: string; name?: string; input?: unknown }[]; usage: { input_tokens: number; output_tokens: number } };
  const call = data.content.find((c) => c.type === "tool_use" && c.name === tool.name);
  if (!call || !call.input) throw new AiError("The AI didn't return a plan. Try again.");
  return { input: call.input as T, usage: data.usage };
}
