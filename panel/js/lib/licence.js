// Sign-in and licence handling for the panel.
// The server signs an ES256 token; the panel verifies it offline with the
// public key, so editing works without internet until the token expires.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const config = require("./config");

function storeDir() {
  const base =
    process.platform === "win32"
      ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
      : path.join(os.homedir(), "Library", "Application Support");
  return path.join(base, "PostKit");
}

const storeFile = () => path.join(storeDir(), "licence.json");

/** Stable, anonymous fingerprint of this computer (hex, 64 chars). */
function deviceId() {
  const user = (() => {
    try {
      return os.userInfo().username;
    } catch {
      return "";
    }
  })();
  const cpu = (os.cpus()[0] || {}).model || "";
  return crypto.createHash("sha256").update([os.hostname(), user, process.platform, cpu].join("|")).digest("hex");
}

function deviceInfo() {
  return {
    hash: deviceId(),
    name: os.hostname().slice(0, 80),
    platform: process.platform === "win32" ? "win" : "mac",
  };
}

function b64urlDecode(part) {
  return Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Verifies signature and expiry. Returns the claims, or null if the token is not valid. */
function verifyToken(token, now = Date.now(), publicKey = config.licensePublicKey) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header, claims;
  try {
    header = JSON.parse(b64urlDecode(parts[0]).toString("utf8"));
    claims = JSON.parse(b64urlDecode(parts[1]).toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "ES256" || claims.iss !== "postkit") return null;
  const ok = crypto.verify(
    "sha256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    b64urlDecode(parts[2]),
  );
  if (!ok) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= now) return null;
  if (claims.dev && claims.dev.length === 0) return null;
  return claims;
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(storeFile(), "utf8"));
  } catch {
    return null;
  }
}

function save(state) {
  fs.mkdirSync(storeDir(), { recursive: true });
  fs.writeFileSync(storeFile(), JSON.stringify(state, null, 2), { mode: 0o600 });
}

function clear() {
  try {
    fs.unlinkSync(storeFile());
  } catch {
    /* already gone */
  }
}

async function api(pathname, body) {
  const res = await fetch(config.apiBase + pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const err = new Error(data.message || friendly(data.error) || `Server error (${res.status}).`);
    err.code = data.error || String(res.status);
    throw err;
  }
  return data;
}

function friendly(code) {
  return {
    email: "Enter a valid email address.",
    send: "We couldn't send the code. Wait a minute and try again.",
    code: "That code didn't work. Check it, or send a new one.",
    no_plan: "This account has no plan yet. Buy one at postkitlb.com.",
    plan_expired: "Your plan has ended. Renew it at postkitlb.com/account.",
    device_limit: "Your plan is active on another computer. Remove it at postkitlb.com/account, then try again.",
    device_removed: "This computer was removed from your account. Sign in again.",
    bad_token: "Please sign in again.",
  }[code];
}

async function requestCode(email) {
  await api("/api/panel/login", { email });
}

async function signIn(email, code) {
  const data = await api("/api/panel/verify", { email, code, device: deviceInfo() });
  const state = { email, token: data.token, planExpires: data.planExpires, credits: data.credits, checkedAt: Date.now() };
  save(state);
  return state;
}

/**
 * Returns the current licence state, refreshing it with the server when due.
 * Works offline as long as the stored token is still valid.
 */
async function current({ force = false } = {}) {
  const state = load();
  if (!state || !state.token) return null;
  const due = force || !state.checkedAt || Date.now() - state.checkedAt > config.checkEveryMs;
  if (due) {
    try {
      const data = await api("/api/panel/check", { token: state.token });
      const next = { ...state, token: data.token, planExpires: data.planExpires, credits: data.credits, checkedAt: Date.now() };
      save(next);
      return next;
    } catch (err) {
      // The server said no: sign out. Network trouble: keep working offline.
      if (["bad_token", "device_removed", "no_plan", "plan_expired"].includes(err.code)) {
        clear();
        throw err;
      }
    }
  }
  return verifyToken(state.token) ? state : null;
}

module.exports = { deviceId, deviceInfo, verifyToken, requestCode, signIn, current, signOut: clear, friendly, _storeFile: storeFile };
