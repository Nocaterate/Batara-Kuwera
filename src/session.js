const SESSION_KEY = "batara-kuwera.session";
const PREFS_KEY = "batara-kuwera.prefs";

export const SESSION_TTL_MS = 48 * 60 * 60 * 1000;
export const REMEMBER_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const readJSON = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const writeJSON = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};
const remove = (key) => {
  try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
};

export function readSession() {
  const s = readJSON(SESSION_KEY);
  if (!s) return null;
  if (typeof s.expiresAt !== "number" || s.expiresAt <= Date.now()) {
    remove(SESSION_KEY);
    return null;
  }
  return s;
}

export function startSession(email, remember) {
  const now = Date.now();
  const session = { email, remember: !!remember, createdAt: now, expiresAt: now + (remember ? REMEMBER_TTL_MS : SESSION_TTL_MS) };
  writeJSON(SESSION_KEY, session);
  return session;
}

export const endSession = () => remove(SESSION_KEY);

export const loadPrefs = () => readJSON(PREFS_KEY) || {};
export const savePrefs = (prefs) => writeJSON(PREFS_KEY, prefs);
