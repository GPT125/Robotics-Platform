import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useApp, type RoboTeam } from "./AppContext";
import { useAccent } from "./AccentContext";
import { TeamSearch } from "./TeamSearch";

const GOOGLE_CLIENT_ID = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID || "";

function decodeJwt(token: string): { name?: string; email?: string; picture?: string } {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export function Onboarding({ forceAuth = false, onComplete }: { forceAuth?: boolean; onComplete?: () => void }) {
  const { accent } = useAccent();
  const { signedIn, isGuest, team, onboarded, signInGoogle, continueAsGuest, setTeam, setOnboarded } = useApp();
  const [step, setStep] = useState<"auth" | "team">("auth");
  const [picked, setPicked] = useState<RoboTeam | null>(team);
  const [emailFallback, setEmailFallback] = useState("");
  const gbtn = useRef<HTMLDivElement>(null);

  // Decide step
  useEffect(() => {
    if (forceAuth && !signedIn) { setStep("auth"); return; }
    if (signedIn || isGuest) setStep("team");
    else setStep("auth");
  }, [forceAuth, signedIn, isGuest]);

  // Google Identity Services button
  useEffect(() => {
    if (step !== "auth" || !GOOGLE_CLIENT_ID) return;
    const g = (window as unknown as { google?: any }).google;
    function render() {
      const goog = (window as unknown as { google?: any }).google;
      if (!goog?.accounts?.id || !gbtn.current) return;
      goog.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => {
          const info = decodeJwt(resp.credential);
          if (info.email) signInGoogle({ name: info.name || "", email: info.email, picture: info.picture });
        },
      });
      gbtn.current.innerHTML = "";
      goog.accounts.id.renderButton(gbtn.current, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: 300 });
    }
    if (g?.accounts?.id) { render(); return; }
    const existing = document.getElementById("gis-script");
    if (existing) { existing.addEventListener("load", render); return; }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [step, signInGoogle]);

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

            <div ref={gbtn} style={{ display: "flex", justifyContent: "center", marginBottom: 10, minHeight: GOOGLE_CLIENT_ID ? 44 : 0 }} />

            {!GOOGLE_CLIENT_ID ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={emailFallback} onChange={(e) => setEmailFallback(e.target.value)} placeholder="you@team.com" style={{ flex: 1, background: "#181c2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#e8eaf0", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14 }} />
                <button disabled={!/\S+@\S+\.\S+/.test(emailFallback)} onClick={() => signInGoogle({ name: "", email: emailFallback })} style={{ background: accent, border: "none", borderRadius: 12, padding: "0 16px", color: "#08090f", fontWeight: 700, cursor: "pointer", opacity: /\S+@\S+\.\S+/.test(emailFallback) ? 1 : 0.5 }}>Go</button>
              </div>
            ) : null}

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
