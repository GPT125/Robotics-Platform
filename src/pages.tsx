import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Database,
  FileCode2,
  FolderOpen,
  Gauge,
  GitCompare,
  Info,
  LineChart,
  RefreshCw,
  Play,
  Plus,
  Radar,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart as ReLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MetricCard } from './components/MetricCard';
import { RobotScene } from './components/RobotScene';
import { SectionHeader } from './components/SectionHeader';
import { vexFields, vexParts } from './data/vexAssets';
import { aiAdvisor, integrationsAdapter, pathService, robotEventsAdapter, robotService } from './services/api';
import type { LucideIcon } from 'lucide-react';
import type { Team } from './types';

function PrimaryButton({ children, onClick, type = 'button' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button type={type} onClick={onClick} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-electric px-4 text-sm font-medium text-white shadow-glow">
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, type = 'button' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button type={type} onClick={onClick} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white/5 px-4 text-sm text-slate-200 hover:border-electric/50">
      {children}
    </button>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="panel grid min-h-44 place-items-center p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-electric/30 bg-electric/10 text-electric">
          <Info size={22} />
        </div>
        <p className="mt-4 font-medium text-white">{title}</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function LiveStatus({ status, detail }: { status: unknown; detail?: unknown }) {
  const label = typeof status === 'string' ? status : 'Loading';
  const tone = label === 'Fresh' ? 'text-good border-good/40 bg-good/10' : label === 'Offline' ? 'text-bad border-bad/40 bg-bad/10' : 'text-electric border-electric/40 bg-electric/10';
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {label}{detail ? ` · ${String(detail)}` : ''}
    </span>
  );
}

function AiCoachPanel({ title, task, context }: { title: string; task: string; context: string }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');

  async function runCoach() {
    setLoading(true);
    const response = await aiAdvisor.ask(task, context);
    if (response.ok) {
      setAdvice(response.data.summary);
      const completed = response.data.providers.filter((provider) => provider.status === 'ok').length;
      setReviewStatus(completed ? `${completed} AI reviewer${completed === 1 ? '' : 's'} completed analysis.` : 'AI analysis completed with limited coverage.');
    }
    setLoading(false);
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">Runs a private multi-reviewer analysis through the server.</p>
        </div>
        <PrimaryButton onClick={runCoach}>
          <Sparkles size={18} /> {loading ? 'Asking AI...' : 'Ask AI team'}
        </PrimaryButton>
      </div>
      {reviewStatus ? <p className="mt-4 rounded-lg border border-line bg-white/5 px-3 py-2 text-xs text-slate-400">{reviewStatus}</p> : null}
      {advice ? <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300 whitespace-pre-wrap">{advice}</pre> : null}
    </section>
  );
}

const dashboardActions: Array<[string, string, LucideIcon, string]> = [
  ['Scout Match', 'Large tap targets, quick tags, offline queue', Radar, '/app/scout'],
  ['Compare Teams', 'Explainable metrics with confidence labels', GitCompare, '/app/compare'],
  ['Upload Code', 'Parse motors, ports, and movement commands', Upload, '/app/robots'],
  ['Open Simulator', 'Replay timeline and calibrated movement', Play, '/app/robots/competition-bot/sim'],
  ['Draw Auton Path', 'Optimize route and create code patch', Compass, '/app/path'],
  ['Ask Troubleshooting AI', 'Rules-first VEX checklists', BrainCircuit, '/app/debug'],
];

export function Landing({ focus }: { focus?: 'features' | 'docs' }) {
  const featureCards = [
    ['Scouting', 'Offline match and pit scouting with sync states and reliable mobile controls.', Radar],
    ['Team Compare', 'Explainable metrics, confidence labels, and side-by-side partner decisions.', GitCompare],
    ['Path Planner', 'Draw VEX field routes, optimize waypoints, and review generated code patches.', Compass],
    ['Simulator', 'Calibrated drive, turn, lift, intake, and timeline previews from uploaded code.', Bot],
    ['Code Tools', 'Safe parsing, motor mapping, Monaco-style review, and reversible patches.', Code2],
    ['Troubleshooting AI', 'Rules-first VEX checklists with optional AI summaries and user confirmation.', BrainCircuit],
  ] as const;

  return (
    <main className="min-h-screen bg-ink text-white">
      <section className="relative overflow-hidden px-5 pb-14 pt-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_16%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_80%_8%,rgba(255,122,24,0.2),transparent_24%),linear-gradient(135deg,#070B14,#101827)]" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <Link className="flex items-center gap-3" to="/">
            <div className="grid h-11 w-11 place-items-center rounded-lg border border-electric/40 bg-electric/10 text-electric">
              <Bot />
            </div>
            <span className="text-lg font-semibold">RoboLab</span>
          </Link>
          <div className="hidden items-center gap-5 text-sm text-slate-300 sm:flex">
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/docs">Docs</Link>
            <Link className="rounded-lg border border-line px-4 py-2" to="/app">
              Open app
            </Link>
          </div>
        </nav>
        <div className="mx-auto grid min-h-[calc(100vh-110px)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-sm text-electric">
              VEX V5 scouting, simulation, code, and AI-assisted planning
            </p>
            <h1 className="text-4xl font-semibold tracking-normal sm:text-6xl">RoboLab</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              A premium command center for VEX teams to scout events, compare partners, calibrate robots, simulate code,
              plan autonomous paths, and debug faster.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app">
                <PrimaryButton>
                  Launch workspace <ArrowRight size={18} />
                </PrimaryButton>
              </Link>
              <Link to="/docs">
                <SecondaryButton>
                  Read setup docs <Database size={18} />
                </SecondaryButton>
              </Link>
            </div>
          </div>
          <div className="panel p-4">
            <div className="field-grid relative h-[470px] overflow-hidden rounded-lg border border-line bg-[#07101f]">
              <div className="absolute left-8 top-10 rounded-lg border border-primary/50 bg-primary/20 px-3 py-2 text-sm">Blue auton</div>
              <div className="absolute right-8 top-20 rounded-lg border border-bad/50 bg-bad/20 px-3 py-2 text-sm">Red alliance</div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 470" role="img" aria-label="Animated field route">
                <path d="M70 380 C 160 250, 220 250, 300 185 S 390 125, 430 80" fill="none" stroke="#22D3EE" strokeWidth="8" strokeLinecap="round" strokeDasharray="10 14" />
                <rect x="64" y="360" width="52" height="42" rx="6" fill="#3B82F6" />
                <rect x="370" y="65" width="58" height="38" rx="6" fill="#FF7A18" />
              </svg>
              <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
                {['Fresh event data', 'High calibration', 'Patch ready'].map((label) => (
                  <div key={label} className="rounded-lg border border-line bg-ink/80 p-3 text-sm text-slate-200 backdrop-blur">
                    <CheckCircle2 className="mb-2 text-good" size={18} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={focus === 'docs' ? 'Docs' : 'Platform modules'} title={focus === 'docs' ? 'Setup and safety principles' : 'Built around real VEX workflows'} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(([title, detail, Icon]) => (
              <article key={title} className="panel p-5">
                <Icon className="text-electric" />
                <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function Pricing() {
  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <SectionHeader eyebrow="Plans" title="Free for students, expandable for teams and schools" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Free', '$0', 'One workspace, event scouting, team profiles, compare, manual robot projects.'],
            ['Team Pro', '$12/mo', 'Alliance builder, simulation runs, exports, advanced metrics.'],
            ['School/Club', 'Custom', 'Multiple teams, admin dashboards, roster tools, shared scouting templates.'],
          ].map(([name, price, detail]) => (
            <article className="panel p-6" key={name}>
              <h2 className="text-xl font-semibold">{name}</h2>
              <p className="mt-3 text-3xl font-semibold text-electric">{price}</p>
              <p className="mt-4 text-sm leading-6 text-slate-400">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export function Dashboard() {
  const eventsQuery = useQuery({
    queryKey: ['robotevents', 'events', 'dashboard'],
    queryFn: () => robotEventsAdapter.searchEvents(),
    refetchInterval: 60_000,
  });
  const liveEvents = eventsQuery.data?.ok ? eventsQuery.data.data : [];
  const liveEvent = liveEvents[0];
  const liveStatus = eventsQuery.data?.ok ? eventsQuery.data.meta?.liveStatus : 'Loading';

  return (
    <>
      <SectionHeader eyebrow="Fresh workspace" title="Competition dashboard">
        <div className="flex flex-wrap items-center gap-2">
          <LiveStatus status={liveStatus} detail={eventsQuery.data?.ok ? eventsQuery.data.meta?.source : undefined} />
          <Link to="/app/scout">
          <PrimaryButton>
            <Plus size={18} /> Scout match
          </PrimaryButton>
          </Link>
        </div>
      </SectionHeader>
      <div className="space-y-4">
        <div className="data-grid">
          <MetricCard label="Current event" value={liveEvent?.name ?? 'Select an event'} detail={liveEvent ? `${liveEvent.teamCount} teams in ${liveEvent.division}` : 'Live RobotEvents data appears here'} icon={Trophy} tone="orange" />
          <MetricCard label="Next match" value="Not selected" detail="Choose a live event to load official matches" icon={Activity} tone="cyan" />
          <MetricCard label="Team rank" value="-" detail="Search a team number to load metrics" icon={LineChart} tone="green" />
          <MetricCard label="Robot status" value="No code loaded" detail="Upload a VEXcode folder to simulate" icon={Gauge} tone="blue" />
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardActions.map(([title, detail, Icon, to]) => (
            <Link className="panel group p-5 transition hover:-translate-y-0.5 hover:border-electric/50" to={to} key={title}>
              <Icon className="text-electric" />
              <h2 className="mt-4 font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
            </Link>
          ))}
        </section>
        <AiCoachPanel
          title="AI competition command center"
          task="Recommend the most useful RoboLab actions for a VEX V5 team opening a fresh competition workspace."
          context={`Live event: ${liveEvent?.name ?? 'none selected'}\nKnown user concerns from VEX communities: drivetrain smoothness, motor configuration, autonomous repeatability, code review, CAD legality, scouting workflow, inspection readiness.`}
        />
      </div>
    </>
  );
}

export function ScoutWorkspace() {
  const [records, setRecords] = useState<Array<{ id: string; team: string; match: string; tags: string[]; updatedAt: string }>>([]);
  const [team, setTeam] = useState('');
  const [match, setMatch] = useState('');
  const [status, setStatus] = useState('');
  function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    if (!team.trim() || !match.trim()) {
      setStatus('Enter a team and match before saving.');
      return;
    }
    setRecords((current) => [
      {
        id: crypto.randomUUID(),
        team: team.trim(),
        match: match.trim(),
        tags: ['local'],
        updatedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      },
      ...current,
    ]);
    setTeam('');
    setMatch('');
    setStatus('Saved locally in this browser session.');
  }

  return (
    <>
      <SectionHeader eyebrow="Offline-first" title="Scouting workspace">
        <SecondaryButton onClick={() => setRecords([])}>
          <X size={18} /> Clear session
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form className="panel p-5" onSubmit={saveRecord}>
          <h2 className="font-semibold">Quick match form</h2>
          <div className="mt-4 grid gap-3">
            <input className="h-11 rounded-lg border border-line bg-ink px-3 text-sm" value={team} onChange={(event) => setTeam(event.target.value)} placeholder="Team number" />
            <input className="h-11 rounded-lg border border-line bg-ink px-3 text-sm" value={match} onChange={(event) => setMatch(event.target.value)} placeholder="Match, e.g. Q12" />
            {['Auton success', 'Defense', 'Disabled', 'Great teamwork'].map((label) => (
              <label key={label} className="flex items-center justify-between rounded-lg border border-line bg-white/5 px-3 py-3 text-sm">
                {label}
                <input type="checkbox" className="h-5 w-5 accent-cyan-400" />
              </label>
            ))}
            <textarea className="min-h-28 rounded-lg border border-line bg-ink p-3 text-sm outline-none" placeholder="Match details" />
            <PrimaryButton type="submit">
              <Save size={18} /> Save locally
            </PrimaryButton>
            {status ? <p className="text-sm text-slate-400">{status}</p> : null}
          </div>
        </form>
        <section className="grid gap-3">
          {records.length ? records.map((record) => (
            <article className="panel p-4" key={record.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{record.team} · {record.match}</p>
                  <p className="text-sm text-slate-400">Local scouting record · updated {record.updatedAt}</p>
                </div>
                <span className="rounded-full border border-line px-2 py-1 text-xs text-slate-400">local</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {record.tags.map((tag) => (
                  <span className="rounded-full border border-line bg-white/5 px-2 py-1 text-xs text-slate-300" key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          )) : <EmptyState title="No scouting records yet" detail="Use the form to create this session's first record. RoboLab starts clean for each workspace." />}
        </section>
      </div>
    </>
  );
}

export function EventCenter() {
  const { id } = useParams();
  const eventId = id && /^\d+$/.test(id) ? id : undefined;
  const eventQuery = useQuery({
    queryKey: ['robotevents', 'events', 'center'],
    queryFn: () => robotEventsAdapter.searchEvents(),
    refetchInterval: 120_000,
  });
  const selectedEvent = eventQuery.data?.ok ? eventQuery.data.data.find((event) => event.id === eventId) ?? eventQuery.data.data[0] : undefined;
  const matchesQuery = useQuery({
    queryKey: ['robotevents', 'matches', selectedEvent?.id],
    queryFn: () => robotEventsAdapter.getEventMatches(selectedEvent?.id),
    enabled: Boolean(selectedEvent),
    refetchInterval: 30_000,
  });
  const eventMatches = matchesQuery.data?.ok ? matchesQuery.data.data : [];
  const liveStatus = matchesQuery.data?.ok ? matchesQuery.data.meta?.liveStatus : 'Loading';

  return (
    <>
      <SectionHeader eyebrow={selectedEvent?.location ?? 'Live event'} title={selectedEvent?.name ?? 'Select an event'}>
        <div className="flex flex-wrap items-center gap-2">
          <LiveStatus status={liveStatus} detail={matchesQuery.data?.ok ? matchesQuery.data.meta?.source : undefined} />
          <SecondaryButton onClick={() => { void eventQuery.refetch(); void matchesQuery.refetch(); }}>
            <RefreshCw size={18} /> Live refresh
          </SecondaryButton>
        </div>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 className="font-semibold">Live match center</h2>
          </div>
          <div className="divide-y divide-line">
            {eventMatches.length ? eventMatches.map((match) => (
              <article className="grid gap-4 p-4 md:grid-cols-[120px_1fr_1fr_180px]" key={match.id}>
                <div>
                  <p className="text-lg font-semibold">{match.number}</p>
                  <p className="text-sm text-slate-400">{match.field} · {match.startsAt}</p>
                </div>
                <div className="rounded-lg border border-bad/40 bg-bad/10 p-3">
                  <p className="text-xs text-bad">Red</p>
                  <p className="mt-1 font-medium">{match.red.join(' + ')}</p>
                </div>
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
                  <p className="text-xs text-primary">Blue</p>
                  <p className="mt-1 font-medium">{match.blue.join(' + ')}</p>
                </div>
                <div className="text-sm text-slate-300">
                  {match.prediction.winner.toUpperCase()} {Math.round(match.prediction.probability * 100)}%
                  <p className="text-xs text-slate-500">{match.prediction.confidence}</p>
                </div>
              </article>
            )) : <EmptyState title="No matches loaded" detail="Open a live event from Lookup to load official RobotEvents matches." />}
          </div>
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">Live event status</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Schedule and matches refresh every 30 seconds when RobotEvents returns JSON. If the API redirects or rate-limits,
            RoboLab keeps the current view stable and marks the feed stale instead of overlapping or breaking the page.
          </p>
          <div className="mt-4 rounded-lg border border-line bg-white/5 p-3 text-sm">
            <p className="font-medium">Event ID</p>
            <p className="mt-1 text-slate-400">{selectedEvent?.id ?? 'Not selected'}</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function score(team: Team) {
  return Math.round(team.avgScore * 0.3 + team.consistency * 0.2 + team.autonSignal * 0.15 + team.skills * 0.1 - team.risk * 0.2);
}

export function TeamProfile() {
  const { number } = useParams();
  const teamQuery = useQuery({
    queryKey: ['team-profile', number],
    queryFn: () => robotEventsAdapter.searchTeams(number ?? ''),
    enabled: Boolean(number),
  });
  const team = teamQuery.data?.ok ? teamQuery.data.data[0] : undefined;
  const chart = team ? [
    { event: 'Loaded', score: team.avgScore },
    { event: 'Current', score: team.avgScore },
  ] : [];
  return (
    <>
      <SectionHeader eyebrow={team?.confidence ?? 'Live lookup'} title={team ? `${team.number} · ${team.name}` : 'Team profile'}>
        <Link to="/app/alliance">
          <PrimaryButton>
            <Search size={18} /> Search teams
          </PrimaryButton>
        </Link>
      </SectionHeader>
      {team ? <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="panel p-5">
          <p className="text-slate-400">{team.organization} · {team.region}</p>
          <div className="mt-5 data-grid">
            <MetricCard label="Win rate" value={`${Math.round(team.winRate * 100)}%`} detail="Recent official and scouting blend" icon={Trophy} />
            <MetricCard label="Avg score" value={`${team.avgScore}`} detail="Estimated contribution model v1" icon={Gauge} tone="green" />
            <MetricCard label="Auton signal" value={`${team.autonSignal}`} detail="Programming skills plus live scouting records" icon={BrainCircuit} tone="orange" />
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chart}>
                <CartesianGrid stroke="#24314F" />
                <XAxis dataKey="event" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line dataKey="score" stroke="#22D3EE" strokeWidth={3} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">AI-assisted summary</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Recommended as a high-trust partner because they combine consistent driver-control scoring, low mechanical risk,
            and scout-confirmed autonomous reliability. Sources: live match history, scouting records, event ranking trend.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {team.tags.map((tag) => <span className="rounded-full border border-line px-2 py-1 text-xs" key={tag}>{tag}</span>)}
          </div>
        </aside>
      </div> : <EmptyState title="No team loaded" detail="Search from Lookup or open a live team profile." />}
    </>
  );
}

export function CompareTeams() {
  const [query, setQuery] = useState('');
  const teamsQuery = useQuery({
    queryKey: ['compare-teams', query],
    queryFn: () => robotEventsAdapter.searchTeams(query),
    enabled: query.trim().length > 1,
  });
  const comparedTeams = teamsQuery.data?.ok ? teamsQuery.data.data : [];
  return (
    <>
      <SectionHeader eyebrow="Explainable metrics" title="Team compare">
        <div className="lookup-search flex gap-2">
          <input className="h-11 min-w-0 rounded-lg border border-line px-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team number" />
          <SecondaryButton onClick={() => { void teamsQuery.refetch(); }}>
            <Search size={18} /> Search
          </SecondaryButton>
        </div>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="panel overflow-x-auto p-4">
          {comparedTeams.length ? <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Team</th>
                {['Avg score', 'Win rate', 'Consistency', 'Auton', 'Skills', 'Risk', 'Fit'].map((head) => (
                  <th className="p-3" key={head}>{head} <Info className="inline text-slate-500" size={13} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparedTeams.map((team) => (
                <tr className="border-t border-line" key={team.number}>
                  <td className="p-3 font-medium text-white">{team.number}<p className="text-xs font-normal text-slate-500">{team.confidence}</p></td>
                  <td className="p-3">{team.avgScore}</td>
                  <td className="p-3">{Math.round(team.winRate * 100)}%</td>
                  <td className="p-3">{team.consistency}</td>
                  <td className="p-3">{team.autonSignal}</td>
                  <td className="p-3">{team.skills}</td>
                  <td className="p-3">{team.risk}</td>
                  <td className="p-3 text-electric">{score(team)}</td>
                </tr>
              ))}
            </tbody>
          </table> : <EmptyState title="Search teams to compare" detail="Enter a VEX team number to load live RobotEvents team data." />}
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">Why this matters</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The fit score rewards scoring power, consistency, autonomous strength, skills, and scout trust, then subtracts risk.
            Low-data teams are never hidden; they show confidence warnings.
          </p>
        </aside>
      </div>
      <div className="mt-4">
        <AiCoachPanel
          title="AI partner fit review"
          task="Review VEX alliance partner fit and scouting priorities."
          context={`Team search: ${query || 'none'}\nLoaded teams: ${comparedTeams.map((team) => `${team.number} ${team.name}`).join(', ') || 'none'}\nNeed practical advice for selection, scouting gaps, and risk checks.`}
        />
      </div>
    </>
  );
}

export function AllianceBuilder() {
  const [teamQuery, setTeamQuery] = useState('');
  const [pickList, setPickList] = useState<Team[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const eventsQuery = useQuery({
    queryKey: ['robotevents', 'lookup-events'],
    queryFn: () => robotEventsAdapter.searchEvents(),
    refetchInterval: 120_000,
  });
  const teamsQuery = useQuery({
    queryKey: ['robotevents', 'lookup-teams', teamQuery],
    queryFn: () => robotEventsAdapter.searchTeams(teamQuery),
    enabled: teamQuery.trim().length > 1,
    staleTime: 60_000,
  });
  const lookupTeams = teamsQuery.data?.ok ? teamsQuery.data.data : [];
  const liveEvents = eventsQuery.data?.ok ? eventsQuery.data.data : [];

  return (
    <>
      <SectionHeader eyebrow="Teams, events, compare, alliance" title="Lookup">
        <div className="flex flex-wrap items-center gap-2">
          <LiveStatus status={eventsQuery.data?.ok ? eventsQuery.data.meta?.liveStatus : 'Loading'} detail="events" />
          <PrimaryButton onClick={() => setSelectionMode((value) => !value)}>
            <Trophy size={18} /> {selectionMode ? 'Selection on' : 'Selection mode'}
          </PrimaryButton>
        </div>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <div className="panel p-4">
            <label className="text-sm font-medium text-slate-400" htmlFor="team-search">Team lookup</label>
            <div className="lookup-search mt-2 flex gap-2">
              <input
                id="team-search"
                className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm"
                value={teamQuery}
                onChange={(event) => setTeamQuery(event.target.value)}
                placeholder="Search a team number"
              />
              <SecondaryButton onClick={() => { void teamsQuery.refetch(); }}>
                <Search size={18} /> Search
              </SecondaryButton>
            </div>
            {teamsQuery.data?.ok && teamsQuery.data.meta?.error ? <p className="mt-2 text-sm text-bad">{String(teamsQuery.data.meta.error)}</p> : null}
          </div>

          <div className="panel p-4">
            <h2 className="font-semibold">Compare and partner ranking</h2>
            {lookupTeams.length ? <table className="desktop-table mt-3 w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Team</th>
                  <th className="p-3">Avg</th>
                  <th className="p-3">Win</th>
                  <th className="p-3">Consistency</th>
                  <th className="p-3">Auton</th>
                  <th className="p-3">Skills</th>
                  <th className="p-3">Fit</th>
                </tr>
              </thead>
              <tbody>
                {lookupTeams.map((team) => (
                  <tr className="border-t border-line" key={team.number}>
                    <td className="p-3 font-medium">{team.number}<p className="text-xs font-normal text-slate-500">{team.name}</p></td>
                    <td className="p-3">{team.avgScore || '-'}</td>
                    <td className="p-3">{team.winRate ? `${Math.round(team.winRate * 100)}%` : '-'}</td>
                    <td className="p-3">{team.consistency || '-'}</td>
                    <td className="p-3">{team.autonSignal || '-'}</td>
                  <td className="p-3">{team.skills || '-'}</td>
                  <td className="p-3 text-electric">{score(team)}</td>
                  <td className="p-3">
                    <button className="rounded-lg border border-line px-3 py-2 text-xs" onClick={() => setPickList((current) => current.some((item) => item.number === team.number) ? current : [...current, team])}>Add</button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table> : <EmptyState title="Search a team to begin" detail="This workspace starts empty. Live RobotEvents team results appear here after you search." />}
            <div className="mobile-team-list mt-3 space-y-2">
              {lookupTeams.map((team) => (
                <article className="rounded-lg border border-line bg-white/5 p-3" key={team.number}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{team.number}</p>
                      <p className="text-xs text-slate-500">{team.name}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-electric">Fit {score(team)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <span>Avg <b>{team.avgScore || '-'}</b></span>
                    <span>Win <b>{team.winRate ? `${Math.round(team.winRate * 100)}%` : '-'}</b></span>
                    <span>Auton <b>{team.autonSignal || '-'}</b></span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {pickList.length ? pickList.map((team, index) => (
              <article className="panel p-4" key={team.number}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">#{index + 1} {team.number} · {team.name}</p>
                    <p className="text-sm text-slate-400">Added to this session's pick list.</p>
                  </div>
                  <p className="rounded-full border border-electric/40 px-3 py-1 text-sm font-semibold text-electric">Fit {score(team)}</p>
                </div>
              </article>
            )) : <EmptyState title="Pick list is empty" detail="Search live teams and add candidates during alliance selection." />}
          </div>
          <AiCoachPanel
            title="AI alliance strategy"
            task="Rank alliance selection risks and next scouting questions for VEX V5."
            context={`Selection mode: ${selectionMode}\nPick list: ${pickList.map((team) => `${team.number} ${team.name}`).join(', ') || 'empty'}\nSearch query: ${teamQuery || 'none'}`}
          />
        </section>
        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="font-semibold">Live events</h2>
            <div className="mt-3 space-y-2">
              {liveEvents.length ? liveEvents.slice(0, 5).map((event) => (
                <Link className="block rounded-lg border border-line bg-white/5 p-3" to={`/app/events/${event.id}`} key={event.id}>
                  <p className="text-sm font-medium">{event.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.location} · {event.date}</p>
                </Link>
              )) : <p className="text-sm leading-6 text-slate-400">No live event data loaded yet.</p>}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="font-semibold">RoboLab tools</h2>
            <div className="mt-3 grid gap-2">
              {[
                ['Robot workspace', '/app/robots', Bot],
                ['Autonomous planner', '/app/path', Compass],
                ['Troubleshooting', '/app/debug', BrainCircuit],
              ].map(([label, to, Icon]) => (
                <Link className="flex items-center gap-3 rounded-lg border border-line bg-white/5 p-3 text-sm" to={to as string} key={label as string}>
                  <Icon className="text-electric" size={18} />
                  {label as string}
                </Link>
              ))}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="font-semibold">Pick list tiers</h2>
            {['A', 'B', 'C', 'D'].map((tier, index) => (
              <div className="mt-3 rounded-lg border border-line bg-ink/45 p-3" key={tier}>
                <p className="text-sm font-medium">Tier {tier}</p>
                <p className="text-xs text-slate-500">{pickList[index]?.number ?? 'Empty'}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}

export function RobotWorkspace({ simMode = false }: { simMode?: boolean }) {
  const { data } = useQuery({ queryKey: ['robots'], queryFn: robotService.listProjects });
  const robots = data?.ok ? data.data : [];
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; path: string; size: number; type: string; content?: string }>>([]);
  const [codeReview, setCodeReview] = useState('');
  const [reviewingCode, setReviewingCode] = useState(false);
  const codeFiles = uploadedFiles.filter((file) => /\.(cpp|h|hpp|py|txt|json|v5code)$/i.test(file.name));
  const codePreview = codeFiles.find((file) => file.content)?.content ?? '';
  const detectedDevices = useMemo(() => {
    const names = codeFiles.map((file) => `${file.name} ${file.content ?? ''}`.toLowerCase()).join(' ');
    return [
      ['Drivetrain', names.includes('drive') || names.includes('main') ? 'Detected' : 'Ready to map', Bot],
      ['V5 Brain', codeFiles.length ? 'Project loaded' : 'Waiting for code', Cpu],
      ['Motors', names.includes('motor') || names.includes('robot-config') ? 'Ports found' : 'Manual review', Gauge],
      ['Autonomous', names.includes('auton') || names.includes('main') ? 'Previewable' : 'No route yet', Compass],
    ] as const;
  }, [codeFiles]);

  async function handleProjectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = await Promise.all(Array.from(event.target.files ?? []).map(async (file) => {
      const isCode = /\.(cpp|h|hpp|py|txt|json|v5code)$/i.test(file.name);
      return {
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type || 'code',
        content: isCode ? await file.text() : undefined,
      };
    }));
    setUploadedFiles(files);
    setCodeReview('');
  }

  async function reviewCodeWithAi() {
    setReviewingCode(true);
    const response = await aiAdvisor.ask(
      'Review uploaded VEX V5 robot code for motor mapping, autonomous reliability, drivetrain setup, unsafe assumptions, and competition readiness.',
      `Files:\n${codeFiles.map((file) => `${file.path}\n${file.content?.slice(0, 2500) ?? ''}`).join('\n\n')}`,
    );
    if (response.ok) setCodeReview(response.data.summary);
    setReviewingCode(false);
  }

  return (
    <>
      <SectionHeader eyebrow="Robot projects" title={simMode ? 'Simulator' : 'Robot workspace'}>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => folderInputRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white/5 px-4 text-sm text-slate-200 hover:border-electric/50">
            <FolderOpen size={18} /> Upload folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white/5 px-4 text-sm text-slate-200 hover:border-electric/50">
            <Upload size={18} /> Upload files
          </button>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleProjectFiles}
            {...{ webkitdirectory: '', directory: '' }}
          />
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleProjectFiles} />
        </div>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="space-y-3">
          <article className="panel p-4">
            <p className="font-semibold text-white">VEXcode import</p>
            <p className="mt-1 text-sm leading-5 text-slate-400">Upload an entire project folder or selected source files. RoboLab keeps the import local in the browser while it builds the robot preview and simulation map.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <span className="rounded-lg border border-line bg-white/5 p-2">{uploadedFiles.length} files</span>
              <span className="rounded-lg border border-line bg-white/5 p-2">{codeFiles.length} code files</span>
            </div>
            {codeFiles.length ? (
              <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-line bg-white/5">
                {codeFiles.slice(0, 12).map((file) => (
                  <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-b-0" key={file.path}>
                    <FileCode2 size={14} className="shrink-0 text-electric" />
                    <span className="min-w-0 truncate">{file.path}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
          {robots.length ? robots.map((robot) => (
            <article className="panel p-4" key={robot.id}>
              <p className="font-semibold text-white">{robot.name}</p>
              <p className="mt-1 text-sm text-slate-400">{robot.season} · {robot.status}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-lg border border-line bg-white/5 p-2">L {robot.dimensions.length} in</span>
                <span className="rounded-lg border border-line bg-white/5 p-2">W {robot.dimensions.width} in</span>
                <span className="rounded-lg border border-line bg-white/5 p-2">Wheel {robot.dimensions.wheelDiameter} in</span>
                <span className="rounded-lg border border-line bg-white/5 p-2">{robot.dimensions.calibrationScore}</span>
              </div>
            </article>
          )) : (
            <article className="panel p-4">
              <p className="font-semibold text-white">No robot project loaded</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">Upload a VEXcode folder to start a session. RoboLab does not show fake robot projects in a fresh workspace.</p>
            </article>
          )}
          <article className="panel p-4">
            <p className="font-semibold text-white">Official VEX CAD sources</p>
            <div className="mt-3 space-y-2">
              {vexParts.map((part) => (
                <a className="block rounded-lg border border-line bg-white/5 p-3 text-sm" href={part.cadUrl} target="_blank" rel="noreferrer" key={part.sku}>
                  <span className="font-medium">{part.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{part.sku} · {part.detail}</span>
                </a>
              ))}
            </div>
          </article>
        </section>
        <section className="space-y-4">
          <RobotScene />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">VEX hardware map</h2>
                <SecondaryButton onClick={reviewCodeWithAi}>
                  <Sparkles size={18} /> {reviewingCode ? 'Reviewing...' : 'AI code review'}
                </SecondaryButton>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {detectedDevices.map(([name, status, Icon]) => (
                  <div className="rounded-lg border border-line bg-white/5 p-3" key={name}>
                    <Icon className="text-electric" size={18} />
                    <p className="mt-2 text-sm font-semibold">{name}</p>
                    <p className="text-xs text-slate-500">{status}</p>
                  </div>
                ))}
              </div>
              {codePreview ? <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300">{codePreview}</pre> : <EmptyState title="No code imported" detail="Upload a VEXcode project to preview source and map motors from the actual files." />}
              {codeReview ? <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300 whitespace-pre-wrap">{codeReview}</pre> : null}
            </div>
            <div className="panel p-4">
              <h2 className="font-semibold">Simulation timeline</h2>
              <div className="mt-4 space-y-3">
                {(codePreview ? ['Parse drivetrain commands', 'Estimate robot poses', 'Review warnings', 'Export path patch'] : ['Upload code to create a timeline']).map((cmd, index) => (
                  <div className="flex items-center gap-3 rounded-lg border border-line bg-white/5 p-3 text-sm" key={cmd}>
                    <span className="grid h-7 w-7 place-items-center rounded bg-electric/10 text-electric">{index + 1}</span>
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const fieldPresets = vexFields;
type FieldPreset = (typeof vexFields)[number];

function FieldObjects({ field }: { field: FieldPreset }) {
  if (field.id === 'override') {
    return (
      <>
        <rect x="118" y="96" width="110" height="328" rx="12" fill="rgba(0,122,255,0.14)" stroke="#007aff" strokeWidth="3" />
        <rect x="472" y="96" width="110" height="328" rx="12" fill="rgba(255,59,48,0.14)" stroke="#ff3b30" strokeWidth="3" />
        {[140, 210, 280, 350].map((cy) => (
          <g key={cy}>
            <rect x="314" y={cy - 18} width="72" height="36" rx="6" fill="#2c2c2e" />
            <circle cx="350" cy={cy} r="13" fill="#ffcc00" stroke="#1c1c1e" strokeWidth="3" />
          </g>
        ))}
        <path d="M244 74H456M244 446H456" stroke="#1c1c1e" strokeWidth="10" strokeLinecap="round" />
      </>
    );
  }

  if (field.id === 'push-back') {
    return (
      <>
        {[
          [150, 132, '#007aff'], [226, 194, '#007aff'], [474, 326, '#ff3b30'], [552, 388, '#ff3b30'], [350, 260, '#8e8e93'],
        ].map(([cx, cy, color]) => (
          <rect key={`${cx}-${cy}`} x={(cx as number) - 25} y={(cy as number) - 25} width="50" height="50" rx="8" fill={color as string} stroke="#1c1c1e" strokeWidth="4" />
        ))}
        <rect x="76" y="222" width="150" height="76" rx="10" fill="rgba(0,122,255,0.16)" stroke="#007aff" strokeWidth="3" />
        <rect x="474" y="222" width="150" height="76" rx="10" fill="rgba(255,59,48,0.16)" stroke="#ff3b30" strokeWidth="3" />
      </>
    );
  }

  if (field.id === 'over-under') {
    return (
      <>
        {[
          [150, 128], [240, 255], [355, 168], [475, 298], [560, 118], [610, 390],
        ].map(([cx, cy]) => (
          <polygon key={`${cx}-${cy}`} points={`${cx},${cy - 18} ${cx + 22},${cy + 16} ${cx - 22},${cy + 16}`} fill="#ff9500" stroke="#1c1c1e" strokeWidth="3" />
        ))}
        <rect x="302" y="34" width="96" height="452" rx="8" fill="rgba(52,199,89,0.16)" stroke="#34c759" strokeWidth="3" strokeDasharray="8 8" />
      </>
    );
  }

  if (field.id === 'spin-up') {
    return (
      <>
        {[
          [150, 160], [230, 330], [350, 250], [470, 150], [550, 360],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="20" fill="#ffcc00" stroke="#1c1c1e" strokeWidth="4" />
        ))}
        <rect x="48" y="42" width="36" height="98" rx="8" fill="#007aff" />
        <rect x="616" y="380" width="36" height="98" rx="8" fill="#ff3b30" />
      </>
    );
  }

  if (field.id === 'tipping-point') {
    return (
      <>
        {[
          [166, 145, '#007aff'], [350, 256, '#ff3b30'], [534, 370, '#007aff'],
        ].map(([cx, cy, color]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx as number} cy={cy as number} r="34" fill={color as string} opacity="0.9" />
            <circle cx={cx as number} cy={cy as number} r="16" fill="#f2f2f7" />
          </g>
        ))}
        <rect x="96" y="390" width="160" height="70" rx="10" fill="rgba(0,122,255,0.22)" stroke="#007aff" strokeWidth="3" />
        <rect x="444" y="60" width="160" height="70" rx="10" fill="rgba(255,59,48,0.22)" stroke="#ff3b30" strokeWidth="3" />
      </>
    );
  }

  return (
    <>
      {[
        [144, 134, '#007aff'], [214, 316, '#ff3b30'], [350, 250, '#1c1c1e'], [486, 184, '#ff3b30'], [558, 366, '#007aff'],
      ].map(([cx, cy, color]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx as number} cy={cy as number} r="24" fill="none" stroke={color as string} strokeWidth="8" />
          <line x1={(cx as number) - 14} y1={cy as number} x2={(cx as number) + 14} y2={cy as number} stroke={color as string} strokeWidth="4" />
        </g>
      ))}
      <rect x="318" y="46" width="64" height="160" rx="8" fill="rgba(28,28,30,0.78)" />
      <rect x="318" y="314" width="64" height="160" rx="8" fill="rgba(28,28,30,0.78)" />
    </>
  );
}

function VrcField({ field }: { field: FieldPreset }) {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 700 520" role="img" aria-label={`${field.name} autonomous field`}>
      <defs>
        <pattern id="vrcTiles" width="58.33" height="43.33" patternUnits="userSpaceOnUse">
          <path d="M58.33 0H0V43.33" fill="none" stroke="rgba(60,60,67,0.18)" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect x="28" y="28" width="644" height="464" rx="14" fill="#f8f8fb" stroke="#1c1c1e" strokeWidth="10" />
      <rect x="38" y="38" width="624" height="444" fill="url(#vrcTiles)" />
      <rect x="38" y="38" width="160" height="132" fill="rgba(0,122,255,0.12)" />
      <rect x="502" y="350" width="160" height="132" fill="rgba(255,59,48,0.13)" />
      <line x1="350" y1="38" x2="350" y2="482" stroke="rgba(60,60,67,0.32)" strokeWidth="3" strokeDasharray="10 9" />
      <line x1="38" y1="260" x2="662" y2="260" stroke="rgba(60,60,67,0.22)" strokeWidth="2" />
      <FieldObjects field={field} />
      <text x="54" y="68" className="vex-field-label">BLUE START</text>
      <text x="506" y="462" className="vex-field-label">RED ZONE</text>
    </svg>
  );
}

export function PathPlanner() {
  const [accepted, setAccepted] = useState(false);
  const [patch, setPatch] = useState('');
  const [fieldId, setFieldId] = useState<FieldPreset['id']>('override');
  const [pathPoints, setPathPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [plannerStatus, setPlannerStatus] = useState('Click the field to place path points.');
  const field = fieldPresets.find((preset) => preset.id === fieldId) ?? fieldPresets[0];
  async function optimize() {
    const response = await pathService.optimizePath(pathPoints);
    if (response.ok) {
      setPatch(response.data.patch.newText);
      setPlannerStatus('Generated a reviewable autonomous patch.');
    }
  }
  function addPathPoint(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPathPoints((current) => [...current, { x: Math.round(((event.clientX - rect.left) / rect.width) * 700), y: Math.round(((event.clientY - rect.top) / rect.height) * 520) }]);
    setAccepted(false);
    setPlannerStatus('Path point added. Optimize when the route is complete.');
  }
  return (
    <>
      <SectionHeader eyebrow="Autonomous" title="Field path planner">
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-11 rounded-lg border border-line bg-ink px-3 text-sm" value={fieldId} onChange={(event) => setFieldId(event.target.value as FieldPreset['id'])}>
            {fieldPresets.map((preset) => (
              <option value={preset.id} key={preset.id}>{preset.season} · {preset.name}</option>
            ))}
          </select>
          <PrimaryButton onClick={() => { setPathPoints([]); setPatch(''); setAccepted(false); setPlannerStatus('Drawing mode reset. Click the field to place the first point.'); }}>
            <Compass size={18} /> Draw path
          </PrimaryButton>
        </div>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="panel p-4">
          <div className="vrc-field relative h-[620px] overflow-hidden rounded-lg border border-line bg-[#f8f8fb]" onClick={addPathPoint}>
            <VrcField field={field} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 700 520">
              {pathPoints.length > 1 ? <polyline points={pathPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#ff3b30" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /> : null}
              {pathPoints.map((point, index) => (
                <g key={`${point.x}-${point.y}-${index}`}>
                  <circle cx={point.x} cy={point.y} r="13" fill={index === 0 ? '#007aff' : '#34c759'} stroke="#1c1c1e" strokeWidth="3" />
                  <text x={point.x + 16} y={point.y + 5} className="vex-field-label">{index + 1}</text>
                </g>
              ))}
            </svg>
            <div className="absolute right-4 top-4 rounded-lg border border-line bg-white/90 px-3 py-2 text-sm shadow-sm">
              <p className="font-semibold">{field.name}</p>
              <p className="text-xs text-slate-500">{field.season} · {field.objects}</p>
              <p className="mt-1 text-xs text-slate-500">{plannerStatus}</p>
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button onClick={(event) => { event.stopPropagation(); void optimize(); }} className="h-11 rounded-lg bg-primary px-4 text-sm font-medium">Optimize</button>
              <button onClick={(event) => { event.stopPropagation(); setPathPoints((current) => current.slice(0, -1)); }} className="h-11 rounded-lg border border-line bg-ink/80 px-4 text-sm">Undo</button>
              <a onClick={(event) => event.stopPropagation()} className="grid h-11 place-items-center rounded-lg border border-line bg-white/90 px-4 text-sm" href={field.cadUrl} target="_blank" rel="noreferrer">Official CAD</a>
            </div>
          </div>
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">Path-to-code patch</h2>
          {patch ? (
            <>
              <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300">{patch}</pre>
              <button onClick={() => setAccepted(true)} className="mt-4 h-11 w-full rounded-lg bg-good px-4 text-sm font-medium text-ink">
                Accept Changes
              </button>
              {accepted ? <p className="mt-3 text-sm text-good">New code version created from accepted path.</p> : null}
            </>
          ) : (
            <EmptyState title="No generated patch yet" detail="Optimize a route to create a reviewable code patch. RoboLab never overwrites autonomous code silently." />
          )}
        </aside>
      </div>
    </>
  );
}

export function DebugAssistant() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [symptom, setSymptom] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<Array<[string, string]>>([]);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  async function analyze() {
    const text = symptom.toLowerCase();
    const results: Array<[string, string]> = [];
    if (text.includes('turn') || text.includes('drift')) results.push(['Drivetrain calibration', 'Verify wheel diameter, track width, gear ratio, and inertial calibration before changing turn constants.']);
    if (text.includes('motor') || text.includes('port')) results.push(['Motor configuration', 'Check duplicate V5 Smart Port declarations and reversed motor flags in robot-config files.']);
    if (text.includes('lift') || text.includes('stall')) results.push(['Mechanical load', 'Inspect gear ratio, friction, current draw, and hard stops before increasing motor power.']);
    if (!results.length) results.push(['Ready for inspection', 'Add a symptom or attach code so RoboLab can produce a targeted VEX checklist.']);
    setAnalysis(results);
    setAnalyzing(true);
    const response = await aiAdvisor.ask(
      'Troubleshoot this VEX V5 robot issue and return prioritized checks.',
      `Symptom: ${symptom || 'not provided'}\nAttached file names: ${attachedFiles.join(', ') || 'none'}\nLocal checklist: ${results.map(([title, detail]) => `${title}: ${detail}`).join(' ')}`,
    );
    if (response.ok) setAiAnalysis(response.data.summary);
    setAnalyzing(false);
  }
  return (
    <>
      <SectionHeader eyebrow="Rules-first assistant" title="VEX troubleshooting">
        <SecondaryButton onClick={() => fileInputRef.current?.click()}>
          <Upload size={18} /> Attach code
        </SecondaryButton>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => setAttachedFiles(Array.from(event.target.files ?? []).map((file) => file.name))} />
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="panel p-5">
          <textarea value={symptom} onChange={(event) => setSymptom(event.target.value)} className="min-h-48 w-full rounded-lg border border-line bg-ink p-3 text-sm outline-none" placeholder="Describe the symptom: one side reversed, lift stalls, compile error..." />
          {attachedFiles.length ? <p className="my-3 text-sm text-slate-400">{attachedFiles.length} file(s) attached: {attachedFiles.join(', ')}</p> : null}
          <PrimaryButton onClick={() => { void analyze(); }}>
            <BrainCircuit size={18} /> {analyzing ? 'Analyzing...' : 'Analyze'}
          </PrimaryButton>
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Inspection results</h2>
          {(analysis.length ? analysis : [['No analysis yet', 'Describe a problem or attach code, then run Analyze.']]).map(([title, detail]) => (
            <div className="mt-3 rounded-lg border border-line bg-white/5 p-4" key={title}>
              <p className="font-medium">{title}</p>
              <p className="mt-2 text-sm leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
          {aiAnalysis ? <pre className="mt-4 max-h-96 overflow-auto rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300 whitespace-pre-wrap">{aiAnalysis}</pre> : null}
        </section>
      </div>
    </>
  );
}

export function SettingsPage() {
  const [signals, setSignals] = useState<Array<{ source: string; status: string; summary: string }>>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const integrationsQuery = useQuery({
    queryKey: ['integrations-status'],
    queryFn: integrationsAdapter.status,
  });
  const integrations = integrationsQuery.data?.ok ? integrationsQuery.data.data : [];
  const hasConnection = (terms: string[]) => integrations.some((item) => {
    const searchable = item.feature.toLowerCase();
    return item.configured && terms.some((term) => searchable.includes(term));
  });
  const connectionStatus = (terms: string[]) => {
    if (integrationsQuery.isLoading) return 'Checking';
    if (!integrations.length) return 'Needs setup';
    return hasConnection(terms) ? 'Connected' : 'Needs setup';
  };
  const connections = [
    ['Live event data', 'Official teams, events, and match schedules.', connectionStatus(['live', 'event', 'teams', 'matches'])],
    ['AI assistant team', 'Strategy, debugging, code review, and scouting support.', connectionStatus(['ai', 'coach', 'code', 'reasoning', 'reviewer', 'model'])],
    ['Sponsor research', 'News, market, and finance signals for outreach planning.', connectionStatus(['news', 'market', 'finance', 'sponsor', 'regional'])],
    ['Workspace imports', 'Drive and folder-based project import surfaces.', connectionStatus(['google', 'drive', 'folder'])],
  ];
  async function loadSponsorSignals() {
    setLoadingSignals(true);
    const response = await integrationsAdapter.sponsorSignals();
    if (response.ok) setSignals(response.data);
    setLoadingSignals(false);
  }
  return (
    <>
      <SectionHeader eyebrow="Workspace" title="Settings">
        <SecondaryButton onClick={() => { void integrationsQuery.refetch(); }}>
          <RefreshCw size={18} /> Check connections
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-semibold">Connected services</h2>
          <div className="mt-4 grid gap-3 text-sm">
            {connections.map(([title, detail, status]) => (
              <div className="flex items-start gap-3 rounded-lg border border-line bg-ink p-4" key={title}>
                <CheckCircle2 size={17} className={status === 'Connected' ? 'mt-0.5 shrink-0 text-good' : 'mt-0.5 shrink-0 text-slate-500'} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-white">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-xs ${status === 'Connected' ? 'border-good/40 bg-good/10 text-good' : 'border-line text-slate-400'}`}>{status}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">AI-powered tools</h2>
          {[
            ['Debug assistant', 'Compares multiple AI opinions against VEX drivetrain, motor, and autonomous checklists.'],
            ['Code review', 'Reads uploaded VEXcode files and flags motor mapping, blocking commands, and repeatability risks.'],
            ['Alliance strategy', 'Reviews live team lookup and pick list gaps for scouting priorities.'],
            ['Sponsor signals', 'Researches current news and finance context for sponsor outreach.'],
          ].map(([title, detail]) => (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-line bg-white/5 p-3 text-sm" key={title}>
              <ShieldCheck className="mt-0.5 shrink-0 text-good" size={16} />
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-xs leading-5 text-slate-500">{detail}</span>
              </span>
            </div>
          ))}
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Sponsor signals</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Runs sponsor prospect research from the configured services.</p>
              </div>
              <SecondaryButton onClick={loadSponsorSignals}>
                <Sparkles size={18} /> {loadingSignals ? 'Loading...' : 'Run signals'}
              </SecondaryButton>
            </div>
            {signals.length ? (
              <div className="mt-3 grid gap-2">
                {signals.map((signal) => (
                  <div className="rounded-lg border border-line bg-white/5 p-3 text-sm" key={signal.source}>
                    <p className="font-medium">{signal.source} · {signal.status}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{signal.summary}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
