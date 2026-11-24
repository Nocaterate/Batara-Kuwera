// Signed-in layout: sidebar navigation and top bar.
import { Shield, LayoutDashboard, Users, Settings as SettingsIcon, MessageSquare, LogOut, Menu, Target } from "lucide-react";
import { useLang } from "./i18n.js";
import { cn } from "./ui.js";
import { HealthBadge } from "./components/common.jsx";
import { LOGO_SRC } from "./theme.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "goals", label: "Goals", icon: Target },
  { id: "experts", label: "Experts", icon: Users },
  { id: "subscription", label: "Subscription", icon: Shield },
  { id: "chat", label: "Smart Coach", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function AppShell({ page, setPage, onLogout, T, healthStatus, userName, sidebarOpen, setSidebarOpen, children }) {
  const { t } = useLang();
  return (
    <div className={cn("flex min-h-screen", T.bg)}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/50 md:hidden" />}

      <aside className={cn(
        "fixed z-40 flex h-full w-60 flex-col border-r transition-transform md:static md:translate-x-0",
        T.sidebarBg, T.border, sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("flex items-center gap-2 border-b px-5 py-5", T.border)}>
          <img src={LOGO_SRC} alt="Batara Kuwera" className="h-8 w-8 rounded-lg object-cover" />
          <span className={cn("font-display text-lg font-bold", T.text)}>BATARA KUWERA</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors",
                  active ? cn("border-red-600 bg-red-600/10", T.accent) : cn("border-transparent", T.subtext, T.hoverBg)
                )}
              >
                <Icon size={16} /> {t(item.label)}
              </button>
            );
          })}
        </nav>

        <div className={cn("border-t p-4", T.border)}>
          <div className="mb-3 flex items-center justify-between">
            <span className={cn("text-xs", T.mutedText)}>{t("Status")}</span>
            <HealthBadge status={healthStatus} T={T} />
          </div>
          <div className={cn("mb-3 truncate text-sm font-medium", T.text)}>{userName || t("Guest")}</div>
          <button onClick={onLogout} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm", T.subtext, T.hoverBg)}>
            <LogOut size={15} /> {t("Log out")}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className={cn("flex items-center gap-3 border-b px-4 py-3 md:hidden", T.border, T.panel)}>
          <button onClick={() => setSidebarOpen(true)} className={T.text}><Menu size={20} /></button>
          <img src={LOGO_SRC} alt="Batara Kuwera" className="h-6 w-6 rounded-md object-cover" />
          <span className={cn("font-display font-bold", T.text)}>BATARA KUWERA</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
