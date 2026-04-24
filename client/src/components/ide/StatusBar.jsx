export default function StatusBar({ activeLanguage, roomMode, terminalOpen, isHost, username, bg, textColor, accent, actualRoomType }) {
  return (
    <div
      className="ide-status-bar"
      style={{
        background: `linear-gradient(90deg, ${accent}, rgba(137,180,250,0.85), ${accent})`,
        color: "#ffffff",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", height: "100%" }}>
        <div className="status-item" style={{ background: "rgba(0,0,0,0.15)", fontWeight: 600 }}>
          <span style={{ fontSize: 13 }}>◆</span> <span style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>CodeTogether</span> <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, opacity: 0.85 }}>{roomMode === "ide" ? "IDE" : "Standard"}</span>
        </div>
        <div className="status-item" title={actualRoomType === "interview" ? (isHost ? "Interviewer" : "Candidate") : "Room Host"}>
          <span style={{ fontSize: 13 }}>{isHost ? "👑" : "👤"}</span> <span style={{ fontFamily: "'Manrope', sans-serif" }}>{actualRoomType === "interview" ? (isHost ? "Interviewer" : "Candidate") : (isHost ? "(Host)" : "")} @{username}</span>
        </div>
        <div className="status-item" title="Language selected">
          <span style={{ fontSize: 13 }}>📝</span> <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{activeLanguage || "No file open"}</span>
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
