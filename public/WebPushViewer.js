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

    subscribeUser(callback) {
        this.pipe.onmessage = d => {
            callback(d.data);
        };
        return this.getServiceWorker().then(reg => {
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
                        body: JSON.stringify({
                            stream: this.id,
                            credentials: sub
                        })
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
}