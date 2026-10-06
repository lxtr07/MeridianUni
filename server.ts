import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  setLogLevel,
  deleteField,
} from 'firebase/firestore';
import fs from 'fs';

// Filter out benign Firestore gRPC idle stream notices from polluting server stderr
const origStderrWrite = process.stderr.write.bind(process.stderr);
(process.stderr as any).write = function (chunk: any, ...args: any[]): boolean {
  const str = chunk?.toString?.() || '';
  if (
    str.includes('Disconnecting idle stream') ||
    str.includes('Timed out waiting for new targets')
  ) {
    return true; // Benign idle stream timeout
  }
  return (origStderrWrite as any)(chunk, ...args);
};

// Set Firestore log level to silent to suppress internal gRPC stream disconnect messages
setLogLevel('silent');

declare const __dirname: string | undefined;

const serverDir =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Read Firebase config
const configPath = fs.existsSync(path.join(serverDir, 'firebase-applet-config.json'))
  ? path.join(serverDir, 'firebase-applet-config.json')
  : path.join(process.cwd(), 'firebase-applet-config.json');
const configRaw = fs.readFileSync(configPath, 'utf-8');
const firebaseConfig = JSON.parse(configRaw);

// Initialize Firebase for server backend
const firebaseApp = initializeApp(firebaseConfig, 'server-backend-app');
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  // Serve public static folder
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // -------------------------------------------------------------
  // Backend API Routes (Connected Directly to Cloud Firestore)
  // -------------------------------------------------------------

  // Health check & database connection status
  app.get('/api/health', async (req, res) => {
    try {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          projectId: firebaseConfig.projectId,
          firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
        },
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // USERS & PROFESSORS API (Reflects live from Cloud Firestore)
  app.get('/api/users', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users: any[] = [];
      snap.forEach((d) => {
        users.push({ ...d.data(), id: d.id });
      });
      res.json({ count: users.length, users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', req.params.id));
      if (!docSnap.exists()) {
        return res.status(404).json({ error: `User ${req.params.id} not found in Firestore` });
      }
      res.json({ user: { ...docSnap.data(), id: docSnap.id } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const email = req.body.email?.trim().toLowerCase();

      if (email) {
        const snap = await getDocs(collection(db, 'users'));
        let emailDuplicate = false;
        snap.forEach((d) => {
          if (d.id !== userId) {
            const u = d.data();
            if (u.email && u.email.trim().toLowerCase() === email) {
              emailDuplicate = true;
            }
          }
        });
        if (emailDuplicate) {
          return res.status(409).json({ error: `A faculty account with email "${req.body.email}" already exists.` });
        }
      }

      const payload = {
        ...req.body,
        id: userId,
        updated_at: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userId), payload, { merge: true });
      const updatedSnap = await getDoc(doc(db, 'users', userId));
      res.json({
        message: `User ${userId} updated in Cloud Firestore`,
        user: { ...updatedSnap.data(), id: updatedSnap.id },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const email = req.body.email?.trim().toLowerCase();
      const userId = req.body.id?.trim();

      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      // Check existing users for duplicate faculty account ID or duplicate email
      const snap = await getDocs(collection(db, 'users'));
      let emailDuplicate = false;
      let idDuplicate = false;

      snap.forEach((d) => {
        const u = d.data();
        if (userId && d.id === userId) idDuplicate = true;
        if (u.email && u.email.trim().toLowerCase() === email) {
          emailDuplicate = true;
        }
      });

      if (idDuplicate) {
        return res.status(409).json({ error: `Faculty account ID "${userId}" already exists.` });
      }

      if (emailDuplicate) {
        return res.status(409).json({ error: `A faculty account with email "${req.body.email}" already exists.` });
      }

      const newId = userId || `usr-${Date.now()}`;
      const payload = {
        ...req.body,
        id: newId,
        email: email,
        created_at: req.body.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', newId), payload);
      res.status(201).json({
        message: 'New user created in Cloud Firestore',
        user: payload,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      await deleteDoc(doc(db, 'users', req.params.id));
      res.json({ message: `User ${req.params.id} deleted from database` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SCHOLARSHIPS API (Default descending chronological sort)
  app.get('/api/scholarships', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'scholarships'));
      const scholarships: any[] = [];
      snap.forEach((d) => {
        scholarships.push({ ...d.data(), id: d.id });
      });
      scholarships.sort((a, b) => new Date(b.created_at || b.deadline || '').getTime() - new Date(a.created_at || a.deadline || '').getTime());
      res.json({ count: scholarships.length, scholarships });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/scholarships/:id', async (req, res) => {
    try {
      const docSnap = await getDoc(doc(db, 'scholarships', req.params.id));
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Scholarship not found' });
      }
      res.json({ scholarship: { ...docSnap.data(), id: docSnap.id } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/scholarships', async (req, res) => {
    try {
      const id = req.body.id || `sch-${Date.now()}`;
      const data = { ...req.body, id, created_at: req.body.created_at || new Date().toISOString() };
      await setDoc(doc(db, 'scholarships', id), data);
      res.status(201).json({ message: 'Scholarship created in Cloud Firestore', scholarship: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/scholarships/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const data: any = { ...req.body, id, updated_at: new Date().toISOString() };
      if (!data.is_frozen || !data.freeze_note) {
        data.freeze_note = deleteField();
      }
      await setDoc(doc(db, 'scholarships', id), data, { merge: true });
      res.json({ message: 'Scholarship updated in Cloud Firestore', scholarship: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/scholarships/:id', async (req, res) => {
    try {
      await deleteDoc(doc(db, 'scholarships', req.params.id));
      res.json({ message: `Scholarship ${req.params.id} deleted from Cloud Firestore` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // APPLICATIONS API (Default descending chronological sort)
  // Documents are stripped from list responses to prevent unnecessary data exposure
  app.get('/api/applications', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'applications'));
      const applications: any[] = [];
      snap.forEach((d) => {
        const { documents, ...safeData } = d.data() as any;
        applications.push({ ...safeData, id: d.id });
      });
      applications.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      res.json({ count: applications.length, applications });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dedicated tracking endpoint: strips documents array entirely for privacy & performance
  app.get('/api/applications/track', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'applications'));
      const applications: any[] = [];
      snap.forEach((d) => {
        const { documents, ...safeData } = d.data() as any;
        applications.push({ ...safeData, id: d.id });
      });
      applications.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      res.json({ count: applications.length, applications });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/applications/:id', async (req, res) => {
    try {
      const docSnap = await getDoc(doc(db, 'applications', req.params.id));
      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json({ application: { ...docSnap.data(), id: docSnap.id } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/applications', async (req, res) => {
    try {
      const { scholarship_id, email, student_number, ...rest } = req.body;
      if (!scholarship_id) {
        return res.status(400).json({ error: 'Scholarship ID is required' });
      }

      const normEmail = email?.trim().toLowerCase();
      const cleanId = student_number?.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check existing applications for duplicate submission to the same scholarship
      // Exception: Allow a new application ONLY if previous status is "Removed", "Expired", or "Rejected"
      const snap = await getDocs(collection(db, 'applications'));
      let isDuplicate = false;
      let matchedApp: any = null;

      snap.forEach((d) => {
        const data = d.data();
        if (data.scholarship_id === scholarship_id) {
          const appEmail = data.email?.trim().toLowerCase();
          const appCleanId = data.student_number?.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if ((normEmail && appEmail && normEmail === appEmail) || (cleanId && appCleanId && cleanId === appCleanId)) {
            const isEligibleToReapply = ['Removed', 'Expired', 'Rejected'].includes(data.status);
            if (!isEligibleToReapply) {
              isDuplicate = true;
              matchedApp = { ...data, id: d.id };
            }
          }
        }
      });

      if (isDuplicate) {
        return res.status(409).json({
          error: 'You already applied for this scholarship',
          reference_code: matchedApp?.reference_code,
          status: matchedApp?.status,
        });
      }

      const newId = req.body.id || `app-${Date.now()}`;
      const annualIncome = req.body.annual_family_income !== undefined
        ? Number(req.body.annual_family_income) || 0
        : (req.body.monthly_family_income !== undefined ? Number(req.body.monthly_family_income) * 12 : 0);

      const appData = {
        ...req.body,
        id: newId,
        scholarship_id,
        email,
        student_number,
        annual_family_income: annualIncome,
        created_at: req.body.created_at || new Date().toISOString(),
        status: req.body.status || 'Pending',
      };

      await setDoc(doc(db, 'applications', newId), appData);
      res.status(201).json({ message: 'Application created in Cloud Firestore', application: appData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/applications/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const data = { ...req.body, id, updated_at: new Date().toISOString() };
      await setDoc(doc(db, 'applications', id), data, { merge: true });
      res.json({ message: 'Application updated in Cloud Firestore', application: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/applications/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await deleteDoc(doc(db, 'applications', id));
      res.json({ message: `Application ${id} deleted from Cloud Firestore` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FREEZE PERIODS API (Default descending chronological sort)
  app.get('/api/freeze-periods', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'freeze_periods'));
      const periods: any[] = [];
      snap.forEach((d) => {
        periods.push({ ...d.data(), id: d.id });
      });
      periods.sort((a, b) => new Date(b.created_at || b.start_date || '').getTime() - new Date(a.created_at || a.start_date || '').getTime());
      res.json({ count: periods.length, freeze_periods: periods });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/freeze-periods', async (req, res) => {
    try {
      const id = req.body.id || `freeze-${Date.now()}`;
      const record = { ...req.body, id, created_at: req.body.created_at || new Date().toISOString() };
      await setDoc(doc(db, 'freeze_periods', id), record);
      res.status(201).json({ message: 'Freeze period saved in Cloud Firestore', freeze_period: record });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/freeze-periods/:id', async (req, res) => {
    try {
      await deleteDoc(doc(db, 'freeze_periods', req.params.id));
      res.json({ message: `Freeze period ${req.params.id} deleted` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // INTERVIEWS API (Default descending chronological sort)
  app.get('/api/interviews', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'interviews'));
      const interviews: any[] = [];
      snap.forEach((d) => {
        interviews.push({ ...d.data(), id: d.id });
      });
      interviews.sort((a, b) => (b.date_time || '').localeCompare(a.date_time || ''));
      res.json({ count: interviews.length, interviews });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/interviews', async (req, res) => {
    try {
      const id = req.body.id || `interview-${Date.now()}`;
      const interview = { ...req.body, id };
      await setDoc(doc(db, 'interviews', id), interview);
      res.status(201).json({ message: 'Interview scheduled in Cloud Firestore', interview });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/interviews/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const interview = { ...req.body, id };
      await setDoc(doc(db, 'interviews', id), interview, { merge: true });
      res.json({ message: 'Interview updated in Cloud Firestore', interview });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/interviews/:id', async (req, res) => {
    try {
      await deleteDoc(doc(db, 'interviews', req.params.id));
      res.json({ message: `Interview ${req.params.id} deleted` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // STAFF APPLICATIONS API
  app.get('/api/staff-applications', async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'staff_applications'));
      const apps: any[] = [];
      snap.forEach((d) => {
        apps.push({ ...d.data(), id: d.id });
      });
      apps.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      res.json({ count: apps.length, staff_applications: apps });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/staff-applications', async (req, res) => {
    try {
      const email = (req.body.institutional_email || req.body.email || '').trim().toLowerCase();
      const staffId = (req.body.staff_id || req.body.staff_id_number || '').trim();

      if (!email) {
        return res.status(400).json({ error: 'Institutional email is required.' });
      }

      // Check existing staff applications for duplicate email or staff ID
      const appSnap = await getDocs(collection(db, 'staff_applications'));
      let emailDuplicate = false;
      let idDuplicate = false;

      appSnap.forEach((d) => {
        const a = d.data();
        const aEmail = (a.institutional_email || a.email || '').trim().toLowerCase();
        const aStaffId = (a.staff_id || a.staff_id_number || '').trim();
        if (aEmail && aEmail === email) emailDuplicate = true;
        if (staffId && aStaffId && aStaffId === staffId) idDuplicate = true;
      });

      // Check existing users for duplicate email or staff ID
      const userSnap = await getDocs(collection(db, 'users'));
      userSnap.forEach((d) => {
        const u = d.data();
        const uEmail = (u.email || '').trim().toLowerCase();
        if (uEmail && uEmail === email) emailDuplicate = true;
        if (staffId && (d.id === staffId || d.id === `user-${staffId}`)) idDuplicate = true;
      });

      if (emailDuplicate) {
        return res.status(409).json({
          error: `The Institutional Email "${req.body.institutional_email || req.body.email}" is already registered in the system.`,
        });
      }

      if (idDuplicate) {
        return res.status(409).json({
          error: `The Staff ID Number "${staffId}" is already registered in the system.`,
        });
      }

      const newId = req.body.id || `staff-app-${Date.now()}`;
      const appData = {
        ...req.body,
        id: newId,
        email,
        institutional_email: email,
        staff_id: staffId,
        staff_id_number: staffId,
        status: req.body.status || 'Pending',
        created_at: req.body.created_at || new Date().toISOString(),
      };
      await setDoc(doc(db, 'staff_applications', newId), appData);
      res.status(201).json({ message: 'Staff application created', staff_application: appData });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/staff-applications/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const data = { ...req.body, id, updated_at: new Date().toISOString() };
      await setDoc(doc(db, 'staff_applications', id), data, { merge: true });
      res.json({ message: 'Staff application updated', staff_application: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // BRANDING & LOGO API
  app.get('/api/branding', async (req, res) => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'branding'));
      if (snap.exists()) {
        res.json(snap.data());
      } else {
        res.json({ logoUrl: '/scholarflow_LOGO.png' });
      }
    } catch (error: any) {
      res.json({ logoUrl: '/scholarflow_LOGO.png' });
    }
  });

  app.post('/api/upload-logo', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 required' });
      }
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const pubDir = path.join(process.cwd(), 'public');
      const distDir = path.join(process.cwd(), 'dist');
      const assetsDir = path.join(process.cwd(), 'src', 'assets', 'images');

      if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
      if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

      fs.writeFileSync(path.join(pubDir, 'scholarflow_LOGO.png'), buffer);
      fs.writeFileSync(path.join(distDir, 'scholarflow_LOGO.png'), buffer);
      fs.writeFileSync(path.join(assetsDir, 'scholarflow_LOGO.png'), buffer);

      // Save into Firestore settings for persistence across rebuilds
      try {
        await setDoc(doc(db, 'settings', 'branding'), {
          logoUrl: '/scholarflow_LOGO.png',
          logoBase64: imageBase64,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.warn('Could not persist logo to Firestore:', e);
      }

      res.json({ success: true, url: '/scholarflow_LOGO.png?t=' + Date.now() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Frontend Vite Middleware Setup (SPA)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian University Full-Stack Server running on http://localhost:${PORT}`);
    console.log(`Cloud Firestore Database: ${firebaseConfig.firestoreDatabaseId}`);
  });
}

startServer();
