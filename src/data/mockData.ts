import type {
  AIInsight,
  AllianceRecommendation,
  Conversation,
  Event,
  Match,
  MatchPrediction,
  Message,
  PickList,
  Ranking,
  RobotVisionAnalysis,
  ScoutingNote,
  SkillsResult,
  Team,
  TeamMetric,
  Tournament,
  User,
  Workspace,
  WorkspaceMember,
} from '../types';

export const workspace: Workspace = {
  id: 'ws-8059',
  name: 'RoboLab Competition Workspace',
  teamNumber: '8059A',
  teamName: 'Blank.',
  eventId: 'event-sg-2026',
  syncStatus: 'Fresh',
};

export const teams: Team[] = [
  { number: '8059A', name: 'Blank.', organization: 'Anglo-Chinese School (Independent)', region: 'Singapore', skillsRank: 13, skillsScore: 186, programmingSkills: 82, driverSkills: 104, winRate: 0.63, avgScore: 58, maxScore: 113, recentForm: 74, consistency: 78, autonomousSignal: 67, reliability: 82, scoutTrust: 76, riskScore: 18, tags: ['Reliable', 'Fast driver', 'Good partner'], notesSummary: 'Good cycle discipline and low mechanical issue rate. Auton data is useful but not dominant.' },
  { number: '39333Z', name: 'Legacy Robotics', organization: 'Legacy Robotics Academy', region: 'California, US', skillsRank: 4, skillsScore: 254, programmingSkills: 121, driverSkills: 133, winRate: 0.78, avgScore: 72, maxScore: 138, recentForm: 88, consistency: 91, autonomousSignal: 86, reliability: 89, scoutTrust: 84, riskScore: 10, tags: ['Strong auton', 'Reliable', 'Skills-focused'], notesSummary: 'Strong all-around scoring and clean autonomous starts. Expensive to leave open in alliance selection.' },
  { number: '123A', name: 'Circuit Breakers', organization: 'Westview Robotics', region: 'Oregon, US', skillsRank: 21, skillsScore: 171, programmingSkills: 74, driverSkills: 97, winRate: 0.59, avgScore: 54, maxScore: 108, recentForm: 69, consistency: 80, autonomousSignal: 55, reliability: 87, scoutTrust: 81, riskScore: 14, tags: ['Good partner', 'Reliable', 'Fast driver'], notesSummary: 'Looks like a strong second-pick option with reliable driver control and low failure notes.' },
  { number: '315R', name: 'Paradigm', organization: 'Parallax Robotics Club', region: 'Texas, US', skillsRank: 9, skillsScore: 213, programmingSkills: 108, driverSkills: 105, winRate: 0.69, avgScore: 65, maxScore: 124, recentForm: 77, consistency: 74, autonomousSignal: 92, reliability: 72, scoutTrust: 66, riskScore: 24, tags: ['Strong auton', 'Risky', 'High ceiling'], notesSummary: 'Autonomous is dangerous when it hits. Scouts flagged wiring and reset consistency risk.' },
  { number: '24K', name: 'Kraken Robotics', organization: 'North Shore STEM', region: 'British Columbia, CA', skillsRank: 15, skillsScore: 198, programmingSkills: 89, driverSkills: 109, winRate: 0.64, avgScore: 61, maxScore: 116, recentForm: 71, consistency: 83, autonomousSignal: 70, reliability: 80, scoutTrust: 75, riskScore: 16, tags: ['Defense', 'Reliable', 'Good partner'], notesSummary: 'Good defensive awareness and sturdy driver play. Best as a compatibility pick.' },
  { number: '1010X', name: 'Ten Ton Robotics', organization: 'Metro Robotics Lab', region: 'New York, US', skillsRank: 38, skillsScore: 142, programmingSkills: 49, driverSkills: 93, winRate: 0.51, avgScore: 47, maxScore: 94, recentForm: 55, consistency: 58, autonomousSignal: 42, reliability: 64, scoutTrust: 59, riskScore: 35, tags: ['Mechanical issues', 'Inconsistent'], notesSummary: 'Can score quickly, but multiple scouts saw intake jams and late-match slowdown.' },
  { number: '61048B', name: 'LionTech', organization: 'Singapore Robotics Society', region: 'Singapore', skillsRank: 7, skillsScore: 226, programmingSkills: 116, driverSkills: 110, winRate: 0.74, avgScore: 68, maxScore: 129, recentForm: 82, consistency: 85, autonomousSignal: 88, reliability: 78, scoutTrust: 82, riskScore: 15, tags: ['Strong auton', 'Skills-focused', 'Fast driver'], notesSummary: 'Strong skills profile and clear auton strength. Slight risk under heavy defense.' },
  { number: '8044C', name: 'Delta Drive', organization: 'Delta STEM', region: 'Singapore', skillsRank: 18, skillsScore: 184, programmingSkills: 77, driverSkills: 107, winRate: 0.58, avgScore: 56, maxScore: 103, recentForm: 73, consistency: 76, autonomousSignal: 62, reliability: 86, scoutTrust: 79, riskScore: 13, tags: ['Reliable', 'Good partner'], notesSummary: 'Steady and coachable. Strong compatibility when paired with a high-auton robot.' },
  { number: '8065A', name: 'Vector Vortex', organization: 'Vortex Robotics', region: 'Singapore', skillsRank: 11, skillsScore: 207, programmingSkills: 91, driverSkills: 116, winRate: 0.67, avgScore: 63, maxScore: 121, recentForm: 80, consistency: 79, autonomousSignal: 74, reliability: 73, scoutTrust: 71, riskScore: 22, tags: ['Fast driver', 'Defense'], notesSummary: 'Aggressive driver play and strong cycle speed. Risk rises when lanes get crowded.' },
  { number: '8065C', name: 'Vortex Nova', organization: 'Vortex Robotics', region: 'Singapore', skillsRank: 29, skillsScore: 158, programmingSkills: 65, driverSkills: 93, winRate: 0.55, avgScore: 51, maxScore: 98, recentForm: 61, consistency: 70, autonomousSignal: 58, reliability: 77, scoutTrust: 68, riskScore: 20, tags: ['Defense', 'Good partner'], notesSummary: 'Better than rank suggests when given a clear defensive role.' },
  { number: '13888A', name: 'Zenith', organization: 'Zenith STEM', region: 'Singapore', skillsRank: 3, skillsScore: 263, programmingSkills: 130, driverSkills: 133, winRate: 0.81, avgScore: 76, maxScore: 141, recentForm: 91, consistency: 88, autonomousSignal: 94, reliability: 84, scoutTrust: 86, riskScore: 12, tags: ['Strong auton', 'Fast driver', 'Skills-focused'], notesSummary: 'Likely first-pick caliber. High scoring, high autonomous signal, and strong skills proof.' },
  { number: '60800A', name: 'Forge', organization: 'Forge Engineering', region: 'Malaysia', skillsRank: 25, skillsScore: 166, programmingSkills: 72, driverSkills: 94, winRate: 0.57, avgScore: 53, maxScore: 99, recentForm: 66, consistency: 73, autonomousSignal: 61, reliability: 74, scoutTrust: 72, riskScore: 21, tags: ['Good partner', 'Defense'], notesSummary: 'Useful partner for defense-heavy strategies. Needs scouting confirmation on auton.' },
];

export const event: Event = {
  id: 'event-sg-2026',
  name: 'Singapore V5RC National Championship 2026',
  sku: 'RE-V5RC-25-1048',
  program: 'V5RC',
  region: 'Singapore',
  venue: 'Singapore Expo Hall 3',
  date: '2026-03-14',
  division: 'Division 1',
  status: 'Fresh',
};

export const tournaments: Tournament[] = [
  {
    ...event,
    city: 'Singapore',
    state: 'Central',
    country: 'Singapore',
    level: 'National',
    teamCount: 64,
    distanceMiles: 6,
    weatherSummary: 'Indoor venue. Weather only affects travel and loading.',
    qualificationSummary: 'Qualification details are shown only when returned by official event data.',
    awards: [
      { name: 'Tournament Champions', status: 'pending', qualificationNote: 'Awarded after finals. Qualification impact must be confirmed from official event data.' },
      { name: 'Excellence Award', status: 'available', qualificationNote: 'Listed by event configuration; winner unavailable until awards are posted.' },
      { name: 'Robot Skills Champion', status: 'pending', qualificationNote: 'Uses official skills standings after the tournament closes.' },
    ],
  },
  {
    id: 'event-ca-state-2026',
    name: 'California V5RC State Championship',
    sku: 'RE-V5RC-26-7001',
    program: 'V5RC',
    region: 'California, US',
    venue: 'Del Mar Fairgrounds',
    date: '2026-03-14',
    division: 'Technology',
    status: 'Stale',
    city: 'Del Mar',
    state: 'CA',
    country: 'USA',
    level: 'State',
    teamCount: 80,
    distanceMiles: 92,
    weatherSummary: 'Weather widget pending API key.',
    qualificationSummary: 'Cached event shell only. Refresh RobotEvents before claiming awards or qualification.',
    awards: [
      { name: 'Tournament Champions', status: 'unknown', qualificationNote: 'No official winner data cached.' },
      { name: 'Design Award', status: 'unknown', qualificationNote: 'Award list requires official event refresh.' },
    ],
  },
  {
    id: 'event-la-regional-2026',
    name: 'LA Regional Qualifier',
    sku: 'RE-V5RC-26-4812',
    program: 'V5RC',
    region: 'California, US',
    venue: 'LAUSD Convention Center',
    date: '2026-02-08',
    division: 'Main',
    status: 'Updating',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    level: 'Regional',
    teamCount: 48,
    distanceMiles: 24,
    weatherSummary: 'Map/weather panel will use server-side keys when configured.',
    qualificationSummary: 'Regional event. Qualification notes remain unavailable until official awards are fetched.',
    awards: [
      { name: 'Excellence Award', status: 'pending', qualificationNote: 'Do not infer advancement without official source confirmation.' },
      { name: 'Judges Award', status: 'pending', qualificationNote: 'Award configured, winner not posted.' },
    ],
  },
  {
    id: 'event-worlds-2026',
    name: 'VEX Robotics World Championship',
    sku: 'RE-V5RC-26-9000',
    program: 'V5RC',
    region: 'Texas, US',
    venue: 'Kay Bailey Hutchison Convention Center',
    date: '2026-04-25',
    division: 'Opportunity',
    status: 'Offline',
    city: 'Dallas',
    state: 'TX',
    country: 'USA',
    level: 'World',
    teamCount: 800,
    weatherSummary: 'Offline cache. Connect to official source before use.',
    qualificationSummary: 'World event placeholder in developer mock mode only.',
    awards: [
      { name: 'Division Champions', status: 'unknown', qualificationNote: 'No official data loaded.' },
      { name: 'World Excellence Award', status: 'unknown', qualificationNote: 'No official data loaded.' },
    ],
  },
];

export const rankings: Ranking[] = teams
  .map((team, index) => ({ teamNumber: team.number, rank: index + 1, wp: 14 - Math.floor(index / 2), ap: 50 - index * 2, sp: 220 - index * 9, record: `${Math.round(team.winRate * 10)}-${Math.max(0, 10 - Math.round(team.winRate * 10))}-0` }))
  .sort((a, b) => a.rank - b.rank);

export const skillsResults: SkillsResult[] = teams
  .map((team) => ({ teamNumber: team.number, programming: team.programmingSkills, driver: team.driverSkills, total: team.skillsScore, rank: team.skillsRank }))
  .sort((a, b) => a.rank - b.rank);

export const matches: Match[] = Array.from({ length: 20 }, (_, index) => {
  const pool = teams.map((team) => team.number);
  const start = index % (pool.length - 4);
  const red = [pool[start], pool[start + 2]];
  const blue = [pool[start + 1], pool[start + 3]];
  const scored = index < 10;
  return {
    id: `match-${index + 1}`,
    number: `Q${index + 1}`,
    field: index % 2 ? 'Field B' : 'Field A',
    time: `${9 + Math.floor(index / 3)}:${String((index * 7) % 60).padStart(2, '0')}`,
    red,
    blue,
    redScore: scored ? 72 + ((index * 11) % 38) : undefined,
    blueScore: scored ? 68 + ((index * 13) % 42) : undefined,
  };
});

export const notes: ScoutingNote[] = [
  { id: 'note-1', teamNumber: '39333Z', matchNumber: 'Q12', mode: 'match', alliance: 'blue', tags: ['Strong auton', 'Fast driver'], body: 'Clean 5-point autonomous, then fast cycles. No visible repair after match.', author: 'Maya', createdAt: '10:22 AM', syncState: 'synced', autonomousSuccess: true, driverControl: 5, defense: 2, scoringEstimate: 82 },
  { id: 'note-2', teamNumber: '315R', matchNumber: 'Q15', mode: 'match', alliance: 'red', tags: ['Strong auton', 'Mechanical issues'], body: 'Auton scored well but arm stalled once. Check reliability before Tier A.', author: 'Kamran', createdAt: '10:48 AM', syncState: 'local_only', autonomousSuccess: true, driverControl: 4, defense: 2, scoringEstimate: 69, mechanicalIssue: true },
  { id: 'note-3', teamNumber: '123A', matchNumber: 'Q17', mode: 'pit', tags: ['Good partner', 'Reliable'], body: 'Simple drivetrain, clean wiring, two auton routines. Students could explain strategy clearly.', author: 'Shervin', createdAt: '11:02 AM', syncState: 'failed' },
  { id: 'note-4', teamNumber: '1010X', matchNumber: 'Q18', mode: 'match', alliance: 'blue', tags: ['Risky', 'Mechanical issues'], body: 'Intake jam in last 25 seconds. Driver recovered but scoring pace dropped.', author: 'Nina', createdAt: '11:11 AM', syncState: 'conflict', mechanicalIssue: true },
];

function compatibilityFor(team: Team): AllianceRecommendation {
  const formula = {
    performanceScore: Math.round(team.avgScore),
    consistencyScore: team.consistency,
    autonomousFit: Math.round((team.autonomousSignal + (100 - teams[0].autonomousSignal)) / 2),
    roleComplement: team.tags.includes('Defense') ? 86 : team.tags.includes('Fast driver') ? 82 : 76,
    skillsStrength: Math.round(team.skillsScore / 2.8),
    scoutTrustScore: team.scoutTrust,
    riskPenalty: team.riskScore,
  };
  const compatibility = Math.round(0.25 * formula.performanceScore + 0.2 * formula.consistencyScore + 0.15 * formula.autonomousFit + 0.15 * formula.roleComplement + 0.1 * formula.skillsStrength + 0.1 * formula.scoutTrustScore - 0.15 * formula.riskPenalty);
  return {
    teamNumber: team.number,
    compatibility,
    confidence: team.scoutTrust > 80 ? 'High' : team.scoutTrust > 68 ? 'Medium' : 'Low',
    reason: team.tags.includes('Strong auton') ? 'Strong autonomous and skills strength complements our steady driver control.' : 'Reliable driver control and scouting trust make this team a practical partner.',
    risk: team.riskScore > 22 ? 'Mechanical or consistency risk needs one more scout note.' : 'No major risk beyond normal match variance.',
    scoutSummary: team.notesSummary,
    formula,
  };
}

export const recommendations = teams.filter((team) => team.number !== workspace.teamNumber).map(compatibilityFor).sort((a, b) => b.compatibility - a.compatibility).slice(0, 5);

export const predictions: MatchPrediction[] = matches.slice(10, 16).map((match, index) => {
  const redPower = match.red.reduce((sum, number) => sum + (teams.find((team) => team.number === number)?.recentForm ?? 55), 0);
  const bluePower = match.blue.reduce((sum, number) => sum + (teams.find((team) => team.number === number)?.recentForm ?? 55), 0);
  const blueProbability = Math.round((bluePower / (redPower + bluePower)) * 100);
  return {
    matchId: match.id,
    redWinProbability: 100 - blueProbability,
    blueWinProbability: blueProbability,
    confidence: Math.abs(bluePower - redPower) > 18 ? 'High' : 'Medium',
    expectedScoreRange: `${92 + index * 3}-${118 + index * 4}`,
    reasons: ['Recent form and skills scores are the strongest signals.', 'Scout trust is weighted when teams have similar official records.', 'Autonomous notes can swing close matches.'],
    strategy: blueProbability > 55 ? 'Blue should protect cycle lanes and avoid driver errors.' : 'Red should force early traffic and lean on auton consistency.',
    risks: ['Fresh scouting notes can change this estimate.', 'Defense-heavy matches are harder to predict.'],
  };
});

export const aiInsights: AIInsight[] = [
  { id: 'ai-1', title: 'Alliance Signal', summary: '39333Z and 13888A are first-pick caliber. If unavailable, 123A is a reliable second-pick because their driver control complements our autonomous gap.', confidence: 'High', dataSources: ['Official match data', 'Skills data', 'Scouting notes'], actions: ['Pin to pick list', 'Compare top 5'] },
  { id: 'ai-2', title: 'Risk Warning', summary: '315R has high autonomous upside, but scouts flagged a mechanical issue. Watch one more match before locking Tier A.', confidence: 'Medium', dataSources: ['Pit scouting notes', 'Recent form'], actions: ['Assign scout', 'Add risk tag'] },
  { id: 'ai-3', title: 'Match Prep', summary: 'For Q14, avoid traffic in the first 20 seconds and let the stronger auton robot take the protected route.', confidence: 'Medium', dataSources: ['Match schedule', 'Team tags'], actions: ['Share strategy', 'Open match chat'] },
];

export const pickList: PickList = {
  tiers: {
    A: ['39333Z', '13888A'],
    B: ['123A', '61048B', '24K'],
    C: ['8044C', '8065A', '60800A'],
    D: ['8065C'],
    Avoid: ['1010X'],
  },
};

export const metrics: TeamMetric[] = [
  { key: 'avgScore', label: 'Average score', why: 'Shows normal scoring contribution instead of one lucky match.' },
  { key: 'maxScore', label: 'Max score', why: 'Shows ceiling when everything works.' },
  { key: 'winRate', label: 'Win rate', why: 'Useful but alliance-dependent, so do not use it alone.' },
  { key: 'recentForm', label: 'Recent form', why: 'Recent matches matter more during alliance selection.' },
  { key: 'skillsScore', label: 'Skills score', why: 'A clean proxy for robot capability and driver practice.' },
  { key: 'programmingSkills', label: 'Programming skills', why: 'Indicates autonomous and controls quality.' },
  { key: 'driverSkills', label: 'Driver skills', why: 'Shows driver control independent of alliance partners.' },
  { key: 'consistency', label: 'Consistency', why: 'Consistent partners are easier to plan with.' },
  { key: 'autonomousSignal', label: 'Autonomous signal', why: 'Autonomous can decide close matches before driver control starts.' },
  { key: 'reliability', label: 'Reliability', why: 'Reduces dead robot and repair risk.' },
  { key: 'scoutTrust', label: 'Scout trust', why: 'Confidence rises when multiple scouts agree.' },
  { key: 'riskScore', label: 'Risk score', why: 'Flags mechanical issues, inconsistency, and limited data.' },
];

export const users: User[] = [
  { id: 'u1', name: 'Shervin', email: 'shervin@example.com', avatarUrl: 'SS', lastSeenAt: 'online' },
  { id: 'u2', name: 'Maya', email: 'maya@example.com', avatarUrl: 'MR', lastSeenAt: 'online' },
  { id: 'u3', name: 'Kamran', email: 'kamran@example.com', avatarUrl: 'KP', lastSeenAt: '2m ago' },
  { id: 'u4', name: 'Nina', email: 'nina@example.com', avatarUrl: 'NL', lastSeenAt: 'online' },
  { id: 'u5', name: 'Coach Rivera', email: 'coach@example.com', avatarUrl: 'CR', lastSeenAt: '12m ago' },
  { id: 'u6', name: 'Alex', email: 'alex@example.com', avatarUrl: 'AT', lastSeenAt: 'offline' },
];

export const members: WorkspaceMember[] = users.map((user, index) => ({
  workspaceId: workspace.id,
  userId: user.id,
  role: index === 0 ? 'owner' : index === 4 ? 'coach' : index === 1 ? 'captain' : 'scout',
}));

export const conversations: Conversation[] = [
  { id: 'c1', workspaceId: workspace.id, type: 'match', name: 'Match Q34 Strategy', createdBy: 'u1', createdAt: '9:00 AM', updatedAt: '11:28 AM', contextType: 'match', contextId: 'match-14', isPinned: true, isMuted: false, unreadCount: 3, memberIds: ['u1', 'u2', 'u3', 'u5'], lastMessagePreview: '@AI posted a strategy summary for Q34.' },
  { id: 'c2', workspaceId: workspace.id, type: 'alliance', name: 'Alliance Pick List', createdBy: 'u2', createdAt: '9:15 AM', updatedAt: '11:16 AM', contextType: 'picklist', contextId: 'picklist-main', isPinned: true, isMuted: false, unreadCount: 1, memberIds: ['u1', 'u2', 'u3', 'u4', 'u5'], lastMessagePreview: 'Moved 123A to Tier B after pit scout.' },
  { id: 'c3', workspaceId: workspace.id, type: 'event', name: 'Singapore Nationals', createdBy: 'u5', createdAt: '8:40 AM', updatedAt: '10:58 AM', contextType: 'event', contextId: event.id, isPinned: false, isMuted: false, unreadCount: 0, memberIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], lastMessagePreview: 'Field B is running 8 minutes late.' },
  { id: 'c4', workspaceId: workspace.id, type: 'direct', name: 'Maya', createdBy: 'u1', createdAt: '8:00 AM', updatedAt: '10:44 AM', isPinned: false, isMuted: false, unreadCount: 0, memberIds: ['u1', 'u2'], lastMessagePreview: 'Can you scout 39333Z next match?' },
  { id: 'c5', workspaceId: workspace.id, type: 'group', name: 'Pit Scouts', createdBy: 'u3', createdAt: '8:10 AM', updatedAt: '10:39 AM', contextType: 'team', contextId: '315R', isPinned: false, isMuted: false, unreadCount: 2, memberIds: ['u1', 'u3', 'u4'], lastMessagePreview: '315R arm looked better after repair.' },
  { id: 'c6', workspaceId: workspace.id, type: 'robot', name: 'Robot Repair', createdBy: 'u5', createdAt: '7:45 AM', updatedAt: '10:20 AM', contextType: 'robot', contextId: 'robot-main', isPinned: false, isMuted: true, unreadCount: 0, memberIds: ['u1', 'u5', 'u6'], lastMessagePreview: 'Battery sag was the main issue.' },
  { id: 'c7', workspaceId: workspace.id, type: 'direct', name: 'Coach Rivera', createdBy: 'u5', createdAt: '7:30 AM', updatedAt: '9:52 AM', isPinned: false, isMuted: false, unreadCount: 0, memberIds: ['u1', 'u5'], lastMessagePreview: 'Check scout trust before accepting AI picks.' },
  { id: 'c8', workspaceId: workspace.id, type: 'group', name: 'Drive Team', createdBy: 'u1', createdAt: '7:20 AM', updatedAt: '9:40 AM', isPinned: false, isMuted: false, unreadCount: 0, memberIds: ['u1', 'u2', 'u6'], lastMessagePreview: 'Meet at field queue in 5.' },
];

export const messages: Message[] = [
  { id: 'm1', conversationId: 'c1', senderId: 'u2', body: 'Q34 is 8059A + 123A vs 315R + 8065A. Need a clean plan.', messageType: 'text', createdAt: '11:20 AM', status: 'read' },
  { id: 'm2', conversationId: 'c1', senderId: 'u1', body: 'Linking the match card. Blue has more auton, red has better reliability.', messageType: 'card', createdAt: '11:21 AM', status: 'read', contextLinksJson: { type: 'match', id: 'match-14' } },
  { id: 'm3', conversationId: 'c1', senderId: 'ai', body: 'AI Strategy Summary: Let 123A play stable driver control while 8059A protects cycle lanes. Confidence is Medium because 315R has strong autonomous but scout notes show mechanical risk. Data used: official match data, skills data, scouting notes.', messageType: 'ai_insight', createdAt: '11:22 AM', status: 'sent' },
  { id: 'm4', conversationId: 'c1', senderId: 'u5', body: 'Pin that. Also tell drive team not to over-defend early.', messageType: 'text', createdAt: '11:25 AM', status: 'sent' },
  { id: 'm5', conversationId: 'c2', senderId: 'u3', body: '39333Z and 13888A locked Tier A. 123A feels safer than 315R right now.', messageType: 'text', createdAt: '11:05 AM', status: 'sent' },
  { id: 'm6', conversationId: 'c2', senderId: 'u1', body: 'Shervin moved 123A to Tier B.', messageType: 'system', createdAt: '11:08 AM', status: 'sent' },
  { id: 'm7', conversationId: 'c2', senderId: 'ai', body: 'Pick List Insight: 123A is a strong second-pick option. Compatibility 78%, confidence Medium. Reason: reliable driver control and high scout trust. Risk: autonomous data is limited.', messageType: 'ai_insight', createdAt: '11:09 AM', status: 'sent' },
  { id: 'm8', conversationId: 'c3', senderId: 'u4', body: 'Field B is running 8 minutes late. Scouts should stay near queue.', messageType: 'text', createdAt: '10:58 AM', status: 'sent' },
  { id: 'm9', conversationId: 'c4', senderId: 'u1', body: 'Can you scout 39333Z next match?', messageType: 'text', createdAt: '10:41 AM', status: 'read' },
  { id: 'm10', conversationId: 'c4', senderId: 'u2', body: 'Yes. I will tag auton, cycle speed, and any defense issues.', messageType: 'text', createdAt: '10:44 AM', status: 'read' },
  { id: 'm11', conversationId: 'c5', senderId: 'u3', body: '315R arm looked better after repair.', messageType: 'text', createdAt: '10:37 AM', status: 'sent' },
  { id: 'm12', conversationId: 'c5', senderId: 'u4', body: 'Waiting to send: photo of their intake.', messageType: 'text', createdAt: '10:39 AM', status: 'failed' },
  { id: 'm13', conversationId: 'c6', senderId: 'u6', body: 'Battery sag was the main issue. Fresh pack fixed drivetrain brownouts.', messageType: 'text', createdAt: '10:20 AM', status: 'sent' },
  ...Array.from({ length: 17 }, (_, index) => ({
    id: `m-extra-${index}`,
    conversationId: conversations[index % conversations.length].id,
    senderId: users[index % users.length].id,
    body: index % 4 === 0 ? '@AI summarize this chat after the next match.' : `Scouting update ${index + 1}: notes saved and linked to workspace.`,
    messageType: 'text' as const,
    createdAt: `${9 + Math.floor(index / 6)}:${String((index * 4) % 60).padStart(2, '0')} AM`,
    status: index === 5 ? 'sending' as const : 'sent' as const,
  })),
];

export const robotVisionAnalysis: RobotVisionAnalysis = {
  id: 'vision-main',
  projectId: 'robot-8059-2026',
  status: 'AI detected parts',
  assets: [
    { id: 'asset-front', label: 'Front', kind: 'image', status: 'uploaded' },
    { id: 'asset-back', label: 'Back', kind: 'image', status: 'uploaded' },
    { id: 'asset-left', label: 'Left', kind: 'image', status: 'uploaded' },
    { id: 'asset-right', label: 'Right', kind: 'image', status: 'needed' },
    { id: 'asset-top', label: 'Top', kind: 'image', status: 'needed' },
    { id: 'asset-close', label: 'Close-up', kind: 'image', status: 'needed' },
    { id: 'asset-360', label: '360 image', kind: 'image', status: 'needed' },
    { id: 'asset-video', label: 'Walkaround video', kind: 'video', status: 'needed' },
  ],
  parts: [
    { name: 'V5 Robot Brain', sku: '276-4810', category: 'Electronics', quantity: 1, unitCostUsd: 384.99, confidence: 'High', sourceUrl: 'https://www.vexrobotics.com/276-4810.html', sourceLabel: 'VEX Robotics product page', confirmed: true },
    { name: 'V5 Smart Motor (11W)', sku: '276-4840', category: 'Motor', quantity: 6, unitCostUsd: 49.99, confidence: 'High', sourceUrl: 'https://www.vexrobotics.com/276-4840.html', sourceLabel: 'VEX Robotics product page', confirmed: true },
    { name: 'V5 Robot Battery Li-Ion 1100mAh', sku: '276-4811', category: 'Electronics', quantity: 2, unitCostUsd: 76.99, confidence: 'Medium', sourceUrl: 'https://www.vexrobotics.com/276-4811.html', sourceLabel: 'VEX Robotics product page', confirmed: false },
    { name: 'V5 Controller', sku: '276-4820', category: 'Electronics', quantity: 1, unitCostUsd: 137.39, confidence: 'Medium', sourceUrl: 'https://www.vexrobotics.com/276-4820.html', sourceLabel: 'VEX Robotics product page', confirmed: false },
    { name: 'V5 Robot Radio', sku: '276-4831', category: 'Electronics', quantity: 1, unitCostUsd: 48.79, confidence: 'Low', sourceUrl: 'https://www.vexrobotics.com/276-4831.html', sourceLabel: 'VEX Robotics product page', confirmed: false },
    { name: 'V5 Battery Clip (4-Pack)', sku: '276-6020', category: 'Structure', quantity: 1, unitCostUsd: 6.29, confidence: 'Low', sourceUrl: 'https://www.vexrobotics.com/276-6020.html', sourceLabel: 'VEX Robotics product page', confirmed: false },
  ],
  mechanisms: ['6-motor drivetrain candidate', 'roller intake candidate', 'battery and brain mounted high', 'manual label confirmation required'],
  summary: 'RoboLab detected likely V5 electronics and drivetrain components from uploaded robot angles. Quantities and mechanisms must be confirmed before saving to the workspace budget.',
  totalEstimateUsd: 1031.38,
  confidence: 'Medium',
  dataSources: ['User-uploaded robot images', 'Official VEX product pages', 'Official CAD links where available', 'Workspace manual confirmations'],
  updatedAt: '2026-06-02T18:00:00-07:00',
};
