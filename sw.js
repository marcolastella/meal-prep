// Service worker: l'app funziona anche offline (in cucina il Wi-Fi non sempre c'è).
const V = "mp-v4";
const CORE = ["./", "index.html", "css/app.css", "js/app.js", "js/data.js", "js/store.js", "js/sync.js", "js/timers.js", "js/config.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (u.hostname.endsWith("supabase.co") || u.hostname.endsWith("supabase.in")) return; // dati sempre dalla rete
  const sameOrigin = u.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || u.hostname === "esm.sh";
  if (!sameOrigin && !isFont) return;
  // Stale-while-revalidate: risposta immediata dalla cache, aggiornamento in background.
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: sameOrigin && e.request.mode === "navigate" });
    const net = fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow("./"))));
});
