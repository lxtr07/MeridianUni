import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  LogOut,
  Shield,
  GraduationCap,
  Home,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  HelpCircle,
  LockKeyhole,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { UserProfile, StaffRole, normalizeRole } from '../../types';
import { CrestLogo } from './CrestLogo';

/** Display label for a staff user's sub-role. Falls back to "Staff" for legacy accounts. */
function staffRoleLabel(user: UserProfile): string {
  const map: Record<StaffRole, string> = {
    evaluator: 'Evaluator',
    document_verifier: 'Evaluator',
    interviewer: 'Interviewer',
  };
  return user.staff_role ? map[user.staff_role] : 'Staff';
}

/** Display label for the user's top-level role. */
function userRoleLabel(user: UserProfile): string {
  const r = normalizeRole(user.role);
  if (r === 'coordinator') return 'Scholarship Coordinator';
  if (r === 'system_admin') return 'System Administrator';
  if (r === 'staff') return staffRoleLabel(user);
  return 'Student';
}

/** True when the user has a dashboard view ('admin'-style workspace). */
function hasDashboardView(user: UserProfile): boolean {
  const r = normalizeRole(user.role);
  return r === 'coordinator' || r === 'system_admin';
}

interface HeaderProps {
  activeUser: UserProfile | null;
  onLogout: () => void;
  currentView: 'portal' | 'student' | 'login' | 'staff' | 'admin';
  onNavigate: (view: 'portal' | 'student' | 'login' | 'staff' | 'admin', tab?: 'catalog' | 'renewal' | 'tracker') => void;
  onOpenGuide: (tab: 'requirements' | 'faq') => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeUser,
  onLogout,
  currentView,
  onNavigate,
  onOpenGuide,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (view: 'portal' | 'student' | 'login' | 'staff' | 'admin', tab?: 'catalog' | 'renewal' | 'tracker') => {
    setMobileMenuOpen(false);
    onNavigate(view, tab);
  };

  const handleGuideClick = (tab: 'requirements' | 'faq') => {
    setMobileMenuOpen(false);
    onOpenGuide(tab);
  };

  return (
    <>
      {/* Main Navigation Header - Identical height (86px), styling, and alignment as Landing Page */}
      <header
        className="sticky top-0 z-40 w-full h-16 sm:h-[74px] xl:h-[86px] text-white select-none transition-colors"
        style={{
          background: 'linear-gradient(117deg, #091024 0%, #10192f 50%, #151c42 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.11)',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="mx-auto flex items-center justify-between gap-2 sm:gap-4 xl:gap-6 h-full"
          style={{
            width: 'min(1180px, calc(100% - 32px))',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* 1. Far Left: Meridian University Brand Lockup */}
          <div className="flex-1 flex items-center justify-start min-w-0">
            <button
              type="button"
              onClick={() => {
                if (activeUser) {
                  onNavigate(hasDashboardView(activeUser) ? 'admin' : 'staff');
                } else {
                  onNavigate('portal');
                }
              }}
              className="inline-flex items-center gap-2 sm:gap-3 bg-transparent text-white text-left cursor-pointer border-none p-0 min-w-0 max-w-full group"
              aria-label="Meridian University Home"
            >
              <CrestLogo size="md" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-white text-[13px] sm:text-[15px] font-bold tracking-tight leading-none font-sans truncate">
                    Meridian University
                  </strong>
                  <span
                    className={`hidden min-[420px]:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border shrink-0 ${
                      currentView === 'student'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : currentView === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : currentView === 'staff'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/10 text-slate-300 border-white/20'
                    }`}
                  >
                    {currentView === 'student'
                      ? 'STUDENT'
                      : currentView === 'admin'
                      ? 'ADMIN'
                      : currentView === 'staff'
                      ? 'STAFF'
                      : 'PORTAL'}
                  </span>
                </div>
                <small className="text-[#9aa7c9] text-[9px] font-bold tracking-wide uppercase leading-tight hidden xl:block">
                  Office of Student Financial Assistance · Meridian University
                </small>
              </span>
            </button>
          </div>

          {/* 2. Center: Primary Navigation Links */}
          <nav className="hidden xl:flex items-center justify-center gap-6 shrink-0 text-xs font-bold text-[#aeb9d4]">
            {/* Staff Coordinator Navigation: Centered Workspace Badge Only */}
            {currentView === 'staff' && (
              <div className="flex items-center justify-center">
                <span className="font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Staff Coordinator Workspace</span>
                </span>
              </div>
            )}

            {/* Dashboard Workspace Badge — switches label based on who's signed in */}
            {currentView === 'admin' && activeUser && (
              <div className="flex items-center justify-center">
                <span className="font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {normalizeRole(activeUser.role) === 'system_admin'
                      ? 'System Administrator Workspace'
                      : 'Scholarship Coordinator Workspace'}
                  </span>
                </span>
              </div>
            )}

            {/* Login view — centre column intentionally left empty (unified sign-in, no role labels) */}
          </nav>

          {/* 3. Far Right: Actions, User Profile & Logout */}
          <div className="flex-none xl:flex-1 flex items-center justify-end min-w-0 gap-2 sm:gap-3">
            {/* Student Portal: "Eligibility Guide" and "Help & FAQ" pushed to the right directly beside "Portal Home" */}
            {currentView === 'student' && (
              <div className="hidden xl:flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => handleGuideClick('requirements')}
                  className="text-[#aeb9d4] hover:text-white transition-colors cursor-pointer bg-transparent border-none py-2 px-1 font-bold text-xs whitespace-nowrap"
                >
                  Eligibility Guide
                </button>
                <button
                  type="button"
                  onClick={() => handleGuideClick('faq')}
                  className="text-[#aeb9d4] hover:text-white transition-colors cursor-pointer bg-transparent border-none py-2 px-1 font-bold text-xs whitespace-nowrap"
                >
                  Help &amp; FAQ
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out of your student account"
                  className="inline-flex items-center justify-center gap-2 h-[38px] min-h-[38px] max-h-[38px] px-4 rounded-[9px] text-[11px] font-extrabold text-rose-300 hover:text-white hover:bg-rose-600/80 border border-white/16 transition-all cursor-pointer shadow-2xs box-border leading-none ml-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            )}

            {/* Login Gateway Portal Home button */}
            {currentView === 'login' && (
              <button
                type="button"
                onClick={() => handleNavClick('portal')}
                className="hidden xl:inline-flex items-center justify-center gap-2 h-[38px] min-h-[38px] max-h-[38px] px-4 rounded-[9px] text-[11px] font-extrabold text-[#e4e9fa] bg-white/8 hover:bg-white/16 border border-white/16 transition-all cursor-pointer shadow-2xs box-border leading-none"
                title="Return to Meridian University Public Portal"
              >
                <Home className="w-3.5 h-3.5 text-indigo-400" />
                <span>Portal Home</span>
              </button>
            )}

            {/* Dedicated Notifications Button for Staff & Admin */}
            {(currentView === 'staff' || currentView === 'admin') && onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                title="View System Notifications & Updates"
                className="relative hidden xl:inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-white/8 hover:bg-white/16 border border-white/16 text-indigo-300 hover:text-white transition-all cursor-pointer shadow-2xs"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white border-2 border-slate-900 shadow-sm animate-pulse">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* When Logged In as Staff or Admin: User Profile Pill & Logout (No Portal Home) */}
            {activeUser && (currentView === 'staff' || currentView === 'admin') && (
              <div className="hidden xl:flex items-center gap-2.5 bg-white/8 px-3 py-1 rounded-[10px] border border-white/15 h-[38px] box-border">
                <div className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs bg-indigo-600 text-white shrink-0">
                  {hasDashboardView(activeUser) ? (
                    <Shield className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Award className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-white leading-none truncate max-w-[130px]">
                    {activeUser.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">
                    {userRoleLabel(activeUser)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-600/80 px-2 py-1 rounded-md transition-all cursor-pointer ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}

            {/* Mobile & Tablet Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 border border-white/15 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Responsive Slide-out Mobile & Tablet Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Slide-out Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="phone-preview tablet-preview relative w-full max-w-xs sm:max-w-sm bg-slate-900 text-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 border-l border-slate-800"
            >
              {/* Drawer Header */}
              <div
                className="p-5 border-b border-white/10 flex items-center justify-between"
                style={{
                  background: 'linear-gradient(117deg, #091024 0%, #10192f 50%, #151c42 100%)',
                }}
              >
                <div className="flex items-center space-x-2.5">
                  <CrestLogo size="sm" />
                  <div>
                    <span className="text-sm font-bold text-white leading-none block">
                      Meridian University
                    </span>
                    <p className="text-[9px] text-[#9aa7c9] font-medium mt-0.5 uppercase tracking-wide">
                      {currentView === 'student'
                        ? 'Student Portal'
                        : currentView === 'staff'
                        ? 'Staff Portal'
                        : currentView === 'admin'
                        ? 'Admin Portal'
                        : 'University Gateway'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body Links */}
              <div className="p-4 space-y-5 flex-1 overflow-x-hidden">
                {/* Active User Card in Drawer (if logged in) */}
                {activeUser && (
                  <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        {hasDashboardView(activeUser) ? (
                          <Shield className="w-4 h-4 text-white" />
                        ) : (
                          <Award className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{activeUser.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{activeUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                        {userRoleLabel(activeUser)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center space-x-1"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications Drawer Button for Staff & Admin */}
                {(currentView === 'staff' || currentView === 'admin') && onOpenNotifications && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenNotifications();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 hover:bg-indigo-900/60 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <span>Recent Updates &amp; Notifications</span>
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {unreadNotificationsCount} new
                      </span>
                    )}
                  </button>
                )}

                {/* Navigation Links */}
                {/* Navigation Links */}
                <div className="space-y-1.5">
                  {currentView === 'student' && (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
                        Portal Navigation
                      </span>

                      <button
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-900/40 transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <LogOut className="w-4 h-4 text-rose-400" />
                          <div>
                            <p className="font-bold">Log out</p>
                            <p className="text-[10px] font-normal text-slate-400">End your session</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGuideClick('requirements')}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          <div>
                            <p className="font-bold">Eligibility Guide</p>
                            <p className="text-[10px] font-normal text-slate-400">Checklists &amp; criteria</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGuideClick('faq')}
                        className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <HelpCircle className="w-4 h-4 text-indigo-400" />
                          <div>
                            <p className="font-bold">Frequently Asked Questions</p>
                            <p className="text-[10px] font-normal text-slate-400">Applicant assistance</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    </>
                  )}

                  {currentView === 'login' && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('portal')}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <Home className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="font-bold">Portal Home</p>
                          <p className="text-[10px] font-normal text-slate-400">Meridian University gateway</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-200">Office of Student Financial Assistance</p>
                <p>aid@meridian.edu · +1 (800) 555-0199</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
