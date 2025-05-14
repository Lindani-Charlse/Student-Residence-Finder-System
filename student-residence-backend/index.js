const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const serviceAccount = require('./serviceAccountKey2.json');

// Initialize dotenv first
dotenv.config();

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting for admin registration
const adminRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: 'Too many registration attempts, please try again later'
});

// Rate limiting for student registration
const studentRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per window
  message: 'Too many registration attempts, please try again later'
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.send('🎉 Student Residence Finder API is working!');
});

// Role verification middleware
const verifyRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      if (!requiredRoles.includes(decodedToken.role)) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }

      req.user = decodedToken;
      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  };
};

// Admin registration endpoint (no authentication required)
app.post('/api/admin/register', adminRegisterLimiter, async (req, res) => {
  const { email, password, fullName, role, organization } = req.body;

  // Validate required fields
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate admin role
  const validAdminRoles = ['admin', 'manager'];
  if (!validAdminRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid admin role specified' });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      role,
      isAdmin: true
    });

    // Save to Firestore
    await db.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      fullName,
      email,
      organization: organization || '',
      role,
      createdAt: new Date().toISOString(),
      createdBy: 'open_registration'
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      uid: userRecord.uid,
      role
    });
  } catch (error) {
    console.error('Admin registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Verify user exists
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Get additional admin data from Firestore
    const adminDoc = await db.collection('admins').doc(userRecord.uid).get();
    
    if (!adminDoc.exists) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    const adminData = adminDoc.data();
    
    // Verify the user has admin role
    if (!['admin', 'manager'].includes(adminData.role)) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    // Create a custom token for client-side authentication
    const token = await admin.auth().createCustomToken(userRecord.uid);

    res.status(200).json({
      message: 'Admin login successful',
      token,
      admin: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: adminData.fullName,
        organization: adminData.organization,
        role: adminData.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Regular user registration endpoint
app.post('/api/register', studentRegisterLimiter, async (req, res) => {
  const { email, password, fullName, university, studentId, campusLocation, role } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate role
  const validRoles = ['student'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  // Additional validation for students
  if (role === 'student' && (!university || !campusLocation)) {
    return res.status(400).json({ error: 'University and campus location are required for students' });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // Set custom claims for role-based access
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      role,
      university: university || null
    });

    // Save additional user data in Firestore
    await db.collection('students').doc(userRecord.uid).set({
      uid: userRecord.uid,
      fullName,
      email,
      university,
      studentId: studentId || '',
      campusLocation,
      role,
      favorites: [],
      applications: [],
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'User registered successfully',
      uid: userRecord.uid,
      role
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Regular user login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Verify user exists
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Get additional user data from appropriate collection
    let userDoc;
    if (await db.collection('students').doc(userRecord.uid).get().then(d => d.exists)) {
      userDoc = await db.collection('students').doc(userRecord.uid).get();
    } else if (await db.collection('admins').doc(userRecord.uid).get().then(d => d.exists)) {
      return res.status(400).json({ error: 'Please use the admin login endpoint' });
    } else {
      return res.status(404).json({ error: 'User data not found' });
    }

    const userData = userDoc.data();
    
    // Create a custom token for client-side authentication
    const token = await admin.auth().createCustomToken(userRecord.uid);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        fullName: userData.fullName,
        university: userData.university,
        campusLocation: userData.campusLocation,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected admin endpoints
app.get('/api/admin/users',/* verifyRole(['admin']),*/ async (req, res) => {
  try {
    const [studentsSnapshot, adminsSnapshot] = await Promise.all([
      db.collection('students').get(),
      db.collection('admins').get()
    ]);

    const users = [];
    
    studentsSnapshot.forEach(doc => users.push({ type: 'student', ...doc.data() }));
    adminsSnapshot.forEach(doc => users.push({ type: 'admin', ...doc.data() }));

    res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin can update user roles
app.put('/api/admin/users/:uid/role',/* verifyRole(['admin']),*/ async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    if (!['admin', 'manager', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Update custom claims
    await admin.auth().setCustomUserClaims(uid, { role });

    // Update Firestore records
    if (role === 'student') {
      // Move to students collection
      const adminDoc = await db.collection('admins').doc(uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        await db.collection('students').doc(uid).set({
          uid,
          fullName: adminData.fullName,
          email: adminData.email,
          university: '',
          campusLocation: '',
          role,
          favorites: [],
          applications: [],
          createdAt: adminData.createdAt
        });
        await db.collection('admins').doc(uid).delete();
      }
    } else {
      // Move to admins collection
      const studentDoc = await db.collection('students').doc(uid).get();
      if (studentDoc.exists) {
        const studentData = studentDoc.data();
        await db.collection('admins').doc(uid).set({
          uid,
          fullName: studentData.fullName,
          email: studentData.email,
          organization: '',
          role,
          createdAt: studentData.createdAt,
          createdBy: req.user.uid
        });
        await db.collection('students').doc(uid).delete();
      }
    }

    res.status(200).json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error.message);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});
// Residence Management Endpoints

// Get all residences (public)
app.get('/api/residences', async (req, res) => {
  try {
    let query = db.collection('residences');
    
    // Add filters if provided
    if (req.query.university) {
      query = query.where('nearbyUniversities', 'array-contains', req.query.university);
    }
    if (req.query.minPrice) {
      query = query.where('monthlyRate', '>=', Number(req.query.minPrice));
    }
    if (req.query.maxPrice) {
      query = query.where('monthlyRate', '<=', Number(req.query.maxPrice));
    }
    if (req.query.beds) {
      query = query.where('beds', '==', Number(req.query.beds));
    }
    
    const snapshot = await query.get();
    const residences = [];
    snapshot.forEach(doc => {
      residences.push({
        id: doc.id,
        ...doc.data()
      });
    });
    res.status(200).json(residences);
  } catch (error) {
    console.error('Get residences error:', error.message);
    res.status(500).json({ error: 'Failed to fetch residences' });
  }
});

// Get single residence (public)
app.get('/api/residences/:id', async (req, res) => {
  try {
    const doc = await db.collection('residences').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }
    res.status(200).json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Get residence error:', error.message);
    res.status(500).json({ error: 'Failed to fetch residence' });
  }
});

// Create new residence
app.post('/api/residences', async (req, res) => {
  const { name, location, beds, bathrooms, hasWifi, hasParking, monthlyRate, images } = req.body;

  if (!name || !location || !beds || !monthlyRate) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, location, beds, monthlyRate' 
    });
  }

  try {
    const residenceRef = await db.collection('residences').add({
      name,
      location,
      beds: Number(beds),
      bathrooms: Number(bathrooms) || 1,
      hasWifi: Boolean(hasWifi),
      hasParking: Boolean(hasParking),
      monthlyRate: Number(monthlyRate),
      images: images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Residence created successfully',
      residenceId: residenceRef.id
    });
  } catch (error) {
    console.error('Create residence error:', error.message);
    res.status(500).json({ error: 'Failed to create residence' });
  }
});

// Update residence
app.put('/api/residences/:id', async (req, res) => {
  try {
    const residenceRef = db.collection('residences').doc(req.params.id);
    const doc = await residenceRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }

    const { 
      name, 
      description,
      location, 
      beds, 
      bathrooms, 
      amenities,
      monthlyRate, 
      images,
      nearbyUniversities,
      isAvailable,
      contactInfo
    } = req.body;

    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (name) updates.name = name;
    if (description) updates.description = description;
    if (location) updates.location = location;
    if (beds) updates.beds = Number(beds);
    if (bathrooms) updates.bathrooms = Number(bathrooms);
    if (amenities) updates.amenities = amenities;
    if (monthlyRate) updates.monthlyRate = Number(monthlyRate);
    if (images) updates.images = images;
    if (nearbyUniversities) updates.nearbyUniversities = nearbyUniversities;
    if (typeof isAvailable === 'boolean') updates.isAvailable = isAvailable;
    if (contactInfo) updates.contactInfo = contactInfo;

    await residenceRef.update(updates);

    res.status(200).json({ message: 'Residence updated successfully' });
  } catch (error) {
    console.error('Update residence error:', error.message);
    res.status(500).json({ error: 'Failed to update residence' });
  }
});

// Delete residence
app.delete('/api/residences/:id', async (req, res) => {
  try {
    const residenceRef = db.collection('residences').doc(req.params.id);
    const doc = await residenceRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }

    await residenceRef.delete();
    
    // Also delete any associated applications
    const applicationsSnapshot = await db.collection('applications')
      .where('residenceId', '==', req.params.id)
      .get();
    
    const batch = db.batch();
    applicationsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.status(200).json({ message: 'Residence deleted successfully' });
  } catch (error) {
    console.error('Delete residence error:', error.message);
    res.status(500).json({ error: 'Failed to delete residence' });
  }
});

// Get residences by owner
app.get('/api/residences/owner/:ownerId', async (req, res) => {
  try {
    const snapshot = await db.collection('residences')
      .where('ownerId', '==', req.params.ownerId)
      .get();
    
    const residences = [];
    snapshot.forEach(doc => {
      residences.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(residences);
  } catch (error) {
    console.error('Get owner residences error:', error.message);
    res.status(500).json({ error: 'Failed to fetch owner residences' });
  }
});



// ==============================================
// STUDENT DASHBOARD ENDPOINTS
// ==============================================

// Student dashboard - Get student's own profile
app.get('/api/student/profile',/* verifyRole(['student']),*/ async (req, res) => {
  try {
    const studentDoc = await db.collection('students').doc(req.user.uid).get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentData = studentDoc.data();
    
    res.status(200).json({
      message: 'Student profile retrieved successfully',
      student: studentData
    });
  } catch (error) {
    console.error('Get student profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch student profile' });
  }
});

// Student dashboard - Update student's own profile
app.put('/api/student/profile', /*verifyRole(['student']),*/ async (req, res) => {
  try {
    const { fullName, university, studentId, campusLocation, phoneNumber, profilePicture } = req.body;
    
    const updates = {
      updatedAt: new Date().toISOString()
    };
    
    if (fullName) updates.fullName = fullName;
    if (university) updates.university = university;
    if (studentId) updates.studentId = studentId;
    if (campusLocation) updates.campusLocation = campusLocation;
    if (phoneNumber) updates.phoneNumber = phoneNumber;
    if (profilePicture) updates.profilePicture = profilePicture;
    
    await db.collection('students').doc(req.user.uid).update(updates);
    
    // Update custom claims if university changed
    if (university) {
      await admin.auth().setCustomUserClaims(req.user.uid, { 
        role: 'student',
        university 
      });
    }
    
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update student profile error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Student dashboard - Get favorite residences
app.get('/api/student/favorites', /*verifyRole(['student']), */async (req, res) => {
  try {
    const studentDoc = await db.collection('students').doc(req.user.uid).get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    
    const favoriteIds = studentDoc.data().favorites || [];
    
    // Get all favorite residences in parallel
    const favoritePromises = favoriteIds.map(id => 
      db.collection('residences').doc(id).get().then(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    );
    
    const favorites = await Promise.all(favoritePromises);
    
    res.status(200).json({
      message: 'Favorites retrieved successfully',
      favorites: favorites.filter(fav => fav.id) // Filter out any undefined results
    });
  } catch (error) {
    console.error('Get favorites error:', error.message);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Student dashboard - Add residence to favorites
app.post('/api/student/favorites/:residenceId', /*verifyRole(['student']),*/ async (req, res) => {
  try {
    const residenceRef = db.collection('residences').doc(req.params.residenceId);
    const residenceDoc = await residenceRef.get();
    
    if (!residenceDoc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }
    
    const studentRef = db.collection('students').doc(req.user.uid);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    
    const currentFavorites = studentDoc.data().favorites || [];
    
    if (currentFavorites.includes(req.params.residenceId)) {
      return res.status(400).json({ error: 'Residence already in favorites' });
    }
    
    await studentRef.update({
      favorites: [...currentFavorites, req.params.residenceId]
    });
    
    res.status(200).json({ message: 'Residence added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Student dashboard - Remove residence from favorites
app.delete('/api/student/favorites/:residenceId',/* verifyRole(['student']),*/ async (req, res) => {
  try {
    const studentRef = db.collection('students').doc(req.user.uid);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    
    const currentFavorites = studentDoc.data().favorites || [];
    
    if (!currentFavorites.includes(req.params.residenceId)) {
      return res.status(400).json({ error: 'Residence not in favorites' });
    }
    
    await studentRef.update({
      favorites: currentFavorites.filter(id => id !== req.params.residenceId)
    });
    
    res.status(200).json({ message: 'Residence removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error.message);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Student dashboard - Get applications
app.get('/api/student/applications', /*verifyRole(['student']),*/ async (req, res) => {
  try {
    const snapshot = await db.collection('applications')
      .where('studentId', '==', req.user.uid)
      .orderBy('appliedAt', 'desc')
      .get();
    
    const applications = [];
    
    // Get residence details for each application
    const applicationPromises = snapshot.docs.map(async doc => {
      const applicationData = doc.data();
      const residenceDoc = await db.collection('residences').doc(applicationData.residenceId).get();
      
      return {
        id: doc.id,
        ...applicationData,
        residence: residenceDoc.exists ? residenceDoc.data() : null
      };
    });
    
    const applicationsWithResidences = await Promise.all(applicationPromises);
    
    res.status(200).json({
      message: 'Applications retrieved successfully',
      applications: applicationsWithResidences
    });
  } catch (error) {
    console.error('Get applications error:', error.message);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Student dashboard - Create application
app.post('/api/student/applications', async (req, res) => {
  try {
    const { residenceId, message, studentId, studentName, studentUniversity } = req.body;
    
    if (!residenceId) {
      return res.status(400).json({ error: 'Residence ID is required' });
    }
    
    // Get residence details
    const residenceDoc = await db.collection('residences').doc(residenceId).get();
    
    if (!residenceDoc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }
    
    if (!residenceDoc.data().isAvailable) {
      return res.status(400).json({ error: 'This residence is not currently available' });
    }
    
    // Check if student already has an application for this residence
    const existingApplication = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('residenceId', '==', residenceId)
      .where('status', 'in', ['pending', 'approved'])
      .get();
    
    if (!existingApplication.empty) {
      return res.status(400).json({ error: 'You already have an active application for this residence' });
    }
    
    // Create application
    const applicationRef = await db.collection('applications').add({
      residenceId,
      residenceName: residenceDoc.data().name,
      studentId: studentId,
      studentName: studentName,
      studentUniversity: studentUniversity,
      status: 'pending',
      message: message || '',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: applicationRef.id
    });
  } catch (error) {
    console.error('Create application error:', error.message);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Application Endpoints
app.post('/api/applications', async (req, res) => {
  try {
    const { residenceId, studentId, studentName, studentEmail, message } = req.body;

    // Validate required fields
    if (!residenceId || !studentId || !studentName || !studentEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if residence exists and is available
    const residenceRef = db.collection('residences').doc(residenceId);
    const residenceDoc = await residenceRef.get();
    
    if (!residenceDoc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }

    if (residenceDoc.data().isAvailable === false) {
      return res.status(400).json({ error: 'This residence is not available' });
    }

    // Check for existing application
    const existingApp = await db.collection('applications')
      .where('residenceId', '==', residenceId)
      .where('studentId', '==', studentId)
      .where('status', 'in', ['pending', 'approved'])
      .get();

    if (!existingApp.empty) {
      return res.status(400).json({ error: 'You already have an active application for this residence' });
    }

    // Create new application
    const applicationData = {
      residenceId,
      residenceName: residenceDoc.data().name,
      studentId,
      studentName,
      studentEmail,
      message: message || '',
      status: 'pending',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const applicationRef = await db.collection('applications').add(applicationData);

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: applicationRef.id
    });

  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get applications by student
app.get('/api/applications/student/:studentId', async (req, res) => {
  try {
    const snapshot = await db.collection('applications')
      .where('studentId', '==', req.params.studentId)
      .get();

    const applications = [];
    snapshot.forEach(doc => {
      applications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});
// ==============================================
// ADMIN APPLICATION MANAGEMENT
// ==============================================

// Get all applications (admin)
app.get('/api/admin/applications', /*(['admin', 'manager']), */async (req, res) => {
  try {
    let query = db.collection('applications').orderBy('appliedAt', 'desc');
    
    // Filter by status if provided
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }
    
    // Filter by residence if provided
    if (req.query.residenceId) {
      query = query.where('residenceId', '==', req.query.residenceId);
    }
    
    const snapshot = await query.get();
    
    const applications = [];
    snapshot.forEach(doc => {
      applications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(applications);
  } catch (error) {
    console.error('Get applications error:', error.message);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Update application status (admin)
app.put('/api/admin/applications/:id/status',/* verifyRole(['admin', 'manager']),*/ async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!['pending', 'approved', 'rejected', 'canceled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status specified' });
    }
    
    const applicationRef = db.collection('applications').doc(req.params.id);
    const applicationDoc = await applicationRef.get();
    
    if (!applicationDoc.exists) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const updates = {
      status,
      updatedAt: new Date().toISOString(),
      processedBy: req.user.uid
    };
    
    if (adminNotes) updates.adminNotes = adminNotes;
    
    await applicationRef.update(updates);
    
    res.status(200).json({ message: 'Application status updated successfully' });
  } catch (error) {
    console.error('Update application status error:', error.message);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// ==============================================
// REVIEWS SYSTEM
// ==============================================

// Get reviews for a residence
app.get('/api/residences/:id/reviews', async (req, res) => {
  try {
    const snapshot = await db.collection('reviews')
      .where('residenceId', '==', req.params.id)
      .orderBy('createdAt', 'desc')
      .get();
    
    const reviews = [];
    snapshot.forEach(doc => {
      reviews.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Submit a review (student only)
app.post('/api/residences/:id/reviews', /*verifyRole(['student']),*/ async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if residence exists
    const residenceDoc = await db.collection('residences').doc(req.params.id).get();
    if (!residenceDoc.exists) {
      return res.status(404).json({ error: 'Residence not found' });
    }
    
    // Check if student has lived here (has an approved application)
    const approvedApplication = await db.collection('applications')
      .where('studentId', '==', req.user.uid)
      .where('residenceId', '==', req.params.id)
      .where('status', '==', 'approved')
      .get();
    
    if (approvedApplication.empty) {
      return res.status(403).json({ error: 'You must have lived at this residence to submit a review' });
    }
    
    // Check if student already submitted a review
    const existingReview = await db.collection('reviews')
      .where('studentId', '==', req.user.uid)
      .where('residenceId', '==', req.params.id)
      .get();
    
    if (!existingReview.empty) {
      return res.status(400).json({ error: 'You have already submitted a review for this residence' });
    }
    
    // Get student details
    const studentDoc = await db.collection('students').doc(req.user.uid).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    
    // Create review
    const reviewRef = await db.collection('reviews').add({
      residenceId: req.params.id,
      residenceName: residenceDoc.data().name,
      studentId: req.user.uid,
      studentName: studentDoc.data().fullName,
      studentUniversity: studentDoc.data().university,
      rating: Number(rating),
      comment: comment || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Update residence's average rating
    await updateResidenceRating(req.params.id);
    
    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: reviewRef.id
    });
  } catch (error) {
    console.error('Submit review error:', error.message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Helper function to update residence's average rating
async function updateResidenceRating(residenceId) {
  try {
    const snapshot = await db.collection('reviews')
      .where('residenceId', '==', residenceId)
      .get();
    
    let totalRating = 0;
    let reviewCount = 0;
    
    snapshot.forEach(doc => {
      totalRating += doc.data().rating;
      reviewCount++;
    });
    
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    
    await db.collection('residences').doc(residenceId).update({
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount
    });
  } catch (error) {
    console.error('Update residence rating error:', error.message);
  }
}

// ==============================================
// NOTIFICATIONS SYSTEM
// ==============================================

// Get user notifications
app.get('/api/notifications', /*verifyRole(['student', 'admin', 'manager']), */async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', /*verifyRole(['student', 'admin', 'manager']), */async (req, res) => {
  try {
    const notificationRef = db.collection('notifications').doc(req.params.id);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notificationDoc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this notification' });
    }
    
    await notificationRef.update({
      isRead: true,
      readAt: new Date().toISOString()
    });
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error.message);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ==============================================
// ERROR HANDLING MIDDLEWARE
// ==============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});