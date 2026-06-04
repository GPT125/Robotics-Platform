import { useState, useRef, useEffect } from "react";
import { Send, BrainCircuit, Sparkles, Link2, ChevronDown, ImagePlus, Camera, X } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp } from "../AppContext";
import { askCoach, type CoachSource } from "../../../services/api";
import { downscaleImage, readFileAsDataUrl, extractVideoFrames } from "../media";

type Attachment = { id: string; kind: "image" | "video"; preview: string; images: string[] };
type Message = { role: "user" | "ai"; text: string; time: string; sources?: CoachSource[]; images?: string[] };

const quickPrompts = [
  "How do I improve my autonomous?",
  "Best alliance partner strategies?",
  "Fix my drivetrain pulling to one side",
  "Common beginner mistakes?",
  "Endgame hang tips?",
  "Analyze my robot from a photo",
];

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mdToHtml(text: string, accent: string) {
  const lines = escapeHtml(text).replace(/\r/g, "").split("\n");
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${accent}">$1</strong>`)
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11.5px">$1</code>')
      .replace(/\[(\d+)\]/g, `<sup style="color:${accent};font-weight:700">[$1]</sup>`);
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-*]\s+(.*)/) || line.match(/^\d+\.\s+(.*)/);
    if (bullet) {
      if (!inList) { html += '<ul style="margin:4px 0;padding-left:16px;display:flex;flex-direction:column;gap:3px">'; inList = true; }
      html += `<li>${inline(bullet[1])}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (!line) { html += '<div style="height:6px"></div>'; continue; }
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    if (heading) { html += `<div style="font-weight:800;margin-top:6px;color:#f0f2f8">${inline(heading[2])}</div>`; continue; }
    if (/^confidence:/i.test(line)) continue; // never show confidence
    html += `<div style="margin:2px 0">${inline(line)}</div>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function Sources({ sources, accent }: { sources: CoachSource[]; accent: string }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div style={{ paddingLeft: 36, marginTop: 6 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${accent}12`, border: `1px solid ${accent}35`, borderRadius: 14, padding: "4px 10px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
        <Link2 size={12} /> Sources ({sources.length})
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </button>
      {open ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
          {sources.map((s, i) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 6, alignItems: "flex-start", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#d6dae6", textDecoration: "none" }}>
              <span style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>[{i + 1}]</span>
              <span>{s.title}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CoachPage() {
  const { accent } = useAccent();
  const { team, profile } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hey! I'm **RoboLab AI**. Ask me anything — strategy, autonomous, driver skills, alliance picks, or robot fixes. You can also attach a **photo or video** of your robot and I'll tell you what to improve. 🤖",
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [processing, setProcessing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, attachments]);

  // Auto-grow the textarea (expands upward because the bar is anchored at the bottom)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  function platformContext() {
    const parts = [
      team ? `Our team: ${team.number} ${team.team_name} (${team.organization}).` : "No team selected yet.",
      profile?.name ? `User: ${profile.name}.` : "",
    ];
    return parts.filter(Boolean).join(" ");
  }

  async function onFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setProcessing(true);
    try {
      const next: Attachment[] = [];
      for (const file of Array.from(list).slice(0, 4)) {
        if (file.type.startsWith("video")) {
          const frames = await extractVideoFrames(file);
          if (frames.length) next.push({ id: `a${Date.now()}${next.length}`, kind: "video", preview: frames[0], images: frames });
        } else if (file.type.startsWith("image")) {
          const raw = await readFileAsDataUrl(file);
          const compressed = await downscaleImage(raw);
          next.push({ id: `a${Date.now()}${next.length}`, kind: "image", preview: compressed, images: [compressed] });
        }
      }
      setAttachments((cur) => [...cur, ...next].slice(0, 6));
    } finally {
      setProcessing(false);
    }
  }

  const send = async (text: string) => {
    const q = text.trim();
    if ((!q && !attachments.length) || isTyping) return;
    const sending = attachments;
    const images = sending.flatMap((a) => a.images);
    const previews = sending.map((a) => a.preview);
    const history = messages.map((m) => ({ role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user", content: m.text }));
    const userText = q || "Analyze the attached robot media and tell me what to fix.";
    setMessages((prev) => [...prev, { role: "user", text: userText, time: getTime(), images: previews }]);
    setInput("");
    setAttachments([]);
    setIsTyping(true);
    try {
      const result = await askCoach({ messages: [...history, { role: "user", content: userText }], context: platformContext(), images });
      setMessages((prev) => [...prev, { role: "ai", text: result.answer, time: getTime(), sources: result.sources }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: err instanceof Error ? err.message : "I could not reach the AI right now — please try again.", time: getTime() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 78 }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,11,20,0.8)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${accent} 0%, #7c3aed 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${accent}40` }}>
            <BrainCircuit size={17} style={{ color: "#fff" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "15px", color: "#e8eaf0", lineHeight: 1.1 }}>RoboLab AI</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#10b981" }}>Online · grounded in VEX Forum</span>
            </div>
          </div>
          <Sparkles size={16} style={{ color: accent, opacity: 0.7, marginLeft: "auto" }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12, scrollbarWidth: "none", minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "ai" ? (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                    <BrainCircuit size={13} style={{ color: "#fff" }} />
                  </div>
                  <div
                    style={{ maxWidth: "84%", padding: "11px 14px", borderRadius: "18px 18px 18px 4px", background: "#181c2e", border: "1px solid rgba(255,255,255,0.07)", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0", lineHeight: 1.6, overflowWrap: "anywhere" }}
                    dangerouslySetInnerHTML={{ __html: mdToHtml(msg.text, accent) }}
                  />
                </div>
                {msg.sources?.length ? <Sources sources={msg.sources} accent={accent} /> : null}
              </div>
            ) : (
              <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {msg.images?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "flex-end" }}>
                    {msg.images.map((src, k) => <img key={k} src={src} alt="" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }} />)}
                  </div>
                ) : null}
                {msg.text ? (
                  <div style={{ padding: "11px 14px", borderRadius: "18px 18px 4px 18px", background: accent, fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#08090f", fontWeight: 500, lineHeight: 1.55 }}>{msg.text}</div>
                ) : null}
              </div>
            )}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "rgba(255,255,255,0.2)", marginTop: 4, paddingLeft: msg.role === "ai" ? 36 : 0 }}>{msg.time}</span>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BrainCircuit size={13} style={{ color: "#fff" }} />
            </div>
            <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: accent, opacity: 0.7, animation: `typingBounce 1.2s ${i * 0.18}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 ? (
        <div style={{ padding: "4px 12px 6px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            {quickPrompts.map((qp) => (
              <button key={qp} onClick={() => send(qp)} style={{ flexShrink: 0, background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}30`, borderRadius: "20px", padding: "6px 13px", fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.7)", cursor: "pointer", whiteSpace: "nowrap" }}>{qp}</button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Attachment tray */}
      {attachments.length || processing ? (
        <div style={{ padding: "4px 14px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
          {processing ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: accent }}>Processing…</span> : null}
          {attachments.map((a) => (
            <div key={a.id} style={{ position: "relative", width: 52, height: 52 }}>
              <img src={a.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }} />
              {a.kind === "video" ? <span style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.65)", borderRadius: 5, padding: "0 4px", fontSize: 9, color: "#fff" }}>{a.images.length}f</span> : null}
              <button onClick={() => setAttachments((c) => c.filter((x) => x.id !== a.id))} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ff3b5c", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={11} /></button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Input bar */}
      <div style={{ padding: "6px 12px 10px", background: "rgba(10,11,20,0.9)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, background: "#181c2e", border: `1px solid ${accent}25`, borderRadius: 16, padding: "6px 6px 6px 8px", alignItems: "flex-end", boxShadow: `0 0 20px ${accent}08` }}>
          <label style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ImagePlus size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
            <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
          </label>
          <label style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Camera size={17} style={{ color: "rgba(255,255,255,0.5)" }} />
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
          </label>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask your coach anything..."
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", maxHeight: 120, fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0", padding: "8px 2px", lineHeight: 1.4 }}
          />
          <button onClick={() => send(input)} disabled={(!input.trim() && !attachments.length) || isTyping} style={{ width: 36, height: 36, borderRadius: 10, background: (input.trim() || attachments.length) && !isTyping ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: (input.trim() || attachments.length) && !isTyping ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0, boxShadow: (input.trim() || attachments.length) && !isTyping ? `0 0 12px ${accent}50` : "none" }}>
            <Send size={15} style={{ color: (input.trim() || attachments.length) && !isTyping ? "#08090f" : "rgba(255,255,255,0.2)" }} />
          </button>
        </div>
      </div>

      <style>{`@keyframes typingBounce {0%,60%,100%{transform:translateY(0);opacity:0.5;}30%{transform:translateY(-6px);opacity:1;}}`}</style>
    </div>
  );
}
