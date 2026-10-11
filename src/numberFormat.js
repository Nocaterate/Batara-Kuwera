// Thousands separators follow the app language: 1,000,000 in English, 1.000.000 in Bahasa Indonesia.
// Hand-rolled (not Intl) so the separator is exactly what we say it is on every browser.

export const groupSeparator = (lang) => (lang === "id" ? "." : ",");
export const decimalSeparator = (lang) => (lang === "id" ? "," : ".");

// Whole number -> "1,000,000". Non-numbers give "".
export function groupDigits(value, lang) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || Math.abs(n) >= 1e21) return "";
  const body = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator(lang));
  return n < 0 ? "-" + body : body;
}

// Currency: "Rp1,000,000", negatives as "-Rp1,000,000" (the minus leads, so it never wraps away from the Rp).
export function formatMoney(value, lang) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const grouped = groupDigits(value, lang);
  if (grouped === "") return "—";
  return grouped.startsWith("-") ? "-Rp" + grouped.slice(1) : "Rp" + grouped;
}

export const makeMoney = (lang) => (value) => formatMoney(value, lang);

const WORDS = {
  en: [[1e12, "trillion"], [1e9, "billion"], [1e6, "million"], [1e3, "thousand"]],
  id: [[1e12, "triliun"], [1e9, "miliar"], [1e6, "juta"], [1e3, "ribu"]],
};

// "1.5 billion" / "1,5 miliar" — a quick sanity check when counting zeros. Empty under 1,000.
export function amountInWords(value, lang) {
  const n = Math.abs(Math.round(Number(value)));
  if (!Number.isFinite(n) || n < 1000) return "";
  const [size, word] = WORDS[lang].find(([s]) => n >= s);
  const q = n / size;
  const rounded = q >= 100 ? Math.round(q) : Math.round(q * 10) / 10;
  const text = String(rounded).replace(".", decimalSeparator(lang));
  const exact = Math.abs(rounded * size - n) < 0.5;
  return `${exact ? "" : "≈ "}${text} ${word}`;
}

const SHORT = {
  en: [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]],
  id: [[1e12, "T"], [1e9, "M"], [1e6, "jt"], [1e3, "rb"]],
};

// Chart axis labels: 1.5B, 250M, 80K in English; 1,5M (miliar), 250jt, 80rb in Indonesian.
export function compactShort(value, lang) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  const hit = SHORT[lang].find(([s]) => abs >= s);
  if (!hit) return groupDigits(n, lang);
  const q = abs / hit[0];
  const rounded = q >= 100 ? Math.round(q) : Math.round(q * 10) / 10;
  return (n < 0 ? "-" : "") + String(rounded).replace(".", decimalSeparator(lang)) + hit[1];
}
