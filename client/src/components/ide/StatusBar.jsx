export default function StatusBar({ activeLanguage, roomMode, terminalOpen, isHost, username, bg, textColor, accent, actualRoomType }) {
  return (
    <div
      className="ide-status-bar"
      style={{
        background: accent,
        color: "#ffffff",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", height: "100%" }}>
        <div className="status-item" style={{ background: "rgba(0,0,0,0.15)", fontWeight: 600 }}>
          <span style={{ fontSize: 13 }}>◆</span> CodeTogether {roomMode === "ide" ? "IDE" : "Standard"}
        </div>
        <div className="status-item" title={actualRoomType === "interview" ? (isHost ? "Interviewer" : "Candidate") : "Room Host"}>
          <span style={{ fontSize: 13 }}>{isHost ? "👑" : "👤"}</span> {actualRoomType === "interview" ? (isHost ? "Interviewer" : "Candidate") : (isHost ? "(Host)" : "")} @{username}
        </div>
        <div className="status-item" title="Language selected">
          <span style={{ fontSize: 13 }}>📝</span> {activeLanguage || "No file open"}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", height: "100%" }}>
        <div className="status-item" title="Prettier">
          <span style={{ fontSize: 13 }}>✨</span> Prettier
        </div>
        <div className="status-item" title="Terminal built-in">
          {terminalOpen ? "Terminal Open" : "Terminal Closed"}
        </div>
        <div className="status-item" style={{ background: "rgba(0,0,0,0.15)" }}>
          UTF-8
        </div>
      </div>
    </div>
  )
}
