class WebPushStreamer {
    startStream(data) {
        return fetch("/start", {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stream: this.id,
                data: data
            })
        }).then(r => r.json());
    }

    sendEvent(data) {
        return fetch("/update", {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stream: this.id,
                data: data
            })
        });
    }

    getUsername() {
        return fetch("/username");
    }
}