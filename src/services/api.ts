import { conversations, event, matches, messages, predictions, rankings, recommendations, skillsResults, teams } from '../data/mockData';
import type { AllianceRecommendation, Conversation, MatchPrediction, Message, ScoutingNote, Team } from '../types';

const delay = (ms = 260) => new Promise((resolve) => window.setTimeout(resolve, ms));

export type ApiResult<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

async function ok<T>(data: T, meta?: Record<string, unknown>): Promise<ApiResult<T>> {
  await delay();
  return { ok: true, data, meta };
}

export const api = {
  events: {
    search: () => ok([event], { route: 'GET /api/events/search', source: 'cache' }),
    byId: () => ok(event, { route: 'GET /api/events/:id', source: 'cache' }),
    matches: () => ok(matches, { route: 'GET /api/events/:id/matches', source: 'cache' }),
    rankings: () => ok(rankings, { route: 'GET /api/events/:id/rankings', source: 'cache' }),
    skills: () => ok(skillsResults, { route: 'GET /api/events/:id/skills', source: 'cache' }),
  },
  teams: {
    byNumber: (number: string) => ok(teams.find((team) => team.number.toLowerCase() === number.toLowerCase()) ?? teams[0], { route: 'GET /api/teams/:number' }),
    search: (query: string) =>
      ok(
        teams.filter((team) => `${team.number} ${team.name} ${team.organization}`.toLowerCase().includes(query.toLowerCase())),
        { source: 'mock + official adapter ready' },
      ),
  },
  scouting: {
    saveNote: (note: ScoutingNote) => ok(note, { route: 'POST /api/scouting/notes', queued: note.syncState !== 'synced' }),
  },
  compare: {
    run: (teamNumbers: string[]) => ok({ teams: teamNumbers, generatedAt: new Date().toISOString() }, { route: 'POST /api/compare' }),
  },
  alliance: {
    recommend: (): Promise<ApiResult<AllianceRecommendation[]>> => ok(recommendations, { route: 'POST /api/alliance/recommend' }),
  },
  matches: {
    predict: (): Promise<ApiResult<MatchPrediction[]>> => ok(predictions, { route: 'POST /api/matches/predict' }),
  },
  ai: {
    coach: (prompt: string) =>
      ok(
        {
          answer:
            'RoboLab AI would start with official match data, skills data, current rankings, and your scouting notes. Data is limited when scout trust is below 70, so recommendations stay editable.',
          prompt,
          confidence: 'Medium',
          dataSources: ['Official match data', 'Skills data', 'Scouting notes', 'Recent form'],
        },
        { route: 'POST /api/ai/coach' },
      ),
  },
  picklist: {
    update: (tier: string, teamNumber: string) => ok({ tier, teamNumber }, { route: 'POST /api/picklist/update' }),
  },
  messages: {
    conversations: (): Promise<ApiResult<Conversation[]>> => ok(conversations, { route: 'GET /api/messages/conversations' }),
    conversation: (id: string) => ok(conversations.find((conversation) => conversation.id === id) ?? conversations[0], { route: 'GET /api/messages/conversations/:id' }),
    messages: (conversationId: string): Promise<ApiResult<Message[]>> =>
      ok(
        messages.filter((message) => message.conversationId === conversationId),
        { route: 'GET /api/messages/conversations/:id/messages' },
      ),
    send: (message: Message) => ok(message, { route: 'POST /api/messages/conversations/:id/messages' }),
    summarize: () =>
      ok(
        {
          title: 'AI Strategy Summary',
          summary: 'The chat is focused on match Q34, alliance risk, and making sure 123A plays stable driver control. Confidence is medium because there are limited new scouting notes.',
          confidence: 'Medium',
          dataSources: ['Chat messages', 'Scouting notes', 'Match prediction'],
        },
        { route: 'POST /api/messages/ai/summarize' },
      ),
  },
};

export function teamByNumber(number: string): Team {
  return teams.find((team) => team.number === number) ?? teams[0];
}
