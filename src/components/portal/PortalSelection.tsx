import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Award, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { ScholarFlowLogo } from '../common/ScholarFlowLogo';

interface PortalSelectionProps {
  onSelectPortal: (portal: 'student' | 'login') => void;
  openScholarshipsCount: number;
}

export const PortalSelection: React.FC<PortalSelectionProps> = ({
  onSelectPortal,
  openScholarshipsCount,
}) => {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-slate-50 flex flex-col justify-between">
      
      {/* 1. Hero Section: Minimal, High-Contrast White/Slate */}
      <div className="bg-white border-b border-slate-200 py-14 px-4 sm:px-6 lg:px-10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {/* Official ScholarFlow Logo Feature */}
            <div className="w-24 h-24 mb-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-2">
              <ScholarFlowLogo size="xl" />
            </div>

            <span className="inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-100 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Academic Year 2026–2027 Grants</span>
            </span>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Scholarship Management & Application Portal
            </h1>
            
            <p className="text-slate-600 text-sm sm:text-base font-normal max-w-2xl mx-auto mt-4 leading-relaxed">
              Explore available institutional fellowships, submit verified documentation, and monitor your evaluation progress through a single centralized gateway.
            </p>
          </motion.div>
        </div>
      </div>

      {/* 2. Main Portal Selection Content: Single Centered Student Portal Card */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="max-w-xl mx-auto">
          
          {/* Card: Student Applicant Portal */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -3 }}
            onClick={() => onSelectPortal('student')}
            className="bg-white rounded-2xl p-8 sm:p-9 border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-2xs group-hover:border-indigo-400 p-1 transition-colors">
                  <ScholarFlowLogo size="md" />
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                  {openScholarshipsCount} Open Programs
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                Student Applicant Portal
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                Browse available merit, financial aid, athletic, and industry grants. Complete your paperless application and track real-time evaluation status.
              </p>

              <ul className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
                <li className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Searchable scholarship &amp; grant catalog</span>
                </li>
                <li className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Streamlined 3-step digital document submission</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Instant reference code &amp; progress tracking</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full bg-slate-900 hover:bg-indigo-600 py-3.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Access Student Scholarship Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

        </div>
      </div>

      {/* 3. Subtle Bottom Ribbon */}
      <div className="bg-white border-t border-slate-200 text-slate-500 py-4 text-center text-xs">
        <p>Meridian University Scholarship Portal • Institutional Financial Aid System</p>
      </div>

    </div>
  );
};
