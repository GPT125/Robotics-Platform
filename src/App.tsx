import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState, type MouseEventHandler, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Bot, Brain, Camera, ChevronDown, Code2, Compass, Gauge, Home, Info, Link2, MessageCircle,
  MoreHorizontal, Paperclip, Plus, Search, Send, Settings, Shield, Sparkles, Star, Trophy, Users, Wrench, X, Zap,
} from 'lucide-react';
import { aiInsights, event, matches, metrics, predictions, rankings, recommendations, robotVisionAnalysis, skillsResults, teams, tournaments, workspace } from './data/mockData';
import { api, askCoach, fetchGoogleAuthSession, fetchIntegrationStatus, startGoogleAuth, teamByNumber, type CoachSource } from './services/api';
import { ME_ID, useRoboLabStore } from './store/useRoboLabStore';
import type { Conversation, Match, Message, PickList, RobotPartEstimate, RobotScanAsset, Team, Tournament } from './types';

// ---- Motion toolkit (premium, mobile-first animations) ----
const EASE = [0.22, 1, 0.36, 1] as const;

const pageVariants: Variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.34, ease: EASE, staggerChildren: 0.05, delayChildren: 0.02 } },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)', transition: { duration: 0.18, ease: EASE } },
};

const riseItem: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const nav = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/scout', label: 'Scout', icon: Search },
  { to: '/app/tournaments', label: 'Tourney', icon: Trophy },
  { to: '/app/coach', label: 'Coach', icon: Sparkles },
  { to: '/app/messages', label: 'Messages', icon: MessageCircle },
];

const desktopNav = [
  ...nav,
  { to: '/app/teams/39333Z', label: 'Teams', icon: Users },
  { to: '/app/compare', label: 'Compare', icon: Gauge },
  { to: '/app/alliance', label: 'Alliance', icon: Trophy },
  { to: '/app/robot-lab', label: 'Robot Lab', icon: Bot },
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
  if (pathname.includes('/coach')) return 'RoboLab AI';
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
  const fab = fabFor(location.pathname);
  const { appMode, settings, user, signInSkipped, signIn, skipSignIn } = useRoboLabStore();
  const showAuthModal = !user && !signInSkipped;
  const title = routeTitle(location.pathname);
  const isCoach = location.pathname.includes('/coach');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    if (!location.search.includes('google=connected')) return;
    let cancelled = false;
    void fetchGoogleAuthSession().then((session) => {
      if (!cancelled && session?.email) signIn({ email: session.email, name: session.name });
    }).finally(() => {
      if (!cancelled) window.history.replaceState(null, '', location.pathname);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, signIn]);

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
          <Link to="/app" className="header-brand mobile-only" aria-label="Home">
            <span className="brand-mark sm">RL</span>
          </Link>
          <div className="header-titles">
            <p className="eyebrow">{settings.program} · {user ? settings.teamNumber || workspace.teamNumber : 'Browse mode'}</p>
            <h1>{title}</h1>
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

        <main className={cn('content-shell', isCoach && 'content-shell-flush')}>
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate">
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
        </main>
      </div>

      {isCoach ? null : (
        <motion.div
          className="floating-action-wrap"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.1 }}
        >
          <motion.div whileTap={{ scale: 0.92 }} whileHover={{ scale: 1.04 }}>
            <Link className="floating-action" to={fab.to}>
              <fab.icon size={18} />
              <span>{fab.label}</span>
            </Link>
          </motion.div>
        </motion.div>
      )}

      <nav className="mobile-tabbar">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={({ isActive }) => cn('tab-link', isActive && 'active')}>
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="tab-active-pill"
                    className="tab-active-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  />
                ) : null}
                <motion.span className="tab-icon" animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 480, damping: 26 }}>
                  <item.icon size={21} />
                </motion.span>
                <span className="tab-label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {showAuthModal ? <AuthModal onSignIn={signIn} onSkip={skipSignIn} /> : null}
    </div>
  );
}

function AuthModal({ onSignIn, onSkip }: { onSignIn: (identity: { email: string; name?: string }) => void; onSkip: () => void }) {
  const [email, setEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const valid = /\S+@\S+\.\S+/.test(email.trim());

  async function continueSignIn() {
    if (!valid || authBusy) return;
    setAuthBusy(true);
    const googleStarted = await startGoogleAuth(email.trim());
    if (!googleStarted) onSignIn({ email });
    setAuthBusy(false);
  }

  return (
    <motion.div className="modal-backdrop auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <motion.div
        className="auth-modal"
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <div className="auth-brand">
          <span className="brand-mark">RL</span>
          <strong>RoboLab</strong>
        </div>
        <h2 className="auth-title">Your VEX command center</h2>
        <p className="auth-sub">Sign in with your email to sync notes, messages, and robot status.</p>
        <input
          className="auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@team.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void continueSignIn()}
        />
        <button className="primary-button full" disabled={!valid || authBusy} onClick={() => void continueSignIn()}>{authBusy ? 'Opening Google…' : 'Continue'}</button>
        <button className="auth-skip" onClick={onSkip}>Skip — just browsing</button>
      </motion.div>
    </motion.div>
  );
}

function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'blue' | 'cyan' | 'orange' | 'success' | 'danger' | 'warn' }) {
  return <span className={cn('pill', `pill-${tone}`)}>{children}</span>;
}

function Card({ children, className, id, onClick }: { children: ReactNode; className?: string; id?: string; onClick?: MouseEventHandler<HTMLElement> }) {
  return (
    <motion.section
      id={id}
      className={cn('glass-card', onClick && 'card-tappable', className)}
      variants={riseItem}
      onClick={onClick}
      whileHover={onClick ? { y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.section>
  );
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
  const pct = Math.max(4, Math.min(100, value));
  return (
    <div className="progress-track">
      <motion.span
        className={`progress-fill ${tone}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
      />
    </div>
  );
}

function TeamMiniCard({ team, actions = true }: { team: Team; actions?: boolean }) {
  const { favorites, toggleFavorite, addCompareTeam } = useRoboLabStore();
  const navigate = useNavigate();

  function compareTeam() {
    addCompareTeam(team.number);
    navigate('/app/compare');
  }

  return (
    <Card className="team-card">
      <div className="team-card-top">
        <Link to={`/app/teams/${team.number}`}>
          <strong>{team.number}</strong>
          <span>{team.name}</span>
        </Link>
        <button type="button" className={cn('icon-button', favorites.includes(team.number) && 'hot')} onClick={() => toggleFavorite(team.number)} aria-label="Favorite team">
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
          <button type="button" className="secondary-button" onClick={compareTeam}>
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
            ['/app/coach', 'Ask RoboLab AI', Sparkles],
            ['/app/notes', 'Scout Match', Plus],
            ['/app/scout', 'Search Team', Search],
            ['/app/compare', 'Compare Teams', Gauge],
            ['/app/alliance', 'Build Pick List', Trophy],
            ['/app/robot-lab', 'Robot Lab', Bot],
            ['/app/more', 'More tools', MoreHorizontal],
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

const SCOUT_SORTS = [
  { key: 'relevance', label: 'Best match' },
  { key: 'winRate', label: 'Win rate' },
  { key: 'skills', label: 'Skills rank' },
  { key: 'consistency', label: 'Consistency' },
] as const;
type ScoutSort = (typeof SCOUT_SORTS)[number]['key'];

function ScoutSearch() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [sort, setSort] = useState<ScoutSort>('relevance');

  const regions = ['All', ...Array.from(new Set(teams.map((team) => team.region))).sort()];

  const filtered = teams
    .filter((team) => `${team.number} ${team.name} ${team.organization} ${team.region}`.toLowerCase().includes(query.toLowerCase()))
    .filter((team) => region === 'All' || team.region === region)
    .sort((a, b) => {
      if (sort === 'winRate') return b.winRate - a.winRate;
      if (sort === 'skills') return a.skillsRank - b.skillsRank;
      if (sort === 'consistency') return b.consistency - a.consistency;
      return 0;
    });

  const eventMatches = tournaments.filter((tournament) => `${tournament.name} ${tournament.sku} ${tournament.city} ${tournament.state} ${tournament.program}`.toLowerCase().includes(query.toLowerCase()));
  const { isLoading, isError } = useQuery({ queryKey: ['team-search', query], queryFn: () => api.teams.search(query) });
  const hasFilters = query.trim() !== '' || region !== 'All';

  return (
    <div className="screen-grid">
      <Card className="search-panel">
        <label className="big-search">
          <Search size={22} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team number, name, school, region" />
        </label>
        <div className="chip-row">
          {regions.map((item) => (
            <button
              key={item}
              type="button"
              className={cn('pill', region === item ? 'pill-cyan' : 'pill-default')}
              onClick={() => setRegion(item)}
              aria-pressed={region === item}
            >
              {item === 'All' ? 'All regions' : item}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {SCOUT_SORTS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={cn('pill', sort === item.key ? 'pill-blue' : 'pill-default')}
              onClick={() => setSort(item.key)}
              aria-pressed={sort === item.key}
            >
              {item.label}
            </button>
          ))}
          {hasFilters ? (
            <button type="button" className="pill pill-warn" onClick={() => { setQuery(''); setRegion('All'); setSort('relevance'); }}>
              Clear filters
            </button>
          ) : null}
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
      <SectionHeader
        title="Teams"
        eyebrow={isLoading ? 'Loading official cache' : isError ? 'Cached fallback shown' : `${filtered.length} matching team${filtered.length === 1 ? '' : 's'}${region !== 'All' ? ` in ${region}` : ''}`}
      />
      {filtered.length ? (
        <div className="team-grid">
          {filtered.map((team) => <TeamMiniCard key={team.number} team={team} />)}
        </div>
      ) : (
        <EmptyDataCard
          title="No teams match these filters"
          copy="Try a different team number, name, region, or clear the filters. RoboLab will not invent teams when official data has no match."
          onRetry={() => { setQuery(''); setRegion('All'); setSort('relevance'); }}
        />
      )}
      <StateStrip />
    </div>
  );
}

function TournamentsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('All');
  const filtered = tournaments.filter((tournament) => {
    const queryMatch = `${tournament.name} ${tournament.sku} ${tournament.city} ${tournament.state} ${tournament.level}`.toLowerCase().includes(query.toLowerCase());
    const programMatch = program === 'All' || tournament.program === program;
    return queryMatch && programMatch;
  });

  function askTournamentAi(prompt: string) {
    window.sessionStorage.setItem('robolab:coach:queuedPrompt', prompt);
    navigate('/app/coach');
  }

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
          {['All', 'V5RC', 'VIQRC', 'VEX U', 'VEX AI'].map((item) => <button type="button" className={cn(program === item && 'active')} key={item} onClick={() => setProgram(item)}>{item}</button>)}
        </div>
      </Card>
      <div className="tournament-layout">
        <div className="tournament-list">
          {filtered.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}
          {!filtered.length ? <EmptyDataCard title="No tournaments found" copy="Try another city, SKU, program, or date range. RoboLab will not invent events when official data is unavailable." onRetry={() => { setQuery(''); setProgram('All'); }} /> : null}
        </div>
        <Card>
          <SectionHeader title="Tournament AI" eyebrow="Grounded in event records" action={<Pill tone="cyan">Cites data</Pill>} />
          <div className="ai-card">
            <Sparkles size={19} />
            <div>
              <strong>Ask what to scout next</strong>
              <p>RoboLab answers from fetched tournament teams, rankings, skills, awards, matches, and your workspace notes. If the official source is stale, it says so before recommending action.</p>
              <div className="compact-list">
                <button type="button" onClick={() => askTournamentAi('Which teams need scout coverage at this tournament? Use current event teams, rankings, skills, and our notes. State when data is missing.')}>Which teams need scout coverage?</button>
                <button type="button" onClick={() => askTournamentAi('What awards are confirmed for this tournament, and what should our team do next? Only use available event data and clearly say if official data is missing.')}>What awards are confirmed?</button>
                <button type="button" onClick={() => askTournamentAi('Who should we watch before alliance selection at this tournament? Explain based on rankings, skills, match results, and scouting notes. Do not invent data.')}>Who should we watch before alliance selection?</button>
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

function EmptyDataCard({ title, copy, onRetry }: { title: string; copy: string; onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);

  function retry() {
    setRetrying(true);
    try {
      if (onRetry) onRetry();
      else window.location.reload();
    } finally {
      window.setTimeout(() => setRetrying(false), 450);
    }
  }

  return (
    <Card className="empty-card">
      <CircleIcon label="!" />
      <strong>{title}</strong>
      <p>{copy}</p>
      <button type="button" className="secondary-button" onClick={retry} disabled={retrying}>{retrying ? 'Retrying…' : 'Retry official data'}</button>
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
  const navigate = useNavigate();
  const team = getTeam(number);
  const teamNotes = useRoboLabStore((state) => state.notes.filter((note) => note.teamNumber === team.number));
  const { toggleFavorite, addCompareTeam, movePick } = useRoboLabStore();
  const recentMatches = matches.filter((match) => match.red.includes(team.number) || match.blue.includes(team.number)).slice(0, 5);

  function compareTeam() {
    addCompareTeam(team.number);
    navigate('/app/compare');
  }

  function addToPickList() {
    movePick('B', team.number);
    navigate('/app/alliance');
  }

  return (
    <div className="screen-grid">
      <Card className="profile-hero">
        <div>
          <Pill tone="orange">{team.region}</Pill>
          <h2>{team.number} {team.name}</h2>
          <p>{team.organization}</p>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => toggleFavorite(team.number)}><Star size={17} /> Favorite</button>
          <button type="button" className="secondary-button" onClick={compareTeam}><Gauge size={17} /> Compare</button>
          <button type="button" className="primary-button" onClick={addToPickList}><Trophy size={17} /> Pick List</button>
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

type CoachAttachment = { id: string; kind: 'image' | 'video'; preview: string; images: string[] };

type CoachMessage = {
  role: 'user' | 'assistant';
  body: string;
  pending?: boolean;
  error?: boolean;
  confidence?: 'High' | 'Medium' | 'Low';
  provider?: string;
  sources?: CoachSource[];
  models?: string[];
  hasVision?: boolean;
  images?: string[];
};

const COACH_GREETING: CoachMessage = {
  role: 'assistant',
  body: "Hey, I'm RoboLab AI. I can see photos and video of your robot, pull real fixes from the VEX Forum, and cross-check several AIs so you get the right answer.\n\nTell me what's going on — or snap a photo of your chassis and I'll tell you what to fix.",
};

const STARTER_PROMPTS = [
  'Fix my chassis from a photo',
  'Make my autonomous consistent',
  'How does alliance selection work?',
  'My PID overshoots — help',
  'Best intake for this season?',
  'Fix V5 motor port errors',
];

// ---- Lightweight Markdown renderer (no extra deps) ----
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[\d+\]|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) nodes.push(<strong key={`${keyBase}-b${i}`}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) nodes.push(<code key={`${keyBase}-c${i}`}>{token.slice(1, -1)}</code>);
    else if (/^\[\d+\]$/.test(token)) nodes.push(<sup key={`${keyBase}-s${i}`} className="md-cite">{token}</sup>);
    else nodes.push(<a key={`${keyBase}-a${i}`} href={token} target="_blank" rel="noreferrer">{token}</a>);
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (key: string) => {
    if (!list.length) return;
    const items = list;
    blocks.push(<ul key={`ul-${key}`} className="md-list">{items.map((li, idx) => <li key={idx}>{renderInline(li, `li-${key}-${idx}`)}</li>)}</ul>);
    list = [];
  };
  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    const numbered = line.match(/^\s*\d+\.\s+(.*)/);
    if (bullet) { list.push(bullet[1]); return; }
    if (numbered) { list.push(numbered[1]); return; }
    flush(String(index));
    if (!line.trim()) return;
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) { blocks.push(<p key={index} className={`md-h md-h${heading[1].length}`}>{renderInline(heading[2], `h${index}`)}</p>); return; }
    if (/^confidence:/i.test(line.trim())) { blocks.push(<p key={index} className="md-confidence">{renderInline(line, `cf${index}`)}</p>); return; }
    blocks.push(<p key={index} className="md-p">{renderInline(line, `p${index}`)}</p>);
  });
  flush('end');
  return <div className="md">{blocks}</div>;
}

// ---- Media helpers: compress images, sample frames from video ----
function downscaleImage(dataUrl: string, max = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function extractVideoFrames(file: File, count = 4, max = 1100, quality = 0.65): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const frames: string[] = [];
    const finish = () => { URL.revokeObjectURL(url); resolve(frames); };
    const seek = (time: number) => new Promise<void>((res) => {
      const handler = () => { video.removeEventListener('seeked', handler); res(); };
      video.addEventListener('seeked', handler);
      try { video.currentTime = time; } catch { res(); }
    });
    video.onloadedmetadata = async () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const times = duration ? Array.from({ length: count }, (_, i) => (duration * (i + 0.5)) / count) : [0];
      const canvas = document.createElement('canvas');
      for (const time of times) {
        await seek(time);
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        const scale = Math.min(1, max / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', quality));
      }
      finish();
    };
    video.onerror = () => finish();
    video.src = url;
  });
}

function CoachSources({ sources }: { sources: CoachSource[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="coach-sources">
      <button className="sources-toggle" onClick={() => setOpen((value) => !value)}>
        <Link2 size={14} /> Sources ({sources.length})
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="sources-chevron"><ChevronDown size={14} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div className="sources-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            {sources.map((source, index) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="coach-source">
                <b>[{index + 1}]</b>
                <span>
                  <strong>{source.title}</strong>
                  {source.blurb ? <em>{source.blurb}</em> : null}
                </span>
              </a>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AICoach() {
  const { settings, favorites } = useRoboLabStore();
  const [messages, setMessages] = useState<CoachMessage[]>([COACH_GREETING]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<CoachAttachment[]>([]);
  const [processing, setProcessing] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const queuedPromptLoaded = useRef(false);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, attachments]);

  useEffect(() => {
    if (queuedPromptLoaded.current) return;
    queuedPromptLoaded.current = true;
    const queued = window.sessionStorage.getItem('robolab:coach:queuedPrompt');
    if (!queued) return;
    window.sessionStorage.removeItem('robolab:coach:queuedPrompt');
    void send(queued);
  }, []);

  function platformContext() {
    const next = matches.find((match) => match.redScore === undefined) ?? matches[0];
    const onRed = next ? next.red.includes(settings.teamNumber || workspace.teamNumber) : false;
    const parts = [
      `Program: ${settings.program}.`,
      `Season: ${settings.season}.`,
      settings.teamNumber ? `Our team: ${settings.teamNumber} ${settings.teamName}.` : `Our team: ${workspace.teamNumber} ${workspace.teamName}.`,
      `Event: ${event.name} (${event.status}).`,
      favorites.length ? `Watchlist: ${favorites.join(', ')}.` : '',
      next ? `NEXT MATCH (coming up soon): ${next.number} on ${next.field} at ${next.time}, our alliance is ${onRed ? 'Red' : 'Blue'}.` : '',
    ];
    return parts.filter(Boolean).join(' ');
  }

  async function onFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setProcessing(true);
    try {
      const next: CoachAttachment[] = [];
      for (const file of Array.from(fileList).slice(0, 4)) {
        if (file.type.startsWith('video')) {
          const frames = await extractVideoFrames(file);
          if (frames.length) next.push({ id: `att-${Date.now()}-${next.length}`, kind: 'video', preview: frames[0], images: frames });
        } else if (file.type.startsWith('image')) {
          const raw = await readFileAsDataUrl(file);
          const compressed = await downscaleImage(raw);
          next.push({ id: `att-${Date.now()}-${next.length}`, kind: 'image', preview: compressed, images: [compressed] });
        }
      }
      setAttachments((current) => [...current, ...next].slice(0, 6));
    } finally {
      setProcessing(false);
    }
  }

  async function send(textInput?: string) {
    const question = (textInput ?? draft).trim();
    if ((!question && !attachments.length) || busy) return;
    const sending = attachments;
    const images = sending.flatMap((attachment) => attachment.images);
    const previews = sending.map((attachment) => attachment.preview);
    setDraft('');
    setAttachments([]);
    setBusy(true);
    const history = messages.filter((message) => !message.pending && !message.error);
    const userText = question || 'Please analyze the attached robot media and tell me what to fix.';
    setMessages((items) => [...items, { role: 'user', body: userText, images: previews }, { role: 'assistant', body: '', pending: true }]);

    const payload = [...history, { role: 'user' as const, body: userText }].map((message) => ({ role: message.role, content: message.body }));

    try {
      const result = await askCoach({ messages: payload, context: platformContext(), images });
      setMessages((items) => {
        const next = [...items];
        next[next.length - 1] = {
          role: 'assistant',
          body: result.answer,
          confidence: result.confidence,
          provider: result.provider,
          sources: result.sources,
          models: result.models,
          hasVision: result.hasVision,
        };
        return next;
      });
    } catch (error) {
      setMessages((items) => {
        const next = [...items];
        next[next.length - 1] = { role: 'assistant', error: true, body: error instanceof Error ? error.message : 'RoboLab AI is unreachable. Check your connection and try again.' };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="coach-screen">
      <div className="chat-thread" ref={threadRef}>
        {messages.length === 1 ? (
          <motion.div className="coach-starter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="coach-starter-grid">
              {STARTER_PROMPTS.map((prompt) => (
                <motion.button key={prompt} whileTap={{ scale: 0.96 }} onClick={() => send(prompt)}>
                  <Sparkles size={15} /> {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : null}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={`${message.role}-${index}`}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={cn('coach-row', message.role === 'user' ? 'mine' : 'theirs')}
            >
              {message.role === 'assistant' && !message.pending ? <span className="coach-avatar"><Sparkles size={16} /></span> : null}
              <div className={cn('coach-bubble', message.role === 'user' && 'mine', message.error && 'error')}>
                {message.images?.length ? (
                  <div className="coach-attach-grid">
                    {message.images.map((src, i) => <img key={i} src={src} alt="attachment" />)}
                  </div>
                ) : null}
                {message.pending ? (
                  <div className="typing-indicator inline"><span /><span /><span /> Reading the VEX Forum and cross-checking models…</div>
                ) : message.role === 'assistant' && !message.error ? (
                  <>
                    <Markdown text={message.body} />
                    {message.sources?.length ? <CoachSources sources={message.sources} /> : null}
                    <div className="coach-meta">
                      {message.confidence ? <Pill tone={message.confidence === 'High' ? 'success' : message.confidence === 'Medium' ? 'cyan' : 'warn'}>{message.confidence} confidence</Pill> : null}
                      {message.hasVision ? <Pill tone="orange">Vision</Pill> : null}
                      {message.models && message.models.length > 1 ? <span className="coach-provider">{message.models.length} AIs cross-checked</span> : message.provider ? <span className="coach-provider">via {message.provider}</span> : null}
                    </div>
                  </>
                ) : (
                  <p>{message.body}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {attachments.length || processing ? (
        <div className="coach-attachments">
          {processing ? <span className="coach-attach-processing"><Sparkles size={14} /> Processing media…</span> : null}
          {attachments.map((attachment) => (
            <div key={attachment.id} className="coach-attach-thumb">
              <img src={attachment.preview} alt={attachment.kind} />
              {attachment.kind === 'video' ? <span className="coach-attach-badge">{attachment.images.length}f</span> : null}
              <button onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} aria-label="Remove"><X size={12} /></button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="composer coach-composer">
        <label className="icon-button" aria-label="Attach photo or video">
          <Paperclip size={18} />
          <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }} />
        </label>
        <label className="icon-button" aria-label="Camera">
          <Camera size={18} />
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }} />
        </label>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder="Ask anything, or attach a robot photo…"
          disabled={busy}
        />
        <motion.button whileTap={{ scale: 0.9 }} className="send-button" disabled={(!draft.trim() && !attachments.length) || busy} onClick={() => send()}>
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  );
}

function ScoutingNotes() {
  const [mode, setMode] = useState<(typeof noteModes)[number]>('match');
  const { notes, addNote } = useRoboLabStore();
  const [teamNumber, setTeamNumber] = useState('39333Z');
  const [matchNumber, setMatchNumber] = useState('');
  const [alliance, setAlliance] = useState<'blue' | 'red'>('blue');
  const [autonomous, setAutonomous] = useState<'Success' | 'Partial' | 'Failed'>('Success');
  const [driverControl, setDriverControl] = useState(4);
  const [defense, setDefense] = useState(2);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Reliable']);
  const [body, setBody] = useState('');
  const quickTags = ['Strong auton', 'Fast driver', 'Reliable', 'Defense', 'Good partner', 'Risky', 'Mechanical issues', 'Inconsistent'];

  function toggleTag(tag: string) {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function save() {
    addNote({
      id: `note-local-${Date.now()}`,
      teamNumber,
      mode,
      matchNumber: matchNumber.trim() || undefined,
      alliance,
      tags: selectedTags,
      body: body || `${mode} note saved${matchNumber.trim() ? ` for ${matchNumber.trim()}` : ''}${selectedTags.length ? `: ${selectedTags.join(', ')}` : '.'}`,
      author: 'Shervin',
      createdAt: 'now',
      syncState: navigator.onLine ? 'syncing' : 'local_only',
      autonomousSuccess: autonomous === 'Success' ? true : autonomous === 'Failed' ? false : undefined,
      driverControl,
      defense,
      scoringEstimate: 45 + driverControl * 10 + defense * 4,
      mechanicalIssue: selectedTags.includes('Mechanical issues'),
      disabledOrTipped: selectedTags.includes('Risky'),
    });
    setBody('');
    setMatchNumber('');
  }

  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="Scouting notes" eyebrow="Saves instantly offline" action={<Pill tone="warn">{notes.filter((note) => note.syncState !== 'synced').length} queued</Pill>} />
        <div className="tabs compact">{noteModes.map((item) => <button className={cn(mode === item && 'active')} key={item} onClick={() => setMode(item)}>{item}</button>)}</div>
        <div className="scout-form">
          <label><span>Team</span><select value={teamNumber} onChange={(event) => setTeamNumber(event.target.value)}>{teams.map((team) => <option key={team.number} value={team.number}>{team.number} {team.name}</option>)}</select></label>
          <label><span>Match</span><input placeholder="Q34" value={matchNumber} onChange={(event) => setMatchNumber(event.target.value)} /></label>
          <label><span>Alliance</span><select value={alliance} onChange={(event) => setAlliance(event.target.value as 'blue' | 'red')}><option value="blue">Blue</option><option value="red">Red</option></select></label>
          <label><span>Autonomous</span><select value={autonomous} onChange={(event) => setAutonomous(event.target.value as 'Success' | 'Partial' | 'Failed')}><option>Success</option><option>Partial</option><option>Failed</option></select></label>
          <label><span>Driver control</span><input type="range" min="1" max="5" value={driverControl} onChange={(event) => setDriverControl(Number(event.target.value))} /></label>
          <label><span>Defense</span><input type="range" min="1" max="5" value={defense} onChange={(event) => setDefense(Number(event.target.value))} /></label>
          <label className="wide"><span>Free-text note</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Fast cycles, clean wiring, intake jam, good partner communication..." /></label>
        </div>
        <div className="chip-row">
          {quickTags.map((tag) => <button type="button" key={tag} className={cn('pill', selectedTags.includes(tag) ? 'pill-cyan' : 'pill-default')} onClick={() => toggleTag(tag)} aria-pressed={selectedTags.includes(tag)}>{tag}</button>)}
        </div>
        <button type="button" className="primary-button full" onClick={save}>Save note</button>
      </Card>
      <Card>
        <SectionHeader title="Offline queue" />
        <div className="note-list">{notes.map((note) => <div className="note-row" key={note.id}><strong>{teamLabel(note.teamNumber)}</strong><p>{note.body}</p><Pill tone={note.syncState === 'synced' ? 'success' : note.syncState === 'failed' ? 'danger' : 'warn'}>{note.syncState}</Pill></div>)}</div>
      </Card>
      <StateStrip />
    </div>
  );
}

const CHAT_PRESETS = ['Match strategy', 'Alliance planning', 'Robot project', 'Pit crew', 'Scouting'];

function conversationInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'CH';
}

function ConversationAvatar({ conversation }: { conversation: Conversation }) {
  return <div className={cn('avatar', conversation.type)}>{conversationInitials(conversation.name)}</div>;
}

function MessagesLockScreen() {
  return (
    <div className="screen-grid">
      <Card className="empty-card">
        <span className="empty-emoji"><MessageCircle size={26} /></span>
        <strong>Sign in to use Messages</strong>
        <p>Messages are private to you and your team. Sign in with your email to start chats, talk to RoboLab AI, and keep everything synced.</p>
        <Link className="primary-button" to="/app/settings">Go to sign in</Link>
      </Card>
    </div>
  );
}

function MessagesPage() {
  const { user, conversations, messages, activeConversationId, setActiveConversation, sendMessage, appendMessage, createConversation, deleteConversation } = useRoboLabStore();
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;
  const thread = active ? messages.filter((message) => message.conversationId === active.id) : [];

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread.length, aiTyping, activeConversationId]);

  if (!user) return <MessagesLockScreen />;

  function startChat(name: string) {
    const id = createConversation(name);
    setActiveConversation(id);
    setShowNew(false);
    setNewName('');
  }

  async function send() {
    if (!active) return;
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendMessage(active.id, text);
    const wantsAi = /(^|\s)@(ai|robolab)\b/i.test(text);
    if (!wantsAi) return;

    setAiTyping(true);
    const question = text.replace(/@(ai|robolab)/gi, '').trim() || 'Give the team a quick strategy tip.';
    const recent = messages.filter((m) => m.conversationId === active.id).slice(-6).map((m) => ({ role: (m.senderId === ME_ID ? 'user' : 'assistant') as 'user' | 'assistant', content: m.body }));
    try {
      const result = await askCoach({ messages: [...recent, { role: 'user', content: question }], context: `This is a team chat named "${active.name}".` });
      appendMessage({
        id: `m-ai-${Date.now()}`,
        conversationId: active.id,
        senderId: 'robolab-ai',
        body: result.answer,
        messageType: 'ai_insight',
        createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        status: 'sent',
      });
    } catch {
      appendMessage({
        id: `m-ai-${Date.now()}`,
        conversationId: active.id,
        senderId: 'robolab-ai',
        body: 'I could not reach the AI just now — try again in a moment.',
        messageType: 'ai_insight',
        createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        status: 'sent',
      });
    } finally {
      setAiTyping(false);
    }
  }

  return (
    <div className="messages-layout">
      <Card className="conversation-panel">
        <SectionHeader title="Messages" action={<button className="primary-button" onClick={() => setShowNew(true)}><Plus size={16} /> New</button>} />
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div className="empty-inline">
              <MessageCircle size={22} />
              <strong>No chats yet</strong>
              <p>Create a chat for match strategy, your pit crew, or to talk to RoboLab AI.</p>
              <button className="primary-button" onClick={() => setShowNew(true)}><Plus size={16} /> New chat</button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button key={conversation.id} className={cn('conversation-card', active?.id === conversation.id && 'active')} onClick={() => setActiveConversation(conversation.id)}>
                <ConversationAvatar conversation={conversation} />
                <div>
                  <strong>{conversation.name}</strong>
                  <p>{conversation.lastMessagePreview}</p>
                  <span>{conversation.updatedAt}</span>
                </div>
                {conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}
              </button>
            ))
          )}
        </div>
      </Card>

      {active ? (
        <Card className="thread-panel">
          <div className="chat-header">
            <ConversationAvatar conversation={active} />
            <div>
              <strong>{active.name}</strong>
              <span>Private · type <b>@ai</b> to ask RoboLab AI</span>
            </div>
            <button className="icon-button" aria-label="Delete chat" onClick={() => deleteConversation(active.id)}><X size={18} /></button>
          </div>
          <div className="message-thread" ref={threadRef}>
            {thread.length === 0 ? (
              <div className="thread-empty">
                <Sparkles size={20} />
                <p>Say hi, or type <b>@ai how do I tune my drivetrain?</b> to bring RoboLab AI into the chat.</p>
              </div>
            ) : (
              thread.map((message) => <MessageBubble key={message.id} message={message} senderName={user.name} />)
            )}
            {aiTyping ? <div className="typing-indicator inline"><span /><span /><span /> RoboLab AI is thinking…</div> : null}
          </div>
          <div className="composer message-composer">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} placeholder="Message your team, or @ai…" />
            <motion.button whileTap={{ scale: 0.9 }} className="send-button" disabled={!draft.trim()} onClick={send}><Send size={18} /></motion.button>
          </div>
        </Card>
      ) : (
        <Card className="thread-panel">
          <div className="thread-empty">
            <MessageCircle size={24} />
            <p>Select a chat or create a new one to get started.</p>
            <button className="primary-button" onClick={() => setShowNew(true)}><Plus size={16} /> New chat</button>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {showNew ? (
          <motion.div className="modal-backdrop" onClick={() => setShowNew(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="new-chat-modal glass-card" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}>
              <SectionHeader title="New chat" action={<button className="icon-button" onClick={() => setShowNew(false)} aria-label="Close"><X size={18} /></button>} />
              <input className="auth-input" placeholder="Chat name (e.g. Q34 strategy)" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newName.trim() && startChat(newName)} />
              <div className="chip-row">
                {CHAT_PRESETS.map((preset) => <button key={preset} className="pill pill-cyan" onClick={() => startChat(preset)}>{preset}</button>)}
              </div>
              <button className="primary-button full" disabled={!newName.trim()} onClick={() => startChat(newName)}>Create chat</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ message, senderName }: { message: Message; senderName: string }) {
  const mine = message.senderId === ME_ID;
  if (message.messageType === 'system') return <div className="system-message">{message.body}</div>;
  if (message.messageType === 'ai_insight') {
    return (
      <div className="ai-message-card">
        <div><span className="coach-avatar"><Sparkles size={15} /></span><strong>RoboLab AI</strong></div>
        <Markdown text={message.body} />
        <span>{message.createdAt} · grounded in VEX expertise</span>
      </div>
    );
  }
  return (
    <div className={cn('message-row', mine && 'mine')}>
      <div className={cn('message-bubble', mine && 'mine')}>
        <p>{message.body}</p>
        <span>{mine ? 'You' : senderName} · {message.createdAt}</span>
      </div>
    </div>
  );
}

function MorePage() {
  const items = [
    ['/app/coach', 'RoboLab AI', Brain, 'Ask strategy questions grounded in real VEX Forum threads.'],
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
  const navigate = useNavigate();
  const [scanStatus, setScanStatus] = useState(robotVisionAnalysis.status);
  const [assets, setAssets] = useState<RobotScanAsset[]>(robotVisionAnalysis.assets);
  const [parts, setParts] = useState<RobotPartEstimate[]>(robotVisionAnalysis.parts);
  const [selectedSku, setSelectedSku] = useState(robotVisionAnalysis.parts[0]?.sku ?? '');
  const selectedPart = parts.find((part) => part.sku === selectedSku) ?? parts[0] ?? null;
  const total = parts.reduce((sum, part) => sum + part.quantity * part.unitCostUsd, 0);
  const tools = [
    ['Robot Projects', 'Versions, status, images, confirmed dimensions, code packages, and readiness history.', Bot],
    ['360 Vision Audit', 'Upload 8-16 photos, a 360 image, or a slow walkaround video for AI part detection.', Search],
    ['Official Parts Budget', 'Map confirmed labels to VEX product pages, CAD links, quantities, and editable costs.', Gauge],
    ['Code Upload', 'Parse VEXcode safely, detect motors/sensors/ports, and review patches before changes.', Code2],
    ['Path Planner', 'Draw autonomous routes and export only through a reviewable C++/Python diff.', Compass],
    ['Troubleshooting AI', 'Diagnose drivetrain drift, wiring, auton misses, and mechanism reliability.', Wrench],
  ] as const;

  function handleUpload(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    setAssets((current) => {
      const next = current.map((asset) => ({ ...asset }));
      files.slice(0, next.length).forEach((file, index) => {
        const preferred = next.findIndex((asset) => asset.status === 'needed' && (file.type.startsWith('video') ? asset.kind === 'video' : asset.kind === 'image'));
        const targetIndex = preferred >= 0 ? preferred : Math.min(index, next.length - 1);
        next[targetIndex] = {
          ...next[targetIndex],
          kind: file.type.startsWith('video') ? 'video' : 'image',
          status: 'uploaded',
        };
      });
      return next;
    });
    setScanStatus('Ready to analyze');
  }

  function runCaptureCheck() {
    setAssets((current) => current.map((asset) => (asset.status === 'needed' ? asset : { ...asset, status: 'confirmed' })));
    setScanStatus('AI detected parts');
  }

  function manualStart() {
    setAssets((current) => current.map((asset) => (asset.status === 'needed' ? { ...asset, status: 'uploaded' } : asset)));
    setScanStatus('Ready to analyze');
  }

  function toggleAsset(assetId: string) {
    setAssets((current) =>
      current.map((asset) => {
        if (asset.id !== assetId) return asset;
        if (asset.status === 'needed') return { ...asset, status: 'uploaded' };
        if (asset.status === 'uploaded') return { ...asset, status: 'confirmed' };
        return { ...asset, status: 'needed' };
      }),
    );
  }

  function confirmSelectedPart() {
    if (!selectedPart) return;
    setParts((current) => {
      const next = current.map((part) => (part.sku === selectedPart.sku ? { ...part, confirmed: true, confidence: 'High' as const } : part));
      setScanStatus(next.every((part) => part.confirmed) ? 'Confirmed' : 'Manual confirmation needed');
      return next;
    });
  }

  function editSelectedQuantity() {
    if (!selectedPart) return;
    const value = window.prompt(`Quantity for ${selectedPart.name}`, String(selectedPart.quantity));
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity < 0) return;
    setParts((current) => current.map((part) => (part.sku === selectedPart.sku ? { ...part, quantity: Math.round(quantity) } : part)));
  }

  function openRobotTool(title: string) {
    if (title === '360 Vision Audit') {
      document.getElementById('robot-upload-input')?.click();
      return;
    }
    if (title === 'Official Parts Budget') {
      setSelectedSku(parts[0]?.sku ?? '');
      document.getElementById('part-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (title === 'Troubleshooting AI') {
      window.sessionStorage.setItem('robolab:coach:queuedPrompt', 'Troubleshoot our VEX V5 robot using our uploaded robot media, scouting notes, and robot status. Ask for missing details instead of guessing.');
      navigate('/app/coach');
      return;
    }
    if (title === 'Code Upload') {
      window.sessionStorage.setItem('robolab:coach:queuedPrompt', 'Review our VEXcode project safely. Identify motors, sensors, ports, likely issues, and do not suggest code-changing patches without review.');
      navigate('/app/coach');
      return;
    }
    setScanStatus((current) => (current === 'Needs images' ? 'Ready to analyze' : current));
  }

  return (
    <div className="screen-grid">
      <Card className="hero-card">
        <div><Pill tone="orange">Merged Scout-Master + RoboLab</Pill><h2>Robot Lab</h2><p>Upload robot photos or video, let AI identify likely VEX parts from official libraries, then manually confirm labels before budget or CAD records are saved.</p></div>
        <Pill tone={user ? 'success' : 'warn'}>{user ? 'Workspace sync unlocked' : 'Sign in required to save'}</Pill>
      </Card>
      <div className="tool-grid">{tools.map(([title, copy, Icon]) => <Card className="robot-tool" key={title}><Icon size={24} /><strong>{title}</strong><p>{copy}</p><button type="button" className="secondary-button" onClick={() => openRobotTool(title)}>{title === '360 Vision Audit' ? 'Start scan' : 'Open'}</button></Card>)}</div>
      <div className="robot-vision-layout">
        <Card className="scan-card">
          <SectionHeader title="Robot vision capture" eyebrow="No 360 simulator" action={<Pill tone={scanStatus === 'Confirmed' ? 'success' : scanStatus === 'Ready to analyze' ? 'cyan' : 'warn'}>{scanStatus}</Pill>} />
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
              {assets.map((asset) => (
                <button type="button" key={asset.id} className={cn('capture-step', asset.status)} onClick={() => toggleAsset(asset.id)}>
                  <strong>{asset.label}</strong>
                  <span>{asset.kind} · {asset.status}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="button-row">
            <label className="primary-button file-button">
              Upload images/video
              <input id="robot-upload-input" type="file" accept="image/*,video/*" multiple onChange={(event) => { handleUpload(event.target.files); event.currentTarget.value = ''; }} />
            </label>
            <button type="button" className="secondary-button" onClick={runCaptureCheck}>Run blur/lighting check</button>
            <button type="button" className="secondary-button" onClick={manualStart}>Manual start</button>
          </div>
        </Card>
        <Card id="part-breakdown">
          <SectionHeader title="AI part breakdown" eyebrow="Confirm before saving" action={<Pill tone="cyan">${total.toFixed(2)} estimate</Pill>} />
          <p className="body-copy">{robotVisionAnalysis.summary}</p>
          <div className="part-table">
            {parts.map((part) => (
              <button type="button" key={part.sku} className={cn('part-row', selectedPart?.sku === part.sku && 'active')} onClick={() => setSelectedSku(part.sku)}>
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
                <button type="button" className="primary-button" onClick={confirmSelectedPart}>Confirm label</button>
                <button type="button" className="secondary-button" onClick={editSelectedQuantity}>Edit quantity</button>
                <button type="button" className="secondary-button" onClick={() => window.open(selectedPart.sourceUrl, '_blank', 'noopener,noreferrer')}>Open CAD source</button>
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
  const { user, settings, signIn, signOut, updateSettings } = useRoboLabStore();
  const [email, setEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const accentColors = ['#22D3EE', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#FF4455'];
  const validEmail = /\S+@\S+\.\S+/.test(email);

  async function continueSignIn() {
    if (!validEmail || authBusy) return;
    setAuthBusy(true);
    const googleStarted = await startGoogleAuth(email.trim());
    if (!googleStarted) signIn({ email });
    setAuthBusy(false);
  }

  return (
    <div className="screen-grid">
      <Card>
        <SectionHeader title="Account" action={user ? <button className="secondary-button" onClick={signOut}>Sign out</button> : null} />
        {user ? (
          <div className="account-row">
            <span className="avatar">{user.avatarUrl}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <Pill tone="success">Signed in</Pill>
          </div>
        ) : (
          <div className="signin-inline">
            <p className="muted">Sign in with your email to send messages and sync your team data.</p>
            <div className="signin-row">
              <input className="auth-input" type="email" placeholder="you@team.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void continueSignIn()} />
              <button className="primary-button" disabled={!validEmail || authBusy} onClick={() => void continueSignIn()}>{authBusy ? 'Opening Google…' : 'Continue'}</button>
            </div>
          </div>
        )}
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
      <ApiDiagnostics />
      <StateStrip />
    </div>
  );
}

function ApiDiagnostics() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['integration-status'],
    queryFn: fetchIntegrationStatus,
    staleTime: 60_000,
  });

  const groups: Array<{ label: string; keys: string[]; copy: string }> = [
    { label: 'RoboLab AI', keys: ['GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'HUGGINGFACE_API_KEY', 'GEMINI_API_KEY'], copy: 'Powers the VEX-Forum-grounded coach. Any one provider is enough.' },
    { label: 'RobotEvents', keys: ['ROBOTEVENTS_API_TOKEN', 'ROBOT_EVENTS_API_TOKEN'], copy: 'Official teams, events, matches, rankings, skills, and awards.' },
    { label: 'Google sign-in', keys: ['GOOGLE_CLIENT_ID', 'VITE_GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'], copy: 'Workspace sync and messaging identity.' },
    { label: 'Database & storage', keys: ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STORAGE_BUCKET', 'UPLOAD_BUCKET'], copy: 'Stores notes, messages, robot status, and confirmed parts.' },
  ];

  const statusFor = (group: { label: string; keys: string[] }) => {
    if (!data) return undefined;
    if (group.label === 'Google sign-in') {
      const hasClient = data.some((row) => ['GOOGLE_CLIENT_ID', 'VITE_GOOGLE_CLIENT_ID'].includes(row.key) && row.configured);
      const hasSecret = data.some((row) => row.key === 'GOOGLE_CLIENT_SECRET' && row.configured);
      return hasClient && hasSecret;
    }
    const matched = data.filter((row) => group.keys.includes(row.key));
    return matched.some((row) => row.configured);
  };

  return (
    <Card>
      <SectionHeader
        title="API diagnostics"
        eyebrow="Secrets stay server-side"
        action={
          <button className="secondary-button" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Checking…' : 'Re-check'}
          </button>
        }
      />
      {isLoading ? (
        <div className="state-strip"><div className="skeleton-line" /><span>Checking server configuration…</span></div>
      ) : isError ? (
        <EmptyDataCard title="Could not reach the server" copy="The diagnostics route did not respond. Make sure the RoboLab dev/preview server is running." />
      ) : (
        <div className="settings-list">
          {groups.map((group) => {
            const ready = statusFor(group);
            return (
              <div key={group.label}>
                <strong>{group.label}</strong>
                <span>{group.copy}</span>
                <Pill tone={ready ? 'success' : 'warn'}>{ready ? 'Connected' : 'Not configured'}</Pill>
              </div>
            );
          })}
        </div>
      )}
      <p className="body-copy" style={{ marginTop: 12 }}>RoboLab only reports whether a key is present on the server. Key values are never sent to the browser.</p>
    </Card>
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
