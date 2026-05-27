import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Compass,
  Database,
  Gauge,
  GitCompare,
  Info,
  LineChart,
  Lock,
  Play,
  Plus,
  Radar,
  Save,
  Search,
  ShieldCheck,
  Trophy,
  Upload,
  WifiOff,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart as ReLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MetricCard } from './components/MetricCard';
import { RobotScene } from './components/RobotScene';
import { SectionHeader } from './components/SectionHeader';
import { SyncPill } from './components/StatusPill';
import { currentEvent, matches, notes, robotProjects, sampleCode, teams } from './data/mockData';
import { pathService, robotService } from './services/api';
import type { LucideIcon } from 'lucide-react';
import type { Team } from './types';

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-electric px-4 text-sm font-medium text-white shadow-glow">
      {children}
    </button>
  );
}

function SecondaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white/5 px-4 text-sm text-slate-200 hover:border-electric/50">
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
            ['Team Pro', '$12/mo', 'Unlimited notes, alliance builder, simulation runs, exports, advanced metrics.'],
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
  return (
    <>
      <SectionHeader eyebrow="Workspace 8059A" title="Competition dashboard">
        <PrimaryButton>
          <Plus size={18} /> Scout match
        </PrimaryButton>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="data-grid">
            <MetricCard label="Current event" value={currentEvent.name} detail={`${currentEvent.teamCount} teams in ${currentEvent.division}`} icon={Trophy} tone="orange" />
            <MetricCard label="Next match" value="Q24 in 12m" detail="8059A + 24K vs 315R + 1010X" icon={Activity} tone="cyan" />
            <MetricCard label="Team rank" value="#6" detail="Trend up 3 places since lunch" icon={LineChart} tone="green" />
            <MetricCard label="Robot status" value="High calibration" detail="Drive and turn physical tests entered" icon={Gauge} tone="blue" />
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
        </div>
        <aside className="panel p-5">
          <h2 className="font-semibold text-white">Insight rail</h2>
          <div className="mt-4 space-y-3">
            {[
              ['Teams to watch', '315R has the strongest programming skills but scout notes flag intake reliability.'],
              ['Unsynced notes', '3 notes are saved locally and will retry when the network recovers.'],
              ['Simulation warning', 'Skills Bot needs a 24 in drive test before routes can be marked Verified.'],
            ].map(([title, detail]) => (
              <div className="rounded-lg border border-line bg-ink/45 p-4" key={title}>
                <p className="text-sm font-medium text-slate-200">{title}</p>
                <p className="mt-2 text-sm leading-5 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

export function ScoutWorkspace() {
  const { data } = useQuery({ queryKey: ['notes'], queryFn: () => Promise.resolve({ ok: true as const, data: notes }) });
  return (
    <>
      <SectionHeader eyebrow="Offline-first" title="Scouting workspace">
        <SecondaryButton>
          <WifiOff size={18} /> Offline queue
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="panel p-5">
          <h2 className="font-semibold">Quick match form</h2>
          <div className="mt-4 grid gap-3">
            <select className="h-11 rounded-lg border border-line bg-ink px-3 text-sm">
              <option>Q24 - Team 8059A</option>
            </select>
            {['Auton success', 'Defense', 'Disabled', 'Great teamwork'].map((label) => (
              <label key={label} className="flex items-center justify-between rounded-lg border border-line bg-white/5 px-3 py-3 text-sm">
                {label}
                <input type="checkbox" className="h-5 w-5 accent-cyan-400" />
              </label>
            ))}
            <textarea className="min-h-28 rounded-lg border border-line bg-ink p-3 text-sm outline-none" placeholder="One-tap note templates or match details" />
            <PrimaryButton>
              <Save size={18} /> Save locally
            </PrimaryButton>
          </div>
        </section>
        <section className="grid gap-3">
          {(data?.data ?? []).map((note) => (
            <article className="panel p-4" key={note.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{note.team} · {note.match}</p>
                  <p className="text-sm text-slate-400">{note.type} scouting · updated {note.updatedAt}</p>
                </div>
                <SyncPill state={note.syncState} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span className="rounded-full border border-line bg-white/5 px-2 py-1 text-xs text-slate-300" key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

export function EventCenter() {
  return (
    <>
      <SectionHeader eyebrow={currentEvent.status} title={currentEvent.name}>
        <SecondaryButton>
          <Database size={18} /> Refresh cached data
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 className="font-semibold">Live match center</h2>
          </div>
          <div className="divide-y divide-line">
            {matches.map((match) => (
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
            ))}
          </div>
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">Event tabs</h2>
          <div className="mt-4 grid gap-2">
            {['Overview', 'Schedule', 'Rankings', 'Skills', 'Scout', 'Predictions', 'Alliance'].map((tab) => (
              <button className="rounded-lg border border-line bg-white/5 px-3 py-3 text-left text-sm text-slate-300" key={tab}>{tab}</button>
            ))}
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
  const team = teams[0];
  const chart = [
    { event: 'Week 1', score: 68 },
    { event: 'Week 2', score: 74 },
    { event: 'Week 3', score: 82 },
    { event: 'Now', score: team.avgScore },
  ];
  return (
    <>
      <SectionHeader eyebrow={team.confidence} title={`${team.number} · ${team.name}`}>
        <PrimaryButton>
          <Plus size={18} /> Add note
        </PrimaryButton>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="panel p-5">
          <p className="text-slate-400">{team.organization} · {team.region}</p>
          <div className="mt-5 data-grid">
            <MetricCard label="Win rate" value={`${Math.round(team.winRate * 100)}%`} detail="Recent official and scouting blend" icon={Trophy} />
            <MetricCard label="Avg score" value={`${team.avgScore}`} detail="Estimated contribution model v1" icon={Gauge} tone="green" />
            <MetricCard label="Auton signal" value={`${team.autonSignal}`} detail="Programming skills plus notes" icon={BrainCircuit} tone="orange" />
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
            and scout-confirmed autonomous reliability. Sources: match history, pit note, event ranking trend.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {team.tags.map((tag) => <span className="rounded-full border border-line px-2 py-1 text-xs" key={tag}>{tag}</span>)}
          </div>
        </aside>
      </div>
    </>
  );
}

export function CompareTeams() {
  return (
    <>
      <SectionHeader eyebrow="Explainable metrics" title="Team compare">
        <SecondaryButton>
          <Search size={18} /> Add team
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className="panel overflow-x-auto p-4">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Team</th>
                {['Avg score', 'Win rate', 'Consistency', 'Auton', 'Skills', 'Risk', 'Fit'].map((head) => (
                  <th className="p-3" key={head}>{head} <Info className="inline text-slate-500" size={13} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
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
          </table>
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">Why this matters</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The fit score rewards scoring power, consistency, autonomous strength, skills, and scout trust, then subtracts risk.
            Low-data teams are never hidden; they show confidence warnings.
          </p>
        </aside>
      </div>
    </>
  );
}

export function AllianceBuilder() {
  const ranked = useMemo(() => [...teams].sort((a, b) => score(b) - score(a)), []);
  return (
    <>
      <SectionHeader eyebrow="Partner optimizer" title="Alliance builder">
        <PrimaryButton>
          <Trophy size={18} /> Selection mode
        </PrimaryButton>
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-3">
          {ranked.map((team, index) => (
            <article className="panel p-4" key={team.number}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">#{index + 1} {team.number} · {team.name}</p>
                  <p className="text-sm text-slate-400">Recommended because: {team.tags.slice(0, 2).join(', ')}</p>
                </div>
                <p className="text-2xl font-semibold text-electric">{score(team)}</p>
              </div>
            </article>
          ))}
        </section>
        <aside className="panel p-5">
          <h2 className="font-semibold">Pick list tiers</h2>
          {['A', 'B', 'C', 'D'].map((tier) => (
            <div className="mt-3 rounded-lg border border-line bg-ink/45 p-3" key={tier}>
              <p className="text-sm font-medium">Tier {tier}</p>
              <p className="text-xs text-slate-500">Drag teams here during alliance selection.</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

export function RobotWorkspace({ simMode = false }: { simMode?: boolean }) {
  const { data } = useQuery({ queryKey: ['robots'], queryFn: robotService.listProjects });
  const robots = data?.ok ? data.data : robotProjects;
  return (
    <>
      <SectionHeader eyebrow="Robot projects" title={simMode ? 'Simulator' : 'Robot workspace'}>
        <SecondaryButton>
          <Upload size={18} /> Upload code
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="space-y-3">
          {robots.map((robot) => (
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
          ))}
        </section>
        <section className="space-y-4">
          <RobotScene />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel p-4">
              <h2 className="font-semibold">Code mapping</h2>
              <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300">{sampleCode}</pre>
            </div>
            <div className="panel p-4">
              <h2 className="font-semibold">Simulation timeline</h2>
              <div className="mt-4 space-y-3">
                {['driveFor 24 in', 'turnFor 38 deg', 'driveFor 18 in', 'armMotor 220 deg'].map((cmd, index) => (
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

export function PathPlanner() {
  const [accepted, setAccepted] = useState(false);
  const [patch, setPatch] = useState('');
  async function optimize() {
    const response = await pathService.optimizePath([]);
    if (response.ok) setPatch(response.data.patch.newText);
  }
  return (
    <>
      <SectionHeader eyebrow="Autonomous" title="Field path planner">
        <PrimaryButton>
          <Compass size={18} /> Draw path
        </PrimaryButton>
      </SectionHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="panel p-4">
          <div className="field-grid relative h-[520px] overflow-hidden rounded-lg border border-line bg-[#07101f]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 700 520">
              <path d="M80 420 C 170 310, 260 290, 350 240 S 510 160, 610 90" fill="none" stroke="#22D3EE" strokeWidth="7" strokeLinecap="round" />
              <circle cx="80" cy="420" r="12" fill="#3B82F6" />
              <circle cx="610" cy="90" r="12" fill="#FF7A18" />
            </svg>
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button onClick={optimize} className="h-11 rounded-lg bg-primary px-4 text-sm font-medium">Optimize</button>
              <button className="h-11 rounded-lg border border-line bg-ink/80 px-4 text-sm">Undo</button>
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
  return (
    <>
      <SectionHeader eyebrow="Rules-first assistant" title="VEX troubleshooting">
        <SecondaryButton>
          <Upload size={18} /> Attach code
        </SecondaryButton>
      </SectionHeader>
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="panel p-5">
          <textarea className="min-h-48 w-full rounded-lg border border-line bg-ink p-3 text-sm outline-none" placeholder="Describe the symptom: one side reversed, lift stalls, compile error..." />
          <PrimaryButton>
            <BrainCircuit size={18} /> Analyze
          </PrimaryButton>
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Likely causes</h2>
          {[
            ['Motor reversed or duplicate port', 'Check drivetrain port mapping and reversed toggles before changing code.'],
            ['Inertial not calibrated', 'Wait for calibration before autonomous turns or use a timeout fallback.'],
            ['Mechanical binding', 'Lift stall with high current often means friction or a loose set screw.'],
          ].map(([title, detail]) => (
            <div className="mt-3 rounded-lg border border-line bg-white/5 p-4" key={title}>
              <p className="font-medium">{title}</p>
              <p className="mt-2 text-sm leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <SectionHeader eyebrow="Security" title="Settings and API keys" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-semibold">Environment variables</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Add keys to the local `.env` file. Only `VITE_` variables can reach the browser; RobotEvents, Google client
            secret, service role, database, and AI keys must stay server-side.
          </p>
          <div className="mt-4 grid gap-2 text-sm">
            {['ROBOTEVENTS_API_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].map((key) => (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-ink p-3" key={key}>
                <Lock size={15} className="text-electric" />
                {key}
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Workspace roles</h2>
          {['Owner', 'Captain', 'Scout', 'Viewer'].map((role) => (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-white/5 p-3 text-sm" key={role}>
              {role}
              <ShieldCheck className="text-good" size={16} />
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
