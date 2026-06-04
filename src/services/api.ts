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
  event_type?: string;
  divisions?: Array<{ id: number; name: string }>;
  season?: { id: number; name: string };
  location?: { city?: string; region?: string; country?: string };
  level?: string;
};

export type RoboAward = {
  id?: number;
  title?: string;
  name?: string;
  event?: { id?: number; name?: string };
  qualifications?: string[];
  teamWinners?: Array<{ team?: RoboTeamResult; number?: string; team_number?: string; team_name?: string; name?: string; id?: number }>;
  team_winners?: Array<{ team?: RoboTeamResult; number?: string; team_number?: string; team_name?: string; name?: string; id?: number }>;
  winners?: Array<{ team?: RoboTeamResult; number?: string; team_number?: string; team_name?: string; name?: string; id?: number }>;
  teams?: Array<{ team?: RoboTeamResult; number?: string; team_number?: string; team_name?: string; name?: string; id?: number }>;
  team?: RoboTeamResult;
  teamNumber?: string;
  team_number?: string;
  team_name?: string;
};

export type RoboRanking = {
  id?: number;
  rank?: number;
  team?: RoboTeamResult;
  team_id?: number;
  team_number?: string;
  wins?: number;
  losses?: number;
  ties?: number;
  wp?: number;
  ap?: number;
  sp?: number;
  high_score?: number;
  average_points?: number;
};

export type RoboSkills = {
  id?: number;
  rank?: number;
  team?: RoboTeamResult;
  team_id?: number;
  team_number?: string;
  score?: number;
  programming?: number;
  driver?: number;
  autonomous?: number;
};

export type RoboAlliance = {
  color?: "red" | "blue" | string;
  score?: number | null;
  teams?: Array<{ team?: RoboTeamResult; number?: string; team_name?: string; id?: number } | RoboTeamResult>;
};

export type RoboMatch = {
  id: number;
  name?: string;
  round?: number;
  instance?: number;
  matchnum?: number;
  field?: string;
  scheduled?: string | null;
  started?: string | null;
  scored?: boolean;
  alliances?: RoboAlliance[];
  event?: { id?: number; name?: string; sku?: string };
  division?: { id?: number; name?: string };
};

type DataList<T> = { data?: T[] };

export async function teamEvents(teamId: number): Promise<RoboEvent[]> {
  try {
    const json = await robotEvents<{ data?: RoboEvent[] }>(`/teams/${teamId}/events?per_page=50`);
    return Array.isArray(json.data) ? json.data.sort((a, b) => (a.start < b.start ? 1 : -1)) : [];
  } catch {
    return [];
  }
}

export async function searchEvents(query: string): Promise<RoboEvent[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const attempts = [`/events?search=${encodeURIComponent(q)}&per_page=30`, `/events?sku%5B%5D=${encodeURIComponent(q)}&per_page=30`];
  for (const path of attempts) {
    try {
      const json = await robotEvents<DataList<RoboEvent>>(path);
      if (Array.isArray(json.data) && json.data.length) return json.data.sort((a, b) => (a.start < b.start ? 1 : -1));
    } catch {
      // Try the next supported RobotEvents query shape.
    }
  }
  return [];
}

export async function teamMatches(teamId: number): Promise<RoboMatch[]> {
  try {
    const json = await robotEvents<DataList<RoboMatch>>(`/teams/${teamId}/matches?per_page=100`);
    return Array.isArray(json.data) ? json.data.sort((a, b) => String(b.scheduled ?? b.started ?? "").localeCompare(String(a.scheduled ?? a.started ?? ""))) : [];
  } catch {
    return [];
  }
}

export async function teamAwards(teamId: number): Promise<RoboAward[]> {
  try {
    const json = await robotEvents<DataList<RoboAward>>(`/teams/${teamId}/awards?per_page=100`);
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function eventTeams(eventId: number): Promise<RoboTeamResult[]> {
  try {
    const json = await robotEvents<DataList<RoboTeamResult>>(`/events/${eventId}/teams?per_page=250`);
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function eventMatches(eventId: number): Promise<RoboMatch[]> {
  try {
    const json = await robotEvents<DataList<RoboMatch>>(`/events/${eventId}/matches?per_page=250`);
    return Array.isArray(json.data) ? json.data.sort((a, b) => (a.matchnum ?? 0) - (b.matchnum ?? 0)) : [];
  } catch {
    return [];
  }
}

export async function eventAwards(eventId: number): Promise<RoboAward[]> {
  try {
    const json = await robotEvents<DataList<RoboAward>>(`/events/${eventId}/awards?per_page=100`);
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function eventRankings(eventId: number): Promise<RoboRanking[]> {
  try {
    const json = await robotEvents<DataList<RoboRanking>>(`/events/${eventId}/rankings?per_page=250`);
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function eventSkills(eventId: number): Promise<RoboSkills[]> {
  try {
    const json = await robotEvents<DataList<RoboSkills>>(`/events/${eventId}/skills?per_page=250`);
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

type AwardWinnerEntry = NonNullable<RoboAward["teamWinners"]>[number];

function awardWinnerEntries(winner: RoboAward): AwardWinnerEntry[] {
  return [
    ...(winner.teamWinners ?? []),
    ...(winner.team_winners ?? []),
    ...(winner.winners ?? []),
    ...(winner.teams ?? []),
  ];
}

export function awardWinnerTeams(winner: RoboAward): RoboTeamResult[] {
  const direct = winner.team
    ?? (winner.teamNumber || winner.team_number ? {
      id: 0,
      number: winner.teamNumber ?? winner.team_number ?? "",
      team_name: winner.team_name ?? winner.teamNumber ?? winner.team_number ?? "",
      organization: "",
    } : null);
  const nested = awardWinnerEntries(winner).map((entry) => {
    if (entry.team?.number) return entry.team;
    const number = entry.number ?? entry.team_number ?? "";
    if (!number) return null;
    return {
      id: entry.id ?? 0,
      number,
      team_name: entry.team_name ?? entry.name ?? number,
      organization: "",
    } satisfies RoboTeamResult;
  }).filter((team): team is RoboTeamResult => Boolean(team?.number));
  return [...(direct?.number ? [direct] : []), ...nested].filter((team, index, arr) => arr.findIndex((t) => t.number === team.number) === index);
}

export function teamNumberFromWinner(winner: RoboAward): string {
  return awardWinnerTeams(winner).map((team) => team.number).join(", ");
}

export function teamNameFromWinner(winner: RoboAward): string {
  return awardWinnerTeams(winner).map((team) => team.team_name).filter(Boolean).join(", ");
}

export function allianceTeams(alliance: RoboAlliance | undefined): RoboTeamResult[] {
  const teams = alliance?.teams ?? [];
  return teams
    .map((entry) => {
      const maybe = entry as unknown as { team?: RoboTeamResult; number?: string; team_name?: string; id?: number };
      return maybe.team ?? (typeof maybe.number === "string" ? ({ id: maybe.id ?? 0, number: maybe.number, team_name: maybe.team_name ?? maybe.number, organization: "" } satisfies RoboTeamResult) : null);
    })
    .filter((t): t is RoboTeamResult => Boolean(t?.number));
}

export function matchLabel(match: RoboMatch): string {
  if (match.name) return match.name;
  const prefix = match.round && match.round > 2 ? "Elim" : "Q";
  return `${prefix}${match.matchnum ?? match.instance ?? match.id}`;
}

export function matchAlliances(match: RoboMatch) {
  const red = match.alliances?.find((a) => a.color === "red") ?? match.alliances?.[0];
  const blue = match.alliances?.find((a) => a.color === "blue") ?? match.alliances?.[1];
  return { red, blue, redTeams: allianceTeams(red), blueTeams: allianceTeams(blue) };
}

export async function sendInviteEmail(input: { name: string; email: string; teamNumber?: string; senderName?: string }) {
  const response = await fetch('/api/invites/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: { message?: string }; error?: { message?: string } };
  if (!response.ok || !json.ok) throw new Error(json.error?.message ?? `Invite request failed (${response.status})`);
  return json.data ?? {};
}

export async function sendPredictionFeedback(input: { matchId: string; predicted: string; actual: string }) {
  await fetch('/api/predictions/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => undefined);
}
