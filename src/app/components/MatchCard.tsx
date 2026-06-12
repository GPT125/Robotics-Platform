import { useEffect, useMemo } from "react";
import { Clock, MapPin, Sparkles } from "lucide-react";
import { matchAlliances, matchLabel, type RoboMatch, type RoboRanking, type RoboTeamResult } from "../../services/api";
import { predictMatch, recordOutcome } from "../../services/predictor";

// One match widget used everywhere matches appear (Home, Lookup events, team
// profiles). Handles every VEX format: 2v2 (V5RC/VIQRC comp), 1v1 (VEX U),
// and cooperative VIQRC Teamwork matches (no opposing alliance). Shows an AI
// win-probability bar under unplayed head-to-head matches and hides it the
// moment a real score posts (feeding the result back into the predictor).

const RED = "#ff3b5c";
const BLUE = "#00a3ff";

function fmtTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TeamChip({ team, mine, accent, onClick }: { team: RoboTeamResult; mine: boolean; accent: string; onClick?: (n: string) => void }) {
  return (
    <button
      onClick={onClick ? () => onClick(team.number) : undefined}
      style={{
        background: mine ? `${accent}1c` : "rgba(255,255,255,0.05)",
        border: `1px solid ${mine ? accent : "rgba(255,255,255,0.1)"}`,
        borderRadius: 9,
        padding: "4px 9px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11.5,
        fontWeight: 700,
        color: mine ? "#fff" : "#ccd2e6",
        cursor: onClick ? "pointer" : "default",
        boxShadow: mine ? `0 0 12px ${accent}30` : "none",
      }}
    >
      {team.number}
    </button>
  );
}

export function MatchCard({
  match,
  rankings = [],
  highlightTeam,
  accent,
  onTeamClick,
}: {
  match: RoboMatch;
  rankings?: RoboRanking[];
  highlightTeam?: string;
  accent: string;
  onTeamClick?: (teamNumber: string) => void;
}) {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  const hasScores = !Number.isNaN(redScore) && !Number.isNaN(blueScore);
  const scored = Boolean(match.scored) || (hasScores && (redScore > 0 || blueScore > 0));
  const cooperative = redTeams.length === 0 || blueTeams.length === 0;
  const coopTeams = cooperative ? (redTeams.length ? redTeams : blueTeams) : [];
  const coopScore = cooperative ? (redTeams.length ? redScore : blueScore) : NaN;
  const redWon = scored && hasScores && redScore > blueScore;
  const blueWon = scored && hasScores && blueScore > redScore;
  const mine = (highlightTeam ?? "").toUpperCase();

  const prediction = useMemo(
    () => (!scored && !cooperative ? predictMatch(match, rankings) : null),
    [match, rankings, scored, cooperative],
  );

  // Feed final results back into the predictor so it learns from misses.
  useEffect(() => {
    if (scored) recordOutcome(match);
  }, [scored, match]);

  const time = fmtTime(match.scheduled ?? match.started);

  return (
    <div style={{ background: "linear-gradient(150deg, #12142400 0%, #111320 35%)", backgroundColor: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px 8px" }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: "#e8eaf0", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matchLabel(match)}</p>
        {match.field ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0" }}>
            <MapPin size={10} /> {match.field}
          </span>
        ) : null}
        {time ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0" }}>
            <Clock size={10} /> {time}
          </span>
        ) : null}
        {scored ? (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.08em", color: "#10b981", background: "#10b98114", border: "1px solid #10b98135", borderRadius: 6, padding: "2px 6px" }}>FINAL</span>
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.08em", color: "#9aa0bf", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 6px" }}>UPCOMING</span>
        )}
      </div>

      {cooperative ? (
        /* ===== VIQRC Teamwork (cooperative — one combined score) ===== */
        <div style={{ padding: "2px 13px 12px" }}>
          <div style={{ background: "rgba(0,163,255,0.07)", border: "1px solid rgba(0,163,255,0.22)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.1em", color: BLUE }}>TEAMWORK</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
              {coopTeams.map((t) => <TeamChip key={t.number} team={t} mine={t.number.toUpperCase() === mine} accent={accent} onClick={onTeamClick} />)}
            </div>
            {scored && !Number.isNaN(coopScore) ? (
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 22, color: "#fff" }}>{coopScore}</span>
            ) : null}
          </div>
        </div>
      ) : (
        /* ===== Head-to-head (1v1, 2v2, …) ===== */
        <div style={{ padding: "2px 13px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "stretch" }}>
            {/* Red alliance */}
            <div style={{ background: redWon ? `${RED}14` : "rgba(255,59,92,0.055)", border: `1px solid ${redWon ? `${RED}55` : "rgba(255,59,92,0.18)"}`, borderRadius: 12, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 7, boxShadow: redWon ? `0 0 18px ${RED}18` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.1em", color: RED }}>RED</span>
                {redWon ? <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 9.5, color: RED, background: `${RED}1c`, borderRadius: 5, padding: "1px 5px" }}>WIN</span> : null}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {redTeams.map((t) => <TeamChip key={t.number} team={t} mine={t.number.toUpperCase() === mine} accent={accent} onClick={onTeamClick} />)}
              </div>
              {scored && hasScores ? (
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, lineHeight: 1, color: redWon ? "#fff" : "#8d93ad", marginTop: "auto" }}>{redScore}</span>
              ) : null}
            </div>

            {/* Center */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 30 }}>
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 11, color: "#5c627e" }}>VS</span>
            </div>

            {/* Blue alliance */}
            <div style={{ background: blueWon ? `${BLUE}14` : "rgba(0,163,255,0.055)", border: `1px solid ${blueWon ? `${BLUE}55` : "rgba(0,163,255,0.18)"}`, borderRadius: 12, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 7, alignItems: "flex-end", boxShadow: blueWon ? `0 0 18px ${BLUE}18` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                {blueWon ? <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 9.5, color: BLUE, background: `${BLUE}1c`, borderRadius: 5, padding: "1px 5px" }}>WIN</span> : <span />}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.1em", color: BLUE }}>BLUE</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "flex-end" }}>
                {blueTeams.map((t) => <TeamChip key={t.number} team={t} mine={t.number.toUpperCase() === mine} accent={accent} onClick={onTeamClick} />)}
              </div>
              {scored && hasScores ? (
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, lineHeight: 1, color: blueWon ? "#fff" : "#8d93ad", marginTop: "auto" }}>{blueScore}</span>
              ) : null}
            </div>
          </div>

          {/* AI prediction bar — only while the match is unplayed */}
          {prediction ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 10.5, color: RED }}>{prediction.redPct}%</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: "0.06em", color: "#6a7090" }}>
                  <Sparkles size={9} /> AI WIN PREDICTION
                </span>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 10.5, color: BLUE }}>{prediction.bluePct}%</span>
              </div>
              <div style={{ position: "relative", height: 7, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                  <div style={{ width: `${prediction.redPct}%`, background: `linear-gradient(90deg, ${RED}, ${RED}90)`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                  <div style={{ flex: 1, background: `linear-gradient(90deg, ${BLUE}90, ${BLUE})`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${prediction.redPct}%`, width: 2, background: "#0c0e18", transform: "translateX(-1px)" }} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
