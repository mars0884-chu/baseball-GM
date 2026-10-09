/* 決勝GM v60 Service Worker：離線快取 App Shell（文字密度、管理頁分區、分頁與可視教學）。
   ASSETS 同時涵蓋模組版(7支JS+css)與單檔版(index.html)；缺檔以 allSettled 略過不整批失敗。 */
const CACHE = "baseballgm-v60-r078-want-visual-preview";
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
    const results = await Promise.allSettled(ASSETS.map((u) => c.add(u.endsWith('.html') || u === './' ? u : u + '?v=v60-r078-want-visual-preview')));
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length) { console.error('[離線核心快取未完成]', failures); throw Error('離線核心下載未完成，保留原版本'); }
    self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('baseballgm-') && k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // 導覽頁優先取得線上新版：舊版 App Shell 不得讓玩家長期看見過期的休賽季流程。
    // 斷線時仍使用已驗證的離線首頁；版本化 JS/CSS 素材維持原有快取策略。
    if (e.request.mode === "navigate") {
      try {
        const res = await fetch(e.request);
        if (res.ok) {
          e.waitUntil(c.put(e.request, res.clone()).catch(error => console.error('[首頁快取]', error)));
          return res;
        }
      } catch (error) { console.warn('[離線導覽]', error); }
      const idx = (await c.match(e.request)) || (await c.match("./index.html")) || (await c.match("./"));
      if (idx) return idx;
      return fetch(e.request);
    }
    const cached = await c.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      if (res.ok) e.waitUntil(c.put(e.request, res.clone()).catch(error => console.error('[素材快取]', error)));
      return res;
    } catch (err) {
      throw err;
    }
  })());
});
