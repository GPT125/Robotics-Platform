import { useEffect, useRef, useState } from "react";
import { Bell, Wifi, Shield, LogOut, Info, CheckCircle, Upload, UserPlus, Trash2, Pencil, Check, X, ChevronRight, Globe, Plus, ArrowUp } from "lucide-react";
import { useAccent, ACCENT_COLORS } from "../AccentContext";
import { useApp, type RoboTeam, type UserRole } from "../AppContext";
import { TeamSearch } from "../TeamSearch";
import { readFileAsDataUrl, downscaleImage } from "../media";
import { sendInviteEmail } from "../../../services/api";
import { LANGUAGES } from "../../../services/i18n";

const PRESET_AVATARS = ["🤖", "⚙️", "🦾", "🔧", "⚡", "🏆", "🚀", "🎯", "🛠️", "🔩", "🧠", "🦿"];

const TEAM_LIMIT: Record<UserRole, number> = { student: 1, parent: 3, coach: 8 };
const ROLE_LABEL: Record<UserRole, string> = { student: "Student", coach: "Coach", parent: "Parent" };

const LEGAL_DOCS: Record<string, { title: string; file: string }> = {
  terms: { title: "Terms of Service", file: "/legal/TERMS_OF_SERVICE.md" },
  privacy: { title: "Privacy Policy", file: "/legal/PRIVACY_POLICY.md" },
  handbook: { title: "Community Guidelines & Handbook", file: "/legal/COMMUNITY_GUIDELINES.md" },
};

function LegalDocModal({ docKey, accent, onClose }: { docKey: string; accent: string; onClose: () => void }) {
  const doc = LEGAL_DOCS[docKey];
  const [text, setText] = useState("Loading…");
  useEffect(() => {
    let alive = true;
    fetch(doc.file).then((r) => r.text()).then((body) => { if (alive) setText(body); }).catch(() => { if (alive) setText("Could not load the document right now."); });
    return () => { alive = false; };
  }, [doc.file]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(5,6,13,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, maxHeight: "82dvh", background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, display: "flex", flexDirection: "column", overflow: "hidden", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 17, color: "#fff", margin: 0 }}>{doc.title}</h3>
          <button onClick={onClose} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "14px 18px", fontFamily: "'Inter', sans-serif", fontSize: 12.5, lineHeight: 1.65, color: "#c9cee0", whiteSpace: "pre-wrap" }}>
          {text.replace(/^#+\s?/gm, "").replace(/\*\*/g, "")}
        </div>
      </div>
      <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}

interface ToggleProps { value: boolean; onChange: (v: boolean) => void; accent: string; }
function Toggle({ value, onChange, accent }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 44, height: 26, borderRadius: 13, background: value ? accent : "#2a2f48", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}
function SettingRow({ icon, iconBg, label, sub, right, onClick, danger }: SettingRowProps) {
  const content = (
    <>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg ?? "#1a1e30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, color: danger ? "#ff3b5c" : "#e8eaf0" }}>{label}</p>
        {sub && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", marginTop: 1 }}>{sub}</p>}
      </div>
      {right ?? (onClick && !danger ? <ChevronRight size={14} style={{ color: "#4a5070", flexShrink: 0 }} /> : null)}
    </>
  );
  const rowStyle = { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 0", background: "transparent", border: "none", cursor: onClick ? "pointer" : "default", textAlign: "left" as const };
  if (!onClick) {
    return <div style={rowStyle}>{content}</div>;
  }
  return (
    <button
      onClick={onClick}
      style={rowStyle}
    >
      {content}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111320", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "0 16px", marginBottom: 12 }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#7a80a0", letterSpacing: "0.08em", paddingTop: 14, paddingBottom: 4 }}>{title}</p>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>{children}</div>
    </div>
  );
}

function SectionDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />;
}

export function SettingsPage({ onSignIn }: { onSignIn?: () => void }) {
  const { accent, setAccent } = useAccent();
  const { profile, team, teams, role, language, teammates, signedIn, isGuest, setTeam, setTeams, setRole, setLanguage, updateProfile, addTeammate, removeTeammate, signOut, setOnboarded } = useApp();
  const [notifications, setNotifications] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [legalDoc, setLegalDoc] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.name ?? "");
  const [mate, setMate] = useState({ name: "", email: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const teamLimit = role ? TEAM_LIMIT[role] : 1;
  const myTeams = teams.length ? teams : team ? [team] : [];
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  function chooseRole(next: UserRole) {
    setRole(next);
    const limit = TEAM_LIMIT[next];
    if (myTeams.length > limit) setTeams(myTeams.slice(0, limit));
  }

  async function onAvatarFile(f: File | null) {
    if (!f) return;
    const raw = await readFileAsDataUrl(f);
    const small = await downscaleImage(raw, 256, 0.8);
    updateProfile({ avatar: small });
    setShowAvatar(false);
  }

  async function inviteTeammate() {
    if (!/\S+@\S+\.\S+/.test(mate.email) || inviteBusy) return;
    setInviteBusy(true);
    addTeammate(mate);
    try {
      const result = await sendInviteEmail({ name: mate.name || mate.email, email: mate.email, teamNumber: team?.number, senderName: profile?.name });
      setNotice(result.message ?? "Invite saved. Configure an email provider on the server for real email delivery.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invite saved locally, but email delivery is not configured.");
    } finally {
      setMate({ name: "", email: "" });
      setInviteBusy(false);
    }
  }

  return (
    <div style={{ overflowY: "auto", height: "100dvh", scrollbarWidth: "none", paddingBottom: "var(--rl-page-bottom)" }}>
      <div style={{ padding: "var(--rl-page-top) 16px 0" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#7a80a0", letterSpacing: "0.1em" }}>PREFERENCES</p>
          <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: "22px", color: "#e8eaf0", lineHeight: 1.2 }}>Settings</h2>
        </div>

        {/* Profile card */}
        <div style={{ background: "linear-gradient(135deg, #111320 0%, #12142a 100%)", border: `1px solid ${accent}30`, borderRadius: 18, padding: 18, display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setShowAvatar(true)} style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${accent} 0%, #7c3aed 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 20px ${accent}40`, border: "none", cursor: "pointer", overflow: "hidden", fontSize: 24, position: "relative" }}>
            {profile?.avatar?.startsWith("data:") ? <img src={profile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, color: "#fff", fontSize: profile?.avatar && profile.avatar.length <= 3 ? 24 : 18 }}>{profile?.avatar && profile.avatar.length <= 3 ? profile.avatar : "RL"}</span>}
            <span style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: "#181c2e", border: `1px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={10} style={{ color: accent }} /></span>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editName ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus style={{ flex: 1, background: "#181c2e", border: `1px solid ${accent}40`, borderRadius: 8, padding: "6px 10px", color: "#e8eaf0", outline: "none", fontFamily: "'Exo 2', sans-serif", fontSize: 15 }} />
                <button onClick={() => { updateProfile({ name: nameDraft.trim() || "You" }); setEditName(false); }} style={{ background: accent, border: "none", borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Check size={15} style={{ color: "#08090f" }} /></button>
              </div>
            ) : (
              <button onClick={() => { setNameDraft(profile?.name ?? ""); setEditName(true); }} style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 16, color: "#e8eaf0" }}>{profile?.name ?? "Guest"}</span>
                <Pencil size={12} style={{ color: "#7a80a0" }} />
              </button>
            )}
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0", marginTop: 2 }}>{profile?.email ?? (isGuest ? "Guest mode" : "Not signed in")}</p>
          </div>
        </div>

        {/* Role */}
        <Section title="MY ROLE">
          <div style={{ paddingTop: 12, paddingBottom: 14, display: "flex", gap: 8 }}>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => {
              const active = role === r;
              return (
                <button key={r} onClick={() => chooseRole(r)} style={{ flex: 1, background: active ? `${accent}16` : "#1a1e30", border: `1px solid ${active ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "10px 6px", color: active ? accent : "#9aa0bf", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12.5, cursor: "pointer", transition: "all 0.18s" }}>
                  {ROLE_LABEL[r]}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Teams (role-aware: student 1, parent 3, coach 8) */}
        <Section title="MY TEAMS">
          <div style={{ paddingTop: 12, paddingBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {myTeams.map((tm, index) => (
              <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1e30", border: `1px solid ${index === 0 ? accent + "40" : "rgba(255,255,255,0.06)"}`, borderRadius: 13, padding: "10px 12px" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}1a`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{tm.number}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13.5, color: "#e8eaf0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.team_name}</p>
                    {index === 0 ? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: accent, background: `${accent}14`, border: `1px solid ${accent}35`, borderRadius: 5, padding: "1px 5px", flexShrink: 0 }}>PRIMARY</span> : null}
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.organization || "—"}{tm.program?.code ? ` · ${tm.program.code}` : ""}{tm.location?.region ? ` · ${tm.location.region}` : ""}</p>
                </div>
                {index !== 0 ? (
                  <button onClick={() => setTeams([tm, ...myTeams.filter((x) => x.id !== tm.id)])} aria-label="Make primary" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}><ArrowUp size={14} style={{ color: "#7a80a0" }} /></button>
                ) : null}
                <button onClick={() => setTeams(myTeams.filter((x) => x.id !== tm.id))} aria-label="Remove team" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} style={{ color: "#4a5070" }} /></button>
              </div>
            ))}
            {myTeams.length < teamLimit ? (
              <button onClick={() => setShowTeam(true)} style={{ width: "100%", background: `${accent}10`, border: `1px dashed ${accent}45`, borderRadius: 12, padding: "11px", color: accent, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <Plus size={15} /> Add team
              </button>
            ) : null}
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#5c627e", margin: 0 }}>{myTeams.length} of {teamLimit} team{teamLimit > 1 ? "s" : ""} · {role ? ROLE_LABEL[role] : "Student"} account</p>
          </div>
        </Section>

        {/* Teammates */}
        <Section title="TEAMMATES">
          <div style={{ paddingTop: 12, paddingBottom: 14 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0", marginBottom: 12 }}>Invite teammates by email to share to-do lists and messages.</p>
            {teammates.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#1a1e30", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12 }}>{(m.name || m.email)[0]?.toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0" }}>{m.name || m.email}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0" }}>{m.email} · {m.status}</p>
                </div>
                <button onClick={() => removeTeammate(m.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={15} style={{ color: "#4a5070" }} /></button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={mate.name} onChange={(e) => setMate({ ...mate, name: e.target.value })} placeholder="Name" style={{ width: 90, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 10px", color: "#e8eaf0", outline: "none", fontSize: 13 }} />
              <input value={mate.email} onChange={(e) => setMate({ ...mate, email: e.target.value })} placeholder="teammate@email.com" style={{ flex: 1, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 10px", color: "#e8eaf0", outline: "none", fontSize: 13 }} />
              <button onClick={inviteTeammate} style={{ width: 40, borderRadius: 10, background: accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: inviteBusy ? 0.6 : 1 }}><UserPlus size={17} style={{ color: "#08090f" }} /></button>
            </div>
          </div>
        </Section>

        {/* Accent color */}
        <Section title="ACCENT COLOR">
          <div style={{ paddingTop: 14, paddingBottom: 16 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a80a0", marginBottom: 14 }}>
              Choose the accent color used throughout the app.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {ACCENT_COLORS.map((c) => {
                const isSelected = accent === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => setAccent(c.value)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: c.value,
                        border: isSelected ? `3px solid #fff` : "3px solid transparent",
                        boxShadow: isSelected ? `0 0 18px ${c.value}80` : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        position: "relative",
                      }}
                    >
                      {isSelected && <CheckCircle size={20} style={{ color: "#08090f" }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: isSelected ? "#e8eaf0" : "#7a80a0", fontWeight: isSelected ? 600 : 400 }}>
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Language */}
        <Section title="LANGUAGE">
          <SettingRow
            icon={<Globe size={16} style={{ color: accent }} />}
            iconBg={`${accent}15`}
            label={currentLang.native}
            sub="App text and AI answers use this language"
            onClick={() => setShowLanguages((v) => !v)}
          />
          {showLanguages ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingBottom: 14 }}>
              {LANGUAGES.map((l) => {
                const selected = language === l.code;
                return (
                  <button key={l.code} onClick={() => { setLanguage(l.code); setShowLanguages(false); }} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left", background: selected ? `${accent}14` : "#1a1e30", border: `1px solid ${selected ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
                    <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{l.native}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: selected ? accent : "#6a7090" }}>{l.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <SettingRow
            icon={<Bell size={16} style={{ color: accent }} />}
            iconBg={`${accent}15`}
            label="Push Notifications"
            sub="Match results, event reminders"
            right={<Toggle value={notifications} onChange={setNotifications} accent={accent} />}
          />
          <SectionDivider />
          <SettingRow
            icon={<span style={{ fontSize: 16 }}>🏆</span>}
            label="Match Alerts"
            sub="Notify before your match starts"
            right={<Toggle value={matchAlerts} onChange={setMatchAlerts} accent={accent} />}
          />
        </Section>

        {/* Data & Sync */}
        <Section title="DATA & SYNC">
          <SettingRow
            icon={<Wifi size={16} style={{ color: "#10b981" }} />}
            iconBg="#10b98115"
            label="Auto Sync"
            sub="Sync robot telemetry automatically"
            right={<Toggle value={autoSync} onChange={setAutoSync} accent={accent} />}
          />
          <SectionDivider />
          <SettingRow
            icon={<Shield size={16} style={{ color: "#ff3b5c" }} />}
            iconBg="#ff3b5c15"
            label="Anonymous Data Sharing"
            sub="Help improve MatchMind"
            right={<Toggle value={dataSharing} onChange={setDataSharing} accent={accent} />}
          />
        </Section>

        {/* Legal */}
        <Section title="LEGAL">
          <SettingRow icon={<span style={{ fontSize: 16 }}>⚖️</span>} label="Terms of Service" onClick={() => setLegalDoc("terms")} />
          <SectionDivider />
          <SettingRow icon={<span style={{ fontSize: 16 }}>📄</span>} label="Privacy Policy" onClick={() => setLegalDoc("privacy")} />
          <SectionDivider />
          <SettingRow icon={<span style={{ fontSize: 16 }}>📘</span>} label="Community Guidelines & Handbook" onClick={() => setLegalDoc("handbook")} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: "#5c627e", padding: "2px 0 12px", lineHeight: 1.5 }}>MatchMind is an independent app — not affiliated with VEX Robotics, Innovation First, or the REC Foundation.</p>
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <SettingRow icon={<Info size={16} style={{ color: "#7a80a0" }} />} label="MatchMind" sub="Version 1.0.0" />
        </Section>

        {/* Sign out */}
        <button
          onClick={() => (signedIn || isGuest ? signOut() : (setOnboarded(false), onSignIn?.()))}
          style={{ width: "100%", padding: 14, borderRadius: 14, background: "#ff3b5c10", border: "1px solid #ff3b5c30", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#ff3b5c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <LogOut size={16} />
          {signedIn || isGuest ? "Sign Out" : "Sign In"}
        </button>

        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4a5070", textAlign: "center", marginTop: 16 }}>
          © 2025–26 MatchMind · Made for robotics competitors
        </p>
      </div>

      {/* Change team modal */}
      {showTeam ? (
        <div onClick={() => setShowTeam(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,6,13,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "20px 18px 24px", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", margin: 0 }}>Add team</h3>
              <button onClick={() => setShowTeam(false)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <TeamSearch selectedId={team?.id} onSelect={(t: RoboTeam) => {
              const next = myTeams.some((x) => x.id === t.id) ? myTeams : [...myTeams, t].slice(0, teamLimit);
              setTeams(next);
              setShowTeam(false);
            }} />
          </div>
          <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      ) : null}

      {notice ? (
        <div onClick={() => setNotice(null)} style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(5,6,13,0.78)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "20px 18px 24px", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 19, color: "#fff", margin: 0 }}>MatchMind setup</h3>
              <button onClick={() => setNotice(null)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#b0b4c8", lineHeight: 1.6 }}>{notice}</p>
          </div>
          <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      ) : null}

      {legalDoc ? <LegalDocModal docKey={legalDoc} accent={accent} onClose={() => setLegalDoc(null)} /> : null}

      {/* Avatar picker modal */}
      {showAvatar ? (
        <div onClick={() => setShowAvatar(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,6,13,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "20px 18px 24px", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", margin: 0 }}>Profile picture</h3>
              <button onClick={() => setShowAvatar(false)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 14 }}>
              {PRESET_AVATARS.map((emo) => (
                <button key={emo} onClick={() => { updateProfile({ avatar: emo }); setShowAvatar(false); }} style={{ aspectRatio: "1", borderRadius: 12, background: profile?.avatar === emo ? `${accent}22` : "#181c2e", border: `1px solid ${profile?.avatar === emo ? accent : "rgba(255,255,255,0.08)"}`, fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{emo}</button>
              ))}
            </div>
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", background: accent, border: "none", borderRadius: 12, padding: "13px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Upload size={16} /> Upload from device
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)} />
          </div>
          <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      ) : null}
    </div>
  );
}
