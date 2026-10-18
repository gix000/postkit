"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// The hero demo: a raw talking-head clip on a Premiere-style timeline.
// 1) the silences are marked, 2) they collapse out of the cut,
// 3) the cut plays with word-timed captions in the 9:16 preview.

type Word = { text: string; start: number; end: number };
type Segment =
  | { kind: "speech"; dur: number; words: string[] }
  | { kind: "silence"; dur: number };

const SEGMENTS: Segment[] = [
  { kind: "silence", dur: 0.7 },
  { kind: "speech", dur: 1.8, words: ["هيدا", "الـ", "reel"] },
  { kind: "silence", dur: 1.2 },
  { kind: "speech", dur: 1.6, words: ["قصّيناه", "بدقيقة"] },
  { kind: "silence", dur: 0.9 },
  { kind: "speech", dur: 1.9, words: ["بلا", "ولا", "silence"] },
];

const FPS = 30;
const SPEECH_TOTAL = SEGMENTS.reduce((s, x) => (x.kind === "speech" ? s + x.dur : s), 0);
const SILENCE_TOTAL = SEGMENTS.reduce((s, x) => (x.kind === "silence" ? s + x.dur : s), 0);

/** Word timings on the cut (silences removed), spread evenly within each phrase. */
function buildPhrases() {
  let t = 0;
  const phrases: Word[][] = [];
  for (const seg of SEGMENTS) {
    if (seg.kind !== "speech") continue;
    const step = seg.dur / seg.words.length;
    phrases.push(seg.words.map((text, i) => ({ text, start: t + i * step, end: t + (i + 1) * step })));
    t += seg.dur;
  }
  return phrases;
}

/** Deterministic waveform so server and client render the same bars. */
function bars(seed: number, count: number, quiet: boolean) {
  let x = seed * 9301 + 49297;
  return Array.from({ length: count }, () => {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    return quiet ? 0.04 + r * 0.06 : 0.25 + r * 0.75;
  });
}

function timecode(sec: number) {
  const f = Math.floor((sec % 1) * FPS);
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return `00:${p(m)}:${p(s)}:${p(f)}`;
}

type Phase = "raw" | "cut" | "play";

export function TimelineDemo({
  label,
  removed,
  playLabel,
  pauseLabel,
  sequence,
  tracks,
  locale,
}: {
  label: string;
  removed: string;
  playLabel: string;
  pauseLabel: string;
  sequence: string;
  tracks: { video: string; audio: string; captions: string };
  locale: "en" | "ar";
}) {
  const phrases = useMemo(buildPhrases, []);
  const words = useMemo(() => phrases.flat(), [phrases]);
  const [phase, setPhase] = useState<Phase>("raw");
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(SPEECH_TOTAL - 0.2);
  const startRef = useRef<number | null>(null);

  // One orchestrated sequence on load; reduced motion jumps straight to the result.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("play");
      setPlaying(false);
      return;
    }
    const a = window.setTimeout(() => setPhase("cut"), 1400);
    const b = window.setTimeout(() => {
      setT(0);
      setPhase("play");
    }, 2600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  // Playback loop over the cut.
  useEffect(() => {
    if (phase !== "play" || !playing) return;
    let raf = 0;
    const offset = t;
    startRef.current = null;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now - offset * 1000;
      const next = ((now - startRef.current) / 1000) % SPEECH_TOTAL;
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, playing]);

  const cut = phase !== "raw";
  const active = words.findIndex((w) => t >= w.start && t < w.end);
  const phraseIndex = Math.max(
    0,
    phrases.findIndex((p) => t >= p[0].start && t < p[p.length - 1].end),
  );
  const phrase = phrases[phraseIndex];
  const headPct = phase === "play" ? (t / SPEECH_TOTAL) * 100 : 0;
  const seconds = locale === "ar" ? `${SILENCE_TOTAL.toFixed(1)} ثانية` : `${SILENCE_TOTAL.toFixed(1)} s`;

  let speechIndex = -1;
  let wordCursor = 0;

  return (
    <figure className={`demo demo--${phase}`} aria-label={label}>
      <div className="demo__preview" aria-hidden="true">
        <div className="demo__frame">
          <div className="demo__subject" />
          <p className="demo__caption" dir="rtl">
            {phrase.map((w, i) => {
              const globalIndex = words.indexOf(w);
              return (
                <span key={i} className={globalIndex === active && phase === "play" ? "is-on" : undefined}>
                  {w.text}
                </span>
              );
            })}
          </p>
        </div>
      </div>

      <div className="demo__timeline" dir="ltr">
        <div className="demo__bar">
          <span className="demo__seq">{sequence}</span>
          <span className="demo__tc">{timecode(phase === "play" ? t : 0)}</span>
          <button
            type="button"
            className="demo__toggle"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? pauseLabel : playLabel}
            disabled={phase !== "play"}
          >
            {playing ? (
              <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="1.5" width="2.6" height="9" /><rect x="7.4" y="1.5" width="2.6" height="9" /></svg>
            ) : (
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" /></svg>
            )}
          </button>
        </div>

        <div className="demo__tracks">
          <div className="demo__labels" aria-hidden="true">
            <span>{tracks.video}</span>
            <span>{tracks.audio}</span>
            <span>{tracks.captions}</span>
          </div>

          <div className="demo__lanes">
            <div className="demo__ruler" aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i}>{`00:0${i}`}</span>
              ))}
            </div>

            <div className="demo__cols">
            {SEGMENTS.map((seg, i) => {
              if (seg.kind === "speech") speechIndex += 1;
              const segWords = seg.kind === "speech" ? phrases[speechIndex] : [];
              const firstWord = wordCursor;
              wordCursor += segWords.length;
              return (
                <div
                  key={i}
                  className={`demo__col demo__col--${seg.kind}`}
                  style={{ flexGrow: seg.kind === "silence" && cut ? 0.0001 : seg.dur }}
                >
                  <div className="demo__clip demo__clip--video" />
                  <div className="demo__clip demo__clip--audio">
                    {bars(i + 1, Math.round(seg.dur * 24), seg.kind === "silence").map((h, j) => (
                      <i key={j} style={{ height: `${h * 100}%` }} />
                    ))}
                  </div>
                  <div className="demo__clip demo__clip--captions">
                    {segWords.map((w, j) => (
                      <span key={j} className={firstWord + j === active && phase === "play" ? "is-on" : undefined}>
                        {w.text}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>

            <div className="demo__head" style={{ insetInlineStart: `${headPct}%` }} aria-hidden="true" />
          </div>
        </div>

        <p className="demo__badge" role="status">
          {cut ? removed.replace("{s}", seconds) : " "}
        </p>
      </div>
    </figure>
  );
}
