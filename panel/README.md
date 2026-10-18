# PostKit panel for Premiere Pro

A CEP panel for Premiere Pro 2022 and newer (Windows and Mac). Version 0.1 has:

| Tool | What it does | Where it runs |
| --- | --- | --- |
| Sign-in | Email code; licence token checked offline, refreshed daily | postkitlb.com API |
| Smart cut | Finds pauses with ffmpeg and ripple-deletes them on a copy of the sequence | Local |
| Transcription | Word-timed transcript of the speech track | Server (Groq Whisper) |
| Captions | 1–3 word captions as an SRT on a new caption track | Local |
| Auto zoom | Scale keyframes on the camera track, one change per sentence | Local |

Caption styles (.mogrt templates) and safe-zone overlays come next.

## Install (testing)

- **Mac:** double-click `install/install-mac.command`. If macOS blocks it, right-click → Open.
- **Windows:** double-click `install/install-win.bat`.

The installer copies the panel to Premiere's extensions folder, turns on loading of
unsigned panels (`PlayerDebugMode`), and downloads ffmpeg into the panel's `bin` folder.
Then restart Premiere and open **Window → Extensions → PostKit**.

To see the panel's console while developing, open `http://localhost:8088` in Chrome
(enabled by `.debug`).

## How it's built

- `index.html`, `css/`, `js/main.js` — the interface (runs in Premiere's browser with Node enabled).
- `js/lib/` — plain Node modules: licence, ffmpeg, silence, audio, captions, zoom.
- `jsx/host.jsx` — ExtendScript (ES3) that edits the timeline. Every function returns JSON.
- `test/` — `node --test panel/test/*.test.js`. `host.test.js` runs the real host script
  against a simulated timeline, including the linked-clip sync case.

### Smart cut safety

Ripple-deleting **linked** audio/video in Premiere slips the audio's source in-point.
`pk_cut` therefore unlinks the speech and camera tracks, cuts from the last pause to
the first, skips any pause where one track has a gap, then relinks each matching pair.
It always works on a duplicate of the sequence.

## Before selling

- **Sign the panel as a ZXP** (Adobe's `ZXPSignCmd`) so customers don't need debug mode.
- **ffmpeg licence:** the downloaded builds are third-party. For distribution, ship an
  LGPL build with its licence notice, or keep downloading it at install time.
- Plan the UXP port: Adobe will retire CEP in a future Premiere release.
