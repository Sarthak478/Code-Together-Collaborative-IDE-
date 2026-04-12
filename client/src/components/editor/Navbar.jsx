import { 
  Settings, 
  LogOut, 
  Video, 
  VideoOff, 
  Zap, 
  ShieldCheck, 
  User,
  Hash,
  Crown,
  Activity,
  Sparkles
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

  // Function to calculate color luminance
  const getLuminance = (hex) => {
    if (!hex || typeof hex !== 'string') return 128;
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = (rgb >> 0) & 255;
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  // Detect if dark mode - if text color is light, it's dark mode
  const isDarkMode = getLuminance(textColor) > 128
  
  // Color palette based on mode
  const colors = {
    primary: "#6366f1",
    secondary: "#ec4899",
    accent: accent || "#f59e0b",
    success: "#10b981",
    danger: "#ef4444",
    info: "#3b82f6",
    warning: "#fbbf24",
    purple: "#a855f7",
    cyan: "#06b6d4",
    // Dynamic colors based on mode
    background: isDarkMode ? "#1e1e2e" : "rgba(255,255,255,0.95)",
    surface: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    border: isDarkMode ? borderCol : "#e2e8f0",
    text: isDarkMode ? textColor : "#1e293b",
    textSecondary: isDarkMode ? "#cdd6f4" : "#64748b",
  }

  const GithubIcon = ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )

  return (
    <div 
      className="ide-navbar-floating"
      style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0 24px", 
        border: `1px solid ${colors.border}`,
        boxSizing: "border-box",
        background: colors.background,
        backdropFilter: "blur(12px)",
        boxShadow: isDarkMode 
          ? "0 8px 32px rgba(0, 0, 0, 0.3)" 
          : "0 4px 12px rgba(0, 0, 0, 0.05)",
        borderRadius: "12px",
        margin: "8px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Logo section */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div style={{ 
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            width: 34, 
            height: 34, 
            borderRadius: 10, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: `0 2px 8px ${colors.primary}40`,
          }}>
            <Sparkles size={18} color="#fff" fill="#fff" />
          </div>
          <span style={{ 
            fontWeight: 800, 
            fontSize: 18, 
            letterSpacing: "-0.5px",
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            CodeTogether
          </span>
        </div>

        {/* Room Info section */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ 
            background: colors.surface,
            padding: "5px 12px", 
            borderRadius: 10, 
            display: "flex", 
            alignItems: "center", 
            gap: 8,
            border: `1px solid ${colors.border}`,
          }}>
            <Hash size={14} color={colors.primary} />
            <span style={{ 
              color: colors.text, 
              fontSize: 13, 
              fontFamily: "monospace", 
              fontWeight: 700,
            }}>{roomId}</span>
          </div>
          
          <div style={{ 
            background: `linear-gradient(135deg, ${colors.purple}, ${colors.secondary})`,
            color: "#fff", 
            fontSize: 11, 
            padding: "5px 12px", 
            borderRadius: 20, 
            textTransform: "uppercase", 
            fontWeight: 800, 
            letterSpacing: "0.5px",
            boxShadow: `0 2px 6px ${colors.purple}40`,
          }}>
            <Activity size={12} style={{ display: "inline", marginRight: 4 }} />
            {actualRoomType}
          </div>

          {isHost && (
            <div style={{ 
              background: `linear-gradient(135deg, ${colors.warning}, ${colors.accent})`,
              color: "#fff", 
              fontSize: 11, 
              fontWeight: 800, 
              padding: "5px 12px", 
              borderRadius: 20,
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              boxShadow: `0 2px 6px ${colors.warning}40`,
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
          display: "flex", 
          alignItems: "center", 
          gap: 10, 
          padding: "6px 16px", 
          background: colors.surface,
          borderRadius: 30,
          border: `1px solid ${colors.border}`,
        }}>
          <div className="ide-icon-pulse" style={{ 
            width: 8, 
            height: 8, 
            borderRadius: "50%", 
            background: colors.success,
            boxShadow: `0 0 8px ${colors.success}`,
          }} />
          <User size={12} color={colors.textSecondary} />
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600,
            color: colors.text,
          }}>@{username}</span>
        </div>

        <div style={{ width: 1, height: 28, background: colors.border, margin: "0 4px" }} />

        {/* Call Button */}
        <button 
          onClick={onToggleCall}
          className="ide-btn-premium"
          style={{ 
            background: callActive ? `linear-gradient(135deg, ${colors.danger}, ${colors.warning})` : colors.surface,
            color: callActive ? "#fff" : colors.success,
            border: `1px solid ${callActive ? colors.danger : colors.success}`,
            padding: "8px 16px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            fontWeight: 600,
            fontSize: 13,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = `0 4px 12px ${callActive ? colors.danger : colors.success}40`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {callActive ? <VideoOff size={16} /> : <Video size={16} />}
          <span>{callActive ? "End Call" : "Join Call"}</span>
        </button>
        
       
        {/* Settings Button */}
        <button 
          onClick={onToggleSettings} 
          title="Settings" 
          style={{ 
            background: colors.surface, 
            border: `1px solid ${colors.border}`, 
            cursor: "pointer", 
            width: 40, 
            height: 40, 
            borderRadius: 10,
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: colors.text, 
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px) rotate(90deg)"
            e.currentTarget.style.background = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,1)"
            e.currentTarget.style.borderColor = colors.info
            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.info}40`
            e.currentTarget.style.color = colors.info
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0) rotate(0deg)"
            e.currentTarget.style.background = colors.surface
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.boxShadow = "none"
            e.currentTarget.style.color = colors.text
          }}
        >
          <Settings size={18} />
        </button>

        {/* Leave Button */}
        <button
          onClick={onLeave}
          title="Leave Room"
          style={{
            background: `${colors.danger}15`,
            color: colors.danger,
            border: `1px solid ${colors.danger}30`,
            borderRadius: 10,
            width: 40, 
            height: 40,
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.background = colors.danger
            e.currentTarget.style.color = "#fff"
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.danger}40`
            e.currentTarget.style.borderColor = colors.danger
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.background = `${colors.danger}15`
            e.currentTarget.style.color = colors.danger
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "none"
            e.currentTarget.style.borderColor = `${colors.danger}30`
          }}
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .ide-navbar-floating {
          animation: slideIn 0.5s ease-out;
        }
        
        .ide-icon-pulse {
          animation: pulse 2s infinite;
        }
        
        button {
          position: relative;
          overflow: hidden;
        }
        
        button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        button:hover::before {
          width: 300px;
          height: 300px;
        }
      `}</style>
    </div>
  )
}
