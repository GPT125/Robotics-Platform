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
export type AppAttachment = { id: string; kind: "image" | "video" | "file"; name: string; url: string };
export type Todo = {
  id: string;
  title: string;
  done: boolean;
  status: "todo" | "doing" | "blocked" | "done";
  priority: "critical" | "high" | "medium" | "low" | null;
  tags: string[];
  due: string | null;
  alertAt: string | null;
  assignee: string | null;
  notes: string;
  subtasks: SubTask[];
  attachments: AppAttachment[];
  comments: string[];
  section: string;
  flagged: boolean;
  repeat: "none" | "daily" | "weekly" | "event";
  shared: boolean;
  createdAt: number;
};

export type Profile = { name: string; email: string | null; avatar: string };
export type ScoutRatings = { autonomous: number; driver: number; endgame: number; defense: number; consistency: number };
export type ScoutNote = {
  id: string;
  teamId: string;
  teamName: string;
  matchId?: string;
  matchLabel?: string;
  eventId?: number;
  eventName?: string;
  allianceColor?: "red" | "blue";
  opponents?: string[];
  result?: "win" | "loss" | "tie" | "unscored";
  score?: string;
  tags: string[];
  description: string;
  ratings: ScoutRatings;
  images: string[];
  date: string;
  createdAt: number;
  authorName?: string;
};

export type ChatAttachment = { id: string; kind: "image" | "video"; name: string; url: string };
export type ChatMessage = {
  id: string;
  role: "me" | "them" | "system" | "ai";
  senderName: string;
  senderAvatar?: string;
  text: string;
  time: string;
  createdAt: number;
  status: "waiting" | "sending" | "sent" | "failed";
  attachments: ChatAttachment[];
  reactions?: string[];
};
export type Conversation = {
  id: string;
  name: string;
  email: string;
  teamId?: string;
  type: "direct" | "group" | "event" | "match" | "alliance" | "robot";
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
  messages: ChatMessage[];
  createdAt: number;
};

export type AppNotification = {
  id: string;
  type: "match_win" | "match_loss" | "award" | "message" | "todo" | "info";
  title: string;
  body: string;
  createdAt: number;
  seen: boolean;
};

export type PredictionFeedback = { id: string; matchId: string; predicted: string; actual: string; createdAt: number };
export type Favorite = {
  id: string;
  kind: "team" | "event";
  label: string;
  sublabel?: string;
  program?: string;
  grade?: string;
  payload?: unknown;
  createdAt: number;
};

export type UserRole = "student" | "coach" | "parent";

type AppState = {
  onboarded: boolean;
  signedIn: boolean;
  isGuest: boolean;
  profile: Profile | null;
  role: UserRole | null;
  language: string;
  agreedLegal: boolean;
  team: RoboTeam | null;
  teams: RoboTeam[];
  teammates: Teammate[];
  todos: Todo[];
  scoutNotes: ScoutNote[];
  conversations: Conversation[];
  notifications: AppNotification[];
  predictionFeedback: PredictionFeedback[];
  favorites: Favorite[];
};

type AppCtx = AppState & {
  signInGoogle: (p: { name: string; email: string; picture?: string }) => void;
  continueAsGuest: () => void;
  signOut: () => void;
  setOnboarded: (v: boolean) => void;
  setRole: (role: UserRole | null) => void;
  setLanguage: (language: string) => void;
  setAgreedLegal: (v: boolean) => void;
  setTeams: (teams: RoboTeam[]) => void;
  setTeam: (team: RoboTeam | null) => void;
  updateProfile: (p: Partial<Profile>) => void;
  addTeammate: (t: { name: string; email: string }) => void;
  removeTeammate: (id: string) => void;
  addTodo: (t: Partial<Todo> & { title: string }) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addScoutNote: (n: Omit<ScoutNote, "id" | "createdAt" | "authorName">) => void;
  updateScoutNote: (id: string, patch: Partial<Omit<ScoutNote, "id" | "createdAt">>) => void;
  deleteScoutNote: (id: string) => void;
  toggleFavorite: (favorite: Omit<Favorite, "id" | "createdAt">) => void;
  isFavorite: (kind: Favorite["kind"], label: string) => boolean;
  addConversation: (c: { name: string; email: string; teamId?: string; type?: Conversation["type"] }) => Conversation;
  sendConversationMessage: (conversationId: string, m: { text: string; attachments?: ChatAttachment[] }) => void;
  toggleMessageReaction: (conversationId: string, messageId: string, reaction: string) => void;
  markConversationRead: (conversationId: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "seen">) => void;
  markNotificationSeen: (id: string) => void;
  markNotificationsSeen: () => void;
  addPredictionFeedback: (f: Omit<PredictionFeedback, "id" | "createdAt">) => void;
};

const KEY = "matchmind:app:v1";
const LEGACY_KEY = "robolab:app:v1";
const initial: AppState = {
  onboarded: false,
  signedIn: false,
  isGuest: false,
  profile: null,
  role: null,
  language: "en",
  agreedLegal: false,
  team: null,
  teams: [],
  teammates: [],
  todos: [],
  scoutNotes: [],
  conversations: [],
  notifications: [],
  predictionFeedback: [],
  favorites: [],
};

function normalizeTodo(t: Partial<Todo> & { id?: string; title?: string; createdAt?: number }): Todo {
  return {
    id: t.id ?? uid(),
    title: t.title ?? "Untitled task",
    done: Boolean(t.done),
    status: t.status ?? (t.done ? "done" : "todo"),
    priority: t.priority ?? null,
    tags: t.tags ?? [],
    due: t.due ?? null,
    alertAt: t.alertAt ?? null,
    assignee: t.assignee ?? null,
    notes: t.notes ?? "",
    subtasks: t.subtasks ?? [],
    attachments: t.attachments ?? [],
    comments: t.comments ?? [],
    section: t.section ?? "General",
    flagged: Boolean(t.flagged),
    repeat: t.repeat ?? "none",
    shared: Boolean(t.shared),
    createdAt: t.createdAt ?? Date.now(),
  };
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function load(): AppState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initial,
      ...parsed,
      role: parsed.role ?? null,
      language: parsed.language ?? "en",
      agreedLegal: Boolean(parsed.agreedLegal),
      teams: parsed.teams ?? (parsed.team ? [parsed.team] : []),
      teammates: parsed.teammates ?? [],
      todos: (parsed.todos ?? []).map(normalizeTodo),
      scoutNotes: parsed.scoutNotes ?? [],
      conversations: parsed.conversations ?? [],
      notifications: parsed.notifications ?? [],
      predictionFeedback: parsed.predictionFeedback ?? [],
      favorites: parsed.favorites ?? [],
    };
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
      setState((s) => ({
        ...s,
        signedIn: true,
        isGuest: false,
        profile: { name: name || email.split("@")[0], email, avatar: s.profile?.avatar || picture || initials(name || email) },
        notifications: [
          {
            id: uid(),
            type: "info" as const,
            title: "Welcome to MatchMind",
            body: "Your robotics command center is ready. Select your team to unlock live match results, awards, scouting notes, and AI strategy.",
            createdAt: Date.now(),
            seen: false,
          },
          ...s.notifications,
        ].slice(0, 20),
      })),
    // Guests still walk the full popup flow (name -> role -> language -> team
    // -> legal); `onboarded` is only set true at the end of the legal step, so
    // we must NOT mark them onboarded here or the flow would be skipped.
    continueAsGuest: () => setState((s) => ({
      ...s,
      isGuest: true,
      signedIn: false,
      profile: s.profile ?? { name: "Guest", email: null, avatar: "MM" },
      notifications: [
        {
            id: uid(),
            type: "info" as const,
          title: "Welcome to MatchMind",
          body: "Your competition dashboard is ready. Pick a team to unlock live matches, stats, awards, reminders, and AI strategy.",
          createdAt: Date.now(),
          seen: false,
        },
        ...s.notifications,
      ].slice(0, 20),
    })),
    signOut: () => setState((s) => ({ ...initial, todos: s.todos })),
    setOnboarded: (v) => setState((s) => ({ ...s, onboarded: v })),
    setRole: (role) => setState((s) => ({ ...s, role })),
    setLanguage: (language) => setState((s) => ({ ...s, language })),
    setAgreedLegal: (v) => setState((s) => ({ ...s, agreedLegal: v })),
    setTeams: (teams) => setState((s) => ({ ...s, teams, team: teams[0] ?? null })),
    setTeam: (team) => setState((s) => ({
      ...s,
      team,
      teams: team ? [team, ...s.teams.filter((t) => t.id !== team.id)] : s.teams,
    })),
    updateProfile: (p) => setState((s) => ({ ...s, profile: { name: p.name ?? s.profile?.name ?? "You", email: p.email ?? s.profile?.email ?? null, avatar: p.avatar ?? s.profile?.avatar ?? "🤖" } })),
    addTeammate: (t) => setState((s) => ({ ...s, teammates: [...s.teammates, { id: uid(), name: t.name, email: t.email, status: "invited" }] })),
    removeTeammate: (id) => setState((s) => ({ ...s, teammates: s.teammates.filter((x) => x.id !== id) })),
    addTodo: (t) =>
      setState((s) => ({
        ...s,
        todos: [
          normalizeTodo({ ...t, id: uid(), done: false, createdAt: Date.now() }),
          ...s.todos,
        ],
      })),
    updateTodo: (id, patch) => setState((s) => ({ ...s, todos: s.todos.map((td) => (td.id === id ? normalizeTodo({ ...td, ...patch }) : td)) })),
    toggleTodo: (id) => setState((s) => ({ ...s, todos: s.todos.map((td) => (td.id === id ? normalizeTodo({ ...td, done: !td.done, status: !td.done ? "done" : "todo" }) : td)) })),
    deleteTodo: (id) => setState((s) => ({ ...s, todos: s.todos.filter((td) => td.id !== id) })),
    addScoutNote: (note) =>
      setState((s) => ({
        ...s,
        scoutNotes: [{ ...note, id: uid(), createdAt: Date.now(), authorName: s.profile?.name ?? "Guest" }, ...s.scoutNotes],
      })),
    updateScoutNote: (id, patch) => setState((s) => ({
      ...s,
      scoutNotes: s.scoutNotes.map((note) => note.id === id ? { ...note, ...patch } : note),
    })),
    deleteScoutNote: (id) => setState((s) => ({ ...s, scoutNotes: s.scoutNotes.filter((n) => n.id !== id) })),
    toggleFavorite: (favorite) => setState((s) => {
      const key = `${favorite.kind}:${favorite.label.toLowerCase()}`;
      const exists = s.favorites.some((item) => `${item.kind}:${item.label.toLowerCase()}` === key);
      return {
        ...s,
        favorites: exists
          ? s.favorites.filter((item) => `${item.kind}:${item.label.toLowerCase()}` !== key)
          : [{ ...favorite, id: uid(), createdAt: Date.now() }, ...s.favorites].slice(0, 60),
      };
    }),
    isFavorite: (kind, label) => state.favorites.some((item) => item.kind === kind && item.label.toLowerCase() === label.toLowerCase()),
    addConversation: (c) => {
      const convo: Conversation = {
        id: uid(),
        name: c.name.trim(),
        email: c.email.trim().toLowerCase(),
        teamId: c.teamId?.trim() || undefined,
        type: c.type ?? "direct",
        lastMessage: "New conversation",
        lastTime: getTime(),
        unread: 0,
        online: false,
        messages: [
          {
            id: uid(),
            role: "system",
            senderName: "MatchMind",
            text: `Conversation opened with ${c.name.trim()} inside this MatchMind workspace.`,
            time: getTime(),
            createdAt: Date.now(),
            status: "sent",
            attachments: [],
            reactions: [],
          },
        ],
        createdAt: Date.now(),
      };
      setState((s) => ({ ...s, conversations: [convo, ...s.conversations] }));
      return convo;
    },
    sendConversationMessage: (conversationId, m) =>
      setState((s) => {
        const text = m.text.trim();
        const profile = s.profile ?? { name: "You", email: null, avatar: "MM" };
        return {
          ...s,
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: uid(),
                      role: "me",
                      senderName: profile.name,
                      senderAvatar: profile.avatar,
                      text,
                      time: getTime(),
                      createdAt: Date.now(),
                      status: navigator.onLine ? "sent" : "waiting",
                      attachments: m.attachments ?? [],
                      reactions: [],
                    },
                  ],
                  lastMessage: text || (m.attachments?.length ? "Shared media" : "Message"),
                  lastTime: getTime(),
                }
              : c,
          ),
        };
      }),
    toggleMessageReaction: (conversationId, messageId, reaction) =>
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((conversation) =>
          conversation.id !== conversationId ? conversation : {
            ...conversation,
            messages: conversation.messages.map((message) => {
              if (message.id !== messageId) return message;
              const existing = message.reactions ?? [];
              return { ...message, reactions: existing.includes(reaction) ? existing.filter((r) => r !== reaction) : [...existing, reaction] };
            }),
          },
        ),
      })),
    markConversationRead: (conversationId) => setState((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)) })),
    addNotification: (n) => setState((s) => ({ ...s, notifications: [{ ...n, id: uid(), createdAt: Date.now(), seen: false }, ...s.notifications].slice(0, 20) })),
    markNotificationSeen: (id) => setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, seen: true } : n)) })),
    markNotificationsSeen: () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, seen: true })) })),
    addPredictionFeedback: (f) => setState((s) => ({ ...s, predictionFeedback: [{ ...f, id: uid(), createdAt: Date.now() }, ...s.predictionFeedback].slice(0, 100) })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  return useContext(Ctx);
}
