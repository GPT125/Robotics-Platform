import { useState } from "react";
import { AccentProvider } from "./components/AccentContext";
import { AppProvider } from "./components/AppContext";
import { Onboarding } from "./components/Onboarding";
import { BottomNav } from "./components/BottomNav";
import { HomePage } from "./components/pages/HomePage";
import { LookupPage } from "./components/pages/LookupPage";
import { CoachPage } from "./components/pages/CoachPage";
import { ScoutPage } from "./components/pages/ScoutPage";
import { MessagesPage } from "./components/pages/MessagesPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { TodoPage } from "./components/pages/TodoPage";

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path.includes("/teams") || path.includes("/events")) return "lookup";
    if (path.includes("/coach")) return "coach";
    if (path.includes("/scout")) return "scout";
    if (path.includes("/messages")) return "messages";
    if (path.includes("/settings")) return "settings";
    return "home";
  });
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const pages: Record<string, React.ReactNode> = {
    home: <HomePage onNavigate={setActivePage} />,
    lookup: <LookupPage />,
    coach: <CoachPage />,
    scout: <ScoutPage />,
    messages: <MessagesPage />,
    settings: <SettingsPage onSignIn={() => setForceOnboarding(true)} />,
    todos: <TodoPage onBack={() => setActivePage("home")} />,
  };

  const isSubPage = activePage === "todos";

  return (
    <AccentProvider>
      <AppProvider>
        <div style={{ minHeight: "100dvh", background: "#05060d", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 430, minHeight: "100dvh", background: "#08090f", position: "relative", overflow: "hidden" }}>
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
            <div key={activePage} style={{ position: "relative", zIndex: 1, minHeight: "100dvh", animation: "pageIn 0.32s cubic-bezier(0.22,1,0.36,1)" }}>
              {pages[activePage]}
            </div>

            {!isSubPage ? <BottomNav active={activePage} onChange={setActivePage} /> : null}
            {activePage !== "settings" || forceOnboarding ? <Onboarding /> : null}
          </div>
        </div>
        <style>{`
          @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          button { -webkit-tap-highlight-color: transparent; }
          button:active { transform: scale(0.97); }
          ::-webkit-scrollbar { width: 0; height: 0; }
        `}</style>
      </AppProvider>
    </AccentProvider>
  );
}
