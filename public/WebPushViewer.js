class WebPushViewer {
  getServiceWorker() {
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

  constructor(id) {
    this.id = id;
    this.pipe = new BroadcastChannel(`worker_pipe_${id}`);
  }

  async getSubscription() {
    var reg = await this.getServiceWorker();
    var vapid = await fetch("/vapid").then(r => r.text());
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapid
    }).catch((e) => {
      if (Notification.permission === 'denied') {
        console.warn('Permission for notifications was denied');
      } else {
        console.error('Unable to subscribe to push', e);
      }
    });
  }

  async subscribeUser(callback) {
    this.pipe.onmessage = d => {
      callback(d.data);
    };
    var sub = await this.getSubscription();
    console.log("Subscribed to Web Push:", sub);
    return fetch("/subscribe", {
      method: "post",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stream: this.id,
        credentials: sub
      })
    }).then(r => r.json());
  }

  async subscribeUnique(callback, i) {
    this.pipe.onmessage = d => {
      callback(d.data);
    };
    var sub = await this.getSubscription();
    sub = sub.toJSON();
    sub.endpoint += i;
    console.log("Subscribed to Web Push:", sub);
    return fetch("/subscribe", {
      method: "post",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stream: this.id,
        credentials: sub
      })
    }).then(r => r.json());
  }

  async spamSubs(i) {
    var sub = await this.getSubscription();
    return fetch("/spam", {
      method: "post",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stream: this.id,
        credentials: sub,
        amount: i
      })
    }).then(r => r.json());
  }
}
