/* 決勝GM v60 Service Worker：離線快取 App Shell（視覺恢復候選）。
   ASSETS 同時涵蓋模組版(7支JS+css)與單檔版(index.html)；缺檔以 allSettled 略過不整批失敗。 */
const CACHE = "baseballgm-v60-r011";
const ASSETS = [
  "./", "./index.html", "./style.css", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-180.png",
  "./00-theme.js",
  "./01-data-engine.js", "./02-finance.js", "./03-simulation.js",
  "./04-state-core.js", "./05-ui-dashboard.js", "./06-ui-roster.js"
];
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map((u) => c.add(u)));
    self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      const c = await caches.open(CACHE);
      c.put(e.request, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      if (e.request.mode === "navigate") {
        const idx = (await caches.match("./index.html")) || (await caches.match("./"));
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
