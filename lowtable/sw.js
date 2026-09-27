// Service worker Lowtable : coquille de l'app en cache pour l'installation et le hors-ligne.
// Les données (recettes, semaines) viennent de Supabase et ne sont pas mises en cache ici.
const CACHE = "lowtable-v4";
const SHELL = ["./", "./index.html", "./config.js", "./card.js", "./lowtable-plates.js", "./lowtable-ghost.css", "./lowtable-ghost.js", "./compositions/_plate.svg", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // réseau d'abord pour la coquille (mises à jour visibles vite), cache en secours
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
