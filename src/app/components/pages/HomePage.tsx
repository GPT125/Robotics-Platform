import { Trophy, Zap, Target, Clock, TrendingUp, ChevronRight, Star, AlertCircle, ListChecks, Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useAccent } from "../AccentContext";
import { useApp } from "../AppContext";

const sparkData = [
  { v: 142 }, { v: 158 }, { v: 134 }, { v: 171 }, { v: 155 }, { v: 190 }, { v: 178 }, { v: 210 },
];

const recentMatches = [
  { id: "Q-42", result: "W", score: "210–147", opp: "7842A", event: "Spring Invitational", color: "#10b981" },
  { id: "Q-41", result: "W", score: "188–162", opp: "3141S", event: "Spring Invitational", color: "#10b981" },
  { id: "Q-38", result: "L", score: "154–201", opp: "1234B", event: "Spring Invitational", color: "#ff3b5c" },
  { id: "Q-35", result: "W", score: "197–143", opp: "9090Z", event: "Spring Invitational", color: "#10b981" },
];

const upcomingEvents = [
  { name: "State Championship", date: "Jun 14", location: "Austin, TX", badge: "Qual" },
  { name: "Summer Showdown", date: "Jul 2", location: "Dallas, TX", badge: "Open" },
];

export function HomePage({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { accent } = useAccent();
  const { todos } = useApp();
  const openTasks = todos.filter((t) => !t.done).length;

  return (
    <div style={{ padding: "20px 16px 110px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#7a80a0", letterSpacing: "0.1em" }}>TEAM 3827X · 2025–26</p>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 28, fontWeight: 900, color: "#e8eaf0", lineHeight: 1.1, marginTop: 2 }}>RoboLab</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${accent} 0%, #7c3aed 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${accent}40` }}>
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, color: "#fff", fontSize: 15 }}>3X</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "WIN RATE", value: "74%", icon: Trophy, color: "#ff8c00" },
          { label: "MATCHES", value: "38", icon: Target, color: accent },
          { label: "RANK", value: "#12", icon: Star, color: "#7c3aed" },
          { label: "AVG OPR", value: "183", icon: Zap, color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}
          >
            <Icon size={13} style={{ color, margin: "0 auto 4px" }} />
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 17, color: "#e8eaf0" }}>{value}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: "#7a80a0", letterSpacing: "0.05em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Score trend */}
      <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>Score Trend</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>Last 8 matches</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981" }}>
            <TrendingUp size={13} />
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12 }}>+18 pts</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={sparkData}>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor={accent} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ background: "#1a1e30", border: "none", borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
              itemStyle={{ color: accent }}
              formatter={(v: number) => [v, "Score"]}
            />
            <Line type="monotone" dataKey="v" stroke="url(#lg)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent matches */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>Recent Matches</p>
          <button style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent }}>View all</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentMatches.map((m) => (
            <div
              key={m.id}
              style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: m.color + "18", border: `1px solid ${m.color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: m.color }}>{m.result}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>Match {m.id} vs {m.opp}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{m.event}</p>
              </div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: m.color, flexShrink: 0 }}>{m.score}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", marginBottom: 10 }}>Upcoming Events</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcomingEvents.map((e) => (
            <div
              key={e.name}
              style={{ background: "linear-gradient(135deg, #111320 0%, #12142a 100%)", border: `1px solid ${accent}18`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: `${accent}15`, borderRadius: 10, padding: 8 }}>
                  <Clock size={16} style={{ color: accent }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{e.name}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{e.date} · {e.location}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: accent, background: `${accent}12`, padding: "3px 7px", borderRadius: 6, letterSpacing: "0.06em" }}>{e.badge}</span>
                <ChevronRight size={14} style={{ color: "#7a80a0" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert */}
      <div style={{ background: "#ff8c0012", border: "1px solid #ff8c0035", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertCircle size={16} style={{ color: "#ff8c00", flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: "#ff8c00" }}>Autonomous Skills Due</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", marginTop: 2 }}>Submit your autonomous skills score before June 10 to qualify for rankings.</p>
        </div>
      </div>

      {/* Task Center entry (opens a separate page, not in the nav) */}
      <button onClick={() => onNavigate?.("todos")} style={{ background: "#111320", border: `1px solid ${accent}25`, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ListChecks size={20} style={{ color: accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, color: "#e8eaf0" }}>To-Do List</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf" }}>{openTasks ? `${openTasks} open task${openTasks > 1 ? "s" : ""}` : "Build, code, notebook & tournament prep"}</p>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Plus size={17} style={{ color: "#08090f" }} /></div>
      </button>
    </div>
  );
}
