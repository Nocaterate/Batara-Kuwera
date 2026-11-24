// Root component: account state, persistence, routing between pages.
import { lazy, Suspense, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { LangContext, makeT, makeFmt, makeMoney, LANGUAGES } from "./i18n.js";
import { readSession, startSession, endSession, loadPrefs, savePrefs } from "./session.js";
import { registerUser, verifyLogin, userExists, loadAccount, saveAccount, deleteUser } from "./auth.js";
import { AppShell } from "./AppShell.jsx";
import { Toast } from "./components/common.jsx";
import { emptyProfile, computeMetrics, computeFireProjection } from "./finance.js";
import { LoginPage, RegisterPage } from "./pages/Auth.jsx";
import { TIERS, perksFor, FREE_SUBSCRIPTION, normalizeSubscription, normalizeBookings, normalizeGoals } from "./plans.js";
import { DARK_TOKENS, LIGHT_TOKENS } from "./theme.js";

// Pages load on first visit, so the login screen doesn't download charts, checkout or the PDF code.
const named = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const OnboardingPage = named(() => import("./pages/Onboarding.jsx"), "OnboardingPage");
const DashboardPage = named(() => import("./pages/Dashboard.jsx"), "DashboardPage");
const GoalsPage = lazy(() => import("./Goals.jsx"));
const ExpertsPage = named(() => import("./pages/Experts.jsx"), "ExpertsPage");
const SubscriptionPage = named(() => import("./pages/Subscription.jsx"), "SubscriptionPage");
const SettingsPage = named(() => import("./pages/Settings.jsx"), "SettingsPage");
const ChatPage = named(() => import("./pages/Chat.jsx"), "ChatPage");

// Placeholder while a page's code loads: a title, a row of cards and two panels, with a shimmer.
function PageLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" role="status" aria-label="Loading">
      <div className="space-y-2">
        <div className="bk-skeleton h-7 w-56 rounded-lg" />
        <div className="bk-skeleton h-4 w-72 max-w-full rounded-md" />
      </div>
      <div className="bk-skeleton h-24 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="bk-skeleton h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="bk-skeleton h-72 rounded-2xl lg:col-span-2" />
        <div className="bk-skeleton h-72 rounded-2xl lg:col-span-3" />
      </div>
    </div>
  );
}

function loadInitialState() {
  let session = readSession();
  if (session && !userExists(session.email)) { endSession(); session = null; }
  const account = (session && loadAccount(session.email)) || {};
  const prefs = loadPrefs();
  const hasProfile = !!account.hasProfile;
  return {
    session,
    page: !session ? "login" : hasProfile ? "dashboard" : "onboarding",
    user: { fullName: "", ...(account.user || {}), email: session ? session.email : "" },
    profile: { ...emptyProfile(), ...(account.profile || {}) },
    hasProfile,
    subscription: normalizeSubscription(account.subscription),
    bookings: normalizeBookings(account.bookings),
    goals: normalizeGoals(account.goals),
    theme: ["dark", "light", "system"].includes(prefs.theme) ? prefs.theme : "dark",
    lang: LANGUAGES.some((l) => l.id === prefs.lang) ? prefs.lang : "en",
  };
}

export default function App() {
  const [init] = useState(loadInitialState);
  const [page, setPage] = useState(init.page);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(init.session);
  const [user, setUser] = useState(init.user);
  const [profile, setProfile] = useState(init.profile);
  const [hasProfile, setHasProfile] = useState(init.hasProfile);
  const [theme, setTheme] = useState(init.theme);
  const [lang, setLang] = useState(init.lang);
  const [subscription, setSubscription] = useState(init.subscription);
  const [bookings, setBookings] = useState(init.bookings);
  const [goals, setGoals] = useState(init.goals);
  const [toast, setToast] = useState(null);
  // Which Experts tab to open next; set by the dashboard card, reset by the sidebar.
  const [expertsTab, setExpertsTab] = useState("find");

  const langValue = useMemo(() => ({ lang, t: makeT(lang), fmt: makeFmt(lang), money: makeMoney(lang) }), [lang]);

  // Stable across renders, and the hide timer lives in a ref, so a new toast always cancels the
  // previous one's timer and stays up for its full 3.2 s.
  const toastTimer = useRef(null);
  // tone: "success" (green check), "warning" (amber triangle) or "info" (neutral, the default).
  const showToast = useCallback((key, vars, tone = "info") => {
    setToast({ key, vars, tone, id: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    savePrefs({ theme, lang });
    document.documentElement.lang = lang;
  }, [theme, lang]);

  useEffect(() => {
    if (session) saveAccount(session.email, { user, profile, hasProfile, subscription, bookings, goals });
  }, [session, user, profile, hasProfile, subscription, bookings, goals]);

  const resetAccountState = () => {
    setUser({ fullName: "", email: "" });
    setProfile(emptyProfile());
    setHasProfile(false);
    setSubscription(FREE_SUBSCRIPTION);
    setBookings([]);
    setGoals([]);
  };

  // When a paid plan reaches its due date the account drops back to the free plan.
  // Polled rather than a single timeout: an annual period exceeds the maximum timer delay.
  useEffect(() => {
    if (!session || subscription.tier === "ai") return undefined;
    const check = () => {
      if (Date.now() < subscription.expiresAt) return;
      const plan = TIERS.find((x) => x.id === subscription.tier)?.name ?? "";
      setSubscription(FREE_SUBSCRIPTION);
      showToast("Your {plan} plan has expired. You're back on the Free plan.", { plan }, "warning");
    };
    check();
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, [session, subscription, showToast]);

  useEffect(() => {
    if (!session) return undefined;
    const expire = () => {
      endSession();
      setSession(null);
      resetAccountState();
      setPage("login");
      showToast("Your session has expired. Please sign in again.", undefined, "warning");
    };
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) { expire(); return undefined; }
    const id = window.setTimeout(expire, remaining);
    return () => window.clearTimeout(id);
  }, [session, showToast]);

  const metrics = useMemo(() => computeMetrics(profile), [profile]);
  const fireData = useMemo(() => computeFireProjection(profile, metrics), [profile, metrics]);

  const effectiveTheme = useMemo(() => {
    if (theme !== "system") return theme;
    try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
    catch { return "dark"; }
  }, [theme]);
  const T = effectiveTheme === "light" ? LIGHT_TOKENS : DARK_TOKENS;

  // Both handlers resolve to an error message, or null on success.
  const handleLogin = async (email, password, remember) => {
    let result;
    try { result = await verifyLogin(email, password); }
    catch { return "Something went wrong. Please try again."; }
    if (!result.ok) {
      return result.error === "NO_ACCOUNT" ? "No account found for this email. Please register first." : "Incorrect password.";
    }

    // Returning users keep their saved profile and go straight to the dashboard.
    const account = loadAccount(result.email) || {};
    const fullName = account.user?.fullName || result.fullName || "";
    setUser({ fullName, email: result.email });
    setProfile({ ...emptyProfile(), fullName, ...(account.profile || {}) });
    setHasProfile(!!account.hasProfile);
    setSubscription(normalizeSubscription(account.subscription));
    setBookings(normalizeBookings(account.bookings));
    setGoals(normalizeGoals(account.goals));
    setSession(startSession(result.email, remember));
    if (account.hasProfile) {
      setPage("dashboard");
      const first = (account.profile?.fullName || fullName).split(" ")[0];
      if (first) showToast("Welcome back, {name}.", { name: first });
      else showToast("Welcome back.");
    } else {
      setPage("onboarding");
    }
    return null;
  };

  const handleRegister = async (form) => {
    let result;
    try { result = await registerUser(form); }
    catch { return "Something went wrong. Please try again."; }
    if (!result.ok) {
      return result.error === "STORAGE_UNAVAILABLE"
        ? "Your browser is blocking saved data (private browsing, or cookies/storage disabled for this site), so an account can't be created here. Try a normal browser window, or allow storage for this site."
        : "An account with this email already exists. Please log in.";
    }

    // No auto sign-in: the new user logs in manually, then lands in onboarding.
    setPage("login");
    showToast("Account created. Please sign in to continue.", undefined, "success");
    return null;
  };

  const handleOnboardingComplete = () => {
    setHasProfile(true);
    setUser((u) => ({ ...u, fullName: profile.fullName || u.fullName }));
    setPage("dashboard");
    showToast("Profile saved — your dashboard is ready.", undefined, "success");
  };

  const handleLogout = () => {
    endSession();
    setSession(null);
    resetAccountState();
    setPage("login");
  };

  const handleDeleteAccount = () => {
    if (session) deleteUser(session.email);
    endSession();
    setSession(null);
    resetAccountState();
    setPage("login");
  };

  const AUTHED_PAGES = ["dashboard", "goals", "experts", "subscription", "settings", "chat"];

  // Paint the page itself (not just the app) so refresh and overscroll never flash white.
  // Login, register and onboarding are always dark; only the signed-in pages follow the theme.
  const pageIsLight = effectiveTheme === "light" && AUTHED_PAGES.includes(page);
  useEffect(() => {
    document.documentElement.style.backgroundColor = pageIsLight ? "#fafafa" : "#09090b";
    document.documentElement.style.colorScheme = pageIsLight ? "light" : "dark";
  }, [pageIsLight]);

  return (
    <LangContext.Provider value={langValue}>
    <div className="min-h-screen w-full font-sans">

      {page === "login" && <LoginPage onLogin={handleLogin} onGoRegister={() => setPage("register")} showToast={showToast} />}
      {page === "register" && <RegisterPage onRegister={handleRegister} onGoLogin={() => setPage("login")} />}
      {page === "onboarding" && (
        <Suspense fallback={<PageLoading />}>
          <OnboardingPage profile={profile} setProfile={setProfile} onComplete={handleOnboardingComplete} setLang={setLang} />
        </Suspense>
      )}

      {AUTHED_PAGES.includes(page) && (
        <AppShell page={page} setPage={(p) => { setExpertsTab("find"); setPage(p); }} onLogout={handleLogout} T={T} healthStatus={metrics.healthStatus} userName={profile.fullName || user.fullName} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
          <Suspense fallback={<PageLoading />}>
          {/* Keyed by page, so each page switch replays a short fade-in (.bk-page-in in index.css). */}
          <div key={page} className="bk-page-in h-full">
          {page === "dashboard" && <DashboardPage
            profile={profile} metrics={metrics} fireData={fireData} subscriptionTier={subscription.tier} bookings={bookings} goals={goals}
            openMySessions={() => { setExpertsTab("mine"); setPage("experts"); }} setPage={setPage} T={T}
          />}
          {page === "goals" && (
            <GoalsPage
              goals={goals} setGoals={setGoals} maxGoals={perksFor(subscription.tier).maxGoals}
              monthlySurplus={metrics.monthlyIncome - metrics.monthlyExpenses} setPage={setPage} showToast={showToast} T={T}
            />
          )}
          {page === "experts" && <ExpertsPage key={expertsTab} initialTab={expertsTab} subscriptionTier={subscription.tier} bookings={bookings} setBookings={setBookings} showToast={showToast} setPage={setPage} T={T} />}
          {page === "subscription" && <SubscriptionPage subscription={subscription} setSubscription={setSubscription} setPage={setPage} showToast={showToast} T={T} />}
          {page === "settings" && <SettingsPage theme={theme} setTheme={setTheme} setLang={setLang} user={user} setUser={setUser} profile={profile} setProfile={setProfile} metrics={metrics} fireData={fireData} onDeleteAccount={handleDeleteAccount} showToast={showToast} subscriptionTier={subscription.tier} setPage={setPage} T={T} />}
          {page === "chat" && <ChatPage profile={profile} metrics={metrics} fireData={fireData} T={T} />}
          </div>
          </Suspense>
        </AppShell>
      )}

      <Toast toast={toast} />
    </div>
    </LangContext.Provider>
  );
}
