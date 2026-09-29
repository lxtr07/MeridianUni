import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  FileText,
  RefreshCw,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Award,
  CheckCircle2,
  Calendar,
  User,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Application, Scholarship, FreezePeriod } from '../../types';

export interface SystemNotification {
  id: string;
  type: 'application' | 'renewal' | 'expiration' | 'alert';
  title: string;
  summary: string;
  fullMessage: string;
  timestamp: string;
  dateObj: Date;
  referenceCode?: string;
  studentName?: string;
  scholarshipTitle?: string;
  priority: 'high' | 'medium' | 'normal';
}

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  scholarships: Scholarship[];
  freezePeriods: FreezePeriod[];
  onUnreadCountChange?: (count: number) => void;
}

export const getActiveSystemNotificationsCount = (
  applications: Application[],
  scholarships: Scholarship[],
  freezePeriods: FreezePeriod[]
): number => {
  let count = freezePeriods.length;
  count += applications.filter(
    (a) => a.status === 'Pending' || a.status === 'In Review' || a.status === 'For Renewal'
  ).length;
  count += scholarships.filter(
    (s) => s.slots_remaining <= 5 && s.slots_remaining > 0 && s.is_active
  ).length;
  return count;
};

export const NotificationSidebar: React.FC<NotificationSidebarProps> = ({
  isOpen,
  onClose,
  applications,
  scholarships,
  freezePeriods,
  onUnreadCountChange,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'application' | 'renewal' | 'expiration' | 'alert'>('all');
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Generate dynamic system activity notifications
  const notifications: SystemNotification[] = useMemo(() => {
    const list: SystemNotification[] = [];

    // 1. Active Freeze Periods / System Alerts
    freezePeriods.forEach((fp) => {
      const sch = scholarships.find((s) => s.id === fp.scholarship_id);
      list.push({
        id: `freeze_${fp.id}`,
        type: 'alert',
        title: `Emergency Freeze: ${sch?.title || fp.scholarship_title || 'Institutional Grant'}`,
        summary: `Administrative freeze active until ${fp.end_date}. Submissions temporarily paused.`,
        fullMessage: `An administrative Emergency Freeze has been placed on "${sch?.title || fp.scholarship_title || 'Scholarship Program'}".\n\nAnnouncement Note: ${fp.announcement_note}\nEffective Duration: ${fp.start_date} to ${fp.end_date}\n\nDuring this freeze period, ongoing evaluations continue normally, while new applications for this specific grant are placed on hold. Please review quota guidelines before lifting the freeze.`,
        timestamp: fp.created_at || new Date().toISOString(),
        dateObj: new Date(fp.created_at || Date.now()),
        scholarshipTitle: sch?.title || fp.scholarship_title,
        priority: 'high',
      });
    });

    // 2. Applications (New submissions, Pending Reviews)
    applications.forEach((app) => {
      const appDate = new Date(app.created_at);
      if (app.status === 'Pending' || app.status === 'In Review') {
        list.push({
          id: `app_new_${app.id}`,
          type: 'application',
          title: `New Application: ${app.first_name} ${app.last_name}`,
          summary: `${app.scholarship_title} (Ref: ${app.reference_code}) submitted for evaluation.`,
          fullMessage: `Applicant ${app.first_name} ${app.last_name} (Student ID: ${app.student_number}) has submitted a verified scholarship application for "${app.scholarship_title}".\n\nReference Code: ${app.reference_code}\nCumulative GWA: ${app.gwa.toFixed(2)}\nAnnual Family Income: ₱${(app.annual_family_income ?? app.monthly_family_income * 12).toLocaleString()}\nStatus: ${app.status}\nSubmitted At: ${new Date(app.created_at).toLocaleString()}`,
          timestamp: app.created_at,
          dateObj: appDate,
          referenceCode: app.reference_code,
          studentName: `${app.first_name} ${app.last_name}`,
          scholarshipTitle: app.scholarship_title,
          priority: 'normal',
        });
      }

      // 3. Renewals (For Renewal status)
      if (app.status === 'For Renewal') {
        list.push({
          id: `app_renew_${app.id}`,
          type: 'renewal',
          title: `Renewal Pending: ${app.first_name} ${app.last_name}`,
          summary: `Continuing grant for ${app.scholarship_title} requires renewal validation.`,
          fullMessage: `Scholar ${app.first_name} ${app.last_name} (${app.student_number}) has completed their academic period and is eligible for renewal in "${app.scholarship_title}".\n\nReference Code: ${app.reference_code}\nExpiry/Renewal Window: ${app.expires_at || 'Current Term'}\nRemarks: ${app.remarks || 'Standard renewal review pending.'}\n\nPlease inspect updated COE and True Copy of Grades to verify continuation clearance.`,
          timestamp: app.updated_at || app.created_at,
          dateObj: new Date(app.updated_at || app.created_at),
          referenceCode: app.reference_code,
          studentName: `${app.first_name} ${app.last_name}`,
          scholarshipTitle: app.scholarship_title,
          priority: 'medium',
        });
      }

      // 4. Expirations / Concluded
      if (app.status === 'Expired') {
        list.push({
          id: `app_exp_${app.id}`,
          type: 'expiration',
          title: `Scholarship Concluded: ${app.first_name} ${app.last_name}`,
          summary: `Award duration completed for ${app.scholarship_title}.`,
          fullMessage: `The active award tenure for student ${app.first_name} ${app.last_name} in program "${app.scholarship_title}" has officially expired or reached its maximum tenure duration.\n\nReference Code: ${app.reference_code}\nConcluded Date: ${app.expires_at ? new Date(app.expires_at).toLocaleDateString() : 'Recent'}\nRemarks: ${app.remarks || 'Term completed.'}`,
          timestamp: app.expires_at || app.updated_at || app.created_at,
          dateObj: new Date(app.expires_at || app.updated_at || app.created_at),
          referenceCode: app.reference_code,
          studentName: `${app.first_name} ${app.last_name}`,
          scholarshipTitle: app.scholarship_title,
          priority: 'normal',
        });
      }
    });

    // 5. Scholarships low slot alert
    scholarships.forEach((s) => {
      if (s.is_active && !s.is_frozen && s.slots_remaining <= 3 && s.slots_remaining > 0) {
        list.push({
          id: `sch_quota_${s.id}`,
          type: 'alert',
          title: `Low Slots Remaining: ${s.title}`,
          summary: `Only ${s.slots_remaining} of ${s.slots} slots remain open for new awards.`,
          fullMessage: `The institutional scholarship program "${s.title}" (${s.code}) is nearing maximum quota allocation.\n\nRemaining Open Slots: ${s.slots_remaining} / ${s.slots}\nGrant Amount: ₱${s.grant_amount.toLocaleString()} / term\nDeadline: ${s.deadline}\n\nPlease monitor committee approvals to prevent quota oversubscription.`,
          timestamp: s.created_at || new Date().toISOString(),
          dateObj: new Date(s.created_at || Date.now()),
          scholarshipTitle: s.title,
          priority: 'medium',
        });
      }
    });

    // Sort all descending by date (newest first)
    return list.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [applications, scholarships, freezePeriods]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (filterType === 'all') return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const handleNotificationClick = (item: SystemNotification) => {
    setReadIds((prev) => new Set(prev).add(item.id));
    setSelectedNotification(item);
  };

  const handleMarkAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const getTypeBadge = (type: SystemNotification['type']) => {
    switch (type) {
      case 'alert':
        return { label: 'System Alert', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: ShieldAlert };
      case 'renewal':
        return { label: 'Pending Renewal', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: RefreshCw };
      case 'expiration':
        return { label: 'Expiration', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: Clock };
      case 'application':
      default:
        return { label: 'New Application', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: FileText };
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Slide-out Sidebar Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%', transition: { duration: 0 } }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="phone-preview tablet-preview relative w-full max-w-md sm:max-w-lg bg-slate-900 text-white h-full shadow-2xl flex flex-col justify-between overflow-hidden z-10 border-l border-slate-800"
            >
              {/* Sidebar Header */}
              <div
                className="p-5 border-b border-white/10 flex items-center justify-between shrink-0"
                style={{
                  background: 'linear-gradient(117deg, #091024 0%, #10192f 50%, #151c42 100%)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shadow-xs">
                    <Bell className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">System Activity &amp; Updates</h3>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#9aa7c9] font-medium mt-0.5">
                      Live administrative feed across applications &amp; grants
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-[#aeb9d4] hover:text-white font-semibold transition-colors cursor-pointer px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close notifications"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter Pills Bar */}
              <div className="p-3 bg-slate-950/60 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'application', label: 'Applications' },
                    { id: 'renewal', label: 'Renewals' },
                    { id: 'alert', label: 'Alerts' },
                    { id: 'expiration', label: 'Expirations' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      filterType === tab.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/5 text-[#aeb9d4] hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notifications Feed List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-300">All caught up!</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      There are no recent {filterType !== 'all' ? filterType : ''} notifications in the system feed.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => {
                    const isRead = readIds.has(item.id);
                    const badge = getTypeBadge(item.type);
                    const IconComp = badge.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                          isRead
                            ? 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                            : 'bg-slate-800/90 border-indigo-500/40 hover:bg-slate-800 hover:border-indigo-400 shadow-xs'
                        }`}
                      >
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 absolute top-3.5 right-3.5 shadow-xs" />
                        )}

                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${badge.bg}`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.timestamp).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white mt-1 group-hover:text-indigo-300 transition-colors truncate">
                              {item.title}
                            </h4>

                            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                              {item.summary}
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0 self-center" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                <span>Total Feed Items: <strong className="text-white">{notifications.length}</strong></span>
                <span className="text-[10px] text-[#9aa7c9]">Updated live</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up Modal to view the entire notification message */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div
                className="p-6 text-white relative"
                style={{
                  background: 'linear-gradient(117deg, #091024 0%, #10192f 50%, #151c42 100%)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      getTypeBadge(selectedNotification.type).bg
                    }`}
                  >
                    {getTypeBadge(selectedNotification.type).label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedNotification.timestamp).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white leading-snug">
                  {selectedNotification.title}
                </h3>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs whitespace-pre-line leading-relaxed text-slate-800">
                  {selectedNotification.fullMessage}
                </div>

                {/* Metadata highlights */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {selectedNotification.referenceCode && (
                    <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-700 block uppercase">Reference Code</span>
                      <span className="font-mono font-bold text-slate-900">{selectedNotification.referenceCode}</span>
                    </div>
                  )}
                  {selectedNotification.studentName && (
                    <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600 block uppercase">Applicant</span>
                      <span className="font-bold text-slate-900">{selectedNotification.studentName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Close Notification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
