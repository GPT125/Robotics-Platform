import { useState, useRef, useEffect } from "react";
import { Send, Search, Plus, ArrowLeft, X, Mail, Lock, MessageCircle } from "lucide-react";
import { useAccent } from "../AccentContext";

interface Conversation {
  id: string;
  name: string;
  email: string;
  teamId?: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
  messages: { role: "me" | "them"; text: string; time: string }[];
}

const INITIAL_CONVOS: Conversation[] = [
  {
    id: "c1",
    name: "Alex Chen",
    email: "alex@7842a.vex",
    teamId: "7842A",
    lastMessage: "See you at States! Good luck 🤖",
    lastTime: "10:42",
    unread: 2,
    online: true,
    messages: [
      { role: "them", text: "Hey! Great match today. You guys looked really solid in Q42.", time: "10:38" },
      { role: "me", text: "Thanks! Your autonomous is insane though. How many points is that?", time: "10:39" },
      { role: "them", text: "Around 55. We spent 3 weeks tuning it 😅", time: "10:41" },
      { role: "them", text: "See you at States! Good luck 🤖", time: "10:42" },
    ],
  },
  {
    id: "c2",
    name: "Jordan Mills",
    email: "jordan@3141s.vex",
    teamId: "3141S",
    lastMessage: "Alliance selection tomorrow at 9am",
    lastTime: "Yesterday",
    unread: 0,
    online: false,
    messages: [
      { role: "them", text: "Hey, are you guys planning to pick in the first round?", time: "Yesterday" },
      { role: "me", text: "Probably, depends on who's available. You interested?", time: "Yesterday" },
      { role: "them", text: "Alliance selection tomorrow at 9am", time: "Yesterday" },
    ],
  },
  {
    id: "c3",
    name: "Priya Ravi",
    email: "priya@9090z.vex",
    teamId: "9090Z",
    lastMessage: "Can you share your auton path setup?",
    lastTime: "Jun 1",
    unread: 1,
    online: true,
    messages: [
      { role: "them", text: "Your autonomous was really consistent during quals!", time: "Jun 1" },
      { role: "me", text: "Thanks, we use odometry + PID. Took a while to tune.", time: "Jun 1" },
      { role: "them", text: "Can you share your auton path setup?", time: "Jun 1" },
    ],
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
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

export function MessagesPage() {
  const { accent } = useAccent();
  const [isAuthed, setIsAuthed] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [convos, setConvos] = useState<Conversation[]>(INITIAL_CONVOS);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  const handleSend = () => {
    if (!input.trim() || !selected) return;
    const msg = { role: "me" as const, text: input.trim(), time: getTime() };
    const updated = convos.map((c) =>
      c.id === selected.id
        ? { ...c, messages: [...c.messages, msg], lastMessage: input.trim(), lastTime: getTime() }
        : c
    );
    setConvos(updated);
    setSelected(updated.find((c) => c.id === selected.id)!);
    setInput("");
  };

  const handleNewConvo = () => {
    if (!newEmail.trim() || !newName.trim()) return;
    const convo: Conversation = {
      id: `c${Date.now()}`,
      name: newName,
      email: newEmail,
      lastMessage: "New conversation",
      lastTime: getTime(),
      unread: 0,
      online: false,
      messages: [],
    };
    setConvos((prev) => [convo, ...prev]);
    setSelected(convo);
    setShowNewConvo(false);
    setNewEmail("");
    setNewName("");
  };

  // Google sign-in gate
  if (!isAuthed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", padding: "0 24px", justifyContent: "center", alignItems: "center", gap: 0, paddingBottom: 80 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${accent}30, #7c3aed30)`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <MessageCircle size={32} style={{ color: accent }} />
        </div>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 22, color: "#e8eaf0", textAlign: "center", marginBottom: 8 }}>Messages</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#7a80a0", textAlign: "center", lineHeight: 1.6, marginBottom: 36, maxWidth: 280 }}>
          Sign in with Google to message other teams by email. Your identity is linked to your Google account.
        </p>

        {/* Email input (demo auth) */}
        <div style={{ width: "100%", maxWidth: 340 }}>
          <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Mail size={16} style={{ color: "#7a80a0", flexShrink: 0 }} />
            <input
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#e8eaf0" }}
            />
          </div>

          <button
            onClick={() => authEmail.includes("@") && setIsAuthed(true)}
            style={{ width: "100%", padding: "14px", borderRadius: 14, background: accent, border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#08090f", cursor: "pointer", boxShadow: `0 0 20px ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#08090f" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#08090f" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#08090f" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#08090f" />
            </svg>
            Sign in with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#4a5070" }}>Demo mode</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          <button
            onClick={() => setIsAuthed(true)}
            style={{ width: "100%", padding: "12px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 13, color: "#7a80a0", cursor: "pointer" }}
          >
            Continue without signing in
          </button>
        </div>

        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={11} style={{ color: "#4a5070" }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#4a5070" }}>Messages are end-to-end encrypted</span>
        </div>
      </div>
    );
  }

  // Conversation view
  if (selected) {
    const avatarBg = hashColor(selected.email);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 72 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,11,20,0.95)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: "#fff" }}>{getInitials(selected.name)}</span>
            {selected.online && (
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#10b981", border: "2px solid #0a0b14" }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", lineHeight: 1.1 }}>
              {selected.name} {selected.teamId && <span style={{ color: accent, fontSize: 12 }}>· {selected.teamId}</span>}
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: selected.online ? "#10b981" : "#7a80a0" }}>
              {selected.online ? "Online" : "Offline"} · {selected.email}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
          {selected.messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.5 }}>
              <MessageCircle size={32} style={{ color: "#7a80a0" }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0" }}>Start the conversation!</p>
            </div>
          )}
          {selected.messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "me" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "76%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "me" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "me" ? accent : "#181c2e",
                  border: msg.role === "them" ? "1px solid rgba(255,255,255,0.07)" : "none",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: msg.role === "me" ? "#08090f" : "#e8eaf0",
                  fontWeight: msg.role === "me" ? 500 : 400,
                  lineHeight: 1.55,
                }}
              >
                {msg.text}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
                {msg.time}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "8px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 8, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 16, padding: "8px 8px 8px 16px", alignItems: "center" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Message…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0, boxShadow: input.trim() ? `0 0 12px ${accent}50` : "none" }}>
              <Send size={15} style={{ color: input.trim() ? "#08090f" : "rgba(255,255,255,0.2)" }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filtered = convos.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      (c.teamId?.toLowerCase().includes(query.toLowerCase()) ?? false)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>TEAM COMMS</p>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2 }}>Messages</h2>
          </div>
          <button
            onClick={() => setShowNewConvo(true)}
            style={{ width: 38, height: 38, borderRadius: 12, background: accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: `0 0 14px ${accent}40` }}
          >
            <Plus size={18} style={{ color: "#08090f" }} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 14px" }}>
          <Search size={16} style={{ color: "#7a80a0" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or team…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }}
          />
        </div>
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {filtered.map((convo, i) => {
          const avatarBg = hashColor(convo.email);
          return (
            <button
              key={convo.id}
              onClick={() => { setConvos((prev) => prev.map((c) => c.id === convo.id ? { ...c, unread: 0 } : c)); setSelected({ ...convo, unread: 0 }); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>{getInitials(convo.name)}</span>
                </div>
                {convo.online && (
                  <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#10b981", border: "2px solid #08090f" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: convo.unread > 0 ? 800 : 600, fontSize: 14, color: "#e8eaf0" }}>
                    {convo.name} {convo.teamId && <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>· {convo.teamId}</span>}
                  </p>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{convo.lastTime}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: convo.unread > 0 ? "#b0b4c8" : "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                    {convo.lastMessage}
                  </p>
                  {convo.unread > 0 && (
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 10, color: "#08090f" }}>{convo.unread}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* New conversation modal */}
      {showNewConvo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowNewConvo(false)} />
          <div style={{ background: "#0d0f1c", borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.1)", padding: "0 18px 36px" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 17, color: "#e8eaf0" }}>New Message</p>
              <button onClick={() => setShowNewConvo(false)} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={15} style={{ color: "#e8eaf0" }} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 14px" }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name or team name" style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#e8eaf0" }} />
              </div>
              <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 14px" }}>
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email address" type="email" style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#e8eaf0" }} />
              </div>
              <button
                onClick={handleNewConvo}
                disabled={!newName.trim() || !newEmail.trim()}
                style={{ padding: "13px", borderRadius: 14, background: newName && newEmail ? accent : "rgba(255,255,255,0.07)", border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: newName && newEmail ? "#08090f" : "#4a5070", cursor: newName && newEmail ? "pointer" : "default", boxShadow: newName && newEmail ? `0 0 16px ${accent}40` : "none" }}
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
