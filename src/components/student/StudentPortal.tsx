import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldAlert, X, RotateCcw, RefreshCw, FileCheck, AlertCircle, Calendar, ArrowRight, ArrowUp, FilePlus2, GraduationCap } from 'lucide-react';
import { Scholarship, Application, FreezePeriod, UserProfile } from '../../types';
import { ScholarshipCatalog, isDeadlinePassed } from './ScholarshipCatalog';
import { ApplicationWizard } from './ApplicationWizard';
import { StatusTracker } from './StatusTracker';
import { findRegistrarStudent, collegeOf } from '../../data/universityRegistry';
import { isOpenToAllPrograms } from '../../lib/scholarshipRules';

interface StudentPortalProps {
  student: UserProfile;
  scholarships: Scholarship[];
  applications: Application[];
  freezePeriods: FreezePeriod[];
  initialTab?: 'catalog' | 'renewal' | 'tracker';
  initialScholarship?: Scholarship | null;
  onNewApplication: (app: Application) => Promise<void> | void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  scholarships,
  applications,
  freezePeriods,
  initialTab = 'catalog',
  initialScholarship = null,
  onNewApplication,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'renewal' | 'tracker'>(initialTab);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(initialScholarship);
  const [isRenewalMode, setIsRenewalMode] = useState<boolean>(false);
  const [renewedFromRefCode, setRenewedFromRefCode] = useState<string | undefined>(undefined);
  const [highlightRef, setHighlightRef] = useState<string>('');

  // Registrar record is the source of truth for program, year level and GWA
  const record = useMemo(() => findRegistrarStudent(student.university_id || ''), [student.university_id]);
  const myApplications = useMemo(
    () => applications.filter((a) => a.student_number === student.university_id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [applications, student.university_id]
  );

  // Track dismissed freeze notice ID
  const [dismissedFreezeId, setDismissedFreezeId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('scholarflow_dismissed_freeze_id');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      window.scrollTo(0, 0);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialScholarship) {
      setSelectedScholarship(initialScholarship);
    }
  }, [initialScholarship]);

  const handleTabSwitch = (tab: 'catalog' | 'renewal' | 'tracker') => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select latest active freeze announcement
  const latestFreezeAnnouncement = useMemo(() => {
    const active = freezePeriods.filter((f) => {
      if (!f.is_active) return false;
      if (f.scholarship_id === 'all') {
        return scholarships.some((s) => s.is_frozen);
      } else {
        const target = scholarships.find((s) => s.id === f.scholarship_id);
        return target ? target.is_frozen : false;
      }
    });

    if (active.length === 0) return null;
    return [...active].sort((a, b) => {
      const timeB = new Date(b.created_at || b.start_date || 0).getTime();
      const timeA = new Date(a.created_at || a.start_date || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [freezePeriods, scholarships]);

  const showFreezeBanner = Boolean(
    latestFreezeAnnouncement && latestFreezeAnnouncement.id !== dismissedFreezeId
  );

  const handleDismissFreeze = (id: string) => {
    setDismissedFreezeId(id);
    try {
      sessionStorage.setItem('scholarflow_dismissed_freeze_id', id);
    } catch {
      // ignore
    }
  };

  // Floating Back to Top button state & scroll listener
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyClick = (scholarship: Scholarship) => {
    if (isDeadlinePassed(scholarship.deadline)) return;
    setIsRenewalMode(false);
    setRenewedFromRefCode(undefined);
    setSelectedScholarship(scholarship);
  };

  const handleRenewalClick = (scholarship: Scholarship, previousRefCode: string) => {
    setIsRenewalMode(true);
    setRenewedFromRefCode(previousRefCode);
    setSelectedScholarship(scholarship);
  };

  const handleApplicationSuccess = async (newApp: Application) => {
    await onNewApplication(newApp);
    setHighlightRef(newApp.reference_code);
  };

  const handleTrackCode = (refCode: string) => {
    setSelectedScholarship(null);
    setHighlightRef(refCode);
    handleTabSwitch('tracker');
  };

  // Grants this student can renew: their own awards in renewable scholarships
  const renewableAwards = useMemo(() => {
    return myApplications
      .filter((a) => ['Approved', 'For Renewal', 'Expired'].includes(a.status))
      .map((a) => ({ app: a, sch: scholarships.find((s) => s.id === a.scholarship_id) }))
      .filter((x): x is { app: Application; sch: Scholarship } => Boolean(x.sch && x.sch.is_renewable))
      .filter((x) => !myApplications.some((o) => o.renewed_from === x.app.reference_code && ['Pending', 'In Review', 'Shortlisted', 'For Approval', 'Approved'].includes(o.status)));
  }, [myApplications, scholarships]);

  const renewableForMyProgram = useMemo(
    () => scholarships.filter((s) => s.is_renewable && (isOpenToAllPrograms(s) || s.eligible_programs!.includes(student.program || ''))),
    [scholarships, student.program]
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Active Emergency Freeze Alert Banner */}
      <AnimatePresence>
        {showFreezeBanner && latestFreezeAnnouncement && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-2 relative"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
                <span>Scholarship Committee Notice: Submission Schedule Update</span>
              </div>
              <button
                type="button"
                onClick={() => handleDismissFreeze(latestFreezeAnnouncement.id)}
                className="text-amber-700 hover:text-amber-950 p-1 hover:bg-amber-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Dismiss notice"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-amber-800 space-y-1 pl-7 pr-6">
              <p className="font-semibold">{latestFreezeAnnouncement.announcement_note}</p>
              <p className="text-[11px] text-amber-700 font-medium">
                {latestFreezeAnnouncement.start_date && latestFreezeAnnouncement.end_date && latestFreezeAnnouncement.start_date !== latestFreezeAnnouncement.end_date ? (
                  <>
                    Effective Period: <strong>{latestFreezeAnnouncement.start_date}</strong> to <strong>{latestFreezeAnnouncement.end_date}</strong>
                  </>
                ) : latestFreezeAnnouncement.start_date ? (
                  <>
                    Effective: <strong>Starting {latestFreezeAnnouncement.start_date}</strong>
                  </>
                ) : (
                  <>
                    Effective: <strong>Immediately</strong>
                  </>
                )}
                {latestFreezeAnnouncement.scholarship_title && latestFreezeAnnouncement.scholarship_id !== 'all' && (
                  <span className="ml-2 text-amber-900 font-semibold">
                    (Target: {latestFreezeAnnouncement.scholarship_title})
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Section Header & Tab Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {activeTab === 'renewal' ? 'Renew a scholarship' : activeTab === 'tracker' ? 'My applications' : 'Scholarships open to you'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {student.full_name} · <span className="font-mono">{student.university_id}</span> · {record?.program || student.program}, {record?.year_level || student.year_level}
              <span className="hidden sm:inline"> · {collegeOf(record?.program || student.program || '')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full lg:w-auto overflow-x-auto" role="tablist">
          {[
            { key: 'catalog' as const, icon: <FilePlus2 className="w-4 h-4 text-indigo-600" />, label: 'New Application' },
            { key: 'renewal' as const, icon: <RefreshCw className="w-4 h-4 text-emerald-600" />, label: 'Renewal' },
            { key: 'tracker' as const, icon: <Clock className="w-4 h-4 text-indigo-600" />, label: `My Applications${myApplications.length ? ` (${myApplications.length})` : ''}` },
          ].map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeTab === t.key}
              onClick={() => handleTabSwitch(t.key)}
              className={`flex-1 lg:flex-initial flex items-center justify-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Rendering */}
      {activeTab === 'catalog' && (
        <ScholarshipCatalog
          scholarships={scholarships}
          applications={applications}
          student={{ student_number: student.university_id || '', program: record?.program || student.program || '', year_level: record?.year_level || student.year_level || '', gwa: record?.gwa }}
          onApply={handleApplyClick}
          onTrack={handleTrackCode}
        />
      )}

      {/* Renewal Tab */}
      {activeTab === 'renewal' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Continue your scholarship next semester</h2>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Grants are awarded one semester at a time. If you hold a renewable grant, submit a renewal with your latest Certificate of Enrollment and grades before the renewal deadline.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Your renewable grants</h3>
            {renewableAwards.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">You have no grants to renew right now.</p>
                  <p className="mt-0.5">Renewal opens for students who were approved for a renewable scholarship. To apply for the first time, use New Application.</p>
                  <button type="button" onClick={() => handleTabSwitch('catalog')} className="mt-2 font-bold text-indigo-600 hover:underline cursor-pointer">Go to New Application</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {renewableAwards.map(({ app, sch }) => {
                  const closed = isDeadlinePassed(sch.renewal_deadline || sch.deadline);
                  return (
                    <div key={app.id} className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-900 text-sm">{sch.title}</p>
                        <p className="text-slate-600">
                          Ref <span className="font-mono">{app.reference_code}</span> · Status <strong>{app.status}</strong>
                          {app.grant_term ? ` · Last covered: ${app.grant_term}` : ''}
                        </p>
                        <p className={`flex items-center gap-1 ${closed ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {closed ? 'Renewal period has ended' : `Renew by ${sch.renewal_deadline || sch.deadline}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={closed}
                        onClick={() => handleRenewalClick(sch, app.reference_code)}
                        className="font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{closed ? 'Renewal closed' : 'Start renewal'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Only show the list of renewable programs if the student has at least one
              approved grant — otherwise it's misleading because they haven't won anything yet */}
          {renewableAwards.length > 0 && renewableForMyProgram.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Other renewable scholarships for {record?.program || student.program}</h3>
                <p className="text-xs text-slate-500">You can also apply for these fresh if you have not received them before.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renewableForMyProgram.filter(s => !renewableAwards.some(r => r.sch.id === s.id)).map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 text-xs">
                    <span className="text-[10px] font-mono text-slate-400">{s.code}</span>
                    <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                    <p className="text-slate-600">Keep a GWA of {s.min_gwa.toFixed(2)} or better (lower is better).</p>
                    <p className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Renewal deadline: {s.renewal_deadline || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>What you need to renew</span>
            </h4>
            <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
              <li>A GWA that still meets your scholarship's requirement, with no failing, dropped or INC grades.</li>
              <li>Your Certificate of Enrollment for the coming semester.</li>
              <li>A certified true copy of grades for the semester that just ended.</li>
              <li>Updated proof of income for each earning household member.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'tracker' && (
        <StatusTracker
          applications={myApplications}
          scholarships={scholarships}
          highlightRef={highlightRef}
          onStartApplication={() => handleTabSwitch('catalog')}
        />
      )}

      {/* Application form (new and renewal) */}
      <AnimatePresence>
        {selectedScholarship && (
          <ApplicationWizard
            scholarship={selectedScholarship}
            student={student}
            applications={applications}
            isRenewal={isRenewalMode}
            renewedFrom={renewedFromRefCode}
            onClose={() => {
              setSelectedScholarship(null);
              setIsRenewalMode(false);
              setRenewedFromRefCode(undefined);
            }}
            onSubmitSuccess={handleApplicationSuccess}
            onTrackExisting={handleTrackCode}
          />
        )}
      </AnimatePresence>

      {/* Floating Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            onClick={handleScrollToTop}
            className="fixed bottom-6 right-6 z-40 p-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center cursor-pointer border border-slate-700/60 group"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform text-white" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
};
