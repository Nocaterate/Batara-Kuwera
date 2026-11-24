// Static content: glossary, field help texts, risk levels and the (fictional) expert roster.

export const RISK_LEVELS = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"];

export const GLOSSARY = [
  { term: "DTI ratio", def: "The share of your monthly income that goes to debt payments. Above 40% is a red flag; under 20% is a strong position." },
  { term: "Emergency fund", def: "How many months of expenses your liquid savings could cover if your income stopped today. Aim for 3–6 months or more." },
  { term: "Savings rate", def: "The percentage of income you keep rather than spend, before it goes toward investing or debt payoff." },
  { term: "Net worth", def: "Everything you own — cash, investments, property — minus everything you owe." },
  { term: "FIRE number", def: "The invested-asset total that could sustainably fund your lifestyle indefinitely, using the 4% rule." },
  { term: "4% rule", def: "A guideline suggesting you can withdraw ~4% of your portfolio per year in retirement without depleting it over a long horizon." },
  { term: "Compound growth", def: "Investment returns earning their own returns over time — the main engine behind long-term wealth building." },
];

// Explanations shown by the (i) buttons. English text doubles as the translation key.
export const FIELD_INFO = {
  fullName: "The name shown in your greeting and profile. It isn't used in any calculation.",
  age: "Your current age. It's the starting point for projecting when you could reach financial freedom.",
  occupation: "Your job or main line of work. It's for context only and isn't used in any calculation.",
  riskTolerance: "How much ups and downs in your investments you can handle. Conservative prefers stability, Moderate accepts some swings, Aggressive accepts big swings for higher potential returns.",
  baseSalary: "Your fixed monthly pay from your main job.",
  sideIncome: "Extra money you earn each month outside your main job, like freelancing or a small business. Use an average if it varies.",
  essentialExpenses: "Spending you can't easily skip: rent, food, utilities, transport and other must-pay bills. Put debt payments in the debt field instead.",
  discretionaryExpenses: "Spending you could cut if needed: dining out, shopping, subscriptions, hobbies and entertainment.",
  monthlyDebtRepayment: "The total you pay toward debts each month, such as credit cards, loans and installments. It's also used to work out your debt-to-income ratio.",
  liquidSavings: "Money you can reach right away: cash, savings accounts and your emergency fund. It decides how many months you could cover without income.",
  investments: "The current value of what you've invested: stocks, mutual funds, crypto and retirement accounts.",
  realEstate: "The part of a property you actually own: its market value minus what you still owe on it.",
  shortTermDebt: "Debts you expect to pay off within about a year, like credit card balances and consumer loans.",
  longTermDebt: "Debts that take many years to repay, like a mortgage or student loans.",
  targetRetirementAge: "The age at which you'd like to stop working for income.",
  monthlyLifestyleTarget: "How much you'd like to spend each month once you stop working. It sets your FIRE number. Leave it empty to use your current spending.",
  income: "Everything you earn per month: base salary plus side income.",
  expenses: "Everything you spend per month: essentials, lifestyle spending and debt repayments.",
  healthStatus: "Rated from your savings rate, emergency fund and debt-to-income ratio. Critical means savings rate under 10%, emergency fund under 3 months, or debt-to-income over 40%. Optimal means savings rate over 30%, emergency fund over 6 months and debt-to-income under 20%. Anything in between is Medium.",
  allocation: "How your monthly income is split between essentials, lifestyle spending, debt repayment and savings.",
  trajectory: "Projects how your net worth could grow at a 7% yearly return, and when it could reach your FIRE number (25 times your yearly expenses).",
  email: "The email you sign in with. It can't be changed here.",
};

export const glossaryDef = (term) => GLOSSARY.find((g) => g.term === term).def;

// Fictional advisors — not real people. Named and credentialed in the style of Indonesian
// financial planners (CFP®/QWP®/RFA®/CWM® are real, general Indonesian certifications, not
// tied to anyone specific) so the roster reads authentically without using anyone's real identity.
// Each expert's `specialties` must stay within CONSULT_TYPES' vocabulary (src/Schedule.jsx) —
// that's what decides which consultation types they offer.
// `rate` is the expert's per-session price (Rp) for a normal consultation; other types scale it
// by their factor in CONSULT_TYPES. Senior experts charge more.
// Photos: free-licensed Unsplash portraits (not photos of the named person — see EXPERTS note
// above), stored locally under public/experts/. Avatar falls back to initials if one fails to load.
export const EXPERTS = [
  { id: 1, name: "Budi Santoso", cert: "CFP®", years: 9, bio: "Helps young professionals build a budget that survives payday to payday, and pay off debt without burning out.", specialties: ["Budgeting", "Debt Payoff"], rating: 4.9, rate: 250000, photo: "/experts/budi-santoso.jpg" },
  { id: 2, name: "Andra Kusuma", cert: "CFA, WPPE", years: 12, bio: "Builds long-horizon stock portfolios and retirement plans for Indonesia's growing middle class.", specialties: ["Stocks", "Retirement"], rating: 4.8, rate: 325000, photo: "/experts/andra-kusuma.jpg" },
  { id: 3, name: "Dewi Anggraini", cert: "CFP®, QWP®", years: 7, bio: "Untangles tax obligations for freelancers and dual-income households, alongside everyday budgeting.", specialties: ["Tax Planning", "Budgeting"], rating: 4.7, rate: 225000, photo: "/experts/dewi-anggraini.jpg" },
  { id: 4, name: "Fajar Ramadhan", cert: "CWM®", years: 6, bio: "Guides first-time crypto and stock investors toward a responsible, risk-aware allocation.", specialties: ["Crypto", "Stocks"], rating: 4.6, rate: 200000, photo: "/experts/fajar-ramadhan.jpg" },
  { id: 5, name: "Kartika Wulandari", cert: "CFP®, RFA®", years: 14, bio: "Plans for retirement, education costs, and property purchases across multi-decade horizons.", specialties: ["Retirement", "Real Estate"], rating: 4.9, rate: 350000, photo: "/experts/kartika-wulandari.jpg" },
  { id: 6, name: "Reza Firmansyah", cert: "CFA", years: 5, bio: "Entry-level friendly — gets new earners to a solid financial foundation fast.", specialties: ["Budgeting", "Debt Payoff"], rating: 4.5, rate: 175000, photo: "/experts/reza-firmansyah.jpg" },
  { id: 7, name: "Nadia Puspitasari", cert: "CWM®, WPPE", years: 8, bio: "Advises tech workers and young professionals on building diversified crypto and equity portfolios.", specialties: ["Crypto", "Stocks"], rating: 4.7, rate: 250000, photo: "/experts/nadia-puspitasari.jpg" },
  { id: 8, name: "Hendra Wibowo", cert: "CFP®, QWP®", years: 11, bio: "Combines tax-efficient planning with retirement strategy for professionals nearing their peak earning years.", specialties: ["Tax Planning", "Retirement"], rating: 4.8, rate: 300000, photo: "/experts/hendra-wibowo.jpg" },
  { id: 9, name: "Sinta Maharani", cert: "CFP®, RFA®", years: 6, bio: "Guides first-time property buyers through financing, budgeting, and long-term real estate equity building.", specialties: ["Real Estate", "Budgeting"], rating: 4.6, rate: 200000, photo: "/experts/sinta-maharani.jpg" },
];

export const expertPhoto = (expertId) => EXPERTS.find((x) => x.id === expertId)?.photo;
