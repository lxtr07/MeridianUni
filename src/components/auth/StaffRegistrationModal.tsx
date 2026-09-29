import React, { useMemo, useState, useEffect } from 'react';
import { UserPlus, Lock, CheckCircle2 } from 'lucide-react';
import { StaffApplication, UserProfile } from '../../types';
import { AuthModalShell, FormError, inputClass, primaryButton, maskMobile } from './AuthModalShell';
import { findHrStaff, staffFullName } from '../../data/universityRegistry';

interface StaffRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication?: (appData: Omit<StaffApplication, 'id' | 'status' | 'created_at' | 'updated_at'>) => Promise<boolean | string>;
  onOpenTracker?: () => void;
  staffApplications?: StaffApplication[];
  users?: UserProfile[];
}

/**
 * Staff are already university employees, so the only thing asked is the Staff ID.
 * Name, position, department, email and mobile are pulled from the HR directory.
 */
export const StaffRegistrationModal: React.FC<StaffRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmitApplication,
  onOpenTracker,
  staffApplications = [],
  users = [],
}) => {
  const [staffId, setStaffId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStaffId('');
      setConfirmed(false);
      setError(null);
      setSubmitted(null);
    }
  }, [isOpen]);

  /** Validation runs on every keystroke. */
  const lookup = useMemo(() => {
    const v = staffId;
    if (!v) return { state: 'empty' as const, text: '' };
    if (/[^0-9]/.test(v)) return { state: 'invalid' as const, text: 'Invalid staff ID number. Staff IDs contain digits only — do not type your name.' };
    if (v.length < 10) return { state: 'typing' as const, text: `${v.length} of 10 digits` };
    const hr = findHrStaff(v);
    if (!hr) return { state: 'invalid' as const, text: 'Invalid staff ID number — it is not in the HR employee directory.' };
    if (hr.employment_status !== 'Active') return { state: 'invalid' as const, text: 'This staff ID belongs to a separated employee and cannot be given access.' };
    if (!hr.scholarship_office_access) return { state: 'invalid' as const, text: 'This employee is not assigned to scholarship evaluation. Ask your department head to request access through HR.' };
    if (users.some((u) => u.university_id === hr.staff_id || u.email.toLowerCase() === hr.email.toLowerCase())) {
      return { state: 'exists' as const, text: 'You already have a ScholarFlow account. Sign in with your staff ID or email.' };
    }
    const pending = staffApplications.find((a) => (a.staff_id || a.staff_id_number) === hr.staff_id && a.status === 'Pending');
    if (pending) return { state: 'pending' as const, text: 'An access request for this staff ID is already waiting for administrator approval.' };
    return { state: 'found' as const, text: 'Staff ID verified with HR.', hr };
  }, [staffId, users, staffApplications]);

  if (!isOpen) return null;

  const hr = lookup.state === 'found' && 'hr' in lookup ? lookup.hr : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hr) return setError(lookup.text || 'Enter your 10-digit staff ID.');
    if (!confirmed) return setError('Confirm that the HR record shown is yours.');
    setSubmitting(true);
    try {
      const result = await onSubmitApplication?.({
        first_name: hr.first_name,
        middle_name: hr.middle_name,
        last_name: hr.last_name,
        full_name: staffFullName(hr),
        email: hr.email,
        institutional_email: hr.email,
        phone: hr.mobile,
        phone_number: hr.mobile,
        birthdate: '',
        staff_id: hr.staff_id,
        staff_id_number: hr.staff_id,
        department: hr.department,
        position: hr.position,
      });
      if (result === true || result === undefined) setSubmitted(hr.email);
      else setError(typeof result === 'string' ? result : 'The request could not be submitted. Please try again.');
    } catch (err: any) {
      setError(err?.message || 'The request could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthModalShell title="Request staff access" subtitle="For Meridian employees assigned to scholarship work" icon={<UserPlus className="w-5 h-5 text-white" />} onClose={onClose}>
      {submitted ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Request sent to the System Administrator</p>
              <p className="mt-1 text-emerald-800">Once approved, you sign in with <strong>{submitted}</strong> or your staff ID. Check the status any time with your staff ID and email.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenTracker} className={primaryButton}>Check request status</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-staff-id" className="block font-bold text-slate-700 mb-1.5">Staff ID number</label>
            <input
              id="reg-staff-id"
              inputMode="numeric"
              autoComplete="off"
              maxLength={40}
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value.trim());
                setConfirmed(false);
                setError(null);
              }}
              aria-invalid={lookup.state === 'invalid'}
              className={`${inputClass} font-mono ${lookup.state === 'invalid' ? 'border-rose-400 bg-rose-50/50' : lookup.state === 'found' ? 'border-emerald-400' : ''}`}
            />
            {lookup.text && (
              <p
                aria-live="polite"
                className={`text-[11px] mt-1 font-semibold ${
                  lookup.state === 'found' ? 'text-emerald-700' : lookup.state === 'typing' ? 'text-slate-500' : lookup.state === 'invalid' ? 'text-rose-600' : 'text-amber-700'
                }`}
              >
                {lookup.text}
                {lookup.state === 'pending' && onOpenTracker && (
                  <button type="button" onClick={onOpenTracker} className="ml-1 underline cursor-pointer">Check status</button>
                )}
              </p>
            )}
          </div>

          {hr && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold"><Lock className="w-3 h-3" />From the HR employee directory</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><span className="block text-[10px] text-slate-400 font-bold">Name</span><span className="font-bold text-slate-900">{staffFullName(hr)}</span></div>
                <div><span className="block text-[10px] text-slate-400 font-bold">Position</span><span className="font-semibold">{hr.position}</span></div>
                <div><span className="block text-[10px] text-slate-400 font-bold">Department / office</span><span className="font-semibold">{hr.department}</span></div>
                <div><span className="block text-[10px] text-slate-400 font-bold">University email</span><span className="font-semibold">{hr.email}</span></div>
                <div><span className="block text-[10px] text-slate-400 font-bold">Mobile</span><span className="font-mono">{maskMobile(hr.mobile)}</span></div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                <span className="text-slate-700">This is my record. If anything is wrong, I will ask HR to correct it.</span>
              </label>
            </div>
          )}

          <FormError message={error} />
          <button type="submit" disabled={!hr || !confirmed || submitting} className={primaryButton}>
            {submitting ? 'Sending request…' : 'Request access'}
          </button>
        </form>
      )}
    </AuthModalShell>
  );
};
