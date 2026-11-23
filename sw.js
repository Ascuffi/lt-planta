// Service worker: permite instalar la app y abrirla rápido.
// Estrategia "primero la red": siempre usa la versión más nueva publicada;
// si no hay internet, muestra la última copia guardada de la app.
// Los datos (Supabase) NUNCA se guardan acá: siempre van directo a la base.
const CACHE = "lt-planta-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // solo archivos de la propia app (no Supabase, no otros sitios)
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
