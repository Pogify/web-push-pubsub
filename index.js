
// use https://d3v.one/vapid-key-generator/
// `${id}` makes sure that the object is a string

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
const redis = require("redis");
const { promisify } = require("util");
// const workerpool = require('workerpool');
// const pool = workerpool.pool(__dirname + "/sender.js", {
//   minWorkers: 'max'
// });
const async = require('async');

const client1 = redis.createClient();
const client2 = redis.createClient();
const client3 = redis.createClient();
const client4 = redis.createClient();
const client5 = redis.createClient();
const client6 = redis.createClient();

const del_redis = promisify(client1.del).bind(client1);
const sadd_redis = promisify(client2.sadd).bind(client2);
const pub_redis = promisify(client3.publish).bind(client3);
const set_redis = promisify(client4.set).bind(client4);
const get_redis = promisify(client5.get).bind(client5);
const exists_redis = promisify(client6.exists).bind(client6);

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
  callbackURL: "/auth/twitch/callback",
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

app.post("/start", async (req, res) => {
  var id = req.user.display_name;
  var data = req.body.data;
  if (await exists_redis(`${id}`)) {
    res.send({ message: "Successfully connected to existing stream" });
  } else {
    streams[id] = {
      subscribers: [], // new Set(),
      data: data
    };
    await del_redis(`${id}`);
    await set_redis(`data:${id}`, JSON.stringify(data));
    res.send({ "message": "Successfully started stream" });
  }
});

app.post("/stop", async (req, res) => {
  var id = req.user.display_name;
  await del_redis(`${id}`);
  res.send({ "message": "Successfully deleted stream" });
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

app.post("/update", async (req, res) => {
  var id = req.user.display_name;
  var data = req.body.data;

  if (streams[id] == undefined) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    res.status(200);
    res.send({ message: "Successfully updated status" });

    await set_redis(`data:${id}`, JSON.stringify(data));
    await pub_redis("new data", `${id}`);
  }
});

app.post("/subscribe", async (req, res) => {
  var id = req.body.stream;
  var key = req.body.credentials;
  if (streams[id] == undefined) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    await sadd_redis(`${id}`, JSON.stringify(key));
    res.send({
      message: "Successfully subscribed user",
      data: await get_redis(`data:${id}`)
    });
  }
});

app.post("/spam", async (req, res) => {
  var id = req.body.stream;
  var key = req.body.credentials;
  var amount = req.body.amount;
  var redis_promises = [];
  var og_endpoint = key.endpoint;
  for (var i = 0; i < amount; i++) {
    key.endpoint = `${og_endpoint}${i}`;
    redis_promises.push(sadd_redis(`${id}`, JSON.stringify(key)));
  }
  await Promise.all(redis_promises);
  res.status(200);
  res.send({
    message: `Successfully subscribed ${amount} fake viewers.`
  });
});

app.listen(process.env.PORT || 8000);
console.log('Listening on port 8000');
