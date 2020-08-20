// const webpush = require('web-push');
const url = require('url');
const https = require('https');
const vapid = require('./secrets/vapid.js');
const encryptionHelper = require('./node_modules/web-push/src/encryption-helper.js');
// const webPushConstants = require('./node_modules/web-push/src/web-push-constants.js');
const vapidHelper = require('./node_modules/web-push/src/vapid-helper.js');
const workerpool = require('workerpool');

async function sendNotification(subscription, payload, options) {
  // var time = Date.now();

  var encoding = 'aes128gcm';
  const urlParts = url.parse(subscription.endpoint);
  const audience = urlParts.protocol + '//'
    + urlParts.host;

  // console.log(vapid.subject);
  let requestDetails = {
    method: 'POST',
    headers: {
      TTL: 2419200,
      'Content-Length': 0,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': encoding,
      'Connection': 'close',
      Authorization: vapidHelper.getVapidHeaders(
        audience,
        vapid.subject,
        vapid.publicKey,
        vapid.privateKey,
        encoding
      ).Authorization
    },
    endpoint: subscription.endpoint
  };
  if (payload) {
    const encrypted = encryptionHelper.encrypt(
      subscription.keys.p256dh,
      subscription.keys.auth,
      payload,
      requestDetails.headers["Content-Encoding"]
    );
    requestDetails.headers['Content-Length'] = encrypted.cipherText.length;
    requestDetails.body = encrypted.cipherText;
  };
  // try {
  //   requestDetails = webpush.generateRequestDetails(subscription, payload, options);
  //   // console.log(requestDetails);
  // } catch (err) {
  // }
  const httpsOptions = {};
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

  const pushRequest = https.request(httpsOptions, () => {
    pushRequest.destroy();
  });

  if (requestDetails.body) {
    pushRequest.write(requestDetails.body);
  }
};


module.exports = sendNotification;

workerpool.worker({
  sendNotification: sendNotification
});