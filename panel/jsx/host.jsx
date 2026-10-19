/* PostKit — Premiere Pro host script (ExtendScript, ES3).
 * Every public function returns a JSON string: {"ok":true,...} or {"ok":false,"error":"..."}.
 * Times crossing the bridge are plain seconds.
 */

// ── tiny JSON (ExtendScript has none) ───────────────────────
function pk_json(v) {
  if (v === null || v === undefined) return "null";
  var t = typeof v;
  if (t === "number") return isFinite(v) ? String(v) : "null";
  if (t === "boolean") return v ? "true" : "false";
  if (t === "string") {
    return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';
  }
  if (v instanceof Array) {
    var a = [];
    for (var i = 0; i < v.length; i++) a.push(pk_json(v[i]));
    return "[" + a.join(",") + "]";
  }
  var o = [];
  for (var k in v) if (v.hasOwnProperty(k)) o.push(pk_json(k) + ":" + pk_json(v[k]));
  return "{" + o.join(",") + "}";
}
function pk_ok(data) {
  var r = { ok: true };
  for (var k in data) if (data.hasOwnProperty(k)) r[k] = data[k];
  return pk_json(r);
}
function pk_err(msg) {
  return pk_json({ ok: false, error: String(msg) });
}
function pk_parse(s) {
  // Input comes only from our own panel code.
  return eval("(" + s + ")");
}

// ── helpers ─────────────────────────────────────────────────
function pk_seq() {
  var seq = app.project.activeSequence;
  if (!seq) throw "Open a sequence first.";
  return seq;
}
function pk_fps(seq) {
  var s = seq.getSettings();
  return 1 / s.videoFrameRate.seconds;
}
function pk_time(seconds) {
  var t = new Time();
  t.seconds = seconds;
  return t;
}
function pk_track(seq, type, index) {
  var list = type === "video" ? seq.videoTracks : seq.audioTracks;
  if (index < 0 || index >= list.numTracks) throw "That track doesn't exist in this sequence.";
  return list[index];
}
function pk_clipsOf(track) {
  var out = [];
  for (var i = 0; i < track.clips.numItems; i++) out.push(track.clips[i]);
  return out;
}

// ── read ────────────────────────────────────────────────────
function pk_info() {
  try {
    var seq = pk_seq();
    var s = seq.getSettings();
    var tracks = { video: [], audio: [] };
    var i;
    for (i = 0; i < seq.videoTracks.numTracks; i++) tracks.video.push({ index: i, name: seq.videoTracks[i].name, clips: seq.videoTracks[i].clips.numItems });
    for (i = 0; i < seq.audioTracks.numTracks; i++) tracks.audio.push({ index: i, name: seq.audioTracks[i].name, clips: seq.audioTracks[i].clips.numItems });
    return pk_ok({
      name: seq.name,
      id: seq.sequenceID,
      fps: pk_fps(seq),
      width: s.videoFrameWidth,
      height: s.videoFrameHeight,
      duration: seq.end ? Number(seq.end) / 254016000000 : 0,
      tracks: tracks,
      appVersion: app.version
    });
  } catch (e) {
    return pk_err(e);
  }
}

/** Clips on one track, with the source file and the part of it that's used. */
function pk_clips(type, index) {
  try {
    var seq = pk_seq();
    var clips = pk_clipsOf(pk_track(seq, type, index));
    var out = [];
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      if (!c.projectItem) continue;
      var media = c.projectItem.getMediaPath ? c.projectItem.getMediaPath() : "";
      if (!media) continue;
      out.push({
        name: c.name,
        mediaPath: media,
        start: c.start.seconds,
        end: c.end.seconds,
        inPoint: c.inPoint.seconds,
        outPoint: c.outPoint.seconds
      });
    }
    return pk_ok({ clips: out });
  } catch (e) {
    return pk_err(e);
  }
}

// ── duplicate: never edit the original ─────────────────────
function pk_duplicate(suffix) {
  try {
    var seq = pk_seq();
    var before = app.project.sequences.numSequences;
    var originalName = seq.name;
    seq.clone();
    if (app.project.sequences.numSequences <= before) throw "Premiere couldn't duplicate the sequence.";
    var copy = app.project.sequences[app.project.sequences.numSequences - 1];
    copy.name = originalName + " " + (suffix || "PostKit");
    app.project.openSequence(copy.sequenceID);
    return pk_ok({ name: copy.name, original: originalName });
  } catch (e) {
    return pk_err(e);
  }
}

// ── link state ─────────────────────────────────────────────
function pk_selectOnly(items) {
  var seq = pk_seq();
  var sel = seq.getSelection();
  for (var i = 0; i < sel.length; i++) sel[i].setSelected(false, true);
  for (var j = 0; j < items.length; j++) items[j].setSelected(true, true);
}

function pk_unlinkTracks(seq, vIndex, aIndex) {
  var items = pk_clipsOf(pk_track(seq, "audio", aIndex));
  if (vIndex >= 0) items = items.concat(pk_clipsOf(pk_track(seq, "video", vIndex)));
  if (!items.length) return;
  pk_selectOnly(items);
  seq.unlinkSelection();
  pk_selectOnly([]);
}

/** Re-links each video piece with the audio piece that has the same start and end. */
function pk_relinkPairs(seq, vIndex, aIndex, halfFrame) {
  if (vIndex < 0) return 0;
  var v = pk_clipsOf(pk_track(seq, "video", vIndex));
  var a = pk_clipsOf(pk_track(seq, "audio", aIndex));
  var linked = 0;
  for (var i = 0; i < v.length; i++) {
    for (var j = 0; j < a.length; j++) {
      if (Math.abs(v[i].start.seconds - a[j].start.seconds) < halfFrame && Math.abs(v[i].end.seconds - a[j].end.seconds) < halfFrame) {
        pk_selectOnly([v[i], a[j]]);
        seq.linkSelection();
        linked++;
        break;
      }
    }
  }
  pk_selectOnly([]);
  return linked;
}

// ── smart cut ──────────────────────────────────────────────
function pk_covers(track, s, e, halfFrame) {
  var clips = pk_clipsOf(track);
  for (var i = 0; i < clips.length; i++) {
    if (clips[i].start.seconds <= s + halfFrame && clips[i].end.seconds >= e - halfFrame) return true;
  }
  return false;
}

function pk_removeExact(track, s, e, halfFrame) {
  var clips = pk_clipsOf(track);
  for (var i = clips.length - 1; i >= 0; i--) {
    var c = clips[i];
    if (Math.abs(c.start.seconds - s) < halfFrame && Math.abs(c.end.seconds - e) < halfFrame) {
      c.remove(true, true); // ripple
      return true;
    }
  }
  return false;
}

/**
 * Ripple-deletes each range from the speech audio track and its camera video track.
 * rangesJson: [{start,end}] in seconds. vIndex = -1 for audio-only.
 */
function pk_cut(rangesJson, aIndex, vIndex) {
  try {
    var seq = pk_seq();
    var ranges = pk_parse(rangesJson);
    var settings = seq.getSettings();
    var fps = pk_fps(seq);
    var halfFrame = 0.5 / fps;
    app.enableQE();
    var qeSeq = qe.project.getActiveSequence();
    var aTrack = pk_track(seq, "audio", aIndex);
    var vTrack = vIndex >= 0 ? pk_track(seq, "video", vIndex) : null;

    // Linked A/V pairs desync under ripple delete, so unlink first and relink after.
    pk_unlinkTracks(seq, vIndex, aIndex);

    ranges.sort(function (x, y) { return y.start - x.start; }); // last to first: earlier times never move
    var done = 0, skipped = 0, removedSeconds = 0, applied = [];

    for (var i = 0; i < ranges.length; i++) {
      var s = ranges[i].start, e = ranges[i].end;
      if (e - s < 1 / fps) continue;
      if (!pk_covers(aTrack, s, e, halfFrame) || (vTrack && !pk_covers(vTrack, s, e, halfFrame))) {
        skipped++; // a gap on one track would knock the two out of sync
        continue;
      }
      var tcS = pk_time(s).getFormatted(settings.videoFrameRate, settings.videoDisplayFormat);
      var tcE = pk_time(e).getFormatted(settings.videoFrameRate, settings.videoDisplayFormat);
      qeSeq.getAudioTrackAt(aIndex).razor(tcE);
      qeSeq.getAudioTrackAt(aIndex).razor(tcS);
      if (vTrack) {
        qeSeq.getVideoTrackAt(vIndex).razor(tcE);
        qeSeq.getVideoTrackAt(vIndex).razor(tcS);
      }
      var okA = pk_removeExact(aTrack, s, e, halfFrame);
      var okV = vTrack ? pk_removeExact(vTrack, s, e, halfFrame) : true;
      if (okA && okV) {
        done++;
        removedSeconds += e - s;
        applied.push({ start: s, end: e });
      } else {
        skipped++;
      }
    }

    var relinked = pk_relinkPairs(seq, vIndex, aIndex, halfFrame);
    return pk_ok({ cuts: done, skipped: skipped, removedSeconds: removedSeconds, relinked: relinked, applied: applied });
  } catch (e) {
    return pk_err(e);
  }
}

// ── captions ───────────────────────────────────────────────
function pk_findItemByPath(bin, filePath) {
  for (var i = bin.children.numItems - 1; i >= 0; i--) {
    var item = bin.children[i];
    if (item.type === ProjectItemType.BIN) {
      var inner = pk_findItemByPath(item, filePath);
      if (inner) return inner;
    } else if (item.getMediaPath && item.getMediaPath() === filePath) {
      return item;
    }
  }
  return null;
}

/** Imports an SRT and places it on a new caption track at the start of the sequence. */
function pk_captions(srtPath) {
  try {
    var seq = pk_seq();
    var ok = app.project.importFiles([srtPath], true, app.project.getInsertionBin(), false);
    if (!ok) throw "Premiere couldn't import the captions file.";
    var item = pk_findItemByPath(app.project.rootItem, srtPath);
    if (!item) throw "The captions were imported but couldn't be found in the project.";
    if (typeof seq.createCaptionTrack !== "function") {
      return pk_ok({ placed: false, message: "Captions imported to the project. Drag them onto the timeline (this Premiere version can't place them automatically)." });
    }
    var format = typeof Sequence !== "undefined" && Sequence.CAPTION_FORMAT_SUBTITLE !== undefined ? Sequence.CAPTION_FORMAT_SUBTITLE : undefined;
    if (format !== undefined) seq.createCaptionTrack(item, 0, format);
    else seq.createCaptionTrack(item, 0);
    return pk_ok({ placed: true });
  } catch (e) {
    return pk_err(e);
  }
}

// ── auto zoom ──────────────────────────────────────────────
function pk_scaleParam(clip) {
  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    if (comp.matchName === "AE.ADBE Motion" || comp.displayName === "Motion") {
      for (var j = 0; j < comp.properties.numItems; j++) {
        var p = comp.properties[j];
        if (p.displayName === "Scale") return p;
      }
      return comp.properties.numItems > 1 ? comp.properties[1] : null; // Scale is the second Motion property
    }
  }
  return null;
}

/**
 * keysJson: [{time,value}] in sequence seconds, sorted. Writes them as Scale keyframes
 * on each clip of the video track they fall in. Keyframe times are in the clip's media time.
 */
function pk_zoom(keysJson, vIndex) {
  try {
    var seq = pk_seq();
    var keys = pk_parse(keysJson);
    var clips = pk_clipsOf(pk_track(seq, "video", vIndex));
    var written = 0, touched = 0;

    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      var cs = c.start.seconds, ce = c.end.seconds;
      var inside = [];
      var before = null;
      for (var k = 0; k < keys.length; k++) {
        if (keys[k].time < cs) before = keys[k];
        else if (keys[k].time < ce) inside.push(keys[k]);
      }
      if (!inside.length && !before) continue;
      var scale = pk_scaleParam(c);
      if (!scale) continue;
      scale.setTimeVarying(true);
      var media = function (t) { return c.inPoint.seconds + (t - cs); };
      // Hold the value the clip should start with, so each clip stands on its own.
      var startValue = before ? before.value : inside[0].value;
      scale.addKey(media(cs));
      scale.setValueAtKey(media(cs), startValue, true);
      written++;
      for (var n = 0; n < inside.length; n++) {
        scale.addKey(media(inside[n].time));
        scale.setValueAtKey(media(inside[n].time), inside[n].value, true);
        written++;
      }
      touched++;
    }
    return pk_ok({ keys: written, clips: touched });
  } catch (e) {
    return pk_err(e);
  }
}

/** Removes all Scale keyframes PostKit (or anyone) set on the track and resets Scale to 100. */
function pk_zoomClear(vIndex) {
  try {
    var seq = pk_seq();
    var clips = pk_clipsOf(pk_track(seq, "video", vIndex));
    for (var i = 0; i < clips.length; i++) {
      var p = pk_scaleParam(clips[i]);
      if (!p) continue;
      p.setTimeVarying(false);
      p.setValue(100, true);
    }
    return pk_ok({ clips: clips.length });
  } catch (e) {
    return pk_err(e);
  }
}

function pk_ping() {
  return pk_ok({ version: app.version });
}

// ── markers & playhead ─────────────────────────────────────
var PK_TICKS = 254016000000;

/** markersJson: [{time, name, comment, color}] — color is Premiere's 0–7 marker colour index. */
function pk_markers(markersJson) {
  try {
    var seq = pk_seq();
    var list = pk_parse(markersJson);
    for (var i = 0; i < list.length; i++) {
      var m = seq.markers.createMarker(list[i].time);
      if (list[i].name) m.name = list[i].name;
      if (list[i].comment) m.comments = list[i].comment;
      if (list[i].color !== undefined && typeof m.setColorByIndex === "function") m.setColorByIndex(list[i].color);
    }
    return pk_ok({ added: list.length });
  } catch (e) {
    return pk_err(e);
  }
}

function pk_seek(seconds) {
  try {
    pk_seq().setPlayerPosition(String(Math.round(seconds * PK_TICKS)));
    return pk_ok({});
  } catch (e) {
    return pk_err(e);
  }
}

// ── project cleanup ────────────────────────────────────────
function pk_walk(bin, binPath, out) {
  for (var i = 0; i < bin.children.numItems; i++) {
    var item = bin.children[i];
    if (item.type === ProjectItemType.BIN) {
      pk_walk(item, binPath ? binPath + "/" + item.name : item.name, out);
    } else {
      var media = "";
      try { media = item.getMediaPath ? item.getMediaPath() : ""; } catch (e) { media = ""; }
      out.push({
        nodeId: item.nodeId,
        name: item.name,
        path: media || "",
        isSequence: typeof item.isSequence === "function" ? item.isSequence() : false,
        bin: binPath,
        ref: item
      });
    }
  }
  return out;
}

function pk_projectItems() {
  try {
    var all = pk_walk(app.project.rootItem, "", []);
    for (var i = 0; i < all.length; i++) delete all[i].ref;
    return pk_ok({ items: all });
  } catch (e) {
    return pk_err(e);
  }
}

/** movesJson: [{nodeId, to}] — moves each item into a top-level bin, creating bins as needed. */
function pk_cleanup(movesJson) {
  try {
    var moves = pk_parse(movesJson);
    var root = app.project.rootItem;
    var bins = {};
    for (var b = 0; b < root.children.numItems; b++) {
      if (root.children[b].type === ProjectItemType.BIN) bins[root.children[b].name] = root.children[b];
    }
    var byId = {};
    var all = pk_walk(root, "", []);
    for (var i = 0; i < all.length; i++) byId[all[i].nodeId] = all[i].ref;
    var moved = 0;
    for (var m = 0; m < moves.length; m++) {
      var item = byId[moves[m].nodeId];
      if (!item) continue;
      if (!bins[moves[m].to]) bins[moves[m].to] = root.createBin(moves[m].to);
      item.moveBin(bins[moves[m].to]);
      moved++;
    }
    return pk_ok({ moved: moved });
  } catch (e) {
    return pk_err(e);
  }
}

// ── motion presets on selected clips ───────────────────────
function pk_selectedVideo(seq) {
  var sel = seq.getSelection();
  var out = [];
  for (var i = 0; i < sel.length; i++) if (sel[i].mediaType === "Video") out.push(sel[i]);
  out.sort(function (a, b) { return a.start.seconds - b.start.seconds; });
  return out;
}

function pk_selectedClips() {
  try {
    var clips = pk_selectedVideo(pk_seq());
    var out = [];
    for (var i = 0; i < clips.length; i++) out.push({ name: clips[i].name, start: clips[i].start.seconds, end: clips[i].end.seconds });
    return pk_ok({ clips: out });
  } catch (e) {
    return pk_err(e);
  }
}

function pk_param(clip, matchName, displayName, index) {
  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    if (comp.matchName === matchName) {
      for (var j = 0; j < comp.properties.numItems; j++) {
        if (comp.properties[j].displayName === displayName) return comp.properties[j];
      }
      return comp.properties.numItems > index ? comp.properties[index] : null;
    }
  }
  return null;
}

/**
 * plansJson: one plan per selected video clip (same order as pk_selectedClips):
 * {scale:[{time,value}], position:[{time,value:[x,y]}], rotation:[...], opacity:[...]} in sequence seconds.
 */
function pk_applyKeys(plansJson) {
  try {
    var seq = pk_seq();
    var plans = pk_parse(plansJson);
    var clips = pk_selectedVideo(seq);
    var map = {
      scale: ["AE.ADBE Motion", "Scale", 1],
      position: ["AE.ADBE Motion", "Position", 0],
      rotation: ["AE.ADBE Motion", "Rotation", 4],
      opacity: ["AE.ADBE Opacity", "Opacity", 0]
    };
    var written = 0;
    for (var c = 0; c < clips.length && c < plans.length; c++) {
      var clip = clips[c];
      for (var key in plans[c]) {
        if (!plans[c].hasOwnProperty(key) || !map[key]) continue;
        var p = pk_param(clip, map[key][0], map[key][1], map[key][2]);
        if (!p) continue;
        p.setTimeVarying(true);
        var keys = plans[c][key];
        for (var k = 0; k < keys.length; k++) {
          var t = clip.inPoint.seconds + (keys[k].time - clip.start.seconds);
          p.addKey(t);
          p.setValueAtKey(t, keys[k].value, true);
          written++;
        }
      }
    }
    return pk_ok({ keys: written, clips: Math.min(clips.length, plans.length) });
  } catch (e) {
    return pk_err(e);
  }
}

// ── library: drop a file at the playhead ───────────────────
function pk_insertFile(filePath, type, index) {
  try {
    var seq = pk_seq();
    var item = pk_findItemByPath(app.project.rootItem, filePath);
    if (!item) {
      if (!app.project.importFiles([filePath], true, app.project.getInsertionBin(), false)) throw "Premiere couldn't import that file.";
      item = pk_findItemByPath(app.project.rootItem, filePath);
      if (!item) throw "The file was imported but couldn't be found in the project.";
    }
    var track = pk_track(seq, type, index);
    var at = seq.getPlayerPosition();
    try {
      track.overwriteClip(item, at);
    } catch (e1) {
      track.overwriteClip(item, at.seconds);
    }
    return pk_ok({ name: item.name, at: at.seconds });
  } catch (e) {
    return pk_err(e);
  }
}

// ── safe zones: grab the frame under the playhead ──────────
function pk_exportFrame(filePath, seconds) {
  try {
    var seq = pk_seq();
    app.enableQE();
    var qs = qe.project.getActiveSequence();
    var tc = qs.CTI.timecode;
    if (seconds !== undefined && seconds !== null && seconds >= 0) {
      var st = seq.getSettings();
      tc = pk_time(seconds).getFormatted(st.videoFrameRate, st.videoDisplayFormat);
    }
    qs.exportFramePNG(tc, filePath);
    var f = new File(filePath);
    var g = new File(filePath + ".png");
    return pk_ok({ path: f.exists ? filePath : g.exists ? filePath + ".png" : filePath });
  } catch (e) {
    return pk_err(e);
  }
}

// ════════════════════════════════════════════════════════════
// 1.0 — placing graphics, sounds and files; colour; hook; audio;
// multicam; curves; tracking.
// ════════════════════════════════════════════════════════════

/** The PostKit bin (and a sub-bin inside it), created when missing. */
function pk_bin(name) {
  var root = app.project.rootItem;
  var top = null, i;
  for (i = 0; i < root.children.numItems; i++) {
    if (root.children[i].type === ProjectItemType.BIN && root.children[i].name === "PostKit") top = root.children[i];
  }
  if (!top) top = root.createBin("PostKit");
  if (!name) return top;
  for (i = 0; i < top.children.numItems; i++) {
    if (top.children[i].type === ProjectItemType.BIN && top.children[i].name === name) return top.children[i];
  }
  return top.createBin(name);
}

function pk_import(filePath, binName) {
  var item = pk_findItemByPath(app.project.rootItem, filePath);
  if (item) return item;
  var b = pk_bin(binName);
  if (!app.project.importFiles([filePath], true, b, false)) throw "Premiere couldn't import " + filePath;
  item = pk_findItemByPath(b, filePath) || pk_findItemByPath(app.project.rootItem, filePath);
  if (!item) throw "The file was imported but couldn't be found in the project.";
  return item;
}

function pk_overlaps(track, s, e) {
  var clips = pk_clipsOf(track);
  for (var i = 0; i < clips.length; i++) {
    if (clips[i].start.seconds < e - 0.001 && clips[i].end.seconds > s + 0.001) return true;
  }
  return false;
}

function pk_addTrack(type) {
  var seq = pk_seq();
  var nv = seq.videoTracks.numTracks, na = seq.audioTracks.numTracks;
  app.enableQE();
  var q = qe.project.getActiveSequence();
  try {
    if (type === "video") q.addTracks(1, nv, 0);
    else q.addTracks(0, nv, 1, 1, na);
  } catch (e) { /* checked below */ }
  seq = pk_seq();
  var after = type === "video" ? seq.videoTracks.numTracks : seq.audioTracks.numTracks;
  if (after <= (type === "video" ? nv : na)) throw "Premiere couldn't add a track. Add an empty " + type + " track and try again.";
  return after - 1;
}

/**
 * A track that is free between s and e. Video goes above every track that is busy there
 * (graphics must sit on top); audio takes the first free track from `from` upwards.
 */
function pk_freeTrack(type, s, e, from) {
  var seq = pk_seq();
  var list = type === "video" ? seq.videoTracks : seq.audioTracks;
  var i;
  if (type === "video") {
    var top = -1;
    for (i = 0; i < list.numTracks; i++) if (pk_overlaps(list[i], s, e)) top = i;
    var want = Math.max(from || 0, top + 1);
    if (want < list.numTracks) return want;
    return pk_addTrack("video");
  }
  for (i = from || 0; i < list.numTracks; i++) if (!pk_overlaps(list[i], s, e)) return i;
  return pk_addTrack("audio");
}

function pk_clipAt(track, s) {
  var clips = pk_clipsOf(track);
  for (var i = 0; i < clips.length; i++) if (Math.abs(clips[i].start.seconds - s) < 0.02) return clips[i];
  return null;
}

/** Audio level in dB → the value Premiere stores (linear, with 15 dB of headroom). */
function pk_dbToLevel(db) {
  return Math.pow(10, (db - 15) / 20);
}

function pk_levelParam(clip) {
  for (var i = 0; i < clip.components.numItems; i++) {
    var comp = clip.components[i];
    if (comp.displayName === "Volume" || comp.matchName === "Audio Levels" || comp.matchName === "AE.ADBE Audio Levels") {
      for (var j = 0; j < comp.properties.numItems; j++) if (comp.properties[j].displayName === "Level") return comp.properties[j];
      if (comp.properties.numItems > 1) return comp.properties[1];
    }
  }
  return null;
}

/**
 * Places files on the timeline in one go.
 * itemsJson: [{path, start, dur, type: "video"|"audio", bin, gainDb, from, track}]
 * Without `track`, a free track is chosen (see pk_freeTrack).
 */
function pk_place(itemsJson) {
  try {
    var items = pk_parse(itemsJson);
    var placed = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var item = pk_import(it.path, it.bin || (it.type === "audio" ? "Sounds" : "Graphics"));
      var dur = it.dur || 1;
      var index = it.track !== undefined && it.track !== null && it.track >= 0 ? it.track : pk_freeTrack(it.type, it.start, it.start + dur, it.from || 0);
      var seq = pk_seq();
      var track = pk_track(seq, it.type, index);
      // Use only part of the file (b-roll): set the source in/out first, clear it after.
      var trimmed = it.srcOut !== undefined && it.srcOut !== null && typeof item.setInPoint === "function";
      if (trimmed) {
        item.setInPoint(it.srcIn || 0, 4);
        item.setOutPoint(it.srcOut, 4);
      }
      try {
        track.overwriteClip(item, pk_time(it.start));
      } catch (e1) {
        track.overwriteClip(item, it.start);
      }
      if (trimmed && typeof item.clearInPoint === "function") { item.clearInPoint(); item.clearOutPoint(); }
      if (it.type === "audio" && it.gainDb !== undefined && it.gainDb !== null) {
        var c = pk_clipAt(track, it.start);
        var p = c ? pk_levelParam(c) : null;
        if (p) p.setValue(pk_dbToLevel(it.gainDb), true);
      }
      placed.push({ track: index, start: it.start });
    }
    return pk_ok({ placed: placed });
  } catch (e) {
    return pk_err(e);
  }
}

// ── colour: Lumetri looks ──────────────────────────────────
function pk_component(clip, displayName) {
  for (var i = 0; i < clip.components.numItems; i++) if (clip.components[i].displayName === displayName) return clip.components[i];
  return null;
}

/**
 * Applies a look to every clip on a video track: adds Lumetri Color where it's missing
 * and sets its Basic and Creative values. lookJson: {Exposure: 0.2, Contrast: 15, …}
 */
function pk_look(lookJson, vIndex) {
  try {
    var look = pk_parse(lookJson);
    var seq = pk_seq();
    var clips = pk_clipsOf(pk_track(seq, "video", vIndex));
    if (!clips.length) throw "The camera track has no clips.";
    app.enableQE();
    var qt = qe.project.getActiveSequence().getVideoTrackAt(vIndex);
    var fx = qe.project.getVideoEffectByName("Lumetri Color");
    if (!fx) throw "Lumetri Color isn't available in this Premiere version.";
    // QE lists gaps as items too; real clips come in the same order as the DOM's.
    var real = [];
    for (var q = 0; q < qt.numItems; q++) {
      var qi = qt.getItemAt(q);
      if (qi && qi.type !== "Empty" && qi.name !== "") real.push(qi);
    }
    var set = 0;
    for (var i = 0; i < clips.length; i++) {
      var comp = pk_component(clips[i], "Lumetri Color");
      if (!comp && real[i]) {
        real[i].addVideoEffect(fx);
        comp = pk_component(clips[i], "Lumetri Color");
      }
      if (!comp) continue;
      var done = {};
      for (var j = 0; j < comp.properties.numItems; j++) {
        var prop = comp.properties[j];
        var name = prop.displayName;
        // Several sections reuse names (Saturation); the first one is Basic Correction.
        if (look.hasOwnProperty(name) && !done[name]) {
          try { prop.setValue(look[name], true); set++; } catch (e2) { /* read-only */ }
          done[name] = true;
        }
      }
    }
    return pk_ok({ clips: clips.length, values: set });
  } catch (e) {
    return pk_err(e);
  }
}

// ── hook: copy a strong line to the very start ─────────────
function pk_pieceAt(track, t) {
  var clips = pk_clipsOf(track);
  for (var i = 0; i < clips.length; i++) if (clips[i].start.seconds <= t + 0.001 && clips[i].end.seconds > t + 0.001) return clips[i];
  return null;
}

/**
 * Inserts a copy of [s, e) at 0:00, pushing everything later (an insert edit, so linked
 * tracks stay in sync). Copies only the clip under s, up to its end.
 */
function pk_hook(s, e, aIndex, vIndex) {
  try {
    var seq = pk_seq();
    var vt = vIndex >= 0 ? pk_track(seq, "video", vIndex) : null;
    var at = pk_track(seq, "audio", aIndex);
    var vClip = vt ? pk_pieceAt(vt, s) : null;
    var aClip = pk_pieceAt(at, s);
    var lead = vClip || aClip;
    if (!lead || !lead.projectItem) throw "There's no clip at the hook's start.";
    var end = Math.min(e, lead.end.seconds);
    var dur = end - s;
    if (dur < 0.3) throw "The hook is too short.";

    var pi = lead.projectItem;
    var srcIn = lead.inPoint.seconds + (s - lead.start.seconds);
    pi.setInPoint(srcIn, 4);
    pi.setOutPoint(srcIn + dur, 4);
    try {
      seq.insertClip(pi, pk_time(0), vIndex >= 0 ? vIndex : 0, aIndex);
    } catch (e1) {
      seq.insertClip(pi, 0, vIndex >= 0 ? vIndex : 0, aIndex);
    }
    if (typeof pi.clearInPoint === "function") { pi.clearInPoint(); pi.clearOutPoint(); }

    // Separate microphone audio: lay the matching speech over the camera's own sound.
    if (vClip && aClip && aClip.projectItem && aClip.projectItem.nodeId !== pi.nodeId) {
      var ai = aClip.projectItem;
      var aIn = aClip.inPoint.seconds + (s - aClip.start.seconds);
      ai.setInPoint(aIn, 4);
      ai.setOutPoint(aIn + dur, 4);
      var aTrack = pk_track(pk_seq(), "audio", aIndex);
      try { aTrack.overwriteClip(ai, pk_time(0)); } catch (e2) { aTrack.overwriteClip(ai, 0); }
      if (typeof ai.clearInPoint === "function") { ai.clearInPoint(); ai.clearOutPoint(); }
    }
    return pk_ok({ seconds: dur });
  } catch (e) {
    return pk_err(e);
  }
}

// ── audio ──────────────────────────────────────────────────
/** keysJson: [{time, db}] in sequence seconds → Level keyframes on every clip of the track. */
function pk_volumeKeys(aIndex, keysJson) {
  try {
    var keys = pk_parse(keysJson);
    var clips = pk_clipsOf(pk_track(pk_seq(), "audio", aIndex));
    var written = 0;
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      var p = pk_levelParam(c);
      if (!p) continue;
      p.setTimeVarying(true);
      for (var k = 0; k < keys.length; k++) {
        if (keys[k].time < c.start.seconds || keys[k].time >= c.end.seconds) continue;
        var t = c.inPoint.seconds + (keys[k].time - c.start.seconds);
        p.addKey(t);
        p.setValueAtKey(t, pk_dbToLevel(keys[k].db), true);
        written++;
      }
    }
    return pk_ok({ keys: written });
  } catch (e) {
    return pk_err(e);
  }
}

function pk_mute(aIndex, on) {
  try {
    var tr = pk_track(pk_seq(), "audio", aIndex);
    if (typeof tr.setMute === "function") tr.setMute(on ? 1 : 0);
    return pk_ok({});
  } catch (e) {
    return pk_err(e);
  }
}

/** Short crossfades on every cut of the speech track (QE; best effort). */
function pk_crossfades(aIndex, frames) {
  try {
    var seq = pk_seq();
    var st = seq.getSettings();
    app.enableQE();
    var qt = qe.project.getActiveSequence().getAudioTrackAt(aIndex);
    var tr = qe.project.getAudioTransitionByName("Constant Power");
    if (!tr) throw "Premiere's Constant Power crossfade isn't available.";
    var dur = pk_time(frames / pk_fps(seq)).getFormatted(st.videoFrameRate, st.videoDisplayFormat);
    var added = 0;
    for (var i = 0; i < qt.numItems; i++) {
      var qi = qt.getItemAt(i);
      if (!qi || qi.type === "Empty") continue;
      try { qi.addTransition(tr, false, dur); added++; } catch (e1) { /* edge of the track */ }
    }
    return pk_ok({ added: added });
  } catch (e) {
    return pk_err(e);
  }
}

// ── multicam: show one camera at a time ────────────────────
/**
 * vTracksJson: camera track indexes, bottom to top. planJson: [{start, end, cam}] where
 * cam indexes vTracks. Cuts every camera track at each switch and disables the pieces
 * of the cameras above the one that should show.
 */
function pk_multicam(vTracksJson, planJson) {
  try {
    var seq = pk_seq();
    var cams = pk_parse(vTracksJson);
    var plan = pk_parse(planJson);
    var st = seq.getSettings();
    app.enableQE();
    var q = qe.project.getActiveSequence();
    var i, k;
    for (i = 1; i < plan.length; i++) {
      var tc = pk_time(plan[i].start).getFormatted(st.videoFrameRate, st.videoDisplayFormat);
      for (k = 0; k < cams.length; k++) q.getVideoTrackAt(cams[k]).razor(tc);
    }
    var switched = 0;
    for (k = 0; k < cams.length; k++) {
      var clips = pk_clipsOf(pk_track(pk_seq(), "video", cams[k]));
      for (i = 0; i < clips.length; i++) {
        var mid = (clips[i].start.seconds + clips[i].end.seconds) / 2;
        var cam = 0;
        for (var p = 0; p < plan.length; p++) if (mid >= plan[p].start && mid < plan[p].end) cam = plan[p].cam;
        var off = k > cam;
        if (clips[i].disabled !== off) { clips[i].disabled = off; switched++; }
      }
    }
    return pk_ok({ switches: plan.length - 1, pieces: switched });
  } catch (e) {
    return pk_err(e);
  }
}

// ── keyframes on the selected clip: curves and tracking ────
var PK_PARAMS = {
  scale: ["AE.ADBE Motion", "Scale", 1],
  position: ["AE.ADBE Motion", "Position", 0],
  rotation: ["AE.ADBE Motion", "Rotation", 4],
  opacity: ["AE.ADBE Opacity", "Opacity", 0]
};

/** Keyframes of the first selected video clip, in sequence seconds. */
function pk_selectedKeys() {
  try {
    var clips = pk_selectedVideo(pk_seq());
    if (!clips.length) throw "Select a clip with keyframes on the timeline.";
    var c = clips[0];
    var out = {};
    for (var name in PK_PARAMS) {
      if (!PK_PARAMS.hasOwnProperty(name)) continue;
      var p = pk_param(c, PK_PARAMS[name][0], PK_PARAMS[name][1], PK_PARAMS[name][2]);
      if (!p || !p.isTimeVarying || !p.isTimeVarying()) continue;
      var times = p.getKeys() || [];
      var keys = [];
      for (var k = 0; k < times.length; k++) {
        var tm = times[k].seconds !== undefined ? times[k].seconds : times[k];
        keys.push({ time: c.start.seconds + (tm - c.inPoint.seconds), value: p.getValueAtKey(times[k]) });
      }
      if (keys.length > 1) out[name] = keys;
    }
    var values = {};
    var pos = pk_param(c, "AE.ADBE Motion", "Position", 0);
    if (pos) { try { values.position = pos.getValue(); } catch (e1) { /* keyed */ } }
    var sc = pk_param(c, "AE.ADBE Motion", "Scale", 1);
    if (sc) { try { values.scale = sc.getValue(); } catch (e2) { /* keyed */ } }
    return pk_ok({ clip: { name: c.name, start: c.start.seconds, end: c.end.seconds }, params: out, values: values });
  } catch (e) {
    return pk_err(e);
  }
}

/**
 * Replaces one parameter's keyframes on the first selected video clip.
 * keysJson: [{time, value}] in sequence seconds (dense keys baked from a curve, or tracking data).
 */
function pk_setKeys(param, keysJson) {
  try {
    var keys = pk_parse(keysJson);
    var clips = pk_selectedVideo(pk_seq());
    if (!clips.length) throw "Select the clip on the timeline first.";
    var c = clips[0];
    var spec = PK_PARAMS[param];
    if (!spec) throw "Unknown parameter.";
    var p = pk_param(c, spec[0], spec[1], spec[2]);
    if (!p) throw "That clip has no " + spec[1] + " parameter.";
    var media = function (t) { return c.inPoint.seconds + (t - c.start.seconds); };
    if (p.isTimeVarying && p.isTimeVarying() && keys.length && typeof p.removeKeyRange === "function") {
      p.removeKeyRange(media(keys[0].time) - 0.001, media(keys[keys.length - 1].time) + 0.001, true);
    }
    p.setTimeVarying(true);
    for (var k = 0; k < keys.length; k++) {
      p.addKey(media(keys[k].time));
      p.setValueAtKey(media(keys[k].time), keys[k].value, k === keys.length - 1);
    }
    return pk_ok({ keys: keys.length });
  } catch (e) {
    return pk_err(e);
  }
}

function pk_playhead() {
  try {
    return pk_ok({ seconds: pk_seq().getPlayerPosition().seconds });
  } catch (e) {
    return pk_err(e);
  }
}

/**
 * Motion presets on the clips of a track at given times (the AI editor's "moves").
 * itemsJson: [{time, keys: {scale|position|rotation|opacity: [{time, value}]}}], times in sequence seconds.
 */
function pk_keysAt(vIndex, itemsJson) {
  try {
    var items = pk_parse(itemsJson);
    var track = pk_track(pk_seq(), "video", vIndex);
    var written = 0;
    for (var i = 0; i < items.length; i++) {
      var clip = pk_pieceAt(track, items[i].time);
      if (!clip) continue;
      for (var key in items[i].keys) {
        if (!items[i].keys.hasOwnProperty(key) || !PK_PARAMS[key]) continue;
        var p = pk_param(clip, PK_PARAMS[key][0], PK_PARAMS[key][1], PK_PARAMS[key][2]);
        if (!p) continue;
        p.setTimeVarying(true);
        var keys = items[i].keys[key];
        for (var k = 0; k < keys.length; k++) {
          var t = clip.inPoint.seconds + (keys[k].time - clip.start.seconds);
          p.addKey(t);
          p.setValueAtKey(t, keys[k].value, true);
          written++;
        }
      }
    }
    return pk_ok({ keys: written });
  } catch (e) {
    return pk_err(e);
  }
}
