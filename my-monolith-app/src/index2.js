const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Make sure this path is correct

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Register User
app.post('/api/register', async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'User registered', uid: userRecord.uid });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ✅ Submit Slip
app.post('/api/slips', async (req, res) => {
  const { slipNumber, batchNumber } = req.body;

  if (!slipNumber || !batchNumber) {
    return res.status(400).json({ error: 'Missing slipNumber or batchNumber' });
  }

  try {
    const docRef = await db.collection('slips').add({
      slipNumber,
      batchNumber,
      submittedAt: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Slip submitted successfully',
      slipId: docRef.id,
    });
  } catch (error) {
    console.error('Slip submission error:', error.message);
    res.status(500).json({ error: 'Failed to save slip' });
  }
});

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('Student Residence Finder API is running 🏠');
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
