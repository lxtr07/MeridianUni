import jsPDF from 'jspdf';
import { ApplicationDocument } from '../types';

/**
 * Generates an authentic, official sample PDF Blob for seeded/mock documents
 * so that all documents in the system render an authentic PDF Document in the viewer.
 */
export function generateSampleDocumentPdfBlob(
  doc: ApplicationDocument,
  studentName: string = 'Applicant',
  studentNumber: string = '2023-10001'
): Blob {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header banner
  pdf.setFillColor(15, 23, 42); // #0f172a
  pdf.rect(0, 0, 210, 24, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('MERIDIAN UNIVERSITY SYSTEM', 105, 10, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('OFFICE OF THE UNIVERSITY REGISTRAR & SCHOLARSHIP ARCHIVES', 105, 16, { align: 'center' });

  // Determine Title based on document type
  let title = 'OFFICIAL CERTIFICATE OF MATRICULATION';
  let subtitle = 'Academic Year 2026-2027 • Regular Enrollment Verification';

  if (doc.type === 'itr') {
    title = 'CERTIFICATE OF HOUSEHOLD INCOME & INDIGENCY';
    subtitle = 'Municipal Social Welfare & Financial Assistance Verification';
  } else if (doc.type === 'id') {
    title = 'OFFICIAL STUDENT IDENTIFICATION RECORD';
    subtitle = 'Registrar Biometric Verification & Student Card Dossier';
  } else if (doc.name.toLowerCase().includes('transcript') || doc.name.toLowerCase().includes('grade')) {
    title = 'OFFICIAL TRANSCRIPT OF ACADEMIC RECORDS';
    subtitle = 'Certified General Weighted Average (GWA) Breakdown';
  }

  // Document Title
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(title, 105, 40, { align: 'center' });

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(subtitle, 105, 46, { align: 'center' });

  // Divider
  pdf.setDrawColor(203, 213, 225);
  pdf.line(20, 52, 190, 52);

  // Student Info Box
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(20, 58, 170, 36, 2, 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(20, 58, 170, 36, 2, 2, 'D');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Student Name:', 26, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.text(studentName.toUpperCase(), 62, 68);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Student Number:', 26, 76);
  pdf.setFont('helvetica', 'normal');
  pdf.text(studentNumber || 'N/A', 62, 76);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Document File:', 26, 84);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.name, 62, 84);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Archived Date:', 115, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.uploaded_at || '2026-08-01', 145, 68);

  pdf.setFont('helvetica', 'bold');
  pdf.text('File Size:', 115, 76);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.size || '1.2 MB', 145, 76);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Archive Status:', 115, 84);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(16, 185, 129);
  pdf.text('Active Record', 145, 84);

  // Body content
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);

  if (doc.type === 'com') {
    pdf.text(
      'This certifies that the above-named student is officially enrolled for the current academic year in good academic standing. The student is registered with full-time course units as prescribed in the university academic curriculum.',
      20,
      105,
      { maxWidth: 170, lineHeightFactor: 1.4 }
    );

    // Course table
    pdf.setFillColor(241, 245, 249);
    pdf.rect(20, 122, 170, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('COURSE CODE', 24, 127.5);
    pdf.text('COURSE DESCRIPTION', 60, 127.5);
    pdf.text('UNITS', 140, 127.5);
    pdf.text('GRADE', 170, 127.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const courses = [
      { code: 'CS 301', desc: 'Design and Analysis of Algorithms', units: '3.0', grade: '1.25' },
      { code: 'CS 305', desc: 'Operating Systems & Architecture', units: '3.0', grade: '1.50' },
      { code: 'MATH 204', desc: 'Advanced Engineering Calculus', units: '3.0', grade: '1.25' },
      { code: 'ENG 102', desc: 'Technical Communication & Research', units: '3.0', grade: '1.00' },
      { code: 'SOC 101', desc: 'Ethics and Contemporary Society', units: '3.0', grade: '1.25' },
    ];
    courses.forEach((c, idx) => {
      const y = 136 + idx * 8;
      pdf.text(c.code, 24, y);
      pdf.text(c.desc, 60, y);
      pdf.text(c.units, 142, y);
      pdf.text(c.grade, 172, y);
    });
  } else if (doc.type === 'itr') {
    pdf.text(
      'This official certification is issued to attest to the annual household financial status and income tax exemption/compliance for scholarship assessment purposes. The declaration has been verified against municipal records.',
      20,
      105,
      { maxWidth: 170, lineHeightFactor: 1.4 }
    );

    pdf.setFillColor(241, 245, 249);
    pdf.rect(20, 122, 170, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('ASSESSMENT CRITERIA', 24, 127.5);
    pdf.text('RECORDED SPECIFICATION', 110, 127.5);

    pdf.setFont('helvetica', 'normal');
    const items = [
      { label: 'Household Size', val: '4 Dependent Family Members' },
      { label: 'Combined Monthly Income', val: 'PHP 45,000.00 / Month' },
      { label: 'Tax Filing Classification', val: 'Exempt / Minimum Earner Bracket' },
      { label: 'Barangay Indigency Reference', val: 'LGU-SOC-2026-8819A' },
      { label: 'Assessed Qualification', val: 'Qualified for Financial Aid' },
    ];
    items.forEach((item, idx) => {
      const y = 136 + idx * 8;
      pdf.text(item.label, 24, y);
      pdf.text(item.val, 110, y);
    });
  } else {
    pdf.text(
      'This document serves as the verified applicant identification credential filed in the university database. It certifies the official enrollment and student identity for all administrative scholarship privileges.',
      20,
      105,
      { maxWidth: 170, lineHeightFactor: 1.4 }
    );

    pdf.setFillColor(241, 245, 249);
    pdf.rect(20, 122, 170, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text('IDENTITY FIELD', 24, 127.5);
    pdf.text('VERIFICATION RECORD', 110, 127.5);

    pdf.setFont('helvetica', 'normal');
    const items = [
      { label: 'Student Identification Card', val: 'Issued and Validated' },
      { label: 'Campus Affiliation', val: 'Main University Campus' },
      { label: 'Academic Standing', val: 'Good Standing - No Sanctions' },
      { label: 'Registry Verification Stamp', val: 'REG-2026-VAL-OK' },
    ];
    items.forEach((item, idx) => {
      const y = 136 + idx * 8;
      pdf.text(item.label, 24, y);
      pdf.text(item.val, 110, y);
    });
  }

  // Official Signature Seals at bottom
  pdf.setDrawColor(203, 213, 225);
  pdf.line(20, 205, 190, 205);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('DR. EMILIA T. CORTEZ', 30, 220);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('University Registrar & Admissions Officer', 30, 225);
  pdf.text('Office of Admissions & Student Records', 30, 229);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('ATTY. ROBERTO G. MENDOZA', 130, 220);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Director, Center for Student Scholarships', 130, 225);
  pdf.text('Scholarship Board Secretariat', 130, 229);

  // Footer bar
  pdf.setFillColor(241, 245, 249);
  pdf.rect(0, 285, 210, 12, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Meridian University Automated Document Archive • System Reference MU-DOC-VALIDATED', 105, 292, { align: 'center' });

  return pdf.output('blob');
}

/**
 * Generates an SVG data URL for seeded student ID photos/images without raw data URLs.
 */
export function generateSampleStudentIdImageDataUrl(
  studentName: string = 'Applicant',
  studentNumber: string = '2023-10001'
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="600" height="380" rx="16" fill="url(#cardGrad)" />
      
      <!-- Top Red Accent Line -->
      <rect x="0" y="65" width="600" height="5" fill="#C8102E" />
      
      <!-- University Header -->
      <text x="35" y="40" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">MERIDIAN UNIVERSITY SYSTEM</text>
      <text x="35" y="56" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#94a3b8" letter-spacing="1">OFFICIAL STUDENT IDENTIFICATION CARD</text>
      
      <!-- Photo Area -->
      <rect x="35" y="90" width="130" height="155" rx="10" fill="#334155" stroke="#C8102E" stroke-width="3" />
      <circle cx="100" cy="145" r="32" fill="#64748b" />
      <path d="M 60 215 C 60 185, 140 185, 140 215 Z" fill="#475569" />
      <text x="100" y="235" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" fill="#94a3b8" text-anchor="middle">OFFICIAL PHOTO</text>
      
      <!-- Student Information -->
      <text x="190" y="115" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#F1C40F">STUDENT NAME</text>
      <text x="190" y="138" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" fill="#ffffff">${studentName.toUpperCase()}</text>
      
      <text x="190" y="170" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#F1C40F">STUDENT NUMBER</text>
      <text x="190" y="192" font-family="Courier, monospace" font-size="16" font-weight="bold" fill="#ffffff">${studentNumber || '2023-10001'}</text>
      
      <text x="190" y="222" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#F1C40F">CAMPUS AFFILIATION</text>
      <text x="190" y="242" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">COLLEGE OF COMPUTER SCIENCE &amp; ENGINEERING</text>
      
      <!-- Bottom Bar & Barcode -->
      <rect x="0" y="295" width="600" height="85" rx="0" fill="#ffffff" />
      <rect x="35" y="315" width="4" height="42" fill="#1e293b" />
      <rect x="43" y="315" width="8" height="42" fill="#1e293b" />
      <rect x="55" y="315" width="3" height="42" fill="#1e293b" />
      <rect x="62" y="315" width="6" height="42" fill="#1e293b" />
      <rect x="72" y="315" width="10" height="42" fill="#1e293b" />
      <rect x="86" y="315" width="4" height="42" fill="#1e293b" />
      <rect x="94" y="315" width="8" height="42" fill="#1e293b" />
      <rect x="106" y="315" width="5" height="42" fill="#1e293b" />
      <rect x="115" y="315" width="12" height="42" fill="#1e293b" />
      <rect x="131" y="315" width="4" height="42" fill="#1e293b" />
      <rect x="139" y="315" width="7" height="42" fill="#1e293b" />
      <rect x="150" y="315" width="10" height="42" fill="#1e293b" />
      <text x="95" y="370" font-family="Courier, monospace" font-size="9" fill="#64748b" text-anchor="middle">${studentNumber || '2023-10001'}</text>
      
      <text x="450" y="332" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#1e293b" text-anchor="middle">A.Y. 2026-2027 ENROLLED</text>
      <text x="450" y="350" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#64748b" text-anchor="middle">OFFICE OF THE UNIVERSITY REGISTRAR</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
