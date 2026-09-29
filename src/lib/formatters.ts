/**
 * Helper utility for consistent date formatting across ScholarFlow.
 */

/**
 * Format any date string (ISO format or YYYY-MM-DD) into a standardized readable format: 'MMM D, YYYY' (e.g., 'Sep 4, 2026').
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  try {
    // If format is YYYY-MM-DD, parse year, month, day to avoid timezone offset shifts
    const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let date: Date;
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      date = new Date(year, month, day);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format datetime string for interview schedules: 'MMM D, YYYY at h:mm A'
 */
export function formatDateTime(dateTimeStr: string | undefined | null): string {
  if (!dateTimeStr) return 'N/A';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateTimeStr;
  }
}
