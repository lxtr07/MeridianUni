import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, User, Info } from 'lucide-react';
import { authenticateUserWithFirestore } from '../../lib/firebase';
import { StaffApplication, UserProfile } from '../../types';
import { ScholarFlowLogo } from '../common/ScholarFlowLogo';
import portalBgImg from '../../assets/images/scholarship_portal_bg_1788197531135.jpg';
import { StaffRegistrationModal } from './StaffRegistrationModal';
import { StaffAccountTrackerModal } from './StaffAccountTrackerModal';
import { StudentActivationModal } from './StudentActivationModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AccountSetupModal } from './AccountSetupModal';
import { PasswordField } from '../common/PasswordField';
import { FormError, FormSuccess, inputClass, primaryButton } from './AuthModalShell';
import { checkPassword } from '../../lib/passwordPolicy';
import { findRegistrarStudent, findHrStaff } from '../../data/universityRegistry';
import { logEvent } from '../../lib/logger';

interface SignInPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToPortal: () => void;
  staffApplications?: StaffApplication[];
  users?: UserProfile[];
  onStaffApplicationSubmit?: (appData: Omit<StaffApplication, 'id' | 'status' | 'created_at' | 'updated_at'>) => Promise<boolean | string>;
  onSaveUser: (u: UserProfile) => Promise<void>;
  /** Optional message shown above the form, e.g. "Sign in with your student account to apply." */
  notice?: string | null;
}

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const lockKey = (id: string) => `scholarflow_lock_${id.trim().toLowerCase()}`;

function readLock(id: string): { count: number; until?: number } {
  try {
    return JSON.parse(localStorage.getItem(lockKey(id)) || '{"count":0}');
  } catch {
    return { count: 0 };
  }
}

/**
 * One sign-in for everyone. People type their Student Number, Staff ID or university email and
 * the system opens the right workspace for their account — no role picker, no role hints.
 */
export const SignInPage: React.FC<SignInPageProps> = ({
  onLoginSuccess,
  onBackToPortal,
  staffApplications = [],
  users = [],
  onStaffApplicationSubmit,
  onSaveUser,
  notice,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modal, setModal] = useState<'activate' | 'reset' | 'staff-register' | 'staff-track' | null>(null);
  const [setupUser, setSetupUser] = useState<{ user: UserProfile; pw: boolean; q: boolean } | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modal && !setupUser) onBackToPortal();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [modal, setupUser, onBackToPortal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const id = identifier.trim();
    if (!id || !password) {
      setError('Enter your ID or email and your password.');
      return;
    }

    const lock = readLock(id);
    if (lock.until && lock.until > Date.now()) {
      const mins = Math.ceil((lock.until - Date.now()) / 60000);
      setError(`Too many failed attempts. Sign-in for this account is paused for ${mins} more minute${mins === 1 ? '' : 's'}, or reset your password.`);
      return;
    }

    setLoading(true);
    const result = await authenticateUserWithFirestore(id, password);
    setLoading(false);

    if (!result.user) {
      const count = (lock.until && lock.until <= Date.now() ? 0 : lock.count) + 1;
      const next = count >= MAX_ATTEMPTS ? { count: 0, until: Date.now() + LOCK_MINUTES * 60000 } : { count };
      localStorage.setItem(lockKey(id), JSON.stringify(next));
      logEvent('Security', 'Authentication', `Failed sign-in attempt for "${id}" (${count} of ${MAX_ATTEMPTS})`, {
        action: 'login.failed',
        actor: null,
      });
      setError(
        count >= MAX_ATTEMPTS
          ? `Too many failed attempts. Sign-in for this account is paused for ${LOCK_MINUTES} minutes.`
          : `${result.error} ${MAX_ATTEMPTS - count} attempt${MAX_ATTEMPTS - count === 1 ? '' : 's'} left before a ${LOCK_MINUTES}-minute pause.`
      );
      return;
    }

    localStorage.removeItem(lockKey(id));
    const user = result.user;

    // The account must still belong to someone currently at the university.
    if (user.role === 'student') {
      const reg = findRegistrarStudent(user.university_id || '');
      if (!reg || reg.enrollment_status !== 'Enrolled') {
        setError('Your Registrar record is not active for this semester, so the scholarship portal is unavailable. Contact the Registrar.');
        logEvent('Security', 'Authentication', `Blocked sign-in for non-enrolled student ${user.university_id}`, { action: 'login.blocked', actor: { id: user.id, name: user.full_name, role: 'student' } });
        return;
      }
      // Always use the Registrar's current program and year level.
      user.program = reg.program;
      user.year_level = reg.year_level;
    } else if (user.university_id) {
      const hr = findHrStaff(user.university_id);
      if (hr && hr.employment_status !== 'Active') {
        setError('This staff account has been deactivated by HR.');
        return;
      }
    }

    const weak = !checkPassword(password).ok;
    const needsQuestions = user.role !== 'student' && !user.security_questions_setup;
    if (weak || user.must_change_password || needsQuestions) {
      setSetupUser({ user, pw: weak || Boolean(user.must_change_password), q: needsQuestions });
      return;
    }
    onLoginSuccess(user);
  };

  return (
    <div className="relative min-h-[calc(100vh-70px)] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 overflow-hidden bg-slate-900">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img src={portalBgImg} alt="" className="w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-xs" />
      </div>

      <div className="relative z-10 max-w-md w-full mx-auto mb-3">
        <button
          type="button"
          onClick={onBackToPortal}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md px-4 py-2 rounded-xl transition-all border border-slate-700/80 cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>Back to portal home</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-md w-full mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="bg-slate-900 text-white p-6 sm:p-7 text-center border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-3 shadow-md p-1.5">
            <ScholarFlowLogo size="lg" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Meridian University</h2>
          <p className="text-xs text-slate-400 mt-1">Scholarship &amp; Financial Aid Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4" noValidate>
          <div>
            <h3 className="text-base font-bold text-slate-900">Sign in</h3>
            <p className="text-xs text-slate-500 mt-0.5">Use the same ID you use for other university services.</p>
          </div>

          {notice && (
            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-3 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
              <span>{notice}</span>
            </div>
          )}

          <div>
            <label htmlFor="signin-id" className="block text-xs font-bold text-slate-700 mb-1.5">Student number, staff ID or university email</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="signin-id"
                autoComplete="username"
                maxLength={150}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div>
            <PasswordField id="signin-pw" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
            <div className="text-right mt-1.5">
              <button type="button" onClick={() => setModal('reset')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer">
                Forgot password?
              </button>
            </div>
          </div>

          <FormError message={error} />
          <FormSuccess message={success} />

          <button type="submit" disabled={loading} className={`${primaryButton} flex items-center justify-center gap-2`}>
            <Lock className="w-3.5 h-3.5 text-indigo-300" />
            <span>{loading ? 'Checking your details…' : 'Sign in'}</span>
          </button>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
            <p className="font-bold text-slate-700">First time here?</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Enrolled students</span>
              <button type="button" onClick={() => setModal('activate')} className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer">
                Activate your account
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">University employees</span>
              <span className="flex items-center gap-3">
                <button type="button" onClick={() => setModal('staff-register')} className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer">
                  Request access
                </button>
                <button type="button" onClick={() => setModal('staff-track')} className="font-medium text-slate-600 hover:text-indigo-600 underline cursor-pointer">
                  Check request
                </button>
              </span>
            </div>
          </div>
        </form>
      </motion.div>

      {modal === 'activate' && (
        <StudentActivationModal
          users={users}
          onClose={() => setModal(null)}
          onSave={onSaveUser}
          onActivated={(sn) => {
            setModal(null);
            setIdentifier(sn);
            setPassword('');
            setSuccess('Your account is active. Sign in with your student number and the password you just created.');
          }}
        />
      )}

      {modal === 'reset' && (
        <ResetPasswordModal
          users={users}
          onClose={() => setModal(null)}
          onSave={onSaveUser}
          onDone={(id) => {
            setModal(null);
            setIdentifier(id);
            setPassword('');
            setSuccess('Password updated. Sign in with your new password.');
          }}
        />
      )}

      <StaffRegistrationModal
        isOpen={modal === 'staff-register'}
        onClose={() => setModal(null)}
        staffApplications={staffApplications}
        users={users}
        onSubmitApplication={onStaffApplicationSubmit}
        onOpenTracker={() => setModal('staff-track')}
      />

      <StaffAccountTrackerModal
        isOpen={modal === 'staff-track'}
        onClose={() => setModal(null)}
        staffApplications={staffApplications}
        onProceedToLogin={(email) => {
          setModal(null);
          if (email) setIdentifier(email);
        }}
      />

      {setupUser && (
        <AccountSetupModal
          user={setupUser.user}
          requirePassword={setupUser.pw}
          requireQuestions={setupUser.q}
          onSave={onSaveUser}
          onCancel={() => {
            setSetupUser(null);
            setPassword('');
          }}
          onComplete={(u) => {
            setSetupUser(null);
            logEvent('Security', 'Account', `Account security updated at sign-in for ${u.full_name}`, {
              action: 'account.setup',
              actor: { id: u.id, name: u.full_name, role: u.role },
            });
            onLoginSuccess(u);
          }}
        />
      )}
    </div>
  );
};
