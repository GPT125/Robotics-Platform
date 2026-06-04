import { useEffect, useMemo, useState } from "react";
import { Trophy, Zap, Target, Clock, TrendingUp, ChevronRight, Star, AlertCircle, ListChecks, Plus, WifiOff } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useAccent } from "../AccentContext";
import { useApp } from "../AppContext";
import { teamAwards, teamEvents, teamMatches, matchAlliances, matchLabel, type RoboAward, type RoboEvent, type RoboMatch } from "../../../services/api";

function shortDate(value?: string | null) {
  if (!value) return "TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function city(event: RoboEvent) {
  return [event.location?.city, event.location?.region].filter(Boolean).join(", ") || event.location?.country || "Location TBD";
}

function teamSide(match: RoboMatch, teamNumber: string) {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  if (redTeams.some((t) => t.number === teamNumber)) return { color: "red" as const, alliance: red, partners: redTeams, opponents: blueTeams };
  if (blueTeams.some((t) => t.number === teamNumber)) return { color: "blue" as const, alliance: blue, partners: blueTeams, opponents: redTeams };
  return null;
}

function matchScore(match: RoboMatch, teamNumber: string) {
  const side = teamSide(match, teamNumber);
  const { red, blue } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  if (!side || Number.isNaN(redScore) || Number.isNaN(blueScore)) return null;
  const ours = side.color === "red" ? redScore : blueScore;
  const theirs = side.color === "red" ? blueScore : redScore;
  return { ours, theirs, won: ours > theirs, label: `${ours}-${theirs}`, side };
}

function awardTitle(award: RoboAward) {
  return award.title ?? award.name ?? "Award";
}

export function HomePage({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { accent } = useAccent();
  const { todos, team, profile, notifications, addNotification } = useApp();
  const [matches, setMatches] = useState<RoboMatch[]>([]);
  const [events, setEvents] = useState<RoboEvent[]>([]);
  const [awards, setAwards] = useState<RoboAward[]>([]);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const openTasks = todos.filter((t) => !t.done).length;

  useEffect(() => {
    let alive = true;
    if (!team) {
      setMatches([]);
      setEvents([]);
      setAwards([]);
      return;
    }
    setLoading(true);
    setStale(false);
    Promise.all([teamMatches(team.id), teamEvents(team.id), teamAwards(team.id)])
      .then(([m, e, a]) => {
        if (!alive) return;
        setMatches(m);
        setEvents(e);
        setAwards(a);
      })
      .catch(() => setStale(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [team?.id]);

  useEffect(() => {
    if (!team || !matches.length) return;
    const latest = matches.find((m) => matchScore(m, team.number));
    if (!latest) return;
    const key = `robolab:notified:${team.number}:${latest.id}`;
    if (localStorage.getItem(key)) return;
    const score = matchScore(latest, team.number);
    if (!score) return;
    addNotification({
      type: score.won ? "match_win" : "match_loss",
      title: score.won ? `${team.number} won ${matchLabel(latest)}` : `${team.number} finished ${matchLabel(latest)}`,
      body: score.won ? `Great job. Final score ${score.label}.` : `Final score ${score.label}. Log scout notes while it is fresh.`,
    });
    localStorage.setItem(key, "1");
  }, [addNotification, matches, team]);

  useEffect(() => {
    if (!team || !awards.length) return;
    const latestAward = awards[0];
    const key = `robolab:award-notified:${team.number}:${latestAward.id ?? awardTitle(latestAward)}`;
    if (localStorage.getItem(key)) return;
    addNotification({
      type: "award",
      title: `${team.number} award update`,
      body: `${awardTitle(latestAward)} appears in official RobotEvents awards for this team.`,
    });
    localStorage.setItem(key, "1");
  }, [addNotification, awards, team]);

  const scored = useMemo(() => (team ? matches.map((m) => ({ match: m, score: matchScore(m, team.number) })).filter((m) => m.score) : []), [matches, team]);
  const wins = scored.filter((m) => m.score?.won).length;
  const winRate = scored.length ? `${Math.round((wins / scored.length) * 100)}%` : "—";
  const avgScore = scored.length ? Math.round(scored.reduce((sum, m) => sum + (m.score?.ours ?? 0), 0) / scored.length) : null;
  const sparkData = scored.slice(0, 8).reverse().map((m) => ({ v: m.score?.ours ?? 0 }));
  const recent = scored.slice(0, 4);
  const nextMatch = team ? matches.find((m) => !matchScore(m, team.number) && teamSide(m, team.number)) : null;
  const freshLabel = stale ? "Stale" : loading ? "Updating" : team ? "Fresh" : "Offline";
  const visibleNotification = notifications.find((n) => !n.seen) ?? notifications[0];

  return (
    <div style={{ padding: "20px 16px 110px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#7a80a0", letterSpacing: "0.1em" }}>{team ? `TEAM ${team.number}` : "NO TEAM SELECTED"} · {freshLabel.toUpperCase()}</p>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 28, fontWeight: 900, color: "#e8eaf0", lineHeight: 1.1, marginTop: 2 }}>RoboLab</h1>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${accent} 0%, #7c3aed 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${accent}40`, overflow: "hidden" }}>
          {profile?.avatar?.startsWith("data:") ? <img src={profile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, color: "#fff", fontSize: 15 }}>{profile?.avatar && profile.avatar.length <= 3 ? profile.avatar : team?.number.slice(-2) ?? "RL"}</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "WIN RATE", value: winRate, icon: Trophy, color: "#ff8c00" },
          { label: "MATCHES", value: scored.length ? String(scored.length) : "—", icon: Target, color: accent },
          { label: "AWARDS", value: awards.length ? String(awards.length) : "—", icon: Star, color: "#7c3aed" },
          { label: "AVG SCORE", value: avgScore ? String(avgScore) : "—", icon: Zap, color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
            <Icon size={13} style={{ color, margin: "0 auto 4px" }} />
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 17, color: "#e8eaf0" }}>{loading ? "…" : value}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: "#7a80a0", letterSpacing: "0.05em" }}>{label}</div>
          </div>
        ))}
      </div>

      {!team ? (
        <button onClick={() => onNavigate?.("settings")} style={{ background: "#111320", border: `1px solid ${accent}25`, borderRadius: 16, padding: 16, cursor: "pointer", textAlign: "left" }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0" }}>Select a verified team</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9aa0bf", lineHeight: 1.5, marginTop: 4 }}>RoboLab starts empty. Pick a real RobotEvents team in Settings to load matches, events, awards, and notifications.</p>
        </button>
      ) : null}

      <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>Score Trend</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{sparkData.length ? "Last official scored matches" : "Official match data loads after team selection"}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: stale ? "#ff8c00" : "#10b981" }}>
            {stale ? <WifiOff size={13} /> : <TrendingUp size={13} />}
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12 }}>{freshLabel}</span>
          </div>
        </div>
        {sparkData.length ? (
          <ResponsiveContainer width="100%" height={64}>
            <LineChart data={sparkData}>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor={accent} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: "#1a1e30", border: "none", borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} itemStyle={{ color: accent }} formatter={(v: number) => [v, "Score"]} />
              <Line type="monotone" dataKey="v" stroke="url(#lg)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#5c627e" }}>{loading ? "Loading official results…" : "No scored matches found yet."}</div>
        )}
      </div>

      {nextMatch ? (
        <div style={{ background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Clock size={16} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: accent }}>Next match: {matchLabel(nextMatch)}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9aa0bf", marginTop: 2 }}>{nextMatch.field ? `${nextMatch.field} · ` : ""}{nextMatch.scheduled ? new Date(nextMatch.scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Time TBD"} · Show up 10-15 minutes early.</p>
          </div>
        </div>
      ) : null}

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>Recent Matches</p>
          <button onClick={() => onNavigate?.("lookup")} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent }}>View all</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.length ? recent.map(({ match, score }) => {
            const won = Boolean(score?.won);
            return (
              <div key={match.id} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: (won ? "#10b981" : "#ff3b5c") + "18", border: `1px solid ${(won ? "#10b981" : "#ff3b5c")}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: won ? "#10b981" : "#ff3b5c" }}>{won ? "W" : "L"}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{matchLabel(match)} vs {score?.side.opponents.map((t) => t.number).join(", ") || "TBD"}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{match.event?.name ?? "RobotEvents match"}</p>
                </div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: won ? "#10b981" : "#ff3b5c", flexShrink: 0 }}>{score?.label}</p>
              </div>
            );
          }) : (
            <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 12 }}>{team ? "No official match results found for this team yet." : "Select a team to see official matches."}</div>
          )}
        </div>
      </div>

      <div>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", marginBottom: 10 }}>Team Events</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.slice(0, 3).map((e) => (
            <button key={e.id} onClick={() => onNavigate?.("lookup")} style={{ background: "linear-gradient(135deg, #111320 0%, #12142a 100%)", border: `1px solid ${accent}18`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: `${accent}15`, borderRadius: 10, padding: 8 }}>
                  <Clock size={16} style={{ color: accent }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{e.name}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{shortDate(e.start)} · {city(e)}</p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color: "#7a80a0" }} />
            </button>
          ))}
          {!events.length ? <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 12 }}>{team ? "No official events found yet." : "Select a team to load tournament history."}</div> : null}
        </div>
      </div>

      <div style={{ background: "#ff8c0012", border: "1px solid #ff8c0035", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertCircle size={16} style={{ color: "#ff8c00", flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: "#ff8c00" }}>{visibleNotification?.title ?? "RoboLab is ready"}</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", marginTop: 2 }}>{visibleNotification?.body ?? "Choose your team, then RoboLab will show official match results, awards, and scouting reminders."}</p>
        </div>
      </div>

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
