import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export interface StandardPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const StandardPagination: React.FC<StandardPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [6, 12, 24],
  itemLabel = 'scholarships',
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis windowing
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs ${className}`}
    >
      {/* Left side: Showing 1–6 of 7 scholarships | Per page: [6 items ⌄] */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-normal">
        <span>
          Showing <strong className="font-bold text-slate-800">{start}–{end}</strong> of{' '}
          <strong className="font-bold text-indigo-600">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <>
            <span className="text-slate-300 font-light mx-1 select-none">|</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-normal">Per page:</span>
              <div className="relative inline-flex items-center">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    onPageSizeChange(Number(e.target.value));
                    onPageChange(1);
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} items
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600 absolute right-2 pointer-events-none stroke-[2.5]" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right side: < Prev  (1)  2   Next > */}
      <div className="flex items-center space-x-2 select-none">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => hasPrev && onPageChange(currentPage - 1)}
          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
            hasPrev
              ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer'
              : 'border-slate-100 bg-white text-slate-300 cursor-not-allowed font-normal'
          }`}
          title="Previous page"
        >
          <ChevronLeft className={`w-3.5 h-3.5 ${hasPrev ? 'text-slate-600' : 'text-slate-300'}`} />
          <span>Prev</span>
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs">
                ...
              </span>
            );
          }
          const pageNum = Number(p);
          const isActive = pageNum === currentPage;
          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs transition-all cursor-pointer ${
                isActive
                  ? 'rounded-full bg-indigo-600 text-white font-bold shadow-xs'
                  : 'rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => hasNext && onPageChange(currentPage + 1)}
          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
            hasNext
              ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 font-bold cursor-pointer'
              : 'border-slate-100 bg-white text-slate-300 cursor-not-allowed font-normal'
          }`}
          title="Next page"
        >
          <span>Next</span>
          <ChevronRight className={`w-3.5 h-3.5 ${hasNext ? 'text-slate-700' : 'text-slate-300'}`} />
        </button>
      </div>
    </div>
  );
};
