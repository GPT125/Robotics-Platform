import { create } from 'zustand';
import { conversations as seedConversations, messages as seedMessages, notes as seedNotes, pickList as seedPickList, teams } from '../data/mockData';
import type { Conversation, Message, PickList, ScoutingNote } from '../types';

type RoboLabState = {
  favorites: string[];
  compareTeams: string[];
  pickList: PickList;
  notes: ScoutingNote[];
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string;
  toggleFavorite: (teamNumber: string) => void;
  addCompareTeam: (teamNumber: string) => void;
  addNote: (note: ScoutingNote) => void;
  movePick: (tier: keyof PickList['tiers'], teamNumber: string) => void;
  setActiveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, body: string) => void;
  createConversation: (name: string, memberIds: string[]) => string;
};

export const useRoboLabStore = create<RoboLabState>((set) => ({
  favorites: ['39333Z', '13888A', '123A'],
  compareTeams: ['39333Z', '123A', '315R'],
  pickList: seedPickList,
  notes: seedNotes,
  conversations: seedConversations,
  messages: seedMessages,
  activeConversationId: 'c1',
  toggleFavorite: (teamNumber) =>
    set((state) => ({
      favorites: state.favorites.includes(teamNumber) ? state.favorites.filter((number) => number !== teamNumber) : [...state.favorites, teamNumber],
    })),
  addCompareTeam: (teamNumber) =>
    set((state) => ({
      compareTeams: state.compareTeams.includes(teamNumber) ? state.compareTeams : [...state.compareTeams, teamNumber].slice(0, 6),
    })),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  movePick: (tier, teamNumber) =>
    set((state) => {
      const nextTiers = Object.fromEntries(Object.entries(state.pickList.tiers).map(([key, numbers]) => [key, numbers.filter((number) => number !== teamNumber)])) as PickList['tiers'];
      nextTiers[tier] = [teamNumber, ...nextTiers[tier]];
      return { pickList: { tiers: nextTiers } };
    }),
  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),
  sendMessage: (conversationId, body) =>
    set((state) => {
      const message: Message = {
        id: `m-local-${Date.now()}`,
        conversationId,
        senderId: 'u1',
        body,
        messageType: body.toLowerCase().startsWith('@ai') ? 'ai_insight' : 'text',
        createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        status: navigator.onLine ? 'sent' : 'sending',
      };
      return {
        messages: [...state.messages, message],
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessagePreview: body,
                updatedAt: message.createdAt,
              }
            : conversation,
        ),
      };
    }),
  createConversation: (name, memberIds) => {
    const id = `c-local-${Date.now()}`;
    const firstTeam = teams.find((team) => name.includes(team.number));
    const conversation: Conversation = {
      id,
      workspaceId: 'ws-8059',
      type: memberIds.length > 2 ? 'group' : 'direct',
      name,
      createdBy: 'u1',
      createdAt: 'now',
      updatedAt: 'now',
      contextType: firstTeam ? 'team' : undefined,
      contextId: firstTeam?.number,
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      memberIds,
      lastMessagePreview: 'New workspace chat created.',
    };
    set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: id }));
    return id;
  },
}));
