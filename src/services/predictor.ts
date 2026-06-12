// MatchMind match predictor.
// Deterministic, stat-based win probability for unplayed matches, with a
// self-correcting calibration loop: every time a predicted match resolves,
// the outcome is recorded and the model's confidence scale adjusts so future
// estimates are better calibrated (wrong confident calls shrink confidence,
// consistently right calls restore it). Works for every VEX program:
// alliances may have 1 (VEX U), 2 (V5RC/VIQRC), or more teams.

import { matchAlliances, type RoboMatch, type RoboRanking } from "./api";

const STORE_KEY = "matchmind:predictor:v2";

type PredictorState = {
  scale: number; // logistic steepness divisor — higher = less confident
  resolved: Record<string, { pRed: number; redWon: boolean; at: number }>;
  pending: Record<string, number>; // matchKey -> last shown pRed
};

function loadState(): PredictorState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PredictorState>;
      return {
        scale: typeof parsed.scale === "number" && parsed.scale >= 6 && parsed.scale <= 60 ? parsed.scale : 18,
        resolved: parsed.resolved ?? {},
        pending: parsed.pending ?? {},
      };
    }
  } catch { /* fresh state */ }
  return { scale: 18, resolved: {}, pending: {} };
}

let state = loadState();

function persist() {
  try {
    const resolvedEntries = Object.entries(state.resolved).slice(-300);
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...state, resolved: Object.fromEntries(resolvedEntries) }));
  } catch { /* storage full/unavailable */ }
}

export function matchKey(match: RoboMatch): string {
  return String(match.id ?? `${match.event?.id}-${match.round}-${match.matchnum}-${match.instance}`);
}

function rankingNumber(r: RoboRanking): string {
  return (r.team?.number ?? r.team_number ?? "").toUpperCase();
}

// Rating from official event rankings: blend win%, average points, and WP.
function teamRating(ranking: RoboRanking | undefined, fieldAvgPoints: number): number | null {
  if (!ranking) return null;
  const wins = ranking.wins ?? 0;
  const losses = ranking.losses ?? 0;
  const ties = ranking.ties ?? 0;
  const played = wins + losses + ties;
  const winPct = played > 0 ? (wins + ties * 0.5) / played : 0.5;
  const avg = typeof ranking.average_points === "number" ? ranking.average_points : fieldAvgPoints;
  const avgNorm = fieldAvgPoints > 0 ? avg / fieldAvgPoints : 1;
  const wp = ranking.wp ?? played * winPct * 2;
  const wpNorm = played > 0 ? wp / (played * 2) : 0.5;
  // Weighted blend → roughly 0..2 range, centered near 1.
  return winPct * 1.0 + avgNorm * 0.6 + wpNorm * 0.4;
}

export type MatchPrediction = {
  redPct: number;  // 0..100
  bluePct: number; // 0..100
  basis: "rankings" | "even";
};

// Probability red beats blue for an UNPLAYED match. Returns null when the
// match is already scored or the alliances can't be identified (cooperative
// VIQRC teamwork matches have no opposing side to predict).
export function predictMatch(match: RoboMatch, rankings: RoboRanking[]): MatchPrediction | null {
  const { red, blue, redTeams, blueTeams } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  const isScored = Boolean(match.scored) || (!Number.isNaN(redScore) && !Number.isNaN(blueScore) && (redScore > 0 || blueScore > 0));
  if (isScored) return null;
  if (!redTeams.length || !blueTeams.length) return null; // cooperative / unknown

  const byNumber = new Map(rankings.map((r) => [rankingNumber(r), r]));
  const avgPts = rankings.length
    ? rankings.reduce((sum, r) => sum + (typeof r.average_points === "number" ? r.average_points : 0), 0) / rankings.length
    : 0;

  const side = (teams: typeof redTeams) => {
    const ratings = teams
      .map((t) => teamRating(byNumber.get(t.number.toUpperCase()), avgPts))
      .filter((r): r is number => r !== null);
    return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  };

  const ra = side(redTeams);
  const rb = side(blueTeams);
  if (ra === null || rb === null) {
    return { redPct: 50, bluePct: 50, basis: "even" };
  }

  // Logistic on the rating gap; `scale` is learned from outcomes.
  const diff = (ra - rb) * 100;
  const p = 1 / (1 + Math.exp(-diff / state.scale));
  const redPct = Math.round(Math.min(95, Math.max(5, p * 100)));
  const key = matchKey(match);
  if (state.pending[key] !== redPct) {
    state.pending[key] = redPct;
    persist();
  }
  return { redPct, bluePct: 100 - redPct, basis: "rankings" };
}

// Call when a previously-predicted match shows a final score. Feeds the
// result back into the model: confident wrong calls widen uncertainty,
// correct calls tighten it. Returns true if this outcome was newly learned.
export function recordOutcome(match: RoboMatch): boolean {
  const key = matchKey(match);
  if (state.resolved[key]) return false;
  const shown = state.pending[key];
  if (typeof shown !== "number") return false;
  const { red, blue } = matchAlliances(match);
  const redScore = Number(red?.score);
  const blueScore = Number(blue?.score);
  if (Number.isNaN(redScore) || Number.isNaN(blueScore) || redScore === blueScore) return false;

  const redWon = redScore > blueScore;
  const p = shown / 100;
  const confidence = Math.abs(p - 0.5); // 0..0.45
  const correct = (p >= 0.5) === redWon;

  // Calibration update: being confidently wrong is the expensive mistake.
  if (!correct && confidence > 0.1) {
    state.scale = Math.min(60, state.scale * (1 + confidence * 0.8));
  } else if (correct && confidence > 0.1) {
    state.scale = Math.max(8, state.scale * (1 - confidence * 0.15));
  }

  state.resolved[key] = { pRed: shown, redWon, at: Date.now() };
  delete state.pending[key];
  persist();
  return true;
}

// Accuracy summary for the AI context ("the model is 14/19 this event").
export function predictorStats(): { total: number; correct: number; scale: number } {
  const entries = Object.values(state.resolved);
  const correct = entries.filter((e) => (e.pRed >= 50) === e.redWon).length;
  return { total: entries.length, correct, scale: Math.round(state.scale) };
}
