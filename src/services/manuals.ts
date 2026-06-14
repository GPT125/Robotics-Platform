// Official VEX game manuals, shared by the Game Manual page and the AI coach so
// the assistant grounds rules in the correct, current game for each program.
//
// `pdf` is the current-season manual PDF (viewable in-app). `official` is the
// RECF knowledge-base "Game Manual & Resources" page, which never goes stale —
// if VEX posts a newer version, that page always links it, so it is the
// authoritative fallback shown next to every manual.

export type GameManual = {
  id: string;
  program: string;        // short program code used in AI rules grounding
  name: string;           // display name
  game: string;           // current season game
  season: string;
  blurb: string;
  pdf: string;            // current manual PDF (in-app viewer)
  official: string;       // always-current official resources page
};

export const SEASON = "2026–2027";

export const GAME_MANUALS: GameManual[] = [
  {
    id: "vrc",
    program: "VRC",
    name: "VEX Robotics Competition (VRC)",
    game: "Override",
    season: SEASON,
    blurb: "2v2 middle-school & high-school competition. Top qualifiers become alliance captains.",
    pdf: "https://content.vexrobotics.com/docs/2026-2027/override/files/override-v-0.2.pdf",
    official: "https://v5rc-kb.recf.org/hc/en-us/articles/9652912628631-Game-Manual-and-Resources-for-VEX-V5-Robotics-Competition-Teams",
  },
  {
    id: "viqrc",
    program: "VIQRC",
    name: "VEX IQ Robotics Competition (VIQRC)",
    game: "Level Up",
    season: SEASON,
    blurb: "Cooperative elementary & middle-school Teamwork matches. No alliance selection.",
    pdf: "https://content.vexrobotics.com/docs/2026-2027/level-up/files/levelup-v0.2.pdf",
    official: "https://viqrc-kb.recf.org/hc/en-us/articles/9754906857367-Game-Manual-Resources-for-VEX-IQ-Robotics-Competition-Teams",
  },
  {
    id: "vurc",
    program: "VEX U",
    name: "VEX U Robotics Competition (VURC)",
    game: "Override (VEX U)",
    season: SEASON,
    blurb: "University division — one team, two robots, head-to-head. Rules are the VEX U sections of the Override manual.",
    pdf: "https://content.vexrobotics.com/docs/2026-2027/override/files/override-v-0.2.pdf",
    official: "https://vurc-kb.recf.org/hc/en-us/articles/9936814530839-Game-Manuals-and-Resources-for-VEX-U-Robotics-Competition-Teams",
  },
  {
    id: "vairc",
    program: "VEX AI",
    name: "VEX AI Robotics Competition (VAIRC)",
    game: "Override (VEX AI)",
    season: SEASON,
    blurb: "Fully autonomous AI competition. Rules are the VEX AI sections of the Override manual.",
    pdf: "https://content.vexrobotics.com/docs/2026-2027/override/files/override-v-0.2.pdf",
    official: "https://vairc-kb.recf.org/hc/en-us/articles/18046519545879-Game-Manual-and-Resources-for-VEX-AI-Robotics-Competition-Teams",
  },
];

export function manualForProgram(code?: string): GameManual {
  const c = (code ?? "").toUpperCase();
  if (c.includes("IQ")) return GAME_MANUALS[1];
  if (c.includes("AI")) return GAME_MANUALS[3];
  if (c === "VURC" || c === "VEXU" || c.includes("U")) return GAME_MANUALS[2];
  return GAME_MANUALS[0];
}

/** Compact, accurate rules grounding for the AI coach. */
export function manualsAiContext(): string {
  const lines = GAME_MANUALS.map((m) => `${m.program} ${m.season} game is "${m.game}" — official manual: ${m.official} (PDF: ${m.pdf}).`);
  return `Current official VEX games and manuals (${SEASON}). Use ONLY the manual for the user's program; never mix games. ${lines.join(" ")} Only the official game manual, official Q&A, and head referees are authoritative for rules.`;
}
