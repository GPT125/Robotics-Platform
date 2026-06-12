import { useMemo, useState } from "react";
import { ArrowLeft, BrainCircuit, Swords, X } from "lucide-react";
import { useAccent } from "../AccentContext";
import { TeamSearch } from "../TeamSearch";
import { matchAlliances, matchLabel, teamMatches, type RoboMatch, type RoboTeamResult } from "../../../services/api";
import type { RoboTeam } from "../AppContext";

function scoreForTeam(match: RoboMatch, number: string) {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  if (Number.isNaN(redScore) || Number.isNaN(blueScore)) return null;
  const redSide = redTeams.some((team) => team.number === number);
  const blueSide = blueTeams.some((team) => team.number === number);
  if (!redSide && !blueSide) return null;
  const ours = redSide ? redScore : blueScore;
  const theirs = redSide ? blueScore : redScore;
  return { ours, theirs, won: ours > theirs, match };
}

async function loadStats(team: RoboTeamResult) {
  const matches = await teamMatches(team.id);
  const scored = matches.map((match) => scoreForTeam(match, team.number)).filter((row): row is NonNullable<ReturnType<typeof scoreForTeam>> => Boolean(row));
  const wins = scored.filter((row) => row.won).length;
  const avg = scored.length ? Math.round(scored.reduce((sum, row) => sum + row.ours, 0) / scored.length) : 0;
  const high = scored.length ? Math.max(...scored.map((row) => row.ours)) : 0;
  const recent = scored.slice(0, 5);
  const recentWins = recent.filter((row) => row.won).length;
  const score = Math.round((scored.length ? wins / scored.length : 0.45) * 45 + avg * 0.35 + high * 0.1 + recentWins * 4);
  return { team, matches, scored, wins, losses: scored.length - wins, avg, high, recent: `${recentWins}-${recent.length - recentWins}`, score };
}

type Loaded = Awaited<ReturnType<typeof loadStats>>;

export function MatchupLabPage({ onBack }: { onBack: () => void }) {
  const { accent } = useAccent();
  const [mode, setMode] = useState<"1v1" | "2v2">("1v1");
  const [red, setRed] = useState<RoboTeam[]>([]);
  const [blue, setBlue] = useState<RoboTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, Loaded>>({});

  async function addTeam(side: "red" | "blue", team: RoboTeam) {
    const limit = mode === "1v1" ? 1 : 2;
    const setter = side === "red" ? setRed : setBlue;
    setter((prev) => [team, ...prev.filter((row) => row.number !== team.number)].slice(0, limit));
    if (!stats[team.number]) {
      setLoading(true);
      const loaded = await loadStats(team);
      setStats((prev) => ({ ...prev, [team.number]: loaded }));
      setLoading(false);
    }
  }

  // A real 2v2 needs two teams on EACH side; 1v1 needs one. The prediction only
  // appears once both alliances are actually full and their stats have loaded —
  // so a "2v2" never resolves with a lone robot facing a full alliance.
  const needed = mode === "2v2" ? 2 : 1;

  const prediction = useMemo(() => {
    const redRows = red.map((team) => stats[team.number]).filter(Boolean);
    const blueRows = blue.map((team) => stats[team.number]).filter(Boolean);
    if (redRows.length < needed || blueRows.length < needed) return null;
    const redScore = redRows.reduce((sum, row) => sum + row.score, 0) / redRows.length;
    const blueScore = blueRows.reduce((sum, row) => sum + row.score, 0) / blueRows.length;
    const total = Math.max(1, redScore + blueScore);
    const redProb = Math.max(18, Math.min(82, Math.round((redScore / total) * 100)));
    const blueProb = 100 - redProb;
    const margin = Math.round(Math.abs(redRows.reduce((sum, row) => sum + row.avg, 0) - blueRows.reduce((sum, row) => sum + row.avg, 0)) || Math.abs(redScore - blueScore) / 3);
    return { redProb, blueProb, winner: redProb >= blueProb ? "Red" : "Blue", margin };
  }, [blue, red, stats, needed]);

  function TeamPill({ team, side }: { team: RoboTeam; side: "red" | "blue" }) {
    const row = stats[team.number];
    return (
      <div style={{ background: side === "red" ? "#ff3b5c12" : "#00c8ff12", border: `1px solid ${side === "red" ? "#ff3b5c30" : "#00c8ff30"}`, borderRadius: 13, padding: "10px 11px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 15, color: "#e8eaf0" }}>{team.number}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9aa0bf", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.team_name || team.organization}</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginTop: 4 }}>{row ? `${row.wins}-${row.losses} · avg ${row.avg} · high ${row.high}` : "Loading official matches..."}</p>
        </div>
        <button onClick={() => side === "red" ? setRed((prev) => prev.filter((item) => item.number !== team.number)) : setBlue((prev) => prev.filter((item) => item.number !== team.number))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={13} style={{ color: "#cfd3e6" }} /></button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "var(--rl-page-bottom)", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ padding: "var(--rl-page-top) 16px 12px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "rgba(8,9,15,0.92)", backdropFilter: "blur(12px)", zIndex: 4 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 11, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={18} style={{ color: "#e8eaf0" }} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", margin: 0 }}>Matchup Lab</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", margin: 0 }}>1v1 and 2v2 RobotEvents prediction workspace</p>
        </div>
        <Swords size={20} style={{ color: accent }} />
      </div>
      <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#1a1e30", borderRadius: 12, padding: 3 }}>
          {(["1v1", "2v2"] as const).map((item) => <button key={item} onClick={() => { setMode(item); setRed((p) => p.slice(0, item === "1v1" ? 1 : 2)); setBlue((p) => p.slice(0, item === "1v1" ? 1 : 2)); }} style={{ padding: "9px", borderRadius: 9, border: "none", background: mode === item ? accent : "transparent", color: mode === item ? "#08090f" : "#8a90aa", fontFamily: "'Exo 2', sans-serif", fontWeight: 900, cursor: "pointer" }}>{item}</button>)}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "#111320", border: "1px solid #ff3b5c25", borderRadius: 16, padding: 14 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 14, color: "#ff6b7a", marginBottom: 10 }}>Red alliance</p>
            <TeamSearch onSelect={(team) => void addTeam("red", team)} showFilters={false} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>{red.map((team) => <TeamPill key={team.number} team={team} side="red" />)}</div>
          </div>
          <div style={{ background: "#111320", border: "1px solid #00c8ff25", borderRadius: 16, padding: 14 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 14, color: "#60d0ff", marginBottom: 10 }}>Blue alliance</p>
            <TeamSearch onSelect={(team) => void addTeam("blue", team)} showFilters={false} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>{blue.map((team) => <TeamPill key={team.number} team={team} side="blue" />)}</div>
          </div>
        </div>
        {prediction ? (
          <div style={{ background: "linear-gradient(135deg,#111320,#12142a)", border: `1px solid ${accent}30`, borderRadius: 16, padding: 15 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <BrainCircuit size={16} style={{ color: accent }} />
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 15, color: "#e8eaf0" }}>{prediction.winner} projected by {prediction.margin || "a close"} points</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 12, color: "#ff6b7a" }}>RED {prediction.redProb}%</span>
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 12, color: "#60d0ff" }}>{prediction.blueProb}% BLUE</span>
            </div>
            <div style={{ position: "relative", height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                <div style={{ width: `${prediction.redProb}%`, background: "linear-gradient(90deg,#ff3b5c,#ff3b5c90)", transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                <div style={{ flex: 1, background: "linear-gradient(90deg,#00a3ff90,#00c8ff)", transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${prediction.redProb}%`, width: 2, background: "#0c0e18", transform: "translateX(-1px)" }} />
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#b0b4c8", lineHeight: 1.55, marginTop: 8 }}>Prediction uses official recent scored matches, average score, high score, and recent form. If a team has limited posted matches, confidence should be treated as low.</p>
          </div>
        ) : (
          <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 12 }}>{loading ? "Loading team stats..." : mode === "2v2" ? `Add ${needed} teams to each alliance for a 2v2 matchup — Red has ${red.length}/${needed}, Blue has ${blue.length}/${needed}.` : "Pick a team on each side to generate a 1v1 matchup prediction."}</div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
