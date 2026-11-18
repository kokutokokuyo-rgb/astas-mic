/* sw.js: cache agar aplikasi cepat terbuka dan tetap tampil saat koneksi lemah.
   Strategi: ambil dari jaringan dulu (selalu terbaru), jika gagal pakai salinan tersimpan. */
const V = 'sff-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; }).catch(() => caches.match(r)));
});
