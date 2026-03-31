import { 
  Settings, 
  LogOut, 
  Video, 
  VideoOff, 
  Zap, 
  ShieldCheck, 
  User,
  Hash,
  Crown
} from "lucide-react"

/* ─── Navbar Component ──────────────────────────────────────────── */
export default function Navbar({
  roomId, actualRoomType, isHost, username,
  callActive, onToggleCall,
  onToggleSettings, onLeave, onToggleGit,
  headerBg, borderCol, textColor, accent,
  gitStatus
}) {
  const hasChanges = (gitStatus?.modified?.length || 0) + (gitStatus?.not_added?.length || 0) > 0

  const GithubIcon = ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
  return (
    <div 
      className="ide-navbar-floating ide-glass-effect"
      style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", 
        padding: "0 20px", border: `1px solid ${borderCol}`,
        boxSizing: "border-box" 
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <div style={{ 
            background: accent, width: 28, height: 28, borderRadius: 8, 
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 15px ${accent}44`
          }}>
            <Zap size={16} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px", color: textColor }}>
            CodeTogether
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ 
            background: "rgba(255,255,255,0.05)", padding: "4px 10px", 
            borderRadius: 8, display: "flex", alignItems: "center", gap: 6,
            border: `1px solid ${borderCol}`
          }}>
            <Hash size={12} opacity={0.5} />
            <span style={{ color: "#cdd6f4", fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>{roomId}</span>
          </div>
          
          <div style={{ 
            background: "rgba(203, 166, 247, 0.1)", color: "#cba6f7", 
            fontSize: 11, padding: "4px 10px", borderRadius: 8, 
            textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px",
            border: "1px solid rgba(203, 166, 247, 0.2)"
          }}>
            {actualRoomType}
          </div>

          {isHost && (
            <div style={{ 
              background: "rgba(249, 226, 175, 0.1)", color: "#f9e2af", 
              fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8,
              border: "1px solid rgba(249, 226, 175, 0.2)", display: "flex", alignItems: "center", gap: 4
            }}>
              <Crown size={12} />
              HOST
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Connection Status Indicator */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", 
          background: "rgba(255,255,255,0.03)", borderRadius: 10,
          border: `1px solid ${borderCol}`
        }}>
          <div className="ide-icon-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#a6e3a1" }} />
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>@{username}</span>
        </div>

        <div style={{ width: 1, height: 24, background: borderCol, margin: "0 4px" }} />

        <button 
          onClick={onToggleCall}
          className="ide-btn-premium"
          style={{ 
            background: callActive ? "#f38ba8" : "rgba(166, 227, 161, 0.1)",
            color: callActive ? "#fff" : "#a6e3a1",
            border: `1px solid ${callActive ? "#f38ba8" : "rgba(166, 227, 161, 0.2)"}`
          }}
        >
          {callActive ? <VideoOff size={16} /> : <Video size={16} />}
          <span>{callActive ? "End Call" : "Join Call"}</span>
        </button>
        
        <button 
          onClick={onToggleGit} 
          title="Source Control" 
          style={{ 
            background: hasChanges ? `${accent}15` : "rgba(255,255,255,0.05)", 
            border: `1px solid ${hasChanges ? accent : borderCol}`, 
            cursor: "pointer", width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: hasChanges ? accent : textColor, transition: "all 0.2s",
            position: "relative"
          }}
          onMouseEnter={e => e.currentTarget.style.background = hasChanges ? `${accent}25` : "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = hasChanges ? `${accent}15` : "rgba(255,255,255,0.05)"}
        >
          <GithubIcon size={18} color={hasChanges ? accent : textColor} />
          {hasChanges && (
            <div style={{ 
              position: "absolute", top: -2, right: -2, width: 8, height: 8, 
              background: "#ff9e64", borderRadius: "50%", border: `2px solid ${headerBg}` 
            }} />
          )}
        </button>

        <button 
          onClick={onToggleSettings} 
          title="Settings" 
          style={{ 
            background: "rgba(255,255,255,0.05)", border: `1px solid ${borderCol}`, 
            cursor: "pointer", width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: textColor, transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
        >
          <Settings size={18} />
        </button>

        <button
          onClick={onLeave}
          title="Leave Room"
          style={{
            background: "rgba(243, 139, 168, 0.1)",
            color: "#f38ba8",
            border: "1px solid rgba(243, 139, 168, 0.2)",
            borderRadius: 10,
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f38ba8"; e.currentTarget.style.color = "#1e1e2e" }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(243, 139, 168, 0.1)"; e.currentTarget.style.color = "#f38ba8" }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}
