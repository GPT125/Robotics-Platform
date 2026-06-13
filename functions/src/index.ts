import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

initializeApp();

const db = getFirestore();
const ROBOTEVENTS_API_TOKEN = defineSecret("ROBOTEVENTS_API_TOKEN");
const ROBOTEVENTS_BASE_URL = defineString("ROBOTEVENTS_BASE_URL", { default: "https://events.vex.com/api/v2" });
const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY");
const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

type ProgramCode = "V5RC" | "VRC" | "VIQRC" | "VURC" | "VAIRC" | "VEXU" | string;
type EventWindow = { opensAt: Date; closesAt: Date; allianceSelectionAt: Date | null; offerOpensAt: Date | null };

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

const HIGH_RISK_PATTERNS = [
  /\b(kill|hurt)\s+(yourself|urself|u)\b/i,
  /\b(send|drop|post)\s+(address|phone|email|password)\b/i,
  /\b(dox|doxx|swat)\b/i,
  /\b(nsfw|sexual|nude|nudes)\b/i,
];

function requireAuth(uid?: string) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in is required.");
}

function cleanText(value: unknown, max = 4000) {
  return String(value ?? "").slice(0, max).trim();
}

function normalizeForModeration(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertMessageAllowed(text: string) {
  const normalized = normalizeForModeration(text);
  if (!text || !normalized) throw new HttpsError("invalid-argument", "Message is empty.");
  if (matcher.hasMatch(text) || matcher.hasMatch(normalized) || HIGH_RISK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new HttpsError("failed-precondition", "This message was blocked by MatchMind safety filters.");
  }
}

function firstName(name: string) {
  return cleanText(name, 80).split(/\s+/)[0] || "Member";
}

async function robotEvents(path: string) {
  const token = ROBOTEVENTS_API_TOKEN.value() || process.env.ROBOT_EVENTS_API_TOKEN || "";
  if (!token) throw new HttpsError("failed-precondition", "RobotEvents API token is not configured in Firebase Functions secrets.");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const bases = Array.from(new Set([
    ROBOTEVENTS_BASE_URL.value().replace(/\/+$/, ""),
    "https://events.vex.com/api/v2",
  ]));
  let lastStatus = 0;
  let lastBody: unknown = {};
  for (const base of bases) {
    const response = await fetch(`${base}${safePath}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "MatchMind/0.1 Firebase RobotEvents adapter" },
    });
    lastStatus = response.status;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      lastBody = { message: "RobotEvents returned non-JSON.", contentType };
      continue;
    }
    const json = await response.json().catch(() => ({}));
    lastBody = json;
    if (!response.ok) throw new HttpsError("unavailable", `RobotEvents returned ${response.status}.`, json);
    return json;
  }
  throw new HttpsError("unavailable", `RobotEvents returned ${lastStatus || "non-JSON"}.`, lastBody);
}

function eventDates(event: Record<string, unknown>) {
  const start = new Date(String(event.start ?? Date.now()));
  const end = new Date(String(event.end ?? event.start ?? Date.now()));
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const safeEnd = Number.isNaN(end.getTime()) ? safeStart : end;
  return { start: safeStart, end: safeEnd };
}

async function loadEvent(eventId: string | number) {
  const id = String(eventId);
  const cached = await db.collection("robotEventsCache").doc(`event-${id}`).get();
  if (cached.exists) {
    const data = cached.data() as { event?: Record<string, unknown>; expiresAt?: Timestamp };
    if (data.event && data.expiresAt?.toMillis() && data.expiresAt.toMillis() > Date.now()) return data.event;
  }
  const json = await robotEvents(`/events/${encodeURIComponent(id)}`);
  const event = (json as { data?: Record<string, unknown> }).data ?? (json as Record<string, unknown>);
  await db.collection("robotEventsCache").doc(`event-${id}`).set({
    event,
    expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return event;
}

async function eventWindow(eventId: string | number): Promise<EventWindow> {
  const event = await loadEvent(eventId);
  const overrideDoc = await db.collection("eventSettings").doc(String(eventId)).get();
  const settings = overrideDoc.data() ?? {};
  const { start, end } = eventDates(event);
  const allianceSelectionAtValue = settings.allianceSelectionAt instanceof Timestamp ? settings.allianceSelectionAt.toDate() : null;
  const estimatedAllianceSelection = allianceSelectionAtValue ?? new Date(end.getTime() - 2 * 60 * 60 * 1000);
  return {
    opensAt: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000),
    closesAt: new Date(end.getTime() + 12 * 60 * 60 * 1000),
    allianceSelectionAt: estimatedAllianceSelection,
    // Alliance offers open 30 minutes before alliance selection.
    offerOpensAt: new Date(estimatedAllianceSelection.getTime() - 30 * 60 * 1000),
  };
}

function assertInWindow(window: EventWindow, now = new Date()) {
  if (now < window.opensAt) throw new HttpsError("failed-precondition", "This tournament chat opens two days before the event.");
  if (now > window.closesAt) throw new HttpsError("failed-precondition", "This tournament chat has closed.");
}

function assertOfferWindow(window: EventWindow, now = new Date()) {
  assertInWindow(window, now);
  if (window.offerOpensAt && now < window.offerOpensAt) throw new HttpsError("failed-precondition", "Alliance offers open 30 minutes before alliance selection.");
}

export const robotEventsProxy = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const path = cleanText((request.data as { path?: string })?.path, 500);
  if (!path.startsWith("/")) throw new HttpsError("invalid-argument", "Path must start with /.");
  return robotEvents(path);
});

export const searchTeams = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const data = request.data as { query?: string; program?: ProgramCode; grade?: string; seasonId?: number };
  const query = cleanText(data.query, 80).toUpperCase();
  if (query.length < 2) return { data: [] };
  const attempts: string[] = [];
  const exactParams = new URLSearchParams({ number: query, per_page: "100" });
  const searchParams = new URLSearchParams({ search: query, per_page: "100" });
  for (const params of [exactParams, searchParams]) {
    if (data.program && data.program !== "ALL") params.append("program[]", data.program);
    if (data.seasonId) params.append("season[]", String(data.seasonId));
    attempts.push(`/teams?${params.toString()}`);
  }
  const seen = new Set<string>();
  const rows: unknown[] = [];
  for (const path of attempts) {
    const response = await robotEvents(path);
    const dataRows = Array.isArray((response as { data?: unknown[] }).data) ? (response as { data: unknown[] }).data : [];
    for (const row of dataRows) {
      const record = row as { id?: number | string; number?: string };
      const key = String(record.id ?? record.number ?? JSON.stringify(row));
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }
  return { data: rows };
});

export const searchEvents = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const data = request.data as { query?: string; program?: ProgramCode; grade?: string; seasonId?: number };
  const query = cleanText(data.query, 120);
  if (query.length < 2) return { data: [] };
  const params = new URLSearchParams({ search: query, per_page: "100" });
  if (data.program && data.program !== "ALL") params.append("program[]", data.program);
  if (data.seasonId) params.append("season[]", String(data.seasonId));
  const response = await robotEvents(`/events?${params.toString()}`);
  return { data: Array.isArray((response as { data?: unknown[] }).data) ? (response as { data: unknown[] }).data : [] };
});

export const joinTournamentChat = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const uid = request.auth!.uid;
  const data = request.data as { eventId?: string | number; displayName?: string; teamNumber?: string; program?: ProgramCode };
  const eventId = cleanText(data.eventId, 80);
  const teamNumber = cleanText(data.teamNumber, 24).toUpperCase();
  if (!eventId || !teamNumber) throw new HttpsError("invalid-argument", "Event and team number are required.");
  const window = await eventWindow(eventId);
  assertInWindow(window);
  const chatRef = db.collection("tournamentChats").doc(eventId);
  await chatRef.set({
    eventId,
    program: data.program ?? "VEX",
    opensAt: Timestamp.fromDate(window.opensAt),
    closesAt: Timestamp.fromDate(window.closesAt),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await chatRef.collection("members").doc(uid).set({
    uid,
    firstName: firstName(data.displayName ?? request.auth?.token.name ?? ""),
    teamNumber,
    joinedAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection("eventMemberships").doc(`${eventId}_${teamNumber}`).set({
    eventId,
    teamNumber,
    uid,
    joinedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true, opensAt: window.opensAt.toISOString(), closesAt: window.closesAt.toISOString() };
});

export const getTournamentChat = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const eventId = cleanText((request.data as { eventId?: string | number })?.eventId, 80);
  const window = await eventWindow(eventId);
  const now = new Date();
  if (now > window.closesAt) throw new HttpsError("failed-precondition", "This tournament chat has ended.");
  const chatRef = db.collection("tournamentChats").doc(eventId);
  const [membersSnap, messagesSnap] = await Promise.all([
    chatRef.collection("members").orderBy("teamNumber").limit(250).get(),
    chatRef.collection("messages").orderBy("createdAt", "desc").limit(80).get(),
  ]);
  return {
    eventId,
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
    allianceSelectionAt: window.allianceSelectionAt?.toISOString() ?? null,
    offerOpensAt: window.offerOpensAt?.toISOString() ?? null,
    members: membersSnap.docs.map((doc) => {
      const data = doc.data();
      return { firstName: data.firstName, teamNumber: data.teamNumber };
    }),
    messages: messagesSnap.docs.reverse().map((doc) => {
      const data = doc.data();
      return { id: doc.id, firstName: data.firstName, teamNumber: data.teamNumber, body: data.body, createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null };
    }),
  };
});

export const sendTournamentMessage = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const uid = request.auth!.uid;
  const data = request.data as { eventId?: string | number; body?: string };
  const eventId = cleanText(data.eventId, 80);
  const body = cleanText(data.body, 1200);
  assertMessageAllowed(body);
  const window = await eventWindow(eventId);
  assertInWindow(window);
  const memberDoc = await db.collection("tournamentChats").doc(eventId).collection("members").doc(uid).get();
  if (!memberDoc.exists) throw new HttpsError("permission-denied", "Join this tournament chat before sending.");
  const member = memberDoc.data() ?? {};
  await db.collection("tournamentChats").doc(eventId).collection("messages").add({
    uid,
    firstName: member.firstName,
    teamNumber: member.teamNumber,
    body,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

export const getMatchMindEventTeams = onCall(async (request) => {
  requireAuth(request.auth?.uid);
  const eventId = cleanText((request.data as { eventId?: string | number })?.eventId, 80);
  const snap = await db.collection("eventMemberships").where("eventId", "==", eventId).limit(500).get();
  return {
    teams: snap.docs.map((doc) => {
      const data = doc.data();
      return { teamNumber: data.teamNumber };
    }),
  };
});

export const sendAllianceOffer = onCall({ secrets: [ROBOTEVENTS_API_TOKEN] }, async (request) => {
  requireAuth(request.auth?.uid);
  const uid = request.auth!.uid;
  const data = request.data as { eventId?: string | number; fromTeam?: string; toTeam?: string; message?: string };
  const eventId = cleanText(data.eventId, 80);
  const fromTeam = cleanText(data.fromTeam, 24).toUpperCase();
  const toTeam = cleanText(data.toTeam, 24).toUpperCase();
  const message = cleanText(data.message || "Alliance invite request", 500);
  if (!fromTeam || !toTeam || fromTeam === toTeam) throw new HttpsError("invalid-argument", "Offer needs two different teams.");
  assertMessageAllowed(message);
  const window = await eventWindow(eventId);
  assertOfferWindow(window);
  const registered = await db.collection("eventMemberships").doc(`${eventId}_${toTeam}`).get();
  if (!registered.exists) throw new HttpsError("failed-precondition", "That team is not registered with MatchMind for this event yet.");
  const offerRef = db.collection("tournamentChats").doc(eventId).collection("allianceOffers").doc(`${fromTeam}_${toTeam}`);
  await offerRef.set({
    eventId,
    fromTeam,
    toTeam,
    message,
    status: "sent",
    sentBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection("notifications").add({
    eventId,
    teamNumber: toTeam,
    type: "alliance_offer",
    title: `${fromTeam} sent an alliance offer`,
    body: message,
    createdAt: FieldValue.serverTimestamp(),
    seen: false,
  });
  return { ok: true };
});

export const listAllianceOffers = onCall(async (request) => {
  requireAuth(request.auth?.uid);
  const data = request.data as { eventId?: string | number; teamNumber?: string };
  const eventId = cleanText(data.eventId, 80);
  const teamNumber = cleanText(data.teamNumber, 24).toUpperCase();
  const snap = await db.collection("tournamentChats").doc(eventId).collection("allianceOffers")
    .where("toTeam", "==", teamNumber)
    .orderBy("createdAt", "desc")
    .limit(80)
    .get();
  return {
    offers: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

type OfferResponse = "accepted" | "declined" | "thinking" | "meeting";
const OFFER_RESPONSES: OfferResponse[] = ["accepted", "declined", "thinking", "meeting"];

async function membershipUser(eventId: string, teamNumber: string, uid: string) {
  const doc = await db.collection("eventMemberships").doc(`${eventId}_${teamNumber}`).collection("users").doc(uid).get();
  return doc.exists ? (doc.data() as { role?: string; firstName?: string; notifyAllianceOffers?: boolean }) : null;
}

// Register a signed-in user (and their team) for an event so alliance offers can
// be received. Replaces the old chat-join registration. Stores the account role
// so only students receive/answer offers, and a per-user notify preference.
export const registerForAllianceOffers = onCall(async (request) => {
  requireAuth(request.auth?.uid);
  const uid = request.auth!.uid;
  const data = request.data as { eventId?: string | number; teamNumber?: string; role?: string; displayName?: string; notify?: boolean };
  const eventId = cleanText(data.eventId, 80);
  const teamNumber = cleanText(data.teamNumber, 24).toUpperCase();
  if (!eventId || !teamNumber) throw new HttpsError("invalid-argument", "Event and team number are required.");
  const role = cleanText(data.role, 24).toLowerCase() || "student";
  const teamRef = db.collection("eventMemberships").doc(`${eventId}_${teamNumber}`);
  await teamRef.set({ eventId, teamNumber, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await teamRef.collection("users").doc(uid).set({
    uid,
    role,
    firstName: firstName(data.displayName ?? request.auth?.token.name ?? ""),
    notifyAllianceOffers: data.notify !== false,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

// A student on the recipient team answers an offer (accept / decline / think /
// meet up). The sender is notified of the response.
export const respondToAllianceOffer = onCall(async (request) => {
  requireAuth(request.auth?.uid);
  const uid = request.auth!.uid;
  const data = request.data as { eventId?: string | number; fromTeam?: string; toTeam?: string; response?: string };
  const eventId = cleanText(data.eventId, 80);
  const fromTeam = cleanText(data.fromTeam, 24).toUpperCase();
  const toTeam = cleanText(data.toTeam, 24).toUpperCase();
  const response = cleanText(data.response, 24).toLowerCase() as OfferResponse;
  if (!eventId || !fromTeam || !toTeam) throw new HttpsError("invalid-argument", "Missing offer details.");
  if (!OFFER_RESPONSES.includes(response)) throw new HttpsError("invalid-argument", "Invalid response.");
  const me = await membershipUser(eventId, toTeam, uid);
  if (!me || me.role !== "student") throw new HttpsError("permission-denied", "Only student accounts on this team can respond to alliance offers.");
  const offerRef = db.collection("tournamentChats").doc(eventId).collection("allianceOffers").doc(`${fromTeam}_${toTeam}`);
  const offer = await offerRef.get();
  if (!offer.exists) throw new HttpsError("not-found", "That offer no longer exists.");
  await offerRef.set({ status: response, respondedAt: FieldValue.serverTimestamp(), respondedBy: uid }, { merge: true });
  const labels: Record<OfferResponse, string> = {
    accepted: "accepted your alliance offer",
    declined: "declined your alliance offer",
    thinking: "is thinking about your alliance offer",
    meeting: "wants to meet up to discuss your offer",
  };
  await db.collection("notifications").add({
    eventId,
    teamNumber: fromTeam,
    type: "alliance_response",
    title: `${toTeam} ${labels[response]}`,
    body: "",
    fromTeam: toTeam,
    response,
    createdAt: FieldValue.serverTimestamp(),
    seen: false,
  });
  return { ok: true };
});

// Offers the team has SENT, with their current status — powers the sender's
// dynamic "offer status" view.
export const listSentAllianceOffers = onCall(async (request) => {
  requireAuth(request.auth?.uid);
  const data = request.data as { eventId?: string | number; teamNumber?: string };
  const eventId = cleanText(data.eventId, 80);
  const teamNumber = cleanText(data.teamNumber, 24).toUpperCase();
  const snap = await db.collection("tournamentChats").doc(eventId).collection("allianceOffers")
    .where("fromTeam", "==", teamNumber)
    .orderBy("createdAt", "desc")
    .limit(80)
    .get();
  return { offers: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
});

type CoachMessage = { role: "system" | "user" | "assistant"; content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> };

const COACH_SYSTEM = [
  "You are MatchMind AI, a concise VEX robotics competition coach inside a mobile scouting app.",
  "Use official RobotEvents context, saved scouting notes, and user-provided media when available.",
  "Never invent team facts, awards, rankings, scores, or upcoming events. If data is missing, say so clearly.",
  "Give student-friendly answers with short headings and bullets. Avoid emojis unless the user asks for them.",
].join(" ");

function dataText(value: unknown, max = 4000) {
  return cleanText(value, max);
}

async function callAiProvider(args: { provider: string; url: string; key: string; model: string; messages: CoachMessage[]; extraHeaders?: Record<string, string> }) {
  const response = await fetch(args.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.key}`,
      ...args.extraHeaders,
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: 0.2,
      max_tokens: 850,
    }),
  });
  const json = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `${args.provider} returned ${response.status}`);
  return dataText(json.choices?.[0]?.message?.content, 8000);
}

function offlineCoachAnswer(prompt: string, context: string) {
  const lower = `${prompt} ${context}`.toLowerCase();
  const checks = [
    lower.includes("match") ? "Use the latest scored matches first: compare average score, recent win/loss form, partner/opponent strength, and scout notes." : "",
    lower.includes("alliance") || lower.includes("pick") ? "For alliance selection, weigh tournament rank, invite likelihood, OPR/DPR/CCWM, skills, reliability notes, and role fit." : "",
    lower.includes("auton") ? "For autonomous, review start position consistency, sensor calibration, motor direction, and one repeatable route before adding complexity." : "",
    lower.includes("robot") || lower.includes("intake") || lower.includes("drivetrain") ? "For robot issues, inspect wiring, loose hardware, wheel alignment, chain/belt tension, and motor configuration before changing code." : "",
  ].filter(Boolean);
  return [
    "## MatchMind check",
    checks.length ? checks.map((item) => `- ${item}`).join("\n") : "- I need a team, event, match, robot subsystem, or scout note to give a grounded recommendation.",
    "- If official RobotEvents data is missing, collect one scout note after the next match and retry the analysis.",
    "",
    "Confidence: Low — no live AI provider responded, so this is a deterministic MatchMind checklist.",
  ].join("\n");
}

export const askCoach = onCall({ secrets: [GROQ_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY] }, async (request) => {
  requireAuth(request.auth?.uid);
  const data = request.data as { prompt?: string; messages?: Array<{ role?: string; content?: string }>; context?: string; images?: string[] };
  const context = dataText(data.context, 5000);
  const history = Array.isArray(data.messages)
    ? data.messages
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" as const : "user" as const,
        content: dataText(message.content, 4000),
      }))
      .filter((message) => message.content)
      .slice(-8)
    : [];
  const prompt = dataText(data.prompt || history[history.length - 1]?.content, 8000);
  if (!prompt && !history.length) throw new HttpsError("invalid-argument", "Prompt is required.");
  const images = Array.isArray(data.images) ? data.images.filter((image) => typeof image === "string" && image.startsWith("data:")).slice(0, 6) : [];
  const messages: CoachMessage[] = [
    { role: "system", content: COACH_SYSTEM },
    ...(context ? [{ role: "system" as const, content: `LIVE MATCHMIND CONTEXT:\n${context}` }] : []),
    ...history,
  ];
  if (!history.length && prompt) messages.push({ role: "user", content: prompt });
  if (images.length) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        const existingContent = messages[i].content;
        const text = typeof existingContent === "string" ? existingContent : prompt || "Analyze this robot media.";
        messages[i] = {
          role: "user",
          content: [
            { type: "text", text },
            ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ],
        };
        break;
      }
    }
  }
  const providers = [
    { provider: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", key: GROQ_API_KEY.value(), model: "llama-3.3-70b-versatile" },
    { provider: "DeepSeek", url: "https://api.deepseek.com/chat/completions", key: DEEPSEEK_API_KEY.value(), model: "deepseek-chat" },
    { provider: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", key: OPENROUTER_API_KEY.value(), model: "openai/gpt-4o-mini", extraHeaders: { "HTTP-Referer": "https://matchmind.web.app", "X-Title": "MatchMind VEX Platform" } },
    { provider: "OpenAI", url: "https://api.openai.com/v1/chat/completions", key: OPENAI_API_KEY.value(), model: images.length ? "gpt-4o-mini" : "gpt-4o-mini" },
  ].filter((provider) => provider.key);
  const drafts = await Promise.allSettled(providers.map((provider) => callAiProvider({ ...provider, messages })));
  const first = drafts.find((draft): draft is PromiseFulfilledResult<string> => draft.status === "fulfilled" && Boolean(draft.value));
  const answer = first?.value || offlineCoachAnswer(prompt, context);
  const used = drafts
    .map((draft, index) => draft.status === "fulfilled" && draft.value ? providers[index]?.provider : "")
    .filter(Boolean);
  return {
    answer,
    provider: used[0] ?? "MatchMind offline",
    model: null,
    confidence: used.length ? "Medium" : "Low",
    sources: [],
    models: used,
    hasVision: images.length > 0,
    dataSources: [
      context ? "Live MatchMind context" : "User prompt",
      images.length ? "Robot image/video frames" : "Text reasoning",
      "Firebase Functions server-side AI provider",
    ],
  };
});

export const transcribeVoice = onCall({ secrets: [OPENAI_API_KEY] }, async (request) => {
  requireAuth(request.auth?.uid);
  const data = request.data as { audioBase64?: string; mimeType?: string };
  const audioBase64 = cleanText(data.audioBase64, 8_000_000);
  const mimeType = cleanText(data.mimeType, 80) || "audio/webm";
  const key = OPENAI_API_KEY.value();
  if (!key) throw new HttpsError("failed-precondition", "OPENAI_API_KEY is required for voice transcription.");
  if (!audioBase64) throw new HttpsError("invalid-argument", "Audio is required.");
  const binary = Buffer.from(audioBase64.replace(/^data:[^,]+,/, ""), "base64");
  const FormDataCtor = (globalThis as unknown as { FormData: new () => { append: (name: string, value: unknown, filename?: string) => void } }).FormData;
  const BlobCtor = (globalThis as unknown as { Blob: new (parts: unknown[], options?: { type?: string }) => unknown }).Blob;
  const form = new FormDataCtor();
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("file", new BlobCtor([binary], { type: mimeType }), mimeType.includes("mp4") ? "voice.mp4" : "voice.webm");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form as never,
  });
  const json = await response.json().catch(() => ({})) as { text?: string; error?: { message?: string } };
  if (!response.ok) throw new HttpsError("unavailable", json.error?.message ?? `Transcription returned ${response.status}.`);
  return { text: cleanText(json.text, 8000) };
});
