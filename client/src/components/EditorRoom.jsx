import CodeMirror from "@uiw/react-codemirror"
import useEditorRoom from "../hooks/useEditorRoom"
import Navbar from "./editor/Navbar"
import Toolbar from "./editor/Toolbar"
import OutputPanel from "./editor/OutputPanel"
import ChatPanel from "./editor/ChatPanel"
import SettingsPanel from "./editor/SettingsPanel"

/* ─── EditorRoom ────────────────────────────────────────────────── */
export default function EditorRoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  const room = useEditorRoom({ roomId, initialRoomType, isCreating, username, onLeave })

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: room.bg, color: room.textColor, fontFamily: "system-ui, sans-serif", cursor: room.personalPrefs.cursor, position: "relative" }}>

      {/* ── Toasts ── */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none", alignItems: "center" }}>
        {room.toasts.map(t => (
          <div key={t.id} style={{ background: "#a6e3a1", color: "#1e1e2e", padding: "8px 20px", borderRadius: 20, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.4)", animation: "fadeIn 0.25s ease", fontSize: 13 }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* ── Navbar ── */}
      <Navbar
        roomId={roomId}
        actualRoomType={room.actualRoomType}
        isHost={room.isHost}
        username={username}
        chatOpen={room.chatOpen}
        onToggleChat={() => room.setChatOpen(o => !o)}
        onToggleSettings={() => room.setSettingsOpen(o => !o)}
        onLeave={onLeave}
        headerBg={room.headerBg}
        borderCol={room.borderCol}
        textColor={room.textColor}
        accent={room.accent}
      />

      {/* ── Toolbar ── */}
      <div style={{ background: room.toolbarBg }}>
        <Toolbar
          canRun={room.canRun}
          canEdit={room.canEdit}
          canChangeLanguage={room.canChangeLanguage}
          language={room.language}
          onRunCode={room.runCode}
          onDownloadCode={room.downloadCode}
          onLanguageChange={room.onLanguageChange}
          visibleActiveUsersList={room.visibleActiveUsersList}
          isHost={room.isHost}
          runner={room.runner}
          onKickUser={room.kickUser}
          editorAwarenessClientID={room.editor.provider.awareness.clientID}
          textColor={room.textColor}
          borderCol={room.borderCol}
          inputBg={room.inputBg}
          accent={room.accent}
        />
      </div>

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CodeMirror height="100%" theme={room.cmBaseTheme} extensions={room.extensions} />
        </div>

        <OutputPanel
          output={room.output}
          onClear={() => room.setOutput("")}
          fontFamily={room.activeFontFamily}
          fontSize={room.activeFontSize}
          isDark={room.isDark}
          textColor={room.textColor}
          borderCol={room.borderCol}
        />

        {/* ── Chat Panel ── */}
        {room.chatOpen && (
          <ChatPanel
            isHost={room.isHost}
            chatEnabled={room.chatEnabled}
            showUsersList={room.showUsersList}
            onToggleChatEnabled={room.onToggleChatEnabled}
            onToggleShowUsers={room.onToggleShowUsers}
            visibleMessages={room.visibleChatMsgs}
            chatInput={room.chatInput}
            chatTarget={room.chatTarget}
            onChatInputChange={v => room.setChatInput(v)}
            onChatTargetChange={v => room.setChatTarget(v)}
            onSendChat={room.sendChat}
            visibleActiveUsersList={room.visibleActiveUsersList}
            username={username}
            actualRoomType={room.actualRoomType}
            editorAwarenessClientID={room.editor.provider.awareness.clientID}
            headerBg={room.headerBg}
            borderCol={room.borderCol}
            textColor={room.textColor}
            inputBg={room.inputBg}
            accent={room.accent}
            panelBg={room.panelBg}
          />
        )}
      </div>

      {/* ── Settings Panel ── */}
      <SettingsPanel
        isOpen={room.settingsOpen}
        onClose={() => room.setSettingsOpen(false)}
        username={username}
        isHost={room.isHost}
        canChangeRoom={room.canChangeRoom}
        personalPrefs={room.personalPrefs}
        onUpdatePref={room.updatePersonalPref}
        roomTheme={room.roomTheme}
        roomFont={room.roomFont}
        onPushRoomUI={room.pushRoomUI}
        onClearRoomUI={room.clearRoomUI}
        onSetRoomTheme={room.onSetRoomTheme}
        activeTheme={room.activeTheme}
        isDark={room.isDark}
        headerBg={room.headerBg}
        borderCol={room.borderCol}
        textColor={room.textColor}
        panelBg={room.panelBg}
        inputBg={room.inputBg}
        accent={room.accent}
      />
    </div>
  )
}
