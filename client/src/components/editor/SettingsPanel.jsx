import { useState } from "react"
import { THEMES, FONT_FAMILIES, CURSORS } from "../../constants/editorConfigs"
import { Section, Field, GridRow } from "../ui/SettingsLayout"
import { 
  X, 
  User, 
  Monitor, 
  Type, 
  MousePointer2, 
  Crown, 
  Wrench,
  Trash2,
  MessageCircle,
  Users,
  AlertTriangle,
  GitFork,
  TerminalSquare,
  Rocket,
  RefreshCw,
  Check
} from "lucide-react"

import { API_URL } from "../../config"

const GithubIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export default function SettingsPanel({
  onClose, personalPrefs, updatePersonalPref,
  roomTheme, roomFont, onSetRoomTheme,
  chatEnabled, onToggleChatEnabled, showUsersList, onToggleShowUsers,
  pushRoomUI, clearRoomUI, isHost, activeUsers, hostName, kickUser,
  themeData = {}, username, clientID, roomId, refreshGitStatus
}) {
  const { 
    bg = "#1e1e2e", 
    headerBg = "rgba(0,0,0,0.2)", 
    textColor = "#cdd6f4", 
    borderCol = "rgba(255,255,255,0.1)", 
    accent = "#89b4fa", 
    inputBg = "rgba(0,0,0,0.3)", 
    isDark = true, 
    panelBg = "#181825" 
  } = themeData
  const activeTheme = roomTheme ?? personalPrefs.theme
  const canChangeRoom = isHost

  const [isInitializing, setIsInitializing] = useState(false);
  const [initResult, setInitResult] = useState({ type: "", message: "" }); // type: "success" | "error"

  const handleInitRepo = async () => {
    setIsInitializing(true);
    setInitResult({ type: "", message: "" });

    try {
      const res = await fetch(`${API_URL}/git/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomId,
          authorName: username,
          authorEmail: personalPrefs.gitEmail || `${username}@codetogether.io`,
          defaultBranch: "main" 
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setInitResult({ type: "success", message: "✓ Git Repository Initialized!" });
        if (refreshGitStatus) refreshGitStatus();
        // Clear success message after 5 seconds
        setTimeout(() => setInitResult({ type: "", message: "" }), 5000);
      } else {
        setInitResult({ type: "error", message: data.error || "Failed to initialize." });
      }
    } catch (e) {
      console.error(e);
      setInitResult({ type: "error", message: "Connection failed. Please check your network." });
    } finally {
      setIsInitializing(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        style={{ 
          position: "fixed", inset: 0, zIndex: 1999, 
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", 
          animation: "fadeIn 0.2s ease" 
        }} 
      />
      
      {/* Panel */}
      <div 
        className="ide-glass-effect"
        style={{ 
          position: "fixed", top: 0, right: 0, bottom: 0, width: 360, 
          background: panelBg, borderLeft: `1px solid ${borderCol}`, 
          zIndex: 2000, display: "flex", flexDirection: "column", 
          boxShadow: "-10px 0 40px rgba(0,0,0,0.4)", 
          animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)" 
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 20px", borderBottom: `1px solid ${borderCol}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: 16, 
            background: accent, display: "flex", alignItems: "center", 
            justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20,
            boxShadow: `0 8px 20px ${accent}33`
          }}>
            {username?.charAt(0).toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: textColor, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>{username}</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Manrope', sans-serif" }}>
              {isHost ? <Crown size={12} color="#f9e2af" /> : <User size={12} />}
              {isHost ? "Room Host" : "Participant"}
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: "rgba(255,255,255,0.05)", border: `1px solid ${borderCol}`, 
              cursor: "pointer", width: 32, height: 32, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: textColor, opacity: 0.7 
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Personal Settings */}
          <div style={{ marginBottom: 24 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.4, letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'Manrope', sans-serif" }}>
                <User size={14} /> Personal Settings
             </div>
             
             <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Field label="Interface Theme">
                  <GridRow options={THEMES} value={personalPrefs.theme} onChange={v => updatePersonalPref("theme", v)} isDark={isDark} inputBg={inputBg} borderCol={borderCol} textColor={textColor} />
                </Field>

                <Field label={`Font Size: ${personalPrefs.fontSize}px`}>
                  <input type="range" min={11} max={22} value={personalPrefs.fontSize} onChange={e => updatePersonalPref("fontSize", Number(e.target.value))} style={{ width: "100%", accentColor: accent, cursor: "pointer" }} />
                </Field>

                <Field label="Typography">
                  <div style={{ position: "relative" }}>
                    <select value={personalPrefs.fontFamily} onChange={e => updatePersonalPref("fontFamily", e.target.value)} style={{ width: "100%", background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", appearance: "none" }}>
                      {FONT_FAMILIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                </Field>

                <Field label="Cursor Style">
                   <GridRow options={CURSORS} value={personalPrefs.cursor} onChange={v => updatePersonalPref("cursor", v)} isDark={isDark} inputBg={inputBg} borderCol={borderCol} textColor={textColor} />
                </Field>

                {/* Git Settings */}
                <div style={{ marginTop: 8, padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: `1px solid ${borderCol}` }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.6, marginBottom: 12, fontFamily: "'Manrope', sans-serif", letterSpacing: "0.08em" }}>
                      <GitFork size={14} /> Git Configuration
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, opacity: 0.5, display: "block", marginBottom: 4 }}>Author Email</label>
                        <input 
                          type="text" 
                          placeholder="your@email.com"
                          value={personalPrefs.gitEmail || ""}
                          onChange={e => updatePersonalPref("gitEmail", e.target.value)}
                          style={{ width: "100%", background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none" }}
                        />
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.01)", padding: 10, borderRadius: 8, border: `1px solid ${borderCol}`, borderStyle: "dashed" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, color: accent, marginBottom: 6 }}>
                          <GithubIcon size={14} color={accent} /> GitHub Integration
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                          <label style={{ fontSize: 10, opacity: 0.5 }}>Personal Access Token (PAT)</label>
                          <a 
                            href="https://github.com/settings/tokens" 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ color: accent, fontSize: 10, textDecoration: "none", fontWeight: 700 }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                          >
                            Generate New Token
                          </a>
                        </div>
                        <input 
                          type="password" 
                          placeholder="ghp_xxxxxxxxxxxx"
                          value={personalPrefs.githubPat || ""}
                          onChange={e => updatePersonalPref("githubPat", e.target.value)}
                          style={{ width: "100%", background: "rgba(0,0,0,0.3)", color: textColor, border: `1px solid ${borderCol}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, outline: "none", boxSizing: "border-box", marginBottom: 6 }}
                        />
                        {personalPrefs.githubPat && personalPrefs.githubPat.trim() !== "" && roomId && (
                           <button 
                             onClick={handleInitRepo}
                             disabled={isInitializing}
                             style={{ 
                               width: "100%", padding: "10px 0", borderRadius: 10, background: isInitializing ? "rgba(255,255,255,0.05)" : accent, 
                               color: isInitializing ? textColor : "#1e1e2e", border: "none", fontSize: 11, fontWeight: 800, 
                               cursor: isInitializing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                               marginTop: 4, transition: "all 0.2s"
                             }}
                           >
                              {isInitializing ? <RefreshCw size={14} className="ide-icon-pulse" /> : <Rocket size={12} />}
                              <span style={{ fontFamily: "'Manrope', sans-serif" }}>{isInitializing ? "Initializing..." : "Initialize Git Repository"}</span>
                           </button>
                        )}

                        {initResult.message && (
                           <div style={{ 
                             marginTop: 12, padding: "10px 14px", borderRadius: 10, 
                             background: initResult.type === "success" ? "rgba(166, 227, 161, 0.1)" : "rgba(243, 139, 168, 0.1)",
                             border: `1px solid ${initResult.type === "success" ? "rgba(166, 227, 161, 0.3)" : "rgba(243, 139, 168, 0.3)"}`,
                             fontSize: 11, color: initResult.type === "success" ? "#a6e3a1" : "#f38ba8",
                             display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 0.3s ease"
                           }}>
                             {initResult.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
                             <span style={{ fontWeight: 600 }}>{initResult.message}</span>
                           </div>
                        )}
                        <div style={{ fontSize: 9, opacity: 0.4, marginTop: 6, fontStyle: "italic" }}>
                          Requires <b>'repo'</b> scope. Classic tokens are recommended.
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Room Settings */}
          <div style={{ marginBottom: 24, padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: `1px solid ${borderCol}` }}>
             <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.7, letterSpacing: "0.08em", marginBottom: 16, color: accent, fontFamily: "'Manrope', sans-serif" }}>
                <Crown size={14} /> Room Controls
             </div>

             {!canChangeRoom ? (
               <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, display: "flex", gap: 10 }}>
                  <AlertTriangle size={16} color="#f9e2af" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 12, opacity: 0.6, margin: 0, lineHeight: 1.5 }}>Host permissions are required to modify global room behavior.</p>
               </div>
             ) : (
               <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <Field label="Force Room Theme">
                    <GridRow options={THEMES} value={roomTheme ?? personalPrefs.theme} onChange={v => onSetRoomTheme(v)} isDark={isDark} inputBg={inputBg} borderCol={borderCol} textColor={textColor} />
                  </Field>
                  
                  <button 
                    onClick={pushRoomUI} 
                    className="ide-btn-premium"
                    style={{ background: accent, color: "#1e1e2e", border: "none", justifyContent: "center" }}
                  >
                    Set Global Font
                  </button>

                  {(roomTheme || roomFont) && (
                    <button 
                      onClick={clearRoomUI} 
                      className="ide-btn-premium"
                      style={{ background: "transparent", color: "#f38ba8", border: "1px solid rgba(243, 139, 168, 0.3)", justifyContent: "center" }}
                    >
                      Clear All Overrides
                    </button>
                  )}
               </div>
             )}
          </div>

          {/* Moderation */}
          {isHost && (
            <div style={{ marginBottom: 24 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.4, letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'Manrope', sans-serif" }}>
                  <Wrench size={14} /> Moderation
               </div>
               
               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${borderCol}` }}>
                    <MessageCircle size={14} opacity={0.6} />
                    <span style={{ flex: 1 }}>Enable Chat</span>
                    <input type="checkbox" checked={chatEnabled} onChange={e => onToggleChatEnabled(e.target.checked)} style={{ accentColor: accent }} />
                  </label>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${borderCol}` }}>
                    <Users size={14} opacity={0.6} />
                    <span style={{ flex: 1 }}>Show User List</span>
                    <input type="checkbox" checked={showUsersList} onChange={e => onToggleShowUsers(e.target.checked)} style={{ accentColor: accent }} />
                  </label>
               </div>
            </div>
          )}

          {/* Active Users */}
          {isHost && activeUsers.length > 1 && (
            <div style={{ marginBottom: 24 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.4, letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'Manrope', sans-serif" }}>
                  <Users size={14} /> Manage Participants
               </div>
               
               <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeUsers.filter(u => u.id !== clientID).map(u => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: `1px solid ${borderCol}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>@{u.name}</span>
                      <button 
                        onClick={() => kickUser(u.id, u.name)} 
                        style={{ background: "rgba(243, 139, 168, 0.1)", border: "none", color: "#f38ba8", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
