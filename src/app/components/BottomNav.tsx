import { Home, Search, BrainCircuit, Telescope, MessageCircle, Settings } from "lucide-react";
import { useAccent } from "./AccentContext";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "lookup", label: "Lookup", icon: Search },
  { id: "coach", label: "Coach", icon: BrainCircuit },
  { id: "scout", label: "Scout", icon: Telescope },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

interface BottomNavProps {
  active: string;
  onChange: (id: string) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  const { accent } = useAccent();

  return (
    <nav
      style={{
        background: "rgba(10,11,20,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          padding: "8px 4px 20px",
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 2px",
                minWidth: 0,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 32,
                  borderRadius: 10,
                  background: isActive ? accent + "18" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{
                    color: isActive ? accent : "rgba(255,255,255,0.28)",
                    filter: isActive ? `drop-shadow(0 0 6px ${accent}80)` : "none",
                    transition: "all 0.2s",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "9px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? accent : "rgba(255,255,255,0.28)",
                  letterSpacing: "0.02em",
                  transition: "color 0.2s",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
