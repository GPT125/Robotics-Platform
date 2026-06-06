import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useApp, type RoboTeam } from "./AppContext";
import { useAccent } from "./AccentContext";
import { TeamSearch } from "./TeamSearch";
import { appleProvider, auth, googleProvider } from "../../lib/firebase";

export function Onboarding({ forceAuth = false, onComplete }: { forceAuth?: boolean; onComplete?: () => void }) {
  const { accent } = useAccent();
  const { signedIn, isGuest, team, onboarded, signInGoogle, continueAsGuest, setTeam, setOnboarded } = useApp();
  const [step, setStep] = useState<"auth" | "team">("auth");
  const [picked, setPicked] = useState<RoboTeam | null>(team);
  const [emailFallback, setEmailFallback] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState<"google" | "apple" | "email" | null>(null);
  const [authError, setAuthError] = useState("");

  // Decide step
  useEffect(() => {
    if (forceAuth && !signedIn) { setStep("auth"); return; }
    if (signedIn || isGuest) setStep("team");
    else setStep("auth");
  }, [forceAuth, signedIn, isGuest]);

  async function finishAuth(kind: "google" | "apple" | "email") {
    setAuthError("");
    setAuthBusy(kind);
    try {
      if (kind === "google" || kind === "apple") {
        const credential = await signInWithPopup(auth, kind === "google" ? googleProvider : appleProvider);
        const user = credential.user;
        signInGoogle({ name: user.displayName || user.email?.split("@")[0] || "MatchMind user", email: user.email || "", picture: user.photoURL || undefined });
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
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-in failed. Check Firebase Auth settings and try again.");
    } finally {
      setAuthBusy(null);
    }
  }

  if (onboarded) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,6,13,0.86)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#0c0e18", border: `1px solid ${accent}30`, borderRadius: 24, padding: "26px 22px", boxShadow: "0 24px 70px rgba(0,0,0,0.55)", animation: "popIn 0.34s cubic-bezier(0.22,1,0.36,1)" }}>
        {step === "auth" ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 28px ${accent}50`, marginBottom: 16, overflow: "hidden" }}>
              <img src="/matchmind-logo.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 26, color: "#fff", margin: 0, lineHeight: 1.1 }}>Welcome to MatchMind</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#9aa0bf", margin: "8px 0 20px", lineHeight: 1.5 }}>Sign in to unlock your team dashboard, AI coach, scouting, and messages.</p>

            <div style={{ display: "grid", gap: 9, marginBottom: 10 }}>
              <button disabled={Boolean(authBusy)} onClick={() => void finishAuth("google")} style={{ width: "100%", background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "13px", color: "#e8eaf0", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: authBusy ? "default" : "pointer" }}>
                {authBusy === "google" ? "Opening Google..." : "Continue with Google"}
              </button>
              <button disabled={Boolean(authBusy)} onClick={() => void finishAuth("apple")} style={{ width: "100%", background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "13px", color: "#e8eaf0", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, cursor: authBusy ? "default" : "pointer" }}>
                {authBusy === "apple" ? "Opening Apple..." : "Continue with Apple"}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <input value={emailFallback} onChange={(e) => setEmailFallback(e.target.value)} placeholder="you@team.com" autoComplete="email" inputMode="email" style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#e8eaf0", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14 }} />
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" style={{ background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#e8eaf0", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14 }} />
                <button disabled={Boolean(authBusy)} onClick={() => void finishAuth("email")} style={{ background: accent, border: "none", borderRadius: 12, padding: "12px 16px", color: "#08090f", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, cursor: authBusy ? "default" : "pointer", opacity: authBusy ? 0.65 : 1 }}>{authBusy === "email" ? "Signing in..." : "Sign in / create account"}</button>
              </div>
              {authError ? <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "#ff6b7a", lineHeight: 1.45 }}>{authError}</p> : null}
            </div>

            <button onClick={() => { continueAsGuest(); onComplete?.(); }} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "13px", color: "#cfd3e6", fontFamily: "'Exo 2', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Continue as guest</button>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#5c627e", textAlign: "center", marginTop: 12 }}>Guests can browse, but messages, shared to-dos, and team sync need sign-in.</p>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={18} style={{ color: accent }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: accent }}>VERIFIED VIA ROBOTEVENTS</span>
            </div>
            <h2 style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 900, fontSize: 24, color: "#fff", margin: "0 0 4px" }}>Find your team</h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#9aa0bf", margin: "0 0 16px" }}>Everything in MatchMind revolves around your team. Pick yours from RobotEvents.</p>

            <TeamSearch onSelect={setPicked} selectedId={picked?.id} />

            <button
              disabled={!picked}
              onClick={() => { if (picked) { setTeam(picked); } setOnboarded(true); onComplete?.(); }}
              style={{ width: "100%", marginTop: 16, background: picked ? accent : "rgba(255,255,255,0.06)", border: "none", borderRadius: 14, padding: "14px", color: picked ? "#08090f" : "#5c627e", fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 15, cursor: picked ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: picked ? `0 0 20px ${accent}50` : "none" }}
            >
              {picked ? <>Continue as {picked.number} <ArrowRight size={16} /></> : "Select your team"}
            </button>
            <button onClick={() => { setOnboarded(true); onComplete?.(); }} style={{ width: "100%", marginTop: 8, background: "transparent", border: "none", color: "#7a80a0", fontFamily: "'Inter', sans-serif", fontSize: 13, cursor: "pointer", padding: 8 }}>Skip for now</button>
          </>
        )}
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.94) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}`}</style>
    </div>
  );
}
