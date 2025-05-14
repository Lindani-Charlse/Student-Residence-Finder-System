import admin from 'firebase-admin';
import * as serviceAccount from '../serviceAccountKey2.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const db = admin.firestore();  // or admin.database() for Realtime DB
