/* Loads the bundled fonts with the FontFace API. Works in the panel and in test pages. */
(function (root, factory) {
  // Premiere's panel defines `module` when Node is on, so set the page global as well.
  const lib = factory();
  if (root) root.PKFonts = lib;
  if (typeof module === "object" && module.exports) module.exports = lib;
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : null, function () {
  "use strict";
  let loading = null;

  /** faces: entries of assets/fonts/fonts.json; baseUrl: file:// URL of assets/fonts. */
  function load(faces, baseUrl) {
    if (loading) return loading;
    loading = Promise.all(
      faces.map((f) => {
        const face = new FontFace(f.family, `url("${baseUrl}/${f.file}")`, { weight: String(f.weight), style: f.style, unicodeRange: f.unicodeRange });
        return face.load().then((ok) => document.fonts.add(ok)).catch(() => null);
      }),
    ).then(() => document.fonts.ready);
    return loading;
  }

  /** Families available for pickers, grouped by what they're good at. */
  const FAMILIES = [
    { family: "Montserrat", weights: [800, 900], use: "Bold captions and titles" },
    { family: "Inter", weights: [500, 700, 900], use: "Clean, modern" },
    { family: "Poppins", weights: [600, 800], use: "Friendly, round" },
    { family: "Anton", weights: [400], use: "Tall, condensed impact" },
    { family: "Bebas Neue", weights: [400], use: "Condensed headlines" },
    { family: "Archivo Black", weights: [400], use: "Heavy grotesque" },
    { family: "Bangers", weights: [400], use: "Comic, loud" },
    { family: "Space Grotesk", weights: [500, 700], use: "Tech" },
    { family: "JetBrains Mono", weights: [700], use: "Code, typewriter" },
    { family: "Playfair Display", weights: [700, 900], use: "Elegant serif" },
    { family: "DM Serif Display", weights: [400], use: "Editorial serif" },
    { family: "Permanent Marker", weights: [400], use: "Marker" },
    { family: "Caveat", weights: [700], use: "Handwriting" },
    { family: "Cairo", weights: [600, 800, 900], use: "Arabic + Latin" },
    { family: "Rubik", weights: [600, 800, 900], use: "Arabic + Latin, round" },
    { family: "Tajawal", weights: [500, 800], use: "Arabic + Latin, light" },
    { family: "IBM Plex Sans Arabic", weights: [500, 700], use: "Arabic + Latin, neutral" },
    { family: "Changa", weights: [700, 800], use: "Arabic + Latin, square" },
    { family: "Lalezar", weights: [400], use: "Arabic display" },
    { family: "Reem Kufi", weights: [700], use: "Arabic Kufi" },
  ];

  return { load, FAMILIES };
});
