import { useRef, useState } from "react";
import { Bell, Wifi, Shield, LogOut, Info, CheckCircle, Upload, UserPlus, Trash2, Pencil, Check, X, ChevronRight } from "lucide-react";
import { useAccent, ACCENT_COLORS } from "../AccentContext";
import { useApp, type RoboTeam } from "../AppContext";
import { TeamSearch } from "../TeamSearch";
import { readFileAsDataUrl, downscaleImage } from "../media";
import { sendInviteEmail } from "../../../services/api";

const PRESET_AVATARS = ["🤖", "⚙️", "🦾", "🔧", "⚡", "🏆", "🚀", "🎯", "🛠️", "🔩", "🧠", "🦿"];

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
  const { profile, team, teammates, signedIn, isGuest, setTeam, updateProfile, addTeammate, removeTeammate, signOut, setOnboarded } = useApp();
  const [notifications, setNotifications] = useState(true);
  const [matchAlerts, setMatchAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.name ?? "");
  const [mate, setMate] = useState({ name: "", email: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div style={{ overflowY: "auto", height: "100dvh", scrollbarWidth: "none", paddingBottom: 90 }}>
      <div style={{ padding: "20px 16px 0" }}>
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

        {/* Team */}
        <Section title="YOUR TEAM">
          <div style={{ paddingTop: 12, paddingBottom: 14 }}>
            {team ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `${accent}1a`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{team.number}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>{team.team_name}</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7a80a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.organization}{team.location?.region ? ` · ${team.location.region}` : ""}</p>
                </div>
                <button onClick={() => setShowTeam(true)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "7px 12px", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: "#e8eaf0", cursor: "pointer", flexShrink: 0 }}>Change</button>
              </div>
            ) : (
              <button onClick={() => setShowTeam(true)} style={{ width: "100%", background: `${accent}14`, border: `1px solid ${accent}40`, borderRadius: 12, padding: "12px", color: accent, fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Select your team</button>
            )}
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
            sub="Help improve RoboLab"
            right={<Toggle value={dataSharing} onChange={setDataSharing} accent={accent} />}
          />
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <SettingRow icon={<Info size={16} style={{ color: "#7a80a0" }} />} label="RoboLab" sub="Version 1.0.0 · Build 2025.06.04" />
          <SectionDivider />
          <SettingRow icon={<span style={{ fontSize: 16 }}>📄</span>} label="Privacy Policy" onClick={() => setNotice("RoboLab keeps RobotEvents tokens and AI keys server-side. Messages are workspace-only in this MVP and local until a database/realtime service is configured.")} />
          <SectionDivider />
          <SettingRow icon={<span style={{ fontSize: 16 }}>⚖️</span>} label="Terms of Service" onClick={() => setNotice("Predictions and AI suggestions are educational estimates. Teams should verify rules, match schedules, and judging requirements with official event staff.")} />
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
          © 2025–26 RoboLab · Made for robotics competitors
        </p>
      </div>

      {/* Change team modal */}
      {showTeam ? (
        <div onClick={() => setShowTeam(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,6,13,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "20px 18px 24px", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", margin: 0 }}>Change team</h3>
              <button onClick={() => setShowTeam(false)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <TeamSearch selectedId={team?.id} onSelect={(t: RoboTeam) => { setTeam(t); setShowTeam(false); }} />
          </div>
          <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      ) : null}

      {notice ? (
        <div onClick={() => setNotice(null)} style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(5,6,13,0.78)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", boxSizing: "border-box" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "20px 18px 24px", animation: "modalDrop 0.28s cubic-bezier(0.22,1,0.36,1)", boxShadow: "0 18px 60px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 19, color: "#fff", margin: 0 }}>RoboLab setup</h3>
              <button onClick={() => setNotice(null)} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} style={{ color: "#e8eaf0" }} /></button>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#b0b4c8", lineHeight: 1.6 }}>{notice}</p>
          </div>
          <style>{`@keyframes modalDrop{from{opacity:0;transform:translateY(-14px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      ) : null}

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
