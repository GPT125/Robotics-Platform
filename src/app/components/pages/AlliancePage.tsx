import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Trophy, Send, Users, ChevronDown } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp } from "../AppContext";
import { askCoach, eventMatches, eventRankings, eventSkills, eventTeams, matchAlliances, teamEvents, teamMatches, type RoboEvent, type RoboRanking, type RoboSkills, type RoboMatch, type RoboTeamResult } from "../../../services/api";

type Msg = { role: "user" | "ai"; text: string };

function mdToHtml(text: string, accent: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(text).replace(/\r/g, "").split("\n").map((raw) => {
    const line = raw.trim();
    const inline = (s: string) => s
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${accent}">$1</strong>`)
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px">$1</code>');
    if (!line) return '<div style="height:6px"></div>';
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) return `<div style="font-weight:800;margin-top:8px;color:#f0f2f8;font-size:15px">${inline(h[2])}</div>`;
    const b = line.match(/^[-*]\s+(.*)/) || line.match(/^\d+\.\s+(.*)/);
    if (b) return `<div style="margin:3px 0 3px 12px">• ${inline(b[1])}</div>`;
    if (/^confidence:/i.test(line)) return "";
    return `<div style="margin:3px 0">${inline(line)}</div>`;
  }).join("");
}

function rankNum(r: RoboRanking) { return r.rank ?? 9999; }
function rTeam(r: RoboRanking) { return r.team?.number ?? r.team_number ?? ""; }
function skillTeam(s: RoboSkills) { return s.team?.number ?? s.team_number ?? ""; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function scoreForTeam(match: RoboMatch, number: string) {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  if (Number.isNaN(redScore) || Number.isNaN(blueScore)) return null;
  const redSide = redTeams.some((t) => t.number === number);
  const blueSide = blueTeams.some((t) => t.number === number);
  if (!redSide && !blueSide) return null;
  const ours = redSide ? redScore : blueScore;
  const theirs = redSide ? blueScore : redScore;
  return { ours, theirs, won: ours > theirs };
}

function historySummary(matches: RoboMatch[], number: string) {
  const scored = matches.map((m) => scoreForTeam(m, number)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const wins = scored.filter((s) => s.won).length;
  const avg = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.ours, 0) / scored.length) : null;
  return scored.length ? `${wins}-${scored.length - wins}, ${Math.round((wins / scored.length) * 100)}% win, avg ${avg}` : "no scored history loaded";
}

function acceptanceOdds(ourRank: number | null, theirRank: number | null) {
  if (!ourRank || !theirRank || ourRank > 9000 || theirRank > 9000) return 50;
  const diff = theirRank - ourRank;
  if (diff < 0) return clamp(54 + diff * 5, 12, 58);
  return clamp(72 + diff * 1.8, 58, 94);
}

export function AlliancePage({ onBack }: { onBack: () => void }) {
  const { accent } = useAccent();
  const { team } = useApp();
  const [events, setEvents] = useState<RoboEvent[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rankings, setRankings] = useState<RoboRanking[]>([]);
  const [skills, setSkills] = useState<RoboSkills[]>([]);
  const [eventTeamList, setEventTeamList] = useState<RoboTeamResult[]>([]);
  const [eventMatchList, setEventMatchList] = useState<RoboMatch[]>([]);
  const [histories, setHistories] = useState<Record<string, string>>({});
  const [ourMatches, setOurMatches] = useState<RoboMatch[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const selectedEvent = useMemo(() => events.find((e) => e.id === eventId), [events, eventId]);

  async function buildHistories(sourceRankings: RoboRanking[], sourceTeams: RoboTeamResult[]) {
    const candidates = sourceRankings
      .slice(0, 14)
      .map((r) => sourceTeams.find((t) => t.number === rTeam(r)) ?? r.team)
      .filter((t): t is RoboTeamResult => Boolean(t?.id && t.number && t.number !== team?.number));
    const entries = await Promise.all(candidates.map(async (candidate) => {
      try {
        const evs = await teamEvents(candidate.id);
        const seasons: number[] = [];
        for (const event of evs) {
          const seasonId = event.season?.id;
          if (seasonId && !seasons.includes(seasonId)) seasons.push(seasonId);
          if (seasons.length >= 3) break;
        }
        const matches = (await Promise.all(seasons.map((seasonId) => teamMatches(candidate.id, seasonId)))).flat();
        return [candidate.number, historySummary(matches, candidate.number)] as const;
      } catch {
        return [candidate.number, "recent RobotEvents history unavailable"] as const;
      }
    }));
    return Object.fromEntries(entries);
  }

  async function refreshEventData() {
    if (!eventId) return { r: rankings, s: skills, teams: eventTeamList, matches: eventMatchList, h: histories };
    setLoadingData(true);
    const divisions = selectedEvent?.divisions;
    try {
      const [r, s, teams, matches] = await Promise.all([eventRankings(eventId, divisions), eventSkills(eventId), eventTeams(eventId), eventMatches(eventId, divisions)]);
      const h = await buildHistories(r, teams);
      setRankings(r);
      setSkills(s);
      setEventTeamList(teams);
      setEventMatchList(matches);
      setHistories(h);
      return { r, s, teams, matches, h };
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { if (team) teamEvents(team.id).then((e) => { setEvents(e); setEventId((id) => id ?? e[0]?.id ?? null); }); }, [team]);
  useEffect(() => { if (team) teamMatches(team.id).then(setOurMatches); }, [team]);
  useEffect(() => {
    if (!eventId) return;
    setLoadingData(true); setMessages([]);
    const divisions = selectedEvent?.divisions;
    Promise.all([eventRankings(eventId, divisions), eventSkills(eventId), eventTeams(eventId), eventMatches(eventId, divisions)])
      .then(([r, s, teams, matches]) => { setRankings(r); setSkills(s); setEventTeamList(teams); setEventMatchList(matches); })
      .finally(() => setLoadingData(false));
  }, [eventId, selectedEvent?.divisions]);
  useEffect(() => {
    let alive = true;
    if (!rankings.length || !eventTeamList.length) { setHistories({}); return; }
    (async () => {
      const next = await buildHistories(rankings, eventTeamList);
      if (alive) setHistories(next);
    })();
    return () => { alive = false; };
  }, [eventTeamList, rankings, team?.number]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, generating]);

  const ourRank = useMemo(() => rankings.find((r) => rTeam(r) === team?.number), [rankings, team]);
  const skillMap = useMemo(() => new Map(skills.map((s) => [skillTeam(s), s])), [skills]);
  const shortlist = useMemo(() => {
    const ourRankNum = ourRank?.rank ?? null;
    return rankings
      .filter((r) => rTeam(r) && rTeam(r) !== team?.number)
      .map((r) => {
        const number = rTeam(r);
        const t = eventTeamList.find((row) => row.number === number) ?? r.team;
        const sk = skillMap.get(number);
        const accept = acceptanceOdds(ourRankNum, r.rank ?? null);
        const rankScore = r.rank ? Math.max(0, 100 - r.rank * 2) : 45;
        const skillScore = sk?.score ? Math.min(100, sk.score / 2) : 40;
        const recordScore = ((r.wins ?? 0) * 10) - ((r.losses ?? 0) * 6);
        const score = Math.round(rankScore * 0.4 + skillScore * 0.25 + accept * 0.25 + recordScore * 0.1);
        return { ranking: r, team: t, number, skill: sk, accept, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [eventTeamList, ourRank?.rank, rankings, skillMap, team?.number]);

  function candidateSummary(sourceRankings = rankings, sourceSkills = skills, sourceHistories = histories) {
    const sk = new Map(sourceSkills.map((s) => [s.team?.number ?? s.team_number ?? "", s]));
    return sourceRankings.slice(0, 40).map((r) => {
      const num = rTeam(r);
      const s = sk.get(num);
      const accept = acceptanceOdds(ourRank?.rank ?? null, r.rank ?? null);
      return `${num} (rank ${r.rank}, ${r.wins ?? "?"}-${r.losses ?? "?"}, ${r.wp ?? "?"}WP${s ? `, skills ${s.score ?? "?"}` : ""}, acceptance ${accept}%, 3-year history: ${sourceHistories[num] ?? "loading/not available"})`;
    }).join("; ");
  }

  async function generate() {
    if (!team || !selectedEvent || generating) return;
    setGenerating(true);
    setMessages([{ role: "ai", text: "Searching current RobotEvents rankings, skills, match schedule, and recent team history before building the plan…" }]);
    const fresh = await refreshEventData().catch(() => ({ r: rankings, s: skills, teams: eventTeamList, matches: eventMatchList, h: histories }));
    const prompt = `I am team ${team.number} (${team.team_name}). We are at "${selectedEvent.name}".${ourRank ? ` Our current rank is ${ourRank.rank} with ${ourRank.wins ?? "?"}-${ourRank.losses ?? "?"} record.` : ""}
Here are the teams at this event with official RobotEvents stats, acceptance odds, and recent 3-year summaries where available: ${candidateSummary(fresh.r, fresh.s, fresh.h) || "rankings not posted yet"}.
Our current event matches loaded: ${fresh.matches.length}. Our historical match summary: ${team ? historySummary(ourMatches, team.number) : "unknown"}.

Act as an expert VEX alliance-selection strategist. Recommend the best alliance partners for us going into elimination selection. Requirements:
- Rank your TOP 5 picks from best to last-resort.
- For EACH pick give: the team number, a 1-line reason why they complement us, and an estimated "Acceptance odds" % (how likely they'd accept OUR invite given their rank vs ours — a much higher-ranked team is less likely to accept a lower-ranked team).
- Skip teams clearly out of reach or already likely to be alliance captains above us, and say why.
- End with one short "Strategy" line on who to target first.
Format with a clear numbered list and bold team numbers. Do not show confidence.`;
    try {
      const r = await askCoach({ messages: [{ role: "user", content: prompt }], context: `Alliance selection at ${selectedEvent.name} for ${team.number}. Official data: ${fresh.r.length} rankings, ${fresh.s.length} skills rows, ${fresh.matches.length} matches, ${fresh.teams.length} teams.` });
      setMessages([{ role: "ai", text: r.answer }]);
    } catch {
      setMessages([{ role: "ai", text: "I couldn't reach the AI right now. Check your connection and try again." }]);
    } finally { setGenerating(false); }
  }

  async function discuss() {
    const q = input.trim();
    if (!q || generating) return;
    setInput("");
    const history = messages.map((m) => ({ role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user", content: m.text }));
    setMessages((p) => [...p, { role: "user", text: q }]);
    setGenerating(true);
    try {
      const r = await askCoach({ messages: [...history, { role: "user", content: q }], context: `Alliance selection discussion at ${selectedEvent?.name} for ${team?.number}. Event teams: ${candidateSummary()}.` });
      setMessages((p) => [...p, { role: "ai", text: r.answer }]);
    } catch {
      setMessages((p) => [...p, { role: "ai", text: "Connection issue — try again." }]);
    } finally { setGenerating(false); }
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", paddingBottom: 0 }}>
      <div style={{ padding: "var(--rl-page-top) 16px 12px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "rgba(8,9,15,0.92)", backdropFilter: "blur(12px)", zIndex: 5, flexShrink: 0 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 11, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={18} style={{ color: "#e8eaf0" }} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", margin: 0 }}>Alliance Selector</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", margin: 0 }}>AI-ranked partners from live event stats</p>
        </div>
        <Trophy size={20} style={{ color: accent }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "0 16px 16px" }}>
        {!team ? (
          <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, color: "#9aa0bf", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>Select your team in Settings to use the Alliance Selector.</div>
        ) : (
          <>
            {/* Event picker */}
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setPickerOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "#111320", border: `1px solid ${accent}25`, borderRadius: 14, padding: "13px 14px", cursor: "pointer", textAlign: "left" }}>
                <Users size={17} style={{ color: accent }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedEvent?.name ?? "Choose an event"}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{rankings.length ? `${rankings.length} teams ranked` : loadingData ? "loading…" : "no rankings yet"}</p>
                </div>
                <ChevronDown size={16} style={{ color: "#7a80a0", transform: pickerOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
              </button>
              {pickerOpen ? (
                <div style={{ marginTop: 6, background: "#0d0f1c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, maxHeight: 220, overflowY: "auto", scrollbarWidth: "none" }}>
                  {events.map((e) => (
                    <button key={e.id} onClick={() => { setEventId(e.id); setPickerOpen(false); }} style={{ width: "100%", textAlign: "left", background: e.id === eventId ? `${accent}14` : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "11px 14px", cursor: "pointer", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>{e.name}</button>
                  ))}
                  {!events.length ? <div style={{ padding: 14, color: "#7a80a0", fontSize: 12 }}>No events found for {team.number}.</div> : null}
                </div>
              ) : null}
            </div>

            {shortlist.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em" }}>MATCHMIND SHORTLIST</p>
                {shortlist.map((row, idx) => (
                  <div key={row.number} style={{ background: "#111320", border: `1px solid ${idx === 0 ? accent + "40" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 18, color: "#e8eaf0" }}>{idx + 1}. {row.number}</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#b0b4c8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.team?.team_name && row.team.team_name !== row.number ? row.team.team_name : ""}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: accent }}>Partner match {row.score}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#10b981" }}>Accept {row.accept}%</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#f59e0b" }}>Skills {row.skill?.score ?? "—"}</span>
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", lineHeight: 1.45, marginTop: 6 }}>Partner match blends rank, skills, record, and acceptance odds. Rank #{row.ranking.rank ?? "—"} with {row.ranking.wins ?? 0}-{row.ranking.losses ?? 0} record. {histories[row.number] ? `3-year: ${histories[row.number]}.` : "History loading from RobotEvents."}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Generate */}
            {!messages.length ? (
              <button onClick={generate} disabled={generating || loadingData || !selectedEvent} style={{ width: "100%", background: generating || !selectedEvent ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${accent}, #7c3aed)`, border: "none", borderRadius: 16, padding: "16px", color: generating || !selectedEvent ? "#5c627e" : "#fff", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, cursor: generating || !selectedEvent ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: !generating && selectedEvent ? `0 0 24px ${accent}40` : "none" }}>
                {generating ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Analyzing teams…</> : <><Sparkles size={18} /> Generate AI alliance plan</>}
              </button>
            ) : null}

            {/* Conversation */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {messages.map((m, i) => (
                m.role === "ai" ? (
                  <div key={i} style={{ background: "#111320", border: `1px solid ${accent}20`, borderRadius: 16, padding: 16, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: mdToHtml(m.text, accent) }} />
                ) : (
                  <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", background: accent, color: "#08090f", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500 }}>{m.text}</div>
                )
              ))}
              {generating && messages.length ? <div style={{ color: "#7a80a0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> thinking…</div> : null}
              <div ref={endRef} />
            </div>
          </>
        )}
      </div>

      {/* Discuss composer */}
      {messages.length ? (
        <div style={{ padding: "8px 14px calc(14px + env(safe-area-inset-bottom,0px))", background: "rgba(10,11,20,0.9)", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 16, padding: "6px 6px 6px 14px", alignItems: "center" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && discuss()} placeholder="Discuss the picks…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", fontSize: 13 }} />
            <button onClick={discuss} disabled={!input.trim() || generating} style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() && !generating ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", flexShrink: 0 }}><Send size={15} style={{ color: input.trim() && !generating ? "#08090f" : "#5c627e" }} /></button>
          </div>
        </div>
      ) : null}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
