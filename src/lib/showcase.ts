/** Photos made with PostKit's own Flux 2 models, shown on the home page. Tap one to reuse its prompt. */
export const SHOWCASE = [
  {
    src: "/showcase/market.webp",
    w: 640,
    h: 853,
    prompt:
      "A narrow Beirut street market at night, glowing abstract neon tubes in lime green and hot pink with no text, rain-soaked asphalt reflecting the lights, cinematic 35mm photograph",
  },
  {
    src: "/showcase/coffee.webp",
    w: 640,
    h: 853,
    prompt: "Product photograph of a minimalist ceramic coffee cup on a balcony railing, soft morning light, blurred Beirut rooftops and the sea behind",
  },
  {
    src: "/showcase/manoushe.webp",
    w: 640,
    h: 640,
    prompt: "Top-down food photograph of a fresh za'atar manoushe on a rustic wooden board with tomatoes, mint and olives, restaurant menu style",
  },
  {
    src: "/showcase/sneaker.webp",
    w: 640,
    h: 640,
    prompt: "Studio product shot of a futuristic white sneaker floating above a glossy black surface, lime green and hot pink rim lights",
  },
  {
    src: "/showcase/portrait.webp",
    w: 640,
    h: 853,
    prompt: "Fashion editorial portrait of a young woman in a cream linen suit on a sunlit Beirut staircase painted in pastel colors, golden hour, 85mm",
  },
  {
    src: "/showcase/interior.webp",
    w: 640,
    h: 440,
    prompt: "Architectural interior photograph of a modern Lebanese living room with arched windows, warm stone walls, linen sofa, bright natural light",
  },
] as const;

export function showcaseHref(prompt: string) {
  return `/create?${new URLSearchParams({ mode: "photo", prompt, model: "cloudflare/flux-2-klein-9b" })}`;
}
