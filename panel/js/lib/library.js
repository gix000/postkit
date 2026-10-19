// "Your Library": the editor's own folders of sound effects, transitions and
// overlays, scanned and filed by type so one click drops them on the timeline.

const fs = require("fs");
const path = require("path");

const TYPES = {
  audio: ["wav", "mp3", "aif", "aiff", "m4a", "aac", "flac", "ogg"],
  video: ["mp4", "mov", "webm", "mkv", "m4v"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "psd", "tif", "tiff"],
  template: ["mogrt"],
};

function typeOf(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  for (const [t, list] of Object.entries(TYPES)) if (list.includes(ext)) return t;
  return null;
}

/** Category from the folder names, falling back to the file type. */
function categoryOf(rel, type) {
  const p = rel.toLowerCase();
  if (/(^|[\/\\])(sfx|sound ?effects?|whoosh|swoosh|hits?|risers?)([\/\\]|$)/.test(p)) return "Sound effects";
  if (/(^|[\/\\])(music|songs?|beds?)([\/\\]|$)/.test(p)) return "Music";
  if (/(^|[\/\\])(transitions?)([\/\\]|$)/.test(p)) return "Transitions";
  if (/(^|[\/\\])(overlays?|light ?leaks?|textures?|grain|dust)([\/\\]|$)/.test(p)) return "Overlays";
  if (type === "audio") return "Sound effects";
  if (type === "template") return "Templates";
  if (type === "image") return "Images";
  return "Overlays";
}

/** Walks the folders (max depth 6, max 5000 files). */
function scan(folders, { maxFiles = 5000 } = {}) {
  const out = [];
  const walk = (root, dir, depth) => {
    if (depth > 6 || out.length >= maxFiles) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(root, full, depth + 1);
      else {
        const type = typeOf(e.name);
        if (!type) continue;
        const rel = path.relative(root, full);
        out.push({ path: full, name: path.basename(e.name, path.extname(e.name)), type, category: categoryOf(rel, type) });
        if (out.length >= maxFiles) return;
      }
    }
  };
  for (const f of folders) walk(f, f, 0);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function filter(items, { query = "", category = "" } = {}) {
  const q = query.trim().toLowerCase();
  return items.filter((i) => (!category || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
}

module.exports = { scan, filter, typeOf, categoryOf };
