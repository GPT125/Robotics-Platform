import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type RoboTeam = {
  id: number;
  number: string;
  team_name: string;
  organization: string;
  location?: { city?: string; region?: string; country?: string };
  program?: { code?: string; name?: string };
  grade?: string;
};

export type Teammate = { id: string; name: string; email: string; status: "invited" | "joined" };

export type SubTask = { id: string; title: string; done: boolean };
export type Todo = {
  id: string;
  title: string;
  done: boolean;
  priority: "critical" | "high" | "medium" | "low" | null;
  tags: string[];
  due: string | null;
  assignee: string | null;
  notes: string;
  subtasks: SubTask[];
  shared: boolean;
  createdAt: number;
};

export type Profile = { name: string; email: string | null; avatar: string };

type AppState = {
  onboarded: boolean;
  signedIn: boolean;
  isGuest: boolean;
  profile: Profile | null;
  team: RoboTeam | null;
  teammates: Teammate[];
  todos: Todo[];
};

type AppCtx = AppState & {
  signInGoogle: (p: { name: string; email: string; picture?: string }) => void;
  continueAsGuest: () => void;
  signOut: () => void;
  setOnboarded: (v: boolean) => void;
  setTeam: (team: RoboTeam | null) => void;
  updateProfile: (p: Partial<Profile>) => void;
  addTeammate: (t: { name: string; email: string }) => void;
  removeTeammate: (id: string) => void;
  addTodo: (t: Partial<Todo> & { title: string }) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
};

const KEY = "robolab:app:v1";
const initial: AppState = { onboarded: false, signedIn: false, isGuest: false, profile: null, team: null, teammates: [], todos: [] };

function load(): AppState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...initial, ...(JSON.parse(raw) as AppState) } : initial;
  } catch {
    return initial;
  }
}

const Ctx = createContext<AppCtx>({} as AppCtx);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "ME";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const value: AppCtx = {
    ...state,
    signInGoogle: ({ name, email, picture }) =>
      setState((s) => ({ ...s, signedIn: true, isGuest: false, profile: { name: name || email.split("@")[0], email, avatar: s.profile?.avatar || picture || initials(name || email) } })),
    continueAsGuest: () => setState((s) => ({ ...s, isGuest: true, signedIn: false, onboarded: true, profile: s.profile ?? { name: "Guest", email: null, avatar: "🤖" } })),
    signOut: () => setState((s) => ({ ...initial, todos: s.todos })),
    setOnboarded: (v) => setState((s) => ({ ...s, onboarded: v })),
    setTeam: (team) => setState((s) => ({ ...s, team })),
    updateProfile: (p) => setState((s) => ({ ...s, profile: { name: p.name ?? s.profile?.name ?? "You", email: p.email ?? s.profile?.email ?? null, avatar: p.avatar ?? s.profile?.avatar ?? "🤖" } })),
    addTeammate: (t) => setState((s) => ({ ...s, teammates: [...s.teammates, { id: uid(), name: t.name, email: t.email, status: "invited" }] })),
    removeTeammate: (id) => setState((s) => ({ ...s, teammates: s.teammates.filter((x) => x.id !== id) })),
    addTodo: (t) =>
      setState((s) => ({
        ...s,
        todos: [
          { id: uid(), title: t.title, done: false, priority: t.priority ?? null, tags: t.tags ?? [], due: t.due ?? null, assignee: t.assignee ?? null, notes: t.notes ?? "", subtasks: t.subtasks ?? [], shared: t.shared ?? false, createdAt: Date.now() },
          ...s.todos,
        ],
      })),
    updateTodo: (id, patch) => setState((s) => ({ ...s, todos: s.todos.map((td) => (td.id === id ? { ...td, ...patch } : td)) })),
    toggleTodo: (id) => setState((s) => ({ ...s, todos: s.todos.map((td) => (td.id === id ? { ...td, done: !td.done } : td)) })),
    deleteTodo: (id) => setState((s) => ({ ...s, todos: s.todos.filter((td) => td.id !== id) })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  return useContext(Ctx);
}
