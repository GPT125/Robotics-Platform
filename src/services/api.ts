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

export type ProgramCode = "ALL" | "V5RC" | "VRC" | "VIQRC" | "VURC" | "VAIRC" | "VEXU" | string;
export type GradeLevel = "All" | "Elementary" | "Middle School" | "High School" | "University" | "Blended";

export const PROGRAM_OPTIONS: Array<{ value: ProgramCode; label: string }> = [
  { value: "ALL", label: "All programs" },
  { value: "V5RC", label: "V5RC" },
  { value: "VRC", label: "VRC" },
  { value: "VIQRC", label: "VIQRC" },
  { value: "VURC", label: "VURC" },
  { value: "VEXU", label: "VEX U" },
  { value: "VAIRC", label: "VAIRC" },
];

export const GRADE_OPTIONS: GradeLevel[] = ["All", "Elementary", "Middle School", "High School", "University", "Blended"];

export type TeamSearchFilters = {
  program?: ProgramCode;
  grade?: GradeLevel;
  seasonId?: number;
};

export type EventSearchFilters = TeamSearchFilters & {
  region?: string;
};

export type CompetitionRuleSet = {
  program: ProgramCode;
  seasonName?: string;
  defaultFormat: "head_to_head" | "teamwork" | "multi_alliance" | "unknown";
  expectedTeamsPerAlliance?: number;
  predictionEnabled: boolean;
};

function normalized(value?: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value?: string | null) {
  return normalized(value).replace(/\s+/g, "");
}

function queryTerms(query: string) {
  return normalized(query).split(/\s+/).filter((term) => term.length > 1);
}

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? prev
        : Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
      prev = tmp;
    }
  }
  return row[b.length];
}

function fuzzyTokenScore(source: string, terms: string[]) {
  const tokens = source.split(/\s+/).filter(Boolean);
  if (!tokens.length || !terms.length) return 0;
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const token of tokens) {
      if (token === term) best = Math.max(best, 26);
      else if (token.startsWith(term)) best = Math.max(best, 22);
      else if (token.includes(term)) best = Math.max(best, 16);
      else if (term.length >= 4 && Math.abs(token.length - term.length) <= 2 && editDistance(term, token) <= 1) best = Math.max(best, 12);
    }
    if (!best) return 0;
    score += best;
  }
  return score;
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
    team.program?.name,
    team.grade,
  ].filter(Boolean).join(" "));
}

function activeProgram(program?: ProgramCode) {
  const code = (program ?? "ALL").toString().trim().toUpperCase();
  return code && code !== "ALL" ? code : "";
}

function activeGrade(grade?: GradeLevel) {
  const label = (grade ?? "All").toString().trim();
  return label && label !== "All" ? label : "";
}

function teamMatchesFilters(team: RoboTeamResult, filters: TeamSearchFilters = {}) {
  const program = activeProgram(filters.program);
  const grade = activeGrade(filters.grade);
  const teamProgram = (team.program?.code ?? team.program?.name ?? "").toString().toUpperCase();
  if (program && teamProgram && teamProgram !== program) return false;
  if (program && !teamProgram) return true;
  if (grade && normalized(team.grade) && normalized(team.grade) !== normalized(grade)) return false;
  return true;
}

function teamSearchScore(team: RoboTeamResult, query: string) {
  const q = normalized(query);
  const compactQ = compact(query);
  const number = compact(team.number);
  const name = normalized(team.team_name);
  const organization = normalized(team.organization);
  const location = normalized([team.location?.city, team.location?.region, team.location?.country].filter(Boolean).join(" "));
  const program = normalized(`${team.program?.code ?? ""} ${team.program?.name ?? ""}`);
  const text = teamSearchText(team);
  const terms = queryTerms(query);
  let score = 0;
  if (!q) return 0;
  if (number === compactQ) score = Math.max(score, 1000);
  else if (number.startsWith(compactQ)) score = Math.max(score, 860);
  else if (compactQ.length >= 2 && number.includes(compactQ)) score = Math.max(score, 650);

  if (name === q) score = Math.max(score, 760);
  else if (name.startsWith(q)) score = Math.max(score, 690);
  else if (name.includes(q)) score = Math.max(score, 560);

  if (organization === q) score = Math.max(score, 620);
  else if (organization.startsWith(q)) score = Math.max(score, 540);
  else if (organization.includes(q)) score = Math.max(score, 460);

  if (location.includes(q)) score = Math.max(score, 360);
  if (terms.length && terms.every((term) => text.includes(term))) score = Math.max(score, 330 + terms.length * 24);

  score += fuzzyTokenScore(name, terms) * 4;
  score += fuzzyTokenScore(organization, terms) * 3;
  score += fuzzyTokenScore(location, terms) * 2;
  if (score > 0 && program.includes(q)) score += 24;
  return score;
}

export function teamSuggestionReason(team: RoboTeamResult, query: string) {
  const q = normalized(query);
  const compactQ = compact(query);
  const number = compact(team.number);
  const name = normalized(team.team_name);
  const organization = normalized(team.organization);
  const location = normalized([team.location?.city, team.location?.region, team.location?.country].filter(Boolean).join(" "));
  const terms = queryTerms(query);
  if (number === compactQ) return "Exact team number";
  if (number.startsWith(compactQ)) return "Team number prefix";
  if (name.includes(q)) return "Team name match";
  if (organization.includes(q)) return "School or organization match";
  if (location.includes(q)) return "Location match";
  if (terms.length && terms.every((term) => teamSearchText(team).includes(term))) return "Multi-word match";
  return team.program?.code ? `${team.program.code} RobotEvents result` : "RobotEvents result";
}

// Validate/lookup a team by its exact number via RobotEvents (forces a real team).
export async function searchTeams(number: string, filters: TeamSearchFilters = {}): Promise<RoboTeamResult[]> {
  const q = number.trim().toUpperCase();
  if (!q) return [];
  const program = activeProgram(filters.program);
  const programParam = program ? `&program%5B%5D=${encodeURIComponent(program)}` : "";
  const seasonParam = filters.seasonId ? `&season%5B%5D=${encodeURIComponent(String(filters.seasonId))}` : "";
  const attempts = [
    `/teams?number%5B%5D=${encodeURIComponent(q)}${programParam}${seasonParam}&per_page=100`,
    `/teams?search=${encodeURIComponent(q)}${programParam}${seasonParam}&per_page=100`,
    `/teams?number%5B%5D=${encodeURIComponent(q)}&per_page=100`,
    `/teams?search=${encodeURIComponent(q)}&per_page=100`,
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
    .filter(({ team }) => teamMatchesFilters(team, filters))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const selectedProgram = activeProgram(filters.program);
      if (selectedProgram) {
        const programA = a.team.program?.code === selectedProgram ? 1 : 0;
        const programB = b.team.program?.code === selectedProgram ? 1 : 0;
        if (programA !== programB) return programB - programA;
      }
      const exactA = compact(a.team.number) === compact(q) ? 1 : 0;
      const exactB = compact(b.team.number) === compact(q) ? 1 : 0;
      if (exactA !== exactB) return exactB - exactA;
      return a.team.number.localeCompare(b.team.number, undefined, { numeric: true, sensitivity: "base" });
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
  program?: { code?: string; name?: string };
  grade?: string;
  links?: Array<{ title?: string; label?: string; url?: string; type?: string }>;
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
  const compactQ = compact(query);
  const sku = compact(event.sku);
  const name = normalized(event.name);
  const location = normalized([event.location?.city, event.location?.region, event.location?.country].filter(Boolean).join(" "));
  const season = normalized(event.season?.name);
  const program = normalized(`${event.program?.code ?? ""} ${event.program?.name ?? ""}`);
  const grade = normalized(event.grade);
  const text = normalized([
    event.sku,
    event.name,
    event.location?.city,
    event.location?.region,
    event.location?.country,
    event.season?.name,
    event.program?.code,
    event.program?.name,
    event.grade,
  ].filter(Boolean).join(" "));
  const terms = queryTerms(query);
  let score = 0;
  if (!q) return 0;
  if (sku === compactQ || name === q) score = Math.max(score, 1000);
  else if (sku.startsWith(compactQ)) score = Math.max(score, 860);
  else if (compactQ.length >= 4 && sku.includes(compactQ)) score = Math.max(score, 700);

  if (name.startsWith(q)) score = Math.max(score, 720);
  else if (name.includes(q)) score = Math.max(score, 590);
  if (location.includes(q)) score = Math.max(score, 430);
  if (season.includes(q)) score = Math.max(score, 320);
  if (program.includes(q)) score = Math.max(score, 300);
  if (grade.includes(q)) score = Math.max(score, 280);
  if (terms.length && terms.every((term) => text.includes(term))) score = Math.max(score, 340 + terms.length * 24);

  score += fuzzyTokenScore(name, terms) * 4;
  score += fuzzyTokenScore(location, terms) * 2;
  const startTime = new Date(event.start).getTime();
  if (score > 0 && Number.isFinite(startTime)) {
    const now = Date.now();
    const monthsAway = Math.abs(startTime - now) / (1000 * 60 * 60 * 24 * 30);
    score += Math.max(0, 52 - Math.round(monthsAway));
  }
  return score;
}

function eventMatchesFilters(event: RoboEvent, filters: EventSearchFilters = {}) {
  const program = activeProgram(filters.program);
  const grade = activeGrade(filters.grade);
  const eventProgram = (event.program?.code ?? event.program?.name ?? event.sku?.split("-")[0] ?? "").toString().toUpperCase();
  const eventGrade = normalized(event.grade ?? `${event.name} ${event.level ?? ""} ${event.event_type ?? ""}`);
  if (program && eventProgram && !eventProgram.includes(program)) return false;
  if (grade && eventGrade && !eventGrade.includes(normalized(grade))) return false;
  if (filters.region) {
    const where = normalized([event.location?.city, event.location?.region, event.location?.country].filter(Boolean).join(" "));
    if (!where.includes(normalized(filters.region))) return false;
  }
  return true;
}

export function eventSuggestionReason(event: RoboEvent, query: string) {
  const q = normalized(query);
  const compactQ = compact(query);
  const sku = compact(event.sku);
  const name = normalized(event.name);
  const location = normalized([event.location?.city, event.location?.region, event.location?.country].filter(Boolean).join(" "));
  const season = normalized(event.season?.name);
  const terms = queryTerms(query);
  if (sku === compactQ) return "Exact event SKU";
  if (sku.startsWith(compactQ)) return "Event SKU prefix";
  if (name.includes(q)) return "Tournament name match";
  if (location.includes(q)) return "City or region match";
  if (season.includes(q)) return "Season match";
  if (terms.length && terms.every((term) => normalized(`${event.sku} ${event.name} ${location} ${season}`).includes(term))) return "Multi-word match";
  return "RobotEvents tournament";
}

export function filterEventsForQuery(events: RoboEvent[], query: string, filters: EventSearchFilters = {}): RoboEvent[] {
  return events
    .map((event) => ({ event, score: eventSearchScore(event, query) }))
    .filter(({ score }) => score > 0)
    .filter(({ event }) => eventMatchesFilters(event, filters))
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

export async function searchEvents(query: string, filters: EventSearchFilters = {}): Promise<RoboEvent[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const program = activeProgram(filters.program);
  const programParam = program ? `&program%5B%5D=${encodeURIComponent(program)}` : "";
  const seasonParam = filters.seasonId ? `&season%5B%5D=${encodeURIComponent(String(filters.seasonId))}` : "";
  const skuPath = `/events?sku%5B%5D=${encodeURIComponent(q)}&per_page=100`;
  const searchPath = `/events?search=${encodeURIComponent(q)}&per_page=100`;
  const filteredSkuPath = `/events?sku%5B%5D=${encodeURIComponent(q)}${programParam}${seasonParam}&per_page=100`;
  const filteredSearchPath = `/events?search=${encodeURIComponent(q)}${programParam}${seasonParam}&per_page=100`;
  const attempts = /^RE-/i.test(q) ? [filteredSkuPath, skuPath, filteredSearchPath, searchPath] : [filteredSearchPath, searchPath, filteredSkuPath, skuPath];
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
  return filterEventsForQuery(merged, q, filters).slice(0, 30);
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
  const normalizedTeams = teams
    .map((entry) => {
      // RobotEvents match payloads nest a slim team as { team: { id, name, code } }
      // where `name` is actually the team NUMBER (e.g. "229V"). Older/other shapes
      // use { number, team_name }. Handle all of them.
      const maybe = entry as unknown as { team?: { id?: number; name?: string; number?: string; team_name?: string }; number?: string; team_name?: string; id?: number };
      const t = maybe.team ?? maybe;
      const number = (t.number ?? (t as { name?: string }).name ?? maybe.number ?? "").toString();
      if (!number) return null;
      const teamName = t.team_name ?? maybe.team_name ?? number;
      return { id: t.id ?? maybe.id ?? 0, number, team_name: teamName === number ? "" : teamName, organization: "" } satisfies RoboTeamResult;
    })
    .filter((t): t is RoboTeamResult => Boolean(t?.number));
  const seen = new Set<string>();
  return normalizedTeams
    .filter((team) => {
      const key = team.number.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function competitionRuleSet(program?: ProgramCode, seasonName?: string): CompetitionRuleSet {
  const code = activeProgram(program);
  if (code === "VIQRC") return { program: code, seasonName, defaultFormat: "teamwork", expectedTeamsPerAlliance: 2, predictionEnabled: false };
  if (code === "VURC" || code === "VEXU" || code === "VAIRC") return { program: code, seasonName, defaultFormat: "multi_alliance", predictionEnabled: true };
  if (code === "V5RC" || code === "VRC") return { program: code, seasonName, defaultFormat: "head_to_head", expectedTeamsPerAlliance: 2, predictionEnabled: true };
  return { program: code || "ALL", seasonName, defaultFormat: "unknown", predictionEnabled: true };
}

export type MatchDisplayAlliance = {
  key: string;
  label: string;
  color?: string;
  score: number | null;
  teams: RoboTeamResult[];
};

export type MatchDisplayModel = {
  format: "head_to_head" | "teamwork" | "multi_alliance" | "unknown";
  scored: boolean;
  canPredict: boolean;
  teamsPerAlliance: number;
  alliances: MatchDisplayAlliance[];
  red?: MatchDisplayAlliance;
  blue?: MatchDisplayAlliance;
  redTeams: RoboTeamResult[];
  blueTeams: RoboTeamResult[];
};

export function matchDisplayModel(match: RoboMatch, rules: CompetitionRuleSet = competitionRuleSet()): MatchDisplayModel {
  const rawAlliances = match.alliances ?? [];
  const alliances = rawAlliances.map((alliance, index) => {
    const color = String(alliance.color ?? "").toLowerCase();
    const label = color === "red" ? "Red" : color === "blue" ? "Blue" : color ? color.replace(/\b\w/g, (c) => c.toUpperCase()) : `Group ${index + 1}`;
    const score = alliance.score == null ? null : Number(alliance.score);
    return {
      key: color || `alliance-${index}`,
      label,
      color,
      score: Number.isFinite(score) ? score : null,
      teams: allianceTeams(alliance),
    };
  });
  const red = alliances.find((a) => a.color === "red") ?? (alliances.length === 2 ? alliances[0] : undefined);
  const blue = alliances.find((a) => a.color === "blue") ?? (alliances.length === 2 ? alliances[1] : undefined);
  const hasHeadToHead = Boolean(red && blue && alliances.length >= 2);
  const format = hasHeadToHead
    ? "head_to_head"
    : alliances.length === 1
      ? "teamwork"
      : alliances.length > 2
        ? "multi_alliance"
        : rules.defaultFormat;
  const scored = alliances.some((a) => a.score != null) || Boolean(match.scored);
  const maxTeams = alliances.reduce((max, a) => Math.max(max, a.teams.length), 0);
  return {
    format,
    scored,
    canPredict: !scored && Boolean(red && blue && hasHeadToHead && red.teams.length > 0 && blue.teams.length > 0),
    teamsPerAlliance: maxTeams || rules.expectedTeamsPerAlliance || 0,
    alliances,
    red,
    blue,
    redTeams: red?.teams ?? [],
    blueTeams: blue?.teams ?? [],
  };
}

export function matchLabel(match: RoboMatch): string {
  if (match.name) return match.name;
  const prefix = match.round && match.round > 2 ? "Elim" : "Q";
  return `${prefix}${match.matchnum ?? match.instance ?? match.id}`;
}

export function matchAlliances(match: RoboMatch) {
  const model = matchDisplayModel(match);
  const red = match.alliances?.find((a) => a.color === "red") ?? match.alliances?.[0];
  const blue = match.alliances?.find((a) => a.color === "blue") ?? match.alliances?.[1];
  return { red, blue, redTeams: model.redTeams, blueTeams: model.blueTeams };
}

export function allianceCountForTeamCount(teamCount: number) {
  if (teamCount >= 32) return 16;
  if (teamCount >= 24) return 12;
  if (teamCount >= 16) return 8;
  return Math.max(0, Math.floor(teamCount / 2));
}

export function inviteLikelihood(input: { ourRank?: number | null; candidateRank?: number | null; teamCount?: number; candidateAlreadyDeclined?: boolean }) {
  if (input.candidateAlreadyDeclined) return 0;
  const ourRank = input.ourRank ?? null;
  const candidateRank = input.candidateRank ?? null;
  const allianceCount = allianceCountForTeamCount(input.teamCount ?? 0);
  if (!ourRank || !candidateRank || ourRank > 999 || candidateRank > 999) return 50;
  const likelyCaptain = allianceCount > 0 && candidateRank <= allianceCount;
  const weCaptain = allianceCount > 0 && ourRank <= allianceCount;
  if (likelyCaptain && candidateRank < ourRank) return Math.max(8, Math.min(42, 18 + (ourRank - candidateRank) * 2));
  if (!weCaptain && likelyCaptain) return Math.max(5, Math.min(28, 16 - candidateRank));
  const rankGap = candidateRank - ourRank;
  if (rankGap >= 0) return Math.max(58, Math.min(94, 66 + rankGap * 1.7));
  return Math.max(30, Math.min(62, 58 + rankGap * 4));
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
