/** Photos made with PostKit's own Flux 2 models, shown on the home page. Tap one to reuse its prompt. */
const MODEL = "cloudflare/flux-2-klein-4b";

export const SHOWCASE = [
  {
    src: "/showcase/perfume.webp",
    prompt:
      "Luxury advertising photograph: a sculpted glass perfume bottle plunging into black water, a crown of droplets frozen mid-air around it, lime green and hot pink rim lights, high-speed photography, glossy reflections",
  },
  {
    src: "/showcase/fruit.webp",
    prompt:
      "High-speed commercial photograph: pomegranates, figs and citrus slices bursting through swirling clouds of lime green and hot pink powder against pure black, juice droplets frozen in mid-air",
  },
  {
    src: "/showcase/chrome.webp",
    prompt:
      "Fashion editorial photograph: a model in an iridescent liquid-chrome trench coat walking between giant ancient Roman columns at golden hour, wind in the fabric, dramatic low angle, 35mm film grain",
  },
  {
    src: "/showcase/neon.webp",
    prompt:
      "Cinematic close-up portrait of a man in the rain at night, lime green and magenta neon light reflecting on wet skin, water droplets, shallow depth of field, moody",
  },
  {
    src: "/showcase/coast.webp",
    prompt:
      "Aerial photograph of the Beirut coastline at blue hour, city lights glowing, long-exposure light trails along the seaside corniche, dramatic clouds over the Mediterranean",
  },
  {
    src: "/showcase/cedar.webp",
    prompt:
      "Surreal epic landscape: a single ancient cedar tree on a floating rock island above a sea of clouds at sunrise, volumetric god rays, glowing mist, ultra detailed",
  },
  {
    src: "/showcase/sneaker.webp",
    prompt:
      "Studio product shot of a futuristic white sneaker shattering into floating glossy fragments mid-air, lime green and hot pink rim lights, black background, advertising photography",
  },
  {
    src: "/showcase/dessert.webp",
    prompt:
      "Luxury dessert photography: a glossy mirror-glaze cake with pistachio and rose petals, a single gold leaf, dramatic side light on a black marble table, soft mist",
  },
].map((s) => ({ ...s, w: 640, h: 853 }));

export function showcaseHref(prompt: string) {
  return `/create?${new URLSearchParams({ mode: "photo", prompt, model: MODEL, size: "portrait" })}`;
}
