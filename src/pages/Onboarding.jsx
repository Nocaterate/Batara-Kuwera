// The first-run wizard that collects the financial profile.
import { useState } from "react";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useLang, LANGUAGES } from "../i18n.js";
import { cn } from "../ui.js";
import { Field, NumberField, AmountField, SelectField } from "../components/fields.jsx";
import { RISK_LEVELS, FIELD_INFO } from "../data.js";
import { LOGO_SRC, DARK_TOKENS } from "../theme.js";

const ONBOARDING_STEPS = ["Personal info", "Income", "Expenses", "Savings & assets", "Liabilities", "Goals"];

function LanguageSwitch({ lang, setLang }) {
  const { t } = useLang();
  return (
    <div role="group" aria-label={t("Language")} className="inline-flex rounded-lg border border-zinc-800 p-0.5 text-xs">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          title={l.label}
          aria-label={l.label}
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
          className={cn("rounded-md px-2.5 py-1 font-data font-medium transition-colors", lang === l.id ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200")}
        >
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function OnboardingPage({ profile, setProfile, onComplete, setLang }) {
  const { t, lang } = useLang();
  const [step, setStep] = useState(0);
  const T = DARK_TOKENS;
  const set = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }));
  const setAmount = (k) => (v) => setProfile((p) => ({ ...p, [k]: v }));

  const next = () => {
    if (step < ONBOARDING_STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={LOGO_SRC} alt="Batara Kuwera" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-display text-xl font-bold text-zinc-100">BATARA KUWERA</span>
          </div>
          <LanguageSwitch lang={lang} setLang={setLang} />
        </div>

        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{t("Step {current} of {total}", { current: step + 1, total: ONBOARDING_STEPS.length })}</span>
          <span>{t(ONBOARDING_STEPS[step])}</span>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` }} />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Tell us about you")}</h2>
              <Field label="Full name" info={FIELD_INFO.fullName} type="text" value={profile.fullName} onChange={set("fullName")} T={T} />
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Age" info={FIELD_INFO.age} value={profile.age} onChange={(v) => setProfile((p) => ({ ...p, age: v }))} maxDigits={3} T={T} />
                <Field label="Occupation" info={FIELD_INFO.occupation} type="text" value={profile.occupation} onChange={set("occupation")} T={T} />
              </div>
              <SelectField label="Risk tolerance" info={FIELD_INFO.riskTolerance} value={profile.riskTolerance} onChange={set("riskTolerance")} T={T}
                options={RISK_LEVELS.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Monthly income")}</h2>
              <p className="text-sm text-zinc-400">{t("What comes in each month, before anything goes out.")}</p>
              <AmountField label="Base salary" info={FIELD_INFO.baseSalary} value={profile.baseSalary} onChange={setAmount("baseSalary")} T={T} />
              <AmountField label="Side income (freelance, business, etc.)" info={FIELD_INFO.sideIncome} value={profile.sideIncome} onChange={setAmount("sideIncome")} T={T} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Monthly expenses")}</h2>
              <p className="text-sm text-zinc-400">{t("Split fixed needs from lifestyle spending and debt payments.")}</p>
              <AmountField label="Essential needs (rent, food, bills)" info={FIELD_INFO.essentialExpenses} value={profile.essentialExpenses} onChange={setAmount("essentialExpenses")} T={T} />
              <AmountField label="Discretionary / lifestyle" info={FIELD_INFO.discretionaryExpenses} value={profile.discretionaryExpenses} onChange={setAmount("discretionaryExpenses")} T={T} />
              <AmountField label="Monthly debt repayments" info={FIELD_INFO.monthlyDebtRepayment} value={profile.monthlyDebtRepayment} onChange={setAmount("monthlyDebtRepayment")} T={T} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Savings & assets")}</h2>
              <AmountField label="Liquid savings (cash, emergency fund)" info={FIELD_INFO.liquidSavings} value={profile.liquidSavings} onChange={setAmount("liquidSavings")} T={T} />
              <AmountField label="Investments (stocks, crypto, retirement)" info={FIELD_INFO.investments} value={profile.investments} onChange={setAmount("investments")} T={T} />
              <AmountField label="Real estate equity" info={FIELD_INFO.realEstate} value={profile.realEstate} onChange={setAmount("realEstate")} T={T} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Liabilities")}</h2>
              <AmountField label="Short-term debt (credit cards, consumer loans)" info={FIELD_INFO.shortTermDebt} value={profile.shortTermDebt} onChange={setAmount("shortTermDebt")} T={T} />
              <AmountField label="Long-term debt (mortgage, student loans)" info={FIELD_INFO.longTermDebt} value={profile.longTermDebt} onChange={setAmount("longTermDebt")} T={T} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">{t("Financial goals")}</h2>
              <NumberField label="Target retirement age" info={FIELD_INFO.targetRetirementAge} suffix="yrs" value={profile.targetRetirementAge} onChange={(v) => setProfile((p) => ({ ...p, targetRetirementAge: v }))} maxDigits={3} T={T} />
              <AmountField label="Desired monthly budget in retirement" info={FIELD_INFO.monthlyLifestyleTarget} value={profile.monthlyLifestyleTarget} onChange={setAmount("monthlyLifestyleTarget")} T={T} />
              <p className="text-xs text-zinc-500">{t("Leave this empty to base your target on your current spending instead.")}</p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <button onClick={back} disabled={step === 0} className={cn("flex items-center gap-1 rounded-lg px-3 py-2 text-sm", step === 0 ? "cursor-not-allowed text-zinc-700" : "text-zinc-400 hover:text-zinc-200")}>
              <ChevronLeft size={15} /> {t("Back")}
            </button>
            <button onClick={next} className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
              {step === ONBOARDING_STEPS.length - 1 ? t("Finish setup") : t("Next")}
              {step < ONBOARDING_STEPS.length - 1 && <ChevronRight size={15} />}
              {step === ONBOARDING_STEPS.length - 1 && <Check size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
