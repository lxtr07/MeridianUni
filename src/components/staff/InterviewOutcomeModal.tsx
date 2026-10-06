import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle2, AlertCircle, ClipboardCheck, ThumbsUp, ThumbsDown } from 'lucide-react';
import { InterviewSchedule, InterviewOutcome } from '../../types';
import { sectionsFor, allQuestions } from '../../lib/interviewQuestions';

interface Props {
  interview: InterviewSchedule;
  /** Scholarship type, to pick the right prepared questions. */
  category?: string;
  /** Name recorded as the person who completed the interview. */
  interviewerName: string;
  /** Read-only view of a finished interview. */
  readOnly?: boolean;
  onSave?: (updated: InterviewSchedule) => void | Promise<void>;
  onClose: () => void;
}

/** Interview form: prepared questions with the applicant's answers, the Interviewer's assessment, and "Interview done". */
export const InterviewOutcomeModal: React.FC<Props> = ({ interview, category, interviewerName, readOnly = false, onSave, onClose }) => {
  const sections = useMemo(() => sectionsFor(category, interview.scholarship_title), [category, interview.scholarship_title]);
  const questions = useMemo(() => allQuestions(sections), [sections]);
  const done = interview.outcome;
  // Answers are kept by question text, so a finished interview always shows what was actually asked.
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries((done?.answers || []).map((a) => [a.question, a.answer])),
  );
  const [recommendation, setRecommendation] = useState<InterviewOutcome['recommendation'] | ''>(done?.recommendation || '');
  const [summary, setSummary] = useState(done?.summary || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const answered = questions.filter((q) => (answers[q.text] || '').trim().length > 0).length;
  const legacy = readOnly && done && !done.answers?.length;

  const submit = async () => {
    if (answered < questions.length) return setError(`Record the applicant's answer to every question (${answered} of ${questions.length} done). A short summary is enough.`);
    if (!recommendation) return setError('Choose Endorse for approval or Do not endorse.');
    if (summary.trim().length < 10) return setError('Write your overall assessment of the applicant (at least 10 characters).');
    setError(null);
    setSaving(true);
    try {
      await onSave?.({
        ...interview,
        status: 'Completed',
        outcome: {
          answers: questions.map((q) => ({ question: q.text, answer: (answers[q.text] || '').trim() })),
          recommendation,
          summary: summary.trim(),
          completed_by: interviewerName,
          completed_at: new Date().toISOString(),
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'The interview result could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Interview form">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0"><ClipboardCheck className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold">{readOnly ? 'Interview result' : 'Interview form'}</h3>
              <p className="text-xs text-slate-300">{interview.student_name}</p>
              <p className="text-xs text-indigo-200">{interview.scholarship_title} · {interview.date_time}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {!readOnly && <p className="text-slate-600">Ask each prepared question and write down the applicant's answer, or a short summary of it. Then give your assessment and decide whether to endorse the applicant.</p>}

          {legacy ? (
            <p className="text-slate-500 italic">This interview was recorded with an older form, so only the overall result is available.</p>
          ) : (
            sections.map((sec, idx) => (
              <section key={sec.key} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-900">{idx + 1}. {sec.label}</h4>
                {sec.questions.map((q) => {
                  const done_ = (answers[q.text] || '').trim().length > 0;
                  return (
                    <div key={q.key}>
                      <label htmlFor={`io-${q.key}`} className="block font-semibold text-slate-800 mb-1">{q.text}</label>
                      <textarea
                        id={`io-${q.key}`}
                        rows={2}
                        readOnly={readOnly}
                        value={answers[q.text] || ''}
                        maxLength={500}
                        placeholder="Applicant's answer or summary"
                        onChange={(e) => { setAnswers((a) => ({ ...a, [q.text]: e.target.value })); setError(null); }}
                        className={`w-full p-2.5 bg-white border rounded-xl ${!readOnly && done_ ? 'border-emerald-300' : 'border-slate-300'}`}
                      />
                    </div>
                  );
                })}
              </section>
            ))
          )}

          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Your assessment</h4>
              {!readOnly && <span className="text-[11px] font-semibold text-slate-500">{answered} of {questions.length} questions answered</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={readOnly} aria-pressed={recommendation === 'recommend'} onClick={() => { setRecommendation('recommend'); setError(null); }}
                className={`px-4 py-2 rounded-xl border font-bold inline-flex items-center gap-1.5 ${recommendation === 'recommend' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-700'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:border-emerald-400'}`}>
                <ThumbsUp className="w-4 h-4" />Endorse for approval
              </button>
              <button type="button" disabled={readOnly} aria-pressed={recommendation === 'do_not_recommend'} onClick={() => { setRecommendation('do_not_recommend'); setError(null); }}
                className={`px-4 py-2 rounded-xl border font-bold inline-flex items-center gap-1.5 ${recommendation === 'do_not_recommend' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-300 text-slate-700'} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:border-rose-400'}`}>
                <ThumbsDown className="w-4 h-4" />Do not endorse (reject)
              </button>
            </div>
            {!readOnly && <p className="text-[11px] text-slate-500">Endorsing sends the application to the Scholarship Coordinator for the final decision. Not endorsing rejects the application. This cannot be undone.</p>}
            <div>
              <label htmlFor="io-summary" className="block font-bold text-slate-700 mb-1">Overall assessment of the applicant</label>
              <textarea id="io-summary" rows={3} readOnly={readOnly} value={summary} maxLength={600} onChange={(e) => setSummary(e.target.value)} className="w-full p-2.5 bg-white border border-slate-300 rounded-xl" />
            </div>
            {readOnly && done && <p className="text-[11px] text-slate-500">Recorded by {done.completed_by} on {new Date(done.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}.</p>}
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
          {error && (
            <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">{readOnly ? 'Close' : 'Cancel'}</button>
            {!readOnly && (
              <button type="button" onClick={submit} disabled={saving} className="px-5 py-2 text-white font-bold text-xs rounded-xl bg-slate-900 hover:bg-indigo-600 inline-flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed">
                <CheckCircle2 className="w-4 h-4" />{saving ? 'Saving…' : 'Interview done'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
