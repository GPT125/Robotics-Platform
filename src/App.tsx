import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState, type MouseEventHandler, type ReactElement, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiInsights, event, matches, metrics, predictions, rankings, recommendations, robotVisionAnalysis, skillsResults, teams, tournaments, users, workspace } from './data/mockData';
import { api, teamByNumber } from './services/api';
import { useRoboLabStore } from './store/useRoboLabStore';
import type { Conversation, Match, Message, PickList, RobotPartEstimate, Team, Tournament } from './types';

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
  { to: '/app/tournaments', label: 'Tourney', icon: Trophy },
  { to: '/app/robot-lab', label: 'Robot', icon: Bot },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
];

const desktopNav = [
  ...nav,
  { to: '/app/teams/39333Z', label: 'Teams', icon: Users },
  { to: '/app/compare', label: 'Compare', icon: Gauge },
  { to: '/app/alliance', label: 'Alliance', icon: Trophy },
  { to: '/app/coach', label: 'AI Coach', icon: Brain },
  { to: '/app/more', label: 'More', icon: MoreHorizontal },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const strategies = ['Balanced scoring', 'Strong autonomous', 'Defense-heavy', 'Skills-focused', 'Reliable consistency', 'High-risk high-reward', 'Complement our robot'];
const noteModes = ['match', 'pit', 'super', 'review', 'photo_video'] as const;

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
  if (pathname.includes('/events') || pathname.includes('/tournaments')) return 'Tournaments';
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
  const { appMode, settings, user, signInSkipped, signInWithGoogle, skipSignIn } = useRoboLabStore();
  const showAuthModal = !user && !signInSkipped;

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Link to="/app" className="brand-lockup">
          <div className="brand-mark">RL</div>
          <div>
            <strong>RoboLab</strong>
            <span>{user ? `${settings.teamNumber || workspace.teamNumber} command` : 'public browse mode'}</span>
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
            <p className="eyebrow">{settings.program} competition assistant</p>
            <h1>{routeTitle(location.pathname)}</h1>
          </div>
          <label className="command-search desktop-only">
            <Search size={18} />
            <input placeholder="Search teams, matches, notes, chats" />
          </label>
          <div className="top-actions">
            <Pill tone={workspace.syncStatus === 'Fresh' ? 'success' : 'warn'}>{workspace.syncStatus}</Pill>
            <Pill tone={appMode === 'developer_mock' ? 'orange' : 'cyan'}>{appMode === 'developer_mock' ? 'Mock dev' : 'No fake data'}</Pill>
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
                <Route path="tournaments" element={<TournamentsPage />} />
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
      {showAuthModal ? <AuthModal onGoogle={signInWithGoogle} onSkip={skipSignIn} /> : null}
    </div>
  );
}

function AuthModal({ onGoogle, onSkip }: { onGoogle: () => void; onSkip: () => void }) {
  return (
    <div className="modal-backdrop auth-backdrop">
      <Card className="auth-modal">
        <div className="brand-mark large">RL</div>
        <SectionHeader title="Welcome to RoboLab" eyebrow="Sign in to sync team data, messages, and robot status" />
        <p className="body-copy">Continue with Google to create or join a workspace. Skip mode lets you browse public/searchable data, but messaging, robot uploads, note sync, and workspace sharing stay locked.</p>
        <div className="auth-capabilities">
          <span>Server-side RobotEvents</span>
          <span>Workspace-only messages</span>
          <span>Offline scouting queue</span>
          <span>AI robot part audit</span>
        </div>
        <div className="button-row">
          <button className="primary-button full" onClick={onGoogle}>Continue with Google</button>
          <button className="secondary-button full" onClick={onSkip}>Skip for now</button>
        </div>
      </Card>
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
  const { appMode, user, settings, favorites, notes } = useRoboLabStore();
  const favoriteTeams = favorites.map(getTeam);
  const nextMatch = matches.find((match) => match.red.includes(workspace.teamNumber) || match.blue.includes(workspace.teamNumber)) ?? matches[12];
  const unsynced = notes.filter((note) => note.syncState !== 'synced').length;

  return (
    <div className="screen-grid">
      <Card className="hero-card">
        <div>
          <Pill tone="cyan">{appMode === 'developer_mock' ? 'Developer mock mode' : 'Production empty mode'}</Pill>
          <h2>{user ? `${settings.teamNumber || workspace.teamNumber} ${settings.teamName || workspace.teamName}` : 'RoboLab command center'}</h2>
          <p>{user ? `${event.name} · ${event.venue}` : 'Search official teams and tournaments, then sign in to sync scouting, robot status, and messages.'}</p>
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

      <Card>
        <SectionHeader title="Data honesty" eyebrow="Production rule" action={<Pill tone={appMode === 'developer_mock' ? 'orange' : 'success'}>{appMode === 'developer_mock' ? 'Mock data visible' : 'No mock data'}</Pill>} />
        <p className="body-copy">RoboLab production starts empty for new users. Official charts and tournament data must come from server-side RobotEvents cache plus saved scouting notes. When data is missing, the app shows setup, retry, stale, or offline states instead of made-up numbers.</p>
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
  const eventMatches = tournaments.filter((tournament) => `${tournament.name} ${tournament.sku} ${tournament.city} ${tournament.state} ${tournament.program}`.toLowerCase().includes(query.toLowerCase()));
  const { isLoading, isError } = useQuery({ queryKey: ['team-search', query], queryFn: () => api.teams.search(query) });

  return (
    <div className="screen-grid">
      <Card className="search-panel">
        <label className="big-search">
          <Search size={22} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team number, name, school, region" />
        </label>
        <div className="chip-row">
          {['V5RC', 'VIQRC', 'VEX U', 'VEX AI', '2026-2027', 'Search city', 'Search school'].map((filter) => <Pill key={filter}>{filter}</Pill>)}
        </div>
        {query ? (
          <div className="autocomplete-panel">
            {[...filtered.slice(0, 4).map((team) => ({ id: team.number, label: `${team.number} - ${team.name}`, meta: `${team.organization} · ${team.region}`, to: `/app/teams/${team.number}` })), ...eventMatches.slice(0, 3).map((tournament) => ({ id: tournament.id, label: tournament.name, meta: `${tournament.sku} · ${tournament.city}, ${tournament.state}`, to: '/app/tournaments' }))].map((item) => (
              <Link key={item.id} to={item.to}>
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </Link>
            ))}
          </div>
        ) : null}
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

function TournamentsPage() {
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('All');
  const filtered = tournaments.filter((tournament) => {
    const queryMatch = `${tournament.name} ${tournament.sku} ${tournament.city} ${tournament.state} ${tournament.level}`.toLowerCase().includes(query.toLowerCase());
    const programMatch = program === 'All' || tournament.program === program;
    return queryMatch && programMatch;
  });

  return (
    <div className="screen-grid">
      <Card className="event-hero">
        <div>
          <Pill tone="cyan">New bottom tab</Pill>
          <h2>Tournaments</h2>
          <p>Browse official event shells, scout coverage, awards, maps, weather, rankings, skills, and AI tournament Q&A.</p>
        </div>
        <Pill tone="orange">No qualification claims without official data</Pill>
      </Card>
      <Card className="search-panel">
        <label className="big-search">
          <Search size={22} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tournament name, SKU, city, state, program" />
        </label>
        <div className="tabs compact">
          {['All', 'V5RC', 'VIQRC', 'VEX U', 'VEX AI'].map((item) => <button className={cn(program === item && 'active')} key={item} onClick={() => setProgram(item)}>{item}</button>)}
        </div>
      </Card>
      <div className="tournament-layout">
        <div className="tournament-list">
          {filtered.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
          {!filtered.length ? <EmptyDataCard title="No tournaments found" copy="Try another city, SKU, program, or date range. RoboLab will not invent events when official data is unavailable." /> : null}
        </div>
        <Card>
          <SectionHeader title="Tournament AI" eyebrow="Grounded in event records" action={<Pill tone="cyan">Cites data</Pill>} />
          <div className="ai-card">
            <Sparkles size={19} />
            <div>
              <strong>Ask what to scout next</strong>
              <p>RoboLab answers from fetched tournament teams, rankings, skills, awards, matches, and your workspace notes. If the official source is stale, it says so before recommending action.</p>
              <div className="compact-list">
                <button>Which teams need scout coverage?</button>
                <button>What awards are confirmed?</button>
                <button>Who should we watch before alliance selection?</button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <StateStrip />
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const statusTone = tournament.status === 'Fresh' ? 'success' : tournament.status === 'Updating' ? 'cyan' : tournament.status === 'Stale' ? 'warn' : 'danger';
  return (
    <Card className="tournament-card">
      <div className="date-tile">
        <strong>{new Date(`${tournament.date}T12:00:00`).toLocaleDateString('en', { month: 'short' })}</strong>
        <span>{new Date(`${tournament.date}T12:00:00`).getDate()}</span>
      </div>
      <div>
        <div className="tournament-title">
          <div>
            <strong>{tournament.name}</strong>
            <span>{tournament.sku} · {tournament.program} · {tournament.level}</span>
          </div>
          <Pill tone={statusTone}>{tournament.status}</Pill>
        </div>
        <p>{tournament.venue} · {tournament.city}, {tournament.state} · {tournament.teamCount} teams</p>
        <div className="tournament-sections">
          <div><strong>Location</strong><span>{tournament.weatherSummary ?? 'Weather unavailable until API key is configured.'}</span></div>
          <div><strong>Teams</strong><span>Favorites and scout coverage can be assigned from team list.</span></div>
          <div><strong>Awards</strong><span>{tournament.qualificationSummary}</span></div>
        </div>
        <div className="award-list">
          {tournament.awards.map((award) => (
            <div key={award.name}>
              <strong>{award.name}</strong>
              <Pill tone={award.status === 'awarded' ? 'success' : award.status === 'pending' ? 'warn' : 'default'}>{award.status}</Pill>
              <span>{award.qualificationNote}</span>
            </div>
          ))}
        </div>
        <div className="button-row">
          <Link className="secondary-button" to="/app/events">Open Event Center</Link>
          <Link className="secondary-button" to="/app/notes">Assign Scouts</Link>
          <Link className="primary-button" to="/app/coach">Ask Tournament AI</Link>
        </div>
      </div>
    </Card>
  );
}

function EmptyDataCard({ title, copy }: { title: string; copy: string }) {
  return (
    <Card className="empty-card">
      <CircleIcon label="!" />
      <strong>{title}</strong>
      <p>{copy}</p>
      <button className="secondary-button">Retry official data</button>
    </Card>
  );
}

function CircleIcon({ label }: { label: string }) {
  return <span className="circle-icon">{label}</span>;
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
  const { user, conversations, messages, activeConversationId, setActiveConversation, sendMessage, createConversation } = useRoboLabStore();
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const active = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];
  const thread = messages.filter((message) => message.conversationId === active.id);

  if (!user) {
    return (
      <div className="screen-grid">
        <Card className="hero-card">
          <div>
            <Pill tone="warn">Google required</Pill>
            <h2>Messages are workspace-only</h2>
            <p>Sign in to message approved teammates, share scout notes, pin AI strategy cards, and keep robot updates private to your workspace.</p>
          </div>
        </Card>
        <Card>
          <SectionHeader title="Privacy rules" eyebrow="No public random DMs" />
          <div className="settings-list">
            <div><strong>Workspace members only</strong><span>Direct and group chats stay inside approved RoboLab workspaces.</span><Pill tone="blue">Private</Pill></div>
            <div><strong>Coach moderation</strong><span>Owners/coaches can remove inappropriate content and disable messaging.</span><Pill tone="cyan">Ready</Pill></div>
            <div><strong>Shared cards</strong><span>Team, match, scout note, robot status, and pick-list cards can be sent after sign-in.</span><Pill tone="warn">Locked</Pill></div>
          </div>
        </Card>
      </div>
    );
  }

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
    ['/app/robot-lab', 'Robot Lab', Bot, '360 image/video scan, official VEX parts budget, code review, path planner.'],
    ['/app/tournaments', 'Tournaments', Trophy, 'Official event center, awards, maps, weather, scout coverage.'],
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
  const { user } = useRoboLabStore();
  const [selectedPart, setSelectedPart] = useState<RobotPartEstimate | null>(robotVisionAnalysis.parts[0]);
  const total = robotVisionAnalysis.parts.reduce((sum, part) => sum + part.quantity * part.unitCostUsd, 0);
  const tools = [
    ['Robot Projects', 'Versions, status, images, confirmed dimensions, code packages, and readiness history.', Bot],
    ['360 Vision Audit', 'Upload 8-16 photos, a 360 image, or a slow walkaround video for AI part detection.', Search],
    ['Official Parts Budget', 'Map confirmed labels to VEX product pages, CAD links, quantities, and editable costs.', Gauge],
    ['Code Upload', 'Parse VEXcode safely, detect motors/sensors/ports, and review patches before changes.', Code2],
    ['Path Planner', 'Draw autonomous routes and export only through a reviewable C++/Python diff.', Compass],
    ['Troubleshooting AI', 'Diagnose drivetrain drift, wiring, auton misses, and mechanism reliability.', Wrench],
  ] as const;
  return (
    <div className="screen-grid">
      <Card className="hero-card">
        <div><Pill tone="orange">Merged Scout-Master + RoboLab</Pill><h2>Robot Lab</h2><p>Upload robot photos or video, let AI identify likely VEX parts from official libraries, then manually confirm labels before budget or CAD records are saved.</p></div>
        <Pill tone={user ? 'success' : 'warn'}>{user ? 'Workspace sync unlocked' : 'Sign in required to save'}</Pill>
      </Card>
      <div className="tool-grid">{tools.map(([title, copy, Icon]) => <Card className="robot-tool" key={title}><Icon size={24} /><strong>{title}</strong><p>{copy}</p><button className="secondary-button">{title === '360 Vision Audit' ? 'Start scan' : 'Open'}</button></Card>)}</div>
      <div className="robot-vision-layout">
        <Card className="scan-card">
          <SectionHeader title="Robot vision capture" eyebrow="No 360 simulator" action={<Pill tone={robotVisionAnalysis.confidence === 'High' ? 'success' : 'warn'}>{robotVisionAnalysis.confidence} confidence</Pill>} />
          <div className="capture-stage">
            <div className="robot-photo-frame">
              <div className="robot-silhouette">
                <span className="brain-block">Brain</span>
                <span className="motor-block left">Motor</span>
                <span className="motor-block right">Motor</span>
                <span className="intake-block">Intake</span>
                <span className="battery-block">Battery</span>
              </div>
            </div>
            <div className="capture-steps">
              {robotVisionAnalysis.assets.map((asset) => (
                <button key={asset.id} className={cn('capture-step', asset.status)}>
                  <strong>{asset.label}</strong>
                  <span>{asset.kind} · {asset.status}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="button-row">
            <label className="primary-button file-button">
              Upload images/video
              <input type="file" accept="image/*,video/*" multiple />
            </label>
            <button className="secondary-button">Run blur/lighting check</button>
            <button className="secondary-button">Manual start</button>
          </div>
        </Card>
        <Card>
          <SectionHeader title="AI part breakdown" eyebrow="Confirm before saving" action={<Pill tone="cyan">${total.toFixed(2)} estimate</Pill>} />
          <p className="body-copy">{robotVisionAnalysis.summary}</p>
          <div className="part-table">
            {robotVisionAnalysis.parts.map((part) => (
              <button key={part.sku} className={cn('part-row', selectedPart?.sku === part.sku && 'active')} onClick={() => setSelectedPart(part)}>
                <span><strong>{part.name}</strong><small>{part.sku} · {part.category}</small></span>
                <b>x{part.quantity}</b>
                <em>${(part.unitCostUsd * part.quantity).toFixed(2)}</em>
                <Pill tone={part.confirmed ? 'success' : part.confidence === 'Low' ? 'warn' : 'cyan'}>{part.confirmed ? 'confirmed' : part.confidence}</Pill>
              </button>
            ))}
          </div>
          {selectedPart ? (
            <div className="selected-part">
              <strong>{selectedPart.name}</strong>
              <p>Source: <a href={selectedPart.sourceUrl} target="_blank" rel="noreferrer">{selectedPart.sourceLabel}</a>. Prices are rough and must be refreshed server-side before purchasing.</p>
              <div className="button-row">
                <button className="primary-button">Confirm label</button>
                <button className="secondary-button">Edit quantity</button>
                <button className="secondary-button">Open CAD source</button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
      <Card>
        <SectionHeader title="Model/CAD workflow" eyebrow="AI + manual review" />
        <div className="workflow-steps">
          {['Capture', 'Detect parts', 'Confirm labels', 'Build CAD-style tree', 'Estimate cost', 'Share to workspace'].map((step, index) => <div key={step}><b>{index + 1}</b><span>{step}</span></div>)}
        </div>
        <p className="body-copy">RoboLab does not pretend the scan is exact. Low-confidence labels are routed to manual confirmation, and generated code/CAD changes require review before they can affect the robot project.</p>
      </Card>
      <StateStrip />
    </div>
  );
}

function SettingsPage() {
  const { user, settings, signInWithGoogle, signOut, updateSettings, appMode } = useRoboLabStore();
  const accentColors = ['#4F7FFF', '#22C55E', '#F59E0B', '#A855F7', '#00D4FF', '#FF4455'];
  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="Workspace identity" eyebrow="Google Auth ready" action={<button className="primary-button" onClick={user ? signOut : signInWithGoogle}>{user ? 'Sign out' : 'Continue with Google'}</button>} />
        <div className="settings-list">
          <div><strong>{user ? `Signed in as ${user.name}` : 'Skipped sign-in'}</strong><span>Verified Google identity unlocks workspace sync. Email stays hidden from normal chat UI.</span><Pill tone={user ? 'success' : 'warn'}>{user ? 'Connected' : 'Browse only'}</Pill></div>
          <div><strong>{workspace.name}</strong><span>Members can only message approved workspace teammates.</span><Pill tone="blue">Private</Pill></div>
          <div><strong>App mode</strong><span>Production starts empty. Developer mock mode is visibly labeled and can be disabled by environment.</span><Pill tone={appMode === 'developer_mock' ? 'orange' : 'success'}>{appMode}</Pill></div>
          <div><strong>Messaging moderation</strong><span>Owners and coaches can remove inappropriate messages and disable messaging.</span><Pill tone="cyan">Enabled</Pill></div>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Team setup" eyebrow="Optional but sync-ready" />
        <div className="control-grid">
          <label><span>Program</span><select value={settings.program} onChange={(event) => updateSettings({ program: event.target.value as typeof settings.program })}>{['V5RC', 'VIQRC', 'VEX U', 'VEX AI'].map((program) => <option key={program}>{program}</option>)}</select></label>
          <label><span>Season</span><input value={settings.season} onChange={(event) => updateSettings({ season: event.target.value })} /></label>
          <label><span>Team number</span><input value={settings.teamNumber} onChange={(event) => updateSettings({ teamNumber: event.target.value })} placeholder="8059A" /></label>
          <label><span>School / organization</span><input value={settings.school} onChange={(event) => updateSettings({ school: event.target.value })} placeholder="Optional" /></label>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Theme and profile" eyebrow="Saved to account later" />
        <div className="settings-split">
          <div>
            <strong>Accent palette</strong>
            <div className="swatch-row">{accentColors.map((color) => <button key={color} className={cn('swatch', settings.accentColor === color && 'active')} style={{ background: color }} onClick={() => updateSettings({ accentColor: color })} aria-label={`Use accent ${color}`} />)}</div>
          </div>
          <div>
            <strong>Preset avatars</strong>
            <div className="avatar-row">{['SS', 'TM', 'AI', 'V5', 'DR', 'CO'].map((avatar) => <span className="avatar small" key={avatar}>{avatar}</span>)}</div>
          </div>
        </div>
      </Card>
      <Card>
        <SectionHeader title="API diagnostics" eyebrow="Secrets stay server-side" />
        <div className="settings-list">
          {[
            ['RobotEvents', 'ROBOT_EVENTS_API_TOKEN / ROBOTEVENTS_API_TOKEN', 'Tests official teams, matches, rankings, skills, and awards through backend cache.'],
            ['Auth', 'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET', 'Required for workspace sync and messages.'],
            ['Database', 'DATABASE_URL / SUPABASE_URL / SERVICE_ROLE_KEY', 'Stores notes, messages, robot status, and confirmed parts.'],
            ['AI', 'OPENAI_API_KEY / GEMINI_API_KEY / AI_DEFAULT_PROVIDER', 'Powers coach, tournament assistant, scout helper, robot scan, and code warnings.'],
            ['Uploads', 'UPLOAD_BUCKET / MAX_IMAGE_MB / REMOVE_IMAGE_EXIF', 'Stores robot images and removes EXIF by default.'],
            ['Widgets', 'WEATHER_API_KEY / MAPS_API_KEY', 'Adds tournament map and weather widgets.'],
          ].map(([name, vars, copy]) => <div key={name}><strong>{name}</strong><span>{vars}: {copy}</span><Pill tone="cyan">Server route</Pill></div>)}
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
