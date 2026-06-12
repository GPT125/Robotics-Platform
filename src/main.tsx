import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// Last line of defence against a blank/black screen: if anything throws during
// render, show a readable recovery card instead of an empty page. Without this,
// a single uncaught error unmounts the whole tree and leaves the user staring
// at a black screen with no way forward.
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[MatchMind] render error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#08090f",
          color: "#e8eaf0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg,#00c8ff,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            MM
          </div>
          <h1 style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>
            MatchMind hit a snag
          </h1>
          <p style={{ fontSize: 13.5, color: "#9aa0bf", lineHeight: 1.5, margin: "0 0 18px" }}>
            Something failed while loading the app. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#00c8ff",
              color: "#08090f",
              border: "none",
              borderRadius: 12,
              padding: "12px 22px",
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
