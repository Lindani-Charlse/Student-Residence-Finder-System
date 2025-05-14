import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import  serviceAccount from '../serviceAccountKey2.json'; // adjust path if needed

dotenv.config();


console.log("Service Account Key:", serviceAccount); // Add this line

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Now you can access Firestore:
const db = admin.firestore();

// Example: Accessing a collection
const usersCollection = db.collection('users');


const app = express();
app.use(cors());
app.use(express.json());

// Middleware to verify Firebase token
/*const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized - No token provided' });
    return; // ✅ return nothing
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next(); // ✅ properly pass control to next handler
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};*/



// Route: Register user
app.post('/api/register', async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body; // role: 'student' or 'landlord'

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ uid: userRecord.uid, message: 'User registered successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});



// Route: Protected route (e.g., dashboard)
app.get('/api/dashboard', /*verifyToken,*/ async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ message: `Welcome, ${user.name || user.email}`, user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

