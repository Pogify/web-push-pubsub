const vapid = require('./secrets/vapid.js');
const webpush = require('web-push');
const request = require('request');
const workerpool = require('workerpool');

webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

var sendNotification = (key, data) => {
  // var key = job.data.key;
  // var data = job.data.data;
  return webpush.sendNotification(key, data).catch(e => { });
}

workerpool.worker({
  sendNotification: sendNotification
});