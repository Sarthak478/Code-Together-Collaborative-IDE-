import { THEMES, FONT_FAMILIES, CURSORS } from "../../constants/editorConfigs"
import { Section, Field, GridRow } from "../ui/SettingsLayout"

/* ─── SettingsPanel Component ───────────────────────────────────── */
export default function SettingsPanel({
  onClose, personalPrefs, updatePersonalPref,
  roomTheme, roomFont, onSetRoomTheme,
  chatEnabled, onToggleChatEnabled, showUsersList, onToggleShowUsers,
  pushRoomUI, clearRoomUI, isHost, activeUsers, hostName, kickUser,
  themeData, username
}) {
  const { bg, headerBg, textColor, borderCol, accent, inputBg, isDark, panelBg } = themeData
  const activeTheme = roomTheme ?? personalPrefs.theme
  const canChangeRoom = isHost

  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 9, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", animation: "fadeIn 0.2s ease" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 340, background: panelBg, borderLeft: `1px solid ${borderCol}`, zIndex: 10, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,.4)", animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${borderCol}`, background: headerBg, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: activeTheme === "dark" ? "#89b4fa" : "#339af0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: 18 }}>
            {username?.slice(0, 2).toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{username}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{isHost ? "👑 Room Host" : "👤 Participant"}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: textColor, opacity: 0.7 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          <Section label="👤 Personal (just you)" borderCol={borderCol}>
            <Field label="App Theme">
              <GridRow options={THEMES} value={personalPrefs.theme} onChange={v => updatePersonalPref("theme", v)} isDark={isDark} inputBg={inputBg} borderCol={borderCol} textColor={textColor} />
            </Field>
            <Field label={`Font Size: ${personalPrefs.fontSize}px`}>
              <input type="range" min={11} max={22} value={personalPrefs.fontSize} onChange={e => updatePersonalPref("fontSize", Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
            </Field>
            <Field label="Font Family">
              <select value={personalPrefs.fontFamily} onChange={e => updatePersonalPref("fontFamily", e.target.value)} style={{ width: "100%", background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 5, padding: "5px 8px", fontSize: 13 }}>
                {FONT_FAMILIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
            <Field label="Cursor Style">
              <GridRow options={CURSORS} value={personalPrefs.cursor} onChange={v => updatePersonalPref("cursor", v)} isDark={isDark} inputBg={inputBg} borderCol={borderCol} textColor={textColor} />
            </Field>
          </Section>

          <Section label={canChangeRoom ? "👑 Room (affects everyone)" : "👑 Room Settings"} borderCol={borderCol} faded={!canChangeRoom}>
            {!canChangeRoom ? (
              <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Permissions to change room settings rest with the host.</p>
            ) : (
              <>
                <Field label="Room Theme">
                  <GridRow options={THEMES} value={roomTheme ?? personalPrefs.theme} onChange={v => onSetRoomTheme(v)} isDark={isDark} inputBg={inputBg} borderCol={borderCol} textColor={textColor} />
                </Field>
                <Field label="Push My Font to Room">
                  <button onClick={pushRoomUI} style={{ width: "100%", background: "#89b4fa", color: "#1e1e2e", border: "none", borderRadius: 6, padding: "7px 0", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>📡 Apply My Font to Everyone</button>
                </Field>
                {(roomTheme || roomFont) && (
                  <Field label="">
                    <button onClick={clearRoomUI} style={{ width: "100%", background: "transparent", color: "#f38ba8", border: "1px solid #f38ba8", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontSize: 12 }}>✕ Clear Room Overrides</button>
                  </Field>
                )}
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>Room overrides take precedence over users' personal settings.</div>
              </>
            )}
          </Section>

          {(roomTheme || roomFont) && !canChangeRoom && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: isDark ? "#1e1e2e" : "#e9ecef", borderRadius: 8, fontSize: 11, opacity: 0.7, border: `1px solid ${borderCol}` }}>
              ⚠️ The host has applied room-wide theme or font settings that override your personal preferences.
            </div>
          )}
          <Section label="💬 Moderation" borderCol={borderCol}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: isHost ? "pointer" : "not-allowed", marginBottom: 8, opacity: isHost ? 1 : 0.6 }}>
              <input type="checkbox" disabled={!isHost} checked={chatEnabled} onChange={e => onToggleChatEnabled(e.target.checked)} />
              Allow Participants to Chat
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: isHost ? "pointer" : "not-allowed", margin: 0, opacity: isHost ? 1 : 0.6 }}>
              <input type="checkbox" disabled={!isHost} checked={showUsersList} onChange={e => onToggleShowUsers(e.target.checked)} />
              Show Users List to Participants
            </label>
          </Section>

          {isHost && activeUsers.length > 1 && (
            <Section label="👥 Active Users" borderCol={borderCol}>
              {activeUsers.filter(u => u.name !== username).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>@{u.name}</span>
                  <button onClick={() => kickUser(u.id, u.name)} style={{ background: "transparent", border: "1px solid #f38ba8", color: "#f38ba8", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Kick</button>
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </>
  )
}
