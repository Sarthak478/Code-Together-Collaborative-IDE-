import { useState } from "react"
import { LANGUAGES } from "../../constants/editorConfigs"

/* ─── Toolbar Component ─────────────────────────────────────────── */
export default function Toolbar({
  canRun, canEdit, canChangeLanguage, language,
  onRunCode, onDownloadCode, onLanguageChange,
  visibleActiveUsersList, isHost, runner, onKickUser,
  editorAwarenessClientID,
  textColor, borderCol, inputBg, accent
}) {
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false)

  return (
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", background: "inherit", borderBottom: `1px solid ${borderCol}` }}>
      <button onClick={onRunCode} disabled={!canRun} title={canRun ? "Run code" : "No permission to run"} style={{ background: canRun ? "#a6e3a1" : "#45475a", color: "#1e1e2e", border: "none", borderRadius: 6, padding: "4px 14px", fontWeight: 700, cursor: canRun ? "pointer" : "not-allowed", fontSize: 13, opacity: canRun ? 1 : 0.5 }}>
        ▶ Run
      </button>
      <a href="#" onClick={onDownloadCode} title="Download Source File" style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}`, borderRadius: 6, padding: "3px 10px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
        ⬇️ Download
      </a>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {!canChangeLanguage && <span style={{ fontSize: 11, opacity: 0.5 }}>🔒</span>}
        <select value={language} disabled={!canChangeLanguage} onChange={e => onLanguageChange(e.target.value)} title={canChangeLanguage ? "Change language" : "Only hosts / interviewers can change language"} style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 5, padding: "3px 8px", fontSize: 13, cursor: canChangeLanguage ? "pointer" : "not-allowed", opacity: canChangeLanguage ? 1 : 0.6 }}>
          {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      {/* Active Users Dropdown */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setUsersDropdownOpen(o => !o)} style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}`, borderRadius: 6, padding: "3px 10px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          👥 Users ({visibleActiveUsersList.length}) ▾
        </button>
        {usersDropdownOpen && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 220, background: inputBg, border: `1px solid ${borderCol}`, borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 100, padding: 8, display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: "bold", opacity: 0.6, marginBottom: 8, marginTop: 4, textTransform: "uppercase" }}>Active Participants</div>
            {visibleActiveUsersList.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: inputBg, padding: "6px 8px", borderRadius: 4, fontSize: 12 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 8 }}>
                  @{u.name} {u.id === editorAwarenessClientID ? "(You)" : visibleActiveUsersList.filter(x => x.name === u.name).length > 1 ? `(Tab)` : ""}
                </span>
                {isHost && u.id !== editorAwarenessClientID && (
                  <button onClick={() => { onKickUser(u.id, u.name); setUsersDropdownOpen(false); }} style={{ background: "#f38ba8", color: "#1e1e2e", border: "none", borderRadius: 4, padding: "2px 8px", fontWeight: "bold", cursor: "pointer", fontSize: 10 }}>Kick</button>
                )}
              </div>
            ))}
            {visibleActiveUsersList.length === 1 && <div style={{ fontSize: 11, opacity: 0.5, textAlign: "center", margin: "8px 0" }}>You are the only one here.</div>}
          </div>
        )}
      </div>

      {!canEdit && <span style={{ fontSize: 12, color: "#f38ba8", marginLeft: 8, fontWeight: "bold" }}>👁 Read-Only Mode</span>}
      {runner && <span style={{ fontSize: 12, color: "#f9e2af", marginLeft: 8 }}>⏳ {runner} is running…</span>}
    </div>
  )
}
