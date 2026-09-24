import { readJSON, writeJSON } from "./session.js";
import { sha256, pbkdf2Sha256 } from "./sha256.js";

// Browser-only accounts: there is no server, so this gates the UI but is not real security.
const USERS_KEY = "batara-kuwera.users";
const HASH_ITERATIONS = 8000;
// Records without a `v` were hashed with PBKDF2 (100k iterations) by the first version of this file.
const HASH_VERSION = 2;
const LEGACY_PBKDF2_ITERATIONS = 100000;

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "One symbol (e.g. ! @ # $)", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

const normalize = (email) => String(email).trim().toLowerCase();
const loadUsers = () => readJSON(USERS_KEY) || {};

const toHex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
const concatBytes = (a, b) => { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; };

// Plain-JS SHA-256, iterated many times — no dependency on crypto.subtle, which is only
// available in a "secure context" (https, or exactly localhost). Without this, opening the
// app over plain http on any other host — e.g. a phone hitting the dev machine's LAN IP —
// would make every register/login attempt throw and show a generic error.
function hashPassword(password, saltHex) {
  const passwordBytes = new TextEncoder().encode(password);
  let digest = sha256(concatBytes(fromHex(saltHex), passwordBytes));
  for (let i = 0; i < HASH_ITERATIONS; i++) digest = sha256(concatBytes(digest, passwordBytes));
  return toHex(digest);
}

// Verifies a password against an account made before HASH_VERSION 2. Uses SubtleCrypto when the
// browser offers it (fast), otherwise the plain-JS PBKDF2 (a few seconds, but works anywhere).
async function legacyHash(password, saltHex) {
  const passwordBytes = new TextEncoder().encode(password);
  const salt = fromHex(saltHex);
  if (globalThis.crypto?.subtle) {
    const key = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: LEGACY_PBKDF2_ITERATIONS }, key, 256);
    return toHex(new Uint8Array(bits));
  }
  return toHex(pbkdf2Sha256(passwordBytes, salt, LEGACY_PBKDF2_ITERATIONS));
}

export const userExists = (email) => !!loadUsers()[normalize(email)];

export async function registerUser({ fullName, email, password }) {
  const id = normalize(email);
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = hashPassword(password, salt);
  const users = loadUsers();
  if (users[id]) return { ok: false, error: "EXISTS" };
  users[id] = { email: id, fullName, salt, hash, v: HASH_VERSION, createdAt: Date.now() };
  writeJSON(USERS_KEY, users);
  return { ok: true, email: id };
}

export async function verifyLogin(email, password) {
  const id = normalize(email);
  const record = loadUsers()[id];
  if (!record) return { ok: false, error: "NO_ACCOUNT" };

  if (record.v === HASH_VERSION) {
    if (hashPassword(password, record.salt) !== record.hash) return { ok: false, error: "WRONG_PASSWORD" };
  } else {
    if ((await legacyHash(password, record.salt)) !== record.hash) return { ok: false, error: "WRONG_PASSWORD" };
    // Correct password on an old-format account: upgrade it in place, keeping the saved profile and plan.
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const users = loadUsers();
    if (users[id]) {
      users[id] = { ...users[id], salt, hash: hashPassword(password, salt), v: HASH_VERSION };
      writeJSON(USERS_KEY, users);
    }
  }
  return { ok: true, email: id, fullName: record.fullName };
}

export const loadAccount = (email) => loadUsers()[normalize(email)]?.data ?? null;

export function saveAccount(email, data) {
  const users = loadUsers();
  const id = normalize(email);
  if (!users[id]) return;
  users[id].data = data;
  writeJSON(USERS_KEY, users);
}

export function deleteUser(email) {
  const users = loadUsers();
  delete users[normalize(email)];
  writeJSON(USERS_KEY, users);
}
