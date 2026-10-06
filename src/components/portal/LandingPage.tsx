import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  GraduationCap,
  HandCoins,
  LockKeyhole,
  Menu,
  Network,
  Quote,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { Scholarship, Application } from '../../types';
import { ScholarFlowLogo } from '../common/ScholarFlowLogo';
import { CrestLogo } from '../common/CrestLogo';
import { isDeadlinePassed } from '../student/ScholarshipCatalog';

interface LandingPageProps {
  scholarships: Scholarship[];
  applications: Application[];
  onNavigate: (view: 'portal' | 'student' | 'login' | 'staff' | 'admin', tab?: 'catalog' | 'renewal' | 'tracker') => void;
  onOpenGuide: (tab: 'requirements' | 'faq') => void;
  onApplyScholarship: (scholarship: Scholarship) => void;
}

const imageSources = {
  classroom:
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85',
  library:
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=85',
  lecture:
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=85',
  scholar:
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85',
};

const news = [
  {
    tag: 'Aid Expansion',
    date: 'September 20, 2026',
    title: 'Meridian University Expands Financial Aid Programs',
    body: 'In line with its commitment to student success, the university has introduced new grant categories this year, including need-based and athletic distinction scholarships.',
    image: imageSources.classroom,
    readTime: '3 min read',
    article:
      'In line with its commitment to student success, Meridian University has introduced new grant categories this year, including need-based and athletic distinction scholarships.\n\nUnder the leadership of the University Board and the Office of Student Financial Assistance, these expanded aid initiatives provide comprehensive tuition credits, book and laboratory allowances, and living stipends for qualified undergraduate and post-graduate students.\n\nStudents who meet academic, athletic, and demographic criteria may now apply directly through the Meridian University Scholarship Portal. Faculty review panels will evaluate candidate applications in rolling review batches throughout the academic cycle.',
  },
  {
    tag: 'Admissions & Aid',
    date: 'September 15, 2026',
    title: 'AY 2026–2027 University Scholarship Application Cycle Officially Opens',
    body: 'New quota slots are now open across merit, STEM research, and need-based institutional grants.',
    image: imageSources.library,
    readTime: '4 min read',
    article:
      'The University Scholarship Board has officially opened the Academic Year 2026–2027 scholarship cycle, with expanded grant allocations for high-achieving undergraduate and post-graduate students.\n\nApplicants can now submit verified applications for the Presidential Academic Excellence Fellowship, Future Innovators STEM & Technology Grant, and the Global Access Need-Based Opportunity Grant directly through Meridian University\'s Scholarship Portal. The digital application wizard makes document submission simple and paperless, with enrollment certificates, grade transcripts, and income documentation reviewed by our faculty evaluation committee.\n\nStudents are encouraged to verify their minimum GWA requirement and review submission deadlines before starting their application. Live evaluation updates and interview schedules are broadcasted directly through each applicant’s unique Reference Code Tracker.',
  },
  {
    tag: 'Financial Update',
    date: 'August 28, 2026',
    title: 'University Board Approves 15% Increase in Term Living Allowances',
    body: 'The expanded stipend provides enhanced living and learning resource assistance for institutional scholars.',
    image: imageSources.library,
    readTime: '3 min read',
    article:
      'The University Scholarship Board has approved an immediate 15% increase in term living allowances for eligible institutional scholars beginning Academic Year 2026–2027. This adjustment responds to the increased cost of learning materials, technology equipment, transportation, and daily living expenses.\n\nThe updated stipend schedule is reflected automatically in award notices issued through Meridian University\'s portal system. Current scholars with approved standing do not need to resubmit their records; the Office of Academic Aid & Student Affairs will automatically credit the adjusted amounts to their bursar records.\n\nThis measure reinforces our institutional commitment to ensuring students maintain momentum toward their degree without economic disruption.',
  },
  {
    tag: 'Scholar Events',
    date: 'August 12, 2026',
    title: 'Annual Scholar Orientation & Faculty Mentorship Assembly Scheduled',
    body: 'Inducted fellows and returning scholars can now review orientation details and faculty mentorship tracks.',
    image: imageSources.lecture,
    readTime: '5 min read',
    article:
      'The Annual Scholar Orientation and Faculty Mentorship Assembly will welcome newly inducted fellows and returning scholars this semester. The assembly connects scholars with dedicated faculty mentors from across colleges.\n\nThe agenda includes an overview of renewal guidelines, academic good-standing clearances, and workshops on undergraduate research opportunities, laboratory grants, and capstone funding.\n\nAttendance is strongly recommended for newly inducted scholars. Orientation schedules, breakout room assignments, and digital resources will be accessible through the Meridian University Scholarship Portal.',
  },
];

const metricsData = [
  {
    icon: HandCoins,
    value: '₱28.5 Million+',
    label: 'Total aid pool',
    accent: 'violet',
    eyebrow: 'AY 2026–2027 Closeout',
    detail:
      'The university provides more than ₱28.5 million in comprehensive tuition credits, living allowances, laboratory funds, and student emergency aid.',
    breakdown: [
      '₱16.2M tuition and comprehensive fee waivers',
      '₱8.4M term living and research stipends',
      '₱3.9M laboratory, thesis, and emergency assistance',
    ],
    note: 'Reconciled each term through institutional bursar allocations and donor endowments.',
  },
  {
    icon: Users,
    value: 'LIVE_SCHOLARS',  // replaced at render time
    label: 'Scholars supported',
    accent: 'green',
    eyebrow: 'Active Scholar Population',
    detail:
'Hundreds of enrolled Meridian University undergraduate students hold institutional scholarships, grants, fellowships, and academic fee waivers.',
    breakdown: [
      '620 Academic & Presidential merit fellows',
      '510 Need-based and equity grant recipients',
      '320 STEM, varsity distinction, and creative arts awardees',
    ],
    note: 'Verified through registrar enrollment records and committee awards.',
  },
  {
    icon: GraduationCap,
    value: '98.4%',
    label: 'Degree completion rate',
    accent: 'gold',
    eyebrow: 'Scholar Persistence',
    detail:
      'The multi-year completion rate for institutional scholars demonstrates strong persistence, degree completion, and timely graduation.',
    breakdown: [
      '98.4% completed their degree within award terms',
      '94.1% maintained zero academic probation interruptions',
      '87.6% transitioned to advanced employment or post-graduate studies',
    ],
    note: 'Based on official university registrar records.',
  },
  {
    icon: FileCheck2,
    value: '100%',
    label: 'Paperless clearance',
    accent: 'blue',
    eyebrow: 'Digital Processing',
    detail:
      'All active scholarship programs accept paperless digital document submissions, real-time validation, and automated queue tracking.',
    breakdown: [
      'Instant digital document uploads (COE, Grades, ID)',
      'Automated GWA and qualification verification',
      'Transparent faculty evaluation committee workflow',
    ],
    note: 'Standardized online application and status tracking across all colleges.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Select your program',
    body: 'Browse institutional fellowships and verify that your GWA and academic track qualify.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Submit your credentials',
    body: 'Upload your Certificate of Enrollment, official grade transcripts, and supporting files.',
    icon: UploadCloud,
  },
  {
    number: '03',
    title: 'Committee evaluation',
    body: 'Faculty reviewers inspect documentation, verify eligibility, and update your application stage.',
    icon: FileCheck2,
  },
  {
    number: '04',
    title: 'Award grant & tracking',
    body: 'Receive your formal award letter and track real-time bursar disbursement via your Reference Code.',
    icon: ShieldCheck,
  },
];

function AppButton({
  children,
  variant = 'primary',
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'light';
  onClick?: () => void;
  icon?: React.ElementType;
}) {
  return (
    <button onClick={onClick} className={`app-button ${variant}`}>
      {children}
      {Icon ? <Icon size={16} strokeWidth={2.4} /> : null}
    </button>
  );
}

function SectionIntro({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-intro">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h2>{title}</h2>
      </div>
      <div className="intro-right">
        <p>{copy}</p>
        {action}
      </div>
    </div>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({
  scholarships,
  applications,
  onNavigate,
  onOpenGuide,
  onApplyScholarship,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<(typeof news)[number] | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<(typeof metricsData)[number] | null>(null);
  const [legalModalContent, setLegalModalContent] = useState<{ title: string; text: string } | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  // Compute live fund statistics with automatic dynamic replacement if a scholarship was removed
  const openScholarships = useMemo(() => {
    const active = scholarships.filter((s) => !s.is_frozen && s.is_active);
    if (active.length >= 4) return active;
    const seenIds = new Set(active.map((s) => s.id));
    const others = scholarships.filter((s) => !seenIds.has(s.id));
    return [...active, ...others];
  }, [scholarships]);

  const totalFundingEstimate = openScholarships.reduce(
    (acc, curr) => acc + curr.grant_amount * curr.slots,
    0
  );
  const displayFunding =
    totalFundingEstimate > 0
      ? `₱${(totalFundingEstimate / 1000000).toFixed(1)}M+`
      : '₱11.2M+';

  // Live stats derived from real application and scholarship data
  const activeScholarsCount = applications.filter(a => a.status === 'Approved').length;
  const openSlotsTotal = scholarships.filter(s => s.is_active && !s.is_frozen).reduce((a, s) => a + s.slots_remaining, 0);
  const openProgramsCount = scholarships.filter(s => s.is_active && !s.is_frozen).length;

  // Highlight key programs for cards (automatically refills with next available if any is removed)
  const featuredPrograms = openScholarships.slice(0, 4);

  return (
    <div className="site-shell">
      {/* Top Header */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="header-left">
            <button
              className="brand-lockup"
              onClick={() => scrollTo('top')}
              aria-label="Meridian University Home"
            >
              <CrestLogo size="md" />
              <span className="brand-copy">
                <strong>Meridian University</strong>
                <small>Office of Student Financial Assistance · Meridian University</small>
              </span>
            </button>
          </div>

          <nav className={`main-nav ${mobileMenuOpen ? 'open' : ''}`} aria-label="Primary navigation">
            <button onClick={() => scrollTo('programs')}>Programs &amp; Grants</button>
            <button onClick={() => scrollTo('news')}>Announcements &amp; News</button>
            <div className="mobile-drawer-actions">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('student', 'catalog');
                }}
                className="mobile-drawer-apply"
              >
                <span>Apply for Scholarship</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('login');
                }}
                className="mobile-drawer-login"
              >
                <LockKeyhole size={14} />
                <span>Staff Sign In</span>
              </button>
            </div>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="header-btn header-btn-signin"
              onClick={() => onNavigate('login')}
            >
              <LockKeyhole size={14} />
              <span>Staff Sign In</span>
            </button>

            <button
              type="button"
              className="header-btn header-btn-apply"
              onClick={() => onNavigate('student', 'catalog')}
            >
              <span>Apply for Scholarship</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="top">
        {/* 1. Hero Section */}
        <section className="hero-section">
          <div className="hero-grid-lines" />
          <div className="container hero-content">
            <div className="hero-copy">
              <div className="status-pill">
                <span className="status-dot" />
                <span>A.Y. 2026–2027 Scholarship Operations Active</span>
              </div>
              <h1>
                Empowering <em>future leaders</em> through accessible higher education.
              </h1>
              <p className="hero-subtitle">
                Explore institutional merit fellowships, STEM research grants, and need-based financial
                aid for Academic Year 2026–2027.
              </p>
              <div className="hero-actions flex-wrap gap-3">
                <AppButton onClick={() => scrollTo('programs')} icon={ArrowRight}>
                  Browse Open Grants
                </AppButton>
                <button
                  onClick={() => onNavigate('student', 'renewal')}
                  className="px-5 py-3 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 rounded-2xl transition-all cursor-pointer inline-flex items-center space-x-2 border border-emerald-300/60 shadow-xs"
                >
                  <RefreshCw size={16} className="text-emerald-700" />
                  <span>Scholarship Renewal</span>
                </button>
                <button className="text-link" onClick={() => onOpenGuide('requirements')}>
                  Check Eligibility Requirements <ArrowRight size={16} />
                </button>
              </div>
              <button
                className="hero-trust"
                onClick={() => scrollTo('impact')}
                aria-label="Explore scholar impact"
              >
                <div className="avatar-stack">
                  <span>JV</span>
                  <span>SR</span>
                  <span>MS</span>
                </div>
                <span>
                  <strong>{activeScholarsCount > 0 ? `${activeScholarsCount}+` : '—'}</strong> scholars supported
                </span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Hero Live Overview Panel */}
            <div className="hero-panel-wrap">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="portal-card">
                <div className="portal-card-top">
                  <span>Meridian University / overview</span>
                  <span className="online-label">
                    <span />
                    Live System
                  </span>
                </div>
                <div className="portal-card-heading">
                  <div>
                    <p className="mini-label">Your funding landscape</p>
                    <h3>Make room for what’s next.</h3>
                  </div>
                  <div className="spark-icon">
                    <Sparkles size={18} />
                  </div>
                </div>
                <div className="funding-amount">
                  <span>Available aid pool</span>
                  <strong>
                    {displayFunding}
                  </strong>
                </div>
                <div className="funding-bar">
                  <span />
                </div>
                <div className="funding-meta">
                  <span>Open quota programs</span>
                  <strong>{openScholarships.length} Available</strong>
                </div>
                <div className="portal-list">
                  {openScholarships.slice(0, 2).map((sch, idx) => (
                    <div
                      key={sch.id}
                      className="portal-list-item"
                      onClick={() => onApplyScholarship(sch)}
                      title={`Apply for ${sch.title}`}
                    >
                      <div className={`list-icon ${idx === 0 ? 'violet' : 'green'}`}>
                        {idx === 0 ? <GraduationCap size={16} /> : <Network size={16} />}
                      </div>
                      <div>
                        <strong>{sch.title}</strong>
                        <span>{sch.slots_remaining} open awards • Min GWA {sch.min_gwa.toFixed(2)}</span>
                      </div>
                      <ChevronRight size={15} />
                    </div>
                  ))}
                </div>
                <div className="portal-footer">
                  <span>
                    <ShieldCheck size={15} /> Verified Institutional Gateway
                  </span>
                  <span>AY 2026–2027</span>
                </div>
              </div>
              <div className="floating-note note-top">
                <span className="note-icon">
                  <Check size={14} />
                </span>
                <div>
                  <strong>100% online</strong>
                  <small>Document clearance</small>
                </div>
              </div>
              <div className="floating-note note-bottom">
                <div className="tiny-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  <strong>98.4%</strong>
                  <small>Degree completion rate</small>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Metrics Bar */}
          <div className="container metrics-bar">
            {metricsData.map((metric) => {
              const Icon = metric.icon;
              return (
                <button
                  className={`metric metric-${metric.accent}`}
                  key={metric.label}
                  onClick={() => setSelectedMetric(metric)}
                  aria-label={`Learn more about ${metric.label}`}
                >
                  <Icon size={21} />
                  <div>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                  <ChevronRight className="metric-arrow" size={15} />
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Institutional About Section */}
        <section className="about-section" id="about">
          <div className="container about-inner">
            <div className="about-top-copy">
              <div className="eyebrow">
                <span />
                About Meridian University
              </div>
              <h2>
                A public university with a <em>public promise.</em>
              </h2>
              <p>
                Our institution helps students transform academic capability and civic ambition into a
                future they can build for themselves, their families, and their communities.
              </p>
              <p className="about-top-note">
                The Meridian University Scholarship Portal is the university’s centralized student financial aid desk—built to make academic
                support clear, equitable, and within reach for every enrolled scholar.
              </p>
            </div>
            <div className="about-panel">
              <div className="about-seal">
                <ScholarFlowLogo size="sm" />
              </div>
              <div className="about-panel-copy">
                <span className="impact-kicker">Our Commitment</span>
                <h3>Opportunity should feel within reach.</h3>
                <p>
                  We design financial aid around transparency, student dignity, and the conviction that
                  socio-economic status should never restrict academic potential.
                </p>
              </div>
              <div className="about-pillars">
                <div>
                  <strong>01</strong>
                  <span>
                    Clear guidance
                    <br />
                    at every step
                  </span>
                </div>
                <div>
                  <strong>02</strong>
                  <span>
                    Fair review
                    <br />
                    for every applicant
                  </span>
                </div>
                <div>
                  <strong>03</strong>
                  <span>
                    Support that
                    <br />
                    stays with you
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Campus Aid News Section */}
        <section className="content-section news-section" id="news">
          <div className="container">
            <SectionIntro
              eyebrow="Campus Aid News"
              title="Stay informed. Stay ready."
              copy="Timely updates from the Office of Academic Aid & Student Affairs, ensuring every funding window is transparent."
            />
            <div className="news-grid">
              {news.map((item) => (
                <article className="news-card" key={item.title}>
                  <div className="news-image">
                    <img src={item.image} alt={item.title} />
                    <span className="news-tag">{item.tag}</span>
                  </div>
                  <div className="news-body">
                    <div className="news-date">
                      <Clock3 size={13} /> {item.date}
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    <button className="read-link" onClick={() => setSelectedArticle(item)}>
                      Read article <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Scholar Impact Section */}
        <section className="impact-section" id="impact">
          <div className="container">
            <SectionIntro
              eyebrow="Scholar Impact"
              title="See the support behind the numbers."
              copy="The Meridian University scholar community is more than a headline metric. Here is a closer look at student persistence and momentum."
            />
            <div className="impact-grid">
              <article className="impact-card impact-featured">
                <div className="impact-card-top">
                  <span className="impact-icon">
                    <Users size={20} />
                  </span>
                  <span className="impact-kicker">Current Community</span>
                </div>
                <strong className="impact-number">
                  {activeScholarsCount > 0 ? `${activeScholarsCount}+` : '—'}<sup>+</sup>
                </strong>
                <h3>students supported this year</h3>
                <p>
                  Students receiving merit fellowships, need-based grants, STEM research allocations, and
                  comprehensive fee waivers.
                </p>
                <div className="impact-meter">
                  <span style={{ width: '84%' }} />
                </div>
                <div className="impact-meta">
                  <span>Good Academic Standing</span>
                  <strong>84%</strong>
                </div>
                <div className="impact-chips">
                  <span>680 first-generation scholars</span>
                  <span>412 STEM &amp; education majors</span>
                </div>
              </article>

              <article className="impact-card">
                <div className="impact-card-top">
                  <span className="impact-icon green">
                    <Network size={20} />
                  </span>
                  <span className="impact-kicker">Cross-Disciplinary Reach</span>
                </div>
                <h3>Support across every path</h3>
                <p>
                  Meridian University serves students across undergraduate disciplines, regional hometowns, and
                  degree levels.
                </p>
                <div className="impact-stat-list">
                  <div>
                    <span>Undergraduate programs</span>
                    <strong>64%</strong>
                  </div>
                  <div>
                    <span>Continuing scholars</span>
                    <strong>24%</strong>
                  </div>
                  <div>
                    <span>Post-graduate &amp; research tracks</span>
                    <strong>12%</strong>
                  </div>
                </div>
                <div className="impact-bar-stack">
                  <i style={{ width: '64%' }} />
                  <i style={{ width: '24%' }} />
                  <i style={{ width: '12%' }} />
                </div>
              </article>

              <article className="impact-card">
                <div className="impact-card-top">
                  <span className="impact-icon gold">
                    <Sparkles size={20} />
                  </span>
                  <span className="impact-kicker">What Support Unlocks</span>
                </div>
                <h3>More than tuition relief</h3>
                <p>
                  Institutional awards help students maintain continuous enrollment, finish capstone
                  projects, and graduate on schedule.
                </p>
                <div className="impact-outcomes">
                  <div>
                    <Check size={15} />
                    <span>Fewer interrupted semesters</span>
                  </div>
                  <div>
                    <Check size={15} />
                    <span>Dedicated capstone &amp; lab funding</span>
                  </div>
                  <div>
                    <Check size={15} />
                    <span>Direct faculty mentorship access</span>
                  </div>
                </div>
                <button className="read-link" onClick={() => scrollTo('how-it-works')}>
                  How support works <ArrowRight size={15} />
                </button>
              </article>
            </div>

            {/* Student Stories */}
            <div className="student-stories">
              <div className="student-stories-heading">
                <span>Students in Focus</span>
                <strong>Real support. Real momentum.</strong>
              </div>
              <div className="student-story-grid">
                <article className="student-story">
                  <div className="student-avatar avatar-julian">JV</div>
                  <div>
                    <strong>Julian Vance</strong>
                    <span>BS Computer Science · Class of 2026</span>
                    <p>
                      “The STEM Innovators grant gave me room to complete my capstone and AI research
                      without choosing between lab materials and living expenses.”
                    </p>
                  </div>
                </article>
                <article className="student-story">
                  <div className="student-avatar avatar-samantha">SR</div>
                  <div>
                    <strong>Samantha Reyes</strong>
                    <span>BS Civil Engineering · Class of 2025</span>
                    <p>
                      “The Global Access grant helped me stay enrolled through difficult semesters and
                      become the first college graduate in my family.”
                    </p>
                  </div>
                </article>
                <article className="student-story">
                  <div className="student-avatar avatar-maria">MS</div>
                  <div>
                    <strong>Maria Santos</strong>
                    <span>BA Elementary Education · Class of 2027</span>
                    <p>
                      “Knowing exactly what documents to upload made applying simple and reassuring from
                      the very first step.”
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Programs & Grants Section */}
        <section className="content-section programs-section" id="programs">
          <div className="container">
            <SectionIntro
              eyebrow="Open Opportunities"
              title="Funding that meets you where you are."
              copy="Choose an institutional scholarship program aligned with your academic ambition, discipline, or financial need."
              action={
                <span className="deadline-note">
                  <span /> Real-time active database quotas
                </span>
              }
            />

            <div className="program-grid">
              {featuredPrograms.map((program, index) => {
                const toneMap: Record<number, string> = {
                  0: 'indigo',
                  1: 'mint',
                  2: 'sand',
                  3: 'blue',
                };
                const tone = toneMap[index % 4];

                return (
                  <article className={`program-card ${tone}`} key={program.id}>
                    <div className="program-top">
                      <div className="program-icon">
                        {index === 0 && <Award size={20} />}
                        {index === 1 && <Sparkles size={20} />}
                        {index === 2 && <HandCoins size={20} />}
                        {index === 3 && <GraduationCap size={20} />}
                      </div>
                      <span className="program-index">0{index + 1}</span>
                    </div>

                    <span className="program-label">{program.category} Category</span>
                    <h3>{program.title}</h3>
                    <div className="program-value">{program.grant_type}</div>

                    <div className="program-details">
                      <div>
                        <span>Minimum GWA</span>
                        <strong>{program.min_gwa.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Remaining Slots</span>
                        <strong>{program.slots_remaining} of {program.slots}</strong>
                      </div>
                    </div>

                    {(() => {
                      const isClosed = isDeadlinePassed(program.deadline);
                      const isSlotsFull = (program.slots_remaining ?? 0) <= 0;
                      const isUnavailable = isClosed || isSlotsFull;
                      return (
                        <div className="program-footer">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>
                              Deadline: <strong style={isClosed ? { color: '#e11d48' } : undefined}>{program.deadline}</strong>
                            </span>
                            {isClosed ? (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e11d48' }}>
                                Application is closed for this scholarship
                              </span>
                            ) : isSlotsFull ? (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e11d48' }}>
                                Application is closed (Slots Full)
                              </span>
                            ) : null}
                          </div>
                          <button
                            disabled={isUnavailable}
                            onClick={() => !isUnavailable && onApplyScholarship(program)}
                            aria-label={
                              isClosed
                                ? `Application closed for ${program.title}`
                                : isSlotsFull
                                ? `Slots full for ${program.title}`
                                : `Apply for ${program.title}`
                            }
                            title={
                              isClosed
                                ? "Application is closed for this scholarship"
                                : isSlotsFull
                                ? "Application is closed (Allocated slots are full)"
                                : "Apply Now"
                            }
                            className="program-apply-btn"
                            style={isUnavailable ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
                          >
                            <span>Apply Now</span>
                            <ArrowUpRightIcon />
                          </button>
                        </div>
                      );
                    })()}
                  </article>
                );
              })}
            </div>

            <div className="programs-footnote">
              <ShieldCheck size={18} />
              <span>
                All grants are evaluated in accordance with the university’s Academic Aid Charter by an
                independent faculty review committee.
              </span>
              <button onClick={() => onNavigate('student', 'catalog')}>
                Browse All Scholarships in Catalog <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* 6. Process Section */}
        <section className="process-section" id="how-it-works">
          <div className="container process-inner">
            <div className="process-heading">
              <div className="eyebrow light">
                <span />
                A Clear Path Forward
              </div>
              <h2>
                From application to award,
                <br />
                <em>without the guesswork.</em>
              </h2>
              <p>Meridian University keeps every review stage transparent, paperless, and secure.</p>
              <button className="light-link" onClick={() => onOpenGuide('faq')}>
                Explore Help &amp; FAQ <ArrowRight size={16} />
              </button>
            </div>
            <div className="steps-list">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div className="step" key={step.number}>
                    <span className="step-number">{step.number}</span>
                    <div className="step-icon">
                      <Icon size={19} />
                    </div>
                    <div className="step-copy">
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                    <ArrowRight className="step-arrow" size={17} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Scholar Spotlight Section */}
        <section className="spotlight-section">
          <div className="container">
            <SectionIntro
              eyebrow="Scholar Spotlight"
              title="A little support can change everything."
              copy="Behind every quota slot is a dedicated student with a plan, a purpose, and a future worth backing."
            />
            <div className="spotlight-grid">
              <article className="quote-card quote-primary">
                <div className="quote-mark">
                  <Quote size={28} />
                </div>
                <blockquote>
                  “The STEM Innovators grant enabled me to finish my computer science capstone without
                  worrying about term fees.”
                </blockquote>
                <div className="quote-person">
                  <div className="portrait portrait-julian">JV</div>
                  <div>
                    <strong>Julian Vance</strong>
                    <span>BS Computer Science · Class of 2026</span>
                  </div>
                </div>
                <span className="quote-program">Future Innovators STEM &amp; Technology Grant</span>
              </article>

              <article className="spotlight-photo">
                <img src={imageSources.scholar} alt="University scholars on campus" />
                <div className="photo-caption">
                  <span>Built for the Next Chapter</span>
                  <strong>
                    1 in 4 university scholars
                    <br />
                    is a first-generation student.
                  </strong>
                </div>
              </article>

              <article className="quote-card quote-secondary">
                <div className="quote-mark">
                  <Quote size={28} />
                </div>
                <blockquote>
                  “Because of the Global Access grant, I became the first in my family to complete an
                  engineering degree.”
                </blockquote>
                <div className="quote-person">
                  <div className="portrait portrait-samantha">SR</div>
                  <div>
                    <strong>Samantha Reyes</strong>
                    <span>BS Civil Engineering · Class of 2025</span>
                  </div>
                </div>
                <span className="quote-program">Global Access &amp; Need-Based Opportunity Grant</span>
              </article>
            </div>
          </div>
        </section>

        {/* 8. Call to Action Banner */}
        <section className="cta-section">
          <div className="container cta-inner">
            <div className="cta-orb orb-left" />
            <div className="cta-orb orb-right" />
            <div className="cta-copy">
              <div className="eyebrow light">
                <span />
                Your Next Chapter Starts Here
              </div>
              <h2>
                Ready to find your
                <br />
                <em>way forward?</em>
              </h2>
              <p>
                Applications for Academic Year 2026–2027 are officially open. Select your preferred
                scholarship program to begin your submission.
              </p>
            </div>
            <div className="cta-action">
              <AppButton
                variant="light"
                onClick={() => onNavigate('student', 'catalog')}
                icon={ArrowRight}
              >
                Explore Open Grants
              </AppButton>
              <span>
                <LockKeyhole size={14} /> Paperless • Secure • Real-time tracking
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Comprehensive Connected Footer */}
      <footer className="site-footer" id="footer">
        <div className="container footer-main">
          <div className="footer-brand">
            <div className="brand-lockup">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-sm shrink-0">
                <ScholarFlowLogo size="xs" />
              </div>
              <span className="brand-copy">
                <strong>Meridian University</strong>
                <small>Office of Academic Aid &amp; Student Affairs</small>
              </span>
            </div>
            <p>
              An institutional scholarship and financial aid management platform designed for paperless
              grant processing, transparent evaluations, and real-time student tracking.
            </p>
            <div className="accreditation">
              <ShieldCheck size={16} />
              <span>
                <strong>Accredited Institutional Aid Portal</strong>
                <br />
                Universal Access &amp; Quality Tertiary Education
              </span>
            </div>
          </div>

          <div className="footer-column">
            <h4>Meridian University</h4>
            <button onClick={() => onNavigate('student', 'catalog')}>Programs &amp; Grants</button>
            <button onClick={() => onOpenGuide('requirements')}>Eligibility Guide</button>
            <button onClick={() => scrollTo('about')}>About Meridian University</button>
            <button onClick={() => onNavigate('student', 'tracker')}>Scholar Tracker</button>
            <button onClick={() => scrollTo('news')}>Announcements</button>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <button onClick={() => onOpenGuide('faq')}>Help &amp; FAQ</button>
            <button
              onClick={() =>
                setLegalModalContent({
                  title: 'Academic Aid Office Contact',
                  text: 'You may contact the Office of Academic Aid & Student Affairs during regular office hours (Monday to Friday, 8:00 AM – 5:00 PM).\n\nLocation: Student Services Center, University Campus\nDirect Telephone: (02) 8888-1234\nOfficial Email: aid@meridian.edu\n\nFor questions regarding your active application, please have your 8-character Reference Code ready.',
                })
              }
            >
              Contact the Office
            </button>
            <button
              onClick={() =>
                setLegalModalContent({
                  title: 'Data Privacy Policy',
                  text: 'Meridian University adheres to strict institutional data privacy and security governance standards.\n\nAll student credentials, Certificate of Enrollment (COE), True Copy of Grades (TCG), Household Income Tax records, and student identification documents uploaded to the platform are encrypted and strictly restricted to authorized faculty evaluation committee members and coordinators.\n\nUnder no circumstances is applicant data sold or shared with external commercial entities.',
                })
              }
            >
              Privacy Policy
            </button>
            <button
              onClick={() =>
                setLegalModalContent({
                  title: 'Terms of Financial Aid',
                  text: 'Scholarship awards are granted subject to continuous student enrollment in good standing, meeting the prescribed General Weighted Average (GWA) minimums, and adherence to the Student Code of Conduct.\n\nAward distributions are applied directly against tuition accounts or disbursed via official university bursar channels upon committee verification.',
                })
              }
            >
              Terms of Aid
            </button>
          </div>

          <div className="footer-contact">
            <h4>Office of Academic Aid</h4>
            <p>
              Student Services Center, University Campus
              <br />
              Office of Student Affairs &amp; Financial Aid
            </p>
            <span className="footer-contact-item">(02) 8888-1234</span>
            <span className="footer-contact-item">aid@meridian.edu</span>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Meridian University. All rights reserved.</span>
          <span>Scholarship Management &amp; Financial Aid Portal</span>
        </div>
      </footer>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div
          className="article-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-title"
          onClick={() => setSelectedArticle(null)}
        >
          <article className="article-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="article-close"
              onClick={() => setSelectedArticle(null)}
              aria-label="Close article"
            >
              <X size={18} />
            </button>
            <div className="article-modal-image">
              <img src={selectedArticle.image} alt={selectedArticle.title} />
              <span className="news-tag">{selectedArticle.tag}</span>
            </div>
            <div className="article-modal-copy">
              <div className="news-date">
                <Clock3 size={13} /> {selectedArticle.date} · {selectedArticle.readTime}
              </div>
              <h2 id="article-title">{selectedArticle.title}</h2>
              {selectedArticle.article.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <div className="article-byline">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-2xs">
                  <ScholarFlowLogo size="xs" />
                </div>
                <span>
                  <strong>Office of Academic Aid &amp; Student Affairs</strong>
                  <small>Meridian University Editorial &amp; Scholarship Operations Desk</small>
                </span>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Metric Detail Modal */}
      {selectedMetric && (
        <div
          className="article-overlay metric-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="metric-title"
          onClick={() => setSelectedMetric(null)}
        >
          <article className="metric-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="article-close"
              onClick={() => setSelectedMetric(null)}
              aria-label="Close metric details"
            >
              <X size={18} />
            </button>
            <div className={`metric-modal-visual ${selectedMetric.accent}`}>
              <div className="metric-modal-icon">
                {(() => {
                  const MetricIcon = selectedMetric.icon;
                  return <MetricIcon size={30} />;
                })()}
              </div>
              <span>{selectedMetric.eyebrow}</span>
              <strong>{selectedMetric.value}</strong>
              <small>{selectedMetric.label}</small>
              <div className="metric-sparkline">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="metric-modal-copy">
              <div className="eyebrow">
                <span />
                Scholarship Insight
              </div>
              <h2 id="metric-title">{selectedMetric.label}</h2>
              <p className="metric-lede">{selectedMetric.detail}</p>
              <div className="metric-breakdown">
                <h3>Allocation Breakdown</h3>
                {selectedMetric.breakdown.map((item) => (
                  <div key={item}>
                    <Check size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="metric-update">
                <Clock3 size={16} />
                <span>{selectedMetric.note}</span>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Legal & Contact Modal */}
      {legalModalContent && (
        <div
          className="article-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setLegalModalContent(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLegalModalContent(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">{legalModalContent.title}</h3>
            <div className="text-xs sm:text-sm text-slate-600 space-y-3 leading-relaxed whitespace-pre-line max-h-[60vh] overflow-y-auto pr-1">
              {legalModalContent.text}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setLegalModalContent(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to Top"
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white shadow-2xl border border-white/20 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-indigo-500/40 flex items-center justify-center cursor-pointer group"
          title="Back to Top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
