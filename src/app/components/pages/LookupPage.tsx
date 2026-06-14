import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Star, Trophy, MapPin, Globe, TrendingUp, ChevronRight, ArrowLeft, Users, Zap, Award, CheckCircle, X, Loader2, MoreVertical, Sparkles } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useAccent } from "../AccentContext";
import { MatchCard } from "../MatchCard";
import { useApp, type Favorite, type RoboTeam, type ScoutNote } from "../AppContext";
import { getMatchMindEventTeams, listAllianceOffers, listSentAllianceOffers, registerForAllianceOffers, respondToAllianceOffer, sendAllianceOffer, type AllianceOffer, type OfferResponse } from "../../../services/firebaseBackend";
import {
  allianceTeams,
  awardWinnerTeams,
  eventAwards,
  eventMatches,
  eventRankings,
  eventSkills,
  eventSuggestionReason,
  eventTeams,
  filterEventsForQuery,
  GRADE_OPTIONS,
  PROGRAM_OPTIONS,
  matchAlliances,
  matchDisplayModel,
  matchLabel,
  searchEvents,
  searchTeams,
  teamSuggestionReason,
  askCoach,
  teamAwards,
  teamEvents,
  teamMatches,
  type RoboAward,
  type RoboEvent,
  type RoboMatch,
  type RoboRanking,
  type RoboSkills,
  type RoboTeamResult,
  type GradeLevel,
  type ProgramCode,
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

const ALLIANCE_NOTIFY_KEY = "matchmind:alliance-notify";
const ALLIANCE_DISCLAIMER_KEY = "matchmind:alliance-disclaimer-agreed";

const OFFER_STATUS_META: Record<string, { label: string; color: string }> = {
  sent: { label: "Awaiting response", color: "#9aa0bf" },
  accepted: { label: "Accepted", color: "#10b981" },
  declined: { label: "Declined", color: "#ff6b7a" },
  thinking: { label: "Thinking about it", color: "#f59e0b" },
  meeting: { label: "Wants to meet up", color: "#38bdf8" },
};

function eventLivestreamUrl(event: RoboEvent) {
  const links = [
    ...(event.links ?? []),
    ...Object.values(event as unknown as Record<string, unknown>)
      .filter((value): value is { url?: string; title?: string; label?: string; type?: string } => Boolean(value && typeof value === "object" && "url" in (value as Record<string, unknown>))),
  ];
  return links.find((link) => {
    const label = `${link.title ?? ""} ${link.label ?? ""} ${link.type ?? ""} ${link.url ?? ""}`.toLowerCase();
    return Boolean(link.url && /(live|stream|youtube|twitch)/.test(label));
  })?.url ?? "";
}

function eventDateRange(event: RoboEvent) {
  const start = event.start ? new Date(event.start) : null;
  const end = event.end ? new Date(event.end) : start;
  const safeStart = start && !Number.isNaN(start.getTime()) ? start : new Date();
  const safeEnd = end && !Number.isNaN(end.getTime()) ? end : safeStart;
  return { start: safeStart, end: safeEnd };
}

// Full street address (venue + street + city/region/postcode/country) so the
// calendar entry drops a pin on the ACTUAL venue, not just the city.
function fullEventAddress(event: RoboEvent) {
  const l = event.location ?? {};
  const parts = [l.venue, l.address_1, l.address_2, [l.city, l.region].filter(Boolean).join(", "), l.postcode, l.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.join(", ") || eventLoc(event);
}

function googleCalendarUrl(event: RoboEvent) {
  const { start, end } = eventDateRange(event);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: fullEventAddress(event),
    details: `MatchMind event: ${event.sku}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadTextFile(filename: string, body: string, type = "text/plain") {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAppleCalendar(event: RoboEvent) {
  const { start, end } = eventDateRange(event);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MatchMind//Event//EN",
    "BEGIN:VEVENT",
    `UID:${event.id || event.sku}@matchmind`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
    `DTSTART:${start.toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
    `DTEND:${end.toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
    `SUMMARY:${event.name.replace(/\n/g, " ")}`,
    `LOCATION:${fullEventAddress(event).replace(/\n/g, " ").replace(/,/g, "\\,")}`,
    `DESCRIPTION:MatchMind event ${event.sku}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  downloadTextFile(`${event.sku || "matchmind-event"}.ics`, ics, "text/calendar");
}

function shortDate(value?: string) {
  if (!value) return "TBD";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "TBD" : d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

function dateKey(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eventDayKeys(event: RoboEvent) {
  const start = new Date(event.start);
  const end = new Date(event.end || event.start);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
  const days: string[] = [];
  while (cursor.getTime() <= last.getTime() && days.length < 10) {
    days.push(dateKey(cursor.toISOString()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function dayLabel(key: string) {
  const d = new Date(`${key}T12:00:00`);
  return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
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

// Pull the actual game name (e.g. "High Stakes", "Push Back", "Rapid Relay")
// out of the official RobotEvents season string for the team's program, so the
// year picker shows the game the team played — never a hard-coded guess.
function seasonGameLabel(seasonName?: string): string {
  if (!seasonName) return "";
  const game = seasonName
    .replace(/\d{4}\s*[-–]\s*\d{2,4}/g, "")
    .replace(/VEX\s*(V5RC|VIQRC|VURC|VAIRC|V5|IQ|U|AI)?\s*(Robotics Competition|Robotics|Competition)/gi, "")
    .replace(/\b(V5RC|VIQRC|VURC|VRC|VAIRC|VEX U|VEXU)\b/gi, "")
    .replace(/[:\-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return game;
}

// schoolYear -> official game name, built from the team's real events.
function yearGameMap(events: RoboEvent[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ev of events) {
    const y = schoolYear(ev.start);
    if (!y) continue;
    const game = seasonGameLabel(ev.season?.name);
    if (game && !map[y]) map[y] = game;
  }
  return map;
}

function cleanAiSummary(text: string, fallback: string) {
  const cleaned = text
    .replace(/^confidence:.*$/gim, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
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

function matchOrderValue(match: RoboMatch) {
  const time = new Date(match.scheduled ?? match.started ?? "").getTime();
  if (Number.isFinite(time)) return time;
  return ((match.round ?? 0) * 100000) + ((match.instance ?? 0) * 1000) + (match.matchnum ?? match.id ?? 0);
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

function gaussianSolve(a: number[][], b: number[]) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-8) continue;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const div = m[col][col] || 1;
    for (let j = col; j <= n; j++) m[col][j] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = m[row][col];
      for (let j = col; j <= n; j++) m[row][j] -= factor * m[col][j];
    }
  }
  return m.map((row) => Number.isFinite(row[n]) ? row[n] : 0);
}

function solveLeastSquares(rows: number[][], values: number[], size: number) {
  if (!rows.length || !size) return Array(size).fill(0) as number[];
  const ata = Array.from({ length: size }, () => Array(size).fill(0));
  const atb = Array(size).fill(0);
  const lambda = 0.01;
  rows.forEach((row, idx) => {
    const y = values[idx] ?? 0;
    for (let i = 0; i < size; i++) {
      if (!row[i]) continue;
      atb[i] += row[i] * y;
      for (let j = 0; j < size; j++) {
        if (row[j]) ata[i][j] += row[i] * row[j];
      }
    }
  });
  for (let i = 0; i < size; i++) ata[i][i] += lambda;
  return gaussianSolve(ata, atb);
}

function eventAnalytics(profile: EventProfile) {
  const numbers = new Set<string>();
  profile.teams.forEach((team) => numbers.add(team.number));
  profile.matches.forEach((match) => {
    const { redTeams, blueTeams } = matchAlliances(match);
    redTeams.forEach((team) => numbers.add(team.number));
    blueTeams.forEach((team) => numbers.add(team.number));
  });
  const teamNumbers = [...numbers].filter(Boolean).sort();
  const index = new Map(teamNumbers.map((number, i) => [number, i]));
  const rows: number[][] = [];
  const oprY: number[] = [];
  const dprY: number[] = [];
  const ccwmY: number[] = [];
  for (const match of profile.matches) {
    const { red, blue, redTeams, blueTeams } = matchAlliances(match);
    const redScore = Number(red?.score);
    const blueScore = Number(blue?.score);
    if (Number.isNaN(redScore) || Number.isNaN(blueScore) || (!redTeams.length && !blueTeams.length)) continue;
    const redRow = Array(teamNumbers.length).fill(0);
    const blueRow = Array(teamNumbers.length).fill(0);
    redTeams.forEach((team) => { const i = index.get(team.number); if (i != null) redRow[i] = 1; });
    blueTeams.forEach((team) => { const i = index.get(team.number); if (i != null) blueRow[i] = 1; });
    if (redRow.some(Boolean)) {
      rows.push(redRow);
      oprY.push(redScore);
      dprY.push(blueScore);
      ccwmY.push(redScore - blueScore);
    }
    if (blueRow.some(Boolean)) {
      rows.push(blueRow);
      oprY.push(blueScore);
      dprY.push(redScore);
      ccwmY.push(blueScore - redScore);
    }
  }
  const opr = solveLeastSquares(rows, oprY, teamNumbers.length);
  const dpr = solveLeastSquares(rows, dprY, teamNumbers.length);
  const ccwm = solveLeastSquares(rows, ccwmY, teamNumbers.length);
  return new Map(teamNumbers.map((number, i) => [number, {
    opr: Math.round(opr[i] * 10) / 10,
    dpr: Math.round(dpr[i] * 10) / 10,
    ccwm: Math.round(ccwm[i] * 10) / 10,
  }]));
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

function TeamCard({ team, accent, onClick, query, index = 0, favorite = false, onToggleFavorite }: { team: RoboTeamResult; accent: string; onClick: () => void; query?: string; index?: number; favorite?: boolean; onToggleFavorite?: () => void }) {
  const reason = query ? teamSuggestionReason(team, query) : team.program?.code ? `${team.program.code} RobotEvents result` : "RobotEvents result";
  return (
    <button className="lookupResultCard" onClick={onClick} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%", animation: "lookupResultIn 0.3s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${Math.min(index * 35, 180)}ms`, transition: "transform 0.18s ease, border-color 0.18s ease, background 0.18s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11, color: accent }}>{team.number}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.team_name || team.number}</p>
            <button
              aria-label={favorite ? "Remove favorite" : "Add favorite"}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              style={{ background: "transparent", border: "none", padding: 2, cursor: onToggleFavorite ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Star size={13} style={{ color: favorite ? "#f59e0b" : "rgba(255,255,255,0.18)", fill: favorite ? "#f59e0b" : "none" }} />
            </button>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.organization || "Organization not listed"}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <MapPin size={10} style={{ color: "#7a80a0" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0" }}>{loc(team)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: 999, padding: "3px 7px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: accent }}>
              <Sparkles size={9} /> {reason}
            </span>
            {team.program?.code ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#8a90aa" }}>{team.program.code}</span> : null}
            {team.grade ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#8a90aa" }}>{team.grade}</span> : null}
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 230, background: "rgba(5,6,13,0.78)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px" }}>
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
  const { scoutNotes, addScoutNote, updateScoutNote, deleteScoutNote } = useApp();
  const [profile, setProfile] = useState<TeamProfile>({ team: seed, events: [], matches: [], awards: [] });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [matchNoteTarget, setMatchNoteTarget] = useState<RoboMatch | null>(null);
  const [selectedScoutNote, setSelectedScoutNote] = useState<ScoutNote | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const awardsRef = useRef<HTMLDivElement | null>(null);
  const years = useMemo(() => Array.from(new Set(profile.events.map((e) => schoolYear(e.start)).filter(Boolean))).sort().reverse(), [profile.events]);
  const yearGames = useMemo(() => yearGameMap(profile.events), [profile.events]);
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
  const scoredScores = stats.scored.map((s) => s.ours);
  const scoreStdDev = scoredScores.length > 1
    ? Math.round(Math.sqrt(scoredScores.reduce((sum, score) => sum + Math.pow(score - (stats.avg ?? 0), 2), 0) / scoredScores.length))
    : null;
  const recentFive = filteredMatches.map((m) => scoreForTeam(m, seed.number)).filter((s): s is NonNullable<typeof s> => Boolean(s)).slice(0, 5);
  const recentForm = recentFive.length ? `${recentFive.filter((s) => s.won).length}-${recentFive.length - recentFive.filter((s) => s.won).length}` : "—";
  const teamNotes = useMemo(() => scoutNotes.filter((note) => note.teamId.toUpperCase() === seed.number.toUpperCase()).sort((a, b) => b.createdAt - a.createdAt), [scoutNotes, seed.number]);
  const trendRows = useMemo(() => filteredMatches
    .map((match) => ({ match, score: scoreForTeam(match, seed.number) }))
    .filter((row): row is { match: RoboMatch; score: NonNullable<ReturnType<typeof scoreForTeam>> } => Boolean(row.score))
    .sort((a, b) => matchOrderValue(a.match) - matchOrderValue(b.match))
    .map((row) => ({ score: row.score.ours, label: matchLabel(row.match), result: row.score.won ? "Win" : "Loss" })), [filteredMatches, seed.number]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([teamEvents(seed.id), teamAwards(seed.id)]).then(([events, awards]) => {
      if (!alive) return;
      setProfile({ team: seed, events, matches: [], awards });
      setSelectedYear(mostRecentSchoolYear(events));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [seed.id]);

  // Fetch matches for the selected season (RobotEvents paginates oldest-first, so
  // we must filter by season id to get the right year's matches).
  useEffect(() => {
    let alive = true;
    if (!selectedYear || !profile.events.length) return;
    const seasonId = profile.events.find((e) => schoolYear(e.start) === selectedYear)?.season?.id;
    teamMatches(seed.id, seasonId).then((matches) => {
      if (alive) setProfile((p) => ({ ...p, matches }));
    });
    return () => { alive = false; };
  }, [seed.id, selectedYear, profile.events]);

  useEffect(() => {
    if (!profile.events.length || loading) return;
    if (!selectedYear && years.length) setSelectedYear(years[0]);
  }, [loading, profile.events.length, selectedYear, years]);

  useEffect(() => {
    let alive = true;
    const fallback = stats.scored.length
      ? `${seed.number} is ${stats.wins}-${stats.losses} in ${selectedYear || "this school year"} with a ${stats.winRate}% win rate, ${stats.avg ?? "unknown"} average alliance score, ${stats.max ?? "unknown"} max score, ${recentForm} recent form, and ${scoreStdDev == null ? "not enough data for score consistency" : `about +/-${scoreStdDev} score consistency`}. They appear in ${filteredEvents.length} official event${filteredEvents.length === 1 ? "" : "s"} and ${filteredAwards.length} award record${filteredAwards.length === 1 ? "" : "s"} for this view.`
      : `${seed.number} is listed in ${filteredEvents.length} official event${filteredEvents.length === 1 ? "" : "s"} for ${selectedYear || "this school year"} with ${filteredAwards.length} award record${filteredAwards.length === 1 ? "" : "s"} visible in RobotEvents. Match scores are not posted in this view yet, so MatchMind is using tournament participation, awards, and scout notes until scored match data appears.`;
    setAiSummary(fallback);
    if (loading || (!stats.scored.length && !filteredEvents.length && !filteredAwards.length)) return;
    askCoach({
      messages: [{
        role: "user",
        content: `Create a polished, student-friendly MatchMind scouting summary for team ${seed.number} ${seed.team_name}. Use only this RobotEvents data and do not say "limited scored data" as the main answer. If matches are missing, analyze event activity and awards instead. Return one plain paragraph under 95 words. Do not use markdown, headings, bullets, numbered lists, quotes, or a confidence line. Stats: ${stats.wins} wins, ${stats.losses} losses, ${stats.winRate ?? "unknown"}% win rate, avg score ${stats.avg ?? "unknown"}, max score ${stats.max ?? "unknown"}, recent form ${recentForm}, score consistency ${scoreStdDev == null ? "unknown" : `+/-${scoreStdDev}`}, events ${filteredEvents.map((e) => `${e.name} (${shortDate(e.start)})`).join("; ") || "none"}, awards ${filteredAwards.map(awardTitle).join("; ") || "none"}, scout notes ${teamNotes.map((note) => `${note.matchLabel ?? "note"}: ${note.description}`).slice(0, 4).join("; ") || "none"}.`,
      }],
      context: `RobotEvents team profile for ${seed.number}. Selected school year: ${selectedYear}.`,
    })
      .then((r) => { if (alive) setAiSummary(cleanAiSummary(r.answer, fallback)); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [filteredAwards, filteredEvents, loading, recentForm, scoreStdDev, seed.number, seed.team_name, selectedYear, stats.avg, stats.losses, stats.max, stats.scored.length, stats.winRate, stats.wins, teamNotes]);

  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: "var(--rl-page-bottom)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "var(--rl-page-top) 16px 10px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
        </button>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "16px", color: "#e8eaf0", flex: 1 }}>Team Profile</p>
        {years.length ? (
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ appearance: "none", WebkitAppearance: "none", background: `linear-gradient(135deg, ${accent}18, #181c2e)`, border: `1px solid ${accent}45`, borderRadius: 11, color: "#e8eaf0", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, padding: "8px 26px 8px 11px", outline: "none", cursor: "pointer", backgroundImage: `linear-gradient(135deg, ${accent}18, #181c2e), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23${accent.replace('#', '')}' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
            {years.map((y) => <option key={y} value={y} style={{ background: "#181c2e", color: "#e8eaf0" }}>{yearGames[y] ? `${yearGames[y]} · ${y}` : y}</option>)}
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
          { label: "FORM", val: recentForm, color: "#00c8ff" },
          { label: "CONSIST", val: scoreStdDev == null ? "—" : `+/-${scoreStdDev}`, color: "#f59e0b" },
          { label: "AWARDS", val: filteredAwards.length, color: "#f59e0b" },
          { label: "EVENTS", val: filteredEvents.length, color: "#a855f7" },
        ].map(({ label, val, color }) => {
          const content = (
            <>
              <div style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color }}>{val}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0", marginTop: 2 }}>{label}</div>
            </>
          );
          const cardStyle = { background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", textAlign: "left" as const };
          return label === "AWARDS" ? (
            <button key={label} onClick={() => awardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ ...cardStyle, cursor: "pointer" }}>
              {content}
            </button>
          ) : (
            <div key={label} style={cardStyle}>{content}</div>
          );
        })}
      </div>

      <div ref={awardsRef} style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16, scrollMarginTop: 12 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>AI Summary</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#b0b4c8", lineHeight: 1.65 }}>
          {aiSummary}
        </p>
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>Score Trend</p>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0" }}>{selectedYear || "season"} · {trendRows.length} scored</span>
        </div>
        {trendRows.length ? (
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={trendRows}>
              <YAxis hide domain={["dataMin - 8", "dataMax + 8"]} />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                contentStyle={{ background: "#1a1e30", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                itemStyle={{ color: accent }}
                labelFormatter={(_, payload) => payload?.[0]?.payload ? `${payload[0].payload.label} · ${payload[0].payload.result}` : "Match"}
                formatter={(value: number) => [`${value}`, "Score"]}
              />
              <Line type="monotone" dataKey="score" stroke={accent} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#5c627e" }}>No official scored matches for this school year yet.</div>
        )}
      </div>

      <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Scout Notes</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {teamNotes.slice(0, 8).map((note) => (
            <button key={note.id} onClick={() => { setSelectedScoutNote(note); setNoteDraft(note.description); }} style={{ width: "100%", textAlign: "left", background: "#1a1e30", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: "10px 12px", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: note.description ? 6 : 0 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12.5, color: "#e8eaf0" }}>{note.matchLabel ?? "Team note"}</p>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: note.result === "win" ? "#10b981" : note.result === "loss" ? "#ff3b5c" : "#7a80a0", flexShrink: 0 }}>{note.score ?? note.date}</span>
              </div>
              {note.eventName ? <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginBottom: 5 }}>{note.eventName}</p> : null}
              {note.description ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#b0b4c8", lineHeight: 1.5 }}>{note.description}</p> : null}
            </button>
          ))}
          {!teamNotes.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0" }}>No MatchMind scout notes saved for this team yet.</p> : null}
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
          {filteredMatches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              highlightTeam={seed.number}
              accent={accent}
              headerAction={(
                <button onClick={() => setMatchNoteTarget(m)} aria-label={`Scout ${matchLabel(m)}`} style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <MoreVertical size={13} style={{ color: "#9aa0bf" }} />
                </button>
              )}
            />
          ))}
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
      {selectedScoutNote ? (
        <div onClick={() => setSelectedScoutNote(null)} style={{ position: "fixed", inset: 0, zIndex: 235, background: "rgba(5,6,13,0.78)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 402, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 22, padding: 16, boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent }}>{selectedScoutNote.teamId} · {selectedScoutNote.matchLabel ?? "Scout note"}</p>
                <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 18, color: "#fff", margin: "2px 0 0" }}>{selectedScoutNote.teamName}</h3>
              </div>
              <button onClick={() => setSelectedScoutNote(null)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={5} style={{ width: "100%", boxSizing: "border-box", background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, padding: "12px 13px", color: "#e8eaf0", outline: "none", resize: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => { deleteScoutNote(selectedScoutNote.id); setSelectedScoutNote(null); }} style={{ background: "#ff3b5c18", border: "1px solid #ff3b5c35", borderRadius: 13, padding: "12px", color: "#ff6b7a", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Delete</button>
              <button onClick={() => { updateScoutNote(selectedScoutNote.id, { description: noteDraft }); setSelectedScoutNote(null); }} style={{ background: accent, border: "none", borderRadius: 13, padding: "12px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save changes</button>
            </div>
          </div>
        </div>
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
  const { addScoutNote, team: appTeam, role: appRole, profile: appProfile } = useApp();
  const [profile, setProfile] = useState<EventProfile>({ event, teams: [], matches: [], awards: [], rankings: [], skills: [] });
  const [evTab, setEvTab] = useState<"teams" | "matches" | "rankings" | "skills" | "awards">("matches");
  const [metricSort, setMetricSort] = useState<"rank" | "opr" | "dpr" | "ccwm">("rank");
  const [loading, setLoading] = useState(true);
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [matchNoteTarget, setMatchNoteTarget] = useState<{ match: RoboMatch; team: RoboTeamResult } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSections, setExportSections] = useState({ teams: true, matches: true, rankings: true, analytics: true, skills: true, awards: true });
  const [eventPanelOpen, setEventPanelOpen] = useState(false);
  const [eventBackendStatus, setEventBackendStatus] = useState("");
  const [matchMindTeams, setMatchMindTeams] = useState<Array<{ teamNumber: string }>>([]);
  const [offerTarget, setOfferTarget] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offers, setOffers] = useState<AllianceOffer[]>([]);
  const [sentOffers, setSentOffers] = useState<AllianceOffer[]>([]);
  const [offerBusyId, setOfferBusyId] = useState("");
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerRead, setDisclaimerRead] = useState(false);
  const isStudent = appRole === "student";
  const [notifyOffers, setNotifyOffers] = useState(() => {
    try { return window.localStorage.getItem(ALLIANCE_NOTIFY_KEY) !== "off"; } catch { return true; }
  });
  const analytics = useMemo(() => eventAnalytics(profile), [profile.matches, profile.teams]);
  const livestreamUrl = useMemo(() => eventLivestreamUrl(event), [event]);
  // Day tabs come from the days that ACTUALLY have matches (derived from each
  // match's own date), so we never show empty days and every match lands under
  // the correct date. Falls back to the event's calendar range only when no
  // match carries a usable date.
  const eventDays = useMemo(() => {
    const keys = new Set<string>();
    for (const m of profile.matches) {
      const k = dateKey(m.scheduled ?? m.started ?? "");
      if (k) keys.add(k);
    }
    return keys.size ? [...keys].sort() : eventDayKeys(event);
  }, [profile.matches, event.end, event.start]);
  const hasDatedMatches = useMemo(() => profile.matches.some((m) => dateKey(m.scheduled ?? m.started ?? "")), [profile.matches]);
  const showDaySlider = eventDays.length > 1 && hasDatedMatches;
  const displayedMatches = useMemo(() => {
    if (!showDaySlider || !selectedDayKey) return profile.matches;
    return profile.matches.filter((m) => dateKey(m.scheduled ?? m.started ?? "") === selectedDayKey);
  }, [profile.matches, selectedDayKey, showDaySlider]);
  const skillsByTeam = useMemo(() => new Map(profile.skills.map((skill) => [skillTeamNumber(skill), skill])), [profile.skills]);
  const rankingRows = useMemo(() => {
    const byNumber = new Map(profile.teams.map((team) => [team.number, team]));
    profile.rankings.forEach((ranking) => {
      const number = rankingTeamNumber(ranking);
      if (number && ranking.team && !byNumber.has(number)) byNumber.set(number, ranking.team);
    });
    return profile.rankings.map((ranking) => {
      const number = rankingTeamNumber(ranking);
      const team = byNumber.get(number) ?? ranking.team;
      const metric = analytics.get(number) ?? { opr: 0, dpr: 0, ccwm: 0 };
      return { ranking, number, team, ...metric, skills: skillsByTeam.get(number) };
    }).sort((a, b) => {
      if (metricSort === "opr") return b.opr - a.opr;
      if (metricSort === "dpr") return b.dpr - a.dpr;
      if (metricSort === "ccwm") return b.ccwm - a.ccwm;
      return rankFor(a.ranking) - rankFor(b.ranking);
    });
  }, [analytics, metricSort, profile.rankings, profile.teams, skillsByTeam]);
  const skillRows = useMemo(() => [...profile.skills].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)), [profile.skills]);
  const qualifyingText = useMemo(() => {
    const qual = profile.awards.flatMap((a) => a.qualifications ?? []).join(" ").toLowerCase();
    const level = `${event.level ?? ""} ${event.event_type ?? ""}`.toLowerCase();
    return {
      states: /region|state|championship|qualif/.test(qual + " " + level),
      worlds: /world/.test(qual + " " + level),
    };
  }, [event.event_type, event.level, profile.awards]);

  function exportEventData() {
    const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const table = (head: string[], rows: string[][]) =>
      `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
        rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")
      }</tbody></table>`;
    const sections: string[] = [];

    if (exportSections.teams && profile.teams.length) {
      sections.push(`<h2>Teams · ${profile.teams.length}</h2>` + table(
        ["#", "Team", "Organization", "Location"],
        profile.teams.map((t) => [esc(t.number), esc(t.team_name), esc(t.organization), esc([t.location?.city, t.location?.region].filter(Boolean).join(", "))]),
      ));
    }
    if (exportSections.rankings && rankingRows.length) {
      sections.push(`<h2>Rankings</h2>` + table(
        ["Rank", "Team", "OPR", "DPR", "CCWM"],
        rankingRows.map((row) => [esc(rankFor(row.ranking)), esc(row.number), row.opr.toFixed(1), row.dpr.toFixed(1), row.ccwm.toFixed(1)]),
      ));
    }
    if (exportSections.matches && profile.matches.length) {
      sections.push(`<h2>Matches · ${profile.matches.length}</h2>` + table(
        ["Match", "Red", "Blue", "Score"],
        profile.matches.map((m) => {
          const model = matchDisplayModel(m);
          const red = model.format === "head_to_head" ? model.redTeams.map((t) => t.number) : (model.alliances[0]?.teams ?? []).map((t) => t.number);
          const blue = model.format === "head_to_head" ? model.blueTeams.map((t) => t.number) : (model.alliances[1]?.teams ?? []).map((t) => t.number);
          const score = model.red?.score != null && model.blue?.score != null ? `${model.red.score}–${model.blue.score}` : "—";
          return [esc(matchLabel(m)), esc(red.join(", ")), esc(blue.join(", ")), esc(score)];
        }),
      ));
    }
    if (exportSections.skills && skillRows.length) {
      sections.push(`<h2>Skills</h2>` + table(
        ["Rank", "Team", "Score"],
        skillRows.map((s) => [esc(s.rank ?? "—"), esc(skillTeamNumber(s)), esc(s.score ?? "—")]),
      ));
    }
    if (exportSections.awards && profile.awards.length) {
      sections.push(`<h2>Awards · ${profile.awards.length}</h2>` + table(
        ["Award", "Winner(s)"],
        profile.awards.map((a) => [esc(a.title ?? a.name ?? "Award"), esc(awardWinnerTeams(a).map((t) => t.number).join(", "))]),
      ));
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(event.name)} — MatchMind</title><style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #11131c; margin: 0; }
  .hd { border-bottom: 3px solid ${accent}; padding-bottom: 10px; margin-bottom: 16px; }
  .hd .brand { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: ${accent}; font-weight: 800; }
  h1 { font-size: 21px; margin: 4px 0 2px; }
  .meta { font-size: 11px; color: #5a607a; }
  h2 { font-size: 13px; margin: 20px 0 7px; color: ${accent}; border-left: 4px solid ${accent}; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { text-align: left; background: #f3f4f9; padding: 5px 7px; border-bottom: 2px solid #e2e4ee; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; color: #5a607a; }
  td { padding: 4px 7px; border-bottom: 1px solid #eef0f6; }
  tr { break-inside: avoid; }
  .ft { margin-top: 22px; font-size: 9px; color: #9aa0b8; text-align: center; }
</style></head><body>
  <div class="hd"><div class="brand">MatchMind Event Report</div>
  <h1>${esc(event.name)}</h1>
  <div class="meta">${esc([event.sku, eventLoc(event)].filter(Boolean).join(" · "))} · Exported ${esc(new Date().toLocaleString())}</div></div>
  ${sections.join("") || "<p>No sections selected.</p>"}
  <div class="ft">Generated by MatchMind · Unofficial data from RobotEvents</div>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    window.setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* ignore */ }
      window.setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ignore */ } }, 1500);
    }, 350);
    setExportOpen(false);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([eventTeams(event.id), eventMatches(event.id, event.divisions), eventAwards(event.id), eventRankings(event.id, event.divisions), eventSkills(event.id)]).then(([teams, matches, awards, rankings, skills]) => {
      if (!alive) return;
      setProfile({ event, teams, matches, awards, rankings, skills });
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { alive = false; };
  }, [event.id]);

  useEffect(() => {
    if (!showDaySlider) return;
    if (!selectedDayKey || !eventDays.includes(selectedDayKey)) setSelectedDayKey(eventDays[0] ?? "");
  }, [eventDays, selectedDayKey, showDaySlider]);

  const loadOffers = useCallback(async () => {
    if (!appTeam) { setOffers([]); setSentOffers([]); return; }
    const [incoming, sent] = await Promise.all([
      listAllianceOffers(event.id, appTeam.number).catch(() => ({ offers: [] })),
      listSentAllianceOffers(event.id, appTeam.number).catch(() => ({ offers: [] })),
    ]);
    setOffers(incoming.offers ?? []);
    setSentOffers(sent.offers ?? []);
  }, [appTeam, event.id]);

  useEffect(() => {
    let alive = true;
    if (!eventPanelOpen) return;
    // Register this signed-in user + team so they can receive alliance offers
    // (replaces the old chat-join registration). Role gates student-only
    // delivery; notify carries the opt-out preference.
    if (appTeam) {
      registerForAllianceOffers({
        eventId: event.id,
        teamNumber: appTeam.number,
        role: appRole ?? "student",
        displayName: appProfile?.name,
        notify: notifyOffers,
      }).catch(() => { /* backend may be offline; offers just won't flow */ });
    }
    Promise.all([
      getMatchMindEventTeams(event.id).catch(() => ({ teams: [] })),
      appTeam ? listAllianceOffers(event.id, appTeam.number).catch(() => ({ offers: [] })) : Promise.resolve({ offers: [] }),
      appTeam ? listSentAllianceOffers(event.id, appTeam.number).catch(() => ({ offers: [] })) : Promise.resolve({ offers: [] }),
    ]).then(([teams, incoming, sent]) => {
      if (!alive) return;
      setMatchMindTeams(teams?.teams ?? []);
      setOffers(incoming.offers ?? []);
      setSentOffers(sent.offers ?? []);
    });
    return () => { alive = false; };
  }, [appTeam, appProfile?.name, appRole, event.id, eventPanelOpen, notifyOffers]);

  // Poll for offer/response updates while the panel is open so the status view
  // and incoming offers stay live without a manual refresh.
  useEffect(() => {
    if (!eventPanelOpen || !appTeam) return;
    const id = window.setInterval(() => { void loadOffers(); }, 15000);
    return () => window.clearInterval(id);
  }, [appTeam, eventPanelOpen, loadOffers]);

  function toggleNotifyOffers(next: boolean) {
    setNotifyOffers(next);
    try { window.localStorage.setItem(ALLIANCE_NOTIFY_KEY, next ? "on" : "off"); } catch { /* ignore */ }
    if (appTeam) {
      registerForAllianceOffers({ eventId: event.id, teamNumber: appTeam.number, role: appRole ?? "student", displayName: appProfile?.name, notify: next }).catch(() => { /* ignore */ });
    }
  }

  async function doSendOffer() {
    if (!appTeam || !offerTarget.trim()) return;
    try {
      setEventBackendStatus("Sending alliance offer...");
      await sendAllianceOffer({ eventId: event.id, fromTeam: appTeam.number, toTeam: offerTarget.trim().toUpperCase(), message: offerMessage.trim() || `${appTeam.number} wants to talk alliance strategy.` });
      setOfferTarget("");
      setOfferMessage("");
      setEventBackendStatus("Offer sent. You'll see the team's response in your offer status below.");
      void loadOffers();
    } catch (error) {
      setEventBackendStatus(error instanceof Error ? error.message : "Alliance offer failed.");
    }
  }

  function attemptSendOffer() {
    if (!appTeam || !offerTarget.trim()) return;
    let agreed = false;
    try { agreed = window.localStorage.getItem(ALLIANCE_DISCLAIMER_KEY) === "yes"; } catch { /* ignore */ }
    if (!agreed) { setDisclaimerRead(false); setDisclaimerOpen(true); return; }
    void doSendOffer();
  }

  function agreeDisclaimerAndSend() {
    try { window.localStorage.setItem(ALLIANCE_DISCLAIMER_KEY, "yes"); } catch { /* ignore */ }
    setDisclaimerOpen(false);
    void doSendOffer();
  }

  async function respondOffer(offer: AllianceOffer, response: OfferResponse) {
    setOfferBusyId(offer.id);
    try {
      await respondToAllianceOffer({ eventId: event.id, fromTeam: offer.fromTeam, toTeam: offer.toTeam, response });
      await loadOffers();
    } catch (error) {
      setEventBackendStatus(error instanceof Error ? error.message : "Could not send your response.");
    } finally {
      setOfferBusyId("");
    }
  }

  return (
    <div style={{ overflowY: "auto", height: "100%", scrollbarWidth: "none" as const, paddingBottom: "var(--rl-page-bottom)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "var(--rl-page-top) 16px 10px" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: livestreamUrl ? "1fr 1fr" : "1fr 1fr 1fr", gap: 7, marginTop: 12 }}>
          {livestreamUrl ? (
            <button onClick={() => window.open(livestreamUrl, "_blank", "noopener,noreferrer")} style={{ background: `${accent}16`, border: `1px solid ${accent}35`, borderRadius: 11, padding: "9px 8px", color: accent, fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>Watch live</button>
          ) : null}
          <button onClick={() => window.open(googleCalendarUrl(event), "_blank", "noopener,noreferrer")} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "9px 8px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>Google Cal</button>
          <button onClick={() => downloadAppleCalendar(event)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "9px 8px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>Apple Cal</button>
          <button onClick={() => setExportOpen(true)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "9px 8px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>Export</button>
        </div>
        <button onClick={() => setEventPanelOpen((open) => !open)} style={{ width: "100%", marginTop: 8, background: eventPanelOpen ? `${accent}16` : "rgba(255,255,255,0.04)", border: `1px solid ${eventPanelOpen ? accent + "38" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "10px 12px", color: eventPanelOpen ? accent : "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
          MatchMind teams &amp; alliance offers
        </button>
      </div>

      {eventPanelOpen ? (
        <div style={{ margin: "0 16px 14px", background: "#111320", border: `1px solid ${accent}22`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 14, color: "#e8eaf0" }}>Tournament Community</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", lineHeight: 1.4 }}>See which teams at this event run MatchMind, and send private alliance offers near selection. Only first names and team numbers show.</p>
            </div>
          </div>
          {eventBackendStatus ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: eventBackendStatus.includes("blocked") || eventBackendStatus.includes("failed") || eventBackendStatus.includes("Could not") ? "#ff6b7a" : "#9aa0bf", lineHeight: 1.45 }}>{eventBackendStatus}</p> : null}
          <div style={{ background: "#1a1e30", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, padding: 12 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12.5, color: "#e8eaf0", marginBottom: 8 }}>Teams using MatchMind</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {matchMindTeams.slice(0, 30).map((row) => <span key={row.teamNumber} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: accent, background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: 999, padding: "4px 8px" }}>{row.teamNumber}</span>)}
              {!matchMindTeams.length ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#7a80a0" }}>No MatchMind teams registered at this event yet.</span> : null}
            </div>
          </div>
          <div style={{ background: "#1a1e30", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, padding: 12 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12.5, color: "#e8eaf0", marginBottom: 4 }}>Alliance offers</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9aa0bf", lineHeight: 1.4, marginBottom: 9 }}>Offers unlock 30 minutes before alliance selection and only reach teams registered on MatchMind. Accepting an offer here is unofficial and can change at the real selection.</p>
            <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1fr", gap: 7, marginBottom: 7 }}>
              <input value={offerTarget} onChange={(e) => setOfferTarget(e.target.value)} placeholder="Team" style={{ minWidth: 0, background: "#111320", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e8eaf0", padding: "9px 10px", outline: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
              <input value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="Short offer note" style={{ minWidth: 0, background: "#111320", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e8eaf0", padding: "9px 10px", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 12.5 }} />
            </div>
            <button onClick={attemptSendOffer} disabled={!appTeam || !offerTarget.trim()} style={{ width: "100%", background: appTeam && offerTarget.trim() ? accent : "rgba(255,255,255,0.06)", border: "none", borderRadius: 11, padding: "10px", color: appTeam && offerTarget.trim() ? "#08090f" : "#5c627e", fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 12.5, cursor: appTeam && offerTarget.trim() ? "pointer" : "default" }}>Send alliance offer</button>

            {/* Dynamic status of offers this team has SENT */}
            {sentOffers.length ? (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, color: "#9aa0bf", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Your offers · live status</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sentOffers.map((offer) => {
                    const meta = OFFER_STATUS_META[offer.status] ?? OFFER_STATUS_META.sent;
                    return (
                      <div key={offer.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#111320", border: `1px solid ${meta.color}30`, borderRadius: 10, padding: "9px 11px" }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "#e8eaf0", fontWeight: 700 }}>{offer.toTeam}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Exo 2', sans-serif", fontSize: 11, fontWeight: 800, color: meta.color }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color }} /> {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Incoming offers as organized notifications — only student accounts on
              the team see and answer these, and only when notifications are on. */}
          {isStudent && notifyOffers ? (
            <div style={{ background: "#1a1e30", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, padding: 12 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12.5, color: "#e8eaf0", marginBottom: 8 }}>Incoming alliance offers</p>
              {offers.filter((o) => o.status === "sent").map((offer) => (
                <div key={offer.id} style={{ background: "#111320", border: `1px solid ${accent}30`, borderRadius: 12, padding: 11, marginBottom: 8 }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#e8eaf0", marginBottom: offer.message ? 3 : 8 }}>
                    <strong style={{ color: accent }}>{offer.fromTeam}</strong> wants to alliance with you
                  </p>
                  {offer.message ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", marginBottom: 9, lineHeight: 1.4 }}>“{offer.message}”</p> : null}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {([["accepted", "Accept", "#10b981"], ["declined", "Decline", "#ff6b7a"], ["thinking", "Think about it", "#f59e0b"], ["meeting", "Meet up", "#38bdf8"]] as const).map(([resp, label, col]) => (
                      <button key={resp} disabled={offerBusyId === offer.id} onClick={() => respondOffer(offer, resp)} style={{ background: `${col}18`, border: `1px solid ${col}45`, color: col, borderRadius: 9, padding: "9px 6px", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, cursor: offerBusyId === offer.id ? "default" : "pointer", opacity: offerBusyId === offer.id ? 0.5 : 1 }}>{label}</button>
                    ))}
                  </div>
                </div>
              ))}
              {offers.filter((o) => o.status !== "sent").map((offer) => {
                const meta = OFFER_STATUS_META[offer.status] ?? OFFER_STATUS_META.sent;
                return (
                  <div key={offer.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#111320", borderRadius: 9, padding: "8px 10px", marginBottom: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "#cfd3e6" }}>{offer.fromTeam}</span>
                    <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 10.5, fontWeight: 800, color: meta.color }}>You: {meta.label}</span>
                  </div>
                );
              })}
              {!offers.length ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#7a80a0" }}>No incoming offers yet. Teams can reach you here near alliance selection.</p> : null}
            </div>
          ) : null}

          {/* Opt-out toggle — students can silence offer notifications */}
          {isStudent ? (
            <button onClick={() => toggleNotifyOffers(!notifyOffers)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111320", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#cfd3e6" }}>Alliance offer notifications</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 34, height: 18, borderRadius: 999, background: notifyOffers ? "#10b981" : "rgba(255,255,255,0.14)", position: "relative", transition: "0.2s" }}>
                  <span style={{ position: "absolute", top: 2, left: notifyOffers ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "0.2s" }} />
                </span>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11, color: notifyOffers ? "#10b981" : "#7a80a0" }}>{notifyOffers ? "ON" : "OFF"}</span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {disclaimerOpen ? (
        <div onClick={() => setDisclaimerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(4,5,12,0.72)", backdropFilter: "blur(6px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 402, background: "#0d0f1c", borderRadius: 22, border: `1px solid ${accent}35`, padding: "20px 18px", boxShadow: "0 18px 60px rgba(0,0,0,0.5)" }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 17, color: "#e8eaf0", marginBottom: 8 }}>Before you send an alliance offer</p>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#cfd3e6", lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <p>This feature is a convenience and <strong>might not work</strong>. It only reaches a team if that team uses MatchMind and is registered for this event.</p>
              <p>Anything agreed here — including an accepted offer — is <strong>unofficial</strong> and can change. Only the real, in-person alliance selection run by the event is binding.</p>
              <p>Offers open 30 minutes before alliance selection. Be respectful; messages are filtered and tied to your account.</p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={disclaimerRead} onChange={(e) => setDisclaimerRead(e.target.checked)} style={{ marginTop: 2, width: 17, height: 17, accentColor: accent, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#cfd3e6", lineHeight: 1.45 }}>I have read and understand these terms.</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setDisclaimerOpen(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={agreeDisclaimerAndSend} disabled={!disclaimerRead} style={{ background: disclaimerRead ? accent : "rgba(255,255,255,0.06)", border: "none", borderRadius: 12, padding: "12px", color: disclaimerRead ? "#08090f" : "#5c627e", fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13, cursor: disclaimerRead ? "pointer" : "default" }}>Agree &amp; send</button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ margin: "0 16px 14px", display: "flex", gap: 4, background: "#1a1e30", borderRadius: 12, padding: 3, overflowX: "auto", scrollbarWidth: "none" }}>
        {(["teams", "matches", "rankings", "skills", "awards"] as const).map((t) => (
          <button key={t} onClick={() => setEvTab(t)} style={{ flex: "1 0 auto", padding: "8px 10px", borderRadius: 9, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 11, textTransform: "capitalize", background: evTab === t ? accent : "transparent", color: evTab === t ? "#08090f" : "#7a80a0", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      {evTab === "rankings" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "#1a1e30", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
            {(["rank", "opr", "dpr", "ccwm"] as const).map((m) => (
              <button key={m} onClick={() => setMetricSort(m)} style={{ padding: "8px 4px", background: metricSort === m ? "rgba(255,255,255,0.14)" : "transparent", border: "none", borderRight: m !== "ccwm" ? "1px solid rgba(255,255,255,0.12)" : "none", color: metricSort === m ? "#fff" : "#9aa0bf", fontFamily: "'Exo 2', sans-serif", fontSize: 12, fontWeight: 800, textTransform: "uppercase", cursor: "pointer" }}>{m}</button>
            ))}
          </div>
          {rankingRows.map(({ ranking, number, team, opr, dpr, ccwm, skills }) => (
            <button key={`${number}-${ranking.rank}`} onClick={() => team && onTeamClick(team)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", textAlign: "left", cursor: team ? "pointer" : "default" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 7 }}>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 21, color: "#e8eaf0" }}>{number || "TBD"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#b0b4c8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team?.team_name && team.team_name !== number ? team.team_name : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: accent, fontWeight: 800 }}>#{ranking.rank ?? "—"} {ranking.wins ?? 0}-{ranking.losses ?? 0}-{ranking.ties ?? 0}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#9aa0bf" }}>{ranking.wp ?? "—"} WP</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#9aa0bf" }}>{ranking.ap ?? "—"} AP</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#9aa0bf" }}>{ranking.sp ?? skills?.score ?? "—"} SP</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: metricSort === "opr" ? accent : "#cfd3e6" }}>{opr.toFixed(1)} OPR</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: metricSort === "dpr" ? accent : "#cfd3e6" }}>{dpr.toFixed(1)} DPR</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: metricSort === "ccwm" ? accent : "#cfd3e6" }}>{ccwm.toFixed(1)} CCWM</span>
              </div>
            </button>
          ))}
          {!rankingRows.length ? <div style={{ textAlign: "center", padding: "44px 20px", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>Rankings are not posted yet. OPR/DPR/CCWM appear after scored matches are available.</div> : null}
        </div>
      )}

      {evTab === "skills" && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {skillRows.map((skill) => {
            const number = skillTeamNumber(skill);
            const team = profile.teams.find((t) => t.number === number) ?? skill.team;
            return (
              <button key={`${number}-${skill.rank}`} onClick={() => team && onTeamClick(team)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: team ? "pointer" : "default" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13, color: accent }}>#{skill.rank ?? "—"}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 18, color: "#e8eaf0" }}>{number || "TBD"} <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13, color: "#b0b4c8" }}>{team?.team_name && team.team_name !== number ? team.team_name : ""}</span></p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>Total Score: {skill.score ?? "—"}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#cfd3e6" }}>Driver {skill.driver ?? "—"}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#cfd3e6", marginTop: 4 }}>Prog {skill.programming ?? skill.autonomous ?? "—"}</p>
                </div>
              </button>
            );
          })}
          {!skillRows.length ? <div style={{ textAlign: "center", padding: "44px 20px", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>Robot Skills results are not posted yet.</div> : null}
        </div>
      )}

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
          {showDaySlider ? (
            <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2, marginBottom: 4 }}>
              {eventDays.map((day) => {
                const active = selectedDayKey === day;
                const count = profile.matches.filter((m) => dateKey(m.scheduled ?? m.started ?? "") === day).length;
                return (
                  <button key={day} onClick={() => setSelectedDayKey(day)} style={{ flexShrink: 0, minWidth: 112, background: active ? `${accent}18` : "#111320", border: `1px solid ${active ? accent + "45" : "rgba(255,255,255,0.08)"}`, borderRadius: 13, padding: "8px 10px", textAlign: "left", cursor: "pointer" }}>
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12, color: active ? accent : "#e8eaf0" }}>{dayLabel(day)}</p>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginTop: 2 }}>{count} match{count === 1 ? "" : "es"}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
          {displayedMatches.map((m) => {
            const model = matchDisplayModel(m);
            const allTeams = model.format === "head_to_head"
              ? [...model.redTeams, ...model.blueTeams]
              : model.alliances.flatMap((alliance) => alliance.teams);
            return (
              <MatchCard
                key={m.id}
                match={m}
                rankings={profile.rankings}
                highlightTeam={appTeam?.number}
                accent={accent}
                onTeamClick={(num) => {
                  const team = allTeams.find((t) => t.number === num);
                  if (team) setMatchNoteTarget({ match: m, team });
                }}
                headerAction={(
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.06em", color: "#5c627e" }}>TAP A TEAM TO SCOUT</span>
                )}
              />
            );
          })}
          {!displayedMatches.length ? <div style={{ textAlign: "center", padding: "44px 20px", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>{showDaySlider ? `No matches scheduled for ${dayLabel(selectedDayKey)}.` : "No matches returned by RobotEvents yet."}</div> : null}
        </div>
      )}
      {matchNoteTarget ? (
        <MatchScoutSheet
          team={matchNoteTarget.team}
          match={matchNoteTarget.match}
          accent={accent}
          onClose={() => setMatchNoteTarget(null)}
          onSave={(note) => { addScoutNote(note); setMatchNoteTarget(null); }}
        />
      ) : null}
      {exportOpen ? (
        <div onClick={() => setExportOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 235, background: "rgba(5,6,13,0.78)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 402, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 22, padding: 16, boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent }}>EVENT EXPORT</p>
                <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 18, color: "#fff", margin: "2px 0 0" }}>{event.sku || "Tournament data"}</h3>
              </div>
              <button onClick={() => setExportOpen(false)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {Object.entries(exportSections).map(([key, enabled]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 9, background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: "10px 12px", cursor: "pointer" }}>
                  <input type="checkbox" checked={enabled} onChange={(e) => setExportSections((prev) => ({ ...prev, [key]: e.target.checked }))} />
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: "#e8eaf0", textTransform: "capitalize" }}>{key === "analytics" ? "OPR / DPR / CCWM" : key}</span>
                </label>
              ))}
            </div>
            <button onClick={exportEventData} style={{ width: "100%", background: accent, border: "none", borderRadius: 13, padding: "13px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>Download export</button>
          </div>
        </div>
      ) : null}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function LookupPage({ resetKey = 0, onNavigate }: { resetKey?: number; onNavigate?: (page: string) => void } = {}) {
  const { accent } = useAccent();
  const { team: appTeam, favorites, toggleFavorite, isFavorite } = useApp();
  const initialPath = resetKey === 0 && typeof window !== "undefined" ? window.location.pathname : "";
  const pathTeam = initialPath.match(/\/teams\/([^/]+)/)?.[1] ?? "";
  const pathEvent = initialPath.match(/\/events\/([^/]+)/)?.[1] ?? "";
  const [tab, setTab] = useState<"teams" | "events">(pathEvent ? "events" : "teams");
  const [query, setQuery] = useState(decodeURIComponent(pathTeam || pathEvent || ""));
  const [teamResults, setTeamResults] = useState<RoboTeamResult[]>([]);
  const [eventResults, setEventResults] = useState<RoboEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<RoboTeamResult | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<RoboEvent | null>(null);
  const [programFilter, setProgramFilter] = useState<ProgramCode>("ALL");
  const [gradeFilter, setGradeFilter] = useState<GradeLevel>("All");
  // Tournament date filter — so you can narrow by when an event happens even
  // when you don't remember the exact date.
  const [dateWindow, setDateWindow] = useState<"all" | "upcoming" | "month" | "past">("all");

  const visibleEvents = useMemo(() => {
    if (dateWindow === "all") return eventResults;
    const now = Date.now();
    const monthAhead = now + 31 * 24 * 60 * 60 * 1000;
    return eventResults.filter((ev) => {
      const start = ev.start ? new Date(ev.start).getTime() : NaN;
      const end = ev.end ? new Date(ev.end).getTime() : start;
      if (Number.isNaN(start)) return true; // keep undated events visible rather than hide real results
      if (dateWindow === "upcoming") return end >= now;
      if (dateWindow === "past") return end < now;
      if (dateWindow === "month") return start >= now && start <= monthAhead;
      return true;
    });
  }, [eventResults, dateWindow]);

  useEffect(() => {
    let alive = true;
    const q = query.trim();
    setLoading(Boolean(q && q.length >= 2));
    const timer = setTimeout(async () => {
      if (tab === "teams") {
        const results = q.length >= 2 ? await searchTeams(q, { program: programFilter, grade: gradeFilter }) : appTeam ? [appTeam as RoboTeam] : [];
        if (alive) setTeamResults(results);
      } else {
        const [robotEventsResults, teamScopedEvents] = q.length >= 2
          ? await Promise.all([
              searchEvents(q, { program: programFilter, grade: gradeFilter }),
              appTeam ? teamEvents(appTeam.id).then((events) => filterEventsForQuery(events, q, { program: programFilter, grade: gradeFilter })) : Promise.resolve([]),
            ])
          : [[], appTeam ? await teamEvents(appTeam.id) : []];
        const seen = new Set<number | string>();
        const results = [...teamScopedEvents, ...robotEventsResults].filter((event) => {
          const key = event.id || event.sku;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (alive) setEventResults(results);
      }
      if (alive) setLoading(false);
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [appTeam, gradeFilter, programFilter, query, tab]);

  useEffect(() => {
    if (!pathTeam || selectedTeam || !teamResults.length) return;
    const exact = teamResults.find((t) => t.number.toUpperCase() === decodeURIComponent(pathTeam).toUpperCase()) ?? teamResults[0];
    setSelectedTeam(exact);
  }, [pathTeam, selectedTeam, teamResults]);

  useEffect(() => {
    if (!pathEvent || selectedEvent || !eventResults.length) return;
    const decoded = decodeURIComponent(pathEvent).toLowerCase();
    const exact = eventResults.find((ev) => ev.sku?.toLowerCase() === decoded || ev.name.toLowerCase() === decoded);
    if (exact) setSelectedEvent(exact);
  }, [eventResults, pathEvent, selectedEvent]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: "var(--rl-page-bottom)" }}>
      <div style={{ padding: "var(--rl-page-top) 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>LIVE ROBOTEVENTS</p>
        <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2, marginBottom: 14 }}>Lookup</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 14, padding: "10px 14px" }}>
          {loading ? <Loader2 size={16} style={{ color: accent, animation: "spin 1s linear infinite", flexShrink: 0 }} /> : <Search size={16} style={{ color: "#7a80a0", flexShrink: 0 }} />}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "teams" ? "Search team number, name, or school…" : "Search event name, city, or SKU…"} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0" }} />
          {query && <button onClick={() => setQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={14} style={{ color: "#7a80a0" }} /></button>}
        </div>

        <div style={{ display: "flex", background: "#1a1e30", borderRadius: 12, padding: 3, marginTop: 10 }}>
          {(["teams", "events"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px", borderRadius: 9, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, background: tab === t ? accent : "transparent", color: tab === t ? "#08090f" : "#7a80a0", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
              {t === "teams" ? "Teams" : "Events"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {PROGRAM_OPTIONS.map((option) => {
              const active = option.value === programFilter;
              return <button key={option.value} onClick={() => setProgramFilter(option.value)} style={{ flexShrink: 0, minHeight: 30, padding: "6px 10px", borderRadius: 999, background: active ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "40" : "rgba(255,255,255,0.08)"}`, color: active ? accent : "#8a90aa", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, cursor: "pointer" }}>{option.label}</button>;
            })}
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {GRADE_OPTIONS.map((option) => {
              const active = option === gradeFilter;
              return <button key={option} onClick={() => setGradeFilter(option)} style={{ flexShrink: 0, minHeight: 30, padding: "6px 10px", borderRadius: 999, background: active ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "40" : "rgba(255,255,255,0.08)"}`, color: active ? accent : "#8a90aa", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, cursor: "pointer" }}>{option}</button>;
            })}
          </div>
          {tab === "events" ? (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
              {([["all", "All dates"], ["upcoming", "Upcoming"], ["month", "Next 30 days"], ["past", "Past"]] as const).map(([value, label]) => {
                const active = value === dateWindow;
                return <button key={value} onClick={() => setDateWindow(value)} style={{ flexShrink: 0, minHeight: 30, padding: "6px 10px", borderRadius: 999, background: active ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "40" : "rgba(255,255,255,0.08)"}`, color: active ? accent : "#8a90aa", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, cursor: "pointer" }}>{label}</button>;
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        {query.trim().length >= 2 && (teamResults.length || eventResults.length || loading) ? (
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em" }}>
            {!loading ? <Sparkles size={12} style={{ color: accent }} /> : null}
            {loading ? "SEARCHING ROBOTEVENTS" : "BEST MATCHES FROM ROBOTEVENTS"}
          </p>
        ) : null}
        {!query.trim() && favorites.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em" }}><Star size={12} style={{ color: "#f59e0b", fill: "#f59e0b" }} /> FAVORITES</p>
            {favorites.filter((fav) => fav.kind === tab.slice(0, -1)).slice(0, 6).map((fav: Favorite) => (
              <button key={fav.id} onClick={() => { if (!fav.payload) return; fav.kind === "team" ? setSelectedTeam(fav.payload as RoboTeamResult) : setSelectedEvent(fav.payload as RoboEvent); }} style={{ width: "100%", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 14px", textAlign: "left", cursor: fav.payload ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 }}>
                <Star size={14} style={{ color: "#f59e0b", fill: "#f59e0b", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13.5, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav.label}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fav.sublabel || [fav.program, fav.grade].filter(Boolean).join(" · ")}</p>
                </div>
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
              </button>
            ))}
          </div>
        ) : null}
        {tab === "teams" && teamResults.map((team, index) => (
          <TeamCard
            key={`${team.number}-${team.id}`}
            team={team}
            accent={accent}
            query={query}
            index={index}
            favorite={isFavorite("team", team.number)}
            onToggleFavorite={() => toggleFavorite({ kind: "team", label: team.number, sublabel: `${team.team_name || team.organization || ""}`, program: team.program?.code, grade: team.grade, payload: team })}
            onClick={() => setSelectedTeam(team)}
          />
        ))}
        {tab === "teams" && !teamResults.length ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <Users size={34} style={{ color: "#2a2f48", marginBottom: 12 }} />
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginBottom: 6 }}>Search a real team</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0", lineHeight: 1.5 }}>Enter an exact RobotEvents team number like 24B or 8059A. Team names are always shown beside team numbers.</p>
          </div>
        ) : null}

        {tab === "events" && visibleEvents.map((ev, index) => (
          <button className="lookupResultCard" key={ev.id} onClick={() => setSelectedEvent(ev)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%", animation: "lookupResultIn 0.3s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${Math.min(index * 35, 180)}ms`, transition: "transform 0.18s ease, border-color 0.18s ease, background 0.18s ease" }}>
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
              <button
                aria-label={isFavorite("event", ev.sku || ev.name) ? "Remove favorite" : "Add favorite"}
                onClick={(e) => { e.stopPropagation(); toggleFavorite({ kind: "event", label: ev.sku || ev.name, sublabel: `${ev.name} · ${eventLoc(ev)}`, program: ev.program?.code, grade: ev.grade, payload: ev }); }}
                style={{ background: "transparent", border: "none", padding: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Star size={15} style={{ color: isFavorite("event", ev.sku || ev.name) ? "#f59e0b" : "rgba(255,255,255,0.18)", fill: isFavorite("event", ev.sku || ev.name) ? "#f59e0b" : "none" }} />
              </button>
              <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: 999, padding: "3px 7px" }}>
                <Sparkles size={10} style={{ color: accent }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: accent }}>{eventSuggestionReason(ev, query)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={11} style={{ color: accent }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{ev.sku}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <TrendingUp size={11} style={{ color: "#10b981" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{ev.season?.name ?? "Season TBD"}</span>
              </div>
              {ev.program?.code ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{ev.program.code}</span> : null}
              {ev.grade ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b0b4c8" }}>{ev.grade}</span> : null}
            </div>
          </button>
        ))}
        {tab === "events" && !visibleEvents.length ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <Award size={34} style={{ color: "#2a2f48", marginBottom: 12 }} />
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginBottom: 6 }}>Search a tournament</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0", lineHeight: 1.5 }}>Search by event name or SKU. If your team is selected, their tournaments appear here first.</p>
          </div>
        ) : null}
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes lookupResultIn{from{opacity:0;transform:translateY(10px) scale(0.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        .lookupResultCard:active{transform:scale(0.985)}
        @media (hover:hover){.lookupResultCard:hover{transform:translateY(-1px);border-color:${accent}55!important;background:#15182a!important}}
      `}</style>
    </div>
  );
}
