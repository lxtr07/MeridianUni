# ScholarFlow — Scholarship Application & Management Portal

> An institutional scholarship and financial aid management platform designed for transparent evaluations, paperless grant processing, and real-time student tracking.

---

## 📁 Project Folder Structure

```
ScholarFlow/
│
├── index.html                          # App entry point (Vite HTML shell)
├── package.json                        # Project dependencies & npm scripts
├── tsconfig.json                       # TypeScript compiler configuration
├── vite.config.ts                      # Vite bundler configuration
├── firestore.rules                     # Firebase Firestore security rules
├── firebase-blueprint.json             # Firestore schema blueprint
├── firebase-applet-config.json         # Firebase project connection config
├── server.ts                           # Express.js REST API backend server
├── .env.example                        # Environment variable template
├── .gitignore                          # Git ignore rules
│
├── /public/                            # Static assets served directly
│   └── scholarflow_LOGO.png            # App logo & browser tab favicon
│
├── /src/                               # Main application source code
│   ├── main.tsx                        # React app entry point
│   ├── App.tsx                         # Root component — routing & state
│   ├── index.css                       # Global base styles
│   ├── vite-env.d.ts                   # Vite TypeScript environment types
│   │
│   ├── /assets/                        # Internal app assets
│   │   └── /images/                    # Image files used within the app
│   │       ├── scholarflow_LOGO.png    # Primary ScholarFlow brand emblem
│   │       └── scholarship_portal_bg.jpg # Background artwork for login portal
│   │
│   ├── /components/                    # All UI components
│   │   │
│   │   ├── /common/                    # Shared/reusable components
│   │   │   ├── Header.tsx              # Responsive sticky navigation header
│   │   │   ├── Footer.tsx              # Site footer with navigation links
│   │   │   ├── HelpGuideModal.tsx      # Eligibility & FAQ guide modal
│   │   │   ├── DocumentUploader.tsx    # File upload component for applications
│   │   │   ├── DocumentViewerModal.tsx # Document preview modal
│   │   │   ├── ScholarFlowLogo.tsx     # Brand logo renderer component
│   │   │   └── UserProfileModal.tsx    # Staff/Admin profile editor modal
│   │   │
│   │   ├── /portal/                    # Portal Home (Landing Page)
│   │   │   └── PortalSelection.tsx     # Gateway selection page
│   │   │
│   │   ├── /student/                   # Student Portal views
│   │   │   ├── StudentPortal.tsx       # Student dashboard with tabs
│   │   │   ├── ScholarshipCatalog.tsx  # Browse & filter scholarships
│   │   │   ├── ApplicationWizard.tsx   # 3-step application form wizard
│   │   │   └── StatusTracker.tsx       # Application status lookup
│   │   │
│   │   ├── /auth/                      # Authentication
│   │   │   └── StaffAdminLogin.tsx     # Staff & Admin login form
│   │   │
│   │   ├── /staff/                     # Staff Coordinator dashboard
│   │   │   └── StaffPanel.tsx          # Application management panel
│   │   │
│   │   └── /admin/                     # Administrator dashboard
│   │       └── AdminDashboard.tsx      # Full system control dashboard
│   │
│   ├── /lib/                           # Utility libraries & API services
│   │   ├── firebase.ts                 # Firestore CRUD & real-time subscriptions
│   │   ├── dataSync.ts                 # Dual-layer sync (REST API + Firestore)
│   │   ├── storage.ts                  # localStorage session management
│   │   ├── duplicateCheck.ts           # Prevent duplicate applications
│   │   ├── logger.ts                   # Audit log event recorder
│   │   ├── crypto.ts                   # Reference code generation
│   │   ├── formatters.ts               # Date & currency formatters
│   │   ├── pdfGenerator.ts             # PDF export for applications
│   │   └── sampleDocumentGenerator.ts  # Sample document generator
│   │
│   ├── /types/                         # TypeScript type definitions
│   │   └── index.ts                    # All shared interfaces & types
│   │
│   └── /data/                          # Static seed & reference data
│       ├── initialData.ts              # Default scholarship seed records
│       └── programs.ts                 # Academic programs reference list
│
├── /dist/                              # Production build output (auto-generated)
│   └── index.html                      # Compiled production HTML
│
├── /.github/                           # GitHub configuration
│   └── /workflows/                     # CI/CD GitHub Actions workflows
│
├── SRS.md                              # Software Requirements Specification
├── security_spec.md                    # Security specification document
├── AGENTS.md                           # AI agent configuration rules
└── metadata.json                       # Project metadata
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend UI | React 19 + TypeScript | Component-based user interface |
| Styling | Tailwind CSS | Utility-first responsive styling |
| Animations | Framer Motion (motion/react) | Smooth UI transitions & animations |
| Icons | Lucide React | Consistent icon library |
| Build Tool | Vite | Fast development server & bundler |
| Backend API | Express.js (server.ts) | REST API for data operations |
| Database | Firebase Firestore | Real-time NoSQL cloud database |
| Security Rules | firestore.rules | Role-based data access control |

---

## 👥 User Roles

| Role | Login Required | Access |
|------|--------------|--------|
| **Student** | No | Browse scholarships, apply, track status |
| **Staff Coordinator** | Yes | Manage applications, freeze programs, schedule interviews |
| **Administrator** | Yes | Full system control — scholarships, users, audit logs |

---

## 🚀 Getting Started

### 1. Clone the repository
```
git clone https://github.com/your-username/ScholarFlow.git
cd ScholarFlow
```

### 2. Install dependencies
```
npm install
```

### 3. Configure Firebase
Copy `.env.example` to `.env` and fill in your Firebase credentials:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run the development server
```
npm run dev
```
Open http://localhost:5173 in your browser.

### 5. Run the backend API (optional)
```
npx ts-node server.ts
```

---

## ✨ Key Features

- Scholarship Catalog — Browse and filter all available scholarship programs
- 3-Step Application Wizard — Guided form with document upload support
- Status Tracker — Look up application status using a reference code
- Freeze Announcements — Staff can freeze programs; students see live alerts
- Real-Time Sync — All data synced instantly via Firebase Firestore
- Role-Based Access — Separate portals for Students, Staff, and Admins
- Audit Logs — Every action recorded for transparency
- PDF Export — Generate printable application summaries

---

## 📄 Project Documentation & Academic Specifications

| File | Type | Purpose / Academic Role | Required at Runtime? |
|------|------|-------------------------|---------------------|
| `SRS.md` | Thesis / Capstone Doc | Software Requirements Specification (Scope, Functional Requirements) | No (Keep for thesis documentation) |
| `security_spec.md` | Thesis / Capstone Doc | Security Invariants & Hardened Test Vectors specification | No (Keep for thesis documentation) |
| `firestore.rules` | Security Config | Production security rules for Firebase Firestore access control | **Yes** (Firebase deployment) |
| `firebase-blueprint.json` | Architecture Spec | Cloud Firestore collection schema and data architecture model | No (Schema documentation) |

---

## 🧹 File Audit & Optimization History

The repository has been pruned and optimized to remove **unused legacy assets, duplicate media, and project leftovers**, saving **~2.66 MB** of unnecessary bloat:

| File / Folder Path | File Type | Size | Status | Action Taken |
|--------------------|-----------|------|--------|--------------|
| `src/assets/images/mapua_intramuros_facade_1786713740521.jpg` | Image | ~993 KB | Unused background photo | ✅ Pruned / Removed |
| `src/assets/images/scholarflow_logo.jpg` | Image | ~323 KB | Unused JPG logo | ✅ Pruned / Removed |
| `src/assets/images/scholarflow_logo_1788430518081.jpg` | Image | ~323 KB | Duplicate unused JPG logo | ✅ Pruned / Removed |
| `src/assets/images/logo.png` | Image | ~454 KB | Duplicate of `scholarflow_LOGO.png` | ✅ Pruned / Removed |
| `public/logo.png` | Image | ~454 KB | Duplicate in `/public/` | ✅ Pruned / Removed |
| `src/components/common/ScholarFlowOfficialEmblem.tsx` | Component | ~10 KB | Orphaned legacy SVG component | ✅ Pruned / Removed |
| `/assets/` (at project root) | Directory | ~2 B | Empty AI Studio leftover folder | ✅ Pruned / Removed |
| `bun.lock` | Lockfile | ~106 KB | Unused lockfile (npm is active) | ✅ Pruned / Removed |
| `metadata.json` | Config | ~254 B | Leftover AI Studio session descriptor | ✅ Pruned / Removed |

> **Net storage savings:** **~2.66 MB** removed. All active application features, branding, and academic thesis documentation (`SRS.md`, `security_spec.md`) remain 100% intact.

---

## 📬 Contact

**Academic Aid Office**
- Email: aid@scholarflow.edu
- Phone: +1 (800) 555-0199
- Address: Student Services Center, University Campus

---

*© 2026 ScholarFlow Platform. All rights reserved. Enterprise Scholarship Operations System.*
