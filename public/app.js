navigator.serviceWorker.register('./worker.js').then(w => w.update());

async function twitchLogin() {
    return fetch("/username").then(t => t.text()).then(username => {
        return new Promise((res, rej) => {
            if (username != "") {
                res();
            }
            else {
                var login = window.open("/auth/twitch");
                login.onunload = async () => {
                    if (login.closed) {
                        twitchLogin().then(() => res());
                    }
                };
            }
        });
    });
}

async function startStreamerSession(data) {
    return twitchLogin().then(() => new WebPushStreamer(data));
}

async function startViewerSession(id) {
    var con = new WebPushViewer(id);
    return Promise.resolve(con);
}
