
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
const sendNotification = require('./sender.js');
const workerpool = require('workerpool');
const pool = workerpool.pool(__dirname + "/sender.js", {
  minWorkers: 'max'
});
const async = require('async');


webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

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

app.post("/update", (req, res) => {
  var id = req.user.display_name;
  var data = req.body.data;

  // var orig = streams[id].subscribers[0];
  // streams[id].subscribers = [];
  // var temp = JSON.parse(JSON.stringify(orig));
  // // temp.endpoint += Date.now();

  // for (var i = 1; i < 10000; i++) {
  //   streams[id].subscribers.push(temp);
  // }
  // streams[id].subscribers.push(orig);

  if (streams[id] == undefined) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    res.status(200);
    res.send({ message: "Successfully updated status" });
    console.log(streams[id].subscribers.length + " subs");

    var arr = streams[id].subscribers;
    var length = arr.length;
    // var funcs = [];
    for (var i = 0; i < length; i++) {
      // sendNotification is found in ./sender.js
      pool.exec("sendNotification", [
        arr[i],
        JSON.stringify({
          id: id,
          data: data
        }),
        vapid
      ]).catch(e => {
        console.log(e);
      });
    }
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