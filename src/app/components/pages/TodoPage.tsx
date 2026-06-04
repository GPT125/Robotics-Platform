import { useState } from "react";
import { ArrowLeft, Plus, Check, Trash2, Sparkles, ChevronDown, Flag, Loader2 } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp, type Todo } from "../AppContext";
import { askCoach } from "../../../services/api";

const PRIORITIES: { id: Todo["priority"]; label: string; color: string }[] = [
  { id: "critical", label: "Critical", color: "#ff3b5c" },
  { id: "high", label: "High", color: "#ff8c00" },
  { id: "medium", label: "Medium", color: "#00c8ff" },
  { id: "low", label: "Low", color: "#7a80a0" },
];
const TAGS = ["build", "code", "notebook", "scouting", "drive", "tournament"];

export function TodoPage({ onBack }: { onBack: () => void }) {
  const { accent } = useAccent();
  const { todos, teammates, addTodo, updateTodo, toggleTodo, deleteTodo } = useApp();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Todo["priority"]>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  function add() {
    if (!title.trim()) return;
    addTodo({ title: title.trim(), priority, tags: tag ? [tag] : [] });
    setTitle("");
    setPriority(null);
    setTag(null);
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

  const pColor = (p: Todo["priority"]) => PRIORITIES.find((x) => x.id === p)?.color;

  function Row({ t }: { t: Todo }) {
    const isOpen = expanded === t.id;
    return (
      <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
          <button onClick={() => toggleTodo(t.id)} style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${t.done ? accent : "rgba(255,255,255,0.25)"}`, background: t.done ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            {t.done ? <Check size={13} style={{ color: "#08090f" }} /> : null}
          </button>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpanded(isOpen ? null : t.id)}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, color: t.done ? "#5c627e" : "#e8eaf0", textDecoration: t.done ? "line-through" : "none", cursor: "pointer" }}>{t.title}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
              {t.priority ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: pColor(t.priority), background: `${pColor(t.priority)}1a`, padding: "1px 6px", borderRadius: 5 }}><Flag size={9} />{t.priority}</span> : null}
              {t.tags.map((tg) => <span key={tg} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#9aa0bf", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 5 }}>#{tg}</span>)}
              {t.assignee ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: accent }}>@{t.assignee}</span> : null}
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
        </div>

        {todos.length === 0 ? (
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
