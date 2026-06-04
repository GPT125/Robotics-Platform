import { useState, useRef, useEffect } from "react";
import { Send, Search, Plus, ArrowLeft, X, Lock, MessageCircle, ImagePlus } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp, type ChatAttachment, type Conversation } from "../AppContext";
import { downscaleImage, readFileAsDataUrl } from "../media";

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

function AttachmentPreview({ att }: { att: ChatAttachment }) {
  if (att.kind === "video") {
    return <video src={att.url} controls style={{ width: 136, maxHeight: 120, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", objectFit: "cover" }} />;
  }
  return <img src={att.url} alt={att.name} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }} />;
}

export function MessagesPage() {
  const { accent } = useAccent();
  const { signedIn, profile, team, conversations, addConversation, sendConversationMessage, markConversationRead, setOnboarded } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, attachments.length]);

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
    sendConversationMessage(selected.id, { text: input.trim(), attachments });
    setInput("");
    setAttachments([]);
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

  if (!signedIn || !profile?.email) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", padding: "0 24px", justifyContent: "center", alignItems: "center", gap: 0, paddingBottom: 80 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${accent}30, #7c3aed30)`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <MessageCircle size={32} style={{ color: accent }} />
        </div>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 22, color: "#e8eaf0", textAlign: "center", marginBottom: 8 }}>Messages</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#7a80a0", textAlign: "center", lineHeight: 1.6, marginBottom: 36, maxWidth: 280 }}>
          Sign in with Google to message teammates by email inside your RoboLab workspace.
        </p>
        <button onClick={() => setOnboarded(false)} style={{ width: "100%", maxWidth: 340, padding: "14px", borderRadius: 14, background: accent, border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#08090f", cursor: "pointer", boxShadow: `0 0 20px ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Sign in with Google
        </button>
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={11} style={{ color: "#4a5070" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#4a5070" }}>Workspace-only messaging · no public DMs</span>
        </div>
      </div>
    );
  }

  if (selected) {
    const avatarBg = hashColor(selected.email);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,11,20,0.95)", backdropFilter: "blur(12px)" }}>
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
                      {msg.text}
                    </div>
                  ) : null}
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
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 80 }}>
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowNewConvo(false)} />
          <div style={{ background: "#0d0f1c", borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.1)", padding: "0 18px 36px" }}>
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
        </div>
      )}
    </div>
  );
}
