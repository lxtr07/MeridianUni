import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  FileText,
  GraduationCap,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  AlertCircle,
  Search,
  ExternalLink,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  initialTab?: 'requirements' | 'faq';
  onClose: () => void;
  onNavigateToCatalog?: () => void;
  onNavigateToTracker?: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  initialTab = 'requirements',
  onClose,
  onNavigateToCatalog,
  onNavigateToTracker,
}) => {
  const [activeTab, setActiveTab] = useState<'requirements' | 'faq'>(initialTab);
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Sync tab when initialTab changes
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Keyboard accessibility: Escape key dismisses modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Can I apply for more than one scholarship program?',
      a: 'Students can view all eligible scholarship programs. However, to ensure equitable distribution of financial aid funds, our policy allows one active submission per scholarship category. Submitting duplicate applications for the same program is automatically restricted by our system.',
      category: 'Application Policy',
    },
    {
      q: 'How do I track the status of my submitted application?',
      a: 'Upon completing your online submission, the system generates a unique Reference Code (e.g., APP-2026-XXXX). Simply enter this code into the Application Status Tracker on the Student Portal to view real-time evaluation updates, reviewer feedback, and scheduled interview dates.',
      category: 'Status & Tracking',
    },
    {
      q: 'What do the different application status stages mean?',
      a: '• Pending: Your application is received and queued for committee verification.\n• In Review: Evaluators are assessing your academic records and documents.\n• Shortlisted: You have passed the initial evaluation and may be scheduled for an interview.\n• Approved: Your grant has been formally awarded!\n• Rejected: The application did not meet eligibility or program quota limits.',
      category: 'Status & Tracking',
    },
    {
      q: 'What should I do if an Emergency Freeze is announced?',
      a: 'An Emergency Freeze is a temporary administrative pause initiated by the scholarship committee (e.g., during deadline extensions or quota reviews). During a freeze, existing applications remain safe and active, while new submissions for the affected program are temporarily on hold until the freeze is lifted.',
      category: 'Deadlines & Freezes',
    },
    {
      q: 'How and when are grant funds disbursed to approved scholars?',
      a: 'Approved applicants receive an official PDF Certificate of Grant Award generated directly from the system. Financial disbursements or tuition credits are credited directly via the University Financial Aid Office during the designated semester enrollment period.',
      category: 'Disbursement',
    },
    {
      q: 'What if I made a mistake or need to update my uploaded documents?',
      a: 'If your application is still in "Pending" status, you may reach out directly to the Academic Aid Office at aid@meridian.edu with your Reference Code and corrected documents for assistance.',
      category: 'Support & Corrections',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                {activeTab === 'requirements' ? (
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {activeTab === 'requirements'
                    ? 'Eligibility & Document Requirements'
                    : 'Frequently Asked Questions (FAQ)'}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Meridian University Institutional Guidance & Applicant Knowledge Base
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2 bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('requirements')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'requirements'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Eligibility Guide</span>
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'faq'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>FAQs</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              A.Y. 2026–2027 Guidelines
            </span>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs sm:text-sm">
            {activeTab === 'requirements' ? (
              <div className="space-y-6">
                {/* 3 Step Process Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Verify Criteria</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Check your GWA (GPA) against the minimum requirement and verify your family household income ceiling.
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Prepare Documents</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Scan and convert your COM, Income Statements (ITR / Indigency), and valid Student ID to clear PDF or JPEG format.
                    </p>
                  </div>

                  <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center space-x-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                        3
                      </span>
                      <span>Submit & Track</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Complete the 3-step digital application wizard and save your tracking Reference Code for real-time evaluation updates.
                    </p>
                  </div>
                </div>

                {/* Mandatory Documents Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Mandatory Document Checklist</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Certificate of Matriculation (COM / COR)</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Official registration form for the current academic semester showing enrolled subjects, units, and student degree program.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Proof of Household Income</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Latest BIR Form 2316 / ITR of parents or guardians. If self-employed or non-taxable, submit a Barangay Certificate of Indigency.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Valid University Student ID</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Front and back photo or scanned copy of your official student identification card with active semester validation sticker.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Official Transcript of Records (TCG / TOR)</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Certified true copy of grades from the previous academic year or semester confirming cumulative General Weighted Average.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important Rules & Tips */}
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-amber-900 text-xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Important Reminders Before Submitting</p>
                    <p className="text-amber-800 leading-relaxed">
                      Ensure your uploaded document attachments are clearly readable and under 10MB each. False declarations, manipulated grades, or forged documents result in immediate disqualification and academic disciplinary referral.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* FAQ Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search questions by keyword or category..."
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* FAQ Items Accordion */}
                <div className="space-y-2.5">
                  {filteredFaqs.map((faq, index) => {
                    const isExpanded = expandedFaq === index;
                    return (
                      <div
                        key={index}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-colors"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : index)}
                          className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {faq.category}
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                              {faq.q}
                            </h4>
                          </div>
                          <div className="p-1 rounded-lg text-slate-400 bg-slate-100 shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-line"
                            >
                              {faq.a}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 px-6 flex flex-col sm:flex-row justify-end items-center gap-3 shrink-0">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {onNavigateToCatalog && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToCatalog();
                  }}
                  className="flex-1 sm:flex-initial bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Browse Scholarships
                </button>
              )}
              {onNavigateToTracker && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTracker();
                  }}
                  className="flex-1 sm:flex-initial bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Track Application
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
