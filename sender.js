const webpush = require('web-push');
const url = require('url');
const https = require('https');
const vapid = require('./secrets/vapid.js');
const { resolve } = require('path');

webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

function sendNotification(subscription, payload, options) {

  let requestDetails;
  try {
    var time = Date.now();
    requestDetails = webpush.generateRequestDetails(subscription, payload, options);
  } catch (err) {
  }

  const httpsOptions = {};
  const urlParts = url.parse(requestDetails.endpoint);
  httpsOptions.hostname = urlParts.hostname;
  httpsOptions.port = urlParts.port;
  httpsOptions.path = urlParts.path;

  httpsOptions.headers = requestDetails.headers;
  httpsOptions.method = requestDetails.method;

  if (requestDetails.timeout) {
    httpsOptions.timeout = requestDetails.timeout;
  }

  if (requestDetails.agent) {
    httpsOptions.agent = requestDetails.agent;
  }

  if (requestDetails.proxy) {
    const HttpsProxyAgent = require('https-proxy-agent'); // eslint-disable-line global-require
    httpsOptions.agent = new HttpsProxyAgent(requestDetails.proxy);
  }

  const pushRequest = https.request(httpsOptions, function (pushResponse) {
    pushRequest.destroy();
  });

  if (requestDetails.timeout) {
    pushRequest.on('timeout', () => {
      pushRequest.destroy();
    });
  }

  pushRequest.on('error', () => {
  });

  if (requestDetails.body) {
    pushRequest.write(requestDetails.body);
  }
  pushRequest.setNoDelay(true);
  pushRequest.shouldKeepAlive = false;
  pushRequest.setTimeout(1);
  pushRequest.end();
  console.log("Details took " + (Date.now() - time) + "ms");
};


module.exports = sendNotification;