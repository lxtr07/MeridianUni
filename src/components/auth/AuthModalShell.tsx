import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalShellProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

/** Common frame for the sign-in related dialogs so they look and behave the same. */
export const AuthModalShell: React.FC<AuthModalShellProps> = ({ title, subtitle, icon, onClose, children, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-slate-200 my-4 max-h-[94vh] flex flex-col overflow-hidden`}>
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">{icon}</div>
            <div>
              <h2 className="text-base font-bold">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
};

export const FormError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 text-xs font-medium flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  ) : null;

export const FormSuccess: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-medium flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  ) : null;

export const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all';

export const primaryButton =
  'w-full py-3 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer';

export const maskMobile = (m: string) => (m ? `${m.slice(0, 4)} ••• ${m.slice(-4)}` : '—');
