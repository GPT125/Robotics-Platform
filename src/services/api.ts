import type { AiAdvice, CodePatch, EventSummary, IntegrationStatus, Match, RobotProject, SponsorSignal, Team, ApiResponse } from '../types';

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

  return {
    number,
    name: text(team.team_name, text(team.name, 'RobotEvents team')),
    organization: text(team.organization, 'Unknown organization'),
    region: text(location.region, text(location.country, '')),
    winRate: 0,
    avgScore: 0,
    maxScore: 0,
    consistency: 0,
    autonSignal: 0,
    skills: 0,
    risk: 0,
    tags: ['live RobotEvents'],
    confidence: 'Low data',
  };
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
    if (normalized) {
      const params = new URLSearchParams({ per_page: '20' });
      params.append('number[]', normalized);
      const response = await fetchRobotEvents<unknown[]>(`/api/robotevents/teams?${params.toString()}`, []);
      if (response.ok && response.data.length) return { ...response, data: response.data.map(normalizeTeam) };
    }

    return apiOk([], { source: 'fallback', liveStatus: normalized ? 'Stale' : 'Fresh' });
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
