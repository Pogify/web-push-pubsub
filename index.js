
// use https://d3v.one/vapid-key-generator/

const express = require('express');
const app = express();
const path = require('path');
const webpush = require('web-push');
const vapid = require('./secrets/vapid.js');
const twitch = require('./secrets/twitch.js');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
var twitchStrategy = require("@d-fischer/passport-twitch").Strategy;

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

webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

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
  if (id in streams) {
    res.status(403);
    res.send({ message: "Stream already exists" });
  } else {
    streams[id] = {
      subscribers: new Set(),
      data: data
    };
    res.send({ "message": "Successfully started stream" });
  }
});

app.post("/update", (req, res) => {
  var id = req.user.display_name;
  var data = req.body.data;
  if (!(id in streams)) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    streams[id].data = data;
    streams[id].subscribers.forEach(key => {
      webpush.sendNotification(JSON.parse(key), JSON.stringify({
        data: data,
        id: id
      }));
    });
    res.send("Successfully updated status");
  }
});

app.post("/subscribe", (req, res) => {
  var id = req.body.stream;
  var key = req.body.credentials;
  if (!(id in streams)) {
    res.status(404);
    res.send({ message: "Stream does not exist" });
  } else {
    streams[id].subscribers.add(JSON.stringify(key));
    res.send({
      message: "Successfully subscribed user",
      data: streams[id].data
    });
  }
});

app.listen(8000);
console.log('Listening on port 8000');