import { useState, useRef, useEffect } from "react";
import { Send, Search, Plus, ArrowLeft, X, Lock, MessageCircle, ImagePlus, Users, Clock } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp, type ChatAttachment, type Conversation } from "../AppContext";
import { downscaleImage, readFileAsDataUrl } from "../media";
import { getTournamentChat, joinTournamentChat, sendTournamentMessage, type TournamentChatSnapshot } from "../../../services/firebaseBackend";

const REACTIONS = ["👍", "✅", "⚠️", "🤖", "🏆"];
const EVENT_CHAT_INTENT_KEY = "matchmind:event-chat-intent";

type EventChatIntent = {
  id: number | string;
  name: string;
  sku?: string;
  start?: string;
  end?: string;
  location?: string;
  program?: string;
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "RL";
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function hashColor(str: string) {
  const colors = ["#7c3aed", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function readEventChatIntent(): EventChatIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EVENT_CHAT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventChatIntent;
    return parsed?.id && parsed?.name ? parsed : null;
  } catch {
    return null;
  }
}

function eventClosesAt(intent: EventChatIntent | null, chat: TournamentChatSnapshot | null) {
  if (chat?.closesAt) return new Date(chat.closesAt);
  if (!intent?.end) return null;
  const end = new Date(intent.end);
  if (Number.isNaN(end.getTime())) return null;
  return new Date(end.getTime() + 12 * 60 * 60 * 1000);
}

function eventOpensAt(intent: EventChatIntent | null, chat: TournamentChatSnapshot | null) {
  if (chat?.opensAt) return new Date(chat.opensAt);
  if (!intent?.start) return null;
  const start = new Date(intent.start);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000);
}

function shortDateTime(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function AttachmentPreview({ att }: { att: ChatAttachment }) {
  if (att.kind === "video") {
    return <video src={att.url} controls style={{ width: 136, maxHeight: 120, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", objectFit: "cover" }} />;
  }
  return <img src={att.url} alt={att.name} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }} />;
}

export function MessagesPage({ onSignIn }: { onSignIn?: () => void }) {
  const { accent } = useAccent();
  const { signedIn, profile, team, conversations, addConversation, sendConversationMessage, toggleMessageReaction, markConversationRead, setOnboarded } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [eventIntent, setEventIntent] = useState<EventChatIntent | null>(null);
  const [showEventJoin, setShowEventJoin] = useState(false);
  const [eventChat, setEventChat] = useState<TournamentChatSnapshot | null>(null);
  const [eventChatInput, setEventChatInput] = useState("");
  const [eventChatStatus, setEventChatStatus] = useState("");
  const [eventChatBusy, setEventChatBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const closesAt = eventClosesAt(eventIntent, eventChat);
  const opensAt = eventOpensAt(eventIntent, eventChat);
  const eventChatEnded = Boolean(closesAt && Date.now() > closesAt.getTime());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, attachments.length, eventChat?.messages.length]);

  useEffect(() => {
    const intent = readEventChatIntent();
    if (!intent) return;
    setEventIntent(intent);
    setShowEventJoin(true);
    setSelectedId(null);
  }, []);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: ChatAttachment[] = [];
    for (const file of Array.from(files).slice(0, 3)) {
      const raw = await readFileAsDataUrl(file);
      const url = file.type.startsWith("image") ? await downscaleImage(raw, 900, 0.82) : raw;
      next.push({ id: `${Date.now()}-${next.length}`, kind: file.type.startsWith("video") ? "video" : "image", name: file.name, url });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
  }

  const handleSend = () => {
    if ((!input.trim() && !attachments.length) || !selected) return;
    const text = replyTo ? `Replying to ${replyTo.name}: ${replyTo.text.slice(0, 72)}\n${input.trim()}` : input.trim();
    sendConversationMessage(selected.id, { text, attachments });
    setInput("");
    setAttachments([]);
    setReplyTo(null);
  };

  const handleNewConvo = () => {
    if (!newEmail.trim() || !newName.trim() || !/\S+@\S+\.\S+/.test(newEmail)) return;
    const convo = addConversation({ name: newName, email: newEmail, teamId: newTeam || undefined });
    setSelectedId(convo.id);
    setShowNewConvo(false);
    setNewEmail("");
    setNewName("");
    setNewTeam("");
  };

  const clearEventChatIntent = () => {
    window.sessionStorage.removeItem(EVENT_CHAT_INTENT_KEY);
    setEventIntent(null);
    setShowEventJoin(false);
    setEventChat(null);
    setEventChatInput("");
    setEventChatStatus("");
  };

  const handleJoinEventChat = async () => {
    if (!eventIntent) return;
    if (!team) {
      setEventChatStatus("Select your team in Settings before joining tournament chat.");
      return;
    }
    if (eventChatEnded) {
      setEventChatStatus("This tournament chat has ended and cannot be resumed.");
      return;
    }
    setEventChatBusy(true);
    setEventChatStatus("Joining event chat...");
    try {
      await joinTournamentChat({ eventId: eventIntent.id, displayName: profile?.name || team.number, teamNumber: team.number, program: team.program?.code ?? eventIntent.program });
      const snapshot = await getTournamentChat(eventIntent.id);
      setEventChat(snapshot);
      setShowEventJoin(false);
      setEventChatStatus("");
      window.sessionStorage.removeItem(EVENT_CHAT_INTENT_KEY);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not join this tournament chat.";
      setEventChatStatus(message.includes("ended") || message.includes("closed") ? "This tournament chat has ended and cannot be resumed." : message);
    } finally {
      setEventChatBusy(false);
    }
  };

  const handleSendEventChat = async () => {
    if (!eventIntent || !eventChatInput.trim() || eventChatEnded) return;
    setEventChatBusy(true);
    setEventChatStatus("Sending...");
    try {
      await sendTournamentMessage({ eventId: eventIntent.id, body: eventChatInput.trim() });
      setEventChatInput("");
      setEventChat(await getTournamentChat(eventIntent.id));
      setEventChatStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Message blocked or failed.";
      setEventChatStatus(message.includes("ended") || message.includes("closed") ? "This tournament chat has ended and cannot be resumed." : message);
    } finally {
      setEventChatBusy(false);
    }
  };

  if (!signedIn || !profile?.email) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", padding: "var(--rl-page-top) 24px var(--rl-page-bottom)", justifyContent: "center", alignItems: "center", gap: 0, boxSizing: "border-box" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${accent}30, #7c3aed30)`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <MessageCircle size={32} style={{ color: accent }} />
        </div>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 22, color: "#e8eaf0", textAlign: "center", marginBottom: 8 }}>Messages</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#7a80a0", textAlign: "center", lineHeight: 1.6, marginBottom: 36, maxWidth: 280 }}>
          Sign in with Google to message teammates by email inside your MatchMind workspace.
        </p>
        <button onClick={() => { setOnboarded(false); onSignIn?.(); }} style={{ width: "100%", maxWidth: 340, padding: "14px", borderRadius: 14, background: accent, border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#08090f", cursor: "pointer", boxShadow: `0 0 20px ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Sign in with Google
        </button>
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={11} style={{ color: "#4a5070" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#4a5070" }}>Workspace-only messaging · no public DMs</span>
        </div>
      </div>
    );
  }

  if (eventIntent && eventChat) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: "var(--rl-page-bottom)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "var(--rl-page-top) 14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,11,20,0.95)", backdropFilter: "blur(12px)" }}>
          <button onClick={clearEventChatIntent} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageCircle size={17} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, color: "#e8eaf0", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventIntent.name}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: eventChatEnded ? "#ff6b7a" : "#10b981", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {eventChatEnded ? "Ended" : "Open"} · closes {shortDateTime(closesAt)}
            </p>
          </div>
        </div>

        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          <div style={{ flexShrink: 0, background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={13} style={{ color: accent }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#cfd3e6" }}>{eventChat.members.length} joined</span>
          </div>
          <div style={{ flexShrink: 0, background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center", gap: 7 }}>
            <Clock size={13} style={{ color: accent }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#cfd3e6" }}>opens {shortDateTime(opensAt)}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
          {eventChatEnded ? (
            <div style={{ background: "#181c2e", border: "1px solid rgba(255,107,122,0.28)", borderRadius: 15, padding: 14 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13.5, color: "#ff6b7a" }}>This tournament chat has ended.</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9aa0bf", lineHeight: 1.5, marginTop: 4 }}>Messages are locked after the event window closes, and this chat cannot be resumed.</p>
            </div>
          ) : null}
          {eventChat.messages.length ? eventChat.messages.map((msg) => {
            const own = msg.teamNumber === team?.number && msg.firstName === (profile.name.split(/\s+/)[0] || profile.name);
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: own ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: own ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: own ? accent : "#181c2e", border: own ? "none" : "1px solid rgba(255,255,255,0.07)", fontFamily: "'Inter', sans-serif", fontSize: 13, color: own ? "#08090f" : "#e8eaf0", lineHeight: 1.55 }}>
                  <span style={{ display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: own ? "rgba(8,9,15,0.65)" : accent, marginBottom: 4 }}>{msg.firstName} · {msg.teamNumber}</span>
                  {msg.body}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
            );
          }) : (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <MessageCircle size={32} style={{ color: "#2a2f48", marginBottom: 12 }} />
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 15, color: "#e8eaf0", marginBottom: 5 }}>No event messages yet</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#7a80a0", lineHeight: 1.5 }}>Only first names and team numbers are shown here.</p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ padding: "8px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {eventChatStatus ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: eventChatStatus.includes("blocked") || eventChatStatus.includes("ended") || eventChatStatus.includes("failed") ? "#ff6b7a" : "#7a80a0", lineHeight: 1.4, marginBottom: 7 }}>{eventChatStatus}</p> : null}
          {eventChatEnded ? (
            <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 15, padding: "12px 13px", fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#7a80a0", textAlign: "center" }}>Chat closed automatically.</div>
          ) : (
            <div style={{ display: "flex", gap: 8, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 16, padding: "8px 8px 8px 12px", alignItems: "center" }}>
              <input value={eventChatInput} onChange={(e) => setEventChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendEventChat()} placeholder="Message event chat…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }} />
              <button onClick={handleSendEventChat} disabled={!eventChatInput.trim() || eventChatBusy} style={{ width: 36, height: 36, borderRadius: 10, background: eventChatInput.trim() && !eventChatBusy ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: eventChatInput.trim() && !eventChatBusy ? "pointer" : "default", flexShrink: 0, boxShadow: eventChatInput.trim() && !eventChatBusy ? `0 0 12px ${accent}50` : "none" }}>
                <Send size={15} style={{ color: eventChatInput.trim() && !eventChatBusy ? "#08090f" : "rgba(255,255,255,0.2)" }} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selected) {
    const avatarBg = hashColor(selected.email);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: "var(--rl-page-bottom)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "var(--rl-page-top) 14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,11,20,0.95)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => setSelectedId(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: "#fff" }}>{getInitials(selected.name)}</span>
            {selected.online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#10b981", border: "2px solid #0a0b14" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.name} {selected.teamId && <span style={{ color: accent, fontSize: 12 }}>· {selected.teamId}</span>}
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: selected.online ? "#10b981" : "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.online ? "Online" : "Workspace chat"} · {selected.email}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
          {selected.messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.5 }}>
              <MessageCircle size={32} style={{ color: "#7a80a0" }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0" }}>Start the conversation.</p>
            </div>
          )}
          {selected.messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "me" ? "flex-end" : msg.role === "system" ? "center" : "flex-start" }}>
              {msg.role === "system" ? (
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "5px 10px", fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: "#7a80a0", textAlign: "center" }}>{msg.text}</div>
              ) : (
                <>
                  {msg.attachments.length ? (
                    <div style={{ maxWidth: "76%", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: msg.role === "me" ? "flex-end" : "flex-start", marginBottom: 5 }}>
                      {msg.attachments.map((att) => <AttachmentPreview key={att.id} att={att} />)}
                    </div>
                  ) : null}
                  {msg.text ? (
                    <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: msg.role === "me" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "me" ? accent : "#181c2e", border: msg.role !== "me" ? "1px solid rgba(255,255,255,0.07)" : "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: msg.role === "me" ? "#08090f" : "#e8eaf0", fontWeight: msg.role === "me" ? 500 : 400, lineHeight: 1.55, overflowWrap: "anywhere" }}>
                      {msg.text.split("\n").map((line, index) => (
                        <span key={`${msg.id}-${index}`} style={{ display: "block", opacity: line.startsWith("Replying to ") ? 0.72 : 1, fontSize: line.startsWith("Replying to ") ? 11 : undefined }}>{line}</span>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ maxWidth: "78%", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: msg.role === "me" ? "flex-end" : "flex-start", marginTop: 5 }}>
                    {REACTIONS.map((reaction) => {
                      const active = (msg.reactions ?? []).includes(reaction);
                      return (
                        <button key={reaction} onClick={() => toggleMessageReaction(selected.id, msg.id, reaction)} style={{ minWidth: 27, height: 24, borderRadius: 999, background: active ? `${accent}22` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "45" : "rgba(255,255,255,0.07)"}`, fontSize: 12, cursor: "pointer" }}>{reaction}</button>
                      );
                    })}
                    <button onClick={() => setReplyTo({ id: msg.id, name: msg.senderName, text: msg.text || "media" })} style={{ height: 24, borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 10.5, padding: "0 8px", cursor: "pointer" }}>Reply</button>
                  </div>
                </>
              )}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: msg.status === "waiting" ? "#ff8c00" : "rgba(255,255,255,0.2)", marginTop: 3 }}>
                {msg.status === "waiting" ? "Waiting to send" : msg.time}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {attachments.length ? (
          <div style={{ padding: "4px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {attachments.map((att) => (
              <div key={att.id} style={{ position: "relative" }}>
                <AttachmentPreview att={att} />
                <button onClick={() => setAttachments((a) => a.filter((x) => x.id !== att.id))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ff3b5c", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={11} style={{ color: "#fff" }} /></button>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ padding: "8px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {replyTo ? (
            <div style={{ marginBottom: 7, background: "#111320", border: `1px solid ${accent}25`, borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: accent }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, color: accent }}>Replying to {replyTo.name}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9aa0bf", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={12} style={{ color: "#9aa0bf" }} /></button>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 16, padding: "8px 8px 8px 10px", alignItems: "center" }}>
            <label style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <ImagePlus size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
              <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
            </label>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Message…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }} />
            <button onClick={handleSend} disabled={!input.trim() && !attachments.length} style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() || attachments.length ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() || attachments.length ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0, boxShadow: input.trim() || attachments.length ? `0 0 12px ${accent}50` : "none" }}>
              <Send size={15} style={{ color: input.trim() || attachments.length ? "#08090f" : "rgba(255,255,255,0.2)" }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase()) || (c.teamId?.toLowerCase().includes(query.toLowerCase()) ?? false));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: "var(--rl-page-bottom)" }}>
      <div style={{ padding: "var(--rl-page-top) 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>TEAM COMMS</p>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2 }}>Messages</h2>
          </div>
          <button onClick={() => setShowNewConvo(true)} style={{ width: 38, height: 38, borderRadius: 12, background: accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 0 14px ${accent}40` }}>
            <Plus size={18} style={{ color: "#08090f" }} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 14px" }}>
          <Search size={16} style={{ color: "#7a80a0" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or team…" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {!filtered.length ? (
          <div style={{ textAlign: "center", padding: "54px 24px" }}>
            <MessageCircle size={34} style={{ color: "#2a2f48", marginBottom: 12 }} />
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginBottom: 6 }}>No messages yet</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0", lineHeight: 1.5 }}>Start a workspace conversation by email. Messages are saved locally until a realtime backend is configured.</p>
          </div>
        ) : null}
        {filtered.map((convo: Conversation, i) => {
          const avatarBg = hashColor(convo.email);
          return (
            <button key={convo.id} onClick={() => { markConversationRead(convo.id); setSelectedId(convo.id); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>{getInitials(convo.name)}</span>
                </div>
                {convo.online && <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#10b981", border: "2px solid #08090f" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: convo.unread > 0 ? 800 : 600, fontSize: 14, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {convo.name} {convo.teamId && <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>· {convo.teamId}</span>}
                  </p>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", flexShrink: 0 }}>{convo.lastTime}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: convo.unread > 0 ? "#b0b4c8" : "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{convo.lastMessage}</p>
                  {convo.unread > 0 && <div style={{ width: 18, height: 18, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 10, color: "#08090f" }}>{convo.unread}</span></div>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showNewConvo && (
        <div onClick={() => setShowNewConvo(false)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 402, background: "#0d0f1c", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", padding: "0 18px 24px", boxShadow: "0 18px 60px rgba(0,0,0,0.45)", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} /></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 17, color: "#e8eaf0" }}>New Message</p>
              <button onClick={() => setShowNewConvo(false)} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={15} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 14px" }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name or team name" style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#e8eaf0" }} />
              </div>
              <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 14px" }}>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email address" type="email" style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#e8eaf0" }} />
              </div>
              <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 14px" }}>
                <input value={newTeam} onChange={(e) => setNewTeam(e.target.value.toUpperCase())} placeholder={team ? `Optional team tag (${team.number})` : "Optional team tag"} style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#e8eaf0" }} />
              </div>
              <button onClick={handleNewConvo} disabled={!newName.trim() || !/\S+@\S+\.\S+/.test(newEmail)} style={{ padding: "13px", borderRadius: 14, background: newName && /\S+@\S+\.\S+/.test(newEmail) ? accent : "rgba(255,255,255,0.07)", border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: newName && /\S+@\S+\.\S+/.test(newEmail) ? "#08090f" : "#4a5070", cursor: newName && /\S+@\S+\.\S+/.test(newEmail) ? "pointer" : "default", boxShadow: newName && /\S+@\S+\.\S+/.test(newEmail) ? `0 0 16px ${accent}40` : "none" }}>
                Start Conversation
              </button>
            </div>
          </div>
          <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      )}
      {eventIntent && showEventJoin ? (
        <div onClick={() => setShowEventJoin(false)} style={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 402, background: "#0d0f1c", borderRadius: 22, border: `1px solid ${eventChatEnded ? "#ff6b7a44" : accent + "35"}`, padding: "18px 18px 20px", boxShadow: "0 18px 60px rgba(0,0,0,0.48)", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${eventChatEnded ? "#ff6b7a" : accent}18`, border: `1px solid ${eventChatEnded ? "#ff6b7a" : accent}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageCircle size={20} style={{ color: eventChatEnded ? "#ff6b7a" : accent }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: eventChatEnded ? "#ff6b7a" : accent, letterSpacing: "0.08em" }}>EVENT GROUP CHAT</p>
                <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 19, color: "#fff", margin: "2px 0 0", lineHeight: 1.15 }}>{eventIntent.name}</h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#7a80a0", marginTop: 4 }}>{eventIntent.location || eventIntent.sku || "RobotEvents tournament"}</p>
              </div>
              <button onClick={clearEventChatIntent} style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><X size={14} style={{ color: "#9aa0bf" }} /></button>
            </div>
            {eventChatEnded ? (
              <div style={{ background: "#ff6b7a12", border: "1px solid #ff6b7a30", borderRadius: 14, padding: "12px 13px", marginBottom: 14 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13, color: "#ff6b7a" }}>This tournament chat has ended.</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#b0b4c8", lineHeight: 1.5, marginTop: 4 }}>Event chats close 12 hours after the event ends and cannot be resumed.</p>
              </div>
            ) : (
              <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 13px", marginBottom: 14 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13, color: "#e8eaf0", marginBottom: 6 }}>Before you join</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.3, color: "#b0b4c8", lineHeight: 1.55 }}>
                  Your <strong style={{ color: accent }}>first name</strong> and <strong style={{ color: accent }}>team number</strong> will be visible to other MatchMind users at this tournament. Your email will not be shown.
                </p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", marginTop: 9 }}>Open {shortDateTime(opensAt)} · closes {shortDateTime(closesAt)}</p>
              </div>
            )}
            {eventChatStatus ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: eventChatStatus.includes("ended") || eventChatStatus.includes("failed") || eventChatStatus.includes("Select") ? "#ff6b7a" : "#9aa0bf", lineHeight: 1.45, marginBottom: 10 }}>{eventChatStatus}</p> : null}
            <div style={{ display: "grid", gridTemplateColumns: eventChatEnded ? "1fr" : "1fr 1fr", gap: 8 }}>
              <button onClick={clearEventChatIntent} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "12px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{eventChatEnded ? "Close" : "Cancel"}</button>
              {!eventChatEnded ? (
                <button onClick={handleJoinEventChat} disabled={eventChatBusy} style={{ background: eventChatBusy ? "rgba(255,255,255,0.08)" : accent, border: "none", borderRadius: 13, padding: "12px", color: eventChatBusy ? "#5c627e" : "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 13, cursor: eventChatBusy ? "default" : "pointer", boxShadow: eventChatBusy ? "none" : `0 0 16px ${accent}40` }}>{eventChatBusy ? "Joining..." : "Join Event Chat"}</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
