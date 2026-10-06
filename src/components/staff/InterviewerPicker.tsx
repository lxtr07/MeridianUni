import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Props {
  id?: string;
  value: string;
  names: string[];
  /** Names that are already booked at the chosen date and time. */
  busy?: string[];
  onChange: (name: string) => void;
}

/** Interviewer dropdown: pick from the list (with availability) or type a name. */
export const InterviewerPicker: React.FC<Props> = ({ id, value, names, busy = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setTyping(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const q = typing ? value.trim().toLowerCase() : '';
  const shown = names.filter((n) => !q || n.toLowerCase().includes(q));
  const pick = (n: string) => { onChange(n); setOpen(false); setTyping(false); };

  return (
    <div ref={box} className="relative">
      <input
        id={id}
        value={value}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setTyping(true); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setTyping(false); } }}
        placeholder="Choose an interviewer or type a name"
        className="w-full p-2 pr-8 border border-slate-300 rounded-lg bg-white"
      />
      <button type="button" tabIndex={-1} aria-label="Show interviewers" onClick={() => setOpen((o) => !o)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-[11px] text-slate-500">{names.length === 0 ? 'No interviewers on file. Type a name.' : 'No match. The typed name will be used.'}</li>
          ) : shown.map((n) => {
            const isBusy = busy.includes(n);
            const selected = n === value;
            return (
              <li key={n}>
                <button type="button" role="option" aria-selected={selected} onClick={() => pick(n)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 cursor-pointer">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {n.replace(/^(Engr|Prof|Dr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-slate-800 truncate">{n}</span>
                    <span className={`block text-[10px] font-medium ${isBusy ? 'text-rose-600' : 'text-slate-400'}`}>
                      {isBusy ? 'Booked at this time' : 'Interviewer'}
                    </span>
                  </span>
                  {selected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
