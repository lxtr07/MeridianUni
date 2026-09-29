import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Download, Printer, UserCheck, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { Application, Scholarship, UserProfile } from '../../types';
import { generateOfficialPDFReport, formatPeso } from '../../lib/pdfGenerator';

interface ReportExporterModalProps {
  applications: Application[];
  scholarships?: Scholarship[];
  currentUser?: UserProfile;
  users?: UserProfile[];
  onClose: () => void;
}

export const ReportExporterModal: React.FC<ReportExporterModalProps> = ({
  applications,
  scholarships = [],
  currentUser,
  users = [],
  onClose,
}) => {
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('All');

  // Signatory State — derives name/title from the selected user; never editable
  const staffAndAdminUsers = users.filter(u => u.role === 'staff' || u.role === 'admin');
  const facultyUsers = users.filter(u => u.role === 'staff');
  const defaultFaculty = facultyUsers.length > 0 ? facultyUsers[0] : null;

  const [preparedById, setPreparedById] = useState<string>(currentUser?.id || '');
  const [approvedById, setApprovedById] = useState<string>(defaultFaculty?.id || '');

  const preparedUser = staffAndAdminUsers.find(u => u.id === preparedById) || currentUser;
  const approvedUser = facultyUsers.find(u => u.id === approvedById) || defaultFaculty;

  // Keep name/title/dept for the PDF generator (derived, not state)
  const preparedByName   = preparedUser?.full_name   || 'System Administrator';
  const preparedByTitle  = preparedUser?.title        || 'System Administrator';
  const preparedByDept   = preparedUser?.department   || 'University Scholarship Board';
  const approvedByName   = approvedUser?.full_name    || '';
  const approvedByTitle  = approvedUser?.title        || 'Scholarship Staff';
  const approvedByDept   = approvedUser?.department   || '';

  // Keyboard accessibility: Escape key dismisses modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasFilterInput = Boolean(status !== 'All' || startDate !== '2026-01-01');

  const handleClear = () => {
    setStatus('All');
    setStartDate('');
    setEndDate('');
  };

  const handleReset = () => {
    setStartDate('2026-01-01');
    setEndDate(new Date().toISOString().split('T')[0]);
    setStatus('All');
    setPreparedById(currentUser?.id || '');
    setApprovedById(defaultFaculty?.id || '');
  };

  // Compute live scope metrics
  let filtered = [...applications];
  if (startDate) {
    filtered = filtered.filter(a => new Date(a.created_at) >= new Date(startDate));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(a => new Date(a.created_at) <= end);
  }
  if (status && status !== 'All') {
    filtered = filtered.filter(a => a.status === status);
  }

  const approvedCount = filtered.filter(a => a.status === 'Approved').length;
  const totalDisbursed = filtered
    .filter(a => a.status === 'Approved')
    .reduce((acc, curr) => acc + (curr.awarded_amount || 0), 0);

  const handleExportPDF = () => {
    generateOfficialPDFReport(applications, {
      filters: {
        startDate,
        endDate,
        status,
      },
      signatories: {
        preparedByName,
        preparedByTitle,
        preparedByDepartment: preparedByDept,
        approvedByName,
        approvedByTitle,
        approvedByDepartment: approvedByDept,
        institutionName: 'MERIDIAN UNIVERSITY ACADEMIC PORTAL',
        officeName: 'Office of Student Financial Aid & Academic Scholarships',
      },
      scholarships,
      currentUser,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Official PDF Executive Report Generator</h3>
              <p className="text-slate-400 text-xs">Formatted with analytics graphs, accurate signatories & PHP currency</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Live Summary Preview Box */}
          <div className="bg-linear-to-br from-slate-50 to-indigo-50/40 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 block">Report Data Scope</span>
              <p className="text-sm font-bold text-slate-900">
                {filtered.length} Applications Selected ({approvedCount} Approved)
              </p>
              <p className="text-slate-500 text-[11px]">
                Total Grant Allocation: <span className="font-bold text-emerald-600">{formatPeso(totalDisbursed)}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Philippine Peso (PHP)</span>
              </span>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Report Filters & Evaluation Scope</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Status Filter</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="All">All Statuses ({applications.length})</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Shortlisted">Shortlisted Only</option>
                  <option value="Pending">Pending / In Review Only</option>
                  <option value="Rejected">Rejected Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Signatories Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Signatories & Authentication Details</span>
              </h4>
              <span className="text-[10px] text-slate-400">Synced from Dashboard</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Signatory 1: Prepared By */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Prepared & Verified By</span>
                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">Operations</span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Select staff or admin:</label>
                  <select
                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-semibold"
                    value={preparedById}
                    onChange={(e) => setPreparedById(e.target.value)}
                  >
                    {staffAndAdminUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role === 'admin' ? 'Administrator' : 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                  <p className="text-[10px] text-slate-400">Full name</p>
                  <p className="text-xs font-bold text-slate-900">{preparedByName}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">Position / Title</p>
                  <p className="text-[11px] text-slate-700">{preparedByTitle}</p>
                </div>
              </div>

              {/* Signatory 2: Approved By */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Approved By</span>
                  <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">Faculty Chair</span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Select staff member:</label>
                  <select
                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-[11px] font-semibold"
                    value={approvedById}
                    onChange={(e) => setApprovedById(e.target.value)}
                  >
                    {facultyUsers.length === 0 && <option value="">No staff accounts yet</option>}
                    {facultyUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} — {u.title || 'Scholarship Staff'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                  <p className="text-[10px] text-slate-400">Full name</p>
                  <p className="text-xs font-bold text-slate-900">{approvedByName || '—'}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">Position / Title</p>
                  <p className="text-[11px] text-slate-700">{approvedByTitle || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual PDF Structure Note */}
          <div className="bg-slate-100/70 p-3 rounded-xl text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Included Executive Visual Elements in Generated PDF:</span>
            </span>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10.5px]">
              <li>Application Status Distribution Stacked Gauge Bar (Approved, Shortlisted, Pending, Rejected)</li>
              <li>Financial Grant Allocation Bar Chart across Scholarship Programs</li>
              <li>Executive KPI Metric Blocks with total disbursements in Philippine Peso (PHP / ₱)</li>
              <li>Comprehensive Applicant Registry Table with auto-spaced columns and zebra fills</li>
              <li>Certified Signature Block with active administrative and faculty names</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-xs flex items-center space-x-2 text-xs uppercase tracking-wide transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-300" />
            <span>Export Official PDF Summary</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};
