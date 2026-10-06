import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './components/portal/LandingPage';
import { StudentPortal } from './components/student/StudentPortal';
import { SignInPage } from './components/auth/SignInPage';
import { StaffPanel } from './components/staff/StaffPanel';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { HelpGuideModal } from './components/common/HelpGuideModal';
import { LogoutConfirmationModal } from './components/common/LogoutConfirmationModal';
import { NotificationSidebar } from './components/common/NotificationSidebar';
import {
  getStoredActiveUser,
  saveStoredActiveUser,
  getStoredSessionToken,
  saveStoredSessionToken,
  getDisplacedSessionNotice,
  setDisplacedSessionNotice,
} from './lib/storage';
import {
  seedFirestoreIfEmpty,
  subscribeScholarships,
  subscribeApplications,
  subscribeFreezePeriods,
  subscribeInterviews,
  subscribeUsers,
  saveScholarshipToFirestore,
  updateScholarshipFreezeInFirestore,
  updateUserSessionTokenInFirestore,
  deleteScholarshipFromFirestore,
  createApplicationInFirestore,
  updateApplicationInFirestore,
  deleteApplicationFromFirestore,
  saveFreezePeriodToFirestore,
  resetFirestoreScholarships,
  saveUserToFirestore,
  deleteUserFromFirestore,
  subscribeStaffApplications,
  createStaffApplicationInFirestore,
  updateStaffApplicationInFirestore,
  writeAuditLogToFirestore,
} from './lib/firebase';
import {
  fetchAllBackendData,
  syncCreateApplication,
  syncUpdateApplication,
  syncDeleteApplication,
  syncSaveScholarship,
  syncDeleteScholarship,
  syncSaveFreezePeriod,
  syncSaveInterview,
  syncDeleteInterview,
  syncCreateStaffApplication,
  syncUpdateStaffApplication,
  syncSaveUser,
  syncDeleteUser,
  describeSaveError,
} from './lib/dataSync';
import { Scholarship, Application, FreezePeriod, UserProfile, InterviewSchedule, ApplicationStatus, StaffApplication, normalizeStaffRole } from './types';
import { checkDuplicateApplication } from './lib/duplicateCheck';
import { logEvent, logVisit, registerLogWriter, setLogActor } from './lib/logger';
import { actorLabelFor } from './lib/auditTrail';
import { startIdleTimer, IDLE_MINUTES } from './lib/idleTimer';
import { INITIAL_STAFF_APPLICATIONS } from './data/initialData';
import { checkEligibility, SLOT_HOLDING_STATUSES } from './lib/scholarshipRules';
import { findRegistrarStudent, findHrStaff } from './data/universityRegistry';

registerLogWriter(writeAuditLogToFirestore);

type View = 'portal' | 'student' | 'login' | 'staff' | 'admin';
// 'admin' view is shared by Scholarship Coordinator and System Administrator — the dashboard
// itself role-gates which tabs render. 'admin' is also the legacy role value.
const isAdminLevel = (role?: string): boolean => role === 'coordinator' || role === 'system_admin' || role === 'admin';
const homeViewFor = (role?: string): View =>
  isAdminLevel(role) ? 'admin' : role === 'staff' ? 'staff' : role === 'student' ? 'student' : 'portal';
import { isDeadlinePassed } from './components/student/ScholarshipCatalog';
import { hashPassword } from './lib/crypto';

export default function App() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(() => getStoredActiveUser());
  const [displacedNotice, setDisplacedNotice] = useState<string | null>(() => getDisplacedSessionNotice());
  const [currentView, setCurrentView] = useState<'portal' | 'student' | 'login' | 'staff' | 'admin'>(() => {
    const user = getStoredActiveUser();

    // Route Guard: Check URL query, hash, or pathname for direct navigation attempts (e.g. /admin, /staff)
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRoute =
      urlParams.get('route') ||
      urlParams.get('view') ||
      (window.location.hash ? window.location.hash.replace('#', '').replace('/', '') : '');
    const pathname = window.location.pathname.toLowerCase();
    const isDirectAdmin = requestedRoute === 'admin' || pathname.endsWith('/admin');
    const isDirectStaff = requestedRoute === 'staff' || pathname.endsWith('/staff');

    // If an unauthenticated user attempts to access /admin or /staff directly,
    // intercept and redirect directly to login view
    if (isDirectAdmin) {
      if (!user || !isAdminLevel(user.role)) {
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname.split('?')[0]);
        }
        return 'login';
      }
      return 'admin';
    }

    if (isDirectStaff) {
      if (!user || (user.role !== 'staff' && !isAdminLevel(user.role))) {
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname.split('?')[0]);
        }
        return 'login';
      }
      return 'staff';
    }

    if (requestedRoute === 'login') return user ? homeViewFor(user.role) : 'login';
    if (requestedRoute === 'student') return user?.role === 'student' ? 'student' : 'login';
    if (user) return homeViewFor(user.role);

    // Strict Landing Page Default Route: Base URL/root of the website strictly defaults to the public Landing Page ('portal').
    // Users should not bypass the landing page or be forced straight into a login screen upon first visit.
    return 'portal';
  });

  const [studentInitialTab, setStudentInitialTab] = useState<'catalog' | 'renewal' | 'tracker'>('catalog');
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [idleWarning, setIdleWarning] = useState<number | null>(null); // seconds remaining, null = not warning

  useEffect(() => {
    setLogActor(activeUser ? { id: activeUser.id, full_name: activeUser.full_name, role: activeUser.role, label: actorLabelFor(activeUser) } : null);
    if (!activeUser) { setIdleWarning(null); return; }
    const stop = startIdleTimer({
      onWarn: (secs) => setIdleWarning(secs),
      onLogout: () => {
        logEvent('Security', 'Authentication', `Session auto-ended after ${IDLE_MINUTES} minutes of inactivity`, { action: 'logout.idle' });
        handleLogout();
      },
    });
    return stop;
  }, [activeUser?.id]);
  const [selectedLandingScholarship, setSelectedLandingScholarship] = useState<Scholarship | null>(null);
  const [activeGuideModal, setActiveGuideModal] = useState<'requirements' | 'faq' | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const changeView = (
    view: 'portal' | 'student' | 'login' | 'staff' | 'admin',
    tab?: 'catalog' | 'renewal' | 'tracker'
  ) => {
    if (view === 'student' && tab) {
      setStudentInitialTab(tab);
    }
    setCurrentView(view);
    sessionStorage.setItem('scholarflow_current_view', view);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Scroll to top automatically whenever the view changes, and record the visit
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const adminWorkspaceName =
      activeUser?.role === 'system_admin' ? 'system administrator workspace' : 'scholarship coordinator workspace';
    const names: Record<View, string> = { portal: 'public home', student: 'student portal', login: 'sign-in', staff: 'staff workspace', admin: adminWorkspaceName };
    logVisit(names[currentView as View] || currentView);
  }, [currentView]);

  // Live Cloud Firestore Data State
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [freezePeriods, setFreezePeriods] = useState<FreezePeriod[]>([]);
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  // Names offered when scheduling an interview (staff accounts with the Interviewer sub-role).
  // A person who is also on file as an Evaluator (same Staff ID, email or name) is not offered.
  const interviewerNames = (() => {
    const staff = users.filter((u) => u.role === 'staff');
    const keys = (u: UserProfile) => [u.university_id, u.email?.toLowerCase(), u.full_name?.trim().toLowerCase()].filter(Boolean) as string[];
    const notInterviewer = new Set(staff.filter((u) => normalizeStaffRole(u.staff_role) !== 'interviewer').flatMap(keys));
    const names = staff
      .filter((u) => normalizeStaffRole(u.staff_role) === 'interviewer' && !keys(u).some((k) => notInterviewer.has(k)))
      .map((u) => u.full_name);
    return Array.from(new Set(names));
  })();
  const [staffApplications, setStaffApplications] = useState<StaffApplication[]>(INITIAL_STAFF_APPLICATIONS);

  // Repair: an interview that was finished but whose application never moved on (e.g. the interview record was
  // not linked to the application). When the Interviewer is signed in, the recorded result is applied once.
  const reconciled = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!(activeUser?.role === 'staff' && activeUser.staff_role === 'interviewer')) return;
    for (const iv of interviews) {
      if (iv.status !== 'Completed' || !iv.outcome || reconciled.current.has(iv.id)) continue;
      const app = applications.find((a) => a.id === iv.application_id || a.reference_code === iv.application_id);
      if (!app) continue;
      reconciled.current.add(iv.id);
      if (!['Shortlisted', 'In Review', 'Pending'].includes(app.status)) continue;
      const now = new Date().toISOString();
      const endorse = iv.outcome.recommendation === 'recommend';
      handleUpdateApplicationFromStaff({
        ...app,
        status: endorse ? 'For Approval' : 'Rejected',
        remarks: endorse
          ? 'Your interview is done. Your application has been endorsed to the Scholarship Coordinator for the final decision.'
          : 'Your application was not selected after the interview.',
        ...(endorse ? { endorsed_by: iv.outcome.completed_by || activeUser?.full_name, endorsed_at: iv.outcome.completed_at || now } : { awarded_amount: 0 }),
        updated_at: now,
      }).catch((e) => console.error('Could not apply interview result:', e));
      // Any leftover open schedule for this application is no longer needed.
      interviews
        .filter((o) => o.id !== iv.id && o.status !== 'Completed' && (o.application_id === app.id || o.application_id === app.reference_code))
        .forEach((o) => handleDeleteInterview(o.id));
    }
  }, [interviews, applications, activeUser]);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  /**
   * Computes remaining scholarship slots accurately based on the actual recorded
   * student applications in the database (active non-rejected applications).
   */
  const calculateRemainingSlots = (scholarship: Scholarship, allApps: Application[]): number => {
    const activeCount = allApps.filter(
      (app) =>
        (app.scholarship_id === scholarship.id || app.scholarship_title === scholarship.title) &&
        SLOT_HOLDING_STATUSES.includes(app.status)
    ).length;
    return Math.max(0, scholarship.slots - activeCount);
  };

  // Derive real-time accurate scholarships where slots_remaining is dynamically
  // synchronized with the exact number of active student applications recorded in the database.
  const accurateScholarships = useMemo(() => {
    return scholarships.map((sch) => ({
      ...sch,
      slots_remaining: calculateRemainingSlots(sch, applications),
    }));
  }, [scholarships, applications]);

  // Self-healing synchronization: automatically repair any out-of-sync slot counts in the database
  useEffect(() => {
    if (scholarships.length > 0 && applications.length > 0) {
      scholarships.forEach((sch) => {
        const accurate = calculateRemainingSlots(sch, applications);
        if (sch.slots_remaining !== accurate) {
          const repaired = { ...sch, slots_remaining: accurate };
          syncSaveScholarship(repaired).catch(() => {});
        }
      });
    }
  }, [scholarships, applications]);

  /**
   * Automated Status Routing:
   * Detects when a scholarship's duration has lapsed and automatically routes it
   * to either an 'Expired' or 'For Renewal' status based on scholarship policy rules.
   */
  useEffect(() => {
    if (scholarships.length > 0 && applications.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      applications.forEach((app) => {
        if (app.status === 'Approved') {
          const scholarship = scholarships.find(
            (s) => s.id === app.scholarship_id || s.title === app.scholarship_title
          );
          const durationYears = scholarship?.duration_years || 1;
          const approvedDate = app.approved_at || app.created_at;
          let expiryDate = app.expires_at;

          if (!expiryDate && approvedDate) {
            const d = new Date(approvedDate);
            d.setFullYear(d.getFullYear() + durationYears);
            expiryDate = d.toISOString().split('T')[0];
          }

          if (expiryDate && today >= expiryDate) {
            let newStatus: ApplicationStatus = 'Expired';
            if (scholarship?.is_renewable) {
              const renewalDeadline = scholarship.renewal_deadline;
              if (!renewalDeadline || today <= renewalDeadline) {
                newStatus = 'For Renewal';
              } else {
                newStatus = 'Expired';
              }
            } else {
              newStatus = 'Expired';
            }

            if ((app.status as string) !== newStatus) {
              const updated: Application = {
                ...app,
                status: newStatus,
                expires_at: expiryDate,
                updated_at: new Date().toISOString(),
                remarks:
                  newStatus === 'For Renewal'
                    ? 'Scholarship duration term completed. Renewal window is open.'
                    : 'Scholarship duration term concluded. Expired.',
              };
              setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
              syncUpdateApplication(updated).catch(() => {});
              logEvent(
                'System',
                'Lifecycle',
                `Automated Status Routing: Application ${app.reference_code} (${app.first_name} ${app.last_name}) automatically routed to "${newStatus}"`,
                {
                  action: 'application.system',
                  actor: { id: 'system', name: 'System (automatic)', role: 'system', label: 'System' },
                  audit: {
                    app_ref: app.reference_code,
                    student_name: `${app.first_name} ${app.last_name}`,
                    scholarship: app.scholarship_title,
                    from_status: app.status,
                    to_status: newStatus,
                    detail: 'Grant term ended (automatic)',
                  },
                }
              );
            }
          }
        }
      });
    }
  }, [scholarships, applications]);

  // Synchronize browser tab title with the active portal view
  useEffect(() => {
    const titles: Record<string, string> = {
      portal: 'Meridian University | Scholarship & Financial Aid Management Portal',
      student: 'Student Scholarship Portal | Meridian University',
      staff: 'Scholarship Review Workspace | Meridian University',
      admin: 'Administration | Meridian University',
      login: 'Sign in | Meridian University Scholarship Portal',
    };
    document.title = titles[currentView] || 'ScholarFlow | Meridian University';
  }, [currentView]);

  // Initialize and connect live Cloud Firestore listeners & backend data sync on mount
  useEffect(() => {
    const loadedUser = getStoredActiveUser();
    setActiveUser(loadedUser);

    // Automatically seed Cloud Firestore database if collections are empty
    seedFirestoreIfEmpty()
      .then(() => setDbConnected(true))
      .catch((err) => {
        console.warn('Initial Firestore setup notice:', err);
        setDbConnected(false);
      });

    // Initial Fetch from backend REST API (fast immediate bootstrap)
    fetchAllBackendData().then((backendData) => {
      if (backendData.scholarships.length > 0) {
        setScholarships((prev) => (prev.length === 0 ? backendData.scholarships : prev));
      }
      if (backendData.applications.length > 0) {
        setApplications((prev) => (prev.length === 0 ? backendData.applications : prev));
      }
      if (backendData.freezePeriods.length > 0) {
        setFreezePeriods((prev) => (prev.length === 0 ? backendData.freezePeriods : prev));
      }
      if (backendData.interviews.length > 0) {
        setInterviews((prev) => (prev.length === 0 ? backendData.interviews : prev));
      }
      if (backendData.staffApplications && backendData.staffApplications.length > 0) {
        setStaffApplications((prev) => (prev.length === 0 ? backendData.staffApplications : prev));
      }
    });

    // Real-time Cloud Firestore data subscriptions (pushes instant live updates to frontend)
    const unsubStaffApplications = subscribeStaffApplications((list) => {
      if (list && list.length > 0) {
        setStaffApplications(list);
      }
    });

    const unsubScholarships = subscribeScholarships((list) => {
      if (list && list.length > 0) setScholarships(list);
    });

    const unsubApplications = subscribeApplications((list) => {
      setApplications(list);
    });

    const unsubFreezePeriods = subscribeFreezePeriods((list) => {
      setFreezePeriods(list);
    });

    const unsubInterviews = subscribeInterviews((list) => {
      setInterviews(list);
    });

    // Real-time synchronization of faculty, staff, and professor accounts from Cloud Firestore
    const unsubUsers = subscribeUsers((list) => {
      setUsers(list);
      setActiveUser((prev) => {
        if (!prev) return null;
        const freshUser = list.find((u) => u.id === prev.id);
        if (freshUser) {
          const localSessionToken = getStoredSessionToken();
          // Check for single device displacement: if server has an active token that doesn't match our local token
          if (
            freshUser.active_session_token &&
            localSessionToken &&
            freshUser.active_session_token !== localSessionToken
          ) {
            saveStoredSessionToken(null);
            saveStoredActiveUser(null);
            localStorage.removeItem('scholarflow_current_view');
            const noticeMsg = 'Your session has ended because this account was accessed from another device.';
            setDisplacedSessionNotice(noticeMsg);
            setDisplacedNotice(noticeMsg);
            setTimeout(() => {
              setCurrentView('portal');
            }, 0);
            return null;
          }
          saveStoredActiveUser(freshUser);
          return freshUser;
        }
        return prev;
      });
    });

    return () => {
      unsubStaffApplications();
      unsubScholarships();
      unsubApplications();
      unsubFreezePeriods();
      unsubInterviews();
      unsubUsers();
    };
  }, []);

  const handleLoginSuccess = async (user: UserProfile) => {
    // Generate fresh session token for single device sessions
    const sessionToken = `sess_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    saveStoredSessionToken(sessionToken);
    setDisplacedSessionNotice(null);
    setDisplacedNotice(null);

    const now = new Date().toISOString();
    const userWithToken = { ...user, active_session_token: sessionToken, last_login_at: now };
    setActiveUser(userWithToken);
    saveStoredActiveUser(userWithToken);
    setLogActor({ id: user.id, full_name: user.full_name, role: user.role, label: actorLabelFor(user) });

    // Save token to Firestore to invalidate previous sessions on other devices
    updateUserSessionTokenInFirestore(user.id, sessionToken).catch((err) => {
      console.warn('Could not record active session token to Firestore:', err);
    });
    saveUserToFirestore(userWithToken as UserProfile).catch(() => {});

    logEvent('Security', 'Authentication', `Signed in: ${user.full_name} (${user.university_id || user.email})`, { action: 'login.success' });
    setLoginNotice(null);
    changeView(homeViewFor(user.role), user.role === 'student' ? studentInitialTab : undefined);
  };

  const handleLogout = () => {
    const currentUser = activeUser;
    if (currentUser) {
      logEvent('Security', 'Authentication', `Signed out: ${currentUser.full_name}`, { action: 'logout' });
    }
    saveStoredSessionToken(null);
    setActiveUser(null);
    saveStoredActiveUser(null);
    setLogActor(null);
    setSelectedLandingScholarship(null);
    localStorage.removeItem('scholarflow_current_view');
    setCurrentView('portal');
  };

  /** Used by account activation, password reset, first sign-in setup and profile edits. */
  const handleSaveAccount = async (u: UserProfile) => {
    await syncSaveUser(u);
    setUsers((prev) => (prev.some((x) => x.id === u.id) ? prev.map((x) => (x.id === u.id ? u : x)) : [...prev, u]));
  };

  const requestLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    handleLogout();
  };

  // Student Actions: Add Application (Completely recorded on Frontend, Backend API, and Cloud Firestore)
  const handleNewApplication = async (newApp: Application) => {
    // 1. Guard against duplicate application with same scholarship and same email or student ID
    const dupCheck = checkDuplicateApplication(
      applications,
      newApp.scholarship_id,
      newApp.email,
      newApp.student_number
    );
    if (dupCheck.isDuplicate) {
      console.warn('Blocked duplicate application submission:', dupCheck.message);
      throw new Error(dupCheck.message || 'You already applied for this scholarship');
    }

    // Re-check the scholarship rules at submission time (another student may have taken the last program slot).
    const sch = scholarships.find((s) => s.id === newApp.scholarship_id);
    const reg = findRegistrarStudent(newApp.student_number);
    if (!reg || reg.enrollment_status !== 'Enrolled') {
      throw new Error('Only currently enrolled Meridian students can apply.');
    }
    if (sch) {
      const elig = checkEligibility(sch, { program: reg.program, year_level: reg.year_level, gwa: reg.gwa }, applications);
      if (!elig.eligible) throw new Error(elig.reasons[0]);
      if (isDeadlinePassed(sch.deadline)) throw new Error('The application deadline for this scholarship has passed.');
      if (sch.is_frozen) throw new Error('Applications for this scholarship are paused by the scholarship office.');
    }

    // 2. Immediately reflect on frontend state (Optimistic update)
    const nextApplications = [newApp, ...applications.filter((a) => a.id !== newApp.id)];
    setApplications(nextApplications);

    // 3. Update slot count for target scholarship accurately based on actual recorded applications
    const targetSch = scholarships.find(s => s.id === newApp.scholarship_id || s.title === newApp.scholarship_title);
    if (targetSch) {
      const updatedRemaining = calculateRemainingSlots(targetSch, nextApplications);
      const updatedSch = {
        ...targetSch,
        slots_remaining: updatedRemaining,
      };
      setScholarships((prev) => prev.map(s => s.id === targetSch.id ? updatedSch : s));
      try {
        await syncSaveScholarship(updatedSch);
      } catch (err) {
        console.error('Failed to sync slot count update:', err);
      }
    }

    try {
      await syncCreateApplication(newApp);
      logEvent('Info', 'Application', `New application submitted: ${newApp.reference_code} — ${newApp.first_name} ${newApp.last_name} for "${newApp.scholarship_title}"`, {
        action: 'application.submitted',
        audit: {
          app_ref: newApp.reference_code,
          student_name: `${newApp.first_name} ${newApp.last_name}`,
          scholarship: newApp.scholarship_title,
          to_status: newApp.status,
          detail: newApp.is_renewal ? 'Renewal application' : undefined,
        },
      });
    } catch (err: any) {
      console.error('Failed to sync application to backend/database:', err);
      if (err?.message?.includes('already applied')) {
        setApplications((prev) => prev.filter((a) => a.id !== newApp.id));
        throw err;
      }
    }
  };

  // Staff Actions: Edit & Delete Application (Completely recorded on Frontend, Backend API, and Cloud Firestore)
  const handleUpdateApplicationFromStaff = async (updatedApp: Application) => {
    const previous = applications.find((a) => a.id === updatedApp.id);
    // Final approval authority is restricted to the Scholarship Coordinator.
    // The legacy 'admin' role value is treated as coordinator so pre-migration data keeps working.
    const isCoordinator = activeUser?.role === 'coordinator' || activeUser?.role === 'admin';
    // Endorsing an applicant for final approval is the Interviewer's decision after the interview.
    const isInterviewer = activeUser?.role === 'staff' && activeUser.staff_role === 'interviewer';
    if (updatedApp.status === 'For Approval' && previous?.status !== 'For Approval' && !isCoordinator && !isInterviewer) {
      throw new Error('Only the Interviewer can endorse an applicant for approval, after the interview.');
    }
    if (updatedApp.status === 'Approved' && previous?.status !== 'Approved' && !isCoordinator) {
      throw new Error('Only the Scholarship Coordinator can give final approval. Endorse the applicant for approval instead.');
    }
    // Rejection authority is also reserved for the Scholarship Coordinator — Staff endorse or
    // return to pending, they do not reject the student directly.
    if (updatedApp.status === 'Rejected' && previous?.status !== 'Rejected' && !isCoordinator && activeUser?.role !== 'staff') {
      // Staff retains ability to reject at the early stages (pre-endorsement) to clear the queue;
      // only system_admin is blocked. If this is ever tightened further, flip the condition here.
    }
    if (previous?.status === 'Approved' && updatedApp.status !== 'Approved' && !isCoordinator) {
      throw new Error('This application was approved by the Scholarship Coordinator. Only the Coordinator can change that decision.');
    }
    const nextApps = applications.map((a) => (a.id === updatedApp.id ? updatedApp : a));
    setApplications(nextApps);

    // If application status changed (e.g. to or from Rejected), update the scholarship's slot count
    const targetSch = scholarships.find(
      (s) => s.id === updatedApp.scholarship_id || s.title === updatedApp.scholarship_title
    );
    if (targetSch) {
      const updatedRemaining = calculateRemainingSlots(targetSch, nextApps);
      if (targetSch.slots_remaining !== updatedRemaining) {
        const updatedSch = { ...targetSch, slots_remaining: updatedRemaining };
        setScholarships((prev) => prev.map((s) => (s.id === targetSch.id ? updatedSch : s)));
        syncSaveScholarship(updatedSch).catch((err) =>
          console.error('Failed to sync slot count on application update:', err)
        );
      }
    }

    try {
      await syncUpdateApplication(updatedApp);
      const changed = previous?.status !== updatedApp.status;
      const who = `${updatedApp.first_name} ${updatedApp.last_name}`;
      const base = { app_ref: updatedApp.reference_code, student_name: who, scholarship: updatedApp.scholarship_title };
      if (updatedApp.review_draft) {
        // A saved working copy is not a decision, so it is kept out of the application audit trail.
        logEvent('Info', 'Application', `${updatedApp.reference_code} (${who}): review draft saved`, { action: 'application.draft', audit: base });
      } else {
        const prevVerified = previous ? previous.documents.filter((d) => d.verified).length : 0;
        const nowVerified = updatedApp.documents.filter((d) => d.verified).length;
        if (nowVerified !== prevVerified) {
          logEvent('Info', 'Application', `${updatedApp.reference_code} (${who}): ${nowVerified} of ${updatedApp.documents.length} documents verified`, {
            action: 'application.verify',
            audit: { ...base, detail: `${nowVerified} of ${updatedApp.documents.length} documents verified` },
          });
        }
        if (changed) {
          const detail =
            updatedApp.status === 'Approved'
              ? `Awarded ₱${updatedApp.awarded_amount.toLocaleString()} for ${updatedApp.grant_term || 'the current term'}`
              : updatedApp.status === 'For Approval'
              ? `Recommended grant ₱${updatedApp.awarded_amount.toLocaleString()} per semester`
              : updatedApp.status === 'Rejected'
              ? updatedApp.remarks || undefined
              : updatedApp.status === 'Removed'
              ? updatedApp.removal_reason || undefined
              : undefined;
          logEvent('Info', 'Application', `${updatedApp.reference_code} (${who}): status changed from "${previous?.status}" to "${updatedApp.status}"${detail ? ` — ${detail}` : ''}`, {
            action: 'application.status',
            audit: { ...base, from_status: previous?.status, to_status: updatedApp.status, detail },
          });
        } else if (nowVerified === prevVerified) {
          logEvent('Info', 'Application', `${updatedApp.reference_code} (${who}): review details updated`, { action: 'application.update', audit: base });
        }
      }
    } catch (err) {
      console.error('Failed to update application in backend/Firestore:', err);
      throw new Error(describeSaveError(err));
    }
  };

  const handleDeleteApplication = async (id: string) => {
    // Find application being deleted to restore target scholarship slot count
    const appToDelete = applications.find((a) => a.id === id);

    // Optimistically remove from UI immediately
    const nextApps = applications.filter((a) => a.id !== id);
    setApplications(nextApps);

    // Slot restoration: based on accurate remaining applications
    if (appToDelete) {
      const targetSch = scholarships.find(
        (s) => s.id === appToDelete.scholarship_id || s.title === appToDelete.scholarship_title
      );
      if (targetSch) {
        const restoredRemaining = calculateRemainingSlots(targetSch, nextApps);
        const updatedSch = {
          ...targetSch,
          slots_remaining: restoredRemaining,
        };
        // Update local state first
        setScholarships((prev) => prev.map((s) => (s.id === targetSch.id ? updatedSch : s)));
        try {
          // Persist restored slot count to both backend and Firestore
          await syncSaveScholarship(updatedSch);
          logEvent('Info', 'Scholarship', `Slot restored for "${targetSch.title}": ${targetSch.slots_remaining} → ${restoredRemaining} (after application deletion)`);
        } catch (err) {
          console.error('Failed to sync restored slot count:', err);
        }
      }
      logEvent('Warning', 'Application', `Application deleted: ${appToDelete.reference_code} — ${appToDelete.first_name} ${appToDelete.last_name}`, {
        action: 'application.deleted',
        audit: { app_ref: appToDelete.reference_code, student_name: `${appToDelete.first_name} ${appToDelete.last_name}`, scholarship: appToDelete.scholarship_title, from_status: appToDelete.status },
      });
    }

    try {
      await syncDeleteApplication(id);
    } catch (err) {
      console.error('Failed to delete application from backend/Firestore:', err);
    }
  };

  const handleSaveFreezeAction = async (freezeRecord: FreezePeriod) => {
    // Emergency freeze / extension is reserved for the Scholarship Coordinator.
    if (!(activeUser?.role === 'coordinator' || activeUser?.role === 'admin')) {
      throw new Error('Only the Scholarship Coordinator can freeze or extend a scholarship.');
    }
    setFreezePeriods((prev) => [freezeRecord, ...prev.filter((f) => f.id !== freezeRecord.id)]);

    try {
      await syncSaveFreezePeriod(freezeRecord);

      // Update targeted scholarships based on is_active (freeze vs unfreeze)
      const targeted = scholarships.filter(
        (s) => freezeRecord.scholarship_id === 'all' || s.id === freezeRecord.scholarship_id
      );
      const actionLabel = freezeRecord.is_active ? 'FROZEN' : 'UNFROZEN';
      for (const s of targeted) {
        const updated: Scholarship = {
          ...s,
          is_frozen: freezeRecord.is_active,
          freeze_note: freezeRecord.is_active ? freezeRecord.announcement_note : undefined,
        };
        setScholarships((prev) => prev.map((item) => (item.id === s.id ? updated : item)));

        // Explicitly clear freeze_note in Firestore using deleteField() on unfreeze
        await updateScholarshipFreezeInFirestore(
          s.id,
          freezeRecord.is_active,
          freezeRecord.is_active ? freezeRecord.announcement_note : undefined
        ).catch((err) => {
          console.warn('Firestore direct freeze update notice:', err);
        });

        await syncSaveScholarship(updated);
      }
      logEvent(
        freezeRecord.is_active ? 'Warning' : 'Info',
        'Freeze',
        `Scholarship ${actionLabel}: ${freezeRecord.scholarship_title || 'All Programs'} — "${freezeRecord.announcement_note}"`
      );
    } catch (err) {
      console.error('Failed to save freeze period to backend/Firestore:', err);
    }
  };

  const handleSaveInterview = async (interview: InterviewSchedule) => {
    const previous = interviews.find((i) => i.id === interview.id);
    const finishing = interview.status === 'Completed' && previous?.status !== 'Completed';
    // Only an Interviewer records the result of an interview, and a finished interview is final.
    if (finishing && !(activeUser?.role === 'staff' && activeUser.staff_role === 'interviewer')) {
      throw new Error('Only a staff Interviewer can mark an interview as done.');
    }
    if (previous?.status === 'Completed') {
      throw new Error('This interview is already completed and its result cannot be changed.');
    }
    // One open schedule per application: older open records for the same application are replaced.
    const linked = applications.find((a) => a.id === interview.application_id || a.reference_code === interview.application_id);
    const sameApp = (i: InterviewSchedule) =>
      i.application_id === interview.application_id || (linked && (i.application_id === linked.id || i.application_id === linked.reference_code));
    const stale = interviews.filter((i) => i.id !== interview.id && i.status !== 'Completed' && sameApp(i));
    setInterviews((prev) => [interview, ...prev.filter((i) => i.id !== interview.id && !stale.some((s) => s.id === i.id))]);
    stale.forEach((s) => syncDeleteInterview(s.id).catch(() => {}));

    try {
      await syncSaveInterview(interview);
      const interviewApp = applications.find((a) => a.id === interview.application_id || a.reference_code === interview.application_id);
      logEvent('Info', 'Interview', finishing ? `Interview completed for ${interview.student_name}` : `Scheduled interview for ${interview.student_name} (${interview.date_time})`, {
        action: finishing ? 'application.interview_done' : 'application.interview',
        audit: interviewApp
          ? {
              app_ref: interviewApp.reference_code,
              student_name: interview.student_name,
              scholarship: interview.scholarship_title,
              detail: finishing && interview.outcome
                ? `${interview.outcome.recommendation === 'recommend' ? 'Endorsed for approval' : 'Not endorsed (rejected)'}`
                : `${interview.date_time} · ${interview.location}`,
            }
          : undefined,
      });
    } catch (err) {
      console.error('Failed to save interview to backend:', err);
    }
  };

  /**
   * The Interviewer finishes an interview: the result is saved and the application moves on —
   * "Endorse" sends it to the Scholarship Coordinator, "Do not endorse" rejects it.
   */
  const handleCompleteInterview = async (interview: InterviewSchedule) => {
    const app = applications.find((a) => a.id === interview.application_id || a.reference_code === interview.application_id);
    if (!app) throw new Error('This interview is not linked to an application, so it cannot be completed. Ask the Evaluator to reschedule it from the application.');
    if (!interview.outcome) return;
    await handleSaveInterview({ ...interview, application_id: app.id });
    const now = new Date().toISOString();
    const endorse = interview.outcome.recommendation === 'recommend';
    await handleUpdateApplicationFromStaff({
      ...app,
      status: endorse ? 'For Approval' : 'Rejected',
      remarks: endorse
        ? 'Your interview is done. Your application has been endorsed to the Scholarship Coordinator for the final decision.'
        : 'Your application was not selected after the interview.',
      ...(endorse ? { endorsed_by: activeUser?.full_name, endorsed_at: now } : { awarded_amount: 0 }),
      updated_at: now,
    });
  };

  const handleDeleteInterview = async (id: string) => {
    if (interviews.find((i) => i.id === id)?.status === 'Completed') {
      throw new Error('A completed interview and its result cannot be deleted.');
    }
    setInterviews((prev) => prev.filter((i) => i.id !== id));
    try {
      await syncDeleteInterview(id);
      logEvent('Info', 'Interview', `Deleted interview schedule (${id})`);
    } catch (err) {
      console.error('Failed to delete interview:', err);
    }
  };

  const handleClearAllInterviews = async () => {
    // Finished interviews hold results, so only schedules that are still open are cleared.
    const toDelete = interviews.filter((i) => i.status !== 'Completed');
    setInterviews((prev) => prev.filter((i) => i.status === 'Completed'));
    try {
      await Promise.allSettled(toDelete.map((i) => syncDeleteInterview(i.id)));
      logEvent('Warning', 'Interview', `Cleared all shortlist interview schedules`);
    } catch (err) {
      console.error('Failed to clear all interviews:', err);
    }
  };

  // Admin Actions: Add, Edit, Delete Scholarship
  const handleSaveScholarshipFromAdmin = async (sch: Scholarship) => {
    const accurateRemaining = calculateRemainingSlots(sch, applications);
    const normalizedSch: Scholarship = {
      ...sch,
      slots_remaining: accurateRemaining,
    };
    const isNew = !scholarships.some((s) => s.id === normalizedSch.id);
    setScholarships((prev) => {
      const exists = prev.some((s) => s.id === normalizedSch.id);
      return exists ? prev.map((s) => (s.id === normalizedSch.id ? normalizedSch : s)) : [normalizedSch, ...prev];
    });

    try {
      await syncSaveScholarship(normalizedSch);
      logEvent('System', 'Scholarship', `Scholarship ${isNew ? 'created' : 'updated'}: "${normalizedSch.title}" (${normalizedSch.code}) — Slots: ${normalizedSch.slots}, Remaining: ${normalizedSch.slots_remaining}, Grant: ₱${normalizedSch.grant_amount.toLocaleString()}`);
    } catch (err) {
      console.error('Failed to save scholarship to backend/Firestore:', err);
    }
  };

  const handleDeleteScholarshipFromAdmin = async (id: string) => {
    const schToDelete = scholarships.find((s) => s.id === id);
    setScholarships((prev) => prev.filter((s) => s.id !== id));

    try {
      await syncDeleteScholarship(id);
      logEvent('Warning', 'Scholarship', `Scholarship deleted: "${schToDelete?.title || id}" (${schToDelete?.code || id})`);
    } catch (err) {
      console.error('Failed to delete scholarship from backend/Firestore:', err);
    }
  };

  const handleRestoreDefaultScholarships = async () => {
    try {
      await resetFirestoreScholarships();
    } catch (err) {
      console.error('Failed to restore default scholarships in Firestore:', err);
    }
  };

  // Faculty & User Accounts Update (Cloud Firestore & Backend API)
  const handleUpdateUser = async (updatedUser: UserProfile) => {
    const before = users.find((u) => u.id === updatedUser.id);
    try {
      await syncSaveUser(updatedUser);
    } catch (err) {
      throw new Error(describeSaveError(err));
    }
    setUsers((prev) => {
      const index = prev.findIndex((u) => u.id === updatedUser.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedUser;
        return next;
      }
      return [...prev, updatedUser];
    });
    if (activeUser && activeUser.id === updatedUser.id) {
      const merged = { ...updatedUser, active_session_token: activeUser.active_session_token };
      setActiveUser(merged);
      saveStoredActiveUser(merged);
    }
    const pwChanged = before && before.password !== updatedUser.password;
    logEvent(
      pwChanged ? 'Security' : 'Info',
      'Account',
      pwChanged ? `Password changed for ${updatedUser.full_name}` : `Profile updated for ${updatedUser.full_name}`,
      { action: pwChanged ? 'account.password' : 'account.profile' }
    );
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    try {
      setUsers((prev) => prev.filter((u) => u.id !== userId));

      await syncDeleteUser(userId);
      logEvent('Warning', 'UserManagement', `Staff account deleted: "${userToDelete?.full_name || userId}" (${userToDelete?.email || userId})`);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const requireStudentSignIn = (tab: 'catalog' | 'renewal' | 'tracker', message: string) => {
    setStudentInitialTab(tab);
    setLoginNotice(message);
    changeView('login');
  };

  const handleApplyScholarshipFromLanding = (scholarship: Scholarship) => {
    if (isDeadlinePassed(scholarship.deadline)) {
      return;
    }
    setSelectedLandingScholarship(scholarship);
    if (activeUser?.role === 'student') {
      changeView('student', 'catalog');
    } else {
      requireStudentSignIn('catalog', `Sign in with your student account to apply for the ${scholarship.title}.`);
    }
  };

  const handleNavigate = (view: View, tab?: 'catalog' | 'renewal' | 'tracker') => {
    if (view !== 'student') {
      setSelectedLandingScholarship(null);
    }
    if (view === 'login') {
      if (activeUser) return changeView(homeViewFor(activeUser.role));
      setLoginNotice(null);
      return changeView('login');
    }
    if (view === 'student' && activeUser?.role !== 'student') {
      if (activeUser) return changeView(homeViewFor(activeUser.role));
      return requireStudentSignIn(tab || 'catalog', tab === 'tracker' ? 'Sign in to see the status of your applications.' : tab === 'renewal' ? 'Sign in to renew your scholarship.' : 'Sign in with your student account to apply.');
    }
    if (view === 'staff' && activeUser?.role !== 'staff') {
      changeView(activeUser ? homeViewFor(activeUser.role) : 'login');
    } else if (view === 'admin' && activeUser?.role !== 'admin') {
      changeView(activeUser ? homeViewFor(activeUser.role) : 'login');
    } else {
      changeView(view, tab);
    }
  };

  // Staff Application Management Handlers
  const handleStaffApplicationSubmit = async (
    appData: Omit<StaffApplication, 'id' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<boolean | string> => {
    const staffId = (appData.staff_id || appData.staff_id_number || '').trim();
    const hr = findHrStaff(staffId);
    if (!hr || hr.employment_status !== 'Active') return 'Invalid staff ID number — it is not an active record in the HR directory.';
    if (users.some((u) => u.university_id === staffId || u.email.toLowerCase() === hr.email.toLowerCase())) {
      return 'You already have a ScholarFlow account. Sign in with your staff ID or email.';
    }
    if (staffApplications.some((a) => (a.staff_id || a.staff_id_number) === staffId && a.status === 'Pending')) {
      return 'An access request for this staff ID is already waiting for approval.';
    }

    const newApp: StaffApplication = {
      ...appData,
      id: `staff-app-${Date.now()}`,
      status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await syncCreateStaffApplication(newApp);
    } catch (err) {
      console.error('Failed to submit staff application:', err);
      return describeSaveError(err);
    }
    setStaffApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
    logEvent('Info', 'StaffApplication', `Staff access requested by ${newApp.full_name} (Staff ID ${staffId})`, {
      action: 'staff.request',
      actor: { id: `hr-${staffId}`, name: newApp.full_name || staffId, role: 'visitor' },
    });
    return true;
  };

  const handleApproveStaffApplication = async (
    applicationId: string,
    assignedUsername: string,
    assignedPassword: string,
    notes?: string,
    assignedRole?: import('./types').StaffRole
  ) => {
    // Approval of staff registration requests is a technical administration action —
    // only the System Administrator may create staff accounts. Legacy 'admin' accepted
    // for backward compatibility with pre-migration persisted sessions.
    if (activeUser?.role !== 'system_admin' && activeUser?.role !== 'admin') {
      throw new Error('Only the System Administrator can approve staff registration requests.');
    }
    const targetApp = staffApplications.find((a) => a.id === applicationId);
    if (!targetApp) return;

    const hashedPassword = await hashPassword(assignedPassword);
    const staffId = targetApp.staff_id || targetApp.staff_id_number || `${Date.now()}`;
    const phoneNum = targetApp.phone_number || targetApp.phone || '';

    // 1. Create or update UserProfile for this staff member
    const newStaffUser: UserProfile = {
      id: `user-${staffId}`,
      email: assignedUsername,
      full_name: targetApp.full_name || `${targetApp.first_name} ${targetApp.middle_name ? targetApp.middle_name + ' ' : ''}${targetApp.last_name}`.trim(),
      first_name: targetApp.first_name,
      middle_name: targetApp.middle_name,
      last_name: targetApp.last_name,
      role: 'staff',
      staff_role: assignedRole ?? 'evaluator',
      university_id: staffId,
      department: targetApp.department,
      title: targetApp.position,
      password: hashedPassword,
      must_change_password: true,
      security_questions_setup: false,
      phone: phoneNum,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUsers((prev) => {
      const exists = prev.findIndex((u) => u.email.toLowerCase() === assignedUsername.toLowerCase());
      if (exists >= 0) {
        const copy = [...prev];
        copy[exists] = { ...copy[exists], ...newStaffUser };
        return copy;
      }
      return [...prev, newStaffUser];
    });
    await saveUserToFirestore(newStaffUser);
    await syncSaveUser(newStaffUser);

    // 2. Update staff application status to Approved with assigned credentials
    const updatedApp: StaffApplication = {
      ...targetApp,
      status: 'Approved',
      assigned_username: assignedUsername,
      assigned_password: assignedPassword,
      assigned_role: assignedRole ?? 'evaluator',
      admin_notes: notes || 'Approved by system administrator.',
      admin_remarks: notes || 'Approved by system administrator.',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStaffApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
    await updateStaffApplicationInFirestore(updatedApp);
    await syncUpdateStaffApplication(updatedApp);

    logEvent(
      'Info',
      'StaffApplication',
      `Staff application approved for ${targetApp.first_name} ${targetApp.last_name} (${staffId}). Credentials assigned.`
    );
  };

  const handleRejectStaffApplication = async (applicationId: string, reason: string) => {
    // Rejection of staff registration requests is also a technical administration action.
    if (activeUser?.role !== 'system_admin' && activeUser?.role !== 'admin') {
      throw new Error('Only the System Administrator can reject staff registration requests.');
    }
    const targetApp = staffApplications.find((a) => a.id === applicationId);
    if (!targetApp) return;
    const staffId = targetApp.staff_id || targetApp.staff_id_number || '';

    const updatedApp: StaffApplication = {
      ...targetApp,
      status: 'Rejected',
      admin_notes: reason,
      admin_remarks: reason,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStaffApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
    await updateStaffApplicationInFirestore(updatedApp);
    await syncUpdateStaffApplication(updatedApp);

    logEvent(
      'Warning',
      'StaffApplication',
      `Staff application rejected for ${targetApp.first_name} ${targetApp.last_name} (${staffId}): ${reason}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden w-full">

      {/* Universal Responsive Header — shown on all views except full-bleed portal landing page */}
      {currentView !== 'portal' && (
        <Header
          activeUser={activeUser}
          onLogout={requestLogout}
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenGuide={(tab) => setActiveGuideModal(tab)}
          onOpenNotifications={() => setIsNotificationSidebarOpen(true)}
          unreadNotificationsCount={unreadNotificationsCount}
        />
      )}

      {/* Centered notice for sessions invalidated on another device */}
      {displacedNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
          <div role="alert" className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300 pointer-events-auto bg-amber-500/95 backdrop-blur-md text-slate-950 px-4 sm:px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-amber-600/80 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 text-xs sm:text-sm font-bold min-w-0">
              <ShieldAlert className="w-5 h-5 text-slate-950 shrink-0" />
              <span className="leading-snug">{displacedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDisplacedNotice(null);
                setDisplacedSessionNotice(null);
              }}
              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 active:scale-95"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Page Views with responsive padding */}
      <main className="flex-1 w-full overflow-x-hidden">
        {currentView === 'portal' && (
          <LandingPage
            scholarships={accurateScholarships}
            applications={applications}
            onNavigate={handleNavigate}
            onOpenGuide={(tab) => setActiveGuideModal(tab)}
            onApplyScholarship={handleApplyScholarshipFromLanding}
          />
        )}

        {currentView === 'student' && activeUser?.role === 'student' && (
          <StudentPortal
            student={activeUser}
            key={`student-portal-${studentInitialTab}`}
            scholarships={accurateScholarships}
            applications={applications}
            freezePeriods={freezePeriods}
            initialTab={studentInitialTab}
            initialScholarship={selectedLandingScholarship}
            onNewApplication={handleNewApplication}
          />
        )}

        {currentView === 'login' && (
          <SignInPage
            onLoginSuccess={handleLoginSuccess}
            onBackToPortal={() => changeView('portal')}
            staffApplications={staffApplications}
            users={users}
            onStaffApplicationSubmit={handleStaffApplicationSubmit}
            onSaveUser={handleSaveAccount}
            notice={loginNotice}
          />
        )}

        {currentView === 'staff' && activeUser?.role === 'staff' && (
          <StaffPanel
            user={activeUser}
            scholarships={accurateScholarships}
            applications={applications}
            freezePeriods={freezePeriods}
            interviews={interviews}
            interviewerNames={interviewerNames}
            onUpdateApplication={handleUpdateApplicationFromStaff}
            onDeleteApplication={handleDeleteApplication}
            onSaveInterview={handleSaveInterview}
            onCompleteInterview={handleCompleteInterview}
            onDeleteInterview={handleDeleteInterview}
            onClearAllInterviews={handleClearAllInterviews}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {currentView === 'admin' && isAdminLevel(activeUser?.role) && (
          <AdminDashboard
            user={activeUser}
            users={users}
            scholarships={accurateScholarships}
            applications={applications}
            staffApplications={staffApplications}
            freezePeriods={freezePeriods}
            onSaveScholarship={handleSaveScholarshipFromAdmin}
            onDeleteScholarship={handleDeleteScholarshipFromAdmin}
            onRestoreDefaultScholarships={handleRestoreDefaultScholarships}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onUpdateApplication={handleUpdateApplicationFromStaff}
            onDeleteApplication={handleDeleteApplication}
            onSaveFreeze={handleSaveFreezeAction}
            onSaveInterview={handleSaveInterview}
            interviews={interviews}
            interviewerNames={interviewerNames}
            onApproveStaffApplication={handleApproveStaffApplication}
            onRejectStaffApplication={handleRejectStaffApplication}
          />
        )}
      </main>

      {/* Interactive Universal Footer — shown on all views except full-bleed portal landing page */}
      {currentView !== 'portal' && (
        <Footer
          onNavigate={handleNavigate}
          onOpenGuide={(tab) => setActiveGuideModal(tab)}
          currentView={currentView}
        />
      )}

      {/* Responsive Help & FAQ Guide Modal */}
      <HelpGuideModal
        isOpen={Boolean(activeGuideModal)}
        initialTab={activeGuideModal || 'requirements'}
        onClose={() => setActiveGuideModal(null)}
        onNavigateToCatalog={() => handleNavigate('student', 'catalog')}
        onNavigateToTracker={() => handleNavigate('student', 'tracker')}
      />

      {/* Dedicated Notifications / Recent Updates Sidebar for Admin & Staff */}
      <NotificationSidebar
        isOpen={isNotificationSidebarOpen}
        onClose={() => setIsNotificationSidebarOpen(false)}
        applications={applications}
        scholarships={accurateScholarships}
        freezePeriods={freezePeriods}
        onUnreadCountChange={setUnreadNotificationsCount}
      />

      {/* Logout Confirmation Modal Interceptor */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        userName={activeUser?.full_name}
      />

    </div>
  );
}
