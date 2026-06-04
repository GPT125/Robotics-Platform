import { create } from 'zustand';
import { notes as seedNotes, pickList as seedPickList } from '../data/mockData';
import type { AppMode, AppSettings, Conversation, Message, PickList, ScoutingNote, User } from '../types';

// ---- Honest production seeding -------------------------------------------------
// Production starts empty for new users (non-negotiable data rule). Demo/mock data
// only appears in clearly-labeled developer_mock mode. User-generated content
// (messages, favorites, notes) always starts empty — it is never placeholder.
const APP_MODE: AppMode = import.meta.env.DEV ? 'developer_mock' : 'production_empty';
const MOCK = APP_MODE === 'developer_mock';

export const ME_ID = 'me';
const EMPTY_PICK_LIST: PickList = { tiers: { A: [], B: [], C: [], D: [], Avoid: [] } };

// ---- localStorage persistence ------------------------------------------------
const PERSIST_KEY = 'robolab:state:v2';
type PersistedState = Pick<
  RoboLabState,
  'favorites' | 'compareTeams' | 'pickList' | 'notes' | 'settings' | 'user' | 'conversations' | 'messages' | 'activeConversationId'
>;

function loadPersisted(): Partial<PersistedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
  } catch {
    return {};
  }
}

function savePersisted(state: RoboLabState) {
  if (typeof window === 'undefined') return;
  try {
    const snapshot: PersistedState = {
      favorites: state.favorites,
      compareTeams: state.compareTeams,
      pickList: state.pickList,
      notes: state.notes,
      settings: state.settings,
      user: state.user,
      conversations: state.conversations,
      messages: state.messages,
      activeConversationId: state.activeConversationId,
    };
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable — keep working in-memory */
  }
}

type RoboLabState = {
  appMode: AppMode;
  user: User | null;
  signInSkipped: boolean;
  settings: AppSettings;
  favorites: string[];
  compareTeams: string[];
  pickList: PickList;
  notes: ScoutingNote[];
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string;
  signIn: (identity: { name?: string; email: string }) => void;
  skipSignIn: () => void;
  signOut: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleFavorite: (teamNumber: string) => void;
  addCompareTeam: (teamNumber: string) => void;
  removeCompareTeam: (teamNumber: string) => void;
  addNote: (note: ScoutingNote) => void;
  movePick: (tier: keyof PickList['tiers'], teamNumber: string) => void;
  setActiveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, body: string) => Message | null;
  appendMessage: (message: Message) => void;
  createConversation: (name: string, type?: Conversation['type']) => string;
  deleteConversation: (conversationId: string) => void;
};

const persisted = loadPersisted();

function nameFromEmail(email: string) {
  const base = email.split('@')[0] || 'You';
  return base
    .split(/[._-]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
    .trim() || 'You';
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'ME';
}

const defaultSettings: AppSettings = {
  program: 'V5RC',
  season: '2026-2027',
  teamNumber: '',
  teamName: '',
  school: '',
  theme: 'dark',
  accentColor: '#22D3EE',
  density: 'comfortable',
  mockDataEnabled: MOCK,
};

export const useRoboLabStore = create<RoboLabState>((rawSet, get) => {
  const set: typeof rawSet = ((partial: unknown, replace?: boolean) => {
    (rawSet as (p: unknown, r?: boolean) => void)(partial, replace);
    savePersisted(get());
  }) as typeof rawSet;

  return {
    appMode: APP_MODE,
    user: persisted.user ?? null,
    signInSkipped: false,
    settings: persisted.settings ?? defaultSettings,
    favorites: persisted.favorites ?? (MOCK ? ['39333Z', '13888A', '123A'] : []),
    compareTeams: persisted.compareTeams ?? (MOCK ? ['39333Z', '123A'] : []),
    pickList: persisted.pickList ?? (MOCK ? seedPickList : EMPTY_PICK_LIST),
    notes: persisted.notes ?? (MOCK ? seedNotes : []),
    conversations: persisted.conversations ?? [],
    messages: persisted.messages ?? [],
    activeConversationId: persisted.activeConversationId ?? '',

    signIn: ({ name, email }) => {
      const cleanEmail = email.trim().toLowerCase();
      const displayName = (name && name.trim()) || nameFromEmail(cleanEmail);
      set({
        signInSkipped: false,
        user: { id: ME_ID, name: displayName, email: cleanEmail, avatarUrl: initials(displayName), lastSeenAt: 'online' },
      });
    },
    skipSignIn: () => set({ signInSkipped: true }),
    signOut: () => set({ user: null, signInSkipped: false }),
    updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
    toggleFavorite: (teamNumber) =>
      set((state) => ({
        favorites: state.favorites.includes(teamNumber) ? state.favorites.filter((number) => number !== teamNumber) : [...state.favorites, teamNumber],
      })),
    addCompareTeam: (teamNumber) =>
      set((state) => ({
        compareTeams: state.compareTeams.includes(teamNumber) ? state.compareTeams : [...state.compareTeams, teamNumber].slice(0, 6),
      })),
    removeCompareTeam: (teamNumber) => set((state) => ({ compareTeams: state.compareTeams.filter((number) => number !== teamNumber) })),
    addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
    movePick: (tier, teamNumber) =>
      set((state) => {
        const nextTiers = Object.fromEntries(Object.entries(state.pickList.tiers).map(([key, numbers]) => [key, numbers.filter((number) => number !== teamNumber)])) as PickList['tiers'];
        nextTiers[tier] = [teamNumber, ...nextTiers[tier]];
        return { pickList: { tiers: nextTiers } };
      }),
    setActiveConversation: (conversationId) =>
      set((state) => ({
        activeConversationId: conversationId,
        conversations: state.conversations.map((conversation) => (conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation)),
      })),
    sendMessage: (conversationId, body) => {
      const text = body.trim();
      if (!text) return null;
      const message: Message = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversationId,
        senderId: ME_ID,
        body: text,
        messageType: 'text',
        createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        status: 'sent',
      };
      set((state) => ({
        messages: [...state.messages, message],
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, lastMessagePreview: text, updatedAt: 'now' } : conversation,
        ),
      }));
      return message;
    },
    appendMessage: (message) =>
      set((state) => ({
        messages: [...state.messages, message],
        conversations: state.conversations.map((conversation) =>
          conversation.id === message.conversationId
            ? { ...conversation, lastMessagePreview: message.messageType === 'ai_insight' ? 'RoboLab AI replied' : message.body, updatedAt: 'now' }
            : conversation,
        ),
      })),
    createConversation: (name, type = 'group') => {
      const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const conversation: Conversation = {
        id,
        workspaceId: 'ws-local',
        type,
        name: name.trim() || 'New chat',
        createdBy: ME_ID,
        createdAt: 'now',
        updatedAt: 'now',
        isPinned: false,
        isMuted: false,
        unreadCount: 0,
        memberIds: [ME_ID],
        lastMessagePreview: 'No messages yet',
      };
      set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: id }));
      return id;
    },
    deleteConversation: (conversationId) =>
      set((state) => {
        const conversations = state.conversations.filter((conversation) => conversation.id !== conversationId);
        return {
          conversations,
          messages: state.messages.filter((message) => message.conversationId !== conversationId),
          activeConversationId: state.activeConversationId === conversationId ? conversations[0]?.id ?? '' : state.activeConversationId,
        };
      }),
  };
});
