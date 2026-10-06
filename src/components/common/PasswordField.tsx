import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '../../lib/passwordPolicy';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  showChecklist?: boolean;
  autoComplete?: string;
  error?: string | null;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  showChecklist = false,
  autoComplete = 'new-password',
  error,
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          maxLength={64}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:outline-none transition-all ${
            error ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-600 font-semibold mt-1">{error}</p>}
      {showChecklist && (
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1" aria-label="Password requirements">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li key={r.id} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>
                {ok ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-400" />}
                <span>{r.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
