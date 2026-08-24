const CACHE="agenda-personale-v4";

const ASSETS=[
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>
        Promise.all(
          keys
            .filter(k=>k!==CACHE)
            .map(k=>caches.delete(k))
        )
      )
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{

  event.respondWith(

    fetch(event.request)
      .then(response=>{

        const copy=response.clone();

        caches.open(CACHE)
          .then(cache=>{
            cache.put(event.request,copy);
          });

        return response;

      })
      .catch(()=>{

        return caches.match(event.request);

      })

  );

});

self.addEventListener("notificationclick",event=>{

  event.notification.close();

  event.waitUntil(

    clients.matchAll({
      type:"window",
      includeUncontrolled:true
    })

    .then(list=>{

      if(list.length){
        return list[0].focus();
      }

      return clients.openWindow("./");

    })

  );

});
