/**
 * Interview scheduling helpers: fixed hourly slots, and who is free at what time.
 * An interviewer can only hold one interview per slot, so the form shows only free times.
 */
import { InterviewSchedule } from '../types';

/** Hourly interview slots (24h "HH:mm"), with 12:00 kept free as lunch. */
export const INTERVIEW_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

export const slotLabel = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/** Local ISO-like key "YYYY-MM-DDTHH:mm" for a date string (YYYY-MM-DD) and slot. */
export const slotKey = (date: string, hhmm: string): string => `${date}T${hhmm}`;

/** Start time of an interview as a slot key, from the structured field or the old display text. */
export function interviewKey(i: InterviewSchedule): string | null {
  const raw = i.start_iso || '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16);
  const d = new Date(i.date_time);
  if (isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** True when this interviewer already has another scheduled interview at that slot. */
export function isInterviewerBusy(
  interviews: InterviewSchedule[],
  interviewer: string,
  key: string,
  ignoreApplicationId?: string
): boolean {
  if (!interviewer.trim()) return false;
  return interviews.some(
    (i) =>
      i.status === 'Scheduled' &&
      i.application_id !== ignoreApplicationId &&
      same(i.interviewer || '', interviewer) &&
      interviewKey(i) === key
  );
}

/** Names from `all` that are free at the slot. */
export function freeInterviewers(
  interviews: InterviewSchedule[],
  all: string[],
  key: string,
  ignoreApplicationId?: string
): string[] {
  return all.filter((n) => !isInterviewerBusy(interviews, n, key, ignoreApplicationId));
}

/** True for Monday–Friday. */
export const isWeekday = (date: string): boolean => {
  const d = new Date(date + 'T00:00:00');
  const w = d.getDay();
  return w >= 1 && w <= 5;
};
