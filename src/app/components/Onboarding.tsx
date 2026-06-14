import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Heart, ShieldCheck, Users, X } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useApp, type RoboTeam, type UserRole } from "./AppContext";
import { useAccent } from "./AccentContext";
import { TeamSearch } from "./TeamSearch";
import { appleProvider, auth, googleProvider } from "../../lib/firebase";
import { LANGUAGES, t } from "../../services/i18n";

type Step = "auth" | "name" | "role" | "language" | "team" | "legal";
const STEPS: Step[] = ["auth", "name", "role", "language", "team", "legal"];

const TEAM_LIMIT: Record<UserRole, number> = { student: 1, parent: 3, coach: 8 };

const LEGAL_DOCS = [
  { id: "terms", file: "/legal/TERMS_OF_SERVICE.md", labelKey: "agreeTerms" as const, title: "Terms of Service" },
  { id: "privacy", file: "/legal/PRIVACY_POLICY.md", labelKey: "agreePrivacy" as const, title: "Privacy Policy" },
  { id: "handbook", file: "/legal/COMMUNITY_GUIDELINES.md", labelKey: "agreeHandbook" as const, title: "Community Guidelines & Handbook" },
];

function LegalViewer({ file, title, accent, onClose }: { file: string; title: string; accent: string; onClose: () => void }) {
  const [text, setText] = useState("Loading…");
  useEffect(() => {
    let alive = true;
    fetch(file).then((r) => r.text()).then((body) => { if (alive) setText(body); }).catch(() => { if (alive) setText("Could not load the document right now. The full text is bundled with the app under Settings → Legal."); });
    return () => { alive = false; };
  }, [file]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(5,6,13,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 410, maxHeight: "82dvh", background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#fff", margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{ background: "#181c2e", border: "none", borderRadius: 9, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={15} style={{ color: "#e8eaf0" }} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "14px 16px", fontFamily: "'Inter', sans-serif", fontSize: 12.5, lineHeight: 1.65, color: "#c9cee0", whiteSpace: "pre-wrap" }}>
          {text.replace(/^#+\s?/gm, "").replace(/\*\*/g, "")}
        </div>
      </div>
    </div>
  );
}

export function Onboarding({ forceAuth = false, onComplete }: { forceAuth?: boolean; onComplete?: () => void }) {
  const { accent } = useAccent();
  const { signedIn, isGuest, onboarded, profile, role, language, teams, signInGoogle, continueAsGuest, updateProfile, setRole, setLanguage, setTeams, setAgreedLegal, setOnboarded } = useApp();

  const [step, setStep] = useState<Step>("auth");
  const [nameDraft, setNameDraft] = useState(profile?.name ?? "");
  const [roleDraft, setRoleDraft] = useState<UserRole | null>(role);
  const [langDraft, setLangDraft] = useState(language || "en");
  const [pickedTeams, setPickedTeams] = useState<RoboTeam[]>(teams);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [viewer, setViewer] = useState<typeof LEGAL_DOCS[number] | null>(null);

  const [emailFallback, setEmailFallback] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState<"google" | "apple" | "email" | null>(null);
  const [authError, setAuthError] = useState("");

  const teamLimit = roleDraft ? TEAM_LIMIT[roleDraft] : 1;
  const allAgreed = LEGAL_DOCS.every((d) => agreed[d.id]) && Boolean(agreed.age13);
  const lang = langDraft;

  useEffect(() => {
    if (forceAuth && !signedIn) { setStep("auth"); return; }
    if ((signedIn || isGuest) && step === "auth") setStep("name");
  }, [forceAuth, signedIn, isGuest, step]);

  useEffect(() => { setNameDraft((cur) => cur || (profile?.name ?? "")); }, [profile?.name]);

  const stepIndex = STEPS.indexOf(step);

  const canNext = useMemo(() => {
    if (step === "name") return nameDraft.trim().length >= 2;
    if (step === "role") return Boolean(roleDraft);
    if (step === "language") return Boolean(langDraft);
    if (step === "team") return true; // picking a team is encouraged, not forced
    if (step === "legal") return allAgreed;
    return true;
  }, [step, nameDraft, roleDraft, langDraft, allAgreed]);

  function goBack() {
    if (stepIndex > 1) setStep(STEPS[stepIndex - 1]);
  }

  function goNext() {
    if (!canNext) return;
    if (step === "name") updateProfile({ name: nameDraft.trim() });
    if (step === "role" && roleDraft) {
      setRole(roleDraft);
      setPickedTeams((cur) => cur.slice(0, TEAM_LIMIT[roleDraft]));
    }
    if (step === "language") setLanguage(langDraft);
    if (step === "team") setTeams(pickedTeams);
    if (step === "legal") {
      setAgreedLegal(true);
      setOnboarded(true);
      onComplete?.();
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  }

  async function finishAuth(kind: "google" | "apple" | "email") {
    setAuthError("");
    setAuthBusy(kind);
    try {
      if (!auth) {
        setAuthError("Sign-in is unavailable right now. You can continue as a guest.");
        return;
      }
      if (kind === "google" || kind === "apple") {
        const provider = kind === "google" ? googleProvider : appleProvider;
        if (!provider) {
          setAuthError(`${kind === "google" ? "Google" : "Apple"} sign-in is unavailable right now. You can continue as a guest.`);
          return;
        }
        const credential = await signInWithPopup(auth, provider);
        const user = credential.user;
        signInGoogle({ name: user.displayName || user.email?.split("@")[0] || "MatchMind user", email: user.email || "", picture: user.photoURL || undefined });
        setNameDraft(user.displayName || user.email?.split("@")[0] || "");
        setStep("name");
      } else {
        const email = emailFallback.trim();
        if (!/\S+@\S+\.\S+/.test(email) || password.length < 6) {
          setAuthError("Enter a valid email and a password with at least 6 characters.");
          return;
        }
        let credential;
        try {
          credential = await signInWithEmailAndPassword(auth, email, password);
        } catch {
          credential = await createUserWithEmailAndPassword(auth, email, password);
        }
        const user = credential.user;
        signInGoogle({ name: user.displayName || email.split("@")[0], email, picture: user.photoURL || undefined });
        setNameDraft(user.displayName || email.split("@")[0]);
        setStep("name");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-in failed. Check Firebase Auth settings and try again.");
    } finally {
      setAuthBusy(null);
    }
  }

  if (onboarded && !forceAuth) return null;

  const roleOptions: Array<{ id: UserRole; label: string; sub: string; icon: typeof Users }> = [
    { id: "student", label: t(lang, "student"), sub: "Full scouting, AI, and competition toolkit", icon: GraduationCap },
    { id: "coach", label: t(lang, "roleCoach"), sub: `Track up to ${TEAM_LIMIT.coach} teams — any age, any VEX program`, icon: Users },
    { id: "parent", label: t(lang, "parent"), sub: `Follow up to ${TEAM_LIMIT.parent} teams — schedules, results, updates`, icon: Heart },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,6,13,0.86)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div key={step} style={{ width: "100%", maxWidth: 400, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "24px 22px 18px", boxShadow: "0 24px 70px rgba(0,0,0,0.55)", animation: "popIn 0.3s cubic-bezier(0.22,1,0.36,1)", display: "flex", flexDirection: "column", maxHeight: "88dvh" }}>

        {/* ===== STEP: AUTH ===== */}
        {step === "auth" ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 28px ${accent}50`, marginBottom: 16, overflow: "hidden" }}>
              <img src="/matchmind-logo.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 26, color: "#fff", margin: 0, lineHeight: 1.1 }}>{t(lang, "welcomeTitle")}</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9aa0bf", margin: "8px 0 20px", lineHeight: 1.5 }}>Sign in to unlock your team dashboard, AI coach, and scouting.</p>
            <div style={{ display: "grid", gap: 9, marginBottom: 10 }}>
              <button disabled={Boolean(authBusy)} onClick={() => void finishAuth("google")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: "#fff", border: "none", borderRadius: 14, padding: "13px", color: "#1a1a1a", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: authBusy ? "default" : "pointer" }}>
                <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                {authBusy === "google" ? "Opening Google…" : "Continue with Google"}
              </button>
              <button disabled={Boolean(authBusy)} onClick={() => void finishAuth("apple")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: "#000", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: "13px", color: "#fff", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: authBusy ? "default" : "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M16.36 12.76c0-2.04 1.67-3.02 1.74-3.07-.95-1.39-2.43-1.58-2.95-1.6-1.26-.13-2.45.74-3.09.74-.63 0-1.62-.72-2.66-.7-1.37.02-2.63.79-3.33 2.01-1.42 2.46-.36 6.1 1.02 8.1.67.98 1.48 2.08 2.54 2.04 1.02-.04 1.4-.66 2.63-.66s1.58.66 2.66.64c1.1-.02 1.79-1 2.46-1.98.77-1.13 1.09-2.23 1.11-2.29-.02-.01-2.12-.81-2.13-3.23zM14.3 6.74c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.14z"/></svg>
                {authBusy === "apple" ? "Opening Apple…" : "Continue with Apple"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#5c627e" }}>OR EMAIL</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              </div>
              <input value={emailFallback} onChange={(e) => setEmailFallback(e.target.value)} placeholder="you@team.com" autoComplete="email" inputMode="email" style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#e8eaf0", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14 }} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#e8eaf0", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14 }} />
              <button disabled={Boolean(authBusy)} onClick={() => void finishAuth("email")} style={{ background: accent, border: "none", borderRadius: 12, padding: "12px 16px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, cursor: authBusy ? "default" : "pointer", opacity: authBusy ? 0.65 : 1 }}>{authBusy === "email" ? "Signing in…" : "Sign in / create account"}</button>
              {authError ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#ff6b7a", lineHeight: 1.45 }}>{authError}</p> : null}
            </div>
            <button onClick={() => { continueAsGuest(); setStep("name"); }} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "13px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{t(lang, "guest")}</button>
          </>
        ) : null}

        {/* ===== STEP: NAME ===== */}
        {step === "name" ? (
          <>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 4px" }}>{t(lang, "yourName")}</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9aa0bf", margin: "0 0 16px" }}>This is the name from your account. Teammates will see it — you can change it.</p>
            <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus style={{ background: "#181c2e", border: `1px solid ${accent}40`, borderRadius: 14, padding: "14px 16px", color: "#e8eaf0", outline: "none", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 17 }} />
          </>
        ) : null}

        {/* ===== STEP: ROLE ===== */}
        {step === "role" ? (
          <>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 4px" }}>{t(lang, "chooseRole")}</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9aa0bf", margin: "0 0 14px" }}>MatchMind tailors the experience to you.</p>
            <div style={{ display: "grid", gap: 9 }}>
              {roleOptions.map(({ id, label, sub, icon: Icon }) => {
                const selected = roleDraft === id;
                return (
                  <button key={id} onClick={() => setRoleDraft(id)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: selected ? `${accent}14` : "#111320", border: `1px solid ${selected ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: "14px", cursor: "pointer", transition: "all 0.18s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: selected ? accent : "#1a1e30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s" }}>
                      <Icon size={19} style={{ color: selected ? "#08090f" : accent }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#e8eaf0", margin: 0 }}>{label}</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#8a90ad", margin: "2px 0 0" }}>{sub}</p>
                    </div>
                    {selected ? <Check size={17} style={{ color: accent, flexShrink: 0 }} /> : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {/* ===== STEP: LANGUAGE ===== */}
        {step === "language" ? (
          <>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 4px" }}>{t(lang, "chooseLanguage")}</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9aa0bf", margin: "0 0 14px" }}>App text and AI answers use this language. Change anytime in {t(lang, "settings")}.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, overflowY: "auto", maxHeight: "44dvh", paddingRight: 2 }}>
              {LANGUAGES.map((l) => {
                const selected = langDraft === l.code;
                return (
                  <button key={l.code} onClick={() => setLangDraft(l.code)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left", background: selected ? `${accent}14` : "#111320", border: `1px solid ${selected ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 13, padding: "11px 12px", cursor: "pointer" }}>
                    <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13.5, color: "#e8eaf0" }}>{l.native}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: selected ? accent : "#6a7090" }}>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {/* ===== STEP: TEAM(S) ===== */}
        {step === "team" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={18} style={{ color: accent }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: accent }}>VERIFIED VIA ROBOTEVENTS</span>
            </div>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 4px" }}>{t(lang, "selectTeam")}{teamLimit > 1 ? "s" : ""}</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9aa0bf", margin: "0 0 12px" }}>
              {roleDraft === "coach" ? `Add up to ${teamLimit} teams — elementary to university, V5RC, VIQRC, or VEX U.` : roleDraft === "parent" ? `Follow up to ${teamLimit} teams.` : "Pick your real team — every VEX program is supported."}
            </p>
            {pickedTeams.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {pickedTeams.map((tm) => (
                  <span key={tm.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${accent}16`, border: `1px solid ${accent}45`, borderRadius: 10, padding: "6px 9px", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 12, color: "#e8eaf0" }}>
                    {tm.number}
                    <button onClick={() => setPickedTeams((cur) => cur.filter((x) => x.id !== tm.id))} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex" }}><X size={12} style={{ color: accent }} /></button>
                  </span>
                ))}
              </div>
            ) : null}
            <div style={{ overflowY: "auto", minHeight: 0 }}>
              <TeamSearch
                selectedId={pickedTeams[0]?.id}
                onSelect={(tm: RoboTeam) => setPickedTeams((cur) => {
                  if (cur.some((x) => x.id === tm.id)) return cur.filter((x) => x.id !== tm.id);
                  return [...cur, tm].slice(0, teamLimit);
                })}
              />
            </div>
          </>
        ) : null}

        {/* ===== STEP: LEGAL ===== */}
        {step === "legal" ? (
          <>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 4px" }}>{t(lang, "legalTitle")}</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9aa0bf", margin: "0 0 14px" }}>Please review and agree. MatchMind is independent — not affiliated with VEX Robotics or the REC Foundation.</p>
            <div style={{ display: "grid", gap: 9 }}>
              {LEGAL_DOCS.map((doc) => {
                const checked = Boolean(agreed[doc.id]);
                return (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "#111320", border: `1px solid ${checked ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 13px" }}>
                    <button onClick={() => setAgreed((a) => ({ ...a, [doc.id]: !a[doc.id] }))} style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${checked ? accent : "rgba(255,255,255,0.3)"}`, background: checked ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                      {checked ? <Check size={13} style={{ color: "#08090f" }} /> : null}
                    </button>
                    <p style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#d6dae8", margin: 0, lineHeight: 1.4 }}>{t(lang, doc.labelKey)}</p>
                    <button onClick={() => setViewer(doc)} style={{ background: "transparent", border: "none", color: accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, cursor: "pointer", padding: "4px 2px", flexShrink: 0 }}>READ</button>
                  </div>
                );
              })}
              {(() => {
                const checked = Boolean(agreed.age13);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 11, background: "#111320", border: `1px solid ${checked ? accent : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 13px" }}>
                    <button onClick={() => setAgreed((a) => ({ ...a, age13: !a.age13 }))} style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${checked ? accent : "rgba(255,255,255,0.3)"}`, background: checked ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                      {checked ? <Check size={13} style={{ color: "#08090f" }} /> : null}
                    </button>
                    <p style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "#d6dae8", margin: 0, lineHeight: 1.4 }}>I am 13 or older, or I have my parent's or guardian's permission to use MatchMind.</p>
                  </div>
                );
              })()}
            </div>
          </>
        ) : null}

        {/* ===== FOOTER: Back / progress / Next ===== */}
        {step !== "auth" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
            <button onClick={goBack} disabled={stepIndex <= 1} style={{ display: "flex", alignItems: "center", gap: 6, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, padding: "12px 16px", color: stepIndex <= 1 ? "#4a5070" : "#e8eaf0", fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 13, cursor: stepIndex <= 1 ? "default" : "pointer" }}>
              <ArrowLeft size={15} /> {t(lang, "back")}
            </button>
            <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 5 }}>
              {STEPS.slice(1).map((s, i) => (
                <div key={s} style={{ width: i === stepIndex - 1 ? 18 : 6, height: 6, borderRadius: 3, background: i <= stepIndex - 1 ? accent : "rgba(255,255,255,0.14)", transition: "all 0.25s" }} />
              ))}
            </div>
            <button onClick={goNext} disabled={!canNext} style={{ display: "flex", alignItems: "center", gap: 6, background: canNext ? accent : "rgba(255,255,255,0.07)", border: "none", borderRadius: 13, padding: "12px 18px", color: canNext ? "#08090f" : "#5c627e", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 13, cursor: canNext ? "pointer" : "default", boxShadow: canNext ? `0 0 16px ${accent}45` : "none" }}>
              {step === "legal" ? t(lang, "getStarted") : t(lang, "next")} <ArrowRight size={15} />
            </button>
          </div>
        ) : null}
      </div>

      {viewer ? <LegalViewer file={viewer.file} title={viewer.title} accent={accent} onClose={() => setViewer(null)} /> : null}
      <style>{`@keyframes popIn{from{transform:scale(0.94) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}`}</style>
    </div>
  );
}
