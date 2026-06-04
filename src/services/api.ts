// Frontend API client. All secrets stay server-side (see vite.config.ts middleware).

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

// Generic RobotEvents proxy passthrough (server attaches the token).
export async function robotEvents<T = unknown>(pathAndQuery: string): Promise<T> {
  const response = await fetch(`/api/robotevents${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`);
  if (!response.ok) throw new Error(`RobotEvents request failed (${response.status})`);
  return (await response.json()) as T;
}

export type RoboTeamResult = {
  id: number;
  number: string;
  team_name: string;
  organization: string;
  location?: { city?: string; region?: string; country?: string };
  program?: { code?: string; name?: string };
  grade?: string;
};

// Validate/lookup a team by its exact number via RobotEvents (forces a real team).
export async function searchTeams(number: string): Promise<RoboTeamResult[]> {
  const q = number.trim().toUpperCase();
  if (!q) return [];
  try {
    const json = await robotEvents<{ data?: RoboTeamResult[] }>(`/teams?number%5B%5D=${encodeURIComponent(q)}&per_page=12`);
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export type RoboEvent = {
  id: number;
  sku: string;
  name: string;
  start: string;
  end: string;
  season?: { id: number; name: string };
  location?: { city?: string; region?: string; country?: string };
};

export async function teamEvents(teamId: number): Promise<RoboEvent[]> {
  try {
    const json = await robotEvents<{ data?: RoboEvent[] }>(`/teams/${teamId}/events?per_page=50`);
    return Array.isArray(json.data) ? json.data.sort((a, b) => (a.start < b.start ? 1 : -1)) : [];
  } catch {
    return [];
  }
}
