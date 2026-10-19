// Synthesises PostKit's built-in sound effects with ffmpeg (no samples, nothing to license)
// into assets/sfx, normalised to -3 dBFS peak, plus sfx.json for the panel.
// Usage: node tools/build-sfx.js [ffmpeg]
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FF = process.argv[2] || "ffmpeg";
const OUT = path.join(__dirname, "..", "assets", "sfx");
const N = "(random(0)*2-1)"; // white noise

// id, name, category, tags, duration, aevalsrc expression, extra filters
const SOUNDS = [
  ["pop", "Pop", "UI", ["word", "caption", "appear"], 0.25, `sin(2*PI*t*(300+900*exp(-t*40)))*exp(-t*30)`],
  ["bubble", "Bubble", "UI", ["appear", "cute"], 0.25, `sin(2*PI*t*(500+700*(1-exp(-t*30))))*exp(-t*22)`],
  ["click", "Click", "UI", ["button", "tap"], 0.06, `${N}*exp(-t*400)`, "highpass=f=1500"],
  ["tick", "Tick", "UI", ["timer", "list"], 0.07, `sin(2*PI*2500*t)*exp(-t*120)`],
  ["swipe", "Swipe", "UI", ["slide", "screen"], 0.18, `${N}*sin(PI*t/0.18)^2`, "bandpass=f=3500:w=2500"],
  ["ding", "Ding", "Bells", ["idea", "correct", "point"], 1.4, `(sin(2*PI*1320*t)+0.5*sin(2*PI*2640*t)+0.25*sin(2*PI*3960*t))*exp(-t*4)`],
  ["chime", "Success chime", "Bells", ["win", "done", "check"], 1.6, `between(t,0,2)*sin(2*PI*1047*t)*exp(-t*5)+between(t,0.09,2)*sin(2*PI*1319*(t-0.09))*exp(-(t-0.09)*5)+between(t,0.18,2)*sin(2*PI*1568*(t-0.18))*exp(-(t-0.18)*4)`],
  ["notify", "Notification", "Bells", ["message", "phone", "alert"], 0.6, `between(t,0,0.14)*sin(2*PI*880*t)*exp(-t*10)+between(t,0.14,0.6)*sin(2*PI*1320*(t-0.14))*exp(-(t-0.14)*8)`],
  ["coin", "Coin", "Bells", ["money", "price", "sale"], 0.9, `sin(2*PI*1975*t)*exp(-t*8)*0.5+between(t,0.08,1)*sin(2*PI*2637*(t-0.08))*exp(-(t-0.08)*6)*0.6`],
  ["sparkle", "Sparkle", "Bells", ["magic", "reveal", "new"], 1.2, `between(t,0,2)*sin(2*PI*2093*t)*exp(-t*6)+between(t,0.06,2)*sin(2*PI*2637*(t-0.06))*exp(-(t-0.06)*6)+between(t,0.12,2)*sin(2*PI*3136*(t-0.12))*exp(-(t-0.12)*6)+between(t,0.18,2)*sin(2*PI*4186*(t-0.18))*exp(-(t-0.18)*5)`, "aecho=0.6:0.5:60:0.3"],
  ["error", "Wrong", "UI", ["mistake", "no", "fail"], 0.5, `0.5*sgn(sin(2*PI*140*t))*between(t,0,0.18)+0.5*sgn(sin(2*PI*110*t))*between(t,0.22,0.45)`, "lowpass=f=2500"],
  ["beep", "Beep", "UI", ["countdown", "timer"], 0.16, `sin(2*PI*1000*t)*between(t,0,0.14)`],
  ["whoosh", "Whoosh", "Transitions", ["cut", "transition", "fast"], 0.6, `${N}*(t/0.6)^1.5*exp(-((t-0.42)/0.12)^2)*3`, "bandpass=f=900:w=1400,aphaser=in_gain=0.6:out_gain=0.9:delay=2:decay=0.4:speed=1.8"],
  ["whoosh-long", "Long whoosh", "Transitions", ["transition", "scene"], 1.1, `${N}*sin(PI*t/1.1)^3`, "bandpass=f=700:w=1200,aphaser=in_gain=0.6:out_gain=0.9:delay=3:decay=0.5:speed=0.9"],
  ["swoosh", "Swoosh", "Transitions", ["title", "text", "appear"], 0.3, `${N}*sin(PI*t/0.3)^2`, "bandpass=f=2200:w=1800"],
  ["riser", "Riser", "Transitions", ["build", "reveal", "tension"], 2, `(0.5*sin(2*PI*(200*t+400*t*t))+0.35*${N})*(t/2)^2`, "highpass=f=180"],
  ["impact", "Impact", "Hits", ["hook", "reveal", "boom"], 1.8, `sin(2*PI*t*(45+80*exp(-t*12)))*exp(-t*3)+${N}*exp(-t*25)*0.5`, "lowpass=f=3000"],
  ["thud", "Thud", "Hits", ["drop", "land"], 0.5, `sin(2*PI*t*(60+60*exp(-t*20)))*exp(-t*10)+${N}*exp(-t*60)*0.3`, "lowpass=f=1200"],
  ["kick", "Kick", "Hits", ["beat", "punch"], 0.5, `sin(2*PI*t*(50+150*exp(-t*35)))*exp(-t*9)`],
  ["clap", "Clap", "Hits", ["applause", "accent"], 0.35, `${N}*(exp(-t*80)+between(t,0.012,1)*exp(-(t-0.012)*80)+between(t,0.025,1)*exp(-(t-0.025)*30))`, "bandpass=f=1400:w=1500"],
  ["bass-drop", "Bass drop", "Hits", ["drop", "dramatic"], 2.4, `tanh(3*sin(2*PI*t*(35+40*exp(-t*1.5))))*exp(-t*1.2)`, "lowpass=f=400"],
  ["heartbeat", "Heartbeat", "Hits", ["tension", "suspense"], 0.9, `sin(2*PI*t*(45+40*exp(-t*30)))*exp(-t*14)+between(t,0.28,1)*sin(2*PI*(t-0.28)*(45+40*exp(-(t-0.28)*30)))*exp(-(t-0.28)*12)*0.8`, "lowpass=f=300"],
  ["shutter", "Camera shutter", "Foley", ["photo", "snapshot"], 0.25, `${N}*(exp(-t*120)+between(t,0.08,1)*exp(-(t-0.08)*90)*0.8)`, "bandpass=f=2600:w=2600"],
  ["typing", "Typing", "Foley", ["text", "search", "type"], 1.2, `${N}*exp(-mod(t,0.11)*260)*lt(mod(t*7.7,1),0.85)`, "bandpass=f=3000:w=3000"],
  ["glitch", "Glitch", "Foley", ["tech", "error", "digital"], 0.45, `0.4*sgn(sin(2*PI*t*(220+1600*lt(mod(t*23,1),0.5))))*lt(mod(t*13,1),0.6)`, "lowpass=f=6000"],
  ["laser", "Laser", "Foley", ["sci-fi", "zap"], 0.4, `sin(2*PI*t*(2200*exp(-t*12)+200))*exp(-t*6)`],
  ["boing", "Boing", "Foley", ["funny", "bounce"], 0.8, `sin(2*PI*t*(300+120*sin(2*PI*12*t)*exp(-t*4)))*exp(-t*4)`],
  ["record-stop", "Record stop", "Foley", ["stop", "freeze", "wait"], 0.9, `sin(2*PI*(440*t-180*t*t))*exp(-t*2.5)*lt(t,0.9)+0.2*${N}*exp(-t*6)`, "lowpass=f=1800"],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const catalog = [];
for (const [id, name, category, tags, d, expr, filters] of SOUNDS) {
  const raw = path.join(OUT, `${id}.raw.wav`);
  const chain = ["aformat=channel_layouts=mono", filters, `afade=t=out:st=${Math.max(0, d - 0.03)}:d=0.03`].filter(Boolean).join(",");
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=exprs='${expr}':s=48000:d=${d}`, "-af", chain, "-c:a", "pcm_s16le", raw]);
  const stderr = spawnSync(FF, ["-hide_banner", "-i", raw, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const m = String(stderr).match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/);
  const gain = m ? -3 - parseFloat(m[1]) : 0;
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "pcm_s16le", path.join(OUT, `${id}.wav`)]);
  fs.unlinkSync(raw);
  catalog.push({ id, name, category, tags, duration: d, file: `${id}.wav` });
}
fs.writeFileSync(path.join(OUT, "sfx.json"), JSON.stringify(catalog, null, 1));
const bytes = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(catalog.length, "sounds,", (bytes / 1e6).toFixed(2), "MB");
