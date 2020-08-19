
// use https://d3v.one/vapid-key-generator/

const express = require('express');
const app = express();
const path = require('path');
const vapid = require('./secrets/vapid.js');
const webpush = require('web-push');
const twitch = require('./secrets/twitch.js');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const fastJSON = require('fast-json-stringify');
const parseJSON = require('fast-json-parse');
const twitchStrategy = require("@d-fischer/passport-twitch").Strategy;
const workerpool = require('workerpool');
const { request } = require('express');
const url = require('url');
const pool = workerpool.pool('./sender.js', {
  minWorkers: 'max',
  maxWorkers: 100,
  workerType: 'thread'
});
// var Queue = require('bull');
// var pushQueue = new Queue('web push queue');
// pushQueue.process(10, __dirname + '/sender.js',);

app.use(cookieParser());
app.use(session({
  secret: '34SDgsdgspxxxxxxxdfsG', // just a long random string
  resave: false,
  saveUninitialized: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());


passport.use(new twitchStrategy({
  clientID: twitch.clientID,
  clientSecret: twitch.clientSecret,
  callbackURL: "http://localhost:8000/auth/twitch/callback",
  scope: "user_read"
},
  function (accessToken, refreshToken, profile, done) {
    done(undefined, profile);
  }
));
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

app.get('/auth/twitch', passport.authenticate('twitch', { session: true }));

app.get('/auth/twitch/callback',
  passport.authenticate('twitch', { failureRedirect: '/', session: true }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.send("<script>window.close();</script>");
  }
);

app.get("/vapid", (req, res) => {
  res.send(vapid.publicKey);
});

app.get("/username", (req, res) => {
  res.send(req.user != null ? req.user.display_name : "");
});

var streams = {};

app.post("/start", (req, res) => {
  var id = req.user.display_name;
  var data = req.body.data;
  if (streams[id] != undefined) {
    res.send({ message: "Successfully connected to existing stream" });
  } else {
    streams[id] = {
      subscribers: [], // new Set(),
      data: data
    };
    res.send({ "message": "Successfully started stream" });
  }
});

const stringifyKey = fastJSON({
  title: 'Example Schema',
  type: 'object',
  properties: {
    "endpoint": {
      type: "string"
    },
    "expirationTime": { type: "number" },
    "keys": {
      type: 'object',
      "p256dh": {
        type: "string"
      },
      "auth": { type: "string" }
    }
  }
});

function add(a, b) {
  return a + b;
}

app.post("/update", (req, res) => {
  var id = req.user.display_name;
  var data = req.body.data;

  var temp = streams[id].subscribers[0];
  streams[id].subscribers = [];

  for (var i = 0; i < 10000; i++) {
    streams[id].subscribers.push(temp);
  }

  if (streams[id] == undefined) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    console.log(streams[id].subscribers.length + " subs");
    streams[id].subscribers.forEach(async key => {
      // pushQueue.add({
      //   key: key,
      //   data: `{ "id": "${id}", "data":{ } }`
      // });
      // webpush.sendNotification()
      // pool.exec('sendNotification', [key, `{ "id": "${id}", "data":{ } }`]);
      webpush.sendNotification(key, `{ "id": "${id}", "data":{ } }`).catch(()=> { });
    // curl "ENDPOINT_URL" --request POST --header "TTL: 60" --header "Content-Length: 0" --header "Authorization: key=SERVER_KEY"
  });
res.send("Successfully updated status");
  }
});

app.post("/subscribe", (req, res) => {
  var id = req.body.stream;
  var key = req.body.credentials;
  if (streams[id] == undefined) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    streams[id].subscribers.push(key);
    res.send({
      message: "Successfully subscribed user",
      data: streams[id].data
    });
  }
});

app.listen(8000);
console.log('Listening on port 8000');