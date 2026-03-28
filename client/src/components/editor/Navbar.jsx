/* ─── Navbar Component ──────────────────────────────────────────── */
export default function Navbar({
  roomId, actualRoomType, isHost, username,
  onToggleSettings, onLeave,
  headerBg, borderCol, textColor, accent
}) {
  return (
    <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: headerBg, borderBottom: `1px solid ${borderCol}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-.3px" }}>⚡ LiveShare</span>
        <span style={{ background: "#45475a", color: "#cdd6f4", fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>#{roomId}</span>
        <span style={{ background: "#313244", color: "#cba6f7", fontSize: 11, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{actualRoomType}</span>
        {isHost && <span style={{ background: "#f9e2af", color: "#1e1e2e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>👑 HOST</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, opacity: 0.5 }}>@{username}</span>

        <button onClick={onToggleSettings} title="Settings" style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: textColor }}>⚙️</button>

        <button
          onClick={onLeave}
          title="Leave Room"
          style={{
            background: "transparent",
            color: "#f38ba8",
            border: "1px solid #f38ba8",
            borderRadius: 6,
            padding: "4px 12px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 12,
            transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f38ba8"; e.currentTarget.style.color = "#1e1e2e" }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f38ba8" }}
        >
          🚪 Leave
        </button>
      </div>
    </div>
  )
}
