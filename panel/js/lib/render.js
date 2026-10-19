// Turns frames into a transparent video Premiere can place over the timeline, and
// reads the footage behind a graphic so liquid glass can blur and bend it.

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

/** Output formats with an alpha channel that Premiere 2022+ reads on Mac and Windows. */
const CODECS = {
  prores: ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-alpha_bits", "16", "-vendor", "apl0", "-qscale:v", "9"],
  qtrle: ["-c:v", "qtrle", "-pix_fmt", "argb"],
};

/**
 * Encodes frames to a .mov with alpha.
 * drawFrame(i, t) → Uint8Array/Uint8ClampedArray of width*height*4 RGBA (may be async).
 */
function encode(bin, { width, height, fps, frames, out, codec = "prores", drawFrame, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const args = ["-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(fps), "-i", "-", ...CODECS[codec], "-r", String(fps), out];
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    let failed = null;
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => { failed = err; reject(err.code === "ENOENT" ? new Error("ffmpeg wasn't found. Reinstall PostKit to restore it.") : err); });
    child.on("close", (code) => {
      if (failed) return;
      if (code === 0) resolve({ file: out, frames });
      else reject(new Error(stderr.trim().split(/\r?\n/).pop() || `ffmpeg exited with ${code}`));
    });
    child.stdin.on("error", () => {}); // reported through close

    const write = (buf) => new Promise((ok) => (child.stdin.write(buf) ? ok() : child.stdin.once("drain", ok)));
    (async () => {
      try {
        for (let i = 0; i < frames; i++) {
          if (failed) return;
          if (signal && signal.aborted) throw new Error("Stopped.");
          const data = await drawFrame(i, i / fps);
          await write(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
          if (onProgress && (i % 5 === 0 || i === frames - 1)) onProgress((i + 1) / frames);
        }
        child.stdin.end();
      } catch (err) {
        failed = err;
        child.kill();
        reject(err);
      }
    })();
  });
}

/**
 * Sequential reader of the footage under a graphic, at a small size (blurred anyway).
 * segments: [{seqStart, seqEnd, mediaPath, inPoint}] in sequence seconds (the camera track).
 * frameAt(seqTime) must be called with increasing times; returns RGBA Buffer or null in gaps.
 */
class Backdrop {
  constructor(bin, segments, { width, height, fps }) {
    this.bin = bin;
    this.segments = segments.slice().sort((a, b) => a.seqStart - b.seqStart);
    this.w = width;
    this.h = height;
    this.fps = fps;
    this.size = width * height * 4;
    this.cur = null; // { seg, child, chunks, bytes, ended, frameIndex, last }
  }

  _open(seg, fromSeq) {
    this.close();
    const skip = Math.max(0, fromSeq - seg.seqStart);
    const dur = seg.seqEnd - seg.seqStart - skip;
    const vf = `fps=${this.fps},scale=${this.w}:${this.h}:force_original_aspect_ratio=increase,crop=${this.w}:${this.h}`;
    const child = spawn(this.bin, ["-hide_banner", "-nostdin", "-loglevel", "error", "-ss", (seg.inPoint + skip).toFixed(3), "-t", dur.toFixed(3), "-i", seg.mediaPath, "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { windowsHide: true });
    const state = { seg, child, chunks: [], bytes: 0, ended: false, start: seg.seqStart + skip, index: 0, last: null, waiters: [] };
    child.stdout.on("data", (d) => {
      state.chunks.push(d);
      state.bytes += d.length;
      if (state.bytes > this.size * 8) child.stdout.pause(); // don't run far ahead
      state.waiters.splice(0).forEach((f) => f());
    });
    const done = () => { state.ended = true; state.waiters.splice(0).forEach((f) => f()); };
    child.on("close", done);
    child.on("error", done);
    this.cur = state;
  }

  async _next(state) {
    while (state.bytes < this.size && !state.ended) {
      state.child.stdout.resume();
      await new Promise((r) => state.waiters.push(r));
    }
    if (state.bytes < this.size) return null;
    const all = state.chunks.length === 1 ? state.chunks[0] : Buffer.concat(state.chunks);
    const frame = Buffer.from(all.subarray(0, this.size));
    const rest = all.subarray(this.size);
    state.chunks = rest.length ? [rest] : [];
    state.bytes = rest.length;
    if (state.bytes < this.size * 4) state.child.stdout.resume();
    state.index++;
    return frame;
  }

  async frameAt(t) {
    const seg = this.segments.find((s) => t >= s.seqStart - 1e-6 && t < s.seqEnd - 1e-6);
    if (!seg) return null;
    if (!this.cur || this.cur.seg !== seg || t < this.cur.start + (this.cur.index - 1) / this.fps - 1e-6) this._open(seg, t);
    const st = this.cur;
    // Advance to the frame that covers t; reuse the last one when t hasn't moved past it.
    const want = Math.floor((t - st.start) * this.fps + 1e-6);
    while (st.index <= want) {
      const f = await this._next(st);
      if (!f) break;
      st.last = f;
    }
    return st.last;
  }

  close() {
    if (this.cur) {
      try { this.cur.child.kill(); } catch (e) { /* gone */ }
      this.cur = null;
    }
  }
}

function tempFile(name) {
  const dir = path.join(os.tmpdir(), "postkit-render");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

module.exports = { encode, Backdrop, CODECS, tempFile };
