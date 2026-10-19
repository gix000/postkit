// Copies the bundled fonts (all SIL Open Font Licence, from @fontsource) into
// assets/fonts and writes fonts.json, which the panel loads with the FontFace API.
// Usage: node tools/build-fonts.js <folder with unpacked @fontsource packages>
const fs = require("fs");
const path = require("path");

const SRC = process.argv[2];
const OUT = path.join(__dirname, "..", "assets", "fonts");
// family id → [weights, styles, subsets]
const PICK = {
  montserrat: [[800, 900], ["normal", "italic"], ["latin", "latin-ext"]],
  "bebas-neue": [[400], ["normal"], ["latin", "latin-ext"]],
  anton: [[400], ["normal"], ["latin", "latin-ext"]],
  poppins: [[600, 800], ["normal"], ["latin", "latin-ext"]],
  "playfair-display": [[700, 900], ["normal", "italic"], ["latin", "latin-ext"]],
  "dm-serif-display": [[400], ["normal", "italic"], ["latin", "latin-ext"]],
  "space-grotesk": [[500, 700], ["normal"], ["latin", "latin-ext"]],
  "permanent-marker": [[400], ["normal"], ["latin"]],
  bangers: [[400], ["normal"], ["latin", "latin-ext"]],
  "archivo-black": [[400], ["normal"], ["latin", "latin-ext"]],
  inter: [[500, 700, 900], ["normal"], ["latin", "latin-ext"]],
  cairo: [[600, 800, 900], ["normal"], ["arabic", "latin", "latin-ext"]],
  tajawal: [[500, 800], ["normal"], ["arabic", "latin"]],
  "ibm-plex-sans-arabic": [[500, 700], ["normal"], ["arabic", "latin"]],
  lalezar: [[400], ["normal"], ["arabic", "latin", "latin-ext"]],
  rubik: [[600, 800, 900], ["normal"], ["arabic", "latin", "latin-ext"]],
  "reem-kufi": [[700], ["normal"], ["arabic", "latin"]],
  changa: [[700, 800], ["normal"], ["arabic", "latin", "latin-ext"]],
  "jetbrains-mono": [[700], ["normal"], ["latin", "latin-ext"]],
  caveat: [[700], ["normal"], ["latin", "latin-ext"]],
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const faces = [];
let bytes = 0;
for (const [id, [weights, styles, subsets]] of Object.entries(PICK)) {
  const dir = fs.readdirSync(SRC).find((d) => d.startsWith(`fontsource-${id}-`) && /-\d+\.\d+\.\d+$/.test(d) && d.replace(`fontsource-${id}-`, "").match(/^\d/));
  if (!dir) throw new Error("missing package " + id);
  const pkg = path.join(SRC, dir, "package");
  const meta = JSON.parse(fs.readFileSync(path.join(pkg, "metadata.json"), "utf8"));
  const ranges = JSON.parse(fs.readFileSync(path.join(pkg, "unicode.json"), "utf8"));
  for (const w of weights) for (const s of styles) for (const sub of subsets) {
    const file = `${id}-${sub}-${w}-${s}.woff2`;
    const from = path.join(pkg, "files", file);
    if (!fs.existsSync(from)) continue;
    fs.copyFileSync(from, path.join(OUT, file));
    bytes += fs.statSync(from).size;
    faces.push({ family: meta.family, weight: w, style: s, file, unicodeRange: ranges[sub] });
  }
  fs.copyFileSync(path.join(pkg, "LICENSE"), path.join(OUT, `LICENSE-${id}.txt`));
}
fs.writeFileSync(path.join(OUT, "fonts.json"), JSON.stringify(faces, null, 1));
console.log(faces.length, "faces,", (bytes / 1e6).toFixed(2), "MB");
