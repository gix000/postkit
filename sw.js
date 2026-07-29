/* PostKit service worker
   Strategy:
     - the app shell (index, legal pages, icons) is cached so it opens instantly
       and still opens with no connection
     - the Cloudflare Worker API is NEVER cached: generations, credits and sign in
       must always be live
     - fonts are cached after first use so repeat opens do not re-download them
*/

const VERSION    = "pk-v1";
const SHELL      = `shell-${VERSION}`;
const RUNTIME    = `runtime-${VERSION}`;

const SHELL_FILES = [
  "/",
  "/index.html",
  "/terms.html",
  "/privacy.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// anything that must always hit the network
const NEVER_CACHE = [
  "workers.dev",          // the API
  "accounts.google.com",  // sign in
  "oauth2.googleapis.com",
  "goatcounter.com",      // analytics
  "fal.run",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(SHELL_FILES).catch(() => {/* a missing file must not break install */}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;                       // never touch POSTs

  const url = new URL(req.url);
  if (NEVER_CACHE.some((host) => url.hostname.includes(host))) return;

  // Navigations: network first so a deploy shows up immediately,
  // falling back to the cached page when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // Fonts and images: cache first, they rarely change.
  if (url.hostname.includes("fonts.g") || /\.(png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  // Everything else: try the network, fall back to cache.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

// lets the page tell a waiting worker to take over straight away
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
