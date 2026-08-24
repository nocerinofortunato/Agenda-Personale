const CACHE = "agenda-personale-v5";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];


/* =========================================================
   INSTALLAZIONE
   ========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE)

      .then(cache =>
        cache.addAll(ASSETS)
      )

      .then(() =>
        self.skipWaiting()
      )

  );

});


/* =========================================================
   ATTIVAZIONE
   ========================================================= */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()

      .then(keys =>

        Promise.all(

          keys

            .filter(key =>
              key !== CACHE
            )

            .map(key =>
              caches.delete(key)
            )

        )

      )

      .then(() =>
        self.clients.claim()
      )

  );

});


/* =========================================================
   CACHE / RETE
   ========================================================= */

self.addEventListener("fetch", event => {

  event.respondWith(

    fetch(event.request)

      .then(response => {

        const copy =
          response.clone();

        caches.open(CACHE)

          .then(cache => {

            cache.put(
              event.request,
              copy
            );

          });

        return response;

      })

      .catch(() =>

        caches.match(
          event.request
        )

      )

  );

});


/* =========================================================
   PUSH
   ========================================================= */

self.addEventListener("push", event => {

  let data = {};

  try {

    data =
      event.data
        ? event.data.json()
        : {};

  } catch {

    data = {
      title: "Agenda Personale",
      body: event.data
        ? event.data.text()
        : "Hai un nuovo promemoria."
    };

  }


  const title =
    data.title ||
    "Agenda Personale";


  const options = {

    body:
      data.body ||
      "Hai un nuovo impegno.",

    icon:
      data.icon ||
      "./icons/icon-192.png",

    badge:
      data.badge ||
      "./icons/icon-192.png",

    tag:
      data.tag ||
      "agenda-reminder",

    requireInteraction:
      data.requireInteraction !== false,

    vibrate: [
      200,
      100,
      200
    ],

    data:
      data.data || {}

  };


  event.waitUntil(

    self.registration.showNotification(
      title,
      options
    )

  );

});


/* =========================================================
   CLICK NOTIFICA
   ========================================================= */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();


    event.waitUntil(

      clients.matchAll({

        type: "window",

        includeUncontrolled:
          true

      })

      .then(list => {

        /*
          Se l'Agenda è già aperta,
          la portiamo in primo piano.
        */

        if (list.length) {

          return list[0].focus();

        }


        /*
          Altrimenti la apriamo.
        */

        return clients.openWindow(
          "./"
        );

      })

    );

  }
);
