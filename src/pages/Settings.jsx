// Settings: account, appearance, financial profile and data export.
import { useState } from "react";
import { TrendingUp, Wallet, Sun, Moon, Monitor, Check, Download, Trash2, Lock } from "lucide-react";
import { useLang, LANGUAGES } from "../i18n.js";
import { cn } from "../ui.js";
import SoftWrap from "../SoftWrap.jsx";
import { HealthBadge } from "../components/common.jsx";
import KawungLayer from "../components/KawungLayer.jsx";
import { InfoTip, Field, NumberField, AmountField, SelectField, Switch } from "../components/fields.jsx";
import { RISK_LEVELS, FIELD_INFO, glossaryDef } from "../data.js";
import { perksFor } from "../plans.js";
import { LOGO_SRC } from "../theme.js";

export function SettingsPage({ theme, setTheme, setLang, user, setUser, profile, setProfile, metrics, fireData, onDeleteAccount, showToast, subscriptionTier, setPage, T }) {
  const { t, fmt, lang, money } = useLang();
  const [notifEmail, setNotifEmail] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingFinances, setEditingFinances] = useState(false);
  const [draft, setDraft] = useState(profile);

  const openEditor = () => { setDraft(profile); setEditingFinances(true); };
  const setDraftAmount = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const saveFinances = () => {
    setProfile(draft);
    setEditingFinances(false);
    showToast("Financial info updated — your dashboard has been recalculated.");
  };

  const canExport = perksFor(subscriptionTier).pdfReport;

  const exportReport = async () => {
    if (!canExport) {
      showToast("PDF reports are included in Expert Standard and Pro.");
      setPage("subscription");
      return;
    }
    try {
      // jsPDF is large and only needed here, so it loads on first click instead of with the app.
      const { generateFinancialReportPdf } = await import("../pdfReport.js");
      await generateFinancialReportPdf({ user, profile, metrics, fireData, lang, t, fmt, formatCurrency: money, logoSrc: LOGO_SRC });
      showToast("Your financial report has started downloading.");
    } catch {
      showToast("Export failed — please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className={cn("font-display text-2xl font-bold", T.text)}>{t("Settings")}</h1>
        <p className={cn("text-sm", T.subtext)}>{t("Manage your account, appearance, and data.")}</p>
      </div>

      <section className={cn("overflow-hidden rounded-2xl border", T.panel, T.cardBorder)}>
        <div className="relative isolate px-5 py-5">
          <KawungLayer from="right" className="inset-y-0 right-0 w-80" opacity={0.28} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-red-500" />
                <h3 className={cn("font-display text-sm font-semibold", T.text)}>{t("Financial profile")}</h3>
              </div>
              <p className={cn("mt-1 max-w-md text-sm", T.subtext)}>
                {t("Your saved figures power every metric on the dashboard. Update them whenever your income, expenses, or debts change.")}
              </p>
            </div>
            <HealthBadge status={metrics.healthStatus} T={T} />
          </div>

          <div className="relative mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-4">
            {[
              { label: "Income", info: FIELD_INFO.income, value: money(metrics.monthlyIncome) },
              { label: "Expenses", info: FIELD_INFO.expenses, value: money(metrics.monthlyExpenses) },
              { label: "Net worth", info: glossaryDef("Net worth"), value: money(metrics.netWorth) },
              { label: "Savings rate", info: glossaryDef("Savings rate"), value: fmt(metrics.savingsRate) + "%" },
            ].map((s) => (
              <div key={s.label} className={cn("min-w-0 rounded-lg border px-3 py-2", T.border, T.panel)}>
                <div className={cn("flex items-center gap-1.5 text-xs", T.mutedText)}>
                  {t(s.label)}
                  <InfoTip label={s.label} text={s.info} T={T} />
                </div>
                <div className={cn("font-data text-sm font-semibold [overflow-wrap:anywhere]", T.text)}><SoftWrap>{s.value}</SoftWrap></div>
              </div>
            ))}
          </div>

          {!editingFinances && (
            <button onClick={openEditor} className="relative mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
              <TrendingUp size={15} /> {t("Update financial info")}
            </button>
          )}
        </div>

        {editingFinances && (
          <div className={cn("border-t px-5 py-5", T.border)}>
            <div className="space-y-5">
              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Monthly income")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Base salary" info={FIELD_INFO.baseSalary} value={draft.baseSalary} onChange={setDraftAmount("baseSalary")} T={T} />
                  <AmountField label="Side income" info={FIELD_INFO.sideIncome} value={draft.sideIncome} onChange={setDraftAmount("sideIncome")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Monthly expenses")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Essential needs" info={FIELD_INFO.essentialExpenses} value={draft.essentialExpenses} onChange={setDraftAmount("essentialExpenses")} T={T} />
                  <AmountField label="Discretionary / lifestyle" info={FIELD_INFO.discretionaryExpenses} value={draft.discretionaryExpenses} onChange={setDraftAmount("discretionaryExpenses")} T={T} />
                  <AmountField label="Debt repayments" info={FIELD_INFO.monthlyDebtRepayment} value={draft.monthlyDebtRepayment} onChange={setDraftAmount("monthlyDebtRepayment")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Savings & assets")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Liquid savings" info={FIELD_INFO.liquidSavings} value={draft.liquidSavings} onChange={setDraftAmount("liquidSavings")} T={T} />
                  <AmountField label="Investments" info={FIELD_INFO.investments} value={draft.investments} onChange={setDraftAmount("investments")} T={T} />
                  <AmountField label="Real estate equity" info={FIELD_INFO.realEstate} value={draft.realEstate} onChange={setDraftAmount("realEstate")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Liabilities")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AmountField label="Short-term debt" info={FIELD_INFO.shortTermDebt} value={draft.shortTermDebt} onChange={setDraftAmount("shortTermDebt")} T={T} />
                  <AmountField label="Long-term debt" info={FIELD_INFO.longTermDebt} value={draft.longTermDebt} onChange={setDraftAmount("longTermDebt")} T={T} />
                </div>
              </div>

              <div>
                <h4 className={cn("mb-3 font-data text-xs uppercase tracking-wider", T.mutedText)}>{t("Goals & personal")}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Age" info={FIELD_INFO.age} value={draft.age} onChange={(v) => setDraft((d) => ({ ...d, age: v }))} maxDigits={3} T={T} />
                  <NumberField label="Target retirement age" info={FIELD_INFO.targetRetirementAge} suffix="yrs" value={draft.targetRetirementAge} onChange={(v) => setDraft((d) => ({ ...d, targetRetirementAge: v }))} maxDigits={3} T={T} />
                  <AmountField label="Desired monthly budget in retirement" info={FIELD_INFO.monthlyLifestyleTarget} value={draft.monthlyLifestyleTarget} onChange={setDraftAmount("monthlyLifestyleTarget")} T={T} />
                  <SelectField label="Risk tolerance" info={FIELD_INFO.riskTolerance} value={draft.riskTolerance} onChange={(e) => setDraft((d) => ({ ...d, riskTolerance: e.target.value }))} T={T}
                    options={RISK_LEVELS.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={saveFinances} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
                  <Check size={15} /> {t("Save changes")}
                </button>
                <button onClick={() => setEditingFinances(false)} className={cn("rounded-lg border px-4 py-2.5 text-sm", T.border, T.subtext, T.hoverBg)}>
                  {t("Cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Appearance")}</h3>
        <div className="flex gap-2">
          {[{ id: "dark", icon: Moon, label: "Dark" }, { id: "light", icon: Sun, label: "Light" }, { id: "system", icon: Monitor, label: "System" }].map((opt) => (
            <button key={opt.id} onClick={() => setTheme(opt.id)} className={cn(
              "flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 text-xs transition-colors",
              theme === opt.id ? cn("border-red-600", T.accent) : cn(T.border, T.subtext)
            )}>
              <opt.icon size={16} /> {t(opt.label)}
            </button>
          ))}
        </div>
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Account")}</h3>
        <div className="space-y-4">
          <Field label="Full name" info={FIELD_INFO.fullName} type="text" value={profile.fullName} onChange={(e) => { const v = e.target.value; setProfile((p) => ({ ...p, fullName: v })); setUser((u) => ({ ...u, fullName: v })); }} T={T} />
          <Field label="Email" info={FIELD_INFO.email} type="email" value={user.email} readOnly T={T} />
          <div className="flex items-center justify-between">
            <div>
              <div className={cn("text-sm", T.text)}>{t("Two-factor authentication")}</div>
              <div className={cn("text-xs", T.mutedText)}>{t("Add an extra step when signing in.")}</div>
            </div>
            <Switch checked={twoFA} onChange={setTwoFA} />
          </div>
        </div>
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Preferences")}</h3>
        <div className="space-y-4">
          <div>
            <div className={cn("text-sm", T.text)}>{t("Language")}</div>
            <div className={cn("mb-2 text-xs", T.mutedText)}>{t("Choose the language used across the app.")}</div>
            <div className="flex gap-2">
              {LANGUAGES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={lang === opt.id}
                  onClick={() => setLang(opt.id)}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm transition-colors",
                    lang === opt.id ? cn("border-red-600", T.accent) : cn(T.border, T.subtext, T.hoverBg)
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className={cn("rounded-lg border px-3 py-2.5 text-sm", T.border, T.subtext)}>
            {t("Currency:")} <span className={cn("font-data", T.text)}>{t("IDR — Indonesian Rupiah")}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className={cn("text-sm", T.text)}>{t("Monthly health check emails")}</div>
              <div className={cn("text-xs", T.mutedText)}>{t("A summary of your metrics, once a month.")}</div>
            </div>
            <Switch checked={notifEmail} onChange={setNotifEmail} />
          </div>
        </div>
      </section>

      <section className={cn("rounded-2xl border p-5", T.panel, T.cardBorder)}>
        <h3 className={cn("mb-4 font-display text-sm font-semibold", T.text)}>{t("Data")}</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportReport} className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm", T.border, T.text, T.hoverBg)}>
            {canExport ? <Download size={14} /> : <Lock size={14} />} {t("Export report (PDF)")}
            {!canExport && <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", T.border, T.mutedText)}>Expert Standard</span>}
          </button>
          <button
            onClick={() => confirmDelete ? onDeleteAccount() : setConfirmDelete(true)}
            className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm", confirmDelete ? cn("border-red-600 bg-red-600/10", T.accent) : cn(T.dangerBorder, T.accent, T.dangerHover))}
          >
            <Trash2 size={14} /> {confirmDelete ? t("Click again to confirm") : t("Delete account")}
          </button>
        </div>
      </section>
    </div>
  );
}
