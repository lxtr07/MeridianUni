import { UserProfile } from '../types';

// Local State Store Keys
const KEYS = {
  ACTIVE_USER: 'scholarflow_active_user_v2',
  SESSION_TOKEN: 'scholarflow_session_token_v1',
  DISPLACED_NOTICE: 'scholarflow_displaced_notice_v1',
};

/**
 * Retrieve the currently logged-in user from sessionStorage.
 * Sessions are strictly scoped to the active browser tab.
 * Closing the tab automatically logs the user out.
 * Returns null if no user is stored or if parsing fails.
 */
export function getStoredActiveUser(): UserProfile | null {
  const data = sessionStorage.getItem(KEYS.ACTIVE_USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Persist the active user to sessionStorage for session continuity across refreshes (F5).
 * Pass null to clear the stored session (logout).
 */
export function saveStoredActiveUser(user: UserProfile | null): void {
  // Clear any legacy localStorage values
  localStorage.removeItem(KEYS.ACTIVE_USER);
  if (user) {
    sessionStorage.setItem(KEYS.ACTIVE_USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(KEYS.ACTIVE_USER);
  }
}

/**
 * Retrieve the active session token stored locally in sessionStorage.
 */
export function getStoredSessionToken(): string | null {
  return sessionStorage.getItem(KEYS.SESSION_TOKEN);
}

/**
 * Save or clear the active session token in sessionStorage.
 */
export function saveStoredSessionToken(token: string | null): void {
  localStorage.removeItem(KEYS.SESSION_TOKEN);
  if (token) {
    sessionStorage.setItem(KEYS.SESSION_TOKEN, token);
  } else {
    sessionStorage.removeItem(KEYS.SESSION_TOKEN);
  }
}

/**
 * Flag to indicate the user was logged out because another device logged in.
 */
export function setDisplacedSessionNotice(message: string | null): void {
  if (message) {
    sessionStorage.setItem(KEYS.DISPLACED_NOTICE, message);
  } else {
    sessionStorage.removeItem(KEYS.DISPLACED_NOTICE);
  }
}

export function getDisplacedSessionNotice(): string | null {
  return sessionStorage.getItem(KEYS.DISPLACED_NOTICE);
}

