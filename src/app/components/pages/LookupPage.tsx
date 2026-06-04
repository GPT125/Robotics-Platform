import { useEffect, useMemo, useState } from "react";
import { Search, Star, Trophy, MapPin, Globe, TrendingUp, ChevronRight, ArrowLeft, Users, Zap, Award, CheckCircle, X, Loader2, BrainCircuit, MoreVertical } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp, type RoboTeam, type ScoutNote } from "../AppContext";
import {
  allianceTeams,
  awardWinnerTeams,
  eventAwards,
  eventMatches,
  eventRankings,
  eventSkills,
  eventTeams,
  matchAlliances,
  matchLabel,
  searchEvents,
  searchTeams,
  askCoach,
  sendPredictionFeedback,
  teamAwards,
  teamEvents,
  teamMatches,
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

function schoolYear(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const start = d.getMonth() >= 7 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

function mostRecentSchoolYear(events: RoboEvent[]) {
  return events.map((e) => schoolYear(e.start)).filter(Boolean).sort().reverse()[0] ?? "";
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
  const losses = scored.filter((s) => !s.won).length;
  const avg = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.ours, 0) / scored.length) : null;
  const max = scored.length ? Math.max(...scored.map((s) => s.ours)) : null;
  return { scored, wins, losses, winRate: scored.length ? Math.round((wins / scored.length) * 100) : null, avg, max };
}

function teamMatchContext(match: RoboMatch, teamNumber: string) {
  const { redTeams, blueTeams } = matchAlliances(match);
  const red = redTeams.some((t) => t.number === teamNumber);
  const blue = blueTeams.some((t) => t.number === teamNumber);
  if (!red && !blue) return null;
  const partners = red ? redTeams : blueTeams;
  const opponents = red ? blueTeams : redTeams;
  return { color: red ? "red" as const : "blue" as const, partners, opponents };
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

const MATCH_NOTE_TAGS = ["Auton", "Driver", "Defense", "Reliable", "Issue", "Penalty", "Good partner", "Risk"];

function MatchScoutSheet({ team, match, accent, onClose, onSave }: { team: RoboTeamResult; match: RoboMatch; accent: string; onClose: () => void; onSave: (note: Omit<ScoutNote, "id" | "createdAt" | "authorName">) => void }) {
  const score = scoreForTeam(match, team.number);
  const context = teamMatchContext(match, team.number);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>(score ? [score.won ? "Win" : "Loss"] : []);
  const [ratings, setRatings] = useState({ autonomous: 0, driver: 0, endgame: 0, defense: 0, consistency: 0 });
  const toggleTag = (tag: string) => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const save = () => {
    onSave({
      teamId: team.number,
      teamName: team.team_name || team.number,
      matchId: String(match.id),
      matchLabel: matchLabel(match),
      eventId: match.event?.id,
      eventName: match.event?.name,
      allianceColor: context?.color,
      opponents: context?.opponents.map((t) => t.number),
      result: score ? (score.won ? "win" : "loss") : "unscored",
      score: score ? `${score.ours}-${score.theirs}` : undefined,
      tags,
      description: description.trim() || `${matchLabel(match)} scout note for ${team.number}.`,
      ratings,
      images: [],
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 230, background: "rgba(5,6,13,0.78)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 14px 0" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 402, maxHeight: "78vh", overflowY: "auto", background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 22, padding: "18px 16px 20px", boxShadow: "0 18px 60px rgba(0,0,0,0.45)", animation: "modalDrop 0.26s cubic-bezier(0.22,1,0.36,1)", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent, letterSpacing: "0.08em" }}>{matchLabel(match)} · {team.number}</p>
            <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 19, color: "#fff", margin: "2px 0 0" }}>Match scout note</h3>
          </div>
          <button onClick={onClose} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
        </div>
        <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "11px 12px", marginBottom: 12 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: "#e8eaf0" }}>{team.team_name || team.number}</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", marginTop: 2 }}>
            {match.event?.name ?? "RobotEvents match"}{score ? ` · ${score.won ? "Won" : "Lost"} ${score.ours}-${score.theirs}` : " · Scheduled/unscored"}{context?.opponents.length ? ` · vs ${context.opponents.map((t) => t.number).join(", ")}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {MATCH_NOTE_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return <button key={tag} onClick={() => toggleTag(tag)} style={{ padding: "6px 10px", borderRadius: 18, background: active ? `${accent}20` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "50" : "rgba(255,255,255,0.1)"}`, color: active ? accent : "#8a90aa", fontFamily: "'Inter', sans-serif", fontSize: 11.5, cursor: "pointer" }}>{tag}</button>;
          })}
        </div>
        <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "4px 0", marginBottom: 12 }}>
          {(["autonomous", "driver", "endgame", "defense", "consistency"] as const).map((key, i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#e8eaf0", flex: 1, textTransform: "capitalize" }}>{key === "driver" ? "Driver control" : key}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRatings((prev) => ({ ...prev, [key]: n }))} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                    <Star size={15} style={{ color: n <= ratings[key] ? accent : "rgba(255,255,255,0.15)", fill: n <= ratings[key] ? accent : "none" }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What happened in this match? Auton, driver control, penalties, mechanical problems, partner fit..." style={{ width: "100%", boxSizing: "border-box", background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, padding: "12px 13px", color: "#e8eaf0", outline: "none", resize: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }} />
        <button onClick={save} style={{ width: "100%", background: accent, border: "none", borderRadius: 13, padding: "13px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: `0 0 18px ${accent}40` }}>Save Match Note</button>
      </div>
      <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}

function TeamDetail({ seed, accent, onBack, onEventClick }: { seed: RoboTeamResult; accent: string; onBack: () => void; onEventClick: (event: RoboEvent) => void }) {
  const { scoutNotes, addScoutNote } = useApp();
  const [profile, setProfile] = useState<TeamProfile>({ team: seed, events: [], matches: [], awards: [] });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [matchNoteTarget, setMatchNoteTarget] = useState<RoboMatch | null>(null);
  const years = useMemo(() => Array.from(new Set(profile.events.map((e) => schoolYear(e.start)).filter(Boolean))).sort().reverse(), [profile.events]);
  const eventIdsForYear = useMemo(() => new Set(profile.events.filter((e) => !selectedYear || schoolYear(e.start) === selectedYear).map((e) => e.id)), [profile.events, selectedYear]);
  const filteredEvents = useMemo(() => profile.events.filter((e) => !selectedYear || schoolYear(e.start) === selectedYear), [profile.events, selectedYear]);
  const filteredMatches = useMemo(() => profile.matches.filter((m) => {
    const matchYear = schoolYear(m.scheduled ?? m.started ?? "");
    if (selectedYear && matchYear) return matchYear === selectedYear;
    if (selectedYear && m.event?.id) return eventIdsForYear.has(m.event.id);
    return true;
  }), [eventIdsForYear, profile.matches, selectedYear]);
  const filteredAwards = useMemo(() => profile.awards.filter((a) => !selectedYear || !a.event?.id || eventIdsForYear.has(a.event.id)), [eventIdsForYear, profile.awards, selectedYear]);
  const stats = teamStats(filteredMatches, seed.number);
  const teamNotes = useMemo(() => scoutNotes.filter((note) => note.teamId.toUpperCase() === seed.number.toUpperCase()).sort((a, b) => b.createdAt - a.createdAt), [scoutNotes, seed.number]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([teamEvents(seed.id), teamMatches(seed.id), teamAwards(seed.id)]).then(([events, matches, awards]) => {
      if (!alive) return;
      setProfile({ team: seed, events, matches, awards });
      setSelectedYear(mostRecentSchoolYear(events));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [seed.id]);

  useEffect(() => {
    if (!profile.events.length || loading) return;
    if (!selectedYear && years.length) setSelectedYear(years[0]);
  }, [loading, profile.events.length, selectedYear, years]);

  useEffect(() => {
    let alive = true;
    const fallback = stats.scored.length
      ? `${seed.number} looks ${stats.winRate && stats.winRate >= 60 ? "strong" : stats.winRate && stats.winRate >= 45 ? "competitive" : "developing"} in ${selectedYear || "the selected season"} based on official RobotEvents match data: ${stats.wins} wins, ${stats.losses} losses, ${stats.winRate}% win rate, and ${stats.avg ?? "unknown"} average alliance score. They have ${filteredEvents.length} listed events and ${filteredAwards.length} award records in this view. Use scout notes to judge driver skill, auton quality, and robot reliability.`
      : `${seed.number} has limited scored RobotEvents match data for ${selectedYear || "this view"}. Check recent events, add scouting notes, and compare against event rankings before making alliance decisions.`;
    setAiSummary(fallback);
    if (loading || !stats.scored.length) return;
    askCoach({
      messages: [{
        role: "user",
        content: `Create a short student-friendly RoboLab scouting summary for team ${seed.number} ${seed.team_name}. Use only this RobotEvents data. Do not mention confidence. Stats: ${stats.wins} wins, ${stats.losses} losses, ${stats.winRate}% win rate, avg score ${stats.avg}, max score ${stats.max}, events ${filteredEvents.map((e) => `${e.name} (${shortDate(e.start)})`).join("; ") || "none"}, awards ${filteredAwards.map(awardTitle).join("; ") || "none"}.`,
      }],
      context: `RobotEvents team profile for ${seed.number}. Selected school year: ${selectedYear}.`,
    })
      .then((r) => { if (alive) setAiSummary(r.answer.replace(/^confidence:.*$/gim, "").trim() || fallback); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [filteredAwards, filteredEvents, loading, seed.number, seed.team_name, selectedYear, stats.avg, stats.losses, stats.max, stats.scored.length, stats.winRate, stats.wins]);

  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 10px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
        </button>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "16px", color: "#e8eaf0", flex: 1 }}>Team Profile</p>
        {years.length ? (
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ background: "#181c2e", border: `1px solid ${accent}35`, borderRadius: 10, color: "#e8eaf0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "7px 8px", outline: "none" }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        ) : loading ? <Loader2 size={17} style={{ color: accent, animation: "spin 1s linear infinite" }} /> : null}
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
          { label: "RECORD", val: `${stats.wins}W-${stats.losses}L`, color: "#10b981" },
          { label: "AWARDS", val: filteredAwards.length, color: "#f59e0b" },
          { label: "EVENTS", val: filteredEvents.length, color: "#a855f7" },
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
          {aiSummary}
        </p>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Scout Notes</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {teamNotes.slice(0, 8).map((note) => (
            <div key={note.id} style={{ background: "#1a1e30", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: note.description ? 6 : 0 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12.5, color: "#e8eaf0" }}>{note.matchLabel ?? "Team note"}</p>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: note.result === "win" ? "#10b981" : note.result === "loss" ? "#ff3b5c" : "#7a80a0", flexShrink: 0 }}>{note.score ?? note.date}</span>
              </div>
              {note.eventName ? <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginBottom: 5 }}>{note.eventName}</p> : null}
              {note.description ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#b0b4c8", lineHeight: 1.5 }}>{note.description}</p> : null}
            </div>
          ))}
          {!teamNotes.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No RoboLab scout notes saved for this team yet.</p> : null}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Awards</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredAwards.map((a, i) => (
            <div key={`${awardTitle(a)}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < filteredAwards.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <Trophy size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{awardTitle(a)}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{a.event?.name ?? "RobotEvents award"}</p>
              </div>
            </div>
          ))}
          {!filteredAwards.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No awards found in official RobotEvents data for this school year.</p> : null}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Tournaments</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredEvents.map((ev) => (
            <button key={ev.id} onClick={() => onEventClick(ev)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</span>
              <ChevronRight size={14} style={{ color: accent, flexShrink: 0 }} />
            </button>
          ))}
          {!filteredEvents.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No tournaments found for this team in this school year.</p> : null}
        </div>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Match History</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredMatches.map((m) => {
            const s = scoreForTeam(m, seed.number);
            const context = teamMatchContext(m, seed.number);
            const predicted = !s ? Math.max(28, Math.min(72, stats.winRate ?? 50)) : null;
            return (
              <div key={m.id} style={{ background: s ? (s.won ? "#10b98112" : "#ff3b5c12") : "#1a1e30", border: `1px solid ${s ? (s.won ? "#10b98130" : "#ff3b5c30") : "transparent"}`, borderRadius: 11, padding: "10px 10px 10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12.5, color: "#e8eaf0" }}>{matchLabel(m)}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0" }}>{m.event?.name ?? "Event"}{m.field ? ` · ${m.field}` : ""}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: "#9aa0bf", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {context ? `${context.color.toUpperCase()} with ${context.partners.map((t) => t.number).join(", ")} vs ${context.opponents.map((t) => t.number).join(", ") || "TBD"}` : "Alliance data unavailable"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: s?.won ? "#10b981" : s ? "#ff3b5c" : accent, fontWeight: 700 }}>{s ? `${s.ours}-${s.theirs}` : `Win ${predicted}%`}</p>
                  <button onClick={() => setMatchNoteTarget(m)} aria-label={`Scout ${matchLabel(m)}`} style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <MoreVertical size={15} style={{ color: "#e8eaf0" }} />
                  </button>
                </div>
              </div>
            );
          })}
          {!filteredMatches.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No matches returned by RobotEvents for this school year.</p> : null}
        </div>
      </div>
      {matchNoteTarget ? (
        <MatchScoutSheet
          team={seed}
          match={matchNoteTarget}
          accent={accent}
          onClose={() => setMatchNoteTarget(null)}
          onSave={(note) => { addScoutNote(note); setMatchNoteTarget(null); }}
        />
      ) : null}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function awardTitle(a: RoboAward) {
  return a.title ?? a.name ?? "Award";
}

function awardQualificationText(a: RoboAward) {
  const qualifications = (a.qualifications ?? []).filter(Boolean);
  if (!qualifications.length) return "No state or world qualification is listed for this award in RobotEvents.";
  return `Qualifies for: ${qualifications.join(", ")}`;
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
            <CheckCircle size={11} /> Event state qualifier {qualifyingText.states ? "listed" : "not listed"}
          </span>
          <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, color: qualifyingText.worlds ? "#f59e0b" : "#7a80a0", background: qualifyingText.worlds ? "#f59e0b15" : "rgba(255,255,255,0.04)", border: `1px solid ${qualifyingText.worlds ? "#f59e0b30" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <Globe size={11} /> Event worlds qualifier {qualifyingText.worlds ? "listed" : "not listed"}
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
            const winners = awardWinnerTeams(a);
            const winnerText = winners.length ? winners.map((team) => `${team.number}${team.team_name && team.team_name !== team.number ? ` · ${team.team_name}` : ""}`).join(" · ") : "Winner not published by RobotEvents yet";
            return (
              <div key={`${awardTitle(a)}-${i}`} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #f59e0b30, #ff8c0020)", border: "1px solid #f59e0b30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trophy size={18} style={{ color: "#f59e0b" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{awardTitle(a)}</p>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: winners.length ? accent : "#7a80a0", marginTop: 1 }}>{winnerText}</p>
                  </div>
                </div>
                <div style={{ marginTop: 10, background: "#1a1e30", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: "#e8eaf0", marginBottom: 5 }}>Award qualification</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", lineHeight: 1.5 }}>{awardQualificationText(a)}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginTop: 7 }}>{candidate.rule}</p>
                  {!winners.length && candidate.teams.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: accent, marginTop: 7 }}>Likely contenders from visible data: {candidate.teams.slice(0, 4).map((t) => `${t.number} ${t.team_name}`).join(" · ")}</p> : null}
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

  useEffect(() => {
    if (!pathTeam || selectedTeam || !teamResults.length) return;
    const exact = teamResults.find((t) => t.number.toUpperCase() === decodeURIComponent(pathTeam).toUpperCase()) ?? teamResults[0];
    setSelectedTeam(exact);
  }, [pathTeam, selectedTeam, teamResults]);

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
