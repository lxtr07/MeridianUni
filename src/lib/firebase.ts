import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  setLogLevel,
  deleteField,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Scholarship,
  Application,
  FreezePeriod,
  InterviewSchedule,
  UserProfile,
  StaffApplication,
} from '../types';
import {
  INITIAL_SCHOLARSHIPS,
  INITIAL_APPLICATIONS,
  INITIAL_INTERVIEWS,
  INITIAL_FACULTY_ACCOUNTS,
  INITIAL_STUDENT_ACCOUNTS,
  INITIAL_STAFF_APPLICATIONS,
} from '../data/initialData';
import { verifyPassword } from './crypto';
import type { LogEntry } from './logger';

// Suppress internal Firestore gRPC stream idle timeout logs
setLogLevel('silent');

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// CRITICAL: Connect to configured Firestore database instance
// Use the default Firestore database when the configured ID is "(default)" or empty
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db =
  firestoreDbId && firestoreDbId !== '(default)'
    ? getFirestore(app, firestoreDbId)
    : getFirestore(app);
export const auth = getAuth(app);

// Standardized Operation Types & Error Handler conforming to SKILL.md
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code;

  // Ignore benign transient gRPC stream idle timeouts and cancellations
  if (
    errCode === 'cancelled' ||
    errMsg.includes('Disconnecting idle stream') ||
    errMsg.includes('Timed out waiting for new targets') ||
    errMsg.includes('Code: 1')
  ) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  // Conform strictly to SKILL.md: Throw JSON error if permission denied
  if (
    errCode === 'permission-denied' ||
    errMsg.includes('insufficient permissions') ||
    errMsg.includes('Missing or insufficient permissions')
  ) {
    console.error('Firestore Permission Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

// Connection check on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Successfully connected to Cloud Firestore');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or initializing.');
      return false;
    }
    // Connection test document not existing is standard behavior (not an error)
    return true;
  }
}

// Initial connection check
testConnection();

// Collection constants
export const COLLECTIONS = {
  SCHOLARSHIPS: 'scholarships',
  APPLICATIONS: 'applications',
  FREEZE_PERIODS: 'freeze_periods',
  INTERVIEWS: 'interviews',
  USERS: 'users',
  STAFF_APPLICATIONS: 'staff_applications',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
};

/** All seeded login accounts (staff, administrator and pre-activated students). */
export const SEEDED_ACCOUNTS: UserProfile[] = [...INITIAL_FACULTY_ACCOUNTS, ...INITIAL_STUDENT_ACCOUNTS];

/**
 * Bump this whenever the seed data changes shape. On first load after a bump, the demo
 * collections are replaced with the new seed (program-scoped scholarships, registrar-backed
 * applications, strong default passwords). User-created staff accounts are kept.
 */
export const DATA_VERSION = 5;  // bumped: updated passwords + cleaned applications

// -------------------------------------------------------------
// Seeding & Initialization
// -------------------------------------------------------------
export async function seedFirestoreIfEmpty(): Promise<void> {
  const path = COLLECTIONS.SETTINGS + '/data_version';
  try {
    const verSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'data_version'));
    const currentVersion = verSnap.exists() ? Number(verSnap.data().version) || 0 : 0;

    if (currentVersion >= DATA_VERSION) {
      // Make sure the seeded accounts still exist, but never overwrite a password someone changed.
      const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
      const existingIds = new Set<string>();
      usersSnap.forEach((d) => existingIds.add(d.id));
      for (const acc of SEEDED_ACCOUNTS) {
        if (!existingIds.has(acc.id)) {
          await setDoc(doc(db, COLLECTIONS.USERS, acc.id), acc);
        }
      }
      return;
    }

    console.log(`Migrating ScholarFlow demo data from v${currentVersion} to v${DATA_VERSION}...`);

    const replaceCollection = async (name: string, records: { id: string }[]) => {
      const keep = new Set(records.map((r) => r.id));
      const snap = await getDocs(collection(db, name));
      for (const d of snap.docs) {
        if (!keep.has(d.id)) {
          await deleteDoc(doc(db, name, d.id)).catch(() => {});
        }
      }
      for (const r of records) {
        await setDoc(doc(db, name, r.id), r).catch((err) => console.warn(`Seed write failed (${name}/${r.id}):`, err));
      }
    };

    await replaceCollection(COLLECTIONS.SCHOLARSHIPS, INITIAL_SCHOLARSHIPS);
    await replaceCollection(COLLECTIONS.APPLICATIONS, INITIAL_APPLICATIONS);
    await replaceCollection(COLLECTIONS.INTERVIEWS, INITIAL_INTERVIEWS);
    await replaceCollection(COLLECTIONS.STAFF_APPLICATIONS, INITIAL_STAFF_APPLICATIONS);

    // Seeded accounts are rewritten (this is what replaces the old weak default passwords).
    // Other staff accounts created through the portal are kept; they will be asked to set a
    // strong password on their next sign-in if their current one does not meet the policy.
    for (const acc of SEEDED_ACCOUNTS) {
      await setDoc(doc(db, COLLECTIONS.USERS, acc.id), acc).catch((err) => console.warn('Seed account write failed:', err));
    }

    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'data_version'), {
      version: DATA_VERSION,
      migrated_at: new Date().toISOString(),
    });
    console.log('ScholarFlow demo data is up to date.');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function resetFirestoreScholarships(): Promise<Scholarship[]> {
  const path = COLLECTIONS.SCHOLARSHIPS;
  try {
    const batch = writeBatch(db);
    for (const sch of INITIAL_SCHOLARSHIPS) {
      batch.set(doc(db, COLLECTIONS.SCHOLARSHIPS, sch.id), sch);
    }
    await batch.commit();
    return INITIAL_SCHOLARSHIPS;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return INITIAL_SCHOLARSHIPS;
  }
}

// -------------------------------------------------------------
// Real-time Subscriptions & CRUD
// -------------------------------------------------------------

// SCHOLARSHIPS
export function subscribeScholarships(
  onData: (scholarships: Scholarship[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = COLLECTIONS.SCHOLARSHIPS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: Scholarship[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Scholarship);
      });
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveScholarshipToFirestore(scholarship: Scholarship): Promise<void> {
  const path = `${COLLECTIONS.SCHOLARSHIPS}/${scholarship.id}`;
  try {
    const payload: any = { ...scholarship };
    if (!payload.is_frozen || !payload.freeze_note) {
      payload.freeze_note = deleteField();
    }
    await setDoc(doc(db, COLLECTIONS.SCHOLARSHIPS, scholarship.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateScholarshipFreezeInFirestore(
  id: string,
  is_frozen: boolean,
  freeze_note?: string
): Promise<void> {
  const path = `${COLLECTIONS.SCHOLARSHIPS}/${id}`;
  try {
    const updateData: any = {
      is_frozen,
    };
    if (is_frozen && freeze_note) {
      updateData.freeze_note = freeze_note;
    } else {
      updateData.freeze_note = deleteField();
    }
    await setDoc(doc(db, COLLECTIONS.SCHOLARSHIPS, id), updateData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteScholarshipFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.SCHOLARSHIPS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SCHOLARSHIPS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// APPLICATIONS
export function subscribeApplications(
  onData: (applications: Application[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = COLLECTIONS.APPLICATIONS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: Application[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Application);
      });
      // Sort applications descending by creation timestamp
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createApplicationInFirestore(application: Application): Promise<void> {
  const path = `${COLLECTIONS.APPLICATIONS}/${application.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.APPLICATIONS, application.id), application);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateApplicationInFirestore(application: Application): Promise<void> {
  const path = `${COLLECTIONS.APPLICATIONS}/${application.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.APPLICATIONS, application.id), application, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteApplicationFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.APPLICATIONS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.APPLICATIONS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// FREEZE PERIODS
export function subscribeFreezePeriods(
  onData: (periods: FreezePeriod[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = COLLECTIONS.FREEZE_PERIODS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: FreezePeriod[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as FreezePeriod);
      });
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveFreezePeriodToFirestore(period: FreezePeriod): Promise<void> {
  const path = `${COLLECTIONS.FREEZE_PERIODS}/${period.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.FREEZE_PERIODS, period.id), period);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// INTERVIEWS
export function subscribeInterviews(
  onData: (interviews: InterviewSchedule[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = COLLECTIONS.INTERVIEWS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: InterviewSchedule[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as InterviewSchedule);
      });
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveInterviewToFirestore(interview: InterviewSchedule): Promise<void> {
  const path = `${COLLECTIONS.INTERVIEWS}/${interview.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.INTERVIEWS, interview.id), interview, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteInterviewFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.INTERVIEWS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.INTERVIEWS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// USER PROFILES (Professors, Staff, and Administrators)
export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = COLLECTIONS.USERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as UserProfile);
      });
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function fetchUsersFromFirestore(): Promise<UserProfile[]> {
  const path = COLLECTIONS.USERS;
  try {
    const snap = await getDocs(collection(db, path));
    const list: UserProfile[] = [];
    snap.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as UserProfile);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getUserFromFirestore(userId: string): Promise<UserProfile | null> {
  const path = `${COLLECTIONS.USERS}/${userId}`;
  try {
    const docSnap = await getDocFromServer(doc(db, COLLECTIONS.USERS, userId));
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${user.id}`;
  try {
    const updatedUser = {
      ...user,
      updated_at: new Date().toISOString(),
    };
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), updatedUser, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${userId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Unified sign-in. The identifier can be an institutional email, a Student Number or a Staff ID.
 * The role is taken from the matched account — the person never chooses it.
 */
export function findAccountByIdentifier(users: UserProfile[], identifier: string): UserProfile | undefined {
  const raw = identifier.trim().toLowerCase();
  const digits = raw.replace(/\D/g, '');
  return users.find((u) => {
    if (u.email && u.email.trim().toLowerCase() === raw) return true;
    if (digits.length >= 6 && digits === raw && u.university_id && u.university_id === digits) return true;
    return false;
  });
}

export async function authenticateUserWithFirestore(
  identifier: string,
  pass: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const GENERIC_ERROR = 'The ID/email or password you entered is incorrect.';
  try {
    let users = await fetchUsersFromFirestore();
    if (users.length === 0) {
      console.warn('Firestore users collection empty or unreachable — using seeded accounts for authentication.');
      users = SEEDED_ACCOUNTS;
    }

    const matchedUser = findAccountByIdentifier(users, identifier);
    if (!matchedUser || !matchedUser.password) {
      return { user: null, error: GENERIC_ERROR };
    }

    const stored = matchedUser.password;
    const isHash = stored.length === 64 && /^[0-9a-f]+$/.test(stored);
    const passwordMatches = isHash ? await verifyPassword(pass, stored) : pass === stored;

    if (!passwordMatches) {
      return { user: null, error: GENERIC_ERROR };
    }

    return { user: matchedUser, error: null };
  } catch (error) {
    console.error('Firestore authentication error:', error);
    return {
      user: null,
      error: 'We could not reach the account database. Check your internet connection and try again.',
    };
  }
}

export async function updateUserSessionTokenInFirestore(
  userId: string,
  sessionToken: string
): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${userId}`;
  try {
    await setDoc(
      doc(db, COLLECTIONS.USERS, userId),
      {
        active_session_token: sessionToken,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -------------------------------------------------------------
// STAFF ACCOUNT APPLICATIONS
// -------------------------------------------------------------
export function subscribeStaffApplications(
  onData: (apps: StaffApplication[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = COLLECTIONS.STAFF_APPLICATIONS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: StaffApplication[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as StaffApplication);
      });
      list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      onData(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function fetchStaffApplicationsFromFirestore(): Promise<StaffApplication[]> {
  const path = COLLECTIONS.STAFF_APPLICATIONS;
  try {
    const snap = await getDocs(collection(db, path));
    const list: StaffApplication[] = [];
    snap.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id } as StaffApplication);
    });
    list.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function createStaffApplicationInFirestore(appData: StaffApplication): Promise<void> {
  const path = `${COLLECTIONS.STAFF_APPLICATIONS}/${appData.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STAFF_APPLICATIONS, appData.id), appData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStaffApplicationInFirestore(appData: StaffApplication): Promise<void> {
  const path = `${COLLECTIONS.STAFF_APPLICATIONS}/${appData.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STAFF_APPLICATIONS, appData.id), {
      ...appData,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}


// -------------------------------------------------------------
// AUDIT & ACCESS LOGS
// -------------------------------------------------------------
export async function writeAuditLogToFirestore(entry: LogEntry): Promise<void> {
  const clean: Record<string, unknown> = {};
  Object.entries(entry).forEach(([k, v]) => {
    if (v !== undefined) clean[k] = v;
  });
  await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, entry.id), clean);
}

export function subscribeAuditLogs(
  onData: (logs: LogEntry[]) => void,
  onError?: (err: Error) => void,
  max = 2000
): () => void {
  const q = query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LogEntry[] = [];
      snapshot.forEach((d) => list.push({ ...(d.data() as LogEntry), id: d.id }));
      onData(list);
    },
    (error) => {
      onError?.(error);
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.AUDIT_LOGS);
      } catch {
        // permission errors are surfaced through onError
      }
    }
  );
}
