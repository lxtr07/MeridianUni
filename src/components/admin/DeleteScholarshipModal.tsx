import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Trash2, X, AlertOctagon, Users, ShieldAlert, Award, FileText, Ban } from 'lucide-react';
import { Scholarship, Application } from '../../types';

interface DeleteScholarshipModalProps {
  scholarship: Scholarship | null;
  applications: Application[];
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

export const DeleteScholarshipModal: React.FC<DeleteScholarshipModalProps> = ({
  scholarship,
  applications,
  onClose,
  onConfirmDelete,
}) => {
  if (!scholarship) return null;

  // Find linked applications
  const linkedApplications = applications.filter(a => a.scholarship_id === scholarship.id);
  const pendingCount = linkedApplications.filter(a => a.status === 'Pending' || a.status === 'In Review' || a.status === 'Shortlisted').length;
  const approvedCount = linkedApplications.filter(a => a.status === 'Approved').length;

  const handleDelete = () => {
    onConfirmDelete(scholarship.id);
    onClose();
  };

  return (
    <div id="delete-scholarship-modal-overlay" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Delete Scholarship Program?
              </h3>
              <p className="text-xs text-slate-400">
                Confirm removal from active scholarship catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Target Item Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                {scholarship.code}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                {scholarship.category}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              {scholarship.title}
            </h4>
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] border-t border-slate-200 text-slate-600">
              <div>
                <span className="text-slate-400 block">Grant Value</span>
                <span className="font-bold text-indigo-600">₱{scholarship.grant_amount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Slots Available</span>
                <span className="font-bold text-slate-900">{scholarship.slots_remaining} / {scholarship.slots}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Min. GWA</span>
                <span className="font-bold text-slate-900">{scholarship.min_gwa.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Explanation & Consequences Breakdown */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <span>Actions & Consequences of Deletion</span>
            </h5>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start space-x-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">Immediate Delisting from Student Portal</strong>
                  <span>Students will no longer see this program in the scholarship catalog and new applications cannot be submitted.</span>
                </div>
              </div>

              {linkedApplications.length > 0 ? (
                <div className="flex items-start space-x-2.5 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <Users className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-950 block">
                      {linkedApplications.length} Linked Student Application{linkedApplications.length > 1 ? 's' : ''} Affected
                    </strong>
                    <span>
                      There are currently <strong className="text-indigo-700">{pendingCount} pending/in-review</strong> applications and <strong className="text-emerald-700">{approvedCount} approved grants</strong> associated with this program code.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">No Active Submissions</strong>
                    <span>No students have submitted applications for this specific program code.</span>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2.5 bg-rose-50 p-3 rounded-xl border border-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-950 block">Permanent Record Removal</strong>
                  <span>This record will be permanently deleted from the database. (Default programs can be recovered at any time via &ldquo;Restore Default Programs&rdquo;).</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
          >
            Cancel & Keep Program
          </button>

          <button
            type="button"
            id="confirm-delete-scholarship-btn"
            onClick={handleDelete}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Yes, Delete Scholarship</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
