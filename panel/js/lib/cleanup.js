// Plans a tidy project: every loose item goes into a bin named after its type.

const EXT = {
  Video: ["mp4", "mov", "mxf", "avi", "mkv", "m4v", "mts", "m2ts", "webm", "r3d", "braw", "mpg", "mpeg"],
  Audio: ["wav", "mp3", "aif", "aiff", "m4a", "aac", "flac", "ogg", "opus", "wma"],
  Images: ["jpg", "jpeg", "png", "tif", "tiff", "psd", "gif", "bmp", "heic", "webp", "svg", "ai", "eps", "exr", "dpx"],
  Graphics: ["mogrt", "aegraphic", "prtl"],
  Captions: ["srt", "scc", "vtt", "stl", "xml"],
};

function kindOf(item) {
  if (item.isSequence) return "Sequences";
  const ext = String(item.path || item.name || "").split(".").pop().toLowerCase();
  for (const [kind, list] of Object.entries(EXT)) if (list.includes(ext)) return kind;
  if (!item.path) return "Graphics"; // titles, adjustment layers, colour mattes
  return "Other";
}

/**
 * @param items [{nodeId, name, path, isSequence, bin}] — bin is the item's current bin path ("" = root)
 * @returns [{nodeId, name, to}] moves for items not already in the right top-level bin
 */
function plan(items) {
  const moves = [];
  for (const item of items) {
    const to = kindOf(item);
    const top = String(item.bin || "").split("/")[0];
    if (top === to) continue; // already filed
    if (item.bin) continue; // leave the editor's own bins alone; only file loose root items
    moves.push({ nodeId: item.nodeId, name: item.name, to });
  }
  return moves;
}

function summary(moves) {
  const counts = {};
  for (const m of moves) counts[m.to] = (counts[m.to] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([bin, n]) => `${n} → ${bin}`);
}

module.exports = { plan, kindOf, summary };
