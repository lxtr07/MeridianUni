import {
  Scholarship,
  Application,
  FreezePeriod,
  InterviewSchedule,
  UserProfile,
  StaffApplication,
} from '../types';
import {
  createApplicationInFirestore,
  updateApplicationInFirestore,
  deleteApplicationFromFirestore,
  saveScholarshipToFirestore,
  deleteScholarshipFromFirestore,
  saveFreezePeriodToFirestore,
  saveInterviewToFirestore,
  deleteInterviewFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  createStaffApplicationInFirestore,
  updateStaffApplicationInFirestore,
} from './firebase';

/**
 * Data Synchronization Service
 *
 * Cloud Firestore is the system of record. The Express REST API (server.ts) is optional:
 * it only exists when the app is run with `npm run dev` / `npm start`. On static hosting
 * such as GitHub Pages there is no server, and every POST/PUT to /api/* comes back as
 * "405 Method Not Allowed" — which is where the old "Server responded with 405" errors came from.
 *
 * So we check once whether the API is really there, and only mirror writes to it when it is.
 */

let apiCheck: Promise<boolean> | null = null;

/** True only when /api/health answers with JSON (i.e. the Express server is running). */
export function isBackendApiAvailable(): Promise<boolean> {
  if (!apiCheck) {
    apiCheck = fetch('/api/health', { method: 'GET' })
      .then(async (r) => {
        const type = r.headers.get('content-type') || '';
        if (!r.ok || !type.includes('application/json')) return false;
        const body = await r.json().catch(() => null);
        return Boolean(body && body.status === 'healthy');
      })
      .catch(() => false);
  }
  return apiCheck;
}

/** Sends a request to the optional REST API. Resolves to null when the API is not deployed. */
async function callApi(url: string, init: RequestInit): Promise<Response | null> {
  if (!(await isBackendApiAvailable())) return null;
  try {
    return await fetch(url, init);
  } catch (err) {
    console.warn('REST API mirror notice:', err);
    return null;
  }
}

/** Turns low-level errors into a sentence a staff member can act on. */
export function describeSaveError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/permission|insufficient/i.test(msg)) {
    return 'The database refused this change (permission denied). Ask the system administrator to publish the latest Firestore security rules, then try again.';
  }
  if (/offline|network|failed to fetch|unavailable/i.test(msg)) {
    return 'You appear to be offline, so the change could not be saved. Check your internet connection and try again.';
  }
  if (/405/.test(msg)) {
    return 'The request was sent to a server address that does not accept changes (HTTP 405). Your change has been saved to the database directly instead.';
  }
  return msg || 'The change could not be saved. Please try again.';
}

// -------------------------------------------------------------
// APPLICATIONS
// -------------------------------------------------------------

export async function syncCreateApplication(application: Application): Promise<Application> {
  const backendPromise = callApi('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(application),
  }).then(async (res) => {
    if (res && !res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 409) {
        throw new Error(errData.error || 'You already applied for this scholarship');
      }
      console.warn('Backend API submission warning:', errData.error || res.statusText);
    }
  }).catch((apiErr: any) => {
    if (apiErr?.message?.includes('already applied')) {
      throw apiErr;
    }
    console.warn('Direct backend API notice:', apiErr);
  });

  const firestorePromise = createApplicationInFirestore(application).catch((firestoreErr) => {
    console.warn('Client Firestore write notice (backend handles persistence):', firestoreErr);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
  return application;
}

export async function syncUpdateApplication(application: Application): Promise<Application> {
  const backendPromise = callApi(`/api/applications/${application.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(application),
  }).catch((apiErr) => {
    console.warn('Backend update notice:', apiErr);
  });

  const firestorePromise = updateApplicationInFirestore(application).catch((firestoreErr) => {
    console.warn('Client Firestore update notice:', firestoreErr);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
  return application;
}

export async function syncDeleteApplication(id: string): Promise<void> {
  const backendPromise = callApi(`/api/applications/${id}`, {
    method: 'DELETE',
  }).catch((apiErr) => {
    console.warn('Backend delete notice:', apiErr);
  });

  const firestorePromise = deleteApplicationFromFirestore(id).catch((firestoreErr) => {
    console.warn('Client Firestore delete notice:', firestoreErr);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
}

// -------------------------------------------------------------
// SCHOLARSHIPS
// -------------------------------------------------------------

export async function syncSaveScholarship(scholarship: Scholarship): Promise<Scholarship> {
  const backendPromise = callApi(`/api/scholarships/${scholarship.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scholarship),
  }).catch((apiErr) => {
    console.warn('Backend scholarship save notice:', apiErr);
  });

  const firestorePromise = saveScholarshipToFirestore(scholarship).catch((firestoreErr) => {
    console.warn('Client Firestore scholarship notice:', firestoreErr);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
  return scholarship;
}

export async function syncDeleteScholarship(id: string): Promise<void> {
  const backendPromise = callApi(`/api/scholarships/${id}`, {
    method: 'DELETE',
  }).catch((apiErr) => {
    console.warn('Backend scholarship delete notice:', apiErr);
  });

  const firestorePromise = deleteScholarshipFromFirestore(id).catch((firestoreErr) => {
    console.warn('Client Firestore scholarship delete notice:', firestoreErr);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
}

// -------------------------------------------------------------
// FREEZE PERIODS & INTERVIEWS
// -------------------------------------------------------------

export async function syncSaveFreezePeriod(period: FreezePeriod): Promise<FreezePeriod> {
  const backendPromise = callApi('/api/freeze-periods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(period),
  }).catch((err) => {
    console.warn('Backend freeze save notice:', err);
  });

  const firestorePromise = saveFreezePeriodToFirestore(period).catch((err) => {
    console.warn('Firestore freeze save notice:', err);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
  return period;
}

export async function syncSaveInterview(interview: InterviewSchedule): Promise<InterviewSchedule> {
  const backendPromise = callApi('/api/interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(interview),
  }).catch((err) => {
    console.warn('Backend interview save notice:', err);
  });

  const firestorePromise = saveInterviewToFirestore(interview).catch((err) => {
    console.warn('Firestore interview save notice:', err);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
  return interview;
}

export async function syncDeleteInterview(id: string): Promise<void> {
  const backendPromise = callApi(`/api/interviews/${id}`, {
    method: 'DELETE',
  }).catch((err) => {
    console.warn('Backend interview delete notice:', err);
  });

  const firestorePromise = deleteInterviewFromFirestore(id).catch((err) => {
    console.warn('Firestore interview delete notice:', err);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
}

// -------------------------------------------------------------
// STAFF ACCOUNT APPLICATIONS
// -------------------------------------------------------------

export async function syncCreateStaffApplication(app: StaffApplication): Promise<StaffApplication> {
  // Firestore is authoritative: if this fails the error bubbles up with a readable message.
  await createStaffApplicationInFirestore(app);

  // Mirror to the REST API only when it is actually deployed.
  const res = await callApi('/api/staff-applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(app),
  });
  if (res && !res.ok && res.status === 409) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'This staff ID already has an access request.');
  }
  return app;
}

export async function syncUpdateStaffApplication(app: StaffApplication): Promise<StaffApplication> {
  const backendPromise = callApi(`/api/staff-applications/${app.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(app),
  }).catch((err) => {
    console.warn('Backend staff app update notice:', err);
  });

  const firestorePromise = updateStaffApplicationInFirestore(app).catch((err) => {
    console.warn('Firestore staff app update notice:', err);
  });

  await Promise.allSettled([backendPromise, firestorePromise]);
  return app;
}

export async function syncSaveUser(user: UserProfile): Promise<UserProfile> {
  // Firestore first; a failure here is reported to the person making the change.
  await saveUserToFirestore(user);
  callApi(`/api/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  }).catch(() => {});
  return user;
}

export async function syncDeleteUser(userId: string): Promise<void> {
  await deleteUserFromFirestore(userId);
  callApi(`/api/users/${userId}`, { method: 'DELETE' }).catch(() => {});
}

// -------------------------------------------------------------
// INITIAL RECOVERY & SYNC FETCH
// -------------------------------------------------------------

export async function fetchAllBackendData() {
  const results = {
    scholarships: [] as Scholarship[],
    applications: [] as Application[],
    freezePeriods: [] as FreezePeriod[],
    interviews: [] as InterviewSchedule[],
    staffApplications: [] as StaffApplication[],
  };

  try {
    if (!(await isBackendApiAvailable())) return results;
    const get = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null));
    const [resSch, resApp, resFreeze, resInterviews, resStaffApps] = await Promise.allSettled([
      get('/api/scholarships'),
      get('/api/applications'),
      get('/api/freeze-periods'),
      get('/api/interviews'),
      get('/api/staff-applications'),
    ]);

    if (resSch.status === 'fulfilled' && resSch.value?.scholarships) {
      results.scholarships = resSch.value.scholarships;
    }
    if (resApp.status === 'fulfilled' && resApp.value?.applications) {
      results.applications = resApp.value.applications;
    }
    if (resFreeze.status === 'fulfilled' && resFreeze.value?.freeze_periods) {
      results.freezePeriods = resFreeze.value.freeze_periods;
    }
    if (resInterviews.status === 'fulfilled' && resInterviews.value?.interviews) {
      results.interviews = resInterviews.value.interviews;
    }
    if (resStaffApps.status === 'fulfilled' && resStaffApps.value?.staff_applications) {
      results.staffApplications = resStaffApps.value.staff_applications;
    }
  } catch (err) {
    console.warn('Data sync initial fetch notice:', err);
  }

  return results;
}

