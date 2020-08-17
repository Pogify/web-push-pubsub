function getServiceWorker() {
  return new Promise((resolve, error) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        resolve(reg);
      });
    } else {
      resolve();
    }
  });
}

window.onload = () => {
  navigator.serviceWorker.register('./worker.js').then(worker => {
    worker.update().then(worker => {
      const swListener = new BroadcastChannel('worker_pipe');
      swListener.onmessage = function (e) {
        console.log("Client site received event:", e.data);
      };
    });
  });
}

function startStream(id) {
  return fetch("/start", {
    method: "post",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ stream: id })
  });
}

function sendEvent(id, payload) {
  return fetch("/update", {
    method: "post",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ stream: id, payload: payload })
  });
}

function subscribeUser(id) {
  return getServiceWorker().then(reg => {
    return fetch("/vapid").then(r => r.text()).then(vapid => {
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapid
      }).then((sub) => {
        return fetch("/subscribe", {
          method: "post",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ stream: id, credentials: sub })
        }).then(r => r.json());
      }).catch((e) => {
        if (Notification.permission === 'denied') {
          console.warn('Permission for notifications was denied');
        } else {
          console.error('Unable to subscribe to push', e);
        }
      });
    });
  });
}

function unsubscribe() {
  getServiceWorker().then(reg => {
    reg.pushManager.getSubscription().then(sub => {
      return sub.unsubscribe();
    });
  });
}