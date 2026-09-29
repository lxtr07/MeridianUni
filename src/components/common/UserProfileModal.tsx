import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserCheck, AlertCircle, CheckCircle2, Lock, Info } from 'lucide-react';
import { UserProfile } from '../../types';
import { STAFF_POSITIONS, findHrStaff } from '../../data/universityRegistry';
import { describeSaveError } from '../../lib/dataSync';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSave: (updatedUser: UserProfile) => Promise<void> | void;
  title?: string;
  /** True when an administrator edits another staff member (may reassign position from the HR list). */
  allowRoleChange?: boolean;
  /** False when an admin is editing someone else's profile — mobile is then read-only. */
  allowMobileEdit?: boolean;
  existingUsers?: UserProfile[];
}

const digits = (v: string) => v.replace(/\D/g, '');
const formatMobile = (v: string) => {
  const d = digits(v).slice(0, 11);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(' ');
};

/**
 * Edit profile.
 *  - Position and department are defined by HR and shown read-only (administrators may reassign
 *    a staff member to another predefined position).
 *  - "Discard changes" and "Save changes" are only enabled once something has changed.
 *  - Any problem is explained directly above the Save button.
 *  - Passwords are changed in the separate Change Password dialog.
 */
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  title = 'Edit profile',
  allowRoleChange = false,
  allowMobileEdit = true,
}) => {
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const initial = useMemo(() => {
    if (!user) return { first: '', middle: '', last: '', phone: '', position: '' };
    const hrRecord = user.university_id ? findHrStaff(user.university_id) : undefined;
    let first = user.first_name || '';
    let middle = user.middle_name || '';
    let last = user.last_name || '';
    if (!first && !last && user.full_name) {
      const parts = user.full_name.replace(/^(Prof\.|Dr\.|Engr\.|Mr\.|Ms\.|Mrs\.)\s+/, '').trim().split(/\s+/);
      first = parts[0] || '';
      last = parts.length > 1 ? parts[parts.length - 1] : '';
      middle = parts.slice(1, -1).join(' ');
    }
    return {
      first: first || hrRecord?.first_name || '',
      middle: middle || hrRecord?.middle_name || '',
      last: last || hrRecord?.last_name || '',
      phone: formatMobile(user.phone || hrRecord?.mobile || ''),
      position: user.title || hrRecord?.position || '',
    };
  }, [user]);

  const reset = () => {
    setPhone(initial.phone);
    setPosition(initial.position);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (user && isOpen) {
      reset();
      setSuccessMessage(null);
    }
  }, [user, isOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !saving) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !user) return null;

  const hr = user.university_id ? findHrStaff(user.university_id) : undefined;
  const isDirty = (allowMobileEdit ? phone !== initial.phone : false) || position !== initial.position;

  const validate = (): string | null => {
    if (phone && !/^09\d{9}$/.test(digits(phone))) return 'Mobile number must be 11 digits and start with 09 (e.g. 0917 123 4567).';
    if (!position) return 'Choose a position from the HR list.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    const problem = validate();
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    setErrorMessage(null);
    setSaving(true);
    try {
      await onSave({
        ...user,
        phone: digits(phone),
        title: position,
        updated_at: new Date().toISOString(),
      });
      setSuccessMessage('Profile saved.');
      setTimeout(onClose, 1200);
    } catch (err) {
      setErrorMessage(`Your changes were not saved. ${describeSaveError(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none';
  const readOnly = 'w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center"><UserCheck className="w-5 h-5" /></div>
              <div>
                <h3 className="text-base font-bold">{title}</h3>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col text-xs">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'First name', v: initial.first },
                { label: 'Middle name', v: initial.middle },
                { label: 'Last name', v: initial.last },
              ].map((f) => (
                <div key={f.label}>
                  <span className="block font-bold text-slate-700 mb-1">{f.label}</span>
                  <p className={`${readOnly} flex items-center gap-1.5`}>
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{f.v || '—'}</span>
                  </p>
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="pf-phone" className="block font-bold text-slate-700 mb-1">Mobile number</label>
              {allowMobileEdit ? (
                <input id="pf-phone" inputMode="tel" maxLength={13} value={phone} onChange={(e) => setPhone(formatMobile(e.target.value))} className={input} />
              ) : (
                <p className={`${readOnly} flex items-center gap-1.5`}><Lock className="w-3 h-3 text-slate-400 shrink-0" />{phone || '—'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pf-position" className="block font-bold text-slate-700 mb-1">Position</label>
                {allowRoleChange ? (
                  <select id="pf-position" value={position} onChange={(e) => setPosition(e.target.value)} className={input}>
                    {!STAFF_POSITIONS.includes(position as any) && <option value={position}>{position || 'Select a position'}</option>}
                    {STAFF_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <p id="pf-position" className={`${readOnly} flex items-center gap-1.5`}><Lock className="w-3 h-3 text-slate-400" />{position || '—'}</p>
                )}
              </div>
              <div>
                <span className="block font-bold text-slate-700 mb-1">Department / office</span>
                <p className={`${readOnly} flex items-center gap-1.5`}><Lock className="w-3 h-3 text-slate-400" />{user.department || '—'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-700 mb-1">Staff ID</span>
                <p className={`${readOnly} font-mono flex items-center gap-1.5`}><Lock className="w-3 h-3 text-slate-400 shrink-0" />{user.university_id || '—'}</p>
              </div>
              <div>
                <span className="block font-bold text-slate-700 mb-1">Access level</span>
                <p className="px-1 py-2 font-semibold text-slate-800">{user.role === 'admin' ? 'System Administrator' : 'Scholarship staff'}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {allowRoleChange
                ? 'Your name, department and email come from HR records and cannot be edited here. Positions are chosen from the HR list.'
                : 'Your name, position, department and email come from HR records. Ask HR to correct any of them. To change your password, use Change Password.'}
            </p>

            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
              {errorMessage && (
                <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={reset}
                  disabled={!isDirty || saving}
                  className="px-4 py-2.5 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isDirty ? 'Put back the saved values' : 'Nothing to discard'}
                >
                  Discard changes
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || saving}
                    className="px-5 py-2.5 font-bold text-white bg-slate-900 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
