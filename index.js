
// use https://d3v.one/vapid-key-generator/

const express = require('express');
const app = express();
const path = require('path');
const webpush = require('web-push');
const vapid = require('./secrets/vapid.js');
const bodyParser = require('body-parser');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.listen(8000);
console.log('Listening on port 8000');

webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

app.get("/vapid", (req, res) => {
  res.send(vapid.publicKey);
});

var streams = {};

app.post("/subscribe", (req, res) => {
  var id = req.body.stream;
  var key = req.body.credentials;
  if (!(id in streams)) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    streams[id].add(JSON.stringify(key));
    res.send({
      message: "Successfully subscribed user"
    });
  }
});

app.post("/start", (req, res) => {
  var id = req.body.stream;
  if (id in streams) {
    res.status(403);
    res.send({ message: "Stream already exists" });
  } else {
    streams[id] = new Set();
    res.send({ "message": "Successfully started stream" });
  }
});

app.post("/update", (req, res) => {
  var id = req.body.stream;
  var payload = req.body.payload;
  if (!(id in streams)) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    streams[id].forEach(key => {
      webpush.sendNotification(JSON.parse(key), JSON.stringify(payload));
    });
    res.send("Successfully updated status");
  }
});