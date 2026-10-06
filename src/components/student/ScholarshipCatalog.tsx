import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Calendar, Users, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, AlertCircle, ArrowUpDown, Info, XCircle } from 'lucide-react';
import { Scholarship, Application } from '../../types';
import { checkEligibility, isOpenToAllPrograms } from '../../lib/scholarshipRules';
import { GWA_SCALE_NOTE } from '../../data/universityRegistry';
import { StandardPagination } from '../common/StandardPagination';

export const isDeadlinePassed = (deadlineStr?: string): boolean => {
  if (!deadlineStr) return false;
  const parts = deadlineStr.split('-');
  let deadlineDate: Date;
  if (parts.length === 3) {
    deadlineDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
  } else {
    deadlineDate = new Date(deadlineStr);
    deadlineDate.setHours(23, 59, 59, 999);
  }
  return !isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now();
};

export const daysUntil = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const end = new Date(y, m - 1, d, 23, 59, 59);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
};

export const formatLongDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface StudentContext {
  student_number: string;
  program: string;
  year_level: string;
  gwa?: number;
}

interface ScholarshipCatalogProps {
  scholarships: Scholarship[];
  applications?: Application[];
  student: StudentContext;
  onApply: (scholarship: Scholarship) => void;
  onTrack?: (referenceCode: string) => void;
}

export const ScholarshipCatalog: React.FC<ScholarshipCatalogProps> = ({ scholarships, applications = [], student, onApply, onTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [closingBy, setClosingBy] = useState('');
  const [dateInputKey, setDateInputKey] = useState(0); // remounting the date input clears half-typed dates too
  const [showClosed, setShowClosed] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showDateHelp, setShowDateHelp] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Only scholarships open to the student's own degree program are listed
  const forMyProgram = useMemo(
    () => scholarships.filter((s) => s.is_active !== false && (isOpenToAllPrograms(s) || s.eligible_programs!.includes(student.program))),
    [scholarships, student.program]
  );
  const hiddenCount = scholarships.length - forMyProgram.length;

  const categories = useMemo(() => ['All', ...Array.from(new Set(forMyProgram.map((s) => s.category)))], [forMyProgram]);

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCategory !== 'All' || closingBy || showClosed);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setClosingBy('');
    setDateInputKey((k) => k + 1);
    setShowClosed(false);
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return forMyProgram
      .filter((s) => {
        const matchesSearch =
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q);
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        const matchesDate = !closingBy || s.deadline <= closingBy;
        const matchesOpen = showClosed || !isDeadlinePassed(s.deadline);
        return matchesSearch && matchesCategory && matchesDate && matchesOpen;
      })
      .sort((a, b) => (sortOrder === 'asc' ? a.deadline.localeCompare(b.deadline) : b.deadline.localeCompare(a.deadline)));
  }, [forMyProgram, searchQuery, selectedCategory, closingBy, showClosed, sortOrder]);

  useEffect(() => setCurrentPage(1), [searchQuery, selectedCategory, closingBy, showClosed]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const myApps = applications.filter((a) => a.student_number === student.student_number);

  return (
    <div id="scholarship-catalog-top" className="space-y-6">
      {/* Who the list is for */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="space-y-0.5">
          <p>
            Showing scholarships open to <strong>{student.program}</strong> students.
            {hiddenCount > 0 && <span className="text-indigo-800"> {hiddenCount} other scholarship{hiddenCount === 1 ? ' is' : 's are'} limited to other programs and not shown.</span>}
          </p>
          {typeof student.gwa === 'number' && (
            <p className="text-indigo-800">
              Your GWA on record with the Registrar: <strong>{student.gwa.toFixed(2)}</strong>
            </p>
          )}
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-indigo-800 md:max-w-sm">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{GWA_SCALE_NOTE}</span>
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="Search scholarships for your program"
              placeholder="Search scholarships for your program"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <label htmlFor="closing-by" className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Closing on or before</label>
              <input
                key={dateInputKey}
                id="closing-by"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={closingBy}
                onChange={(e) => setClosingBy(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none text-slate-800 font-medium cursor-pointer"
              />
              <button
                type="button"
                aria-label="What does this filter do?"
                aria-expanded={showDateHelp}
                onClick={() => setShowDateHelp((v) => !v)}
                className="text-slate-400 hover:text-indigo-600 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showDateHelp && (
                <div role="tooltip" className="absolute z-20 top-full right-0 mt-2 w-64 bg-slate-900 text-white text-[11px] leading-relaxed p-3 rounded-xl shadow-lg">
                  Shows only scholarships whose application deadline is on or before the date you pick — useful for finding the ones you need to finish first. Leave it empty to see every open scholarship.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer border border-slate-200"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>{sortOrder === 'asc' ? 'Closing soonest first' : 'Closing latest first'}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 px-2 cursor-pointer">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
              Include closed
            </label>

            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-[10px] text-slate-400 font-semibold">
            Filter by <span className="font-bold text-slate-600">scholarship type</span> — what the award is <em>based on</em> (grades, financial need, sport, leadership, etc.), separate from your degree program. Your program is already filtered above.
          </p>
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat && cat !== 'All' ? 'All' : cat)}
                aria-pressed={selectedCategory === cat}
                className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No scholarships match these filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Clear the date or category filter, or include closed scholarships.</p>
          {hasActiveFilters && (
            <button type="button" onClick={handleReset} className="mt-2 text-xs font-bold px-4 py-2 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl cursor-pointer">
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paged.map((s) => {
            const existing = myApps.find((a) => a.scholarship_id === s.id && !['Rejected', 'Removed', 'Expired'].includes(a.status));
            const isClosed = isDeadlinePassed(s.deadline);
            const left = daysUntil(s.deadline);
            const elig = checkEligibility(s, student, applications);
            const meetsGwa = typeof student.gwa !== 'number' || student.gwa <= s.min_gwa;
            const canApply = !existing && !isClosed && !s.is_frozen && elig.eligible;

            return (
              <article
                key={s.id}
                className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xs ${
                  existing ? 'border-indigo-300' : s.is_frozen ? 'border-amber-300' : isClosed ? 'border-slate-200 opacity-80' : 'border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all'
                }`}
              >
                <div className="p-6 pb-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">{s.category}</span>
                    {s.is_frozen ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500 text-white flex items-center gap-1"><ShieldAlert className="w-3 h-3" />Paused</span>
                    ) : isClosed ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-600 text-white">Closed</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {elig.programQuota !== null ? `${elig.programSlotsLeft} of ${elig.programQuota} slots for your program` : `${s.slots_remaining} of ${s.slots} slots left`}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 block">{s.code}</span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug mt-0.5">{s.title}</h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{s.description}</p>

                  {s.is_frozen && s.freeze_note && (
                    <div className="bg-amber-100/80 text-amber-900 p-2.5 rounded-xl border border-amber-300 text-[11px]">{s.freeze_note}</div>
                  )}

                  <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <dt className="text-[10px] font-semibold text-slate-500 block">GWA required</dt>
                      <dd className="font-bold text-slate-800">{s.min_gwa.toFixed(2)} or better</dd>
                      <dd className="text-[10px] text-slate-500">1.00 highest · 3.00 lowest passing</dd>
                      {typeof student.gwa === 'number' && (
                        <dd className={`text-[10px] font-bold mt-0.5 flex items-center gap-1 ${meetsGwa ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {meetsGwa ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          Yours: {student.gwa.toFixed(2)}
                        </dd>
                      )}
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <dt className="text-[10px] font-semibold text-slate-500 block">Family income limit</dt>
                      <dd className="font-bold text-slate-800">{s.max_family_income > 0 ? `₱${s.max_family_income.toLocaleString()} / yr` : 'No limit'}</dd>
                      <dd className="text-[10px] text-slate-500">Gross, all earning members</dd>
                    </div>
                  </dl>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-500">Grant per semester</p>
                    <p className="text-sm font-bold text-slate-900">₱{s.grant_amount.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500">{s.grant_type}</p>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p><span className="font-semibold text-slate-500">Open to:</span> {isOpenToAllPrograms(s) ? 'All degree programs' : s.eligible_programs!.join(', ')}</p>
                    {s.eligible_year_levels && s.eligible_year_levels.length > 0 && (
                      <p><span className="font-semibold text-slate-500">Year levels:</span> {s.eligible_year_levels.join(', ')}</p>
                    )}
                    <p><span className="font-semibold text-slate-500">Renewable:</span> {s.is_renewable ? 'Yes, every semester' : 'No, one semester only'}</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 block">Documents to upload</span>
                    {s.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 pt-0.5">Plus proof of income for each earning family member.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-2.5">
                  <p className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Apply by <strong className={isClosed ? 'text-rose-600' : 'text-slate-900'}>{formatLongDate(s.deadline)}</strong>
                      {!isClosed && <span className={left <= 7 ? 'text-amber-700 font-bold' : 'text-slate-500'}> ({left} day{left === 1 ? '' : 's'} left)</span>}
                    </span>
                  </p>

                  {existing ? (
                    <div className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs">
                      <span className="text-indigo-900">You applied · <strong>{existing.status}</strong></span>
                      {onTrack && (
                        <button type="button" onClick={() => onTrack(existing.reference_code)} className="font-bold text-indigo-700 hover:underline cursor-pointer">View</button>
                      )}
                    </div>
                  ) : !isClosed && !s.is_frozen && !elig.eligible ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-[11px] font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{elig.reasons[0]}</span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!canApply}
                    onClick={() => onApply(s)}
                    className="w-full text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-indigo-600 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>{existing ? 'Already applied' : isClosed ? 'Applications closed' : s.is_frozen ? 'Paused' : !elig.eligible ? 'Not eligible' : 'Start application'}</span>
                    {canApply && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <StandardPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          pageSizeOptions={[6, 9, 12]}
          itemLabel="scholarships"
          onPageChange={setCurrentPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
};
