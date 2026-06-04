import { useRef, useState } from "react";
import { ArrowLeft, Plus, Check, Trash2, Sparkles, Flag, Loader2, Paperclip, Bell, Star } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp, type AppAttachment, type Todo } from "../AppContext";
import { askCoach } from "../../../services/api";
import { downscaleImage, readFileAsDataUrl } from "../media";

const PRIORITIES: { id: Todo["priority"]; label: string; color: string }[] = [
  { id: "critical", label: "Critical", color: "#ff3b5c" },
  { id: "high", label: "High", color: "#ff8c00" },
  { id: "medium", label: "Medium", color: "#00c8ff" },
  { id: "low", label: "Low", color: "#7a80a0" },
];
const TAGS = ["build", "code", "notebook", "scouting", "drive", "tournament"];
const VIEWS = ["All", "Assigned to Me", "Due Today", "Robot Fixes", "Notebook Tasks", "Tournament Prep", "Scouting Tasks", "Flagged"];
const SECTIONS = ["General", "Robot Fixes", "Notebook", "Tournament Prep", "Scouting", "Code"];

export function TodoPage({ onBack }: { onBack: () => void }) {
  const { accent } = useAccent();
  const { todos, teammates, addTodo, updateTodo, toggleTodo, deleteTodo } = useApp();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Todo["priority"]>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");
  const [shared, setShared] = useState(false);
  const [view, setView] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filteredTodos = todos.filter((t) => {
    const today = new Date().toISOString().slice(0, 10);
    if (view === "Assigned to Me") return Boolean(t.assignee);
    if (view === "Due Today") return t.due === today || t.alertAt?.startsWith(today);
    if (view === "Robot Fixes") return t.tags.includes("build") || /fix|repair|robot/i.test(t.title + t.notes);
    if (view === "Notebook Tasks") return t.tags.includes("notebook") || /notebook|entry/i.test(t.title + t.notes);
    if (view === "Tournament Prep") return t.tags.includes("tournament") || t.section === "Tournament Prep";
    if (view === "Scouting Tasks") return t.tags.includes("scouting") || t.section === "Scouting";
    if (view === "Flagged") return t.flagged;
    return true;
  });
  const open = filteredTodos.filter((t) => !t.done);
  const done = filteredTodos.filter((t) => t.done);
  const total = filteredTodos.length;
  const completion = total ? Math.round((done.length / total) * 100) : 0;
  const criticalCount = open.filter((t) => t.priority === "critical" || t.flagged).length;
  const dueToday = filteredTodos.filter((t) => {
    const today = new Date().toISOString().slice(0, 10);
    return !t.done && (t.due === today || t.alertAt?.startsWith(today));
  }).length;

  function add() {
    if (!title.trim()) return;
    addTodo({ title: title.trim(), priority, tags: tag ? [tag] : [], due: due || null, assignee: assignee || null, shared, section: tag === "notebook" ? "Notebook" : tag === "scouting" ? "Scouting" : tag === "tournament" ? "Tournament Prep" : "General" });
    setTitle("");
    setPriority(null);
    setTag(null);
    setDue("");
    setAssignee("");
    setShared(false);
  }

  async function breakIntoSteps(t: Todo) {
    setAiBusy(t.id);
    try {
      const r = await askCoach({ messages: [{ role: "user", content: `Break this VEX robotics task into 3-6 short actionable sub-steps. Reply ONLY as a plain list, one step per line, no numbering: "${t.title}"` }] });
      const steps = r.answer.split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter((l) => l && l.length < 90).slice(0, 6);
      if (steps.length) updateTodo(t.id, { subtasks: [...t.subtasks, ...steps.map((s) => ({ id: `${Date.now()}${Math.random()}`, title: s, done: false }))] });
      setExpanded(t.id);
    } catch { /* ignore */ } finally { setAiBusy(null); }
  }

  async function aiTaskTool(t: Todo, mode: "notebook" | "parts" | "checklist") {
    setAiBusy(t.id);
    const prompt =
      mode === "notebook"
        ? `Turn this robotics task into a concise engineering notebook entry draft with observations, next steps, and evidence needed: "${t.title}". Existing notes: ${t.notes}`
        : mode === "parts"
          ? `Estimate likely VEX V5 parts/tools needed for this task without inventing exact quantities unless obvious. Make it a short checklist: "${t.title}". Existing notes: ${t.notes}`
          : `Create a tournament-day checklist for this VEX task. Keep it short and actionable: "${t.title}". Existing notes: ${t.notes}`;
    try {
      const r = await askCoach({ messages: [{ role: "user", content: prompt }] });
      updateTodo(t.id, { notes: [t.notes, r.answer.replace(/^confidence:.*$/gim, "").trim()].filter(Boolean).join("\n\n") });
      setExpanded(t.id);
    } catch {
      // keep existing notes if AI is unavailable
    } finally {
      setAiBusy(null);
    }
  }

  async function attachFiles(t: Todo, files: FileList | null) {
    if (!files?.length) return;
    const next: AppAttachment[] = [];
    for (const file of Array.from(files).slice(0, 3)) {
      const raw = await readFileAsDataUrl(file);
      const url = file.type.startsWith("image") ? await downscaleImage(raw, 900, 0.82) : raw;
      next.push({ id: `${Date.now()}-${next.length}`, kind: file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "file", name: file.name, url });
    }
    updateTodo(t.id, { attachments: [...t.attachments, ...next] });
  }

  const pColor = (p: Todo["priority"]) => PRIORITIES.find((x) => x.id === p)?.color;

  function Row({ t }: { t: Todo }) {
    const isOpen = expanded === t.id;
    const priorityColor = pColor(t.priority) ?? (t.done ? "#10b981" : "#2a2f48");
    return (
      <div style={{ background: "#111320", border: `1px solid ${t.priority ? priorityColor + "30" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden", position: "relative", boxShadow: t.flagged ? "0 0 18px rgba(245,158,11,0.08)" : "none" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: priorityColor, opacity: t.done ? 0.35 : 0.9 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
          <button onClick={() => toggleTodo(t.id)} style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${t.done ? accent : "rgba(255,255,255,0.25)"}`, background: t.done ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            {t.done ? <Check size={13} style={{ color: "#08090f" }} /> : null}
          </button>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpanded(isOpen ? null : t.id)}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, color: t.done ? "#5c627e" : "#e8eaf0", textDecoration: t.done ? "line-through" : "none", cursor: "pointer" }}>{t.title}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: t.done ? "#10b981" : accent, background: t.done ? "#10b98116" : `${accent}14`, padding: "1px 6px", borderRadius: 5 }}>{t.status}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0", background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 5 }}>{t.section}</span>
              {t.priority ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: pColor(t.priority), background: `${pColor(t.priority)}1a`, padding: "1px 6px", borderRadius: 5 }}><Flag size={9} />{t.priority}</span> : null}
              {t.tags.map((tg) => <span key={tg} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#9aa0bf", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 5 }}>#{tg}</span>)}
              {t.assignee ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: accent }}>@{t.assignee}</span> : null}
              {t.due ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0" }}>{t.due}</span> : null}
              {t.flagged ? <Star size={10} style={{ color: "#f59e0b", fill: "#f59e0b" }} /> : null}
              {t.subtasks.length ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#7a80a0" }}>{t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}</span> : null}
            </div>
          </div>
          <button onClick={() => deleteTodo(t.id)} style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, padding: 4 }}><Trash2 size={15} style={{ color: "#4a5070" }} /></button>
        </div>
        {isOpen ? (
          <div style={{ padding: "0 14px 12px 47px", display: "flex", flexDirection: "column", gap: 8 }}>
            {t.subtasks.map((s) => (
              <button key={s.id} onClick={() => updateTodo(t.id, { subtasks: t.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${s.done ? accent : "rgba(255,255,255,0.25)"}`, background: s.done ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.done ? <Check size={9} style={{ color: "#08090f" }} /> : null}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: s.done ? "#5c627e" : "#cfd3e6", textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
              </button>
            ))}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => breakIntoSteps(t)} disabled={aiBusy === t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${accent}14`, border: `1px solid ${accent}35`, borderRadius: 12, padding: "5px 10px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {aiBusy === t.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />} AI: break into steps
              </button>
              {teammates.length ? (
                <select value={t.assignee ?? ""} onChange={(e) => updateTodo(t.id, { assignee: e.target.value || null })} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "5px 10px", color: "#cfd3e6", fontSize: 11, outline: "none" }}>
                  <option value="">Unassigned</option>
                  {teammates.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              ) : null}
              <button onClick={() => updateTodo(t.id, { flagged: !t.flagged })} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: t.flagged ? "#f59e0b18" : "rgba(255,255,255,0.04)", border: `1px solid ${t.flagged ? "#f59e0b40" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "5px 10px", color: t.flagged ? "#f59e0b" : "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Star size={12} />Flag</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="date" value={t.due ?? ""} onChange={(e) => updateTodo(t.id, { due: e.target.value || null })} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 10px", color: "#cfd3e6", fontSize: 11, outline: "none" }} />
              <input type="datetime-local" value={t.alertAt ?? ""} onChange={(e) => updateTodo(t.id, { alertAt: e.target.value || null })} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 10px", color: "#cfd3e6", fontSize: 11, outline: "none" }} />
              <select value={t.status} onChange={(e) => updateTodo(t.id, { status: e.target.value as Todo["status"], done: e.target.value === "done" })} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 10px", color: "#cfd3e6", fontSize: 11, outline: "none" }}>
                <option value="todo">To do</option>
                <option value="doing">Doing</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <select value={t.section} onChange={(e) => updateTodo(t.id, { section: e.target.value })} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 10px", color: "#cfd3e6", fontSize: 11, outline: "none" }}>
                {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={t.repeat} onChange={(e) => updateTodo(t.id, { repeat: e.target.value as Todo["repeat"] })} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 10px", color: "#cfd3e6", fontSize: 11, outline: "none" }}>
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="event">Tournament reminder</option>
              </select>
              <button onClick={() => updateTodo(t.id, { shared: !t.shared })} style={{ background: t.shared ? `${accent}14` : "#181c2e", border: `1px solid ${t.shared ? accent + "35" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "8px 10px", color: t.shared ? accent : "#cfd3e6", fontSize: 11, outline: "none", cursor: "pointer" }}>{t.shared ? "Shared team task" : "Individual task"}</button>
            </div>
            <textarea value={t.notes} onChange={(e) => updateTodo(t.id, { notes: e.target.value })} placeholder="Notes, comments, or notebook details…" style={{ width: "100%", minHeight: 64, boxSizing: "border-box", background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "9px 10px", color: "#cfd3e6", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "'Inter', sans-serif" }} />
            {t.attachments.length ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {t.attachments.map((a) => (
                  <button key={a.id} onClick={() => updateTodo(t.id, { attachments: t.attachments.filter((x) => x.id !== a.id) })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "5px 8px", color: "#9aa0bf", fontSize: 10, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>{a.name}</button>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => fileRefs.current[t.id]?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "5px 10px", color: "#9aa0bf", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Paperclip size={12} />Attach</button>
              <input ref={(el) => { fileRefs.current[t.id] = el; }} type="file" accept="image/*,video/*,.pdf,.txt" multiple style={{ display: "none" }} onChange={(e) => { attachFiles(t, e.target.files); e.currentTarget.value = ""; }} />
              <button onClick={() => aiTaskTool(t, "notebook")} disabled={aiBusy === t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${accent}14`, border: `1px solid ${accent}35`, borderRadius: 12, padding: "5px 10px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Sparkles size={12} />Notebook</button>
              <button onClick={() => aiTaskTool(t, "parts")} disabled={aiBusy === t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${accent}14`, border: `1px solid ${accent}35`, borderRadius: 12, padding: "5px 10px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Sparkles size={12} />Parts</button>
              <button onClick={() => aiTaskTool(t, "checklist")} disabled={aiBusy === t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${accent}14`, border: `1px solid ${accent}35`, borderRadius: 12, padding: "5px 10px", color: accent, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, cursor: "pointer" }}><Bell size={12} />Checklist</button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: 96 }}>
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "rgba(8,9,15,0.9)", backdropFilter: "blur(12px)", zIndex: 5 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 11, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ArrowLeft size={18} style={{ color: "#e8eaf0" }} /></button>
        <div>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 22, color: "#fff", margin: 0 }}>Task Center</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", margin: 0 }}>{open.length} open · {done.length} done</p>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ background: "linear-gradient(135deg, #111320 0%, #12142a 100%)", border: `1px solid ${accent}25`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em" }}>TEAM TASK HEALTH</p>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", marginTop: 2 }}>{completion}% complete</p>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 15, background: `${accent}18`, border: `1px solid ${accent}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={22} style={{ color: accent }} />
            </div>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: `${completion}%`, height: "100%", background: `linear-gradient(90deg, ${accent}, #10b981)`, borderRadius: 8, transition: "width 0.25s" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "OPEN", value: open.length, color: accent },
              { label: "DUE", value: dueToday, color: "#ff8c00" },
              { label: "FOCUS", value: criticalCount, color: "#ff3b5c" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "9px 8px", textAlign: "center" }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 18, color: item.color }}>{item.value}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: "#7a80a0", marginTop: 1 }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add */}
        <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task…" style={{ flex: 1, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px 14px", color: "#e8eaf0", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14 }} />
            <button onClick={add} disabled={!title.trim()} style={{ width: 44, height: 44, borderRadius: 12, background: title.trim() ? accent : "rgba(255,255,255,0.06)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: title.trim() ? "pointer" : "default", flexShrink: 0 }}><Plus size={20} style={{ color: title.trim() ? "#08090f" : "#5c627e" }} /></button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {PRIORITIES.map((p) => (
              <button key={p.id} onClick={() => setPriority(priority === p.id ? null : p.id)} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: priority === p.id ? "#08090f" : p.color, background: priority === p.id ? p.color : `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: 8, padding: "4px 9px", cursor: "pointer" }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {TAGS.map((tg) => (
              <button key={tg} onClick={() => setTag(tag === tg ? null : tg)} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: tag === tg ? accent : "#7a80a0", background: tag === tg ? `${accent}1a` : "rgba(255,255,255,0.04)", border: `1px solid ${tag === tg ? accent + "40" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "4px 9px", cursor: "pointer" }}>#{tg}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "9px 10px", color: "#cfd3e6", fontSize: 12, outline: "none" }} />
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "9px 10px", color: "#cfd3e6", fontSize: 12, outline: "none" }}>
              <option value="">Unassigned</option>
              {teammates.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <button onClick={() => setShared(!shared)} style={{ marginTop: 8, background: shared ? `${accent}14` : "rgba(255,255,255,0.04)", border: `1px solid ${shared ? accent + "40" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "7px 10px", color: shared ? accent : "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{shared ? "Shared team task" : "Individual task"}</button>
        </div>

        <div style={{ display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "none", marginBottom: 14, paddingBottom: 2 }}>
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ flexShrink: 0, background: view === v ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${view === v ? accent + "40" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "6px 10px", color: view === v ? accent : "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{v}</button>
          ))}
        </div>

        {filteredTodos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#5c627e" }}>
            <Check size={32} style={{ color: "#2a2f48", marginBottom: 10 }} />
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, color: "#9aa0bf" }}>No tasks yet</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12 }}>Add build, code, notebook, or tournament-prep tasks above.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {open.map((t) => <Row key={t.id} t={t} />)}
            {done.length ? (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5c627e", margin: "10px 2px 2px" }}>COMPLETED ({done.length})</p>
            ) : null}
            {done.map((t) => <Row key={t.id} t={t} />)}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
