self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (e) {
  console.log("push push");
  console.log(e);
  var body = JSON.parse(e.data.text());
  e.waitUntil((async () => {
    const swListener = new BroadcastChannel(`worker_pipe_${body.id}`);
    swListener.postMessage(body.data);
  })());
});

console.log("Added event listeners");
