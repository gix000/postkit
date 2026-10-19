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
    var done = 0, skipped = 0, removedSeconds = 0;

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
      } else {
        skipped++;
      }
    }

    var relinked = pk_relinkPairs(seq, vIndex, aIndex, halfFrame);
    return pk_ok({ cuts: done, skipped: skipped, removedSeconds: removedSeconds, relinked: relinked });
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
function pk_exportFrame(filePath) {
  try {
    pk_seq();
    app.enableQE();
    var qs = qe.project.getActiveSequence();
    qs.exportFramePNG(qs.CTI.timecode, filePath);
    var f = new File(filePath);
    var g = new File(filePath + ".png");
    return pk_ok({ path: f.exists ? filePath : g.exists ? filePath + ".png" : filePath });
  } catch (e) {
    return pk_err(e);
  }
}
