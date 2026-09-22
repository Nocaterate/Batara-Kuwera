// Builds the downloadable "financial snapshot" PDF shown in Settings > Data.
// Kept independent of the main app file — every string is passed in — so it can be tested alone.
import { jsPDF } from "jspdf";

const PAGE_W = 210; // A4, mm
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLOR = {
  brand: [220, 38, 38],        // red-600
  brandDark: [153, 27, 27],    // red-800
  ink: [24, 24, 27],           // zinc-900
  subink: [82, 82, 91],        // zinc-600
  muted: [141, 141, 149],      // zinc-450ish, readable at small sizes on white
  border: [228, 228, 231],     // zinc-200
  panel: [250, 250, 250],      // zinc-50
  white: [255, 255, 255],
  good: [5, 150, 105],         // emerald-600
  warn: [180, 83, 9],          // amber-700
  bad: [185, 28, 28],          // red-700
};

const TONE_COLOR = { good: COLOR.good, warn: COLOR.warn, bad: COLOR.bad, default: COLOR.ink };
const STATUS_TONE = { CRITICAL: "bad", MEDIUM: "warn", OPTIMAL: "good" };

const ALLOCATION_COLORS = {
  essentials: [220, 38, 38],
  discretionary: [251, 146, 60],
  debt: [245, 158, 11],
  savings: [16, 185, 129],
};

function setColor(doc, method, rgb) { doc[method](...rgb); }

function drawStatCard(doc, x, y, w, h, { label, value, tone = "default", sub }) {
  doc.setDrawColor(...COLOR.border);
  doc.setFillColor(...COLOR.panel);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, "setTextColor", COLOR.subink);
  doc.text(label, x + 4, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setColor(doc, "setTextColor", TONE_COLOR[tone]);
  doc.text(value, x + 4, y + 16);

  if (sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor(doc, "setTextColor", COLOR.muted);
    doc.text(sub, x + 4, y + h - 3.5);
  }
}

function sectionTitle(doc, y, text) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, "setTextColor", COLOR.ink);
  doc.text(text, MARGIN, y);
  return y + 5;
}

/**
 * @param {object} p
 * @param {{fullName:string,email:string}} p.user
 * @param {object} p.profile
 * @param {object} p.metrics - computeMetrics(profile) result
 * @param {object} p.fireData - computeFireProjection(profile, metrics) result
 * @param {"en"|"id"} p.lang
 * @param {(key:string, vars?:object) => string} p.t - translator (already resolves to the current language)
 * @param {(value:number, digits?:number) => string} p.fmt - locale-aware number formatter (no currency symbol)
 * @param {(value:number) => string} p.formatCurrency - e.g. "Rp1.500.000"
 * @param {string} p.logoSrc - data: URL of the app logo (PNG)
 */
export function generateFinancialReportPdf({ user, profile, metrics, fireData, lang, t, fmt, formatCurrency, logoSrc }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const locale = lang === "id" ? "id-ID" : "en-US";
  const today = new Date();
  const dateStr = today.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const displayName = profile.fullName || user.fullName || t("Guest");

  // ---- Header band ----
  doc.setFillColor(...COLOR.brand);
  doc.rect(0, 0, PAGE_W, 30, "F");
  if (logoSrc) {
    try { doc.addImage(logoSrc, "PNG", MARGIN, 6, 18, 18, undefined, "FAST"); } catch { /* ignore a bad/undecodable logo */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setColor(doc, "setTextColor", COLOR.white);
  doc.text("BATARA KUWERA", logoSrc ? MARGIN + 22 : MARGIN, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(t("Personal Financial Snapshot"), logoSrc ? MARGIN + 22 : MARGIN, 21.5);
  doc.setFontSize(8.5);
  doc.text(dateStr, PAGE_W - MARGIN, 15, { align: "right" });
  doc.text(displayName, PAGE_W - MARGIN, 21.5, { align: "right" });

  let y = 40;

  // ---- Health status ----
  const tone = STATUS_TONE[metrics.healthStatus] ?? "default";
  const statusLabel = t(metrics.healthStatus);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const badgeW = doc.getTextWidth(statusLabel) + 10;
  doc.setDrawColor(...TONE_COLOR[tone]);
  setColor(doc, "setFillColor", TONE_COLOR[tone]);
  doc.roundedRect(MARGIN, y - 5, badgeW, 7, 3.5, 3.5, "F");
  setColor(doc, "setTextColor", COLOR.white);
  doc.text(statusLabel, MARGIN + badgeW / 2, y - 0.6, { align: "center" });

  y += 6;
  const diagnosis = t(DIAGNOSIS_TEXT[metrics.healthStatus]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(doc, "setTextColor", COLOR.subink);
  const diagnosisLines = doc.splitTextToSize(diagnosis, CONTENT_W);
  doc.text(diagnosisLines, MARGIN, y + 4);
  y += 4 + diagnosisLines.length * 4.6 + 6;

  // ---- Headline stat cards ----
  y = sectionTitle(doc, y, t("Key metrics"));
  const cardW = (CONTENT_W - 9) / 4;
  const cardH = 22;
  const cards = [
    { label: t("Net worth"), value: formatCurrency(metrics.netWorth), tone: metrics.netWorth >= 0 ? "good" : "bad" },
    { label: t("Savings rate"), value: `${fmt(metrics.savingsRate)}%`, tone: metrics.savingsRate > 30 ? "good" : metrics.savingsRate < 10 ? "bad" : "warn" },
    { label: t("Debt-to-income"), value: `${fmt(metrics.dti)}%`, tone: metrics.dti < 20 ? "good" : metrics.dti > 40 ? "bad" : "warn" },
    {
      label: t("Emergency fund"), value: `${fmt(metrics.emergencyFundRatio)} ${t("mo")}`,
      tone: metrics.emergencyFundRatio > 6 ? "good" : metrics.emergencyFundRatio < 3 ? "bad" : "warn",
      sub: t("Months of expenses covered"),
    },
  ];
  cards.forEach((c, i) => drawStatCard(doc, MARGIN + i * (cardW + 3), y, cardW, cardH, c));
  y += cardH + 10;

  // ---- Income vs expenses (compact table) ----
  y = sectionTitle(doc, y, t("Monthly cash flow"));
  const flowRows = [
    [t("Income"), formatCurrency(metrics.monthlyIncome)],
    [t("Expenses"), formatCurrency(metrics.monthlyExpenses)],
    [t("Savings"), formatCurrency(Math.max(metrics.monthlyIncome - metrics.monthlyExpenses, 0))],
  ];
  const flowColW = CONTENT_W / 3;
  flowRows.forEach(([label, value], i) => {
    const x = MARGIN + i * flowColW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(doc, "setTextColor", COLOR.subink);
    doc.text(label, x, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setColor(doc, "setTextColor", COLOR.ink);
    doc.text(value, x, y + 10.5);
  });
  y += 16;

  // ---- Income allocation (stacked bar) ----
  y = sectionTitle(doc, y, t("Income allocation"));
  const allocation = [
    { key: "essentials", label: t("Essentials"), value: profile.essentialExpenses },
    { key: "discretionary", label: t("Discretionary"), value: profile.discretionaryExpenses },
    { key: "debt", label: t("Debt repayment"), value: profile.monthlyDebtRepayment },
    { key: "savings", label: t("Savings"), value: Math.max(metrics.monthlyIncome - metrics.monthlyExpenses, 0) },
  ].filter((a) => a.value > 0);
  const allocTotal = allocation.reduce((sum, a) => sum + a.value, 0);

  if (allocTotal > 0) {
    const barH = 7;
    let bx = MARGIN;
    allocation.forEach((a) => {
      const w = (a.value / allocTotal) * CONTENT_W;
      setColor(doc, "setFillColor", ALLOCATION_COLORS[a.key]);
      doc.rect(bx, y, Math.max(w, 0.01), barH, "F");
      bx += w;
    });
    y += barH + 5;

    const legendColW = CONTENT_W / 2;
    allocation.forEach((a, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = MARGIN + col * legendColW;
      const ly = y + row * 6;
      setColor(doc, "setFillColor", ALLOCATION_COLORS[a.key]);
      doc.circle(x + 1.5, ly - 1.2, 1.5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setColor(doc, "setTextColor", COLOR.subink);
      const pct = ((a.value / allocTotal) * 100).toFixed(1);
      doc.text(`${a.label} — ${pct}% (${formatCurrency(a.value)})`, x + 5, ly);
    });
    y += Math.ceil(allocation.length / 2) * 6 + 8;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, "setTextColor", COLOR.muted);
    doc.text(t("Add income and expense figures in your profile to see this chart."), MARGIN, y + 4);
    y += 12;
  }

  // ---- FIRE / financial freedom ----
  y = sectionTitle(doc, y, t("Financial freedom trajectory"));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(doc, "setTextColor", COLOR.subink);
  const fireMsg = fireData.onTrack
    ? t("At this pace, you're projected to hit financial freedom around age {age}.", { age: Math.round(fireData.projectedFreedomAge) })
    : t("At this pace, you're not projected to reach your FIRE number within the modeled horizon — raising your savings rate moves this forward.");
  const fireLines = doc.splitTextToSize(fireMsg, CONTENT_W);
  doc.text(fireLines, MARGIN, y + 4);
  y += 4 + fireLines.length * 4.6 + 4;

  const currentAssets = Math.max(0, (profile.liquidSavings || 0) + (profile.investments || 0) + (profile.realEstate || 0));
  const fireProgress = fireData.fireNumber > 0 ? Math.min(1, currentAssets / fireData.fireNumber) : 0;
  doc.setDrawColor(...COLOR.border);
  doc.setFillColor(...COLOR.panel);
  doc.roundedRect(MARGIN, y, CONTENT_W, 6, 3, 3, "FD");
  setColor(doc, "setFillColor", COLOR.brand);
  doc.roundedRect(MARGIN, y, Math.max(CONTENT_W * fireProgress, 6), 6, 3, 3, "F");
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, "setTextColor", COLOR.subink);
  doc.text(`${t("FIRE target")}: ${formatCurrency(fireData.fireNumber)}`, MARGIN, y);
  doc.text(`${(fireProgress * 100).toFixed(1)}% ${t("of target")}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 10;

  // ---- Footer ----
  const footerY = 287;
  doc.setDrawColor(...COLOR.border);
  doc.line(MARGIN, footerY - 6, PAGE_W - MARGIN, footerY - 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor(doc, "setTextColor", COLOR.muted);
  const disclaimerLines = doc.splitTextToSize(t("Educational estimate assuming a 7% annual return — not a guarantee or financial advice."), CONTENT_W);
  doc.text(disclaimerLines, MARGIN, footerY - 1.5);
  doc.text(t("Generated by Batara Kuwera on {date}", { date: dateStr }), PAGE_W - MARGIN, footerY - 1.5, { align: "right" });

  const safeName = displayName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "report";
  doc.save(`batara-kuwera-report-${safeName}.pdf`);
}

// Mirrors the DIAGNOSIS map in the main app file — duplicated here (not imported) to keep this
// module self-contained; the English text is the i18n key, so translations stay in sync automatically.
const DIAGNOSIS_TEXT = {
  CRITICAL: "Your finances need attention this month — at least one core metric has crossed into risk territory. Start by shoring up your emergency fund or trimming debt payments.",
  MEDIUM: "You're stable but not yet resilient. Small, consistent increases to your savings rate will move you toward Optimal.",
  OPTIMAL: "Your fundamentals are strong across savings, buffer, and debt load. Focus now shifts to optimizing growth toward your FIRE target.",
};
