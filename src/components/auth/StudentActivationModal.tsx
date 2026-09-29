import React, { useMemo, useState } from 'react';
import { GraduationCap, Lock } from 'lucide-react';
import { UserProfile } from '../../types';
import { AuthModalShell, FormError, inputClass, primaryButton } from './AuthModalShell';
import { PasswordField } from '../common/PasswordField';
import { findRegistrarStudent, studentFullName, RegistrarStudent } from '../../data/universityRegistry';
import { checkPassword } from '../../lib/passwordPolicy';
import { hashPassword } from '../../lib/crypto';
import { describeSaveError } from '../../lib/dataSync';
import { logEvent } from '../../lib/logger';

interface Props {
  users: UserProfile[];
  onClose: () => void;
  onSave: (u: UserProfile) => Promise<void>;
  onActivated: (studentNumber: string) => void;
}

/**
 * First-time account activation for enrolled students.
 * Student number alone is used to look up the Registrar record — the university
 * already verified the student's identity at enrolment, so no extra credential is needed.
 */
export const StudentActivationModal: React.FC<Props> = ({ users, onClose, onSave, onActivated }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [studentNumber, setStudentNumber] = useState('');
  const [record, setRecord] = useState<RegistrarStudent | null>(null);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Live validation as the student types their number
  const idHint = useMemo(() => {
    if (!studentNumber) return null;
    if (/\D/.test(studentNumber)) return { ok: false, text: 'Student numbers contain digits only — no letters or dashes.' };
    if (studentNumber.length < 10) return { ok: false, text: `${studentNumber.length} of 10 digits` };
    const r = findRegistrarStudent(studentNumber);
    if (!r) return { ok: false, text: 'This student number is not in the Registrar records. Check you typed it correctly.' };
    if (r.enrollment_status !== 'Enrolled') return { ok: false, text: `Your record is marked "${r.enrollment_status}". Only currently enrolled students can activate an account.` };
    if (users.some((u) => u.university_id === r.student_number)) return { ok: false, text: 'An account already exists for this student number. Sign in instead, or use "Forgot password".' };
    return { ok: true, text: `Found: ${studentFullName(r)} · ${r.program}` };
  }, [studentNumber, users]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!idHint?.ok) return setError(idHint?.text || 'Enter your 10-digit student number.');
    const r = findRegistrarStudent(studentNumber)!;
    logEvent('Security', 'Authentication', `Student account activation started for ${studentNumber}`, { action: 'activation.started', actor: null });
    setRecord(r);
    setStep(2);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setError(null);
    const check = checkPassword(pw, [record.first_name, record.last_name, record.student_number, record.email.split('@')[0]]);
    if (!check.ok) return setError(check.message);
    if (pw !== confirm) return setError('The two passwords do not match.');

    const now = new Date().toISOString();
    const account: UserProfile = {
      id: `stu-${record.student_number}`,
      email: record.email,
      password: await hashPassword(pw),
      full_name: studentFullName(record),
      first_name: record.first_name,
      middle_name: record.middle_name,
      last_name: record.last_name,
      role: 'student',
      university_id: record.student_number,
      program: record.program,
      year_level: record.year_level,
      phone: record.mobile,
      security_questions_setup: true,
      created_at: now,
      updated_at: now,
    };
    setSaving(true);
    try {
      // Fire with a 6-second timeout so a slow Firestore connection never leaves
      // the student stuck on "Activating…" — the account is added to the in-memory
      // users list immediately and the Firestore write retries in the background.
      const saveWithTimeout = Promise.race([
        onSave(account),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 6000)
        ),
      ]);
      await saveWithTimeout.catch((err) => {
        // If it timed out, still continue — the write is happening in the background
        if (err?.message !== 'timeout') throw err;
        console.warn('Activation Firestore write timed out — proceeding anyway');
      });
      logEvent('Security', 'Account', `Student account activated: ${account.full_name} (${record.student_number})`, {
        action: 'activation.success',
        actor: { id: account.id, name: account.full_name, role: 'student' },
      });
      onActivated(record.student_number);
    } catch (err) {
      setError(describeSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthModalShell
      title="Activate your student account"
      subtitle="For currently enrolled Meridian students"
      icon={<GraduationCap className="w-5 h-5 text-white" />}
      onClose={onClose}
    >
      {step === 1 ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Enter your student number. Your details are already on file with the Registrar — you just need to set a password.
          </p>
          <div>
            <label htmlFor="act-sn" className="block font-bold text-slate-700 mb-1.5">
              Student number
            </label>
            <input
              id="act-sn"
              inputMode="numeric"
              autoComplete="username"
              maxLength={10}
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value.trim().replace(/\D/g, '').slice(0, 10))}
              className={`${inputClass} font-mono tracking-wider ${
                idHint && !idHint.ok && studentNumber.length >= 10 ? 'border-rose-400 bg-rose-50/50' :
                idHint?.ok ? 'border-emerald-400' : ''
              }`}
            />
            {idHint && (
              <p
                aria-live="polite"
                className={`text-[11px] mt-1 font-semibold ${
                  idHint.ok ? 'text-emerald-700' :
                  studentNumber.length < 10 && !/\D/.test(studentNumber) ? 'text-slate-500' :
                  'text-rose-600'
                }`}
              >
                {idHint.text}
              </p>
            )}
          </div>
          <FormError message={error} />
          <button
            type="submit"
            disabled={!idHint?.ok}
            className={primaryButton}
          >
            Confirm my record
          </button>
        </form>
      ) : (
        record && (
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Show the Registrar record so the student can verify it's them */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                <Lock className="w-3 h-3" />
                From the Registrar — contact them to correct any mistakes
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <span className="block text-[10px] text-slate-400 font-bold">Full name</span>
                  <span className="font-bold text-slate-900">{studentFullName(record)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold">Student number</span>
                  <span className="font-mono font-bold">{record.student_number}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold">Program & year</span>
                  <span className="font-semibold">{record.program}, {record.year_level}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] text-slate-400 font-bold">University email (used to sign in)</span>
                  <span className="font-semibold">{record.email}</span>
                </div>
              </div>
            </div>

            <PasswordField id="act-pw" label="Create a password" value={pw} onChange={setPw} showChecklist />
            <PasswordField
              id="act-pw2"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              error={confirm && pw !== confirm ? 'Passwords do not match.' : null}
            />

            <FormError message={error} />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); setStudentNumber(''); }}
                className="px-4 py-3 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? 'Activating…' : 'Activate account'}
              </button>
            </div>
          </form>
        )
      )}
    </AuthModalShell>
  );
};
