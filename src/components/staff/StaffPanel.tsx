import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon, Users, FileText, ShieldAlert, Search,
  CheckCircle2, Clock, Award, ChevronRight, Eye, UserCheck,
  AlertCircle, Plus, Sparkles, XCircle, RefreshCw, CalendarX,
  ChevronLeft, Filter, ShieldX, Trash2, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown, KeyRound
} from 'lucide-react';
import { Scholarship, Application, FreezePeriod, UserProfile, InterviewSchedule, ApplicationStatus } from '../../types';
import { EmergencyFreezeModal } from './EmergencyFreezeModal';
import { ApplicationReviewDrawer } from './ApplicationReviewDrawer';
import { UserProfileModal } from '../common/UserProfileModal';
import { ChangePasswordModal } from '../common/ChangePasswordModal';
import { StandardPagination } from '../common/StandardPagination';

const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day) {
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  'Pending':     'bg-slate-200 text-slate-800',
  'In Review':   'bg-sky-100 text-sky-800',
  'Shortlisted': 'bg-indigo-100 text-indigo-800',
  'Approved':    'bg-emerald-100 text-emerald-800',
  'Rejected':    'bg-rose-100 text-rose-800',
  'For Renewal': 'bg-amber-100 text-amber-800',
  'Expired':     'bg-orange-100 text-orange-800',
  'Removed':     'bg-red-100 text-red-900',
  'For Approval': 'bg-violet-100 text-violet-800',
};

interface StaffPanelProps {
  user: UserProfile;
  scholarships: Scholarship[];
  applications: Application[];
  freezePeriods: FreezePeriod[];
  interviews: InterviewSchedule[];
  onUpdateApplication: (app: Application) => void;
  onDeleteApplication?: (id: string) => void;
  onSaveFreeze: (freeze: FreezePeriod) => void;
  onSaveInterview?: (interview: InterviewSchedule) => void;
  onDeleteInterview?: (id: string) => void;
  onClearAllInterviews?: () => void;
  onUpdateUser?: (user: UserProfile) => void;
}

export const StaffPanel: React.FC<StaffPanelProps> = ({
  user,
  scholarships,
  applications,
  freezePeriods,
  interviews,
  onUpdateApplication,
  onDeleteApplication,
  onSaveFreeze,
  onSaveInterview,
  onDeleteInterview,
  onClearAllInterviews,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'lifecycle' | 'schedule'>('queue');

  // Queue Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [scholarshipFilter, setScholarshipFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(20);
  const [queueSortOrder, setQueueSortOrder] = useState<'desc' | 'asc'>('desc');

  // Calendar / Deadlines pagination
  const [schedulePageSize, setSchedulePageSize] = useState(10);
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState(1);

  // Interview Schedule Delete Modals
  const [deleteTargetSchedule, setDeleteTargetSchedule] = useState<InterviewSchedule | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Modal / Drawer state
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Keyboard accessibility: Escape key dismisses open overlays and drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFreezeModal) setShowFreezeModal(false);
        else if (showProfileModal) setShowProfileModal(false);
        else if (showPasswordModal) setShowPasswordModal(false);
        else if (selectedApp) setSelectedApp(null);
        else if (deleteTargetSchedule) setDeleteTargetSchedule(null);
        else if (showClearAllModal) setShowClearAllModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFreezeModal, showProfileModal, showPasswordModal, selectedApp, deleteTargetSchedule, showClearAllModal]);

  // Status counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of applications) {
      c[a.status] = (c[a.status] || 0) + 1;
    }
    return c;
  }, [applications]);

  // The Program filter only lists scholarships that actually have applicants,
  // so staff never pick a program that returns an empty queue.
  const scholarshipsWithApplicants = useMemo(() => {
    const counts = new Map<string, number>();
    applications.forEach((a) => counts.set(a.scholarship_id, (counts.get(a.scholarship_id) || 0) + 1));
    return scholarships
      .filter((s) => counts.has(s.id))
      .map((s) => ({ ...s, applicantCount: counts.get(s.id) || 0 }))
      .sort((a, b) => b.applicantCount - a.applicantCount);
  }, [scholarships, applications]);

  // Filtered queue with interactive chronological sort
  const filteredQueue = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const sorted = [...applications].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return queueSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
    return sorted.filter(app => {
      const matchesSearch = !q ||
        `${app.first_name} ${app.last_name}`.toLowerCase().includes(q) ||
        app.student_number.toLowerCase().includes(q) ||
        app.reference_code.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      const matchesSch = scholarshipFilter === 'All' || app.scholarship_id === scholarshipFilter;

      let matchesDate = true;
      if (dateFrom) matchesDate = matchesDate && app.created_at >= dateFrom;
      if (dateTo)   matchesDate = matchesDate && app.created_at.split('T')[0] <= dateTo;

      return matchesSearch && matchesStatus && matchesSch && matchesDate;
    });
  }, [applications, searchQuery, statusFilter, scholarshipFilter, dateFrom, dateTo, queueSortOrder]);

  // Queue Pagination
  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / queuePageSize));
  const pagedQueue = filteredQueue.slice((currentPage - 1) * queuePageSize, currentPage * queuePageSize);

  // Calendar / Deadlines Pagination with default descending sort by date
  const sortedScholarships = useMemo(() => {
    return [...scholarships].sort(
      (a, b) => new Date(b.deadline || b.created_at || '').getTime() - new Date(a.deadline || a.created_at || '').getTime()
    );
  }, [scholarships]);
  const totalSchedulePages = Math.max(1, Math.ceil(sortedScholarships.length / schedulePageSize));
  const pagedScholarships = sortedScholarships.slice(
    (scheduleCurrentPage - 1) * schedulePageSize,
    scheduleCurrentPage * schedulePageSize
  );

  const [interviewSortOrder, setInterviewSortOrder] = useState<'desc' | 'asc'>('desc');

  // Shortlist interviews with interactive chronological sort
  const sortedInterviews = useMemo(() => {
    return [...interviews].sort((a, b) => {
      const cmp = (b.date_time || '').localeCompare(a.date_time || '');
      return interviewSortOrder === 'desc' ? cmp : -cmp;
    });
  }, [interviews, interviewSortOrder]);

  // Reset page on filter change
  const resetPage = () => setCurrentPage(1);

  // Scholar Lifecycle groups with default descending sort
  const lifecycleGroups = useMemo(() => ({
    expiredOrRenewal: applications
      .filter(a => a.status === 'Expired' || a.status === 'For Renewal')
      .sort((a, b) => new Date(b.expires_at || b.updated_at || b.created_at).getTime() - new Date(a.expires_at || a.updated_at || a.created_at).getTime()),
    removed: applications
      .filter(a => a.status === 'Removed')
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()),
  }), [applications]);

  // Status summary cards config
  const statusCards = [
    { label: 'Pending',     color: 'text-slate-600 bg-slate-100',  badge: 'bg-slate-200', count: counts['Pending'] || 0 },
    { label: 'In Review',   color: 'text-sky-700 bg-sky-50',       badge: 'bg-sky-100',   count: counts['In Review'] || 0 },
    { label: 'Shortlisted', color: 'text-indigo-700 bg-indigo-50', badge: 'bg-indigo-100',count: counts['Shortlisted'] || 0 },
    { label: 'Approved',    color: 'text-emerald-700 bg-emerald-50',badge: 'bg-emerald-100', count: counts['Approved'] || 0 },
    { label: 'Rejected',    color: 'text-rose-700 bg-rose-50',     badge: 'bg-rose-100',  count: counts['Rejected'] || 0 },
    { label: 'For Renewal', color: 'text-amber-700 bg-amber-50',   badge: 'bg-amber-100', count: counts['For Renewal'] || 0 },
    { label: 'Expired',     color: 'text-orange-700 bg-orange-50', badge: 'bg-orange-100',count: counts['Expired'] || 0 },
    { label: 'Removed',     color: 'text-red-700 bg-red-50',       badge: 'bg-red-100',   count: counts['Removed'] || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Panel Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded uppercase">
              Staff Coordinator Dashboard
            </span>
            <span className="text-xs text-slate-500 font-medium">{user.department}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex flex-wrap items-center gap-2">
            <span>Scholarship Review &amp; Evaluation Desk</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 font-bold">
              👤 {user.full_name}
            </span>
          </h1>
        </div>

        <div className="flex items-center justify-end gap-2.5 flex-wrap sm:flex-nowrap md:ml-auto shrink-0 w-full md:w-auto">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs h-[42px]"
            title="Edit profile information"
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs h-[42px]"
            title="Update your login password"
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Change Password</span>
          </button>
          <button
            onClick={() => setShowFreezeModal(true)}
            className="flex items-center justify-center space-x-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-2xs cursor-pointer h-[42px]"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Emergency Freeze / Extension</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { key: 'queue',     icon: <FileText className="w-4 h-4 text-indigo-400" />,    label: `Application Queue (${applications.length})`, badge: counts['Pending'] },
          { key: 'lifecycle', icon: <RefreshCw className="w-4 h-4 text-amber-500" />,    label: `Scholar Lifecycle`, badge: (counts['For Renewal'] || 0) + (counts['Expired'] || 0) + (counts['Removed'] || 0) },
          { key: 'schedule',  icon: <CalendarIcon className="w-4 h-4 text-indigo-400" />, label: 'Calendar & Deadlines' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center space-x-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.key ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* TAB 1: APPLICATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">

          {/* Full Status Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {statusCards.map(card => (
              <button
                key={card.label}
                onClick={() => {
                  setStatusFilter(statusFilter === card.label ? 'All' : card.label);
                  resetPage();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  statusFilter === card.label
                    ? 'border-indigo-500 shadow-md ring-1 ring-indigo-400'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase tracking-wider block truncate ${card.color.split(' ')[0]}`}>{card.label}</span>
                <span className="text-xl font-extrabold text-slate-900">{card.count}</span>
              </button>
            ))}
          </div>

          {/* Queue Filters */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, ID, ref code, email..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); resetPage(); }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2 text-xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Status:</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); resetPage(); }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none text-xs"
                >
                  <option value="All">All</option>
                  {['Pending','In Review','Shortlisted','Approved','Rejected','For Renewal','Expired','Removed'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Scholarship */}
              <div className="flex items-center space-x-2 text-xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Program:</label>
                <select
                  value={scholarshipFilter}
                  onChange={e => { setScholarshipFilter(e.target.value); resetPage(); }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold max-w-[180px] truncate focus:outline-none text-xs"
                >
                  <option value="All">All programs ({applications.length})</option>
                  {scholarshipsWithApplicants.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({s.applicantCount})</option>
                  ))}
                </select>
              </div>

              {/* Show max per page selector & Sort */}
              <div className="flex items-center space-x-2 text-xs ml-auto">
                <button
                  type="button"
                  onClick={() => setQueueSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="text-xs text-slate-700 hover:text-slate-900 font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 border border-slate-200"
                  title={`Sort by Submission Date: currently ${queueSortOrder === 'desc' ? 'Descending (Newest First)' : 'Ascending (Oldest First)'}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{queueSortOrder === 'desc' ? 'Newest (Desc)' : 'Oldest (Asc)'}</span>
                </button>
                <span className="text-xs text-slate-500 font-medium">Show max per page:</span>
                <select
                  value={queuePageSize}
                  onChange={(e) => {
                    setQueuePageSize(Number(e.target.value));
                    resetPage();
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10 items</option>
                  <option value={20}>20 items</option>
                  <option value={50}>50 items</option>
                </select>
              </div>
            </div>

            {/* Date Filter Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Submitted From:</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={dateFrom}
                  onChange={e => {
                    const today = new Date().toISOString().split('T')[0];
                    const val = e.target.value > today ? today : e.target.value;
                    setDateFrom(val);
                    resetPage();
                  }}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0">To:</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={dateTo}
                  onChange={e => {
                    const today = new Date().toISOString().split('T')[0];
                    const val = e.target.value > today ? today : e.target.value;
                    setDateTo(val);
                    resetPage();
                  }}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {(dateFrom || dateTo || searchQuery || statusFilter !== 'All' || scholarshipFilter !== 'All') && (
                <button
                  onClick={() => {
                    setDateFrom(''); setDateTo(''); setSearchQuery('');
                    setStatusFilter('All'); setScholarshipFilter('All'); resetPage();
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table header with count */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                Showing {filteredQueue.length === 0 ? 0 : (currentPage - 1) * queuePageSize + 1}–{Math.min(currentPage * queuePageSize, filteredQueue.length)} of <span className="text-indigo-600">{filteredQueue.length}</span> applications
              </span>
              <span className="text-slate-400 font-medium">{queuePageSize} per page</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Ref Code &amp; Student</th>
                    <th className="p-4">Scholarship Program</th>
                    <th className="p-4">Program &amp; GWA</th>
                    <th className="p-4">
                      <button
                        type="button"
                        onClick={() => setQueueSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="inline-flex items-center gap-1.5 uppercase font-bold text-[10px] text-white hover:text-indigo-300 transition-colors cursor-pointer group"
                        title={`Sort by Submission Date: currently ${queueSortOrder === 'desc' ? 'Descending (Newest First)' : 'Ascending (Oldest First)'}`}
                      >
                        <span>Submitted</span>
                        <span className="p-0.5 rounded bg-white/10 group-hover:bg-indigo-600 transition-colors inline-flex items-center">
                          {queueSortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        </span>
                      </button>
                    </th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Grant Validity</th>
                    <th className="p-4">Awarded (₱)</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        No applications matched your filters.
                      </td>
                    </tr>
                  ) : (
                    pagedQueue.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-bold text-indigo-600 block">{app.reference_code}</span>
                          <span className="font-bold text-slate-900 block">{app.first_name} {app.last_name}</span>
                          <span className="text-[10px] text-slate-400">ID #{app.student_number}</span>
                          {app.is_renewal && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded ml-0 mt-0.5 inline-flex items-center space-x-0.5">
                              <RefreshCw className="w-2.5 h-2.5" /><span>Renewal</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          <span className="font-bold text-slate-800 line-clamp-1">{app.scholarship_title}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 block">{app.program}</span>
                          <span className="text-[10px] font-bold text-indigo-600">GWA: {app.gwa.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-slate-500">{formatDate(app.created_at.split('T')[0])}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[10px] uppercase ${STATUS_BADGE[app.status]}`}>
                            {app.status}
                          </span>
                          {app.approved_by && (
                            <span className="block text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[150px]" title={`Approved by: ${app.approved_by}`}>
                              By: <strong className="text-slate-800">{app.approved_by}</strong>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[11px] text-slate-600">
                          {app.expires_at ? (
                            <div>
                              <span className="text-slate-400 text-[10px] block">Expires:</span>
                              <span className="font-bold text-slate-800">{formatDate(app.expires_at)}</span>
                              {app.status === 'Approved' ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedApp(app)}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold block mt-0.5 cursor-pointer underline hover:no-underline"
                                  title="Set or change scholar grant validity and expiration date"
                                >
                                  Change Validity
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 block mt-0.5 italic">Locked (Not Approved)</span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 text-[10px] block">Not Set</span>
                              {app.status === 'Approved' ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedApp(app)}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded block mt-0.5 cursor-pointer"
                                  title="Set scholar grant validity and expiration date"
                                >
                                  + Set Validity
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 block mt-0.5 italic">Available upon Approval</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {app.status === 'Approved' ? `₱${app.awarded_amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="bg-slate-900 hover:bg-indigo-600 text-white font-bold px-3.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Standardized Pagination Controls matching image_bff423.png */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredQueue.length}
                pageSize={queuePageSize}
                pageSizeOptions={[6, 10, 20, 50]}
                itemLabel="applications"
                onPageChange={setCurrentPage}
                onPageSizeChange={setQueuePageSize}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHOLAR LIFECYCLE */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-6">
          {/* Expired & Concluded Grants (Includes Renewable Grants) */}
          <div className="bg-white rounded-2xl border border-orange-200 shadow-xs overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarX className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-bold text-orange-800">Expired &amp; Term Concluded Grants</h3>
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lifecycleGroups.expiredOrRenewal.length}</span>
              </div>
              <p className="text-xs text-orange-600">Scholarship term lapsed or completed. Renewable programs tagged below.</p>
            </div>
            <LifecycleTable apps={lifecycleGroups.expiredOrRenewal} scholarships={scholarships} onReview={setSelectedApp} emptyMsg="No expired or concluded scholarships." />
          </div>

          {/* Removed */}
          <div className="bg-white rounded-2xl border border-red-200 shadow-xs overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldX className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-bold text-red-800">Removed</h3>
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lifecycleGroups.removed.length}</span>
              </div>
              <p className="text-xs text-red-600">Scholars removed due to policy failure (GWA drop, etc.)</p>
            </div>
            <LifecycleTable apps={lifecycleGroups.removed} scholarships={scholarships} onReview={setSelectedApp} emptyMsg="No removed scholars." showRemovalReason />
          </div>
        </div>
      )}

      {/* TAB 3: CALENDAR & DEADLINES */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  <span>Upcoming Scholarship Deadlines</span>
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-medium">Show max per page:</span>
                  <select
                    value={schedulePageSize}
                    onChange={(e) => {
                      setSchedulePageSize(Number(e.target.value));
                      setScheduleCurrentPage(1);
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={5}>5 items</option>
                    <option value={10}>10 items</option>
                    <option value={20}>20 items</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                {pagedScholarships.map(s => (
                  <div key={s.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-400 block">{s.code}</span>
                      <p className="font-bold text-slate-900 text-sm">{s.title}</p>
                      <div className="flex items-center space-x-3 mt-0.5">
                        <p className="text-[11px] text-slate-500">{s.category} • {s.slots_remaining} slots left</p>
                        <span className="text-[10px] font-bold text-indigo-600">{s.duration_years}yr{s.is_renewable ? ' · Renewable' : ''}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-bold text-indigo-600 text-sm block">{formatDate(s.deadline)}</span>
                      {s.is_renewable && s.renewal_deadline && (
                        <span className="text-[10px] text-amber-600 block font-medium">
                          Renewal by {formatDate(s.renewal_deadline)}
                        </span>
                      )}
                      {s.is_frozen ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Paused</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Open</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule Pagination Controls */}
              {totalSchedulePages > 1 && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing {(scheduleCurrentPage - 1) * schedulePageSize + 1}–{Math.min(scheduleCurrentPage * schedulePageSize, scholarships.length)} of {scholarships.length}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={scheduleCurrentPage === 1}
                      onClick={() => setScheduleCurrentPage(p => p - 1)}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                    >
                      Prev
                    </button>
                    <span className="font-bold text-slate-700">
                      Page {scheduleCurrentPage} of {totalSchedulePages}
                    </span>
                    <button
                      disabled={scheduleCurrentPage === totalSchedulePages}
                      onClick={() => setScheduleCurrentPage(p => p + 1)}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span>Shortlist Interviews ({sortedInterviews.length})</span>
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setInterviewSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="text-[11px] text-slate-700 hover:text-slate-900 font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-200"
                    title={`Sort by Date/Time: currently ${interviewSortOrder === 'desc' ? 'Descending (Latest First)' : 'Ascending (Earliest First)'}`}
                  >
                    <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                    <span>{interviewSortOrder === 'desc' ? 'Latest (Desc)' : 'Earliest (Asc)'}</span>
                  </button>
                  {sortedInterviews.length > 0 && onClearAllInterviews && (
                    <button
                      type="button"
                      onClick={() => setShowClearAllModal(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear All Schedules
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {sortedInterviews.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No scheduled interviews.</p>
                ) : (
                  sortedInterviews.map(inv => (
                    <div key={inv.id} className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs space-y-1 relative group">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900">{inv.student_name}</p>
                          <p className="text-[11px] text-indigo-600 font-medium">{inv.scholarship_title}</p>
                        </div>
                        {onDeleteInterview && (
                          <button
                            type="button"
                            onClick={() => setDeleteTargetSchedule(inv)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">📅 {inv.date_time}</p>
                      <p className="text-[10px] text-slate-500">📍 {inv.location}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Interview Confirmation Modal */}
      {deleteTargetSchedule && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Delete Schedule</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this schedule?
            </p>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{deleteTargetSchedule.student_name}</p>
              <p className="text-indigo-600 font-medium">{deleteTargetSchedule.scholarship_title}</p>
              <p className="text-slate-500 font-mono">📅 {deleteTargetSchedule.date_time}</p>
              <p className="text-slate-500">📍 {deleteTargetSchedule.location}</p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetSchedule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteInterview && deleteTargetSchedule) {
                    onDeleteInterview(deleteTargetSchedule.id);
                  }
                  setDeleteTargetSchedule(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Delete Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Schedules Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Clear All Schedules</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to clear all schedules? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllInterviews) {
                    onClearAllInterviews();
                  }
                  setShowClearAllModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Clear All Schedules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Freeze Modal */}
      <AnimatePresence>
        {showFreezeModal && (
          <EmergencyFreezeModal
            scholarships={scholarships}
            currentUser={user}
            onClose={() => setShowFreezeModal(false)}
            onSaveFreeze={onSaveFreeze}
          />
        )}
      </AnimatePresence>

      {/* Application Review Drawer */}
      <AnimatePresence>
        {selectedApp && (
          <ApplicationReviewDrawer
            application={selectedApp}
            currentUser={user}
            scholarships={scholarships}
            onClose={() => setSelectedApp(null)}
            onUpdateApplication={onUpdateApplication}
            onDeleteApplication={onDeleteApplication}
            onSaveInterview={onSaveInterview}
          />
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <UserProfileModal
        allowMobileEdit={true}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onSave={async (updatedUser) => {
          if (onUpdateUser) await onUpdateUser(updatedUser);
        }}
        title="Edit Faculty & Coordinator Profile"
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        user={user}
        onPasswordChanged={async (updatedUser) => {
          if (onUpdateUser) await onUpdateUser(updatedUser);
        }}
      />
    </div>
  );
};

// ─── Lifecycle Table Sub-Component ────────────────────────────────────────────
interface LifecycleTableProps {
  apps: Application[];
  scholarships?: Scholarship[];
  onReview: (app: Application) => void;
  emptyMsg: string;
  showRemovalReason?: boolean;
}
const LifecycleTable: React.FC<LifecycleTableProps> = ({ apps, scholarships = [], onReview, emptyMsg, showRemovalReason }) => {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedApps = useMemo(() => {
    return [...apps].sort((a, b) => {
      const timeA = new Date(a.expires_at || a.approved_at || a.created_at || '').getTime();
      const timeB = new Date(b.expires_at || b.approved_at || b.created_at || '').getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [apps, sortOrder]);

  if (apps.length === 0) {
    return <div className="p-8 text-center text-xs text-slate-400 italic">{emptyMsg}</div>;
  }

  const totalPages = Math.max(1, Math.ceil(sortedApps.length / pageSize));
  const pagedApps = sortedApps.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      {/* Table sub-header with Show max per page & Sort Toggle */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-700">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedApps.length)} of <span className="text-indigo-600">{sortedApps.length}</span> items
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="text-xs text-slate-700 hover:text-slate-900 font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-200"
            title={`Sort by Date: currently ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-3 h-3 text-indigo-600" />
            <span>{sortOrder === 'desc' ? 'Newest (Desc)' : 'Oldest (Asc)'}</span>
          </button>
          <span className="text-xs text-slate-500 font-medium">Show max per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value={5}>5 items</option>
            <option value={10}>10 items</option>
            <option value={20}>20 items</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Scholarship</th>
              <th className="p-3">GWA</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1 uppercase font-bold text-[10px] text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group"
                >
                  <span>Approved</span>
                  {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-indigo-600" /> : <ArrowUp className="w-3 h-3 text-indigo-600" />}
                </button>
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1 uppercase font-bold text-[10px] text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group"
                >
                  <span>Expires</span>
                  {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-indigo-600" /> : <ArrowUp className="w-3 h-3 text-indigo-600" />}
                </button>
              </th>
              {showRemovalReason && <th className="p-3">Removal Reason</th>}
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedApps.map(app => {
              const sch = scholarships.find(s => s.id === app.scholarship_id || s.title === app.scholarship_title);
              const isRenewable = sch?.is_renewable;
              return (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{app.first_name} {app.last_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">ID #{app.student_number}</p>
                  </td>
                  <td className="p-3 font-medium text-slate-700 max-w-[160px]">
                    <span className="line-clamp-1">{app.scholarship_title}</span>
                    {isRenewable && (
                      <span className="inline-block mt-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                        Renewable
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-bold text-indigo-600">{app.gwa.toFixed(2)}</td>
                  <td className="p-3 text-slate-500">{app.approved_at ? formatDate(app.approved_at.split('T')[0]) : '—'}</td>
                  <td className="p-3 text-slate-500">{app.expires_at ? formatDate(app.expires_at) : '—'}</td>
                  {showRemovalReason && (
                    <td className="p-3 text-slate-600 max-w-[200px]">
                      <span className="line-clamp-2">{app.removal_reason || '—'}</span>
                    </td>
                  )}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onReview(app)}
                      className="bg-slate-900 hover:bg-indigo-600 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors flex items-center space-x-1 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /><span>View</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Standardized Pagination Controls matching image_bff423.png */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <StandardPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={sortedApps.length}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          itemLabel="scholars"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
