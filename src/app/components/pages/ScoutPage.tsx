import { useState, useRef } from "react";
import { Search, Star, ChevronRight, ArrowLeft, Plus, X, Camera, Tag, TrendingUp, Shield, Zap, Image } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAccent } from "../AccentContext";

const TAGS = ["Autonomous", "Driver Control", "Endgame", "Defense", "Fast Cycle", "Consistent", "Alliance Pick", "Risky", "Watch Out", "Potential"];

interface ScoutNote {
  id: string;
  teamId: string;
  teamName: string;
  tags: string[];
  description: string;
  ratings: {
    autonomous: number;
    driver: number;
    endgame: number;
    defense: number;
    consistency: number;
  };
  images: string[];
  date: string;
}

const INITIAL_NOTES: ScoutNote[] = [
  {
    id: "note-1",
    teamId: "7842A",
    teamName: "Iron Circuit",
    tags: ["Autonomous", "Endgame", "Alliance Pick"],
    description: "Extremely fast intake. Dangerous in autonomous. Watch their endgame hang — they start it at 20s left. Top alliance pick for elims.",
    ratings: { autonomous: 5, driver: 4, endgame: 5, defense: 3, consistency: 4 },
    images: [],
    date: "Jun 1",
  },
  {
    id: "note-2",
    teamId: "9090Z",
    teamName: "Zero Gravity",
    tags: ["Autonomous", "Watch Out"],
    description: "98-point autonomous is incredible but driver control is weak. Strong auton partner, poor driver partner.",
    ratings: { autonomous: 5, driver: 2, endgame: 2, defense: 2, consistency: 3 },
    images: [],
    date: "May 31",
  },
];

const KNOWN_TEAMS = [
  { id: "7842A", name: "Iron Circuit" },
  { id: "3141S", name: "Circuit Breakers" },
  { id: "1234B", name: "BotForge Beta" },
  { id: "9090Z", name: "Zero Gravity" },
  { id: "4455C", name: "Cyber Hawks" },
  { id: "2277A", name: "Logic Gates" },
  { id: "8812D", name: "Delta Force" },
];

function StarRating({ value, onChange, color }: { value: number; onChange?: (v: number) => void; color: string }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange?.(n)}
          style={{ background: "transparent", border: "none", cursor: onChange ? "pointer" : "default", padding: 0 }}
        >
          <Star size={16} style={{ color: n <= value ? color : "rgba(255,255,255,0.15)", fill: n <= value ? color : "none", transition: "all 0.1s" }} />
        </button>
      ))}
    </div>
  );
}

const RATING_FIELDS: { key: keyof ScoutNote["ratings"]; label: string }[] = [
  { key: "autonomous", label: "Autonomous" },
  { key: "driver", label: "Driver Control" },
  { key: "endgame", label: "Endgame" },
  { key: "defense", label: "Defense" },
  { key: "consistency", label: "Consistency" },
];

function AddNoteSheet({ onClose, onSave, accent }: { onClose: () => void; onSave: (n: ScoutNote) => void; accent: string }) {
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [ratings, setRatings] = useState({ autonomous: 0, driver: 0, endgame: 0, defense: 0, consistency: 0 });
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTeams = teamQuery
    ? KNOWN_TEAMS.filter((t) => t.id.toLowerCase().includes(teamQuery.toLowerCase()) || t.name.toLowerCase().includes(teamQuery.toLowerCase()))
    : [];

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setImages((prev) => [...prev, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    if (!selectedTeam) return;
    onSave({
      id: `note-${Date.now()}`,
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      tags,
      description,
      ratings,
      images,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
      {/* Backdrop */}
      <div style={{ flex: 1, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      {/* Sheet */}
      <div style={{ background: "#0d0f1c", borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "88vh", overflowY: "auto", scrollbarWidth: "none" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        <div style={{ padding: "12px 18px 30px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color: "#e8eaf0" }}>Add Scout Note</p>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={15} style={{ color: "#e8eaf0" }} />
            </button>
          </div>

          {/* Team picker */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em", marginBottom: 8 }}>TEAM</p>
            {selectedTeam ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${accent}15`, border: `1px solid ${accent}40`, borderRadius: 12, padding: "11px 14px" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: accent }}>{selectedTeam.id}</span>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", flex: 1 }}>{selectedTeam.name}</span>
                <button onClick={() => setSelectedTeam(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                  <X size={13} style={{ color: "#7a80a0" }} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px" }}>
                  <Search size={14} style={{ color: "#7a80a0" }} />
                  <input
                    value={teamQuery}
                    onChange={(e) => setTeamQuery(e.target.value)}
                    placeholder="Search team…"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }}
                  />
                </div>
                {filteredTeams.length > 0 && (
                  <div style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, marginTop: 4, overflow: "hidden" }}>
                    {filteredTeams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTeam(t); setTeamQuery(""); }}
                        style={{ width: "100%", padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", background: "transparent", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: accent, fontWeight: 600 }}>{t.id}</span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0" }}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em", marginBottom: 8 }}>TAGS</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{ padding: "6px 12px", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: active ? 600 : 400, background: active ? `${accent}20` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? accent + "50" : "rgba(255,255,255,0.1)"}`, color: active ? accent : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.15s" }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ratings */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em", marginBottom: 10 }}>RATINGS</p>
            <div style={{ background: "#181c2e", borderRadius: 14, padding: "4px 0" }}>
              {RATING_FIELDS.map((field, i) => (
                <div key={field.key} style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderBottom: i < RATING_FIELDS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0", flex: 1 }}>{field.label}</span>
                  <StarRating
                    value={ratings[field.key]}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [field.key]: v }))}
                    color={accent}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em", marginBottom: 8 }}>IMAGES</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X size={10} style={{ color: "#fff" }} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 4 }}
              >
                <Camera size={18} style={{ color: "#7a80a0" }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "#7a80a0" }}>Add</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImage} style={{ display: "none" }} />
            </div>
          </div>

          {/* Description */}
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em", marginBottom: 8 }}>DESCRIPTION</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this team — strengths, weaknesses, strategies to watch for…"
              rows={4}
              style={{ width: "100%", background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#e8eaf0", resize: "none", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!selectedTeam}
            style={{ width: "100%", padding: "14px", borderRadius: 14, background: selectedTeam ? accent : "rgba(255,255,255,0.08)", border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: selectedTeam ? "#08090f" : "#4a5070", cursor: selectedTeam ? "pointer" : "default", transition: "all 0.2s", boxShadow: selectedTeam ? `0 0 20px ${accent}40` : "none" }}
          >
            Save Scout Note
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScoutPage() {
  const { accent } = useAccent();
  const [notes, setNotes] = useState<ScoutNote[]>(INITIAL_NOTES);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ScoutNote | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = notes.filter(
    (n) =>
      n.teamId.toLowerCase().includes(query.toLowerCase()) ||
      n.teamName.toLowerCase().includes(query.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const avgRating = (r: ScoutNote["ratings"]) => {
    const vals = Object.values(r);
    const filled = vals.filter((v) => v > 0);
    return filled.length ? (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1) : "—";
  };

  if (selected) {
    const radarData = [
      { axis: "Auto", val: selected.ratings.autonomous * 20 },
      { axis: "Driver", val: selected.ratings.driver * 20 },
      { axis: "Endgame", val: selected.ratings.endgame * 20 },
      { axis: "Defense", val: selected.ratings.defense * 20 },
      { axis: "Consist.", val: selected.ratings.consistency * 20 },
    ];

    return (
      <div style={{ overflowY: "auto", height: "100dvh", paddingBottom: 90, scrollbarWidth: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 16px 10px" }}>
          <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} style={{ color: "#e8eaf0" }} />
          </button>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 16, color: "#e8eaf0", flex: 1 }}>Scout Note</p>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{selected.date}</span>
        </div>

        {/* Team header */}
        <div style={{ margin: "0 16px 14px", background: "linear-gradient(135deg, #111320, #12142a)", border: `1px solid ${accent}30`, borderRadius: 18, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 13, color: accent }}>{selected.teamId}</span>
            </div>
            <div>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 18, color: "#e8eaf0" }}>{selected.teamName}</p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>Avg Rating: {avgRating(selected.ratings)} / 5</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selected.tags.map((tag) => (
              <span key={tag} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: accent, background: `${accent}15`, border: `1px solid ${accent}30`, padding: "4px 10px", borderRadius: 20 }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Ratings */}
        <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "4px 0" }}>
          {RATING_FIELDS.map((field, i) => (
            <div key={field.key} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < RATING_FIELDS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0", flex: 1 }}>{field.label}</span>
              <StarRating value={selected.ratings[field.key]} color={accent} />
            </div>
          ))}
        </div>

        {/* Radar */}
        <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 8 }}>Performance Profile</p>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fill: "#7a80a0" }} />
              <Radar dataKey="val" stroke={accent} fill={accent} fillOpacity={0.12} strokeWidth={2} />
              <Tooltip contentStyle={{ background: "#1a1e30", border: "none", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Images */}
        {selected.images.length > 0 && (
          <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>Photos</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.images.map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: 88, height: 88, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {selected.description && (
          <div style={{ margin: "0 16px 14px", background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 8 }}>Notes</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#b0b4c8", lineHeight: 1.65 }}>{selected.description}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>TEAM ANALYSIS</p>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2 }}>Scout</h2>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 12, background: accent, border: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#08090f", cursor: "pointer", boxShadow: `0 0 16px ${accent}40` }}
          >
            <Plus size={15} />
            Add Note
          </button>
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#181c2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 14px" }}>
          <Search size={16} style={{ color: "#7a80a0" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team, tag…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#e8eaf0" }}
          />
        </div>
      </div>

      {/* Notes list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔭</div>
            <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0", marginBottom: 6 }}>No scout notes yet</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7a80a0" }}>Tap "Add Note" to start scouting teams.</p>
          </div>
        )}
        {filtered.map((note) => (
          <button
            key={note.id}
            onClick={() => setSelected(note)}
            style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px", textAlign: "left", cursor: "pointer", width: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11, color: accent }}>{note.teamId}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0" }}>{note.teamName}</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0" }}>{note.date} · Avg {avgRating(note.ratings)}/5</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {note.images.length > 0 && <Image size={12} style={{ color: "#7a80a0" }} />}
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: note.description ? 10 : 0 }}>
              {note.tags.slice(0, 3).map((tag) => (
                <span key={tag} style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: accent, background: `${accent}12`, border: `1px solid ${accent}25`, padding: "3px 8px", borderRadius: 20 }}>{tag}</span>
              ))}
              {note.tags.length > 3 && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#7a80a0" }}>+{note.tags.length - 3}</span>}
            </div>
            {note.description && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{note.description}</p>
            )}
          </button>
        ))}
      </div>

      {showAdd && (
        <AddNoteSheet
          accent={accent}
          onClose={() => setShowAdd(false)}
          onSave={(note) => { setNotes((prev) => [note, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
