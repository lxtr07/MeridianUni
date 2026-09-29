import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../types';
import { AuthModalShell, FormError, inputClass, primaryButton } from './AuthModalShell';
import { PasswordField } from '../common/PasswordField';
import { checkPassword } from '../../lib/passwordPolicy';
import { hashPassword, verifyPassword } from '../../lib/crypto';
import { describeSaveError } from '../../lib/dataSync';

export const SECURITY_QUESTIONS_POOL = [
  'What is the name of your first elementary school?',
  'What city or municipality was your mother born in?',
  'What was your childhood nickname?',
  'What was the make or model of your first vehicle?',
  'What is your oldest sibling’s middle name?',
  'What was the name of your favorite high school teacher?',
];

interface AccountSetupModalProps {
  user: UserProfile;
  requirePassword: boolean;
  requireQuestions: boolean;
  onSave: (u: UserProfile) => Promise<void>;
  onComplete: (u: UserProfile) => void;
  onCancel: () => void;
}

/**
 * Shown right after sign-in when an account still uses a password that does not meet the
 * policy (e.g. the old "staff123"), was issued a temporary password, or — for staff and
 * administrators — has not set up recovery questions yet.
 */
export const AccountSetupModal: React.FC<AccountSetupModalProps> = ({ user, requirePassword, requireQuestions, onSave, onComplete, onCancel }) => {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [q1, setQ1] = useState(SECURITY_QUESTIONS_POOL[0]);
  const [q2, setQ2] = useState(SECURITY_QUESTIONS_POOL[1]);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let passwordHash = user.password;

    if (requirePassword) {
      const check = checkPassword(pw, [user.first_name || '', user.last_name || '', user.university_id || '', (user.email || '').split('@')[0]]);
      if (!check.ok) return setError(check.message);
      if (pw !== confirm) return setError('The two passwords do not match.');
      if (user.password && (await verifyPassword(pw, user.password))) return setError('Choose a password different from your current one.');
      passwordHash = await hashPassword(pw);
    }

    let questions = user.security_questions;
    if (requireQuestions) {
      if (q1 === q2) return setError('Pick two different security questions.');
      if (a1.trim().length < 3 || a2.trim().length < 3) return setError('Each answer needs at least 3 characters.');
      questions = [
        { question: q1, answer: await hashPassword(a1.trim().toLowerCase()) },
        { question: q2, answer: await hashPassword(a2.trim().toLowerCase()) },
      ];
    }

    const updated: UserProfile = {
      ...user,
      password: passwordHash,
      must_change_password: false,
      security_questions: questions,
      security_questions_setup: requireQuestions ? true : user.security_questions_setup,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await onSave(updated);
      onComplete(updated);
    } catch (err) {
      setError(describeSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthModalShell
      title="Secure your account"
      subtitle={user.full_name}
      icon={<ShieldCheck className="w-5 h-5 text-white" />}
      onClose={onCancel}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-slate-600 leading-relaxed">
          {requirePassword && requireQuestions
            ? 'Before you continue, set a new strong password and two recovery questions. You will use the questions if you ever forget your password.'
            : requirePassword
            ? 'Your current password does not meet the university password policy or was issued temporarily. Set a new one to continue.'
            : 'Set two recovery questions. You will answer them if you ever forget your password.'}
        </p>

        {requirePassword && (
          <>
            <PasswordField id="setup-pw" label="New password" value={pw} onChange={setPw} showChecklist />
            <PasswordField id="setup-pw2" label="Confirm new password" value={confirm} onChange={setConfirm} error={confirm && pw !== confirm ? 'Passwords do not match.' : null} />
          </>
        )}

        {requireQuestions && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {[
              { q: q1, setQ: setQ1, a: a1, setA: setA1, n: 1 },
              { q: q2, setQ: setQ2, a: a2, setA: setA2, n: 2 },
            ].map(({ q, setQ, a, setA, n }) => (
              <div key={n} className="space-y-1.5">
                <label htmlFor={`sq-${n}`} className="block font-bold text-slate-700">Recovery question {n}</label>
                <select id={`sq-${n}`} value={q} onChange={(e) => setQ(e.target.value)} className={inputClass}>
                  {SECURITY_QUESTIONS_POOL.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input aria-label={`Answer to recovery question ${n}`} value={a} maxLength={80} onChange={(e) => setA(e.target.value)} className={inputClass} />
              </div>
            ))}
            <p className="text-[11px] text-slate-500">Answers are not case-sensitive and are stored encrypted.</p>
          </div>
        )}

        <FormError message={error} />

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer">
            Sign out
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </div>
      </form>
    </AuthModalShell>
  );
};
