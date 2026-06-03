export type Confidence = 'High' | 'Medium' | 'Low' | 'Not enough data';
export type SyncState = 'local_only' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type Team = {
  number: string;
  name: string;
  organization: string;
  region: string;
  skillsRank: number;
  skillsScore: number;
  programmingSkills: number;
  driverSkills: number;
  winRate: number;
  avgScore: number;
  maxScore: number;
  recentForm: number;
  consistency: number;
  autonomousSignal: number;
  reliability: number;
  scoutTrust: number;
  riskScore: number;
  tags: string[];
  notesSummary: string;
};

export type Event = {
  id: string;
  name: string;
  sku: string;
  program?: 'V5RC' | 'VIQRC' | 'VEX U' | 'VEX AI';
  region: string;
  venue: string;
  date: string;
  division: string;
  status: 'Fresh' | 'Updating' | 'Stale' | 'Offline';
};

export type Tournament = Event & {
  city: string;
  state: string;
  country: string;
  level: 'Regional' | 'Signature' | 'State' | 'National' | 'World';
  teamCount: number;
  distanceMiles?: number;
  awards: Array<{
    name: string;
    status: 'available' | 'pending' | 'awarded' | 'unknown';
    qualificationNote: string;
    winnerTeamNumber?: string;
  }>;
  weatherSummary?: string;
  qualificationSummary: string;
};

export type Match = {
  id: string;
  number: string;
  field: string;
  time: string;
  red: string[];
  blue: string[];
  redScore?: number;
  blueScore?: number;
};

export type Ranking = {
  teamNumber: string;
  rank: number;
  wp: number;
  ap: number;
  sp: number;
  record: string;
};

export type SkillsResult = {
  teamNumber: string;
  programming: number;
  driver: number;
  total: number;
  rank: number;
};

export type ScoutingNote = {
  id: string;
  teamNumber: string;
  matchNumber?: string;
  mode: 'match' | 'pit' | 'super' | 'review' | 'photo_video';
  alliance?: 'red' | 'blue';
  tags: string[];
  body: string;
  author: string;
  createdAt: string;
  syncState: SyncState;
  autonomousSuccess?: boolean;
  driverControl?: number;
  defense?: number;
  scoringEstimate?: number;
  mechanicalIssue?: boolean;
  disabledOrTipped?: boolean;
};

export type PitScoutNote = ScoutingNote & {
  drivetrain?: string;
  intake?: string;
  lift?: string;
  endgame?: string;
  autonomousRoutines?: string;
  photos?: string[];
};

export type MatchScoutNote = ScoutingNote & {
  penalties?: number;
};

export type TeamMetric = {
  key: string;
  label: string;
  why: string;
};

export type CompareResult = {
  teams: string[];
  bestByMetric: Record<string, string>;
  weakestByMetric: Record<string, string>;
  warnings: string[];
};

export type AllianceRecommendation = {
  teamNumber: string;
  compatibility: number;
  confidence: Confidence;
  reason: string;
  risk: string;
  scoutSummary: string;
  formula: {
    performanceScore: number;
    consistencyScore: number;
    autonomousFit: number;
    roleComplement: number;
    skillsStrength: number;
    scoutTrustScore: number;
    riskPenalty: number;
  };
};

export type MatchPrediction = {
  matchId: string;
  redWinProbability: number;
  blueWinProbability: number;
  confidence: Confidence;
  expectedScoreRange: string;
  reasons: string[];
  strategy: string;
  risks: string[];
};

export type AIInsight = {
  id: string;
  title: string;
  summary: string;
  confidence: Confidence;
  dataSources: string[];
  actions: string[];
};

export type PickList = {
  tiers: Record<'A' | 'B' | 'C' | 'D' | 'Avoid', string[]>;
};

export type Workspace = {
  id: string;
  name: string;
  teamNumber: string;
  teamName: string;
  eventId: string;
  syncStatus: Event['status'];
};

export type AppMode = 'production_empty' | 'developer_mock';

export type AppSettings = {
  program: 'V5RC' | 'VIQRC' | 'VEX U' | 'VEX AI';
  season: string;
  teamNumber: string;
  teamName: string;
  school: string;
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  density: 'compact' | 'comfortable';
  mockDataEnabled: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  lastSeenAt: string;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'coach' | 'captain' | 'scout' | 'member';
};

export type ConversationType = 'direct' | 'group' | 'event' | 'match' | 'alliance' | 'robot';

export type Conversation = {
  id: string;
  workspaceId: string;
  type: ConversationType;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  contextType?: 'team' | 'event' | 'match' | 'picklist' | 'robot';
  contextId?: string;
  isPinned: boolean;
  isMuted: boolean;
  unreadCount: number;
  memberIds: string[];
  lastMessagePreview: string;
};

export type ConversationMember = {
  conversationId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  lastReadAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  messageType: 'text' | 'card' | 'ai_insight' | 'system';
  attachmentsJson?: unknown;
  contextLinksJson?: unknown;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  status: 'sending' | 'sent' | 'failed' | 'read';
};

export type MessageReaction = {
  id: string;
  messageId: string;
  userId: string;
  emoji: '👍' | '👀' | '✅' | '⚠️' | '🤖';
  createdAt: string;
};

export type PinnedMessage = {
  id: string;
  conversationId: string;
  messageId: string;
  pinnedBy: string;
  createdAt: string;
};

export type AIInsightMessage = {
  id: string;
  messageId: string;
  insightType: 'summary' | 'strategy' | 'picklist' | 'risk';
  summary: string;
  confidence: Confidence;
  dataSources: string[];
  actionButtonsJson: string[];
};

export type RobotProject = {
  id: string;
  name: string;
  status: 'Ready' | 'Needs repair' | 'Testing' | 'Competition locked' | 'Code issue' | 'Mechanical issue';
};

export type RobotScanAsset = {
  id: string;
  label: 'Front' | 'Back' | 'Left' | 'Right' | 'Top' | 'Close-up' | '360 image' | 'Walkaround video';
  kind: 'image' | 'video';
  status: 'needed' | 'uploaded' | 'analyzing' | 'confirmed';
};

export type RobotPartEstimate = {
  name: string;
  sku: string;
  category: 'Electronics' | 'Motor' | 'Sensor' | 'Structure' | 'Motion' | 'Pneumatics' | 'Fastener' | 'Unknown';
  quantity: number;
  unitCostUsd: number;
  confidence: Confidence;
  sourceUrl: string;
  sourceLabel: string;
  confirmed: boolean;
};

export type RobotVisionAnalysis = {
  id: string;
  projectId: string;
  status: 'Needs images' | 'Ready to analyze' | 'AI detected parts' | 'Manual confirmation needed' | 'Confirmed';
  assets: RobotScanAsset[];
  parts: RobotPartEstimate[];
  mechanisms: string[];
  summary: string;
  totalEstimateUsd: number;
  confidence: Confidence;
  dataSources: string[];
  updatedAt: string;
};
