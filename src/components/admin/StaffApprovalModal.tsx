import React, { useState } from 'react';
import {
  X,
  UserCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  Mail,
  Building,
  Briefcase,
  Phone,
  Calendar,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  Hash
} from 'lucide-react';
import { StaffApplication } from '../../types';

interface StaffApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: StaffApplication | null;
  onApprove: (
    applicationId: string,
    assignedUsername: string,
    assignedPassword: string,
    notes?: string
  ) => Promise<void>;
  onReject: (applicationId: string, reason: string) => Promise<void>;
}

export const StaffApprovalModal: React.FC<StaffApprovalModalProps> = ({
  isOpen,
  onClose,
  application,
  onApprove,
  onReject,
}) => {
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [assignedUsername, setAssignedUsername] = useState('');
  const [assignedPassword, setAssignedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when application changes
  React.useEffect(() => {
    if (application) {
      setAssignedUsername(application.assigned_username || application.institutional_email);
      setAssignedPassword(application.assigned_password || 'MeridianStaff2026!');
      setAdminNotes(application.admin_notes || 'Approved. Assigned official faculty/staff access.');
      setRejectionReason('');
      setDecision('approve');
      setError(null);
    }
  }, [application]);

  if (!isOpen || !application) return null;

  // Calculate age from birthdate
  let age = 'N/A';
  if (application.birthdate) {
    const bday = new Date(application.birthdate);
    const today = new Date();
    let calculatedAge = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
      calculatedAge--;
    }
    age = `${calculatedAge} years old`;
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAssignedPassword(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (decision === 'approve') {
      if (!assignedUsername.trim()) {
        setError('Please specify the assigned username or institutional email.');
        return;
      }
      if (!assignedPassword.trim() || assignedPassword.length < 6) {
        setError('Please generate or specify an assigned initial password (at least 6 characters).');
        return;
      }

      setIsSubmitting(true);
      try {
        await onApprove(application.id, assignedUsername.trim(), assignedPassword.trim(), adminNotes.trim());
        setIsSubmitting(false);
        onClose();
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'Failed to approve application.');
      }
    } else {
      if (!rejectionReason.trim()) {
        setError('Please provide a reason for rejecting this staff application.');
        return;
      }

      setIsSubmitting(true);
      try {
        await onReject(application.id, rejectionReason.trim());
        setIsSubmitting(false);
        onClose();
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'Failed to reject application.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-4 max-h-[92vh] overflow-hidden"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Review Staff Account Application</h2>
              <p className="text-xs text-slate-400">Meridian University Administration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Applicant Profile Snapshot */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold block">Applicant Name</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {application.first_name} {application.middle_name ? `${application.middle_name} ` : ''}{application.last_name}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-500" /> Staff ID Number
              </span>
              <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                {application.staff_id}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-500" /> Institutional Email
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate" title={application.institutional_email}>
                {application.institutional_email}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-indigo-500" /> Department / Office
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {application.department}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Position
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {application.position}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-500" /> Contact Phone
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {application.phone_number}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Birthdate & Age
              </span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {application.birthdate} ({age})
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold block">Date Submitted</span>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {new Date(application.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold block">Current Status</span>
              <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                application.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : application.status === 'Pending'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {application.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Select Administrative Action
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('approve')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition ${
                  decision === 'approve'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Generate Credentials
              </button>

              <button
                type="button"
                onClick={() => setDecision('reject')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition ${
                  decision === 'reject'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-400 shadow-xs ring-2 ring-rose-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Reject Application
              </button>
            </div>
          </div>

          {/* Approval: Credential Generation Section */}
          {decision === 'approve' ? (
            <div className="space-y-4 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl animate-fadeIn">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Manual Credential Generation</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Generate and assign the login credentials for this staff member. Once approved, the staff member will be able to retrieve these credentials via the account tracker.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assigned Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Username / Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={assignedUsername}
                    onChange={(e) => setAssignedUsername(e.target.value)}
                    placeholder="e.g. staff@meridian.edu"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Assigned Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assigned Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Generate Random
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={assignedPassword}
                      onChange={(e) => setAssignedPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrative Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Account approved and assigned to Scholarship Review Committee."
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          ) : (
            /* Rejection Reason Section */
            <div className="space-y-3 p-5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl animate-fadeIn">
              <label className="block text-xs font-semibold text-rose-900 dark:text-rose-300">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State the reason for rejecting this staff account application (e.g. Staff ID verification failed with University Registrar, invalid department code, etc.)"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <p className="text-[11px] text-slate-500">
                This explanation will be visible to the applicant when they check their status via the Account Tracker.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-sm flex items-center gap-2 ${
                decision === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
              }`}
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : decision === 'approve' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Approval & Issue Credentials</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
