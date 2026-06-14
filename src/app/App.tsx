import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle, MessageCircle, Sparkles, Trophy, X } from "lucide-react";
import { AccentProvider } from "./components/AccentContext";
import { AppProvider, useApp, type AppNotification } from "./components/AppContext";
import { useAccent } from "./components/AccentContext";
import { Onboarding } from "./components/Onboarding";
import { setTranslationLanguage } from "../services/translate";
import { BottomNav } from "./components/BottomNav";
import { HomePage } from "./components/pages/HomePage";
import { LookupPage } from "./components/pages/LookupPage";
import { CoachPage } from "./components/pages/CoachPage";
import { ScoutPage } from "./components/pages/ScoutPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { TodoPage } from "./components/pages/TodoPage";
import { AlliancePage } from "./components/pages/AlliancePage";
import { AwardRadarPage } from "./components/pages/AwardRadarPage";
import { MatchupLabPage } from "./components/pages/MatchupLabPage";
import { GameManualPage } from "./components/pages/GameManualPage";

function greetingFor(name: string) {
  const hour = new Date().getHours();
  const label = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${label}, ${name}`;
}

function welcomeBody() {
  return "Welcome back to MatchMind.";
}

function toastColor(type?: AppNotification["type"], accent = "#00c8ff") {
  if (type === "match_win") return "#10b981";
  if (type === "match_loss") return "#ff6b2b";
  if (type === "award") return "#f59e0b";
  if (type === "message") return accent;
  if (type === "todo") return "#a855f7";
  return accent;
}

function ToastIcon({ type, color }: { type?: AppNotification["type"]; color: string }) {
  if (type === "award" || type === "match_win" || type === "match_loss") return <Trophy size={17} style={{ color }} />;
  if (type === "message") return <MessageCircle size={17} style={{ color }} />;
  if (type === "todo") return <CheckCircle size={17} style={{ color }} />;
  return <Sparkles size={17} style={{ color }} />;
}

function NotificationToast({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { accent } = useAccent();
  const { profile, team, todos, notifications, addNotification, markNotificationSeen } = useApp();
  const firstName = (profile?.name || team?.number || "driver").trim().split(/\s+/)[0] || "driver";
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const welcome = useMemo(() => ({
    id: "session-welcome",
    type: "info" as const,
    title: greetingFor(firstName),
    body: welcomeBody(),
    createdAt: Date.now(),
    seen: false,
  }), [firstName]);
  const activeStored = notifications.find((n) => !n.seen);
  const active = welcomeVisible ? welcome : activeStored;
  const color = toastColor(active?.type, accent);

  useEffect(() => {
    const timer = window.setTimeout(() => setWelcomeVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, [welcome.title]);

  useEffect(() => {
    if (!activeStored || welcomeVisible) return;
    const timer = window.setTimeout(() => markNotificationSeen(activeStored.id), 7600);
    return () => window.clearTimeout(timer);
  }, [activeStored?.id, markNotificationSeen, welcomeVisible]);

  useEffect(() => {
    if (!todos.length) return;
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    todos.forEach((todo) => {
      if (todo.done) return;
      const alertTime = todo.alertAt ? new Date(todo.alertAt).getTime() : null;
      const dueToday = todo.due === today;
      const shouldNotify = (alertTime != null && Number.isFinite(alertTime) && alertTime <= now) || dueToday;
      if (!shouldNotify) return;
      const marker = todo.alertAt || todo.due || today;
      const key = `matchmind:todo-reminder:${todo.id}:${marker}`;
      if (window.localStorage.getItem(key)) return;
      addNotification({
        type: "todo",
        title: dueToday ? `Today: ${todo.title}` : `Reminder: ${todo.title}`,
        body: `${todo.section || "Task"}${todo.priority ? ` · ${todo.priority}` : ""}${todo.assignee ? ` · assigned to ${todo.assignee}` : ""}.`,
      });
      window.localStorage.setItem(key, "1");
    });
  }, [addNotification, todos]);

  if (!active) return null;

  const go = () => {
    if (active.id !== "session-welcome") markNotificationSeen(active.id);
    else setWelcomeVisible(false);
    if (active.type === "todo") onNavigate("todos");
    if (active.type === "message") onNavigate("home");
    if (active.type === "match_win" || active.type === "match_loss" || active.type === "award") onNavigate("lookup");
  };

  return (
    <div style={{ position: "fixed", zIndex: 260, top: "max(calc(var(--rl-safe-top) - 2px), 6px)", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 24px)", maxWidth: 390, pointerEvents: "none" }}>
      {/* Dynamic Island-style pill: dark, rounded, expands from the notch. */}
      <div onClick={go} style={{ pointerEvents: "auto", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, background: "rgba(8,9,14,0.92)", border: `1px solid ${color}40`, boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 26px ${color}22`, borderRadius: 26, padding: "10px 12px", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", transformOrigin: "top center", animation: "islandIn 0.42s cubic-bezier(0.22,1.4,0.36,1)" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${color}1c`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 14px ${color}30` }}>
          <ToastIcon type={active.type} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13.5, color: "#f4f7ff", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.title}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#b8bdd6", lineHeight: 1.35, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.body}</p>
        </div>
        <button aria-label="Dismiss notification" onClick={(e) => { e.stopPropagation(); active.id === "session-welcome" ? setWelcomeVisible(false) : markNotificationSeen(active.id); }} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <X size={13} style={{ color: "#9aa0bf" }} />
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const [activePage, setActivePage] = useState(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path.includes("/teams") || path.includes("/events")) return "lookup";
    if (path.includes("/coach")) return "coach";
    if (path.includes("/scout")) return "scout";
    if (path.includes("/settings")) return "settings";
    return "home";
  });
  const [lookupResetKey, setLookupResetKey] = useState(0);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const { language } = useApp();

  // Translate the whole UI into the selected language at runtime (cached).
  useEffect(() => { setTranslationLanguage(language); }, [language]);

  const changePage = (id: string) => {
    if (id === "lookup" && activePage === "lookup") {
      setLookupResetKey((key) => key + 1);
    }
    setActivePage(id);
  };

  const pages: Record<string, React.ReactNode> = {
    home: <HomePage onNavigate={changePage} />,
    lookup: <LookupPage resetKey={lookupResetKey} onNavigate={changePage} />,
    coach: <CoachPage />,
    scout: <ScoutPage />,
    settings: <SettingsPage onSignIn={() => setForceOnboarding(true)} onNavigate={changePage} />,
    todos: <TodoPage onBack={() => changePage("home")} />,
    alliance: <AlliancePage onBack={() => changePage("home")} />,
    awardRadar: <AwardRadarPage onBack={() => changePage("home")} />,
    matchupLab: <MatchupLabPage onBack={() => changePage("home")} />,
    gameManual: <GameManualPage onBack={() => changePage("settings")} />,
  };

  const isSubPage = activePage === "todos" || activePage === "alliance" || activePage === "awardRadar" || activePage === "matchupLab" || activePage === "gameManual";

  return (
    <div style={{ minHeight: "100dvh", background: "#05060d", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, minHeight: "100dvh", background: "#08090f", position: "relative", overflowX: "hidden", overflowY: "visible" }}>
        <div
          style={{
            position: "fixed",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 320,
            height: 200,
            background: "radial-gradient(ellipse, rgba(0,200,255,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <NotificationToast onNavigate={changePage} />
        <div key={`${activePage}-${activePage === "lookup" ? lookupResetKey : 0}`} style={{ position: "relative", zIndex: 1, minHeight: "100dvh", animation: "pageIn 0.32s cubic-bezier(0.22,1,0.36,1)" }}>
          {pages[activePage]}
        </div>

        {!isSubPage ? <BottomNav active={activePage} onChange={changePage} /> : null}
        {activePage !== "settings" || forceOnboarding ? <Onboarding forceAuth={forceOnboarding} onComplete={() => setForceOnboarding(false)} /> : null}
      </div>
      <style>{`
        @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes islandIn { 0% { opacity: 0; transform: translateY(-10px) scaleX(0.5) scaleY(0.7); } 60% { opacity: 1; } 100% { opacity: 1; transform: translateY(0) scaleX(1) scaleY(1); } }
        button { -webkit-tap-highlight-color: transparent; transition: transform 0.16s cubic-bezier(0.22,1,0.36,1), filter 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease; }
        button:not(:disabled):hover { filter: brightness(1.08); }
        button:not(:disabled):active { transform: scale(0.96); filter: brightness(0.96); }
        button:disabled { cursor: default; }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AccentProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AccentProvider>
  );
}
