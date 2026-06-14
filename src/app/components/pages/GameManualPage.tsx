import { useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink, Loader2, FileText } from "lucide-react";
import { useAccent } from "../AccentContext";
import { useApp } from "../AppContext";
import { GAME_MANUALS, manualForProgram, type GameManual } from "../../../services/manuals";

export function GameManualPage({ onBack }: { onBack: () => void }) {
  const { accent } = useAccent();
  const { team } = useApp();
  // Default to the manual matching the user's team program.
  const [selected, setSelected] = useState<GameManual>(() => manualForProgram(team?.program?.code));
  const [loading, setLoading] = useState(true);

  function pick(manual: GameManual) {
    if (manual.id !== selected.id) setLoading(true);
    setSelected(manual);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div style={{ padding: "var(--rl-page-top) 16px 12px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 11, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={18} style={{ color: "#e8eaf0" }} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 19, color: "#fff", margin: 0 }}>Game Manuals</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", margin: 0 }}>Official VEX rules · {selected.season} season</p>
        </div>
        <BookOpen size={20} style={{ color: accent }} />
      </div>

      {/* Program selector */}
      <div style={{ padding: "12px 16px 8px", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GAME_MANUALS.map((m) => {
            const active = selected.id === m.id;
            return (
              <button key={m.id} onClick={() => pick(m)} style={{ textAlign: "left", background: active ? `${accent}16` : "#111320", border: `1px solid ${active ? accent + "55" : "rgba(255,255,255,0.08)"}`, borderRadius: 13, padding: "11px 12px", cursor: "pointer" }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, color: active ? accent : "#e8eaf0", lineHeight: 1.15 }}>{m.name}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#7a80a0", marginTop: 3 }}>{m.game}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected manual meta + actions */}
      <div style={{ padding: "4px 16px 10px", flexShrink: 0 }}>
        <div style={{ background: "linear-gradient(135deg, #111320, #12142a)", border: `1px solid ${accent}26`, borderRadius: 14, padding: "12px 14px" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#9aa0bf", lineHeight: 1.45 }}>{selected.blurb}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <a href={selected.pdf} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: accent, borderRadius: 10, padding: "9px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, textDecoration: "none" }}>
              <FileText size={13} /> Open PDF
            </a>
            <a href={selected.official} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 11.5, textDecoration: "none" }}>
              <ExternalLink size={13} /> Latest version
            </a>
          </div>
        </div>
      </div>

      {/* In-app PDF viewer */}
      <div style={{ flex: 1, minHeight: 0, margin: "0 16px 16px", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0d0f1c", position: "relative" }}>
        {loading ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#7a80a0", pointerEvents: "none" }}>
            <Loader2 size={22} style={{ color: accent, animation: "spin 1s linear infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Loading {selected.game} manual…</span>
          </div>
        ) : null}
        <iframe
          key={selected.id}
          title={`${selected.name} manual`}
          // Route through Google's viewer so the PDF renders inline even though
          // VEX's CDN blocks direct iframe embedding in browsers.
          src={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(selected.pdf)}`}
          onLoad={() => setLoading(false)}
          style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
        />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
