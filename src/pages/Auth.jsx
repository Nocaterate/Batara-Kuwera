// Login and registration.
import { useState } from "react";
import { Check, AlertTriangle, Eye, EyeOff, Github } from "lucide-react";
import { useLang } from "../i18n.js";
import { isStorageWorking } from "../session.js";
import { PASSWORD_RULES } from "../auth.js";
import { cn } from "../ui.js";
import { Field } from "../components/fields.jsx";
import { LOGO_SRC, DARK_TOKENS } from "../theme.js";

function AuthShell({ children }) {
  const { t } = useLang();
  // Checked once per mount (login/register page load) so the warning shows up front, before
  // someone registers, gets a false "success", and then can't find the account on login.
  const [storageOk] = useState(isStorageWorking);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10">
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-red-700/20"
        style={{ height: 420, width: 720, filter: "blur(110px)" }}
      />
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
        backgroundSize: "26px 26px",
        opacity: 0.05,
      }} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <img src={LOGO_SRC} alt="Batara Kuwera" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-xl font-bold tracking-tight text-zinc-100">BATARA KUWERA</span>
        </div>
        {!storageOk && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-800/50 bg-amber-950/30 px-3.5 py-3 text-xs text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{t("This browser is blocking saved data (private browsing, or cookies/storage disabled), so accounts made here won't be remembered. Try a normal browser window.")}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function LoginPage({ onLogin, onGoRegister, showToast }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password.trim()) { setError("Enter your email and password to continue."); return; }
    setError("");
    setBusy(true);
    const failure = await onLogin(email, password, remember);
    if (failure) { setError(failure); setBusy(false); }
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
        <h1 className="font-display text-2xl font-semibold text-zinc-100">{t("Welcome back")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("Sign in to check your financial posture.")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" T={DARK_TOKENS} />
          <div>
            <span className="mb-1.5 block text-sm text-zinc-400">{t("Password")}</span>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 pr-10 font-data text-sm text-zinc-100 outline-none focus:border-red-600"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400"><AlertTriangle size={13} />{t(error)}</div>}

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-zinc-400">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 rounded border-zinc-700 accent-red-600" />
              {t("Remember me")}
            </label>
            <button type="button" onClick={() => showToast("Password reset isn't wired up in this prototype.")} className="text-red-400 hover:text-red-300">
              {t("Forgot password?")}
            </button>
          </div>

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60">
            {t("Sign in")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" /><span className="text-xs text-zinc-500">{t("or")}</span><div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="space-y-2">
          <button onClick={() => showToast("OAuth isn't wired up in this prototype.")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60">
            {t("Continue with Google")}
          </button>
          <button onClick={() => showToast("OAuth isn't wired up in this prototype.")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60">
            <Github size={15} /> {t("Continue with GitHub")}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t("Don't have an account?")}{" "}
          <button onClick={onGoRegister} className="font-medium text-red-400 hover:text-red-300">{t("Register here")}</button>
        </p>
      </div>
    </AuthShell>
  );
}

export function RegisterPage({ onRegister, onGoLogin }) {
  const { t } = useLang();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.fullName.trim() || !form.email.trim() || !form.password) { setError("Fill in every field to create your account."); return; }
    if (!PASSWORD_RULES.every((r) => r.test(form.password))) { setError("Password must be at least 8 characters and include an uppercase letter, a number and a symbol."); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    setError("");
    setBusy(true);
    const failure = await onRegister(form);
    if (failure) { setError(failure); setBusy(false); }
  };

  return (
    <AuthShell>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7">
        <h1 className="font-display text-2xl font-semibold text-zinc-100">{t("Create your account")}</h1>
        <p className="mt-1 text-sm text-zinc-400">{t("Takes about 3 minutes to set up your profile after this.")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Full name" type="text" value={form.fullName} onChange={update("fullName")} placeholder="Jane Doe" T={DARK_TOKENS} />
          <Field label="Email" type="email" value={form.email} onChange={update("email")} placeholder="you@email.com" T={DARK_TOKENS} />
          <Field label="Password" type="password" value={form.password} onChange={update("password")} placeholder="••••••••" T={DARK_TOKENS} />
          <ul className="-mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(form.password);
              return (
                <li key={rule.id} className={cn("flex items-center gap-2 text-xs transition-colors", met ? "text-emerald-400" : "text-zinc-500")}>
                  {met ? <Check size={12} /> : <span className="ml-1 mr-0.5 h-1.5 w-1.5 rounded-full bg-zinc-600" />}
                  {t(rule.label)}
                </li>
              );
            })}
          </ul>
          <Field label="Confirm password" type="password" value={form.confirm} onChange={update("confirm")} placeholder="••••••••" T={DARK_TOKENS} />

          {error && <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400"><AlertTriangle size={13} />{t(error)}</div>}

          <button type="submit" disabled={busy} className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60">
            {t("Create account")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {t("Already have an account?")}{" "}
          <button onClick={onGoLogin} className="font-medium text-red-400 hover:text-red-300">{t("Log in here")}</button>
        </p>
      </div>
    </AuthShell>
  );
}
