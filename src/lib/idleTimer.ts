/**
 * AFK auto-logout.
 * Tracks mouse, keyboard, scroll and touch events.  After IDLE_MINUTES of
 * inactivity a one-minute warning is shown; if the user doesn't respond the
 * session is ended.
 */

export const IDLE_MINUTES = 20;
export const WARN_BEFORE_SECONDS = 60;

interface IdleTimerOptions {
  onWarn: (secondsLeft: number) => void;
  onLogout: () => void;
}

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

export function startIdleTimer({ onWarn, onLogout }: IdleTimerOptions): () => void {
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let warnTimer: ReturnType<typeof setInterval> | null = null;
  let secondsLeft = WARN_BEFORE_SECONDS;
  let warned = false;

  const clearTimers = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (warnTimer) clearInterval(warnTimer);
    idleTimer = null;
    warnTimer = null;
  };

  const reset = () => {
    if (warned) return; // don't reset once the warning is showing
    clearTimers();
    idleTimer = setTimeout(startWarning, IDLE_MINUTES * 60 * 1000);
  };

  const startWarning = () => {
    warned = true;
    secondsLeft = WARN_BEFORE_SECONDS;
    onWarn(secondsLeft);
    warnTimer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearTimers();
        onLogout();
      } else {
        onWarn(secondsLeft);
      }
    }, 1000);
  };

  const handleActivity = () => reset();

  EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
  reset(); // start initial timer

  return () => {
    clearTimers();
    EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
  };
}
