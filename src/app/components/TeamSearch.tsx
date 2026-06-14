import { useEffect, useRef, useState } from "react";
import { Search, Check, Loader2, MapPin, Sparkles } from "lucide-react";
import { GRADE_OPTIONS, PROGRAM_OPTIONS, searchTeams, teamSuggestionReason, type GradeLevel, type ProgramCode, type RoboTeamResult } from "../../services/api";
import { useAccent } from "./AccentContext";
import type { RoboTeam } from "./AppContext";

export function TeamSearch({
  onSelect,
  selectedId,
  program = "ALL",
  grade = "All",
  onProgramChange,
  onGradeChange,
  showFilters = true,
  placeholder = "Search team number, name, or school…",
}: {
  onSelect: (team: RoboTeam) => void;
  selectedId?: number;
  program?: ProgramCode;
  grade?: GradeLevel;
  onProgramChange?: (program: ProgramCode) => void;
  onGradeChange?: (grade: GradeLevel) => void;
  showFilters?: boolean;
  placeholder?: string;
}) {
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
      const r = await searchTeams(q, { program, grade });
      setResults(r);
      setLoading(false);
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [grade, program, q]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#181c2e", border: `1px solid ${accent}30`, borderRadius: 14, padding: "10px 14px" }}>
        {loading ? <Loader2 size={16} style={{ color: accent, animation: "spin 1s linear infinite" }} /> : <Search size={16} style={{ color: "rgba(255,255,255,0.4)" }} />}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          autoFocus
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8eaf0", fontFamily: "'Inter', sans-serif", fontSize: 14 }}
        />
      </div>

      {showFilters ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {PROGRAM_OPTIONS.map((option) => {
              const active = option.value === program;
              return (
                <button key={option.value} onClick={() => onProgramChange?.(option.value)} style={{ flexShrink: 0, minHeight: 30, padding: "6px 10px", borderRadius: 999, background: active ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "40" : "rgba(255,255,255,0.08)"}`, color: active ? accent : "#8a90aa", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, cursor: onProgramChange ? "pointer" : "default" }}>
                  {option.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {GRADE_OPTIONS.map((option) => {
              const active = option === grade;
              return (
                <button key={option} onClick={() => onGradeChange?.(option)} style={{ flexShrink: 0, minHeight: 30, padding: "6px 10px", borderRadius: 999, background: active ? `${accent}18` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "40" : "rgba(255,255,255,0.08)"}`, color: active ? accent : "#8a90aa", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, cursor: onGradeChange ? "pointer" : "default" }}>
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {q.trim().length >= 2 ? (
        <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em" }}>
          {results.length && !loading ? <Sparkles size={12} style={{ color: accent }} /> : null}
          {loading ? "SEARCHING ROBOTEVENTS" : results.length ? "BEST MATCHES FROM ROBOTEVENTS" : "NO SUGGESTIONS"}
        </p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto", scrollbarWidth: "none" }}>
        {results.map((t, index) => {
          const sel = t.id === selectedId;
          const loc = [t.location?.city, t.location?.region].filter(Boolean).join(", ");
          const reason = teamSuggestionReason(t, q);
          return (
            <button
              key={t.id}
              className="smartSuggestionCard"
              onClick={() => onSelect(t as RoboTeam)}
              style={{ display: "flex", alignItems: "center", gap: 12, background: sel ? `${accent}14` : "#111320", border: `1px solid ${sel ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "transform 0.18s ease, border-color 0.18s ease, background 0.18s ease", animation: "suggestionIn 0.28s cubic-bezier(0.22,1,0.36,1) both", animationDelay: `${Math.min(index * 35, 160)}ms` }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}1a`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{t.number}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name || t.number}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.organization || "Organization not listed"}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, minWidth: 0, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%", background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: 999, padding: "3px 7px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: accent }}>
                    <Sparkles size={9} /> {reason}
                  </span>
                  {loc ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, maxWidth: "100%", fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <MapPin size={9} /> {loc}
                    </span>
                  ) : null}
                  {t.program?.code ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#8a90aa" }}>{t.program.code}</span> : null}
                  {t.grade ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#8a90aa" }}>{t.grade}</span> : null}
                </div>
              </div>
              {sel ? <Check size={18} style={{ color: accent, flexShrink: 0 }} /> : null}
            </button>
          );
        })}
        {touched && !loading && q.trim().length >= 2 && results.length === 0 ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0", padding: "8px 4px" }}>No team found for “{q}”. Try the team number, school name, or organization.</p>
        ) : null}
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes suggestionIn{from{opacity:0;transform:translateY(8px) scale(0.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        .smartSuggestionCard:active{transform:scale(0.985)}
        @media (hover:hover){.smartSuggestionCard:hover{transform:translateY(-1px);border-color:${accent}55!important;background:#15182a!important}}
      `}</style>
    </div>
  );
}
