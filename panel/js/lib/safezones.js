// Areas each app covers with its own buttons and text on a 9:16 video.
// Fractions of the frame (x, y, width, height), from each app's 1080×1920 guides.
// Approximate: apps move their UI between versions.

const ZONES = {
  tiktok: {
    name: "TikTok",
    areas: [
      { label: "Caption and username", x: 0, y: 0.74, w: 0.78, h: 0.19 },
      { label: "Like, comment, share", x: 0.86, y: 0.42, w: 0.14, h: 0.49 },
      { label: "Top bar", x: 0, y: 0, w: 1, h: 0.08 },
      { label: "Bottom bar", x: 0, y: 0.93, w: 1, h: 0.07 },
    ],
  },
  reels: {
    name: "Instagram Reels",
    areas: [
      { label: "Caption and audio", x: 0, y: 0.78, w: 0.8, h: 0.17 },
      { label: "Like, comment, share", x: 0.85, y: 0.5, w: 0.15, h: 0.45 },
      { label: "Top bar", x: 0, y: 0, w: 1, h: 0.07 },
      { label: "Bottom bar", x: 0, y: 0.95, w: 1, h: 0.05 },
    ],
  },
  shorts: {
    name: "YouTube Shorts",
    areas: [
      { label: "Title and channel", x: 0, y: 0.76, w: 0.8, h: 0.18 },
      { label: "Like, dislike, comment, share", x: 0.84, y: 0.4, w: 0.16, h: 0.54 },
      { label: "Top bar", x: 0, y: 0, w: 1, h: 0.07 },
      { label: "Bottom bar", x: 0, y: 0.94, w: 1, h: 0.06 },
    ],
  },
};

/** Areas in pixels for a frame of the given size, letterboxed to 9:16 if needed. */
function forFrame(platform, width, height) {
  const z = ZONES[platform];
  if (!z) throw new Error("Unknown platform.");
  // Fit a 9:16 box inside the frame (what the phone shows).
  let boxW = width, boxH = (width * 16) / 9;
  if (boxH > height) { boxH = height; boxW = (height * 9) / 16; }
  const ox = (width - boxW) / 2, oy = (height - boxH) / 2;
  return z.areas.map((a) => ({ label: a.label, x: ox + a.x * boxW, y: oy + a.y * boxH, w: a.w * boxW, h: a.h * boxH }));
}

function platforms() {
  return Object.entries(ZONES).map(([id, z]) => ({ id, name: z.name }));
}

module.exports = { forFrame, platforms, ZONES };
