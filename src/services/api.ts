import { conversations, event, matches, messages, predictions, rankings, recommendations, robotVisionAnalysis, skillsResults, teams, tournaments } from '../data/mockData';
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
    search: () => ok(tournaments, { route: 'GET /api/events/search', source: 'server cache' }),
    byId: () => ok(event, { route: 'GET /api/events/:id', source: 'cache' }),
    matches: () => ok(matches, { route: 'GET /api/events/:id/matches', source: 'cache' }),
    rankings: () => ok(rankings, { route: 'GET /api/events/:id/rankings', source: 'cache' }),
    skills: () => ok(skillsResults, { route: 'GET /api/events/:id/skills', source: 'cache' }),
  },
  tournaments: {
    search: (query: string) =>
      ok(
        tournaments.filter((tournament) => `${tournament.name} ${tournament.sku} ${tournament.city} ${tournament.state}`.toLowerCase().includes(query.toLowerCase())),
        { route: 'GET /api/tournaments/search', source: 'server cache' },
      ),
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
  robotLab: {
    analyze: () => ok(robotVisionAnalysis, { route: 'POST /api/robot-lab/analyze', source: 'AI + official VEX catalog adapter' }),
    partsCatalog: () => ok(robotVisionAnalysis.parts, { route: 'GET /api/robot-lab/parts-catalog', source: 'official VEX catalog cache' }),
  },
};

export function teamByNumber(number: string): Team {
  return teams.find((team) => team.number === number) ?? teams[0];
}

// ---- Real server-backed AI Coach (keys stay server-side in vite.config) ----
export type CoachSource = { title: string; url: string; blurb: string };
export type CoachChatMessage = { role: 'user' | 'assistant'; content: string };
export type CoachResponse = {
  answer: string;
  provider: string;
  model: string | null;
  confidence: 'High' | 'Medium' | 'Low';
  sources: CoachSource[];
  models?: string[];
  hasVision?: boolean;
  dataSources: string[];
};

export async function askCoach(input: { messages: CoachChatMessage[]; context?: string; images?: string[] }): Promise<CoachResponse> {
  const response = await fetch('/api/ai/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: CoachResponse; error?: { message?: string } };
  if (!response.ok || !json.ok || !json.data) {
    throw new Error(json.error?.message ?? `Coach request failed (${response.status})`);
  }
  return json.data;
}

export type IntegrationStatus = { key: string; feature: string; configured: boolean };

export async function fetchIntegrationStatus(): Promise<IntegrationStatus[]> {
  const response = await fetch('/api/integrations/status');
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: IntegrationStatus[] };
  if (!response.ok || !json.ok || !json.data) throw new Error(`Status request failed (${response.status})`);
  return json.data;
}

export type GoogleAuthStatus = {
  configured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUriConfigured: boolean;
};

export type GoogleAuthSession = {
  email: string;
  name: string;
  avatarUrl: string;
  lastSeenAt: string;
};

export async function fetchGoogleAuthStatus(): Promise<GoogleAuthStatus> {
  const response = await fetch('/api/auth/google/status');
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: GoogleAuthStatus };
  if (!response.ok || !json.ok || !json.data) throw new Error(`Google auth status failed (${response.status})`);
  return json.data;
}

export async function startGoogleAuth(email?: string): Promise<boolean> {
  try {
    const status = await fetchGoogleAuthStatus();
    if (!status.configured) return false;
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    window.location.assign(`/api/auth/google/start${query}`);
    return true;
  } catch {
    return false;
  }
}

export async function fetchGoogleAuthSession(): Promise<GoogleAuthSession | null> {
  const response = await fetch('/api/auth/google/session');
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: GoogleAuthSession | null };
  if (!response.ok || !json.ok) return null;
  return json.data ?? null;
}
