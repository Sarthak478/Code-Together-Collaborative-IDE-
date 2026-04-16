import { useState } from "react"
import { 
  Rocket, 
  ArrowDownToLine, 
  Braces,
  Users,
  UserPlus,
  Check,
  ScanEye,
  ScanLine
} from "lucide-react"

export default function Toolbar({
  canRun,
  canEdit,
  canChangeLanguage,
  language,
  onRunCode,
  onDownloadCode,
  onLanguageChange,
  visibleActiveUsersList,
  isHost,
  runner,
  onKickUser,
  editorAwarenessClientID,
  textColor,
  borderCol,
  inputBg,
  accent,
  roomId,
  actualRoomType,
  interviewTime,
  previewOpen,
  onTogglePreview,
  isDark
}) {
  const [copied, setCopied] = useState(false)

  const handleInvite = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement("textarea")
      el.value = roomId
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div 
      className="ide-glass-effect"
      style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", margin: "0 10px 10px 10px", borderRadius: 14,
        height: 48, boxSizing: "border-box", border: `1px solid ${borderCol}`,
        backgroundImage: "linear-gradient(135deg, rgba(203,166,247,0.02) 0%, transparent 50%, rgba(137,180,250,0.02) 100%)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Run Button */}
        <button
          onClick={onRunCode}
          disabled={!canRun}
          className="ide-btn-premium"
          style={{
            background: canRun ? `linear-gradient(135deg, ${accent}, rgba(137,180,250,0.9))` : inputBg,
            color: canRun ? "#fff" : textColor,
            opacity: !canRun ? 0.4 : 1,
            border: `1px solid ${canRun ? accent : borderCol}`,
            cursor: !canRun ? "not-allowed" : "pointer",
            boxShadow: canRun ? `0 4px 20px ${accent}44, 0 0 30px ${accent}15` : "none"
          }}
        >
          {runner === editorAwarenessClientID ? (
            <div className="ide-icon-pulse">⚙️</div>
          ) : (
            <Rocket size={16} fill={canRun ? "#fff" : "transparent"} />
          )}
          <span style={{ fontFamily: "'Manrope', sans-serif", letterSpacing: "0.02em" }}>{runner ? "Running..." : "Run Engine"}</span>
        </button>

        {/* Download Button */}
        <button
          onClick={onDownloadCode}
          className="ide-btn-premium"
          style={{
            background: "rgba(255,255,255,0.03)", color: textColor,
            border: `1px solid ${borderCol}`, cursor: "pointer"
          }}
        >
          <ArrowDownToLine size={16} />
          <span style={{ fontFamily: "'Manrope', sans-serif" }}>Sync & Download</span>
        </button>

        <div style={{ width: 1, height: 20, background: borderCol, margin: "0 4px" }} />

        {/* Language Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: 10, border: `1px solid ${borderCol}` }}>
          <Braces size={14} opacity={0.6} />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={!canChangeLanguage}
            style={{
              background: "transparent", color: textColor, border: "none",
              fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              letterSpacing: "0.01em"
            }}
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++ 17</option>
            <option value="java">Java 17</option>
            <option value="rust">Rust</option>
            <option value="html">HTML Render</option>
          </select>
        </div>
      </div>

      {/* Interview Mode Indicator */}
      {actualRoomType === "interview" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            background: "rgba(166, 227, 161, 0.15)", color: "#a6e3a1", padding: "4px 12px", 
            borderRadius: 20, fontSize: 11, fontWeight: "bold", textTransform: "uppercase", 
            letterSpacing: "1px", border: "1px solid rgba(166, 227, 161, 0.2)",
            display: "flex", alignItems: "center", gap: 6
          }}>
            🎓 Interview Mode
          </div>
          <div style={{ 
            color: textColor, fontSize: 13, fontWeight: "bold", fontFamily: "monospace", 
            opacity: 0.8, background: "rgba(255,255,255,0.03)", padding: "4px 10px",
            borderRadius: 8, border: `1px solid ${borderCol}`
          }}>
            ⏱️ {new Date(interviewTime * 1000).toISOString().substr(11, 8)}
          </div>
          <div style={{
            background: isHost ? "rgba(249, 226, 175, 0.1)" : "rgba(137, 180, 250, 0.1)",
            color: isHost ? "#f9e2af" : "#89b4fa",
            fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
            border: `1px solid ${isHost ? "rgba(249, 226, 175, 0.2)" : "rgba(137, 180, 250, 0.2)"}`,
            textTransform: "uppercase", letterSpacing: "0.5px"
          }}>
            {isHost ? "👑 Interviewer" : "👤 Candidate"}
          </div>
        </div>
      )}

      {/* Browser Preview Toggle */}
      <button
        onClick={onTogglePreview}
        className="ide-btn-premium"
        style={{
          background: previewOpen ? "rgba(243, 139, 168, 0.1)" : (isDark ? "rgba(137, 180, 250, 0.1)" : "rgba(13, 110, 253, 0.1)"),
          color: previewOpen ? "#f38ba8" : accent,
          border: `1px solid ${previewOpen ? "rgba(243, 139, 168, 0.2)" : borderCol}`,
          cursor: "pointer", fontSize: 12, fontWeight: 700,
          transition: "all 0.2s"
        }}
      >
        {previewOpen ? <ScanLine size={14} /> : <ScanEye size={14} />}
        <span style={{ fontFamily: "'Manrope', sans-serif" }}>{previewOpen ? "Close Preview" : "Live Preview"}</span>
      </button>

      {/* Right Side: Active Users + Invite */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: -8 }}>
          {visibleActiveUsersList.slice(0, 5).map((u, i) => (
            <div
              key={u.id}
              title={`@${u.name}`}
              style={{
                width: 28, height: 28, borderRadius: "50%", background: u.color || accent,
                border: `2px solid ${inputBg}`, marginLeft: i === 0 ? 0 : -8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#1e1e2e", fontWeight: "bold", fontSize: 11,
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)", position: "relative", zIndex: 10 - i
              }}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {visibleActiveUsersList.length > 5 && (
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: "#313244",
              border: `2px solid ${inputBg}`, marginLeft: -8,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 10, fontWeight: 700, zIndex: 1
            }}>
              +{visibleActiveUsersList.length - 5}
            </div>
          )}
        </div>
        
        <button 
          onClick={handleInvite}
          title={copied ? "Room ID Copied!" : "Copy Room ID to invite collaborators"}
          style={{ 
            background: copied ? `${accent}22` : "transparent", 
            border: copied ? `1px solid ${accent}44` : "1px solid transparent", 
            cursor: "pointer", 
            color: copied ? "#a6e3a1" : accent, 
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8, transition: "all 0.2s",
            fontSize: 12, fontWeight: 600
          }}
          onMouseEnter={e => { if (!copied) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
          onMouseLeave={e => { if (!copied) e.currentTarget.style.background = "transparent" }}
        >
          {copied ? <Check size={16} /> : <UserPlus size={16} />}
          <span>{copied ? "Copied!" : "Invite"}</span>
        </button>
      </div>
    </div>
  )
}
