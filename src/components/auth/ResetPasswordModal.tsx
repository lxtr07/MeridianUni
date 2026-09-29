import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { UserProfile } from '../../types';
import { AuthModalShell, FormError, FormSuccess, inputClass, primaryButton } from './AuthModalShell';
import { PasswordField } from '../common/PasswordField';
import { findAccountByIdentifier } from '../../lib/firebase';
import { findRegistrarStudent } from '../../data/universityRegistry';
import { checkPassword } from '../../lib/passwordPolicy';
import { hashPassword, verifyPassword } from '../../lib/crypto';
import { describeSaveError } from '../../lib/dataSync';
import { logEvent } from '../../lib/logger';

interface Props {
  users: UserProfile[];
  onClose: () => void;
  onSave: (u: UserProfile) => Promise<void>;
  onDone: (identifier: string) => void;
}

/**
 * Password recovery for every role.
 *  - Students confirm their birthdate and the last 4 digits of the mobile number on file with the Registrar.
 *  - Staff and administrators answer the two recovery questions they set up on first sign-in.
 */
export const ResetPasswordModal: React.FC<Props> = ({ users, onClose, onSave, onDone }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [identifier, setIdentifier] = useState('');
  const [account, setAccount] = useState<UserProfile | null>(null);
  const [birthdate, setBirthdate] = useState('');
  const [mobileLast4, setMobileLast4] = useState('');
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFind = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const acc = findAccountByIdentifier(users, identifier);
    if (!acc) return setError('No account uses that ID or email. Students who have never signed in should activate their account instead.');
    if (acc.role !== 'student' && (!acc.security_questions || acc.security_questions.length < 2)) {
      return setError('This account has no recovery questions yet. Ask the System Administrator to issue a temporary password from the Staff Accounts page.');
    }
    setAccount(acc);
    setStep(2);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setError(null);
    let ok = false;
    if (account.role === 'student') {
      const r = findRegistrarStudent(account.university_id || '');
      ok = Boolean(r && r.birthdate === birthdate && r.mobile.slice(-4) === mobileLast4);
    } else {
      const qs = account.security_questions || [];
      const check = async (answer: string, stored: string) =>
        stored.length === 64 ? verifyPassword(answer.trim().toLowerCase(), stored) : answer.trim().toLowerCase() === stored.trim().toLowerCase();
      ok = (await check(a1, qs[0].answer)) && (await check(a2, qs[1].answer));
    }
    if (!ok) {
      logEvent('Security', 'Authentication', `Failed password-reset verification for ${account.email}`, {
        action: 'reset.failed',
        actor: { id: account.id, name: account.full_name, role: account.role },
      });
      return setError('The details you entered do not match our records.');
    }
    setStep(3);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setError(null);
    const check = checkPassword(pw, [account.first_name || '', account.last_name || '', account.university_id || '', account.email.split('@')[0]]);
    if (!check.ok) return setError(check.message);
    if (pw !== confirm) return setError('The two passwords do not match.');
    setSaving(true);
    try {
      await onSave({ ...account, password: await hashPassword(pw), must_change_password: false, updated_at: new Date().toISOString() });
      logEvent('Security', 'Account', `Password reset completed for ${account.full_name}`, {
        action: 'reset.success',
        actor: { id: account.id, name: account.full_name, role: account.role },
      });
      setStep(4);
    } catch (err) {
      setError(describeSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthModalShell title="Reset your password" subtitle="Students, staff and administrators" icon={<KeyRound className="w-5 h-5 text-white" />} onClose={onClose}>
      {step === 1 && (
        <form onSubmit={handleFind} className="space-y-4">
          <div>
            <label htmlFor="rp-id" className="block font-bold text-slate-700 mb-1.5">Student number, staff ID or university email</label>
            <input id="rp-id" value={identifier} maxLength={100} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} autoComplete="username" />
          </div>
          <FormError message={error} />
          <button type="submit" disabled={!identifier.trim()} className={primaryButton}>Continue</button>
        </form>
      )}

      {step === 2 && account && (
        <form onSubmit={handleVerify} className="space-y-4">
          {account.role === 'student' ? (
            <>
              <p className="text-slate-600">Confirm the details the Registrar has on file for you.</p>
              <div>
                <label htmlFor="rp-bd" className="block font-bold text-slate-700 mb-1.5">Birthdate</label>
                <input id="rp-bd" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="rp-m4" className="block font-bold text-slate-700 mb-1.5">Last 4 digits of your registered mobile number</label>
                <input id="rp-m4" inputMode="numeric" maxLength={4} value={mobileLast4} onChange={(e) => setMobileLast4(e.target.value.replace(/\D/g, ''))} className={`${inputClass} font-mono w-32`} />
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-600">Answer the recovery questions you set up.</p>
              {[{ q: account.security_questions![0].question, v: a1, s: setA1 }, { q: account.security_questions![1].question, v: a2, s: setA2 }].map((x, i) => (
                <div key={i}>
                  <label htmlFor={`rp-a${i}`} className="block font-bold text-slate-700 mb-1.5">{x.q}</label>
                  <input id={`rp-a${i}`} value={x.v} maxLength={80} onChange={(e) => x.s(e.target.value)} className={inputClass} />
                </div>
              ))}
            </>
          )}
          <FormError message={error} />
          <button type="submit" className={primaryButton}>Verify</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSave} className="space-y-4">
          <PasswordField id="rp-pw" label="New password" value={pw} onChange={setPw} showChecklist />
          <PasswordField id="rp-pw2" label="Confirm new password" value={confirm} onChange={setConfirm} error={confirm && pw !== confirm ? 'Passwords do not match.' : null} />
          <FormError message={error} />
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}

      {step === 4 && account && (
        <div className="space-y-4">
          <FormSuccess message="Your password has been changed. Sign in with your new password." />
          <button type="button" onClick={() => onDone(account.university_id || account.email)} className={primaryButton}>Back to sign in</button>
        </div>
      )}
    </AuthModalShell>
  );
};
