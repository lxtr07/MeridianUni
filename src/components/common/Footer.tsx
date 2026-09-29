import React from 'react';
import { Mail, Phone, MapPin, ShieldCheck, GraduationCap, Clock, BookOpen, HelpCircle, Shield } from 'lucide-react';
import { ScholarFlowLogo } from './ScholarFlowLogo';

interface FooterProps {
  onNavigate?: (view: 'portal' | 'student' | 'login' | 'staff' | 'admin', tab?: 'catalog' | 'tracker') => void;
  onOpenGuide?: (tab: 'requirements' | 'faq') => void;
  currentView?: 'portal' | 'student' | 'login' | 'staff' | 'admin';
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenGuide,
  currentView = 'portal',
}) => {
  const handleNav = (view: 'portal' | 'student' | 'login' | 'staff' | 'admin', tab?: 'catalog' | 'tracker') => {
    if (onNavigate) {
      onNavigate(view, tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGuide = (tab: 'requirements' | 'faq') => {
    if (onOpenGuide) {
      onOpenGuide(tab);
    }
  };

  const isPortal = currentView === 'portal';

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`grid gap-8 lg:gap-10 ${isPortal ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>

          {/* Col 1: About */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 shadow-2xs">
                <ScholarFlowLogo size="sm" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Meridian <span className="text-indigo-400">University</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An institutional scholarship and financial aid management platform designed for transparent evaluations, paperless grant processing, and real-time student tracking.
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Academic Excellence • Equity • Opportunity
            </p>
          </div>

          {/* Col 2: Quick Navigation — Only visible on Portal Home */}
          {isPortal && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Navigation
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => handleNav('student', 'catalog')}
                    className="text-slate-400 hover:text-white transition-colors flex items-center space-x-2 py-1 text-left w-full cursor-pointer group"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span>Browse Scholarship Programs</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNav('student', 'tracker')}
                    className="text-slate-400 hover:text-white transition-colors flex items-center space-x-2 py-1 text-left w-full cursor-pointer group"
                  >
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span>Application Status Tracker</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleGuide('requirements')}
                    className="text-slate-400 hover:text-white transition-colors flex items-center space-x-2 py-1 text-left w-full cursor-pointer group"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span>Eligibility &amp; Requirements Guide</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleGuide('faq')}
                    className="text-slate-400 hover:text-white transition-colors flex items-center space-x-2 py-1 text-left w-full cursor-pointer group"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span>Frequently Asked Questions</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Col 3: Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Academic Aid Office
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Student Services Center, University Campus</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>(02) 8888-1234</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>aid@meridian.edu</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Data Privacy & Security */}
          <div className="space-y-3 bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-700/60">
            <div className="flex items-center space-x-2 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Security &amp; Data Integrity
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              All submitted student documents, identification cards, and financial statements are securely handled and strictly restricted to authorized scholarship review committees.
            </p>
          </div>

        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} Meridian University. All rights reserved.</p>
          <div className="flex items-center space-x-3 text-xs">
            <p className="text-slate-400 font-medium">Meridian University Scholarship Operations System</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
