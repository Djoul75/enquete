// Service worker : notifications, et le jeu gardé sur le téléphone pour
// s'ouvrir sans attendre le réseau.
//  - la page (index.html) s'affiche depuis le cache, puis se met à jour en
//    arrière-plan ; une nouvelle version est signalée à la page ouverte ;
//  - les fichiers de /assets/ (noms qui changent à chaque version) se
//    servent du cache dès qu'on les a eus une fois ;
//  - la base Supabase (autre domaine) n'est jamais mise en cache.
const CACHE = "enquete-v1";
const PAGE = new URL("./", self.registration.scope).href;
const MOIS = 30 * 24 * 3600 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(PAGE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(self.registration.scope)) return;

  if (req.mode === "navigate") {
    event.respondWith(page(event));
  } else if (url.pathname.includes("/assets/")) {
    event.respondWith(fichierFixe(req));
  } else {
    event.respondWith(reseauPuisCache(req));
  }
});

// La page en cache tout de suite ; la version du réseau remplace le cache
// pour la prochaine ouverture.
async function page(event) {
  const cache = await caches.open(CACHE);
  const garde = await cache.match(PAGE);
  const fraiche = fetch(PAGE, { cache: "no-cache" }).then(async (rep) => {
    if (!rep.ok) return rep;
    const texte = await rep.clone().text();
    const ancien = garde ? await garde.clone().text() : null;
    await cache.put(PAGE, rep.clone());
    if (ancien !== null && ancien !== texte) {
      await nettoyer(cache, texte);
      const fenetres = await self.clients.matchAll({ type: "window" });
      fenetres.forEach((f) => f.postMessage("nouvelle-version"));
    }
    return rep;
  });
  if (garde) {
    event.waitUntil(fraiche.catch(() => {}));
    return garde;
  }
  return fraiche;
}

async function fichierFixe(req) {
  const cache = await caches.open(CACHE);
  const garde = await cache.match(req);
  if (garde) return garde;
  const rep = await fetch(req);
  if (rep.ok) cache.put(req, rep.clone());
  return rep;
}

// Icônes, manifeste : le réseau d'abord, le cache sans réseau.
async function reseauPuisCache(req) {
  const cache = await caches.open(CACHE);
  try {
    const rep = await fetch(req);
    if (rep.ok) cache.put(req, rep.clone());
    return rep;
  } catch (e) {
    const garde = await cache.match(req);
    if (garde) return garde;
    throw e;
  }
}

// Les fichiers d'anciennes versions restent un mois (une page encore
// ouverte peut en avoir besoin), puis partent s'ils ne servent plus.
async function nettoyer(cache, html) {
  const maintenant = Date.now();
  for (const req of await cache.keys()) {
    if (!req.url.includes("/assets/")) continue;
    const nom = req.url.split("/assets/")[1];
    if (html.includes(nom)) continue;
    const rep = await cache.match(req);
    const date = Date.parse(rep?.headers.get("date") ?? "");
    if (!date || maintenant - date > MOIS) await cache.delete(req);
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Enquête", {
      body: data.body || "",
      icon: "./icone-192.png",
      badge: "./icone-192.png",
      data: { url: data.url || "./" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if ("focus" in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
