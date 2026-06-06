import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

initializeApp();

const db = getFirestore();
const ROBOTEVENTS_API_TOKEN = defineSecret("ROBOTEVENTS_API_TOKEN");
const ROBOTEVENTS_BASE_URL = defineString("ROBOTEVENTS_BASE_URL", { default: "https://www.robotevents.com/api/v2" });
const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
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
  const response = await fetch(`${ROBOTEVENTS_BASE_URL.value()}${safePath}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpsError("unavailable", `RobotEvents returned ${response.status}.`, json);
  return json;
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
    offerOpensAt: new Date(estimatedAllianceSelection.getTime() - 60 * 60 * 1000),
  };
}

function assertInWindow(window: EventWindow, now = new Date()) {
  if (now < window.opensAt) throw new HttpsError("failed-precondition", "This tournament chat opens two days before the event.");
  if (now > window.closesAt) throw new HttpsError("failed-precondition", "This tournament chat has closed.");
}

function assertOfferWindow(window: EventWindow, now = new Date()) {
  assertInWindow(window, now);
  if (window.offerOpensAt && now < window.offerOpensAt) throw new HttpsError("failed-precondition", "Alliance offers open one hour before alliance selection.");
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
  const params = new URLSearchParams({ search: query, per_page: "100" });
  if (data.program && data.program !== "ALL") params.append("program[]", data.program);
  if (data.seasonId) params.append("season[]", String(data.seasonId));
  const response = await robotEvents(`/teams?${params.toString()}`);
  const rows = Array.isArray((response as { data?: unknown[] }).data) ? (response as { data: unknown[] }).data : [];
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

export const askCoach = onCall({ secrets: [GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY] }, async (request) => {
  requireAuth(request.auth?.uid);
  const prompt = cleanText((request.data as { prompt?: string })?.prompt, 8000);
  if (!prompt) throw new HttpsError("invalid-argument", "Prompt is required.");
  const key = GROQ_API_KEY.value() || OPENROUTER_API_KEY.value() || OPENAI_API_KEY.value();
  if (!key) throw new HttpsError("failed-precondition", "No AI provider secret is configured.");
  return {
    answer: "MatchMind AI backend is connected. Use the deployed provider adapter to generate grounded scouting, alliance, and tournament chat summaries.",
    dataSources: ["Firestore workspace data", "RobotEvents cache"],
  };
});
