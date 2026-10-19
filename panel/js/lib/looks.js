// Colour looks: Lumetri Color values for Premiere, plus an ffmpeg filter that
// approximates each look so the panel can preview it on a frame first.

const LOOKS = {
  natural: { name: "Natural", note: "A gentle lift — truer colour, a bit more life", lumetri: { Exposure: 0.1, Contrast: 8, Highlights: -10, Shadows: 8, Saturation: 108, Vibrance: 8 } },
  warm: { name: "Golden", note: "Warm skin, soft sun", lumetri: { Temperature: 14, Tint: 3, Exposure: 0.1, Contrast: 10, Highlights: -12, Shadows: 6, Saturation: 110, Vibrance: 10 } },
  cool: { name: "Clean cool", note: "Crisp, modern, a touch blue", lumetri: { Temperature: -12, Tint: -2, Contrast: 14, Highlights: -8, Shadows: -4, Saturation: 98, Vibrance: 6 } },
  punchy: { name: "Punchy", note: "Bold contrast and colour for social", lumetri: { Exposure: 0.15, Contrast: 26, Highlights: -18, Shadows: -6, Whites: 10, Blacks: -12, Saturation: 120, Vibrance: 18 } },
  moody: { name: "Moody", note: "Darker, muted, cinematic", lumetri: { Temperature: -4, Exposure: -0.35, Contrast: 22, Highlights: -24, Shadows: -14, Blacks: -10, Saturation: 82, Vibrance: -6 } },
  film: { name: "Film fade", note: "Lifted blacks, soft and nostalgic", lumetri: { Temperature: 8, Contrast: -10, Highlights: -14, Shadows: 12, Blacks: 18, Saturation: 90, "Faded Film": 30 } },
  teal: { name: "Teal & orange", note: "Blockbuster skin against cool shadows", lumetri: { Temperature: 6, Tint: -4, Contrast: 18, Highlights: -12, Shadows: -8, Saturation: 112, Vibrance: 14 }, split: true },
  bw: { name: "Black & white", note: "Classic monochrome with contrast", lumetri: { Contrast: 24, Highlights: -10, Shadows: -8, Saturation: 0 } },
  bright: { name: "Bright & airy", note: "Light, clean, lifestyle", lumetri: { Temperature: 3, Exposure: 0.4, Contrast: -6, Highlights: -20, Shadows: 18, Whites: 8, Saturation: 104, Vibrance: 12 } },
  vivid: { name: "Vivid food", note: "Rich colour for food and products", lumetri: { Temperature: 6, Exposure: 0.15, Contrast: 16, Saturation: 128, Vibrance: 22 } },
};

/** ffmpeg filter for a preview of the look (approximate). */
function previewFilter(id) {
  const l = (LOOKS[id] || LOOKS.natural).lumetri;
  const f = [];
  const exp = l.Exposure || 0;
  if (exp) f.push(`exposure=exposure=${exp.toFixed(2)}`);
  const contrast = 1 + (l.Contrast || 0) / 100;
  const sat = (l.Saturation === undefined ? 100 : l.Saturation) / 100 * (1 + (l.Vibrance || 0) / 200);
  f.push(`eq=contrast=${contrast.toFixed(3)}:saturation=${sat.toFixed(3)}`);
  const temp = (l.Temperature || 0) / 100, tint = (l.Tint || 0) / 100;
  if (temp || tint) f.push(`colorbalance=rm=${(temp * 0.35).toFixed(3)}:bm=${(-temp * 0.35).toFixed(3)}:gm=${(-tint * 0.3).toFixed(3)}`);
  const sh = (l.Shadows || 0) / 100, hi = (l.Highlights || 0) / 100, bl = (l.Blacks || 0) / 100, wh = (l.Whites || 0) / 100;
  if (sh || hi || bl || wh) {
    const p = (x) => Math.min(1, Math.max(0, x)).toFixed(3);
    f.push(`curves=all='0/${p(Math.max(0, bl * 0.15))} 0.25/${p(0.25 + sh * 0.1)} 0.75/${p(0.75 + hi * 0.1)} 1/${p(1 + Math.min(0, wh) * 0.1)}'`);
  }
  if (LOOKS[id] && LOOKS[id].split) f.push("colorbalance=rs=-0.12:gs=0.02:bs=0.14:rh=0.1:bh=-0.08");
  return f.join(",");
}

function list() {
  return Object.entries(LOOKS).map(([id, l]) => ({ id, name: l.name, note: l.note }));
}

module.exports = { LOOKS, previewFilter, list };
