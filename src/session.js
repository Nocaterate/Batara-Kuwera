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
// Returns whether the write actually happened — private browsing, blocked storage, disabled
// cookies, or a full quota can make setItem throw (caught here) or silently no-op (not an
// exception at all), so callers that must not lie about success should check this.
export const writeJSON = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

// A one-off, cheap probe for whether localStorage genuinely persists in this browser right now.
export function isStorageWorking() {
  const probeKey = "batara-kuwera.__probe__";
  try {
    window.localStorage.setItem(probeKey, "1");
    const ok = window.localStorage.getItem(probeKey) === "1";
    window.localStorage.removeItem(probeKey);
    return ok;
  } catch {
    return false;
  }
}
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
