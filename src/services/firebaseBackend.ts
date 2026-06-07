import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";

type CallableResult<T> = { data: T };

async function callBackend<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const callable = httpsCallable(functions, name);
  const result = await callable(data) as CallableResult<T>;
  return result.data;
}

export type TournamentChatSnapshot = {
  eventId: string;
  opensAt: string;
  closesAt: string;
  allianceSelectionAt: string | null;
  offerOpensAt: string | null;
  members: Array<{ firstName: string; teamNumber: string }>;
  messages: Array<{ id: string; firstName: string; teamNumber: string; body: string; createdAt: string | null }>;
};

export type AllianceOffer = {
  id: string;
  eventId: string;
  fromTeam: string;
  toTeam: string;
  message: string;
  status: "sent" | "accepted" | "declined";
};

export async function joinTournamentChat(input: { eventId: string | number; displayName?: string; teamNumber: string; program?: string }) {
  return callBackend<{ ok: boolean; opensAt: string; closesAt: string }>("joinTournamentChat", input);
}

export async function getTournamentChat(eventId: string | number) {
  return callBackend<TournamentChatSnapshot>("getTournamentChat", { eventId });
}

export async function sendTournamentMessage(input: { eventId: string | number; body: string }) {
  return callBackend<{ ok: boolean }>("sendTournamentMessage", input);
}

export async function getMatchMindEventTeams(eventId: string | number) {
  return callBackend<{ teams: Array<{ teamNumber: string }> }>("getMatchMindEventTeams", { eventId });
}

export async function sendAllianceOffer(input: { eventId: string | number; fromTeam: string; toTeam: string; message: string }) {
  return callBackend<{ ok: boolean }>("sendAllianceOffer", input);
}

export async function listAllianceOffers(eventId: string | number, teamNumber: string) {
  return callBackend<{ offers: AllianceOffer[] }>("listAllianceOffers", { eventId, teamNumber });
}

export async function firebaseRobotEvents<T = unknown>(path: string) {
  return callBackend<T>("robotEventsProxy", { path });
}

export type FirebaseCoachMessage = { role: "user" | "assistant"; content: string };
export type FirebaseCoachResponse = {
  answer: string;
  provider: string;
  model: string | null;
  confidence: "High" | "Medium" | "Low";
  sources: Array<{ title: string; url: string; blurb: string }>;
  models?: string[];
  hasVision?: boolean;
  dataSources: string[];
};

export async function firebaseAskCoach(input: { messages?: FirebaseCoachMessage[]; prompt?: string; context?: string; images?: string[] }) {
  return callBackend<FirebaseCoachResponse>("askCoach", input);
}

export async function transcribeVoice(input: { audioBase64: string; mimeType: string }) {
  return callBackend<{ text: string }>("transcribeVoice", input);
}
