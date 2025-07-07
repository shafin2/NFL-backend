const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase admin SDK exactly once
if (!admin.apps.length) {
  let credential;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // GOOGLE_APPLICATION_CREDENTIALS should be an absolute or relative path to the service account JSON
    credential = admin.credential.cert(require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)));
  } else {
    // Fall back to default location within backend folder
    try {
      credential = admin.credential.cert(require(path.join(__dirname, '../serviceaccount.json')));
    } catch (err) {
      console.error('❌ Firebase service account JSON not found. Set GOOGLE_APPLICATION_CREDENTIALS env var.');
      throw err;
    }
  }
  admin.initializeApp({ credential });
}

/**
 * Send push notification to a batch of FCM tokens (max 500).
 * @param {string[]} tokens - Array of FCM device tokens.
 * @param {object} payload - { title, body, data }
 * @returns {Promise<admin.messaging.BatchResponse>}
 */
async function sendMulticast(tokens, { title, body, data = {} }) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    throw new Error('No device tokens provided');
  }

  const message = {
    tokens,
    notification: { title, body },
    data,
  };

  return admin.messaging().sendEachForMulticast(message);
}

module.exports = { sendMulticast }; 