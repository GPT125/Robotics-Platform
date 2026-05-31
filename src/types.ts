export type ApiResponse<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export type Confidence = 'Low data' | 'Medium confidence' | 'High confidence' | 'Verified';

export type Team = {
  number: string;
  name: string;
  organization: string;
  region: string;
  winRate: number;
  avgScore: number;
  maxScore: number;
  consistency: number;
  autonSignal: number;
  skills: number;
  risk: number;
  tags: string[];
  confidence: Confidence;
};

export type TeamTrendYear = {
  season: string;
  year: number;
  events: number;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgRank: number;
  bestRank: number;
  bestSkills: number;
  avgScore: number;
  maxScore: number;
  opr: number;
};

export type TeamTournament = {
  id: string;
  sku: string;
  name: string;
  season: string;
  date: string;
  location: string;
  rank: number;
  record: string;
  winRate: number;
  skills: number;
  awards: string[];
};

export type Match = {
  id: string;
  number: string;
  field: string;
  startsAt: string;
  red: string[];
  blue: string[];
  redScore?: number;
  blueScore?: number;
  prediction: {
    winner: 'red' | 'blue';
    probability: number;
    confidence: Confidence;
    reasons: string[];
  };
};

export type EventSummary = {
  id: string;
  name: string;
  location: string;
  date: string;
  status: 'Fresh' | 'Updating' | 'Stale' | 'Offline';
  teamCount: number;
  division: string;
};

export type RobotProject = {
  id: string;
  name: string;
  season: string;
  status: 'Needs calibration' | 'Ready to simulate' | 'Code warnings';
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelDiameter: number;
    trackWidth: number;
    wheelbase: number;
    gearRatio: string;
    mass: number;
    friction: number;
    calibrationScore: Confidence;
  };
};

export type CodePatch = {
  codeVersionId: string;
  filePath: string;
  insertAfter?: { line: number; pattern?: string };
  oldText?: string;
  newText: string;
  reason: string;
  generatedBy: 'path_planner' | 'motor_mapper' | 'troubleshooter';
};

export type AiProviderResult = {
  provider: string;
  model?: string;
  status: 'ready' | 'missing_key' | 'ok' | 'error';
  content?: string;
  error?: string;
};

export type AiAdvice = {
  task: string;
  summary: string;
  providers: AiProviderResult[];
};

export type IntegrationStatus = {
  key: string;
  configured: boolean;
  feature: string;
};

export type SponsorSignal = {
  source: string;
  status: 'ok' | 'missing_key' | 'error';
  summary: string;
};
