/* Pure helpers for the demo checkout: billing dates, card input and QRIS-style payloads. */

// One month/year later, clamping to month end (31 Jan + 1 month -> 28/29 Feb).
export function addPeriod(timestamp, cycle) {
  const d = new Date(timestamp);
  const day = d.getDate();
  if (cycle === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== day) d.setDate(0);
  return d.getTime();
}

export const makeReference = () =>
  "BK-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

/* ---- Cards ---- */

export function detectBrand(digits) {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^35/.test(digits)) return "jcb";
  return "card";
}

export const BRAND_LABEL = { visa: "VISA", mastercard: "MASTERCARD", amex: "AMEX", jcb: "JCB", card: "" };

export const cardDigits = (value) => value.replace(/\D/g, "");

export function formatCardNumber(digits) {
  if (detectBrand(digits) === "amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
  }
  return (digits.match(/.{1,4}/g) || []).join(" ");
}

export function formatExpiry(raw) {
  let digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && digits > "1") digits = "0" + digits;
  return digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
}

// Completeness checks only (no Luhn), since this checkout is a demo.
export function validateCard({ name, number, expiry, cvc }) {
  const errors = {};
  const digits = cardDigits(number);
  const amex = detectBrand(digits) === "amex";
  if (name.trim().length < 2) errors.name = "Enter the name shown on the card";
  if (amex ? digits.length !== 15 : digits.length < 13 || digits.length > 19) errors.number = "Enter a valid card number";

  const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
  const now = new Date();
  const monthsNow = (now.getFullYear() % 100) * 12 + now.getMonth() + 1;
  const monthsCard = m ? Number(m[2]) * 12 + Number(m[1]) : -1;
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || monthsCard < monthsNow) errors.expiry = "Enter a valid expiry date";

  if (cvc.length !== (amex ? 4 : 3)) errors.cvc = "Enter the security code";
  return errors;
}

/* ---- QRIS-style payload (EMV QR format with a CRC16 checksum) ---- */

const tlv = (id, value) => id + String(value.length).padStart(2, "0") + value;

function crc16(text) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildQrisPayload({ amount, reference }) {
  const body =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("26", tlv("00", "ID.CO.QRIS.WWW") + tlv("01", "ID2026BATARAKUWERA") + tlv("02", "BATARAKUWERA") + tlv("03", "UMI")) +
    tlv("52", "5999") +
    tlv("53", "360") +
    tlv("54", String(Math.round(amount))) +
    tlv("58", "ID") +
    tlv("59", "BATARA KUWERA") +
    tlv("60", "JAKARTA") +
    tlv("62", tlv("05", reference)) +
    "6304";
  return body + crc16(body);
}
