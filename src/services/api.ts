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

function normalized(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function queryTerms(query: string) {
  return normalized(query).split(/\s+/).filter((term) => term.length > 1);
}

function teamSearchText(team: RoboTeamResult) {
  return normalized([
    team.number,
    team.team_name,
    team.organization,
    team.location?.city,
    team.location?.region,
    team.location?.country,
    team.program?.code,
  ].filter(Boolean).join(" "));
}

function teamSearchScore(team: RoboTeamResult, query: string) {
  const q = normalized(query);
  const number = normalized(team.number);
  const name = normalized(team.team_name);
  const text = teamSearchText(team);
  const terms = queryTerms(query);
  if (!q) return 0;
  if (number === q) return 120;
  if (number.startsWith(q)) return 100;
  if (name.startsWith(q)) return 85;
  if (text.includes(q)) return 70;
  if (terms.length && terms.every((term) => text.includes(term))) return 55;
  return 0;
}

// Validate/lookup a team by its exact number via RobotEvents (forces a real team).
export async function searchTeams(number: string): Promise<RoboTeamResult[]> {
  const q = number.trim().toUpperCase();
  if (!q) return [];
  const attempts = [
    `/teams?number%5B%5D=${encodeURIComponent(q)}&per_page=25`,
    `/teams?search=${encodeURIComponent(q)}&per_page=25`,
  ];
  const seen = new Set<number | string>();
  const merged: RoboTeamResult[] = [];
  for (const path of attempts) {
    try {
      const json = await robotEvents<{ data?: RoboTeamResult[] }>(path);
      if (!Array.isArray(json.data)) continue;
      for (const team of json.data) {
        const key = team.id || team.number;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(team);
      }
    } catch {
      // Try the next supported RobotEvents query shape.
    }
  }
  return merged
    .map((team) => ({ team, score: teamSearchScore(team, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const programA = a.team.program?.code === "V5RC" ? 1 : 0;
      const programB = b.team.program?.code === "V5RC" ? 1 : 0;
      if (programA !== programB) return programB - programA;
      return a.team.number.localeCompare(b.team.number);
    })
    .map(({ team }) => team)
    .slice(0, 25);
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
  type?: string;
  attempts?: number;
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

export function eventSearchScore(event: RoboEvent, query: string) {
  const q = normalized(query);
  const sku = normalized(event.sku);
  const name = normalized(event.name);
  const text = normalized([
    event.sku,
    event.name,
    event.location?.city,
    event.location?.region,
    event.location?.country,
    event.season?.name,
  ].filter(Boolean).join(" "));
  const terms = queryTerms(query);
  if (!q) return 0;
  if (sku === q || name === q) return 130;
  if (sku.startsWith(q)) return 110;
  if (name.startsWith(q)) return 95;
  if (text.includes(q)) return 75;
  if (terms.length && terms.every((term) => text.includes(term))) return 60;
  return 0;
}

export function filterEventsForQuery(events: RoboEvent[], query: string): RoboEvent[] {
  return events
    .map((event) => ({ event, score: eventSearchScore(event, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const start = String(b.event.start ?? "").localeCompare(String(a.event.start ?? ""));
      if (start) return start;
      return a.event.name.localeCompare(b.event.name);
    })
    .map(({ event }) => event);
}

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
  const skuPath = `/events?sku%5B%5D=${encodeURIComponent(q)}&per_page=30`;
  const searchPath = `/events?search=${encodeURIComponent(q)}&per_page=50`;
  const currentSeasonPath = `/events?search=${encodeURIComponent(q)}&season%5B%5D=197&per_page=50`;
  const attempts = /^RE-/i.test(q) ? [skuPath, searchPath] : [searchPath, currentSeasonPath, skuPath];
  const seen = new Set<number | string>();
  const merged: RoboEvent[] = [];
  for (const path of attempts) {
    try {
      const json = await robotEvents<DataList<RoboEvent>>(path);
      if (!Array.isArray(json.data)) continue;
      for (const event of json.data) {
        const key = event.id || event.sku;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(event);
      }
    } catch {
      // Try the next supported RobotEvents query shape.
    }
  }
  return filterEventsForQuery(merged, q).slice(0, 30);
}

export async function teamMatches(teamId: number, seasonId?: number): Promise<RoboMatch[]> {
  // RobotEvents paginates oldest-first, so without a season filter the first page
  // returns ancient matches. Filtering by season returns the right (current) data.
  const season = seasonId ? `season%5B%5D=${seasonId}&` : "";
  try {
    const json = await robotEvents<DataList<RoboMatch>>(`/teams/${teamId}/matches?${season}per_page=250`);
    return Array.isArray(json.data) ? json.data.sort((a, b) => String(b.scheduled ?? b.started ?? "").localeCompare(String(a.scheduled ?? a.started ?? ""))) : [];
  } catch {
    return [];
  }
}

// Seasons a team has competed in, most recent first (id + label).
export async function teamSeasons(teamId: number): Promise<Array<{ id: number; name: string; year: string }>> {
  const events = await teamEvents(teamId);
  const seen = new Map<number, { id: number; name: string; year: string }>();
  for (const e of events.sort((a, b) => (a.start < b.start ? 1 : -1))) {
    const s = e.season;
    if (s?.id && !seen.has(s.id)) {
      const yr = e.start ? new Date(e.start).getFullYear() : 0;
      const start = e.start && new Date(e.start).getMonth() >= 7 ? yr : yr - 1;
      seen.set(s.id, { id: s.id, name: s.name, year: `${start}-${String(start + 1).slice(2)}` });
    }
  }
  return [...seen.values()];
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

type RoboDivisionRef = { id: number; name?: string };

function sortMatches(matches: RoboMatch[]) {
  return matches.sort((a, b) => {
    const division = (a.division?.id ?? 0) - (b.division?.id ?? 0);
    if (division) return division;
    const round = (a.round ?? 0) - (b.round ?? 0);
    if (round) return round;
    const match = (a.matchnum ?? 0) - (b.matchnum ?? 0);
    if (match) return match;
    return (a.instance ?? 0) - (b.instance ?? 0);
  });
}

function teamNumberFromApiTeam(team?: Partial<RoboTeamResult> & { name?: string; code?: string } | null) {
  return (team?.number ?? team?.name ?? "").toString();
}

function normalizeApiTeam(team?: Partial<RoboTeamResult> & { name?: string; code?: string } | null): RoboTeamResult | undefined {
  const number = teamNumberFromApiTeam(team);
  if (!number) return undefined;
  return {
    id: team?.id ?? 0,
    number,
    team_name: team?.team_name ?? number,
    organization: team?.organization ?? "",
    location: team?.location,
    program: team?.program,
    grade: team?.grade,
  };
}

function normalizeRanking(ranking: RoboRanking): RoboRanking {
  const team = normalizeApiTeam(ranking.team as unknown as Partial<RoboTeamResult> & { name?: string });
  return { ...ranking, team, team_number: ranking.team_number ?? team?.number };
}

export async function eventMatches(eventId: number, divisions?: RoboDivisionRef[]): Promise<RoboMatch[]> {
  try {
    if (divisions?.length) {
      const byDivision = (await Promise.all(divisions.map(async (division) => {
        try {
          const json = await robotEvents<DataList<RoboMatch>>(`/events/${eventId}/divisions/${division.id}/matches?per_page=250`);
          return Array.isArray(json.data) ? json.data : [];
        } catch {
          return [];
        }
      }))).flat();
      if (byDivision.length) return sortMatches(byDivision);
    }
    const json = await robotEvents<DataList<RoboMatch>>(`/events/${eventId}/matches?per_page=250`);
    return Array.isArray(json.data) ? sortMatches(json.data) : [];
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

export async function eventRankings(eventId: number, divisions?: RoboDivisionRef[]): Promise<RoboRanking[]> {
  try {
    if (divisions?.length) {
      const byDivision = (await Promise.all(divisions.map(async (division) => {
        try {
          const json = await robotEvents<DataList<RoboRanking>>(`/events/${eventId}/divisions/${division.id}/rankings?per_page=250`);
          return Array.isArray(json.data) ? json.data.map(normalizeRanking) : [];
        } catch {
          return [];
        }
      }))).flat();
      if (byDivision.length) return byDivision;
    }
    const json = await robotEvents<DataList<RoboRanking>>(`/events/${eventId}/rankings?per_page=250`);
    return Array.isArray(json.data) ? json.data.map(normalizeRanking) : [];
  } catch {
    return [];
  }
}

export async function eventSkills(eventId: number): Promise<RoboSkills[]> {
  try {
    const json = await robotEvents<DataList<RoboSkills>>(`/events/${eventId}/skills?per_page=250`);
    if (!Array.isArray(json.data)) return [];
    const grouped = new Map<string, RoboSkills>();
    for (const raw of json.data) {
      const team = normalizeApiTeam(raw.team as unknown as Partial<RoboTeamResult> & { name?: string });
      const number = raw.team_number ?? team?.number;
      if (!number) continue;
      const existing = grouped.get(number) ?? { team, team_number: number, driver: 0, programming: 0, autonomous: 0, score: 0 };
      const type = raw.type?.toLowerCase() ?? "";
      const score = Number(raw.score ?? 0);
      if (type.includes("driver")) existing.driver = Math.max(existing.driver ?? 0, score);
      else if (type.includes("program") || type.includes("auton")) {
        existing.programming = Math.max(existing.programming ?? 0, score);
        existing.autonomous = Math.max(existing.autonomous ?? 0, score);
      } else {
        existing.score = Math.max(existing.score ?? 0, score);
      }
      const total = (existing.driver ?? 0) + Math.max(existing.programming ?? 0, existing.autonomous ?? 0);
      existing.score = Math.max(existing.score ?? 0, total);
      grouped.set(number, existing);
    }
    return [...grouped.values()]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((skill, index) => ({ ...skill, rank: index + 1 }));
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
  const direct = normalizeApiTeam(winner.team as unknown as Partial<RoboTeamResult> & { name?: string })
    ?? (winner.teamNumber || winner.team_number ? {
      id: 0,
      number: winner.teamNumber ?? winner.team_number ?? "",
      team_name: winner.team_name ?? winner.teamNumber ?? winner.team_number ?? "",
      organization: "",
    } : null);
  const nested = awardWinnerEntries(winner).map((entry) => {
    const nestedTeam = normalizeApiTeam(entry.team as unknown as Partial<RoboTeamResult> & { name?: string });
    if (nestedTeam?.number) return nestedTeam;
    const number = entry.number ?? entry.team_number ?? entry.name ?? "";
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
      // RobotEvents match payloads nest a slim team as { team: { id, name, code } }
      // where `name` is actually the team NUMBER (e.g. "229V"). Older/other shapes
      // use { number, team_name }. Handle all of them.
      const maybe = entry as unknown as { team?: { id?: number; name?: string; number?: string; team_name?: string }; number?: string; team_name?: string; id?: number };
      const t = maybe.team ?? maybe;
      const number = (t.number ?? (t as { name?: string }).name ?? maybe.number ?? "").toString();
      if (!number) return null;
      return { id: t.id ?? maybe.id ?? 0, number, team_name: t.team_name ?? maybe.team_name ?? number, organization: "" } satisfies RoboTeamResult;
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
