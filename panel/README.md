# PostKit panel for Premiere Pro — 1.1

A CEP panel for Premiere Pro 2022 and newer (Windows and Mac). The home screen is the
**AI editor**: you say what you want, it looks at the video (transcript, pauses, four stills),
plans with only the tools the job needs, shows you the plan and a few colour looks, then
performs it on a copy of the sequence.

**Start from video files** (1.1): pick one video or a few clips, optional music, a format
(9:16, 1:1, 16:9) and a length. PostKit imports them, builds and reframes the sequence,
and listens: if someone is talking it runs the full AI edit; if it's footage, it scores every
moment (light, sharpness, motion, shot changes — `js/lib/footage.js`), lets the AI choose the
order, title, ending, transitions and look (`/api/panel/ai/montage`), and cuts the best moments
to the music's beat. A footage-only sequence gets the same montage from “Plan the edit”.

Around it are 20 tools:

| Group | Tool | Runs |
| --- | --- | --- |
| Edit | Smart cut (with crossfades) · Auto zoom · Multicam · Motion presets (29) · Curve editor · Tracking | Local |
| Text & graphics | Captions (16 animated styles or Premiere captions) · Liquid glass (17) · Animated titles (38) · Motion gallery (95 + AI motion) · Safe zones | Local render; transcription and AI motion on the server |
| Audio | Studio voice · Sound effects (28 built-in + AI) · Automatic SFX · Auto ducking | Local; AI sounds on the server |
| Colour & library | Colour looks (10 Lumetri grades) · B-roll (Pexels) · Your library · Search & markers · Project cleanup | Local; b-roll search on the server |

## How graphics work

`js/gfx/engine.js` draws a scene description (text, shapes, liquid glass, particles,
keyframes, eases, per-word and per-letter animation, right-to-left Arabic) on a canvas.
`js/lib/render.js` streams the frames into ffmpeg as ProRes 4444 with alpha (or Animation),
and the file is placed on a free track above everything at that time. Liquid glass reads
the camera track's footage under the graphic (`Backdrop`) and blurs and bends it, so the
glass is real, not a tint.

## Layout

- `index.html`, `css/panel.css` — the panel
- `js/core.js` — Premiere bridge, state, server calls, transcription, rendering
- `js/ui.js` — controls, icons, the motion-graphics picker with live previews
- `js/tools/*.js` — the tools; `js/ai.js` — the AI editor; `js/main.js` — start-up and navigation
- `js/gfx/` — motion engine, templates, caption styles, fonts, validation of AI scenes
- `js/lib/` — Node modules (ffmpeg, audio, voice, looks, motion, edit maths, licence…)
- `jsx/host.jsx` — ExtendScript (ES3) functions Premiere runs
- `assets/fonts` — 20 open-licence families (Latin + Arabic); `assets/sfx` — synthesised sounds
- `tools/build-fonts.js`, `tools/build-sfx.js` — rebuild the assets

## Install (testing)

- **Mac:** double-click `install/install-mac.command`. If macOS blocks it, right-click → Open.
- **Windows:** double-click `install/install-win.bat`.

The installer copies the panel to Premiere's extensions folder, turns on loading of
unsigned panels (`PlayerDebugMode`), and downloads ffmpeg into the panel's `bin` folder.

## Tests

`node --test test/` — host functions against a simulated Premiere, the motion engine,
templates, captions, edit maths, audio and rendering (ffmpeg needed for the last one).
