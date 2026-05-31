import type { AiAdvice, CodePatch, EventSummary, IntegrationStatus, Match, RobotProject, SponsorSignal, Team, TeamTournament, TeamTrendYear, ApiResponse } from '../types';

const delay = (ms = 260) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function apiOk<T>(data: T, meta?: Record<string, unknown>): Promise<ApiResponse<T>> {
  await delay();
  return { ok: true, data, meta };
}

type RobotEventsEntity = Record<string, unknown>;

const emptyEventFallback: EventSummary = {
  id: '',
  name: '',
  location: '',
  date: '',
  status: 'Offline',
  teamCount: 0,
  division: '',
};

function asRecord(value: unknown): RobotEventsEntity {
  return value && typeof value === 'object' ? (value as RobotEventsEntity) : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function num(value: unknown, fallback = 0) {
  return typeof value === 'number' ? value : Number(value) || fallback;
}

function bool(value: unknown) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

async function fetchRobotEvents<T>(path: string, fallback: T): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path);
    const json = await response.json();

    if (!response.ok || json?.ok === false) {
      return {
        ok: true,
        data: fallback,
        meta: {
          source: 'fallback',
          liveStatus: 'Offline',
          error: json?.error?.message ?? `RobotEvents returned ${response.status}`,
        },
      };
    }

    return {
      ok: true,
      data: json.data as T,
      meta: {
        source: 'RobotEvents',
        liveStatus: 'Fresh',
        fetchedAt: new Date().toISOString(),
        pagination: json.meta,
      },
    };
  } catch (error) {
    return {
      ok: true,
      data: fallback,
      meta: {
        source: 'fallback',
        liveStatus: 'Offline',
        error: error instanceof Error ? error.message : 'RobotEvents request failed',
      },
    };
  }
}

function normalizeEvent(raw: unknown): EventSummary {
  const event = asRecord(raw);
  const location = asRecord(event.location);
  const divisions = Array.isArray(event.divisions) ? event.divisions : [];
  const firstDivision = asRecord(divisions[0]);

  return {
    id: text(event.id, text(event.sku, emptyEventFallback.id)),
    name: text(event.name, emptyEventFallback.name),
    location: [location.city, location.region, location.country].map((part) => text(part)).filter(Boolean).join(', ') || emptyEventFallback.location,
    date: text(event.start, emptyEventFallback.date).slice(0, 10),
    status: 'Fresh',
    teamCount: num(event.team_count, emptyEventFallback.teamCount),
    division: text(firstDivision.name, emptyEventFallback.division),
  };
}

function normalizeTeam(raw: unknown): Team {
  const team = asRecord(raw);
  const location = asRecord(team.location);
  const number = text(team.number, 'Unknown');
  const registered = bool(team.registered);

  return {
    number,
    name: text(team.team_name, text(team.name, 'RobotEvents team')),
    organization: text(team.organization, 'Unknown organization'),
    region: [location.city, location.region, location.country].map((part) => text(part)).filter(Boolean).join(', '),
    winRate: 0,
    avgScore: 0,
    maxScore: 0,
    consistency: 0,
    autonSignal: 0,
    skills: 0,
    risk: registered ? 8 : 18,
    tags: [`id:${text(team.id)}`, registered ? 'registered' : 'historical', 'VEX Events'].filter(Boolean),
    confidence: registered ? 'High confidence' : 'Medium confidence',
  };
}

async function fetchVexDb<T>(path: string, fallback: T): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`https://api.vexdb.io/v1/${path}`);
    const json = await response.json();
    if (!response.ok || json?.status !== 1) {
      return apiOk(fallback, { source: 'VexDB', liveStatus: 'Stale', error: json?.error_text ?? `VexDB returned ${response.status}` });
    }
    return apiOk((Array.isArray(json.result) ? json.result : fallback) as T, { source: 'VexDB', liveStatus: 'Fresh' });
  } catch (error) {
    return apiOk(fallback, { source: 'fallback', liveStatus: 'Offline', error: error instanceof Error ? error.message : 'VexDB request failed' });
  }
}

function normalizeVexDbTeam(raw: unknown): Team {
  const team = asRecord(raw);
  const number = text(team.number, 'Unknown');
  const registered = bool(team.is_registered);

  return {
    number,
    name: text(team.team_name, 'VRC team'),
    organization: text(team.organisation, 'Unknown organization'),
    region: [team.city, team.region, team.country].map((part) => text(part)).filter(Boolean).join(', '),
    winRate: 0,
    avgScore: 0,
    maxScore: 0,
    consistency: 0,
    autonSignal: 0,
    skills: 0,
    risk: registered ? 12 : 24,
    tags: [registered ? 'registered' : 'historical', 'VRC data'],
    confidence: registered ? 'Medium confidence' : 'Low data',
  };
}

function seasonFromSku(sku: unknown) {
  const match = text(sku).match(/RE-V(?:5)?RC-(\d{2})-/i);
  return match ? 2000 + Number(match[1]) : 0;
}

function seasonFromDate(value: unknown) {
  const year = Number(text(value).slice(0, 4));
  return Number.isFinite(year) ? year : 0;
}

function seasonLabel(year: number) {
  return year ? `${year}-${String(year + 1).slice(2)}` : 'Unknown';
}

function yearFromRobotEventsEntry(raw: unknown) {
  const entry = asRecord(raw);
  const season = asRecord(entry.season);
  const seasonName = text(season.name);
  const seasonYear = seasonName.match(/\b(20\d{2})[-/ ]?(?:20)?\d{2}\b/);
  if (seasonYear) return Number(seasonYear[1]);
  const event = asRecord(entry.event);
  return seasonFromDate(entry.start) || seasonFromDate(entry.scheduled) || seasonFromDate(event.start) || seasonFromSku(text(event.code, text(entry.sku)));
}

function eventKey(raw: unknown) {
  const event = asRecord(raw);
  return text(event.id, text(event.code, text(event.sku, text(event.name))));
}

function eventSummary(raw: unknown) {
  const event = asRecord(raw);
  const location = asRecord(event.location);
  return {
    id: text(event.id, eventKey(event)),
    sku: text(event.code, text(event.sku)),
    name: text(event.name, 'Tournament'),
    season: text(asRecord(event.season).name, seasonLabel(yearFromRobotEventsEntry(event))),
    date: text(event.start).slice(0, 10),
    location: [location.city, location.region, location.country].map((part) => text(part)).filter(Boolean).join(', '),
  };
}

function buildTrendRows(args: { rankings: unknown[]; skills: unknown[]; matches: unknown[]; teamNumber: string }): TeamTrendYear[] {
  const years = new Map<number, {
    events: Set<string>;
    matches: number;
    wins: number;
    losses: number;
    ties: number;
    matchWins: number;
    matchLosses: number;
    matchTies: number;
    ranks: number[];
    skills: number[];
    scores: number[];
    opr: number[];
  }>();
  const ensure = (year: number) => {
    const safeYear = year || new Date().getFullYear();
    if (!years.has(safeYear)) {
      years.set(safeYear, { events: new Set(), matches: 0, wins: 0, losses: 0, ties: 0, matchWins: 0, matchLosses: 0, matchTies: 0, ranks: [], skills: [], scores: [], opr: [] });
    }
    return years.get(safeYear)!;
  };

  args.rankings.forEach((entryRaw) => {
    const entry = asRecord(entryRaw);
    const year = seasonFromSku(entry.sku);
    const bucket = ensure(year);
    const sku = text(entry.sku);
    if (sku) bucket.events.add(sku);
    bucket.wins += num(entry.wins);
    bucket.losses += num(entry.losses);
    bucket.ties += num(entry.ties);
    if (num(entry.rank)) bucket.ranks.push(num(entry.rank));
    if (num(entry.max_score)) bucket.scores.push(num(entry.max_score));
    if (num(entry.opr)) bucket.opr.push(num(entry.opr));
  });

  args.skills.forEach((entryRaw) => {
    const entry = asRecord(entryRaw);
    const bucket = ensure(seasonFromSku(entry.sku));
    const sku = text(entry.sku);
    if (sku) bucket.events.add(sku);
    if (num(entry.score)) bucket.skills.push(num(entry.score));
  });

  args.matches.forEach((entryRaw) => {
    const entry = asRecord(entryRaw);
    const year = seasonFromDate(entry.scheduled) || seasonFromSku(entry.sku);
    const bucket = ensure(year);
    const sku = text(entry.sku);
    if (sku) bucket.events.add(sku);
    const redTeams = [entry.red1, entry.red2, entry.red3].map((team) => text(team).toUpperCase());
    const blueTeams = [entry.blue1, entry.blue2, entry.blue3].map((team) => text(team).toUpperCase());
    const onRed = redTeams.includes(args.teamNumber.toUpperCase());
    const onBlue = blueTeams.includes(args.teamNumber.toUpperCase());
    const redScore = num(entry.redscore);
    const blueScore = num(entry.bluescore);
    if (!onRed && !onBlue) return;
    bucket.matches += 1;
    bucket.scores.push(onRed ? redScore : blueScore);
    if (redScore === blueScore) bucket.matchTies += 1;
    else if ((onRed && redScore > blueScore) || (onBlue && blueScore > redScore)) bucket.matchWins += 1;
    else bucket.matchLosses += 1;
  });

  return Array.from(years.entries())
    .map(([year, bucket]) => {
      const rankedDecisions = bucket.wins + bucket.losses + bucket.ties;
      const wins = rankedDecisions ? bucket.wins : bucket.matchWins;
      const losses = rankedDecisions ? bucket.losses : bucket.matchLosses;
      const ties = rankedDecisions ? bucket.ties : bucket.matchTies;
      const decided = wins + losses + ties;
      const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return {
        season: seasonLabel(year),
        year,
        events: bucket.events.size,
        matches: rankedDecisions ? decided : bucket.matches || decided,
        wins,
        losses,
        ties,
        winRate: decided ? wins / decided : 0,
        avgRank: Math.round(avg(bucket.ranks)),
        bestRank: bucket.ranks.length ? Math.min(...bucket.ranks) : 0,
        bestSkills: bucket.skills.length ? Math.max(...bucket.skills) : 0,
        avgScore: Math.round(avg(bucket.scores)),
        maxScore: bucket.scores.length ? Math.max(...bucket.scores) : 0,
        opr: Math.round(avg(bucket.opr) * 10) / 10,
      };
    })
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .sort((a, b) => a.year - b.year);
}

function buildRobotEventsTrendRows(args: { rankings: unknown[]; skills: unknown[]; matches: unknown[]; events: unknown[]; teamNumber: string }): TeamTrendYear[] {
  const years = new Map<number, {
    events: Set<string>;
    matches: number;
    wins: number;
    losses: number;
    ties: number;
    ranks: number[];
    skills: number[];
    scores: number[];
  }>();
  const ensure = (year: number) => {
    const safeYear = year || new Date().getFullYear();
    if (!years.has(safeYear)) years.set(safeYear, { events: new Set(), matches: 0, wins: 0, losses: 0, ties: 0, ranks: [], skills: [], scores: [] });
    return years.get(safeYear)!;
  };

  args.events.forEach((eventRaw) => {
    const event = asRecord(eventRaw);
    const bucket = ensure(yearFromRobotEventsEntry(event));
    const key = eventKey(event);
    if (key) bucket.events.add(key);
  });

  args.rankings.forEach((rankingRaw) => {
    const ranking = asRecord(rankingRaw);
    const event = asRecord(ranking.event);
    const bucket = ensure(yearFromRobotEventsEntry(ranking));
    const key = eventKey(event);
    if (key) bucket.events.add(key);
    bucket.wins += num(ranking.wins);
    bucket.losses += num(ranking.losses);
    bucket.ties += num(ranking.ties);
    if (num(ranking.rank)) bucket.ranks.push(num(ranking.rank));
    if (num(ranking.average_points)) bucket.scores.push(num(ranking.average_points));
    if (num(ranking.high_score)) bucket.scores.push(num(ranking.high_score));
  });

  args.skills.forEach((skillRaw) => {
    const skill = asRecord(skillRaw);
    const bucket = ensure(yearFromRobotEventsEntry(skill));
    const key = eventKey(asRecord(skill.event));
    if (key) bucket.events.add(key);
    if (num(skill.score)) bucket.skills.push(num(skill.score));
  });

  args.matches.forEach((matchRaw) => {
    const match = asRecord(matchRaw);
    const bucket = ensure(yearFromRobotEventsEntry(match));
    const key = eventKey(asRecord(match.event));
    if (key) bucket.events.add(key);
    const alliances = Array.isArray(match.alliances) ? match.alliances.map(asRecord) : [];
    const ownAlliance = alliances.find((alliance) => {
      const teams = Array.isArray(alliance.teams) ? alliance.teams.map(asRecord) : [];
      return teams.some((entry) => text(asRecord(entry.team).name).toUpperCase() === args.teamNumber.toUpperCase());
    });
    if (!ownAlliance) return;
    const ownScore = num(ownAlliance.score);
    bucket.matches += 1;
    bucket.scores.push(ownScore);
  });

  return Array.from(years.entries())
    .map(([year, bucket]) => {
      const decided = bucket.wins + bucket.losses + bucket.ties;
      const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return {
        season: seasonLabel(year),
        year,
        events: bucket.events.size,
        matches: decided || bucket.matches,
        wins: bucket.wins,
        losses: bucket.losses,
        ties: bucket.ties,
        winRate: decided ? bucket.wins / decided : 0,
        avgRank: Math.round(avg(bucket.ranks)),
        bestRank: bucket.ranks.length ? Math.min(...bucket.ranks) : 0,
        bestSkills: bucket.skills.length ? Math.max(...bucket.skills) : 0,
        avgScore: Math.round(avg(bucket.scores)),
        maxScore: bucket.scores.length ? Math.max(...bucket.scores) : 0,
        opr: 0,
      };
    })
    .sort((a, b) => b.year - a.year)
    .slice(0, 5)
    .sort((a, b) => a.year - b.year);
}

function buildTournaments(args: { events: unknown[]; rankings: unknown[]; skills: unknown[]; awards: unknown[] }): TeamTournament[] {
  const rows = new Map<string, TeamTournament>();
  args.events.forEach((eventRaw) => {
    const event = eventSummary(eventRaw);
    rows.set(event.id, {
      ...event,
      rank: 0,
      record: '-',
      winRate: 0,
      skills: 0,
      awards: [],
    });
  });
  args.rankings.forEach((rankingRaw) => {
    const ranking = asRecord(rankingRaw);
    const event = eventSummary(ranking.event);
    const wins = num(ranking.wins);
    const losses = num(ranking.losses);
    const ties = num(ranking.ties);
    const existing = rows.get(event.id) ?? { ...event, rank: 0, record: '-', winRate: 0, skills: 0, awards: [] };
    rows.set(event.id, {
      ...existing,
      ...event,
      rank: num(ranking.rank),
      record: `${wins}-${losses}-${ties}`,
      winRate: wins + losses + ties ? wins / (wins + losses + ties) : 0,
    });
  });
  args.skills.forEach((skillRaw) => {
    const skill = asRecord(skillRaw);
    const event = eventSummary(skill.event);
    const existing = rows.get(event.id) ?? { ...event, rank: 0, record: '-', winRate: 0, skills: 0, awards: [] };
    existing.skills = Math.max(existing.skills, num(skill.score));
    rows.set(event.id, existing);
  });
  args.awards.forEach((awardRaw) => {
    const award = asRecord(awardRaw);
    const event = eventSummary(award.event);
    const existing = rows.get(event.id) ?? { ...event, rank: 0, record: '-', winRate: 0, skills: 0, awards: [] };
    const title = text(award.title);
    if (title && !existing.awards.includes(title)) existing.awards.push(title);
    rows.set(event.id, existing);
  });
  return Array.from(rows.values()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
}

async function searchCurrentTeams(normalized: string): Promise<ApiResponse<Team[]>> {
  const params = new URLSearchParams({ per_page: '20', myTeams: 'false' });
  params.append('number[]', normalized);
  params.append('program[]', '1');
  const response = await fetchRobotEvents<unknown[]>(`/api/robotevents/teams?${params.toString()}`, []);
  if (response.ok && response.data.length) return { ...response, data: response.data.map(normalizeTeam) };

  const fallback = await fetchVexDb<unknown[]>(`get_teams?team=${encodeURIComponent(normalized)}`, []);
  return fallback.ok ? { ...fallback, data: fallback.data.map(normalizeVexDbTeam) } : fallback;
}

async function currentTeamId(normalized: string) {
  const teamResponse = await searchCurrentTeams(normalized);
  const currentTeam = teamResponse.ok ? teamResponse.data[0] : undefined;
  return currentTeam?.tags.find((tag) => tag.startsWith('id:'))?.slice(3);
}

async function fallbackTrends(normalized: string) {
  const [rankings, skills, matches] = await Promise.all([
    fetchVexDb<unknown[]>(`get_rankings?team=${encodeURIComponent(normalized)}`, []),
    fetchVexDb<unknown[]>(`get_skills?team=${encodeURIComponent(normalized)}`, []),
    fetchVexDb<unknown[]>(`get_matches?team=${encodeURIComponent(normalized)}`, []),
  ]);
  return buildTrendRows({
    rankings: rankings.ok ? rankings.data : [],
    skills: skills.ok ? skills.data : [],
    matches: matches.ok ? matches.data : [],
    teamNumber: normalized,
  });
}

function allianceTeamLabel(raw: unknown) {
  const entry = asRecord(raw);
  const nested = asRecord(entry.team);
  return text(nested.name, text(nested.number, text(entry.number, text(entry.name))));
}

function normalizeMatch(raw: unknown): Match {
  const match = asRecord(raw);
  const alliances = Array.isArray(match.alliances) ? match.alliances.map(asRecord) : [];
  const red = asRecord(alliances.find((alliance) => text(alliance.color).toLowerCase() === 'red'));
  const blue = asRecord(alliances.find((alliance) => text(alliance.color).toLowerCase() === 'blue'));
  const redTeams = Array.isArray(red.teams) ? red.teams.map(allianceTeamLabel).filter(Boolean) : [];
  const blueTeams = Array.isArray(blue.teams) ? blue.teams.map(allianceTeamLabel).filter(Boolean) : [];

  return {
    id: text(match.id, crypto.randomUUID()),
    number: `${text(match.round, 'Q')}${text(match.instance, text(match.matchnum, ''))}`,
    field: text(match.field, 'Field'),
    startsAt: text(match.scheduled, 'TBD').slice(11, 16) || 'TBD',
    red: redTeams.length ? redTeams : ['TBD'],
    blue: blueTeams.length ? blueTeams : ['TBD'],
    redScore: typeof red.score === 'number' ? red.score : undefined,
    blueScore: typeof blue.score === 'number' ? blue.score : undefined,
    prediction: {
      winner: 'red',
      probability: 0.5,
      confidence: 'Low data',
      reasons: ['Live official match data loaded; prediction needs scouting metrics.'],
    },
  };
}

export const robotEventsAdapter = {
  async searchEvents(query = ''): Promise<ApiResponse<EventSummary[]>> {
    const params = new URLSearchParams({ per_page: '12' });
    if (query.trim()) params.set('name', query.trim());
    const response = await fetchRobotEvents<unknown[]>(`/api/robotevents/events?${params.toString()}`, []);
    return response.ok ? { ...response, data: response.data.map(normalizeEvent) } : response;
  },
  async getEventMatches(eventId?: string): Promise<ApiResponse<Match[]>> {
    if (!eventId || !/^\d+$/.test(eventId)) {
      return apiOk([], { source: 'fallback', liveStatus: 'Stale', error: 'Select a live RobotEvents event to load official matches.' });
    }
    const response = await fetchRobotEvents<unknown[]>(`/api/robotevents/events/${eventId}/matches?per_page=100`, []);
    return response.ok ? { ...response, data: response.data.map(normalizeMatch) } : response;
  },
  async searchTeams(query = ''): Promise<ApiResponse<Team[]>> {
    const normalized = query.trim();
    if (normalized) return searchCurrentTeams(normalized);

    return apiOk([], { source: 'fallback', liveStatus: normalized ? 'Stale' : 'Fresh' });
  },
  async getTeamTrends(query = ''): Promise<ApiResponse<TeamTrendYear[]>> {
    const normalized = query.trim();
    if (!normalized) return apiOk([], { source: 'fallback', liveStatus: 'Fresh' });
    const teamId = await currentTeamId(normalized);
    if (teamId) {
      const [events, rankings, skills, matches] = await Promise.all([
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/events?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/rankings?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/skills?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/matches?per_page=250`, []),
      ]);
      const rows = buildRobotEventsTrendRows({
        events: events.ok ? events.data : [],
        rankings: rankings.ok ? rankings.data : [],
        skills: skills.ok ? skills.data : [],
        matches: matches.ok ? matches.data : [],
        teamNumber: normalized,
      });
      if (rows.length) return apiOk(rows, { source: 'VEX Events', liveStatus: 'Fresh' });
    }
    return apiOk(await fallbackTrends(normalized), { source: 'VexDB', liveStatus: 'Fresh' });
  },
  async getTeamHistory(query = ''): Promise<ApiResponse<{ trends: TeamTrendYear[]; tournaments: TeamTournament[] }>> {
    const normalized = query.trim();
    if (!normalized) return apiOk({ trends: [], tournaments: [] }, { source: 'fallback', liveStatus: 'Fresh' });
    const teamId = await currentTeamId(normalized);
    if (teamId) {
      const [events, rankings, skills, matches, awards] = await Promise.all([
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/events?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/rankings?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/skills?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/matches?per_page=250`, []),
        fetchRobotEvents<unknown[]>(`/api/robotevents/teams/${teamId}/awards?per_page=250`, []),
      ]);
      const payload = {
        trends: buildRobotEventsTrendRows({
          events: events.ok ? events.data : [],
          rankings: rankings.ok ? rankings.data : [],
          skills: skills.ok ? skills.data : [],
          matches: matches.ok ? matches.data : [],
          teamNumber: normalized,
        }),
        tournaments: buildTournaments({
          events: events.ok ? events.data : [],
          rankings: rankings.ok ? rankings.data : [],
          skills: skills.ok ? skills.data : [],
          awards: awards.ok ? awards.data : [],
        }),
      };
      if (payload.trends.length || payload.tournaments.length) return apiOk(payload, { source: 'VEX Events', liveStatus: 'Fresh' });
    }
    return apiOk({ trends: await fallbackTrends(normalized), tournaments: [] }, { source: 'VexDB fallback', liveStatus: 'Stale' });
  },
};

export const robotService = {
  async listProjects(): Promise<ApiResponse<RobotProject[]>> {
    return apiOk([]);
  },
  async simulate(robotId: string): Promise<ApiResponse<{ poses: Array<{ x: number; y: number; heading: number }>; warnings: string[] }>> {
    return apiOk({
      poses: [
        { x: 20, y: 160, heading: 0 },
        { x: 120, y: 160, heading: 0 },
        { x: 180, y: 120, heading: 38 },
        { x: 260, y: 98, heading: 38 },
      ],
      warnings: robotId === 'skills-bot' ? ['Wheel slip not physically calibrated'] : [],
    });
  },
};

export const pathService = {
  async optimizePath(points: Array<{ x: number; y: number }>): Promise<ApiResponse<{ points: Array<{ x: number; y: number }>; patch: CodePatch }>> {
    const safePoints = points.length > 1 ? points : [{ x: 40, y: 270 }, { x: 140, y: 210 }, { x: 270, y: 160 }];
    return apiOk({
      points: safePoints.map((point, index) => ({ x: point.x + index * 4, y: point.y - index * 3 })),
      patch: {
        codeVersionId: 'cv-2026-05-27',
        filePath: 'src/autonomous.cpp',
        insertAfter: { line: 42, pattern: 'void autonomous()' },
        newText: `void autonomousRoute_RoboLab() {
  // Generated by RoboLab from accepted field path
  Drivetrain.setDriveVelocity(55, percent);
  Drivetrain.driveFor(forward, 24, inches);
  Drivetrain.turnFor(right, 38, degrees);
  Drivetrain.driveFor(forward, 18, inches);
}`,
        reason: 'Accepted optimized VEX field path',
        generatedBy: 'path_planner',
      },
    });
  },
};

export const aiAdvisor = {
  async ask(task: string, context: string): Promise<ApiResponse<AiAdvice>> {
    try {
      const response = await fetch('/api/ai/vex-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context }),
      });
      const json = await response.json();
      if (!response.ok || json?.ok === false) {
        throw new Error(json?.error?.message ?? `AI request returned ${response.status}`);
      }
      return { ok: true, data: json.data as AiAdvice };
    } catch (error) {
      return {
        ok: true,
        data: {
          task,
          summary:
            'AI providers were unavailable, so RoboLab used a local fallback: verify V5 device configuration, drivetrain geometry, battery level, starting alignment, and one code change at a time.',
          providers: [{ provider: 'Local fallback', status: 'ok', content: 'Deterministic VEX troubleshooting checklist generated locally.' }],
        },
        meta: { error: error instanceof Error ? error.message : 'AI request failed' },
      };
    }
  },
};

export const integrationsAdapter = {
  async status(): Promise<ApiResponse<IntegrationStatus[]>> {
    try {
      const response = await fetch('/api/integrations/status');
      const json = await response.json();
      if (!response.ok || json?.ok === false) throw new Error(json?.error?.message ?? 'Integration status failed');
      return { ok: true, data: json.data as IntegrationStatus[] };
    } catch (error) {
      return {
        ok: true,
        data: [],
        meta: { error: error instanceof Error ? error.message : 'Integration status unavailable' },
      };
    }
  },
  async sponsorSignals(): Promise<ApiResponse<SponsorSignal[]>> {
    try {
      const response = await fetch('/api/signals/sponsors');
      const json = await response.json();
      if (!response.ok || json?.ok === false) throw new Error(json?.error?.message ?? 'Sponsor signals failed');
      return { ok: true, data: json.data as SponsorSignal[] };
    } catch (error) {
      return {
        ok: true,
        data: [{ source: 'Local fallback', status: 'error', summary: error instanceof Error ? error.message : 'Sponsor signals unavailable' }],
      };
    }
  },
};
