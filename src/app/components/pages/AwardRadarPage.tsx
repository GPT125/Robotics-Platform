import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, ChevronRight, Loader2, Search, Trophy } from "lucide-react";
import { useAccent } from "../AccentContext";
import { eventAwards, eventRankings, eventSkills, eventTeams, searchEvents, type GradeLevel, type ProgramCode, type RoboAward, type RoboEvent, type RoboRanking, type RoboSkills, type RoboTeamResult } from "../../../services/api";

function shortDate(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : "TBD";
}

function eventLoc(event: RoboEvent) {
  return [event.location?.city, event.location?.region].filter(Boolean).join(", ") || event.location?.country || "Location TBD";
}

function awardTitle(award: RoboAward) {
  return award.title ?? award.name ?? "Award";
}

function rankTeam(ranking: RoboRanking) {
  return ranking.team?.number ?? ranking.team_number ?? "";
}

function skillTeam(skill: RoboSkills) {
  return skill.team?.number ?? skill.team_number ?? "";
}

function criteriaFor(title: string) {
  const key = title.toLowerCase();
  if (key.includes("excellence")) return "Visible contender filter: strong ranking plus strong skills data. Final judged outcome also depends on notebook, interview, and student-centered evidence.";
  if (key.includes("design")) return "Visible contender filter: public data cannot confirm notebook/interview quality. Use this list as a shortlist, not a guarantee.";
  if (key.includes("skills")) return "Based on official RobotEvents skills rankings.";
  if (key.includes("tournament")) return "Based on current qualification ranking until elimination results are official.";
  return "Judged awards cannot be guaranteed from RobotEvents alone. MatchMind shows visible performance contenders and marks missing judge-only data clearly.";
}

function likelyTeams(award: RoboAward, teams: RoboTeamResult[], rankings: RoboRanking[], skills: RoboSkills[]) {
  const title = awardTitle(award).toLowerCase();
  const byNumber = new Map(teams.map((team) => [team.number, team]));
  const topRanked = rankings.slice().sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 8).map((r) => byNumber.get(rankTeam(r)) ?? r.team).filter((t): t is RoboTeamResult => Boolean(t));
  const topSkills = skills.slice().sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 8).map((s) => byNumber.get(skillTeam(s)) ?? s.team).filter((t): t is RoboTeamResult => Boolean(t));
  if (title.includes("skills")) return topSkills;
  if (title.includes("excellence")) {
    const skillSet = new Set(topSkills.map((team) => team.number));
    const overlap = topRanked.filter((team) => skillSet.has(team.number));
    return overlap.length ? overlap : topRanked;
  }
  return topRanked;
}

export function AwardRadarPage({ onBack }: { onBack: () => void }) {
  const { accent } = useAccent();
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<RoboEvent[]>([]);
  const [selected, setSelected] = useState<RoboEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<RoboTeamResult[]>([]);
  const [awards, setAwards] = useState<RoboAward[]>([]);
  const [rankings, setRankings] = useState<RoboRanking[]>([]);
  const [skills, setSkills] = useState<RoboSkills[]>([]);
  const filters = useMemo(() => ({ program: "ALL" as ProgramCode, grade: "All" as GradeLevel }), []);

  useEffect(() => {
    if (query.trim().length < 2) { setEvents([]); return; }
    let alive = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchEvents(query, filters).then((rows) => { if (alive) setEvents(rows); }).finally(() => { if (alive) setLoading(false); });
    }, 280);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [filters, query]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setLoading(true);
    Promise.all([eventTeams(selected.id), eventAwards(selected.id), eventRankings(selected.id, selected.divisions), eventSkills(selected.id)])
      .then(([t, a, r, s]) => {
        if (!alive) return;
        setTeams(t); setAwards(a); setRankings(r); setSkills(s);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selected]);

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "var(--rl-page-bottom)", overflowY: "auto", scrollbarWidth: "none" }}>
      <div style={{ padding: "var(--rl-page-top) 16px 12px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "rgba(8,9,15,0.92)", backdropFilter: "blur(12px)", zIndex: 4 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 11, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={18} style={{ color: "#e8eaf0" }} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", margin: 0 }}>Award Radar</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", margin: 0 }}>Official awards, criteria, and contenders</p>
        </div>
        <Award size={20} style={{ color: "#f59e0b" }} />
      </div>
      <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 14, padding: "11px 13px" }}>
          {loading ? <Loader2 size={16} style={{ color: accent, animation: "spin 1s linear infinite" }} /> : <Search size={16} style={{ color: "#7a80a0" }} />}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search active or upcoming tournament..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", fontSize: 13 }} />
        </div>
        {!selected ? events.map((event) => (
          <button key={event.id} onClick={() => setSelected(event)} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 15, padding: "13px 14px", display: "flex", alignItems: "center", gap: 11, cursor: "pointer", textAlign: "left" }}>
            <Trophy size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.name}</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginTop: 3 }}>{shortDate(event.start)} · {eventLoc(event)}</p>
            </div>
            <ChevronRight size={15} style={{ color: accent }} />
          </button>
        )) : null}
        {selected ? (
          <>
            <button onClick={() => setSelected(null)} style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "8px 10px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Change event</button>
            <div style={{ background: "linear-gradient(135deg,#111320,#12142a)", border: `1px solid ${accent}25`, borderRadius: 16, padding: 15 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 16, color: "#e8eaf0" }}>{selected.name}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9aa0bf", marginTop: 4 }}>{teams.length} teams · {rankings.length} ranked · {skills.length} skills rows</p>
            </div>
            {awards.map((award) => {
              const contenders = likelyTeams(award, teams, rankings, skills);
              return (
                <div key={`${awardTitle(award)}-${award.id ?? ""}`} style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 15, padding: 15 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 15, color: "#e8eaf0" }}>{awardTitle(award)}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", lineHeight: 1.5, marginTop: 6 }}>{criteriaFor(awardTitle(award))}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {contenders.slice(0, 6).map((team) => <span key={team.number} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: accent, background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: 999, padding: "4px 8px" }}>{team.number}</span>)}
                    {!contenders.length ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#7a80a0" }}>No visible contenders until rankings/skills are posted.</span> : null}
                  </div>
                </div>
              );
            })}
            {!awards.length && !loading ? <div style={{ textAlign: "center", padding: 32, color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>No official award list returned yet.</div> : null}
          </>
        ) : null}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
