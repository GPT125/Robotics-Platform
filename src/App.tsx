import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  BrainCircuit,
  Compass,
  Home,
  LineChart,
  Menu,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  WifiOff,
} from 'lucide-react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  AllianceBuilder,
  CompareTeams,
  Dashboard,
  DebugAssistant,
  EventCenter,
  Landing,
  PathPlanner,
  Pricing,
  RobotWorkspace,
  ScoutWorkspace,
  SettingsPage,
  TeamProfile,
} from './pages';
import { CommandMenu } from './components/CommandMenu';
import { useUiStore } from './stores/uiStore';

const navItems = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/scout', label: 'Scout', icon: Radar },
  { to: '/app/compare', label: 'Compare', icon: LineChart },
  { to: '/app/alliance', label: 'Alliance', icon: Trophy },
  { to: '/app/robots', label: 'Robots', icon: Bot },
  { to: '/app/path', label: 'Planner', icon: Compass },
  { to: '/app/debug', label: 'Debug', icon: BrainCircuit },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { commandOpen, setCommandOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_26%),radial-gradient(circle_at_80%_0%,rgba(255,122,24,0.16),transparent_22%),linear-gradient(135deg,#070B14,#101827_62%,#0A1324)]" />
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-line/80 bg-panel/70 p-4 backdrop-blur-xl lg:block">
        <Link className="mb-8 flex items-center gap-3 px-2" to="/">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-electric/40 bg-electric/10 text-electric">
            <Bot size={24} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-normal">RoboLab</p>
            <p className="text-xs text-slate-400">VEX command center</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  isActive
                    ? 'bg-primary/20 text-white ring-1 ring-primary/40'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-line bg-ink/50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <ShieldCheck className="text-good" size={18} />
            Secrets stay server-side
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            RobotEvents and OAuth keys are read from backend environment variables.
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line/70 bg-ink/76 backdrop-blur-xl lg:ml-72">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white/5 text-slate-200 lg:hidden"
            onClick={() => setCommandOpen(true)}
            aria-label="Open command menu"
          >
            <Menu size={20} />
          </button>
          <button
            className="flex h-11 flex-1 items-center gap-3 rounded-lg border border-line bg-panel/70 px-4 text-left text-sm text-slate-400 transition hover:border-electric/50 hover:text-slate-200"
            onClick={() => setCommandOpen(true)}
          >
            <Search size={18} />
            Search team, event, robot project, note, or code file
            <span className="ml-auto hidden rounded border border-line px-2 py-1 text-xs text-slate-500 sm:inline">⌘K</span>
          </button>
          <button className="hidden h-11 items-center gap-2 rounded-lg border border-vex/40 bg-vex/10 px-4 text-sm text-vex sm:flex">
            <WifiOff size={17} />
            3 local notes
          </button>
        </div>
      </header>

      <main className="pb-24 lg:ml-72 lg:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="px-4 py-6 sm:px-6 lg:px-8"
          >
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="scout" element={<ScoutWorkspace />} />
              <Route path="events/:id" element={<EventCenter />} />
              <Route path="teams/:number" element={<TeamProfile />} />
              <Route path="compare" element={<CompareTeams />} />
              <Route path="alliance" element={<AllianceBuilder />} />
              <Route path="robots" element={<RobotWorkspace />} />
              <Route path="robots/:id/sim" element={<RobotWorkspace simMode />} />
              <Route path="path" element={<PathPlanner />} />
              <Route path="debug" element={<DebugAssistant />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-line bg-panel/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] ${
              location.pathname === item.to ? 'text-electric' : 'text-slate-400'
            }`}
          >
            <item.icon size={19} />
            {item.label === 'Compare' ? 'More' : item.label}
          </button>
        ))}
      </nav>
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

function PublicShell() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="features" element={<Landing focus="features" />} />
      <Route path="pricing" element={<Pricing />} />
      <Route path="docs" element={<Landing focus="docs" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/app/*" element={<AppShell />} />
      <Route path="/*" element={<PublicShell />} />
    </Routes>
  );
}
