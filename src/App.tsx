import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState, type MouseEventHandler, type ReactElement, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiInsights, event, matches, metrics, predictions, rankings, recommendations, skillsResults, teams, users, workspace } from './data/mockData';
import { api, teamByNumber } from './services/api';
import { useRoboLabStore } from './store/useRoboLabStore';
import type { Conversation, Match, Message, PickList, Team } from './types';

type IconProps = { size?: number };
type IconComponent = (props: IconProps) => ReactElement;

function makeIcon(label: string): IconComponent {
  return ({ size = 18 }) => (
    <span className="rl-icon" style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.48)) }} aria-hidden="true">
      {label}
    </span>
  );
}

const Bell = makeIcon('BL');
const Bot = makeIcon('BT');
const Brain = makeIcon('AI');
const CalendarDays = makeIcon('EV');
const ChevronLeft = makeIcon('<');
const Code2 = makeIcon('</>');
const Compass = makeIcon('CP');
const Gauge = makeIcon('GA');
const Home = makeIcon('HM');
const Info = makeIcon('i');
const MessageCircle = makeIcon('MS');
const MoreHorizontal = makeIcon('...');
const Plus = makeIcon('+');
const Rocket = makeIcon('RK');
const Search = makeIcon('SR');
const Send = makeIcon('SD');
const Settings = makeIcon('ST');
const Shield = makeIcon('SH');
const Sparkles = makeIcon('AI');
const Star = makeIcon('*');
const Trophy = makeIcon('TR');
const Users = makeIcon('TM');
const Wrench = makeIcon('WR');
const Zap = makeIcon('MP');

const nav = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/scout', label: 'Scout', icon: Search },
  { to: '/app/events', label: 'Events', icon: CalendarDays },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
  { to: '/app/more', label: 'More', icon: MoreHorizontal },
];

const desktopNav = [
  ...nav.slice(0, 3),
  { to: '/app/teams/39333Z', label: 'Teams', icon: Users },
  { to: '/app/compare', label: 'Compare', icon: Gauge },
  { to: '/app/alliance', label: 'Alliance', icon: Trophy },
  { to: '/app/coach', label: 'AI Coach', icon: Brain },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
  { to: '/app/robot-lab', label: 'Robot Lab', icon: Bot },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const strategies = ['Balanced scoring', 'Strong autonomous', 'Defense-heavy', 'Skills-focused', 'Reliable consistency', 'High-risk high-reward', 'Complement our robot'];
const noteModes = ['match', 'pit', 'super', 'review'] as const;

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getTeam(number: string) {
  return teamByNumber(number);
}

function teamLabel(number: string) {
  const team = getTeam(number);
  return `${team.number} - ${team.name}`;
}

function routeTitle(pathname: string) {
  if (pathname.includes('/scout')) return 'Scout';
  if (pathname.includes('/events')) return 'Event Center';
  if (pathname.includes('/teams')) return 'Team Profile';
  if (pathname.includes('/compare')) return 'Compare';
  if (pathname.includes('/alliance')) return 'Alliance Builder';
  if (pathname.includes('/predict')) return 'Match Predictor';
  if (pathname.includes('/coach')) return 'AI Coach';
  if (pathname.includes('/notes')) return 'Scouting Notes';
  if (pathname.includes('/messages')) return 'Messages';
  if (pathname.includes('/robot-lab')) return 'Robot Lab';
  if (pathname.includes('/settings')) return 'Settings';
  if (pathname.includes('/more')) return 'More';
  return 'RoboLab';
}

function fabFor(pathname: string) {
  if (pathname.includes('/coach')) return { label: 'Ask AI', to: '/app/coach', icon: Sparkles };
  if (pathname.includes('/compare')) return { label: 'Compare Team', to: '/app/compare', icon: Gauge };
  if (pathname.includes('/alliance') || pathname.includes('/teams')) return { label: 'Add to Pick List', to: '/app/alliance', icon: Trophy };
  if (pathname.includes('/events') || pathname.includes('/notes')) return { label: 'Scout Match', to: '/app/notes', icon: Plus };
  if (pathname.includes('/messages')) return { label: 'New Chat', to: '/app/messages', icon: MessageCircle };
  return { label: 'Add Note', to: '/app/notes', icon: Plus };
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const fab = fabFor(location.pathname);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Link to="/app" className="brand-lockup">
          <div className="brand-mark">RL</div>
          <div>
            <strong>RoboLab</strong>
            <span>{workspace.teamNumber} command</span>
          </div>
        </Link>
        <nav>
          {desktopNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-status">
          <span className="live-dot" />
          <div>
            <strong>{event.status}</strong>
            <p>Official data cached server-side</p>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="top-command">
          <button className="icon-button mobile-only" onClick={() => navigate(-1)} aria-label="Back">
            <ChevronLeft size={21} />
          </button>
          <div>
            <p className="eyebrow">VEX V5RC competition assistant</p>
            <h1>{routeTitle(location.pathname)}</h1>
          </div>
          <label className="command-search desktop-only">
            <Search size={18} />
            <input placeholder="Search teams, matches, notes, chats" />
          </label>
          <div className="top-actions">
            <Pill tone={workspace.syncStatus === 'Fresh' ? 'success' : 'warn'}>{workspace.syncStatus}</Pill>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="content-shell">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              <Routes>
                <Route index element={<HomeDashboard />} />
                <Route path="scout" element={<ScoutSearch />} />
                <Route path="events" element={<EventCenter />} />
                <Route path="events/:id" element={<EventCenter />} />
                <Route path="teams/:number" element={<TeamProfile />} />
                <Route path="compare" element={<TeamCompare />} />
                <Route path="alliance" element={<AllianceBuilder />} />
                <Route path="predict" element={<MatchPredictor />} />
                <Route path="coach" element={<AICoach />} />
                <Route path="notes" element={<ScoutingNotes />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="robot-lab" element={<RobotLab />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="more" element={<MorePage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Link className="floating-action" to={fab.to}>
        <fab.icon size={18} />
        <span>{fab.label}</span>
      </Link>

      <nav className="mobile-tabbar">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={({ isActive }) => cn(isActive && 'active')}>
            <item.icon size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'blue' | 'cyan' | 'orange' | 'success' | 'danger' | 'warn' }) {
  return <span className={cn('pill', `pill-${tone}`)}>{children}</span>;
}

function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: MouseEventHandler<HTMLElement> }) {
  return <section className={cn('glass-card', className)} onClick={onClick}>{children}</section>;
}

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StateStrip({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('state-strip', compact && 'compact')}>
      <div className="skeleton-line" />
      <span>Empty states explain the next action.</span>
      <span className="state-error">Errors keep cached data visible.</span>
    </div>
  );
}

function ProgressBar({ value, tone = 'blue' }: { value: number; tone?: 'blue' | 'cyan' | 'orange' | 'green' | 'red' }) {
  return (
    <div className="progress-track">
      <span className={`progress-fill ${tone}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  );
}

function TeamMiniCard({ team, actions = true }: { team: Team; actions?: boolean }) {
  const { favorites, toggleFavorite, addCompareTeam } = useRoboLabStore();
  return (
    <Card className="team-card">
      <div className="team-card-top">
        <Link to={`/app/teams/${team.number}`}>
          <strong>{team.number}</strong>
          <span>{team.name}</span>
        </Link>
        <button className={cn('icon-button', favorites.includes(team.number) && 'hot')} onClick={() => toggleFavorite(team.number)} aria-label="Favorite team">
          <Star size={18} />
        </button>
      </div>
      <p>{team.organization}</p>
      <div className="team-stats-row">
        <span>Skills #{team.skillsRank}</span>
        <span>{Math.round(team.winRate * 100)}% win</span>
        <span>{team.recentForm} form</span>
      </div>
      <ProgressBar value={team.consistency} tone={team.riskScore > 24 ? 'red' : 'cyan'} />
      {actions ? (
        <div className="button-row">
          <Link className="secondary-button" to={`/app/teams/${team.number}`}>
            View Team
          </Link>
          <button className="secondary-button" onClick={() => addCompareTeam(team.number)}>
            Compare
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function MatchCard({ match }: { match: Match }) {
  const prediction = predictions.find((item) => item.matchId === match.id);
  const blueFavored = (prediction?.blueWinProbability ?? 50) >= 50;
  return (
    <Card className="match-card">
      <div className="match-header">
        <div>
          <strong>{match.number}</strong>
          <span>{match.field} · {match.time}</span>
        </div>
        <Pill tone={blueFavored ? 'blue' : 'danger'}>{blueFavored ? 'Blue edge' : 'Red edge'}</Pill>
      </div>
      <div className="alliance-grid">
        <div className="alliance red">
          <span>Red</span>
          {match.red.map((number) => (
            <Link key={number} to={`/app/teams/${number}`}>
              {teamLabel(number)}
            </Link>
          ))}
        </div>
        <div className="alliance blue">
          <span>Blue</span>
          {match.blue.map((number) => (
            <Link key={number} to={`/app/teams/${number}`}>
              {teamLabel(number)}
            </Link>
          ))}
        </div>
      </div>
      <div className="match-footer">
        <span>{match.redScore === undefined ? 'Upcoming' : `Final ${match.redScore}-${match.blueScore}`}</span>
        <span>AI {prediction?.confidence ?? 'Medium'} confidence</span>
      </div>
      <div className="button-row">
        <Link className="secondary-button" to="/app/notes">
          Add Note
        </Link>
        <Link className="secondary-button" to="/app/compare">
          Compare Alliance
        </Link>
      </div>
    </Card>
  );
}

function HomeDashboard() {
  const { favorites, notes } = useRoboLabStore();
  const favoriteTeams = favorites.map(getTeam);
  const nextMatch = matches.find((match) => match.red.includes(workspace.teamNumber) || match.blue.includes(workspace.teamNumber)) ?? matches[12];
  const unsynced = notes.filter((note) => note.syncState !== 'synced').length;

  return (
    <div className="screen-grid">
      <Card className="hero-card">
        <div>
          <Pill tone="cyan">{workspace.syncStatus} data</Pill>
          <h2>{workspace.teamNumber} {workspace.teamName}</h2>
          <p>{event.name} · {event.venue}</p>
        </div>
        <div className="hero-score">
          <strong>{unsynced}</strong>
          <span>unsynced notes</span>
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <SectionHeader title="Next match" eyebrow="Queue focus" action={<Pill tone="orange">{nextMatch.number}</Pill>} />
          <MatchCard match={nextMatch} />
        </Card>
        <Card>
          <SectionHeader title="AI strategy alert" eyebrow="Explainable recommendation" />
          <div className="ai-card">
            <Sparkles size={19} />
            <div>
              <strong>{aiInsights[0].title}</strong>
              <p>{aiInsights[0].summary}</p>
              <div className="chip-row">{aiInsights[0].dataSources.map((source) => <Pill key={source} tone="cyan">{source}</Pill>)}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Quick actions" action={<Pill tone="success">Useful in 5 seconds</Pill>} />
        <div className="quick-actions">
          {[
            ['/app/notes', 'Scout Match', Plus],
            ['/app/scout', 'Search Team', Search],
            ['/app/compare', 'Compare Teams', Gauge],
            ['/app/alliance', 'Build Pick List', Trophy],
            ['/app/coach', 'Ask AI Coach', Brain],
          ].map(([to, label, Icon]) => (
            <Link key={String(to)} to={String(to)} className="action-tile">
              <Icon size={20} />
              <span>{String(label)}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card>
          <SectionHeader title="Favorite teams" />
          <div className="mini-list">{favoriteTeams.map((team) => <TeamMiniCard key={team.number} team={team} actions={false} />)}</div>
        </Card>
        <Card>
          <SectionHeader title="Recent scouting notes" action={<Link className="tiny-link" to="/app/notes">Open all</Link>} />
          <div className="note-list">
            {notes.slice(0, 4).map((note) => (
              <div className="note-row" key={note.id}>
                <strong>{teamLabel(note.teamNumber)}</strong>
                <p>{note.body}</p>
                <Pill tone={note.syncState === 'synced' ? 'success' : note.syncState === 'failed' ? 'danger' : 'warn'}>{note.syncState}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <StateStrip />
    </div>
  );
}

function ScoutSearch() {
  const [query, setQuery] = useState('');
  const filtered = teams.filter((team) => `${team.number} ${team.name} ${team.organization} ${team.region}`.toLowerCase().includes(query.toLowerCase()));
  const { isLoading, isError } = useQuery({ queryKey: ['team-search', query], queryFn: () => api.teams.search(query) });

  return (
    <div className="screen-grid">
      <Card className="search-panel">
        <label className="big-search">
          <Search size={22} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team number, name, school, region" />
        </label>
        <div className="chip-row">
          {['V5RC', '2025-2026', 'Singapore', event.name, event.division].map((filter) => <Pill key={filter}>{filter}</Pill>)}
        </div>
      </Card>
      <div className="three-column">
        <Card>
          <SectionHeader title="Favorite teams" />
          <div className="compact-list">{teams.slice(1, 5).map((team) => <Link key={team.number} to={`/app/teams/${team.number}`}>{team.number} · {team.name}</Link>)}</div>
        </Card>
        <Card>
          <SectionHeader title="Favorite events" />
          <p className="muted">{event.name}</p>
          <Pill tone="success">{event.status}</Pill>
        </Card>
        <Card>
          <SectionHeader title="Recent matches" />
          <div className="compact-list">{matches.slice(0, 4).map((match) => <span key={match.id}>{match.number}: {match.red[0]} vs {match.blue[0]}</span>)}</div>
        </Card>
      </div>
      <SectionHeader title="Teams" eyebrow={isLoading ? 'Loading official cache' : isError ? 'Cached fallback shown' : `${filtered.length} matching teams`} />
      <div className="team-grid">
        {(filtered.length ? filtered : teams).map((team) => <TeamMiniCard key={team.number} team={team} />)}
      </div>
      <StateStrip />
    </div>
  );
}

function EventCenter() {
  const [tab, setTab] = useState('Schedule');
  const tabNames = ['Overview', 'Schedule', 'Rankings', 'Skills', 'Teams', 'Scout', 'Predictions', 'Alliance'];
  return (
    <div className="screen-grid">
      <Card className="event-hero">
        <div>
          <Pill tone="blue">{event.sku}</Pill>
          <h2>{event.name}</h2>
          <p>{event.venue} · {event.date} · {event.division}</p>
        </div>
        <Pill tone="success">{event.status}</Pill>
      </Card>
      <div className="tabs">
        {tabNames.map((name) => <button className={cn(tab === name && 'active')} key={name} onClick={() => setTab(name)}>{name}</button>)}
      </div>
      {tab === 'Rankings' ? (
        <Card>
          <SectionHeader title="Rankings" />
          <div className="rank-list">{rankings.map((ranking) => <div key={ranking.teamNumber}><strong>#{ranking.rank} {teamLabel(ranking.teamNumber)}</strong><span>{ranking.record} · WP {ranking.wp}</span></div>)}</div>
        </Card>
      ) : tab === 'Skills' ? (
        <Card>
          <SectionHeader title="Skills" />
          <div className="rank-list">{skillsResults.map((result) => <div key={result.teamNumber}><strong>#{result.rank} {teamLabel(result.teamNumber)}</strong><span>{result.programming} prog · {result.driver} driver · {result.total} total</span></div>)}</div>
        </Card>
      ) : tab === 'Predictions' ? (
        <MatchPredictor />
      ) : tab === 'Alliance' ? (
        <AllianceBuilder embedded />
      ) : (
        <div className="match-list">{matches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
      )}
      <StateStrip compact />
    </div>
  );
}

function TeamProfile() {
  const { number = '39333Z' } = useParams();
  const team = getTeam(number);
  const teamNotes = useRoboLabStore((state) => state.notes.filter((note) => note.teamNumber === team.number));
  const { toggleFavorite, addCompareTeam, movePick } = useRoboLabStore();
  const recentMatches = matches.filter((match) => match.red.includes(team.number) || match.blue.includes(team.number)).slice(0, 5);

  return (
    <div className="screen-grid">
      <Card className="profile-hero">
        <div>
          <Pill tone="orange">{team.region}</Pill>
          <h2>{team.number} {team.name}</h2>
          <p>{team.organization}</p>
        </div>
        <div className="button-row">
          <button className="secondary-button" onClick={() => toggleFavorite(team.number)}><Star size={17} /> Favorite</button>
          <button className="secondary-button" onClick={() => addCompareTeam(team.number)}><Gauge size={17} /> Compare</button>
          <button className="primary-button" onClick={() => movePick('B', team.number)}><Trophy size={17} /> Pick List</button>
        </div>
      </Card>
      <div className="stat-grid">
        {[
          ['Win rate', `${Math.round(team.winRate * 100)}%`, team.winRate * 100],
          ['Average score', team.avgScore, team.avgScore],
          ['Max score', team.maxScore, team.maxScore / 1.5],
          ['Skills score', team.skillsScore, team.skillsScore / 3],
          ['Consistency', team.consistency, team.consistency],
          ['Autonomous', team.autonomousSignal, team.autonomousSignal],
          ['Reliability', team.reliability, team.reliability],
          ['Scout trust', team.scoutTrust, team.scoutTrust],
        ].map(([label, value, percent]) => (
          <Card className="stat-card" key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <ProgressBar value={Number(percent)} tone={label === 'Autonomous' ? 'orange' : 'cyan'} />
          </Card>
        ))}
      </div>
      <Card>
        <SectionHeader title="AI summary" eyebrow="Student-friendly explanation" action={<Pill tone={team.scoutTrust > 80 ? 'success' : 'warn'}>{team.scoutTrust > 80 ? 'High' : 'Medium'} confidence</Pill>} />
        <p className="body-copy">Team {team.number} looks useful because {team.notesSummary.toLowerCase()} They would be a good alliance partner when their role matches your strategy. RoboLab is using official rankings, skills data, match history, and scout notes. Missing or conflicting scout notes lower confidence.</p>
      </Card>
      <div className="dashboard-grid">
        <Card>
          <SectionHeader title="Recent events and matches" />
          <div className="compact-list">{recentMatches.map((match) => <span key={match.id}>{match.number} · {match.field} · {match.redScore ?? 'upcoming'}-{match.blueScore ?? ''}</span>)}</div>
        </Card>
        <Card>
          <SectionHeader title="Tags and notes" />
          <div className="chip-row">{team.tags.map((tag) => <Pill key={tag} tone={tag.includes('Risk') || tag.includes('Mechanical') ? 'danger' : 'blue'}>{tag}</Pill>)}</div>
          <div className="note-list">
            {(teamNotes.length ? teamNotes : [{ id: 'empty', body: 'No local notes yet. Add a match or pit note to improve AI confidence.', syncState: 'local_only', teamNumber: team.number, tags: [], author: 'RoboLab', createdAt: 'now', mode: 'review' as const }]).map((note) => <div className="note-row" key={note.id}><p>{note.body}</p><Pill>{note.syncState}</Pill></div>)}
          </div>
        </Card>
      </div>
      <StateStrip />
    </div>
  );
}

function TeamCompare() {
  const { compareTeams } = useRoboLabStore();
  const selected = compareTeams.map(getTeam);
  const metricKeys = metrics.slice(0, 12);
  const bestFor = (key: keyof Team) => selected.reduce((best, team) => Number(team[key]) > Number(best[key]) ? team : best, selected[0]);
  const weakestFor = (key: keyof Team) => selected.reduce((weak, team) => Number(team[key]) < Number(weak[key]) ? team : weak, selected[0]);

  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="Team compare" eyebrow="2-6 team alliance selection" action={<Link className="primary-button" to="/app/scout"><Plus size={17} /> Add team</Link>} />
        <div className="mobile-swipe-row">{selected.map((team) => <TeamMiniCard key={team.number} team={team} actions={false} />)}</div>
      </Card>
      <Card className="compare-table-card">
        <div className="compare-table">
          <div className="compare-row header"><span>Metric</span>{selected.map((team) => <strong key={team.number}>{team.number}<small>{team.name}</small></strong>)}</div>
          {metricKeys.map((metric) => {
            const key = metric.key as keyof Team;
            const best = bestFor(key);
            const weak = weakestFor(key);
            return (
              <div className="compare-row" key={metric.key}>
                <span>{metric.label}<Info size={14} /><em>{metric.why}</em></span>
                {selected.map((team) => (
                  <b key={team.number} className={cn(team.number === best.number && 'best', team.number === weak.number && 'weak', team.scoutTrust < 70 && 'low-confidence')}>
                    {metric.key === 'winRate' ? `${Math.round(team.winRate * 100)}%` : String(team[key])}
                  </b>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <SectionHeader title="RoboLab explanation" />
        <p className="body-copy">Best metrics are highlighted in cyan, weakest values in red, and low scout-trust values get a warning style. Compatibility is not a black box: performance, consistency, autonomous fit, role complement, skills, scout trust, and risk penalty are all visible in Alliance Builder.</p>
      </Card>
      <StateStrip />
    </div>
  );
}

function AllianceBuilder({ embedded = false }: { embedded?: boolean }) {
  const [strategy, setStrategy] = useState(strategies[0]);
  const { pickList, movePick } = useRoboLabStore();
  return (
    <div className="screen-grid">
      {!embedded ? (
        <Card className="event-hero">
          <div>
            <Pill tone="cyan">Transparent AI</Pill>
            <h2>Alliance Builder</h2>
            <p>Compatibility = performance, consistency, auton fit, role complement, skills, scout trust, minus risk.</p>
          </div>
        </Card>
      ) : null}
      <Card>
        <div className="control-grid">
          <label><span>Our team</span><select defaultValue={workspace.teamNumber}><option>{workspace.teamNumber} {workspace.teamName}</option></select></label>
          <label><span>Event</span><select defaultValue={event.id}><option>{event.name}</option></select></label>
          <label><span>Strategy</span><select value={strategy} onChange={(event) => setStrategy(event.target.value)}>{strategies.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </Card>
      <div className="alliance-layout">
        <Card>
          <SectionHeader title="AI recommended top 5" action={<Pill tone="orange">{strategy}</Pill>} />
          <div className="recommendation-list">
            {recommendations.map((recommendation) => {
              const team = getTeam(recommendation.teamNumber);
              return (
                <div className="recommendation-card" key={recommendation.teamNumber}>
                  <div>
                    <strong>{team.number} {team.name}</strong>
                    <p>{recommendation.reason}</p>
                    <span>Risk: {recommendation.risk}</span>
                  </div>
                  <div className="score-ring">{recommendation.compatibility}%</div>
                  <div className="chip-row">
                    <Pill tone={recommendation.confidence === 'High' ? 'success' : 'warn'}>{recommendation.confidence}</Pill>
                    <Pill>Scout trust {recommendation.formula.scoutTrustScore}</Pill>
                    <Pill>Risk -{recommendation.formula.riskPenalty}</Pill>
                  </div>
                  <button className="primary-button" onClick={() => movePick('A', team.number)}>Add to Pick List</button>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Pick list tiers" action={<Pill tone="cyan">Editable</Pill>} />
          <div className="tier-list">
            {(Object.entries(pickList.tiers) as Array<[keyof PickList['tiers'], string[]]>).map(([tier, numbers]) => (
              <div className={cn('tier-card', tier === 'Avoid' && 'avoid')} key={tier}>
                <strong>Tier {tier}</strong>
                {numbers.map((number) => <Link key={number} to={`/app/teams/${number}`}>{teamLabel(number)}</Link>)}
                {!numbers.length ? <span>Empty</span> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <StateStrip compact />
    </div>
  );
}

function MatchPredictor() {
  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="AI Match Predictor" eyebrow="Educational estimates and can be wrong" />
        <div className="prediction-list">
          {predictions.map((prediction) => {
            const match = matches.find((item) => item.id === prediction.matchId)!;
            return (
              <div className="prediction-card" key={prediction.matchId}>
                <div className="match-header"><strong>{match.number}</strong><Pill>{prediction.confidence} confidence</Pill></div>
                <div className="probability-row">
                  <div><span>Red {prediction.redWinProbability}%</span><ProgressBar value={prediction.redWinProbability} tone="red" /></div>
                  <div><span>Blue {prediction.blueWinProbability}%</span><ProgressBar value={prediction.blueWinProbability} tone="blue" /></div>
                </div>
                <p>{prediction.strategy}</p>
                <ul>{prediction.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <div className="chip-row">{prediction.risks.map((risk) => <Pill key={risk} tone="warn">{risk}</Pill>)}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <StateStrip />
    </div>
  );
}

function AICoach() {
  const [messages, setMessages] = useState([
    { role: 'assistant', body: 'Ask me about alliance picks, match strategy, scout note summaries, autonomous risk, or team comparisons. I only use workspace data and I will say when data is missing.' },
  ]);
  const [draft, setDraft] = useState('');

  function ask() {
    if (!draft.trim()) return;
    const answer = `RoboLab AI recommendation: start with ${recommendations[0].teamNumber} and ${recommendations[1].teamNumber} for a high-confidence pick list. Confidence is Medium because official data is strong, but scouting notes are uneven. Data used: official match data, skills data, rankings, recent form, and local scouting notes.`;
    setMessages((items) => [...items, { role: 'user', body: draft }, { role: 'assistant', body: answer }]);
    setDraft('');
  }

  return (
    <div className="coach-layout">
      <Card className="coach-thread">
        <SectionHeader title="RoboLab AI Coach" action={<Pill tone="cyan">Custom for VEX V5RC</Pill>} />
        <div className="chat-thread">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={cn('coach-bubble', message.role === 'user' && 'mine')}>
              {message.role === 'assistant' ? <Sparkles size={17} /> : null}
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <div className="composer">
          <button className="icon-button"><Plus size={19} /></button>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && ask()} placeholder="Ask: Who should we pick for Q34?" />
          <button className="send-button" disabled={!draft.trim()} onClick={ask}><Send size={18} /></button>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Useful prompts" />
        <div className="compact-list">
          {['Build me a pick list.', 'Which team has the most risk?', 'Summarize our scouting notes.', 'Explain this match prediction.', 'What strategy should we use next match?'].map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)}>{prompt}</button>)}
        </div>
      </Card>
    </div>
  );
}

function ScoutingNotes() {
  const [mode, setMode] = useState<(typeof noteModes)[number]>('match');
  const { notes, addNote } = useRoboLabStore();
  const [teamNumber, setTeamNumber] = useState('39333Z');
  const [body, setBody] = useState('');

  function save() {
    addNote({
      id: `note-local-${Date.now()}`,
      teamNumber,
      mode,
      alliance: 'blue',
      tags: ['Reliable'],
      body: body || 'Quick scout note saved from RoboLab.',
      author: 'Shervin',
      createdAt: 'now',
      syncState: navigator.onLine ? 'syncing' : 'local_only',
      autonomousSuccess: true,
      driverControl: 4,
      defense: 2,
      scoringEstimate: 65,
    });
    setBody('');
  }

  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="Scouting notes" eyebrow="Saves instantly offline" action={<Pill tone="warn">{notes.filter((note) => note.syncState !== 'synced').length} queued</Pill>} />
        <div className="tabs compact">{noteModes.map((item) => <button className={cn(mode === item && 'active')} key={item} onClick={() => setMode(item)}>{item}</button>)}</div>
        <div className="scout-form">
          <label><span>Team</span><select value={teamNumber} onChange={(event) => setTeamNumber(event.target.value)}>{teams.map((team) => <option key={team.number} value={team.number}>{team.number} {team.name}</option>)}</select></label>
          <label><span>Match</span><input placeholder="Q34" /></label>
          <label><span>Alliance</span><select><option>Blue</option><option>Red</option></select></label>
          <label><span>Autonomous</span><select><option>Success</option><option>Partial</option><option>Failed</option></select></label>
          <label><span>Driver control</span><input type="range" min="1" max="5" defaultValue="4" /></label>
          <label><span>Defense</span><input type="range" min="1" max="5" defaultValue="2" /></label>
          <label className="wide"><span>Free-text note</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Fast cycles, clean wiring, intake jam, good partner communication..." /></label>
        </div>
        <div className="chip-row">
          {['Strong auton', 'Fast driver', 'Reliable', 'Defense', 'Good partner', 'Risky', 'Mechanical issues', 'Inconsistent'].map((tag) => <Pill key={tag}>{tag}</Pill>)}
        </div>
        <button className="primary-button full" onClick={save}>Save note</button>
      </Card>
      <Card>
        <SectionHeader title="Offline queue" />
        <div className="note-list">{notes.map((note) => <div className="note-row" key={note.id}><strong>{teamLabel(note.teamNumber)}</strong><p>{note.body}</p><Pill tone={note.syncState === 'synced' ? 'success' : note.syncState === 'failed' ? 'danger' : 'warn'}>{note.syncState}</Pill></div>)}</div>
      </Card>
      <StateStrip />
    </div>
  );
}

function ConversationAvatar({ conversation }: { conversation: Conversation }) {
  const initials = conversation.type === 'direct' ? users.find((user) => conversation.memberIds.includes(user.id) && user.id !== 'u1')?.avatarUrl : conversation.name.slice(0, 2).toUpperCase();
  return <div className={cn('avatar', conversation.type)}>{initials}</div>;
}

function MessagesPage() {
  const { conversations, messages, activeConversationId, setActiveConversation, sendMessage, createConversation } = useRoboLabStore();
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const active = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];
  const thread = messages.filter((message) => message.conversationId === active.id);

  function send() {
    if (!draft.trim()) return;
    sendMessage(active.id, draft);
    setDraft('');
  }

  return (
    <div className="messages-layout">
      <Card className="conversation-panel">
        <SectionHeader title="Messages" action={<button className="primary-button" onClick={() => setShowNew(true)}><Plus size={17} /> New</button>} />
        <label className="message-search"><Search size={17} /><input placeholder="Search conversations" /></label>
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button key={conversation.id} className={cn('conversation-card', active.id === conversation.id && 'active')} onClick={() => setActiveConversation(conversation.id)}>
              <ConversationAvatar conversation={conversation} />
              <div>
                <strong>{conversation.name}</strong>
                <p>{conversation.lastMessagePreview}</p>
                <span>{conversation.type} · {conversation.updatedAt}</span>
              </div>
              {conversation.unreadCount ? <b>{conversation.unreadCount}</b> : <span className="online-dot" />}
            </button>
          ))}
        </div>
      </Card>

      <Card className="thread-panel">
        <div className="chat-header">
          <ConversationAvatar conversation={active} />
          <div>
            <strong>{active.name}</strong>
            <span>{active.memberIds.length} members · workspace-private</span>
          </div>
          <button className="icon-button"><Shield size={18} /></button>
        </div>
        <div className="pinned-strip"><Sparkles size={15} /> Pinned: AI strategy summary and Match Q34 plan</div>
        <div className="message-thread">
          {thread.map((message) => <MessageBubble key={message.id} message={message} />)}
          <div className="typing-indicator"><span /><span /><span /> Maya is typing</div>
        </div>
        <div className="composer message-composer">
          <button className="icon-button"><Plus size={19} /></button>
          <button className="context-button">Link Team</button>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder="Message your workspace or type @AI..." />
          <button className="send-button" disabled={!draft.trim()} onClick={send}><Send size={18} /></button>
        </div>
      </Card>

      {showNew ? (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <Card className="new-chat-modal" onClick={(event) => event.stopPropagation()}>
            <SectionHeader title="New workspace chat" action={<button className="icon-button" onClick={() => setShowNew(false)}>×</button>} />
            <label className="big-search"><Search size={18} /><input placeholder="Search teammates" /></label>
            <div className="member-grid">{users.slice(1).map((user) => <button key={user.id} onClick={() => { createConversation(user.name, ['u1', user.id]); setShowNew(false); }}><span className="avatar">{user.avatarUrl}</span><strong>{user.name}</strong><small>{user.lastSeenAt}</small></button>)}</div>
            <button className="primary-button full" onClick={() => { createConversation('Q34 Drive Team Group', ['u1', 'u2', 'u3', 'u5']); setShowNew(false); }}>Create match-strategy group</button>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const mine = message.senderId === 'u1';
  const sender = users.find((user) => user.id === message.senderId);
  if (message.messageType === 'system') return <div className="system-message">{message.body}</div>;
  if (message.messageType === 'ai_insight') {
    return (
      <div className="ai-message-card">
        <div><Sparkles size={18} /><strong>RoboLab AI</strong><Pill tone="cyan">Medium confidence</Pill></div>
        <p>{message.body}</p>
        <span>Data used: chat messages, scouting notes, match prediction</span>
        <div className="button-row"><button>Pin to Match</button><button>Share to Pick List</button><button>Ask Follow-up</button></div>
      </div>
    );
  }
  return (
    <div className={cn('message-row', mine && 'mine')}>
      {!mine ? <span className="avatar small">{sender?.avatarUrl ?? 'AI'}</span> : null}
      <div className={cn('message-bubble', mine && 'mine')}>
        <p>{message.body}</p>
        {message.messageType === 'card' ? <SharedCard /> : null}
        <span>{message.createdAt} · {message.status === 'failed' ? 'Failed, retry' : message.status === 'sending' ? 'Waiting to send' : mine ? 'Sent' : sender?.name}</span>
        <div className="reaction-row"><button>👍</button><button>👀</button><button>✅</button><button>⚠️</button><button>🤖</button></div>
      </div>
    </div>
  );
}

function SharedCard() {
  const team = getTeam('123A');
  return (
    <div className="shared-card">
      <strong>{team.number} - {team.name}</strong>
      <span>Win {Math.round(team.winRate * 100)}% · Skills {team.skillsScore} · Consistency {team.consistency}</span>
      <div><Link to={`/app/teams/${team.number}`}>View Team</Link><Link to="/app/compare">Compare</Link></div>
    </div>
  );
}

function MorePage() {
  const items = [
    ['/app/coach', 'AI Coach', Brain, 'Ask strategy questions grounded in workspace data.'],
    ['/app/messages', 'Messages', MessageCircle, 'Team chat, match strategy, AI summaries.'],
    ['/app/robot-lab', 'Robot Lab', Bot, 'Code upload, simulator, calibrator, path planner.'],
    ['/app/predict', 'Match Predictor', Zap, 'Win probability and strategy suggestions.'],
    ['/app/alliance', 'Alliance Builder', Trophy, 'Transparent compatibility and pick tiers.'],
    ['/app/settings', 'Settings', Settings, 'Google identity, workspace privacy, sync controls.'],
  ] as const;
  return (
    <div className="screen-grid">
      <Card className="hero-card"><div><Pill tone="cyan">Command center</Pill><h2>More RoboLab tools</h2><p>Everything stays tied to scouting, events, AI decisions, and your team workspace.</p></div></Card>
      <div className="tool-grid">{items.map(([to, title, Icon, copy]) => <Link className="tool-card" to={to} key={to}><Icon size={22} /><strong>{title}</strong><p>{copy}</p></Link>)}</div>
      <StateStrip />
    </div>
  );
}

function RobotLab() {
  const tools = [
    ['Robot Projects', 'Track build versions, robot dimensions, and code packages.', Bot],
    ['Code Upload', 'Upload VEXcode files and detect motors, ports, sensors, and risky changes.', Code2],
    ['Dimension Calibrator', 'Enter wheelbase, wheel size, gear ratios, and turn constants.', Gauge],
    ['Field Path Planner', 'Draw autonomous paths and convert them into VEXcode-ready routines.', Compass],
    ['Simulator', 'Preview autonomous motion on V5RC-style fields with clear scoring zones.', Rocket],
    ['Troubleshooting AI', 'Diagnose drivetrain drift, motor wiring, auton misses, and sensor failures.', Wrench],
  ] as const;
  return (
    <div className="screen-grid">
      <Card className="hero-card">
        <div><Pill tone="orange">Future expansion</Pill><h2>Robot Lab</h2><p>Robot tools are connected to scouting decisions, match strategy, and code review approvals.</p></div>
      </Card>
      <div className="tool-grid">{tools.map(([title, copy, Icon]) => <Card className="robot-tool" key={title}><Icon size={24} /><strong>{title}</strong><p>{copy}</p><button className="secondary-button">Open</button></Card>)}</div>
      <Card className="field-preview">
        <div className="field-surface">
          <div className="field-zone blue">Blue goal zone</div>
          <div className="field-zone red">Red goal zone</div>
          <div className="robot-preview"><span />V5 drivetrain preview</div>
          <svg viewBox="0 0 500 260" aria-hidden="true"><path d="M60 210 C150 120 260 150 420 50" /></svg>
        </div>
      </Card>
      <StateStrip />
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="Workspace identity" eyebrow="Google Auth ready" />
        <div className="settings-list">
          <div><strong>Signed in as Shervin</strong><span>Verified Google identity, email hidden from normal chat UI.</span><Pill tone="success">Connected</Pill></div>
          <div><strong>{workspace.name}</strong><span>Members can only message approved workspace teammates.</span><Pill tone="blue">Private</Pill></div>
          <div><strong>RobotEvents adapter</strong><span>API tokens stay server-side and cached. Frontend never receives keys.</span><Pill tone="success">Protected</Pill></div>
          <div><strong>Messaging moderation</strong><span>Owners and coaches can remove inappropriate messages and disable messaging.</span><Pill tone="cyan">Enabled</Pill></div>
        </div>
      </Card>
      <StateStrip />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/app/*" element={<AppShell />} />
      <Route path="/*" element={<AppShell />} />
    </Routes>
  );
}
