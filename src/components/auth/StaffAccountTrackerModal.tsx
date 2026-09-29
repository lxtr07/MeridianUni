import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  Building,
  Briefcase,
  Calendar,
  LogIn,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { StaffApplication } from '../../types';

interface StaffAccountTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffApplications: StaffApplication[];
  onProceedToLogin?: (email?: string) => void;
}

export const StaffAccountTrackerModal: React.FC<StaffAccountTrackerModalProps> = ({
  isOpen,
  onClose,
  staffApplications,
  onProceedToLogin
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [staffIdInput, setStaffIdInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [matchedApp, setMatchedApp] = useState<StaffApplication | null>(null);
  const [alreadyViewed, setAlreadyViewed] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanStaffId = staffIdInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanEmail || !cleanStaffId) return;

    setSearched(true);
    const found = staffApplications.find((app) => {
      const appEmail = (app.institutional_email || app.email || '').trim().toLowerCase();
      const appStaffId = (app.staff_id_number || app.staff_id || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return appEmail === cleanEmail && appStaffId === cleanStaffId;
    });

    if (found) {
      setMatchedApp(found);
      const credsKey = 'meridian_staff_creds_viewed_' + found.id;
      const isAlreadyViewed = Boolean(
        found.credentials_viewed ||
        found.credentials_retrieved ||
        localStorage.getItem(credsKey) === 'true'
      );
      setAlreadyViewed(isAlreadyViewed);

      // If approved and never viewed before, record that it has now been viewed
      if (found.status === 'Approved' && !isAlreadyViewed) {
        try {
          localStorage.setItem(credsKey, 'true');
          found.credentials_viewed = true;
          found.credentials_retrieved = true;
        } catch {
          // ignore
        }
      }
    } else {
      setMatchedApp(null);
      setAlreadyViewed(false);
    }
  };

  const handleCopy = (text: string, field: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleResetSearch = () => {
    setEmailInput('');
    setStaffIdInput('');
    setSearched(false);
    setMatchedApp(null);
    setAlreadyViewed(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Track Account Application</h2>
              <p className="text-xs text-blue-100">Meridian University • Staff & Faculty Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* 2-Factor Search Box */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Two-Factor Authentication Required</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                For security reasons, access to your application status and account credentials requires two-factor verification. Enter both your institutional email and your 10-digit Staff ID number.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institutional Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. csantos@meridian.edu"
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Staff ID Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={staffIdInput}
                    maxLength={10}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setStaffIdInput(clean);
                    }}
                    placeholder="e.g. 2026001045"
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  Both credentials must match university records
                </span>
                <div className="flex gap-2">
                  {(emailInput || staffIdInput) && (
                    <button
                      type="button"
                      onClick={handleResetSearch}
                      className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!emailInput.trim() || staffIdInput.trim().length !== 10}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Verify & Track
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Search Results */}
          {searched && (
            <div className="animate-fadeIn">
              {!matchedApp ? (
                <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-center space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Verification Failed / Record Not Found
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    No staff application was found matching Institutional Email <strong>"{emailInput}"</strong> and Staff ID <strong>"{staffIdInput}"</strong>.
                    Both factors must match your submitted application.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Card Header */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    matchedApp.status === 'Approved'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : matchedApp.status === 'Pending'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      {matchedApp.status === 'Approved' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      ) : matchedApp.status === 'Pending' ? (
                        <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                      )}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Application Status
                        </span>
                        <h3 className={`text-base font-bold ${
                          matchedApp.status === 'Approved'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : matchedApp.status === 'Pending'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {matchedApp.status === 'Approved' && 'Account Approved & Ready'}
                          {matchedApp.status === 'Pending' && 'Under Administrative Review'}
                          {matchedApp.status === 'Rejected' && 'Application Not Approved'}
                        </h3>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      matchedApp.status === 'Approved'
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                        : matchedApp.status === 'Pending'
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                        : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                    }`}>
                      {matchedApp.status}
                    </span>
                  </div>

                  {/* Summary Details */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Full Name:
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {matchedApp.first_name} {matchedApp.middle_name ? `${matchedApp.middle_name} ` : ''}{matchedApp.last_name}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" /> Department:
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {matchedApp.department}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" /> Position:
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {matchedApp.position}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Date Submitted:
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {new Date(matchedApp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending Notice */}
                  {matchedApp.status === 'Pending' && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-2">
                      <p className="font-semibold">Your application is currently pending admin review.</p>
                      <p>
                        Once our administrator verifies your departmental credentials, your initial login details will be generated and made accessible right here. Please check back periodically.
                      </p>
                    </div>
                  )}

                  {/* Rejected Notice */}
                  {matchedApp.status === 'Rejected' && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-2">
                      <p className="font-semibold">Review Remarks from Administrator:</p>
                      <p className="italic bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800">
                        {matchedApp.admin_notes || 'Application criteria were not met or staff ID could not be confirmed.'}
                      </p>
                      <p>
                        If you believe this was an error, please coordinate with the Meridian University IT Administration office.
                      </p>
                    </div>
                  )}

                  {/* Approved Credentials Box */}
                  {matchedApp.status === 'Approved' && (
                    <>
                      {alreadyViewed ? (
                        /* Security Notice: Credentials Already Retrieved */
                        <div className="p-5 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-lg space-y-4">
                          <div className="flex items-center gap-2 text-amber-400">
                            <ShieldCheck className="w-5 h-5 text-amber-400" />
                            <h4 className="font-bold text-sm tracking-wide uppercase">
                              Login Credentials Already Retrieved
                            </h4>
                          </div>

                          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed space-y-2">
                            <p className="font-bold text-amber-300">Security Protection Notice</p>
                            <p>
                              Under university security policies, your initial system credentials were displayed during your first tracking retrieval and are now permanently masked to protect your account.
                            </p>
                            <p>
                              If you have forgotten your password, please return to the Staff Sign In screen and click <strong>"Forgot Password"</strong> to initiate identity verification and recovery.
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onProceedToLogin) {
                                  onProceedToLogin(matchedApp.assigned_username || matchedApp.institutional_email);
                                }
                                onClose();
                              }}
                              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                            >
                              <LogIn className="w-4 h-4" />
                              Proceed to Staff Sign In
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* One-Time Credential Display with Prominent Security Warning */
                        <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl border border-indigo-700/50 shadow-lg space-y-4">
                          <div className="flex items-center gap-2 text-indigo-300">
                            <KeyRound className="w-5 h-5" />
                            <h4 className="font-bold text-sm tracking-wide uppercase">
                              Your Assigned Login Credentials
                            </h4>
                          </div>

                          {/* Prominent One-Time Display Warning */}
                          <div className="p-3.5 bg-amber-500/20 border-2 border-amber-400 rounded-xl text-xs text-amber-100 flex items-start gap-2.5 shadow-sm">
                            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <strong className="text-amber-200 uppercase font-black tracking-wide block text-[11px]">
                                One-Time Credential Display Notice
                              </strong>
                              <p className="leading-relaxed">
                                Please copy and record your credentials immediately. <strong>For security, these credentials will NOT be shown again.</strong> You are required to <strong>change your password immediately upon your first login</strong>.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 pt-1">
                            {/* Username */}
                            <div className="p-3 bg-white/10 rounded-lg flex items-center justify-between border border-white/10">
                              <div>
                                <span className="block text-[10px] uppercase font-bold text-indigo-300">
                                  Institutional Username / Email
                                </span>
                                <span className="font-mono text-sm font-semibold select-all">
                                  {matchedApp.assigned_username || matchedApp.institutional_email}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(matchedApp.assigned_username || matchedApp.institutional_email || '', 'username')}
                                className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs cursor-pointer"
                                title="Copy Username"
                              >
                                {copiedField === 'username' ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Password */}
                            <div className="p-3 bg-white/10 rounded-lg flex items-center justify-between border border-white/10">
                              <div>
                                <span className="block text-[10px] uppercase font-bold text-indigo-300">
                                  Assigned Initial Password
                                </span>
                                <span className="font-mono text-sm font-semibold select-all">
                                  {showPassword
                                    ? (matchedApp.assigned_password || 'staff123')
                                    : '••••••••••••'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
                                  title={showPassword ? 'Hide Password' : 'Show Password'}
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(matchedApp.assigned_password || 'staff123', 'password')}
                                  className="p-1.5 rounded-md hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs cursor-pointer"
                                  title="Copy Password"
                                >
                                  {copiedField === 'password' ? (
                                    <>
                                      <Check className="w-4 h-4 text-emerald-400" />
                                      <span className="text-emerald-400 font-medium">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onProceedToLogin) {
                                  onProceedToLogin(matchedApp.assigned_username || matchedApp.institutional_email);
                                }
                                onClose();
                              }}
                              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                            >
                              <LogIn className="w-4 h-4" />
                              Proceed to Staff Sign In
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
