import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Application, Scholarship, UserProfile } from '../types';

export interface PDFReportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
}

export interface PDFSignatories {
  preparedByName?: string;
  preparedByTitle?: string;
  preparedByDepartment?: string;
  approvedByName?: string;
  approvedByTitle?: string;
  approvedByDepartment?: string;
  institutionName?: string;
  officeName?: string;
}

export interface PDFReportOptions {
  filters: PDFReportFilters;
  signatories?: PDFSignatories;
  scholarships?: Scholarship[];
  currentUser?: UserProfile;
}

// Utility: Format currency in standard Philippine Peso (PHP / ₱)
export function formatPeso(amount: number): string {
  return `PHP ${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPesoShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `PHP ${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `PHP ${(amount / 1_000).toFixed(1)}K`;
  }
  return `PHP ${amount.toLocaleString('en-PH')}`;
}

export function generateOfficialPDFReport(
  applications: Application[],
  options: PDFReportOptions
) {
  const { filters, signatories, scholarships = [], currentUser } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Professional Academic Color Palette
  const colorNavy = [15, 23, 42]; // #0F172A (Deep Slate)
  const colorIndigo = [79, 70, 229]; // #4F46E5 (Indigo)
  const colorSlateDark = [30, 41, 59]; // #1E293B
  const colorMuted = [100, 116, 139]; // #64748B
  const colorBorder = [226, 232, 240]; // #E2E8F0
  const colorBgLight = [248, 250, 252]; // #F8FAFC

  // Status Colors
  const colorApproved = [16, 185, 129]; // Emerald #10B981
  const colorShortlisted = [99, 102, 241]; // Indigo #6366F1
  const colorPending = [245, 158, 11]; // Amber #F59E0B
  const colorRejected = [239, 68, 68]; // Rose #EF4444

  // 1. Filter applications by date range & status
  let filtered = [...applications];
  if (filters.startDate) {
    filtered = filtered.filter(a => new Date(a.created_at) >= new Date(filters.startDate!));
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(a => new Date(a.created_at) <= end);
  }
  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter(a => a.status === filters.status);
  }

  // 2. Metrics & Aggregations
  const totalApps = filtered.length;
  const approvedApps = filtered.filter(a => a.status === 'Approved');
  const shortlistedApps = filtered.filter(a => a.status === 'Shortlisted');
  const pendingApps = filtered.filter(a => a.status === 'Pending' || a.status === 'In Review');
  const rejectedApps = filtered.filter(a => a.status === 'Rejected');

  const totalApprovedDisbursement = approvedApps.reduce((acc, curr) => acc + (curr.awarded_amount || 0), 0);
  const totalShortlistedValue = shortlistedApps.reduce((acc, curr) => acc + (curr.awarded_amount || 0), 0);
  const approvalRate = totalApps > 0 ? ((approvedApps.length / totalApps) * 100).toFixed(1) : '0.0';
  const averageAward = approvedApps.length > 0 ? totalApprovedDisbursement / approvedApps.length : 0;

  // Signatory Names (strictly dynamic based on dashboard active profiles & selections)
  const preparedByName =
    signatories?.preparedByName?.trim() ||
    currentUser?.full_name ||
    'Office Administrator';
  const preparedByTitle =
    signatories?.preparedByTitle?.trim() ||
    currentUser?.title ||
    'Scholarship Operations Coordinator';
  const preparedByDept =
    signatories?.preparedByDepartment?.trim() ||
    currentUser?.department ||
    'Academic Affairs & Student Financial Aid';

  const approvedByName =
    signatories?.approvedByName?.trim() ||
    'Dr. Raymond B. Miller';
  const approvedByTitle =
    signatories?.approvedByTitle?.trim() ||
    'Chairperson, Faculty Scholarship Committee';
  const approvedByDept =
    signatories?.approvedByDepartment?.trim() ||
    'Office of Academic Affairs & Grants Administration';

  const institutionName = signatories?.institutionName || 'MERIDIAN UNIVERSITY ACADEMIC PORTAL';
  const officeName = signatories?.officeName || 'Office of Student Financial Aid & Academic Scholarships';

  // ----------------------------------------------------
  // PAGE 1: EXECUTIVE SUMMARY & ANALYTICAL GRAPHS
  // ----------------------------------------------------

  // Header Accent Stripe
  doc.setFillColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(colorIndigo[0], colorIndigo[1], colorIndigo[2]);
  doc.rect(0, 6, pageWidth, 2.5, 'F');

  // Institution & Office Header
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(institutionName.toUpperCase(), marginX, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text(officeName, marginX, 24);
  doc.text('Higher Education Grant Distribution & Institutional Scholarship Records', marginX, 28.5);

  // Document Badge (Right aligned)
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.roundedRect(pageWidth - marginX - 58, 12, 58, 15, 2, 2, 'F');
  doc.setDrawColor(colorIndigo[0], colorIndigo[1], colorIndigo[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - marginX - 58, 12, 58, 15, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colorIndigo[0], colorIndigo[1], colorIndigo[2]);
  doc.text('OFFICIAL REPORT', pageWidth - marginX - 55, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(colorSlateDark[0], colorSlateDark[1], colorSlateDark[2]);
  doc.text(`REF: SF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, pageWidth - marginX - 55, 21.5);
  doc.text('AUTHENTICATED SUMMARY', pageWidth - marginX - 55, 25);

  // Top Divider
  doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
  doc.setLineWidth(0.4);
  doc.line(marginX, 32, pageWidth - marginX, 32);

  // Report Title & Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.text('EXECUTIVE SCHOLARSHIP ALLOCATION & AUDIT SUMMARY', marginX, 39);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated On: ${formattedDate}`, marginX, 44);
  doc.text(`Status Scope: ${filters.status || 'All Statuses'}  |  Date Window: ${filters.startDate || 'Inception'} to ${filters.endDate || 'Present'}`, marginX, 48);
  doc.text(`Account In-Charge: ${preparedByName} (${preparedByTitle})`, marginX, 52);

  // ----------------------------------------------------
  // SECTION 1: EXECUTIVE KPI SUMMARY CARDS (4 Columns)
  // ----------------------------------------------------
  const kpiY = 56;
  const cardGap = 3;
  const cardW = (contentWidth - cardGap * 3) / 4; // ~43.25mm
  const cardH = 22;

  const kpis = [
    { label: 'TOTAL SUBMISSIONS', value: `${totalApps}`, sub: 'Evaluated applications', color: colorSlateDark },
    { label: 'APPROVED SCHOLARS', value: `${approvedApps.length}`, sub: `${approvalRate}% Acceptance rate`, color: colorApproved },
    { label: 'TOTAL DISBURSED', value: formatPesoShort(totalApprovedDisbursement), sub: formatPeso(totalApprovedDisbursement), color: colorIndigo },
    { label: 'AVG GRANT AWARD', value: formatPesoShort(averageAward), sub: 'Per confirmed scholar', color: colorSlateDark },
  ];

  kpis.forEach((kpi, idx) => {
    const cx = marginX + idx * (cardW + cardGap);
    // Background card
    doc.setFillColor(colorBgLight[0], colorBgLight[1], colorBgLight[2]);
    doc.roundedRect(cx, kpiY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, kpiY, cardW, cardH, 2, 2, 'S');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    doc.text(kpi.label, cx + 3.5, kpiY + 5.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cx + 3.5, kpiY + 12.5);

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    const cleanSub = kpi.sub.length > 24 ? kpi.sub.substring(0, 22) + '...' : kpi.sub;
    doc.text(cleanSub, cx + 3.5, kpiY + 18);
  });

  // ----------------------------------------------------
  // SECTION 2: VISUAL GRAPHS & DISTRIBUTION CHARTS
  // ----------------------------------------------------
  const graphsY = kpiY + cardH + 7; // ~85mm

  // Graph Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.text('1. APPLICATION STATUS & DISBURSEMENT DISTRIBUTION', marginX, graphsY);

  // Stacked Progress Distribution Bar
  const barY = graphsY + 3.5;
  const barH = 7;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, barY, contentWidth, barH, 2, 2, 'F');

  // Compute widths
  const approvedRatio = totalApps > 0 ? approvedApps.length / totalApps : 0;
  const shortlistedRatio = totalApps > 0 ? shortlistedApps.length / totalApps : 0;
  const pendingRatio = totalApps > 0 ? pendingApps.length / totalApps : 0;
  const rejectedRatio = totalApps > 0 ? rejectedApps.length / totalApps : 0;

  const wApproved = approvedRatio * contentWidth;
  const wShortlisted = shortlistedRatio * contentWidth;
  const wPending = pendingRatio * contentWidth;
  const wRejected = rejectedRatio * contentWidth;

  let currentX = marginX;
  if (wApproved > 0) {
    doc.setFillColor(colorApproved[0], colorApproved[1], colorApproved[2]);
    doc.rect(currentX, barY, wApproved, barH, 'F');
    currentX += wApproved;
  }
  if (wShortlisted > 0) {
    doc.setFillColor(colorShortlisted[0], colorShortlisted[1], colorShortlisted[2]);
    doc.rect(currentX, barY, wShortlisted, barH, 'F');
    currentX += wShortlisted;
  }
  if (wPending > 0) {
    doc.setFillColor(colorPending[0], colorPending[1], colorPending[2]);
    doc.rect(currentX, barY, wPending, barH, 'F');
    currentX += wPending;
  }
  if (wRejected > 0) {
    doc.setFillColor(colorRejected[0], colorRejected[1], colorRejected[2]);
    doc.rect(currentX, barY, wRejected, barH, 'F');
    currentX += wRejected;
  }

  // Border around stacked bar
  doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, barY, contentWidth, barH, 2, 2, 'S');

  // Legend Badges below bar
  const legendY = barY + barH + 4;
  const statusDetails = [
    { name: 'Approved', count: approvedApps.length, pct: approvedRatio * 100, color: colorApproved, amount: totalApprovedDisbursement },
    { name: 'Shortlisted', count: shortlistedApps.length, pct: shortlistedRatio * 100, color: colorShortlisted, amount: totalShortlistedValue },
    { name: 'In Review / Pending', count: pendingApps.length, pct: pendingRatio * 100, color: colorPending, amount: 0 },
    { name: 'Rejected', count: rejectedApps.length, pct: rejectedRatio * 100, color: colorRejected, amount: 0 },
  ];

  const legBoxW = contentWidth / 4;
  statusDetails.forEach((st, idx) => {
    const lx = marginX + idx * legBoxW;
    // Dot
    doc.setFillColor(st.color[0], st.color[1], st.color[2]);
    doc.circle(lx + 2, legendY + 2, 1.6, 'F');

    // Name & Count
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorSlateDark[0], colorSlateDark[1], colorSlateDark[2]);
    doc.text(`${st.name}: ${st.count}`, lx + 6, legendY + 3);

    // Percentage & PHP
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    const amtLabel = st.amount > 0 ? ` (${formatPesoShort(st.amount)})` : '';
    doc.text(`${st.pct.toFixed(1)}% of total${amtLabel}`, lx + 6, legendY + 7);
  });

  // ----------------------------------------------------
  // GRAPH 2 & 3: SCHOLARSHIP PROGRAM ALLOCATIONS & CAPACITY
  // ----------------------------------------------------
  const progY = legendY + 13; // ~114mm

  // Group approved applications by scholarship program
  const progMap: Record<string, { title: string; count: number; totalGrant: number }> = {};
  filtered.forEach(app => {
    const sTitle = app.scholarship_title || 'General Scholarship';
    if (!progMap[sTitle]) {
      progMap[sTitle] = { title: sTitle, count: 0, totalGrant: 0 };
    }
    progMap[sTitle].count += 1;
    if (app.status === 'Approved') {
      progMap[sTitle].totalGrant += app.awarded_amount || 0;
    }
  });

  const progList = Object.values(progMap).sort((a, b) => b.totalGrant - a.totalGrant).slice(0, 4);
  const maxProgGrant = Math.max(...progList.map(p => p.totalGrant), 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.text('2. GRANT DISBURSEMENTS BY SCHOLARSHIP PROGRAM', marginX, progY);

  let currentProgBarY = progY + 4;
  if (progList.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    doc.text('No program records found within the specified filter criteria.', marginX, currentProgBarY + 4);
    currentProgBarY += 10;
  } else {
    progList.forEach(prog => {
      // Program Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(colorSlateDark[0], colorSlateDark[1], colorSlateDark[2]);
      const shortTitle = prog.title.length > 50 ? prog.title.substring(0, 48) + '...' : prog.title;
      doc.text(shortTitle, marginX, currentProgBarY + 3);

      // Amount & Count on Right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(colorIndigo[0], colorIndigo[1], colorIndigo[2]);
      const statLabel = `${formatPeso(prog.totalGrant)} (${prog.count} applicants)`;
      doc.text(statLabel, pageWidth - marginX - doc.getTextWidth(statLabel), currentProgBarY + 3);

      // Horizontal Bar
      const hBarTrackW = contentWidth;
      const hBarW = Math.max(3, (prog.totalGrant / maxProgGrant) * hBarTrackW);

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(marginX, currentProgBarY + 4.5, hBarTrackW, 3.5, 1, 1, 'F');

      doc.setFillColor(colorIndigo[0], colorIndigo[1], colorIndigo[2]);
      doc.roundedRect(marginX, currentProgBarY + 4.5, hBarW, 3.5, 1, 1, 'F');

      currentProgBarY += 10;
    });
  }

  // ----------------------------------------------------
  // SECTION 3: DETAILED RECIPIENT & EVALUATION REGISTRY TABLE
  // ----------------------------------------------------
  const tableStartY = Math.max(currentProgBarY + 5, 160);

  // Table header banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.text('3. COMPREHENSIVE SCHOLAR & APPLICANT REGISTRY', marginX, tableStartY - 3);

  const tableData = filtered.map(app => [
    app.reference_code,
    `${app.last_name}, ${app.first_name}\nID: ${app.student_number || 'N/A'}`,
    app.program || 'Undergraduate',
    app.scholarship_title || 'Scholarship',
    app.status,
    app.status === 'Approved' ? formatPeso(app.awarded_amount || 0) : 'PHP 0.00',
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Ref Code', 'Student Information', 'Degree Program', 'Scholarship Title', 'Status', 'Awarded (PHP / ₱)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 42 },
      2: { cellWidth: 32 },
      3: { cellWidth: 44 },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      // Color-code status column
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text === 'Approved') {
          doc.setTextColor(colorApproved[0], colorApproved[1], colorApproved[2]);
        } else if (text === 'Shortlisted') {
          doc.setTextColor(colorShortlisted[0], colorShortlisted[1], colorShortlisted[2]);
        } else if (text === 'Pending' || text === 'In Review') {
          doc.setTextColor(colorPending[0], colorPending[1], colorPending[2]);
        } else if (text === 'Rejected') {
          doc.setTextColor(colorRejected[0], colorRejected[1], colorRejected[2]);
        }
      }
    },
    foot: [
      [
        'TOTAL',
        `Active Records: ${filtered.length}`,
        '',
        '',
        `Approved: ${approvedApps.length}`,
        formatPeso(totalApprovedDisbursement),
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
  });

  // ----------------------------------------------------
  // SECTION 4: ADMINISTRATIVE SIGNATORIES & VERIFICATION
  // ----------------------------------------------------
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 200;
  let sigY = finalY + 16;

  // Ensure enough room for signatures (requires at least 42mm), otherwise add new page
  if (sigY + 42 > pageHeight - 20) {
    doc.addPage();
    sigY = 30;

    // Header strip on continuation page
    doc.setFillColor(colorNavy[0], colorNavy[1], colorNavy[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');
  }

  // Institutional Verification Notice Box
  doc.setFillColor(colorBgLight[0], colorBgLight[1], colorBgLight[2]);
  doc.roundedRect(marginX, sigY - 7, contentWidth, 11, 1.5, 1.5, 'F');
  doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, sigY - 7, contentWidth, 11, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text(
    'Verification Certification: This official record has been compiled directly from the Meridian University database. All disbursements, currency conversions in Philippine Peso (PHP), and eligibility evaluations comply with institutional guidelines.',
    marginX + 4,
    sigY - 0.5,
    { maxWidth: contentWidth - 8 }
  );

  sigY += 12;

  // Signatory Column 1: Prepared By (Current Administrator from Dashboard)
  const col1X = marginX;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text('Prepared & Verified By (Operations In-Charge):', col1X, sigY);

  // Line
  doc.setDrawColor(colorSlateDark[0], colorSlateDark[1], colorSlateDark[2]);
  doc.setLineWidth(0.4);
  doc.line(col1X, sigY + 14, col1X + 75, sigY + 14);

  // Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.text(preparedByName, col1X, sigY + 18.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text(preparedByTitle, col1X, sigY + 22.5);
  doc.text(preparedByDept, col1X, sigY + 26);

  // Signatory Column 2: Approved By (Faculty Committee Chairperson from Dashboard)
  const col2X = pageWidth - marginX - 75;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text('Approved By (Faculty Committee Chair):', col2X, sigY);

  // Line
  doc.setDrawColor(colorSlateDark[0], colorSlateDark[1], colorSlateDark[2]);
  doc.setLineWidth(0.4);
  doc.line(col2X, sigY + 14, col2X + 75, sigY + 14);

  // Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
  doc.text(approvedByName, col2X, sigY + 18.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text(approvedByTitle, col2X, sigY + 22.5);
  doc.text(approvedByDept, col2X, sigY + 26);

  // ----------------------------------------------------
  // UNIVERSAL FOOTER (All Pages)
  // ----------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(colorBorder[0], colorBorder[1], colorBorder[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
    doc.text(
      'Meridian University Academic System  •  Official Electronic Summary  •  All Figures Quoted in Philippine Peso (PHP)',
      marginX,
      pageHeight - 7.5
    );

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - marginX - doc.getTextWidth(pageStr), pageHeight - 7.5);
  }

  // Generate & Download PDF file
  const fileDate = new Date().toISOString().split('T')[0];
  const filename = `Meridian_University_Official_Report_${fileDate}.pdf`;
  doc.save(filename);
}
