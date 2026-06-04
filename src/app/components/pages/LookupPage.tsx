import { useEffect, useMemo, useState } from "react";
import { Search, Star, Trophy, MapPin, Globe, TrendingUp, ChevronRight, ArrowLeft, Users, Zap, Award, CheckCircle, X, Loader2, BrainCircuit } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp, type RoboTeam } from "../AppContext";
import {
  allianceTeams,
  eventAwards,
  eventMatches,
  eventRankings,
  eventSkills,
  eventTeams,
  matchAlliances,
  matchLabel,
  searchEvents,
  searchTeams,
  sendPredictionFeedback,
  teamAwards,
  teamEvents,
  teamMatches,
  teamNameFromWinner,
  teamNumberFromWinner,
  type RoboAward,
  type RoboEvent,
  type RoboMatch,
  type RoboRanking,
  type RoboSkills,
  type RoboTeamResult,
} from "../../../services/api";

type TeamProfile = {
  team: RoboTeamResult;
  events: RoboEvent[];
  matches: RoboMatch[];
  awards: RoboAward[];
};

type EventProfile = {
  event: RoboEvent;
  teams: RoboTeamResult[];
  matches: RoboMatch[];
  awards: RoboAward[];
  rankings: RoboRanking[];
  skills: RoboSkills[];
};

const AWARD_RULES: Record<string, string> = {
  excellence: "Requires judged Design-level work plus top 40% qualification ranking, Robot Skills ranking, and Autonomous Coding Skills ranking when those data exist.",
  design: "Requires a strong engineering notebook, interview, documented engineering process, and student-centered conduct.",
  innovate: "Requires a documented unique or uncommon design/process element identified in the engineering notebook.",
  think: "Recognizes effective, consistent programming and autonomous design solutions.",
  amaze: "Recognizes a consistently high-performing and competitive robot.",
  build: "Recognizes a robust, well-constructed robot built to survive competition.",
  judges: "Recognizes special effort, perseverance, or achievement that may not fit another award category.",
  sportsmanship: "Requires positive conduct, helpfulness, and sportsmanship around the event.",
  energy: "Recognizes exceptional enthusiasm and excitement at the event.",
};

function loc(team: RoboTeamResult) {
  return [team.location?.city, team.location?.region].filter(Boolean).join(", ") || team.location?.country || "Location TBD";
}

function eventLoc(event: RoboEvent) {
  return [event.location?.city, event.location?.region].filter(Boolean).join(", ") || event.location?.country || "Location TBD";
}

function shortDate(value?: string) {
  if (!value) return "TBD";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "TBD" : d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

function scoreForTeam(match: RoboMatch, teamNumber: string) {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  if (Number.isNaN(redScore) || Number.isNaN(blueScore)) return null;
  const isRed = redTeams.some((t) => t.number === teamNumber);
  const isBlue = blueTeams.some((t) => t.number === teamNumber);
  if (!isRed && !isBlue) return null;
  const ours = isRed ? redScore : blueScore;
  const theirs = isRed ? blueScore : redScore;
  return { ours, theirs, won: ours > theirs };
}

function teamStats(matches: RoboMatch[], teamNumber: string) {
  const scored = matches.map((m) => scoreForTeam(m, teamNumber)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const wins = scored.filter((s) => s.won).length;
  const avg = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.ours, 0) / scored.length) : null;
  const max = scored.length ? Math.max(...scored.map((s) => s.ours)) : null;
  return { scored, wins, winRate: scored.length ? Math.round((wins / scored.length) * 100) : null, avg, max };
}

function rankFor(ranking: RoboRanking) {
  return ranking.rank ?? 9999;
}

function rankingTeamNumber(ranking: RoboRanking) {
  return ranking.team?.number ?? ranking.team_number ?? "";
}

function skillTeamNumber(skill: RoboSkills) {
  return skill.team?.number ?? skill.team_number ?? "";
}

function prediction(match: RoboMatch, rankings: RoboRanking[]) {
  const { redTeams, blueTeams } = matchAlliances(match);
  const ranks = new Map(rankings.map((r) => [rankingTeamNumber(r), rankFor(r)]));
  const redRank = redTeams.reduce((sum, t) => sum + (ranks.get(t.number) ?? 60), 0) / Math.max(redTeams.length, 1);
  const blueRank = blueTeams.reduce((sum, t) => sum + (ranks.get(t.number) ?? 60), 0) / Math.max(blueTeams.length, 1);
  const delta = Math.max(-28, Math.min(28, blueRank - redRank));
  const red = Math.max(20, Math.min(80, Math.round(50 + delta)));
  return { red, blue: 100 - red, pick: red >= 50 ? "red" : "blue" };
}

function awardCandidates(awardName: string, profile: EventProfile) {
  const key = awardName.toLowerCase();
  const allTeams = profile.teams;
  const rankings = [...profile.rankings].sort((a, b) => rankFor(a) - rankFor(b));
  const skills = [...profile.skills].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  const rankLimit = Math.max(1, Math.ceil(Math.max(allTeams.length, rankings.length) * 0.4));
  const rankedNumbers = new Set(rankings.slice(0, rankLimit).map(rankingTeamNumber));
  const skillNumbers = new Set(skills.slice(0, rankLimit).map(skillTeamNumber));
  const topRanked = rankings.slice(0, 5).map((r) => allTeams.find((t) => t.number === rankingTeamNumber(r)) ?? r.team).filter((t): t is RoboTeamResult => Boolean(t));
  const topSkilled = skills.slice(0, 5).map((s) => allTeams.find((t) => t.number === skillTeamNumber(s)) ?? s.team).filter((t): t is RoboTeamResult => Boolean(t));

  if (key.includes("excellence")) {
    const qualified = allTeams.filter((t) => rankedNumbers.has(t.number) && (!skillNumbers.size || skillNumbers.has(t.number))).slice(0, 6);
    return {
      rule: AWARD_RULES.excellence,
      teams: qualified.length ? qualified : topRanked,
      why: skillNumbers.size ? "Top 40% ranking and skills filter applied to official RobotEvents data; judged notebook/interview still must be verified." : "Ranking filter applied; RobotEvents skills data was unavailable or incomplete for the event.",
    };
  }
  if (key.includes("skills")) return { rule: "Performance award based on official Robot Skills results.", teams: topSkilled, why: "Sorted by available RobotEvents skills rankings." };
  if (key.includes("tournament") || key.includes("champion") || key.includes("finalist")) return { rule: "Performance award based on elimination match results.", teams: topRanked, why: "Likely contenders use qualification ranking until elimination results are available." };
  const match = Object.entries(AWARD_RULES).find(([name]) => key.includes(name));
  return { rule: match?.[1] ?? "Judged award. RobotEvents does not include interview or notebook rubric details.", teams: topRanked.slice(0, 4), why: "Likely list uses visible performance data only; judges decide using interview, notebook, conduct, and award rubric evidence." };
}

function TeamCard({ team, accent, onClick }: { team: RoboTeamResult; accent: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11, color: accent }}>{team.number}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.team_name || team.number}</p>
            <Star size={12} style={{ color: "rgba(255,255,255,0.18)" }} />
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.organization || "Organization not listed"}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <MapPin size={10} style={{ color: "#7a80a0" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0" }}>{loc(team)}</span>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)", marginTop: 10 }} />
      </div>
    </button>
  );
}

function TeamDetail({ seed, accent, onBack, onEventClick }: { seed: RoboTeamResult; accent: string; onBack: () => void; onEventClick: (event: RoboEvent) => void }) {
  const [profile, setProfile] = useState<TeamProfile>({ team: seed, events: [], matches: [], awards: [] });
  const [loading, setLoading] = useState(true);
  const stats = teamStats(profile.matches, seed.number);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([teamEvents(seed.id), teamMatches(seed.id), teamAwards(seed.id)]).then(([events, matches, awards]) => {
      if (!alive) return;
      setProfile({ team: seed, events, matches, awards });
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [seed.id]);

  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 10px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
        </button>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "16px", color: "#e8eaf0", flex: 1 }}>Team Profile</p>
        {loading ? <Loader2 size={17} style={{ color: accent, animation: "spin 1s linear infinite" }} /> : null}
      </div>

      <div style={{ margin: "0 16px 14px", background: "linear-gradient(135deg, #111320, #12142a)", border: `1px solid ${accent}30`, borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${accent}30, #7c3aed30)`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: "16px", color: accent }}>{seed.number}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "20px", color: "#e8eaf0", lineHeight: 1.1 }}>{seed.team_name || seed.number}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#7a80a0", marginTop: 2 }}>{seed.organization || "Organization not listed"}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
              <MapPin size={11} style={{ color: "#7a80a0" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#7a80a0" }}>{loc(seed)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "WIN RATE", val: stats.winRate == null ? "—" : `${stats.winRate}%`, color: accent },
            { label: "AVG", val: stats.avg ?? "—", color: "#10b981" },
            { label: "MAX", val: stats.max ?? "—", color: "#f59e0b" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "#1a1e30", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color }}>{val}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "MATCHES", val: stats.scored.length, color: accent },
          { label: "AWARDS", val: profile.awards.length, color: "#f59e0b" },
          { label: "EVENTS", val: profile.events.length, color: "#a855f7" },
          { label: "PROGRAM", val: seed.program?.code ?? "—", color: "#e8eaf0" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color }}>{val}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>AI Summary</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#b0b4c8", lineHeight: 1.65 }}>
          {stats.scored.length ? `${seed.number} has ${stats.scored.length} official scored matches loaded. Their visible win rate is ${stats.winRate}% with an average alliance score of ${stats.avg}. Scout notebook/interview details are not in RobotEvents, so judged-award confidence should come from your own notes.` : "Official match data has not loaded for this team yet. Search a recent event or add scout notes before making alliance decisions."}
        </p>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Awards</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.awards.map((a, i) => (
            <div key={`${awardTitle(a)}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < profile.awards.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <Trophy size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{awardTitle(a)}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{a.event?.name ?? "RobotEvents award"}</p>
              </div>
            </div>
          ))}
          {!profile.awards.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No awards found in official RobotEvents data.</p> : null}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Tournaments</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {profile.events.map((ev) => (
            <button key={ev.id} onClick={() => onEventClick(ev)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</span>
              <ChevronRight size={14} style={{ color: accent, flexShrink: 0 }} />
            </button>
          ))}
          {!profile.events.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No tournaments found for this team.</p> : null}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Match History</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.matches.slice(0, 12).map((m) => {
            const s = scoreForTeam(m, seed.number);
            return (
              <div key={m.id} style={{ background: "#1a1e30", borderRadius: 11, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#e8eaf0" }}>{matchLabel(m)}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0" }}>{m.event?.name ?? "Event"}{m.field ? ` · ${m.field}` : ""}</p>
                </div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: s?.won ? "#10b981" : s ? "#ff3b5c" : "#7a80a0", fontWeight: 700 }}>{s ? `${s.ours}-${s.theirs}` : "Scheduled"}</p>
              </div>
            );
          })}
          {!profile.matches.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No matches returned by RobotEvents yet.</p> : null}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function awardTitle(a: RoboAward) {
  return a.title ?? a.name ?? "Award";
}

function EventDetail({ event, accent, onBack, onTeamClick }: { event: RoboEvent; accent: string; onBack: () => void; onTeamClick: (team: RoboTeamResult) => void }) {
  const { addPredictionFeedback } = useApp();
  const [profile, setProfile] = useState<EventProfile>({ event, teams: [], matches: [], awards: [], rankings: [], skills: [] });
  const [evTab, setEvTab] = useState<"awards" | "teams" | "matches">("awards");
  const [loading, setLoading] = useState(true);
  const qualifyingText = useMemo(() => {
    const qual = profile.awards.flatMap((a) => a.qualifications ?? []).join(" ").toLowerCase();
    const level = `${event.level ?? ""} ${event.event_type ?? ""}`.toLowerCase();
    return {
      states: /region|state|championship|qualif/.test(qual + " " + level),
      worlds: /world/.test(qual + " " + level),
    };
  }, [event.event_type, event.level, profile.awards]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([eventTeams(event.id), eventMatches(event.id), eventAwards(event.id), eventRankings(event.id), eventSkills(event.id)]).then(([teams, matches, awards, rankings, skills]) => {
      if (!alive) return;
      setProfile({ event, teams, matches, awards, rankings, skills });
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [event.id]);

  function sendFeedback(match: RoboMatch, actual: string) {
    const p = prediction(match, profile.rankings);
    addPredictionFeedback({ matchId: String(match.id), predicted: p.pick, actual });
    sendPredictionFeedback({ matchId: String(match.id), predicted: p.pick, actual });
  }

  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 10px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
        </button>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "15px", color: "#e8eaf0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.name}</p>
        {loading ? <Loader2 size={17} style={{ color: accent, animation: "spin 1s linear infinite" }} /> : null}
      </div>

      <div style={{ margin: "0 16px 14px", background: "linear-gradient(135deg, #111320, #12142a)", border: `1px solid ${accent}30`, borderRadius: 18, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <MapPin size={14} style={{ color: "#7a80a0" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0" }}>{eventLoc(event)} · {shortDate(event.start)}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 7px", marginLeft: "auto" }}>{profile.teams.length || "—"} teams</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, color: qualifyingText.states ? "#10b981" : "#7a80a0", background: qualifyingText.states ? "#10b98115" : "rgba(255,255,255,0.04)", border: `1px solid ${qualifyingText.states ? "#10b98130" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <CheckCircle size={11} /> States Qualified {qualifyingText.states ? "" : "not listed"}
          </span>
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, color: qualifyingText.worlds ? "#f59e0b" : "#7a80a0", background: qualifyingText.worlds ? "#f59e0b15" : "rgba(255,255,255,0.04)", border: `1px solid ${qualifyingText.worlds ? "#f59e0b30" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <Globe size={11} /> Worlds Qualified {qualifyingText.worlds ? "" : "not listed"}
          </span>
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "#1a1e30", borderRadius: 12, padding: 3 }}>
        {(["awards", "teams", "matches"] as const).map((t) => (
          <button key={t} onClick={() => setEvTab(t)} style={{ padding: "8px 4px", borderRadius: 9, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, textTransform: "capitalize", background: evTab === t ? accent : "transparent", color: evTab === t ? "#08090f" : "#7a80a0", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {t === "awards" ? "Awards" : t === "teams" ? "Teams" : "Matches"}
          </button>
        ))}
      </div>

      {evTab === "awards" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {profile.awards.map((a, i) => {
            const candidate = awardCandidates(awardTitle(a), profile);
            return (
              <div key={`${awardTitle(a)}-${i}`} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #f59e0b30, #ff8c0020)", border: "1px solid #f59e0b30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trophy size={18} style={{ color: "#f59e0b" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{awardTitle(a)}</p>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent, marginTop: 1 }}>{teamNumberFromWinner(a) || "Winner TBD"}{teamNameFromWinner(a) ? ` · ${teamNameFromWinner(a)}` : ""}</p>
                  </div>
                </div>
                <div style={{ marginTop: 10, background: "#1a1e30", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: "#e8eaf0", marginBottom: 5 }}>Award qualification</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", lineHeight: 1.5 }}>{candidate.rule}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginTop: 7 }}>{candidate.why}</p>
                  {candidate.teams.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: accent, marginTop: 7 }}>{candidate.teams.slice(0, 4).map((t) => `${t.number} ${t.team_name}`).join(" · ")}</p> : null}
                </div>
              </div>
            );
          })}
          {!profile.awards.length ? <div style={{ textAlign: "center", padding: "44px 20px", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>No official awards returned yet. When awards are published, qualification analysis appears here.</div> : null}
        </div>
      )}

      {evTab === "teams" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.teams.map((t) => {
            const rank = profile.rankings.find((r) => rankingTeamNumber(r) === t.number)?.rank;
            return (
              <button key={t.id} onClick={() => onTeamClick(t)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, width: "100%", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: accent }}>{rank ? `#${rank}` : t.number}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11, color: accent }}>{t.number}</span>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name || t.number}</p>
                </div>
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
              </button>
            );
          })}
          {!profile.teams.length ? <div style={{ textAlign: "center", padding: "44px 20px", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>No participating teams returned by RobotEvents.</div> : null}
        </div>
      )}

      {evTab === "matches" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {profile.matches.map((m) => {
            const { red, blue, redTeams, blueTeams } = matchAlliances(m);
            const redScore = Number(red?.score);
            const blueScore = Number(blue?.score);
            const scored = !Number.isNaN(redScore) && !Number.isNaN(blueScore);
            const redWon = scored && redScore > blueScore;
            const p = prediction(m, profile.rankings);
            return (
              <div key={m.id} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#7a80a0", fontWeight: 600 }}>{matchLabel(m)}{m.field ? ` · ${m.field}` : ""}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0" }}>{m.scheduled ? new Date(m.scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Time TBD"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", padding: "12px 14px", gap: 8, alignItems: "center" }}>
                  <div style={{ background: "#ff3b5c12", border: "1px solid #ff3b5c25", borderRadius: 10, padding: "8px 10px" }}>
                    {redTeams.map((t) => <p key={t.number} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: redWon ? "#ff6b7a" : "#7a80a0", fontWeight: 600 }}>{t.number} <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10 }}>{t.team_name}</span></p>)}
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color: redWon ? "#ff3b5c" : "#7a80a0", marginTop: 4 }}>{scored ? redScore : "—"}</p>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>VS</span>
                  <div style={{ background: "#00c8ff12", border: "1px solid #00c8ff25", borderRadius: 10, padding: "8px 10px", textAlign: "right" }}>
                    {blueTeams.map((t) => <p key={t.number} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: scored && !redWon ? "#60d0ff" : "#7a80a0", fontWeight: 600 }}><span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10 }}>{t.team_name}</span> {t.number}</p>)}
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color: scored && !redWon ? "#00c8ff" : "#7a80a0", marginTop: 4 }}>{scored ? blueScore : "—"}</p>
                  </div>
                </div>
                {!scored ? (
                  <div style={{ padding: "0 14px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <BrainCircuit size={12} style={{ color: accent }} />
                      <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, color: "#e8eaf0" }}>Prediction: Red {p.red}% · Blue {p.blue}%</span>
                    </div>
                    <div style={{ height: 8, background: "#00c8ff22", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: `${p.red}%`, height: "100%", background: "#ff3b5c", borderRadius: 6 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "0 14px 12px", display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => sendFeedback(m, redWon ? "red" : "blue")} style={{ background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 10, padding: "5px 9px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>Send prediction feedback</button>
                  </div>
                )}
              </div>
            );
          })}
          {!profile.matches.length ? <div style={{ textAlign: "center", padding: "44px 20px", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>No matches returned by RobotEvents yet.</div> : null}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function LookupPage() {
  const { accent } = useAccent();
  const { team: appTeam } = useApp();
  const initialPath = typeof window !== "undefined" ? window.location.pathname : "";
  const pathTeam = initialPath.match(/\/teams\/([^/]+)/)?.[1] ?? "";
  const pathEvent = initialPath.match(/\/events\/([^/]+)/)?.[1] ?? "";
  const [tab, setTab] = useState<"teams" | "events">(pathEvent ? "events" : "teams");
  const [query, setQuery] = useState(decodeURIComponent(pathTeam || pathEvent || ""));
  const [teamResults, setTeamResults] = useState<RoboTeamResult[]>([]);
  const [eventResults, setEventResults] = useState<RoboEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<RoboTeamResult | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<RoboEvent | null>(null);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    setLoading(Boolean(q && q.length >= 2));
    const timer = setTimeout(async () => {
      if (tab === "teams") {
        const results = q.length >= 2 ? await searchTeams(q) : appTeam ? [appTeam as RoboTeam] : [];
        if (alive) setTeamResults(results);
      } else {
        const results = q.length >= 2 ? await searchEvents(q) : appTeam ? await teamEvents(appTeam.id) : [];
        if (alive) setEventResults(results);
      }
      if (alive) setLoading(false);
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [appTeam, query, tab]);

  if (selectedTeam) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TeamDetail seed={selectedTeam} accent={accent} onBack={() => setSelectedTeam(null)} onEventClick={(ev) => { setSelectedTeam(null); setSelectedEvent(ev); }} />
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <EventDetail event={selectedEvent} accent={accent} onBack={() => setSelectedEvent(null)} onTeamClick={(t) => { setSelectedEvent(null); setSelectedTeam(t); }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 80 }}>
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>LIVE ROBOTEVENTS</p>
        <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2, marginBottom: 14 }}>Lookup</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 14, padding: "10px 14px" }}>
          {loading ? <Loader2 size={16} style={{ color: accent, animation: "spin 1s linear infinite", flexShrink: 0 }} /> : <Search size={16} style={{ color: "#7a80a0", flexShrink: 0 }} />}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "teams" ? "Search exact team number…" : "Search event name or SKU…"} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0" }} />
          {query && <button onClick={() => setQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={14} style={{ color: "#7a80a0" }} /></button>}
        </div>

        <div style={{ display: "flex", background: "#1a1e30", borderRadius: 12, padding: 3, marginTop: 10 }}>
          {(["teams", "events"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px", borderRadius: 9, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, background: tab === t ? accent : "transparent", color: tab === t ? "#08090f" : "#7a80a0", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
              {t === "teams" ? "Teams" : "Events"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        {tab === "teams" && teamResults.map((team) => <TeamCard key={team.id} team={team} accent={accent} onClick={() => setSelectedTeam(team)} />)}
        {tab === "teams" && !teamResults.length ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <Users size={34} style={{ color: "#2a2f48", marginBottom: 12 }} />
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginBottom: 6 }}>Search a real team</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0", lineHeight: 1.5 }}>Enter an exact RobotEvents team number like 24B or 8059A. Team names are always shown beside team numbers.</p>
          </div>
        ) : null}

        {tab === "events" && eventResults.map((ev) => (
          <button key={ev.id} onClick={() => setSelectedEvent(ev)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ff8c0015", border: "1px solid #ff8c0030", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trophy size={20} style={{ color: "#ff8c00" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0" }}>{ev.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <MapPin size={10} style={{ color: "#7a80a0" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0" }}>{eventLoc(ev)} · {shortDate(ev.start)}</span>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={11} style={{ color: accent }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{ev.sku}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <TrendingUp size={11} style={{ color: "#10b981" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{ev.season?.name ?? "Season TBD"}</span>
              </div>
            </div>
          </button>
        ))}
        {tab === "events" && !eventResults.length ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <Award size={34} style={{ color: "#2a2f48", marginBottom: 12 }} />
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginBottom: 6 }}>Search a tournament</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0", lineHeight: 1.5 }}>Search by event name or SKU. If your team is selected, their tournaments appear here first.</p>
          </div>
        ) : null}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
