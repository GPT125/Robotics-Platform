import { useEffect, useRef, useState } from "react";
import { Search, Check, Loader2 } from "lucide-react";
import { searchTeams, type RoboTeamResult } from "../../services/api";
import { useAccent } from "./AccentContext";
import type { RoboTeam } from "./AppContext";

export function TeamSearch({ onSelect, selectedId }: { onSelect: (team: RoboTeam) => void; selectedId?: number }) {
  const { accent } = useAccent();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RoboTeamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    setTouched(true);
    timer.current = setTimeout(async () => {
      const r = await searchTeams(q);
      setResults(r);
      setLoading(false);
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#181c2e", border: `1px solid ${accent}30`, borderRadius: 14, padding: "10px 14px" }}>
        {loading ? <Loader2 size={16} style={{ color: accent, animation: "spin 1s linear infinite" }} /> : <Search size={16} style={{ color: "rgba(255,255,255,0.4)" }} />}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Enter your team number (e.g. 24B)"
          autoFocus
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", fontSize: 14 }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto", scrollbarWidth: "none" }}>
        {results.map((t) => {
          const sel = t.id === selectedId;
          const loc = [t.location?.city, t.location?.region].filter(Boolean).join(", ");
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t as RoboTeam)}
              style={{ display: "flex", alignItems: "center", gap: 12, background: sel ? `${accent}14` : "#111320", border: `1px solid ${sel ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}1a`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{t.number}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.organization}{loc ? ` · ${loc}` : ""}{t.program?.code ? ` · ${t.program.code}` : ""}</p>
              </div>
              {sel ? <Check size={18} style={{ color: accent, flexShrink: 0 }} /> : null}
            </button>
          );
        })}
        {touched && !loading && q.trim().length >= 2 && results.length === 0 ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0", padding: "8px 4px" }}>No team found for “{q}”. Enter the full team number exactly (e.g. 24B, 8059A).</p>
        ) : null}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
