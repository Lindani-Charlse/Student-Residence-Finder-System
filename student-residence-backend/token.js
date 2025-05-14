// Run this in a Node.js environment or Firebase Cloud Functions
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const customToken = await admin.auth().createCustomToken('some-uid', {
  role: 'admin'
});
console.log('Custom Token:', customToken);