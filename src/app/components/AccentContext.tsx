import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const ACCENT_KEY = "robolab:accent";

export const ACCENT_COLORS = [
  { name: "Cyan", value: "#00c8ff", dark: "#08090f" },
  { name: "Violet", value: "#a855f7", dark: "#08090f" },
  { name: "Emerald", value: "#10b981", dark: "#08090f" },
  { name: "Amber", value: "#f59e0b", dark: "#08090f" },
  { name: "Rose", value: "#f43f5e", dark: "#08090f" },
  { name: "Orange", value: "#ff6b2b", dark: "#08090f" },
  { name: "Indigo", value: "#6366f1", dark: "#08090f" },
  { name: "Lime", value: "#84cc16", dark: "#08090f" },
];

interface AccentCtx {
  accent: string;
  setAccent: (v: string) => void;
}

const AccentContext = createContext<AccentCtx>({ accent: "#00c8ff", setAccent: () => {} });

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(() => {
    if (typeof window === "undefined") return "#00c8ff";
    return window.localStorage.getItem(ACCENT_KEY) || "#00c8ff";
  });
  const setAccent = (v: string) => {
    setAccentState(v);
    try { window.localStorage.setItem(ACCENT_KEY, v); } catch { /* ignore */ }
  };
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--primary", accent);
    document.documentElement.style.setProperty("--ring", accent);
  }, [accent]);
  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  return useContext(AccentContext);
}
