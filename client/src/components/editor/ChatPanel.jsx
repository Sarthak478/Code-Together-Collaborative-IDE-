/* ─── ChatPanel Component ───────────────────────────────────────── */
export default function ChatPanel({
  messages,
  chatInput,
  onChatInputChange,
  chatTarget,
  onChatTargetChange,
  onSendChat,
  visibleActiveUsersList = [],
  themeData = {},
  chatEnabled,
  username,
  actualRoomType,
  isHost
}) {
  const {
    headerBg = "rgba(0,0,0,0.2)",
    borderCol = "rgba(255,255,255,0.1)",
    textColor = "#cdd6f4",
    inputBg = "rgba(0,0,0,0.3)",
    accent = "#89b4fa",
    panelBg = "#181825"
  } = themeData

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (chatInput.trim()) {
      onSendChat()
    }
  }

  return (
    <div style={{ width: 340, background: panelBg, zIndex: 10, display: "flex", flexDirection: "column", borderLeft: `1px solid ${borderCol}`, boxShadow: "-4px 0 24px rgba(0,0,0,0.3)", animation: "slideInRight 0.2s ease" }}>

      {/* Messages Section */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && <div style={{ textAlign: "center", opacity: 0.5, marginTop: 20, fontSize: 12 }}>No messages yet.</div>}
        {messages.map(m => {
          if (m.type === "system") {
            return <div key={m.id} style={{ fontSize: 11, textAlign: "center", opacity: 0.5, margin: "4px 0" }}>🚀 @{m.sender} ran the code</div>
          }
          if (m.type === "system_kick") {
            return <div key={m.id} style={{ fontSize: 11, textAlign: "center", opacity: 0.5, color: "#f38ba8", margin: "4px 0", fontWeight: "bold" }}>🚪 {m.text}</div>
          }
          const isMe = m.sender === username
          return (
            <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4, textAlign: isMe ? "right" : "left", display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", gap: 4 }}>
                <span>@{m.sender}</span>
                {m.target !== "all" && <span style={{ color: "#f9e2af", fontWeight: "bold" }}>(Whisper)</span>}
              </div>
              <div style={{ background: isMe ? accent : inputBg, color: isMe ? "#1e1e2e" : textColor, padding: "8px 12px", borderRadius: 8, fontSize: 13, border: isMe ? "none" : `1px solid ${borderCol}` }}>
                {m.text}
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSendMessage} style={{ borderTop: `1px solid ${borderCol}`, padding: 12, background: headerBg, display: "flex", flexDirection: "column", gap: 8 }}>
        {actualRoomType === "collaborative" && (
          <select
            value={chatTarget}
            onChange={e => onChatTargetChange(e.target.value)}
            style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, padding: "4px 8px", borderRadius: 6, fontSize: 11 }}
          >
            <option value="all">Send to Everyone</option>
            {Array.from(new Set(visibleActiveUsersList.filter(u => u.name !== username).map(u => u.name))).map(name => (
              <option key={name} value={name}>Direct to @{name}</option>
            ))}
          </select>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            disabled={!chatEnabled}
            value={chatInput}
            onChange={e => onChatInputChange(e.target.value)}
            placeholder={chatEnabled ? "Type a message..." : "Chat disabled by host"}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 20, border: `1px solid ${borderCol}`, background: inputBg, color: textColor, outline: "none", fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={!chatEnabled || !chatInput.trim()}
            style={{ background: accent, color: "#1e1e2e", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: (chatEnabled && chatInput.trim()) ? "pointer" : "not-allowed", opacity: (!chatEnabled || !chatInput.trim()) ? 0.5 : 1 }}
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  )
}