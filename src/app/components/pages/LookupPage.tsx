import { useState } from "react";
import { Search, Star, Trophy, MapPin, Globe, TrendingUp, ChevronRight, ArrowLeft, Users, Zap, Shield, Award, CheckCircle, X } from "lucide-react";
import { useAccent } from "../AccentContext";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

// ─── Mock data ────────────────────────────────────────────────────────────────

const TEAMS = [
  {
    id: "7842A",
    name: "Iron Circuit",
    robot: "Titan MK4",
    org: "Austin STEM Academy",
    location: "Austin, TX",
    trueSkill: 1842,
    worldSkillsRank: 34,
    worldSkillsScore: 312,
    opr: 201.4,
    dpr: 78.2,
    ccwm: 123.2,
    wins: 34, losses: 8,
    qualifications: ["States Qualified", "Worlds Qualified"],
    awards: [
      { name: "Tournament Champion", event: "Spring Invitational" },
      { name: "Excellence Award", event: "District Championship" },
      { name: "Skills Champion", event: "City Open" },
    ],
    events: ["Spring Invitational", "District Championship", "City Open"],
    starred: true,
    radar: [
      { axis: "Auto", val: 95 }, { axis: "Driver", val: 88 }, { axis: "Endgame", val: 90 },
      { axis: "Defense", val: 60 }, { axis: "Consist.", val: 85 },
    ],
  },
  {
    id: "3141S",
    name: "Circuit Breakers",
    robot: "Sigma",
    org: "Dallas Robotics HS",
    location: "Dallas, TX",
    trueSkill: 1654,
    worldSkillsRank: 89,
    worldSkillsScore: 274,
    opr: 183.1,
    dpr: 95.0,
    ccwm: 88.1,
    wins: 27, losses: 11,
    qualifications: ["States Qualified"],
    awards: [
      { name: "Design Award", event: "Spring Invitational" },
    ],
    events: ["Spring Invitational", "City Open"],
    starred: false,
    radar: [
      { axis: "Auto", val: 60 }, { axis: "Driver", val: 72 }, { axis: "Endgame", val: 65 },
      { axis: "Defense", val: 95 }, { axis: "Consist.", val: 80 },
    ],
  },
  {
    id: "1234B",
    name: "BotForge Beta",
    robot: "Apex",
    org: "Houston Prep",
    location: "Houston, TX",
    trueSkill: 1721,
    worldSkillsRank: 58,
    worldSkillsScore: 296,
    opr: 194.0,
    dpr: 82.0,
    ccwm: 112.0,
    wins: 30, losses: 9,
    qualifications: ["States Qualified", "Worlds Qualified"],
    awards: [
      { name: "Innovate Award", event: "City Open" },
    ],
    events: ["Spring Invitational", "District Championship", "City Open"],
    starred: false,
    radar: [
      { axis: "Auto", val: 70 }, { axis: "Driver", val: 97 }, { axis: "Endgame", val: 88 },
      { axis: "Defense", val: 50 }, { axis: "Consist.", val: 75 },
    ],
  },
  {
    id: "9090Z",
    name: "Zero Gravity",
    robot: "Nebula",
    org: "San Antonio Tech",
    location: "San Antonio, TX",
    trueSkill: 1599,
    worldSkillsRank: 112,
    worldSkillsScore: 251,
    opr: 165.0,
    dpr: 103.0,
    ccwm: 62.0,
    wins: 22, losses: 15,
    qualifications: [],
    awards: [],
    events: ["Spring Invitational", "Winter Classic"],
    starred: true,
    radar: [
      { axis: "Auto", val: 98 }, { axis: "Driver", val: 55 }, { axis: "Endgame", val: 50 },
      { axis: "Defense", val: 40 }, { axis: "Consist.", val: 70 },
    ],
  },
  {
    id: "4455C",
    name: "Cyber Hawks",
    robot: "Condor",
    org: "El Paso Academy",
    location: "El Paso, TX",
    trueSkill: 1480,
    worldSkillsRank: 203,
    worldSkillsScore: 218,
    opr: 148.5,
    dpr: 110.2,
    ccwm: 38.3,
    wins: 18, losses: 19,
    qualifications: [],
    awards: [{ name: "Judges Award", event: "Winter Classic" }],
    events: ["Winter Classic", "City Open"],
    starred: false,
    radar: [
      { axis: "Auto", val: 55 }, { axis: "Driver", val: 68 }, { axis: "Endgame", val: 44 },
      { axis: "Defense", val: 72 }, { axis: "Consist.", val: 60 },
    ],
  },
];

const EVENTS = [
  {
    id: "EVT-001",
    name: "Spring Invitational",
    date: "May 31–Jun 1",
    location: "Austin, TX",
    teams: 32,
    statesQual: true,
    worldsQual: false,
    awards: [
      { name: "Tournament Champion", team: "7842A", teamName: "Iron Circuit" },
      { name: "Excellence Award", team: "3827X", teamName: "Your Team" },
      { name: "Design Award", team: "3141S", teamName: "Circuit Breakers" },
      { name: "Think Award", team: "2277A", teamName: "Logic Gates" },
      { name: "Innovate Award", team: "8812D", teamName: "Delta Force" },
      { name: "Judges Award", team: "5519B", teamName: "Beta Build" },
    ],
    teamsList: [
      { id: "7842A", name: "Iron Circuit", rank: 1 },
      { id: "3827X", name: "Your Team", rank: 2 },
      { id: "3141S", name: "Circuit Breakers", rank: 8 },
      { id: "1234B", name: "BotForge Beta", rank: 5 },
      { id: "9090Z", name: "Zero Gravity", rank: 14 },
      { id: "2277A", name: "Logic Gates", rank: 10 },
      { id: "4455C", name: "Cyber Hawks", rank: 18 },
      { id: "8812D", name: "Delta Force", rank: 12 },
    ],
    matches: [
      { id: "Q-42", red: ["7842A", "3827X"], blue: ["9090Z", "2277A"], redScore: 210, blueScore: 147 },
      { id: "Q-41", red: ["3141S", "8812D"], blue: ["3827X", "1234B"], redScore: 162, blueScore: 188 },
      { id: "Q-38", red: ["3827X", "4455C"], blue: ["7842A", "5519B"], redScore: 154, blueScore: 201 },
      { id: "Q-35", red: ["9090Z", "2277A"], blue: ["3827X", "8812D"], redScore: 143, blueScore: 197 },
      { id: "F-1", red: ["7842A", "3827X"], blue: ["3141S", "1234B"], redScore: 224, blueScore: 181 },
      { id: "F-2", red: ["7842A", "3827X"], blue: ["3141S", "1234B"], redScore: 198, blueScore: 205 },
      { id: "F-3", red: ["7842A", "3827X"], blue: ["3141S", "1234B"], redScore: 216, blueScore: 188 },
    ],
  },
  {
    id: "EVT-002",
    name: "District Championship",
    date: "Apr 12–13",
    location: "Houston, TX",
    teams: 64,
    statesQual: true,
    worldsQual: true,
    awards: [
      { name: "Tournament Champion", team: "1234B", teamName: "BotForge Beta" },
      { name: "Excellence Award", team: "7842A", teamName: "Iron Circuit" },
      { name: "Design Award", team: "3141S", teamName: "Circuit Breakers" },
      { name: "Amaze Award", team: "9901A", teamName: "Titanium" },
    ],
    teamsList: [
      { id: "7842A", name: "Iron Circuit", rank: 3 },
      { id: "1234B", name: "BotForge Beta", rank: 1 },
      { id: "3141S", name: "Circuit Breakers", rank: 9 },
      { id: "9090Z", name: "Zero Gravity", rank: 22 },
      { id: "9901A", name: "Titanium", rank: 7 },
    ],
    matches: [
      { id: "Q-10", red: ["7842A", "9901A"], blue: ["1234B", "3141S"], redScore: 195, blueScore: 212 },
      { id: "Q-22", red: ["1234B", "7842A"], blue: ["9090Z", "4455C"], redScore: 220, blueScore: 148 },
      { id: "F-1", red: ["1234B", "9901A"], blue: ["7842A", "3141S"], redScore: 208, blueScore: 197 },
    ],
  },
  {
    id: "EVT-003",
    name: "City Open",
    date: "Mar 8",
    location: "San Antonio, TX",
    teams: 24,
    statesQual: false,
    worldsQual: false,
    awards: [
      { name: "Tournament Champion", team: "7842A", teamName: "Iron Circuit" },
      { name: "Skills Champion", team: "7842A", teamName: "Iron Circuit" },
      { name: "Innovate Award", team: "1234B", teamName: "BotForge Beta" },
      { name: "Judges Award", team: "4455C", teamName: "Cyber Hawks" },
    ],
    teamsList: [
      { id: "7842A", name: "Iron Circuit", rank: 1 },
      { id: "1234B", name: "BotForge Beta", rank: 4 },
      { id: "3141S", name: "Circuit Breakers", rank: 6 },
      { id: "4455C", name: "Cyber Hawks", rank: 10 },
    ],
    matches: [
      { id: "Q-5", red: ["7842A", "4455C"], blue: ["1234B", "3141S"], redScore: 188, blueScore: 162 },
      { id: "F-1", red: ["7842A", "3141S"], blue: ["1234B", "4455C"], redScore: 201, blueScore: 177 },
    ],
  },
];

// ─── Sub-views ────────────────────────────────────────────────────────────────

function TeamDetail({ team, accent, onBack, onEventClick }: { team: typeof TEAMS[0]; accent: string; onBack: () => void; onEventClick: (name: string) => void }) {
  const [starredLocal, setStarredLocal] = useState(team.starred);
  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: 90 }}>
      {/* Back bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 10px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
        </button>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "16px", color: "#e8eaf0", flex: 1 }}>Team Profile</p>
        <button onClick={() => setStarredLocal(!starredLocal)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
          <Star size={20} style={{ color: starredLocal ? "#f59e0b" : "rgba(255,255,255,0.25)", fill: starredLocal ? "#f59e0b" : "none" }} />
        </button>
      </div>

      {/* Hero */}
      <div style={{ margin: "0 16px 14px", background: "linear-gradient(135deg, #111320, #12142a)", border: `1px solid ${accent}30`, borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${accent}30, #7c3aed30)`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: "16px", color: accent }}>{team.id}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "20px", color: "#e8eaf0", lineHeight: 1.1 }}>{team.name}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#7a80a0", marginTop: 2 }}>Robot: {team.robot}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
              <MapPin size={11} style={{ color: "#7a80a0" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#7a80a0" }}>{team.location}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "OPR", val: team.opr.toFixed(1), color: accent },
            { label: "DPR", val: team.dpr.toFixed(1), color: "#ff3b5c" },
            { label: "CCWM", val: team.ccwm.toFixed(1), color: "#10b981" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "#1a1e30", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color }}>{val}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TrueSkill & Skills */}
      <div style={{ margin: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "TRUESKILL", val: team.trueSkill, color: "#a855f7" },
          { label: "WORLD SKILLS", val: `#${team.worldSkillsRank}`, color: "#f59e0b" },
          { label: "SKILLS SCORE", val: team.worldSkillsScore, color: accent },
          { label: "RECORD", val: `${team.wins}W–${team.losses}L`, color: "#e8eaf0" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color }}>{val}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Radar */}
      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 8 }}>Performance Profile</p>
        <ResponsiveContainer width="100%" height={170}>
          <RadarChart data={team.radar}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: "#7a80a0" }} />
            <Radar dataKey="val" stroke={accent} fill={accent} fillOpacity={0.12} strokeWidth={2} />
            <Tooltip contentStyle={{ background: "#1a1e30", border: "none", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Qualifications */}
      {team.qualifications.length > 0 && (
        <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Qualifications</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {team.qualifications.map((q) => (
              <div key={q} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1e30", borderRadius: 10, padding: "10px 12px" }}>
                <CheckCircle size={15} style={{ color: q.includes("Worlds") ? "#f59e0b" : "#10b981", flexShrink: 0 }} />
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: q.includes("Worlds") ? "#f59e0b" : "#10b981" }}>{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {team.awards.length > 0 && (
        <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Awards</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {team.awards.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < team.awards.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <Trophy size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{a.name}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{a.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Events</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {team.events.map((ev) => (
            <button
              key={ev}
              onClick={() => onEventClick(ev)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }}>{ev}</span>
              <ChevronRight size={14} style={{ color: accent }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventDetail({ event, accent, onBack, onTeamClick }: { event: typeof EVENTS[0]; accent: string; onBack: () => void; onTeamClick: (id: string) => void }) {
  const [evTab, setEvTab] = useState<"awards" | "teams" | "matches">("awards");
  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: 90 }}>
      {/* Back bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 10px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
        </button>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "15px", color: "#e8eaf0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.name}</p>
      </div>

      {/* Hero card */}
      <div style={{ margin: "0 16px 14px", background: "linear-gradient(135deg, #111320, #12142a)", border: `1px solid ${accent}30`, borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <MapPin size={14} style={{ color: "#7a80a0" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0" }}>{event.location} · {event.date}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 7px", marginLeft: "auto" }}>{event.teams} teams</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {event.statesQual && (
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, color: "#10b981", background: "#10b98115", border: "1px solid #10b98130", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircle size={11} /> States Qualified
            </span>
          )}
          {event.worldsQual && (
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, color: "#f59e0b", background: "#f59e0b15", border: "1px solid #f59e0b30", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
              <Globe size={11} /> Worlds Qualified
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ margin: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#1a1e30", borderRadius: 12, padding: 3 }}>
        {(["awards", "teams", "matches"] as const).map((t) => (
          <button key={t} onClick={() => setEvTab(t)} style={{ padding: "8px 4px", borderRadius: 9, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, textTransform: "capitalize", background: evTab === t ? accent : "transparent", color: evTab === t ? "#08090f" : "#7a80a0", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {t === "awards" ? "🏆 Awards" : t === "teams" ? "👥 Teams" : "⚔️ Matches"}
          </button>
        ))}
      </div>

      {evTab === "awards" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {event.awards.map((a, i) => (
            <div key={i} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #f59e0b30, #ff8c0020)", border: "1px solid #f59e0b30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trophy size={18} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{a.name}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent, marginTop: 1 }}>{a.team} · {a.teamName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {evTab === "teams" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {event.teamsList.map((t) => (
            <button key={t.id} onClick={() => onTeamClick(t.id)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, width: "100%", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: accent }}>#{t.rank}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11, color: accent }}>{t.id}</span>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{t.name}</p>
              </div>
              <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
            </button>
          ))}
        </div>
      )}

      {evTab === "matches" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {event.matches.map((m) => {
            const redWon = m.redScore > m.blueScore;
            return (
              <div key={m.id} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#7a80a0", fontWeight: 600 }}>{m.id}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", padding: "12px 14px", gap: 8, alignItems: "center" }}>
                  {/* Red */}
                  <div style={{ background: "#ff3b5c12", border: "1px solid #ff3b5c25", borderRadius: 10, padding: "8px 10px" }}>
                    {m.red.map((t) => <p key={t} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: redWon ? "#ff6b7a" : "#7a80a0", fontWeight: 600 }}>{t}</p>)}
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color: redWon ? "#ff3b5c" : "#7a80a0", marginTop: 4 }}>{m.redScore}</p>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>VS</span>
                  {/* Blue */}
                  <div style={{ background: "#00c8ff12", border: "1px solid #00c8ff25", borderRadius: 10, padding: "8px 10px", textAlign: "right" }}>
                    {m.blue.map((t) => <p key={t} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: !redWon ? "#60d0ff" : "#7a80a0", fontWeight: 600 }}>{t}</p>)}
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color: !redWon ? "#00c8ff" : "#7a80a0", marginTop: 4 }}>{m.blueScore}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function LookupPage() {
  const { accent } = useAccent();
  const [tab, setTab] = useState<"teams" | "events">("teams");
  const [query, setQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<typeof TEAMS[0] | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<typeof EVENTS[0] | null>(null);

  const handleEventClick = (evName: string) => {
    const ev = EVENTS.find((e) => e.name === evName);
    if (ev) { setSelectedTeam(null); setSelectedEvent(ev); }
  };

  const handleTeamClick = (teamId: string) => {
    const t = TEAMS.find((x) => x.id === teamId);
    if (t) { setSelectedEvent(null); setSelectedTeam(t); }
  };

  if (selectedTeam) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TeamDetail
          team={selectedTeam}
          accent={accent}
          onBack={() => setSelectedTeam(null)}
          onEventClick={handleEventClick}
        />
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <EventDetail
          event={selectedEvent}
          accent={accent}
          onBack={() => setSelectedEvent(null)}
          onTeamClick={handleTeamClick}
        />
      </div>
    );
  }

  const filteredTeams = TEAMS.filter(
    (t) =>
      t.id.toLowerCase().includes(query.toLowerCase()) ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.location.toLowerCase().includes(query.toLowerCase())
  );
  const filteredEvents = EVENTS.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>SEARCH DATABASE</p>
        <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2, marginBottom: 14 }}>Lookup</h2>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 14, padding: "10px 14px" }}>
          <Search size={16} style={{ color: "#7a80a0", flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "teams" ? "Search team ID, name, or location…" : "Search event name or location…"}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
              <X size={14} style={{ color: "#7a80a0" }} />
            </button>
          )}
        </div>

        {/* Tab toggle */}
        <div style={{ display: "flex", background: "#1a1e30", borderRadius: 12, padding: 3, marginTop: 10 }}>
          {(["teams", "events"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ flex: 1, padding: "9px", borderRadius: 9, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, background: tab === t ? accent : "transparent", color: tab === t ? "#08090f" : "#7a80a0", border: "none", cursor: "pointer", transition: "all 0.15s" }}
            >
              {t === "teams" ? "Teams" : "Events"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        {tab === "teams" &&
          filteredTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11, color: accent }}>{team.id}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0" }}>{team.name}</p>
                    {team.starred && <Star size={12} style={{ color: "#f59e0b", fill: "#f59e0b" }} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MapPin size={10} style={{ color: "#7a80a0" }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0" }}>{team.location}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 17, color: accent }}>{team.trueSkill}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#7a80a0" }}>TRUESKILL</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Zap size={11} style={{ color: accent }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>OPR {team.opr.toFixed(0)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <TrendingUp size={11} style={{ color: "#10b981" }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{team.wins}W–{team.losses}L</span>
                </div>
                {team.qualifications.length > 0 && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {team.qualifications.map((q) => (
                      <span key={q} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: q.includes("Worlds") ? "#f59e0b" : "#10b981", background: q.includes("Worlds") ? "#f59e0b15" : "#10b98115", padding: "2px 6px", borderRadius: 5 }}>
                        {q.includes("Worlds") ? "Worlds" : "States"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}

        {tab === "events" &&
          filteredEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ff8c0015", border: "1px solid #ff8c0030", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Trophy size={20} style={{ color: "#ff8c00" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0" }}>{ev.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MapPin size={10} style={{ color: "#7a80a0" }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0" }}>{ev.location} · {ev.date}</span>
                  </div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "4px 8px" }}>{ev.teams} teams</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {ev.statesQual && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#10b981", background: "#10b98115", borderRadius: 6, padding: "3px 7px" }}>States Qual</span>}
                {ev.worldsQual && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#f59e0b", background: "#f59e0b15", borderRadius: 6, padding: "3px 7px" }}>Worlds Qual</span>}
                <span style={{ marginLeft: "auto" }}>
                  <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
                </span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
