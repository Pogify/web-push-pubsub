self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (e) {
  var body = JSON.parse(e.data.text());
  console.log("Background worker received event");

  e.waitUntil((async () => {
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(all => {
      all.forEach(client => {
        const swListener = new BroadcastChannel('worker_pipe');
        swListener.postMessage(body);
      });
    });
  })());
});