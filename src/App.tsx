import { Gauge, Globe2, Search, Settings, Star } from 'lucide-react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
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

const tabs = [
  { to: '/app', label: 'Favorites', icon: Star },
  { to: '/app/scout', label: 'World Skills', icon: Globe2 },
  { to: '/app/compare', label: 'TrueSkill', icon: Gauge },
  { to: '/app/alliance', label: 'Lookup', icon: Search },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function titleFor(pathname: string) {
  if (pathname.includes('/scout')) return 'World Skills';
  if (pathname.includes('/compare')) return 'TrueSkill';
  if (pathname.includes('/alliance')) return 'Lookup';
  if (pathname.includes('/robots')) return 'Robots';
  if (pathname.includes('/path')) return 'Path Planner';
  if (pathname.includes('/debug')) return 'Troubleshooting';
  if (pathname.includes('/settings')) return 'Settings';
  if (pathname.includes('/events')) return 'Event';
  if (pathname.includes('/teams')) return 'Team Info';
  return 'Favorites';
}

function AppShell() {
  const location = useLocation();
  return (
    <div className="roboscout-shell">
      <header className="ios-topbar">
        <Link to="/app" className="brand-chip" aria-label="RoboLab home">
          <img src="/roboscouticon.png" alt="" />
        </Link>
        <div className="ios-title">
          <h1>{titleFor(location.pathname)}</h1>
          {location.pathname.includes('/compare') ? <p>Powered by RoboLab analysis</p> : null}
        </div>
        <Link className="topbar-action" to="/app/settings" aria-label="Settings">
          <Settings size={20} />
        </Link>
      </header>

      <main className="ios-content">
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
      </main>

      <nav className="ios-tabbar">
        {tabs.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <item.icon size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
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
