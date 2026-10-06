import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ShieldAlert, AlertTriangle, AlertCircle } from 'lucide-react';
import { Scholarship, FreezePeriod, UserProfile } from '../../types';

interface EmergencyFreezeModalProps {
  scholarships: Scholarship[];
  currentUser?: UserProfile;
  onClose: () => void;
  onSaveFreeze: (newFreeze: FreezePeriod) => void;
}

type ActionType = '' | 'freeze' | 'extend' | 'unfreeze';

/**
 * Pause, extend or resume scholarship submissions.
 * The form opens completely empty so nothing is broadcast by accident — every choice is deliberate.
 */
export const EmergencyFreezeModal: React.FC<EmergencyFreezeModalProps> = ({
  scholarships,
  currentUser,
  onClose,
  onSaveFreeze,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [selectedScholarshipId, setSelectedScholarshipId] = useState('');
  const [actionType, setActionType] = useState<ActionType>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [announcementNote, setAnnouncementNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const hasAnyInput = Boolean(selectedScholarshipId || actionType || startDate || endDate || announcementNote);

  const handleClear = () => {
    setSelectedScholarshipId('');
    setActionType('');
    setStartDate('');
    setEndDate('');
    setAnnouncementNote('');
    setError(null);
  };

  const selectedScholarship = scholarships.find((s) => s.id === selectedScholarshipId);
  const isCurrentlyFrozen =
    selectedScholarshipId === 'all' ? scholarships.some((s) => s.is_frozen) : selectedScholarship?.is_frozen ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedScholarshipId) return setError('Choose which scholarship this applies to.');
    if (!actionType) return setError('Choose what you want to do.');

    if (actionType === 'unfreeze') {
      if (!isCurrentlyFrozen) return setError('That scholarship is not paused right now, so there is nothing to resume.');
    } else {
      if (!startDate) return setError('Enter the date this takes effect.');
      if (endDate && endDate < startDate) return setError('The end date must be on or after the start date.');
      if (!announcementNote.trim()) return setError('Write the notice students will see on their portal.');
    }

    setError(null);
    const matched = scholarships.find((s) => s.id === selectedScholarshipId);

    onSaveFreeze({
      id: `fz-${Date.now()}`,
      scholarship_id: selectedScholarshipId,
      scholarship_title: matched ? matched.title : 'All scholarships',
      start_date: actionType === 'unfreeze' ? today : startDate,
      end_date: actionType === 'unfreeze' ? today : endDate,
      announcement_note:
        actionType === 'unfreeze' ? 'Scholarship submissions have resumed.' : announcementNote.trim(),
      created_by: currentUser ? `${currentUser.full_name} (${currentUser.role === 'coordinator' || currentUser.role === 'admin' ? 'Scholarship Coordinator' : 'Scholarship Staff'})` : 'Scholarship Staff',
      created_at: new Date().toISOString(),
      is_active: actionType === 'freeze',
    });
    onClose();
  };

  const field =
    'w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Pause or resume submissions">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 my-4 max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl"><ShieldAlert className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold">Pause, extend or resume submissions</h3>
              <p className="text-[11px] text-slate-400">Students see this change right away</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-2 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-6 space-y-4 text-xs overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Set up the announcement</span>
              <button
                type="button"
                disabled={!hasAnyInput}
                onClick={handleClear}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  hasAnyInput
                    ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer border border-rose-200'
                    : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200'
                }`}
              >
                Clear form
              </button>
            </div>

            <div>
              <label htmlFor="fz-target" className="block font-bold text-slate-700 mb-1">Which scholarship?</label>
              <select id="fz-target" value={selectedScholarshipId} onChange={(e) => { setSelectedScholarshipId(e.target.value); setError(null); }} className={field}>
                <option value="">Select a scholarship</option>
                <option value="all">All scholarship programs</option>
                {scholarships.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} ({s.code}){s.is_frozen ? ' — currently paused' : ''}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="fz-action" className="block font-bold text-slate-700 mb-1">What do you want to do?</label>
                <select id="fz-action" value={actionType} onChange={(e) => { setActionType(e.target.value as ActionType); setError(null); }} className={`${field} font-bold`}>
                  <option value="">Select an action</option>
                  <option value="freeze">Pause new submissions</option>
                  <option value="extend">Extend the application deadline</option>
                  <option value="unfreeze">Resume submissions</option>
                </select>
                {actionType === 'unfreeze' && selectedScholarshipId && !isCurrentlyFrozen && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">This scholarship is not paused right now.</p>
                )}
              </div>

              <div>
                <label htmlFor="fz-start" className="block font-bold text-slate-700 mb-1">Takes effect on</label>
                <input
                  id="fz-start"
                  type="date"
                  value={startDate}
                  min={today}
                  disabled={actionType === 'unfreeze'}
                  onChange={(e) => { setStartDate(e.target.value); setError(null); }}
                  className={field}
                />
                {actionType === 'unfreeze' && <p className="text-[11px] text-slate-500 mt-1">Resuming takes effect immediately.</p>}
              </div>
            </div>

            {actionType !== 'unfreeze' && (
              <>
                <div>
                  <label htmlFor="fz-end" className="block font-bold text-slate-700 mb-1">
                    Ends on <span className="font-normal text-slate-400">(optional — leave empty to keep it in place until you resume)</span>
                  </label>
                  <input id="fz-end" type="date" value={endDate} min={startDate || today} onChange={(e) => { setEndDate(e.target.value); setError(null); }} className={field} />
                </div>

                <div>
                  <label htmlFor="fz-note" className="block font-bold text-slate-700 mb-1">Notice shown to students</label>
                  <textarea
                    id="fz-note"
                    rows={3}
                    value={announcementNote}
                    maxLength={300}
                    onChange={(e) => { setAnnouncementNote(e.target.value); setError(null); }}
                    placeholder="Example: Submissions are paused until 15 October while the committee verifies mid-term grades."
                    className={field}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">{announcementNote.length}/300 characters</p>
                </div>
              </>
            )}

            {actionType === 'unfreeze' ? (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                Students will be able to apply again and the notice banner is removed from their portal.
              </div>
            ) : actionType ? (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>Saving posts the notice on the student portal right away and updates the scholarship's status.</p>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
            {error && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer">
                {actionType === 'unfreeze' ? 'Resume submissions' : actionType === 'extend' ? 'Post deadline extension' : 'Pause submissions'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
