// Finds and runs ffmpeg. The installer ships ffmpeg in the panel's bin folder;
// a system ffmpeg on the PATH is used as a fallback.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function candidates(extensionRoot) {
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const list = [];
  if (extensionRoot) list.push(path.join(extensionRoot, "bin", exe));
  if (process.platform === "darwin") list.push("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg");
  list.push(exe); // PATH
  return list;
}

function find(extensionRoot) {
  for (const c of candidates(extensionRoot)) {
    if (!path.isAbsolute(c)) return c;
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/** Runs ffmpeg and resolves with stderr (where ffmpeg writes its analysis). */
function run(bin, args, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["-hide_banner", "-nostdin", ...args], { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (onProgress) {
        const m = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (m) onProgress(+m[1] * 3600 + +m[2] * 60 + +m[3]);
      }
    });
    child.on("error", (err) =>
      reject(err.code === "ENOENT" ? new Error("ffmpeg wasn't found. Reinstall PostKit to restore it.") : err),
    );
    child.on("close", (code) => (code === 0 ? resolve(stderr) : reject(new Error(lastLine(stderr) || `ffmpeg exited with ${code}`))));
  });
}

function lastLine(text) {
  return text.trim().split(/\r?\n/).pop();
}

module.exports = { find, run };
