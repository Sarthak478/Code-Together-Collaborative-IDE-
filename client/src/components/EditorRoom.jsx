import CodeMirror from "@uiw/react-codemirror"
import useEditorRoom from "../hooks/useEditorRoom"
import { API_URL } from "../config"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, GitBranch, Sparkles, AlertCircle, LogOut } from "lucide-react"

import Navbar from "./editor/Navbar"
import Toolbar from "./editor/Toolbar"
import OutputPanel from "./editor/OutputPanel"
import ChatPanel from "./editor/ChatPanel"
import SettingsPanel from "./editor/SettingsPanel"
import VideoCall from "./editor/VideoCall"
import SourceControlPanel from "./ide/SourceControlPanel"
import AIPanel from "./ide/AIPanel"
import DiffModal from "./ui/DiffModal"
import { useState } from "react"

/* ─── EditorRoom ────────────────────────────────────────────────── */
export default function EditorRoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  const room = useEditorRoom({ roomId, initialRoomType, isCreating, username, onLeave })
  const [activeDiff, setActiveDiff] = useState(null)

  return (
    <div
      className="ide-root"
      style={{
        display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
        background: room.bg, color: room.textColor,
        fontFamily: "'Inter', system-ui, sans-serif",
        cursor: room.personalPrefs.cursor
      }}
    >

      {/* ── Toasts ── */}
      <div style={{ position: "fixed", bottom: 60, right: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        <AnimatePresence>
          {room.toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: room.headerBg, color: room.textColor, padding: "12px 16px", borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)", borderLeft: `4px solid ${room.accent}`,
                fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 10
              }}
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Navbar ── */}
      <Navbar
        roomId={roomId}
        actualRoomType={room.actualRoomType}
        isHost={room.isHost}
        username={username}
        callActive={room.callActive}
        onToggleCall={() => room.setCallActive(!room.callActive)}
        chatOpen={room.chatOpen}
        onToggleChat={() => room.setChatOpen(o => !o)}
        onToggleSettings={() => room.setSettingsOpen(o => !o)}
        onToggleGit={() => room.toggleRightPanel("git")}
        onLeave={() => room.setExitConfirmOpen(true)}
        headerBg={room.headerBg}
        borderCol={room.borderCol}
        textColor={room.textColor}
        accent={room.accent}
        gitStatus={room.gitStatus}
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
          roomId={roomId}
          actualRoomType={room.actualRoomType}
          interviewTime={room.interviewTime}
          previewOpen={room.previewOpen}
          onTogglePreview={() => room.setPreviewOpen(!room.previewOpen)}
          isDark={room.isDark}
        />
      </div>

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        
        {/* Left Mini Sidebar for Panels */}
        <div style={{ 
          width: 48, borderRight: `1px solid ${room.borderCol}`, background: "rgba(0,0,0,0.1)",
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4
        }}>
          <PanelToggleButton 
            icon={<MessageSquare size={20} />} 
            active={room.rightPanel === "chat"} 
            onClick={() => room.toggleRightPanel("chat")} 
            accent={room.accent} 
            count={room.visibleChatMsgs.length}
            title="Chat"
          />
          <PanelToggleButton 
            icon={<GitBranch size={20} />} 
            active={room.rightPanel === "git"} 
            onClick={() => room.toggleRightPanel("git")} 
            accent={room.accent} 
            title="Source Control"
          />
          <PanelToggleButton 
            icon={<Sparkles size={20} />} 
            active={room.rightPanel === "ai"} 
            onClick={() => room.toggleRightPanel("ai")} 
            accent={room.accent} 
            title="AI Assistant"
          />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <CodeMirror height="100%" theme={room.cmBaseTheme} extensions={room.extensions} />
            </div>

            {room.previewOpen && (
              <OutputPanel
                output={{ isRender: true, lang: room.language, renderedCode: room.editor.ytext.toString() }}
                onClear={() => room.setPreviewOpen(false)}
                fontFamily={room.activeFontFamily}
                fontSize={room.activeFontSize}
                isDark={room.isDark}
                textColor={room.textColor}
                borderCol={room.borderCol}
              />
            )}

            {!room.previewOpen && (
              <OutputPanel
                output={room.output}
                onClear={() => room.setOutput("")}
                fontFamily={room.activeFontFamily}
                fontSize={room.activeFontSize}
                isDark={room.isDark}
                textColor={room.textColor}
                borderCol={room.borderCol}
              />
            )}
          </div>
        </div>

        {/* Right Panel (Chat, Git, AI) */}
        <AnimatePresence initial={false}>
          {room.rightPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              style={{ overflow: "hidden", borderLeft: `1px solid ${room.borderCol}`, background: room.panelBg, zIndex: 5 }}
            >
              <div style={{ width: 320, height: "100%", display: "flex", flexDirection: "column" }}>
                {room.rightPanel === "chat" ? (
                  <ChatPanel
                    isHost={room.isHost}
                    chatEnabled={room.chatEnabled}
                    showUsersList={room.showUsersList}
                    onToggleChatEnabled={room.onToggleChatEnabled}
                    onToggleShowUsers={room.onToggleShowUsers}
                    messages={room.visibleChatMsgs}
                    chatInput={room.chatInput}
                    chatTarget={room.chatTarget}
                    onChatInputChange={v => room.setChatInput(v)}
                    onChatTargetChange={v => room.setChatTarget(v)}
                    onSendChat={room.sendChat}
                    visibleActiveUsersList={room.visibleActiveUsersList}
                    username={username}
                    actualRoomType={room.actualRoomType}
                    editorAwarenessClientID={room.editor.provider.awareness.clientID}
                    themeData={{ 
                      headerBg: room.headerBg, 
                      borderCol: room.borderCol, 
                      textColor: room.textColor, 
                      inputBg: room.inputBg, 
                      accent: room.accent, 
                      panelBg: room.panelBg 
                    }}
                  />
                ) : room.rightPanel === "git" ? (
                  <SourceControlPanel
                    roomId={roomId}
                    gitStatus={room.gitStatus}
                    isGitLoading={room.isGitLoading}
                    onRefresh={room.refreshGitStatus}
                    onViewDiff={(path, staged) => setActiveDiff({ path, staged })}
                    username={username}
                    themeData={{ bg: room.bg, textColor: room.textColor, borderCol: room.borderCol, accent: room.accent, inputBg: room.inputBg, panelBg: room.panelBg, headerBg: room.headerBg }}
                  />
                ) : room.rightPanel === "ai" && (
                  <AIPanel
                    activeFile="Main File"
                    activeYText={room.editor.ytext}
                    textColor={room.textColor}
                    borderCol={room.borderCol}
                    panelBg={room.panelBg}
                    inputBg={room.inputBg}
                    accent={room.accent}
                    isDark={room.isDark}
                    headerBg={room.headerBg}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Settings Panel ── */}
      {room.settingsOpen && (
        <SettingsPanel
          onClose={() => room.setSettingsOpen(false)}
          personalPrefs={room.personalPrefs}
          updatePersonalPref={room.updatePersonalPref}
          roomTheme={room.roomTheme}
          roomFont={room.roomFont}
          onSetRoomTheme={room.onSetRoomTheme}
          pushRoomUI={room.pushRoomUI}
          clearRoomUI={room.clearRoomUI}
          isHost={room.isHost}
          activeUsers={room.visibleActiveUsersList}
          hostName={room.hostName}
          kickUser={room.kickUser}
          username={username}
          themeData={{ 
            bg: room.bg, 
            headerBg: room.headerBg, 
            borderCol: room.borderCol, 
            textColor: room.textColor, 
            panelBg: room.panelBg, 
            inputBg: room.inputBg, 
            accent: room.accent,
            isDark: room.isDark
          }}
        />
      )}

      {/* Exit Confirmation Modal */}
      {room.exitConfirmOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", 
          alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)"
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            style={{
              background: room.panelBg, border: `1px solid ${room.borderCol}`, 
              borderRadius: 20, padding: 32, width: 360, textAlign: "center",
              boxShadow: "0 30px 60px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ 
              width: 56, height: 56, borderRadius: "50%", background: "rgba(243, 139, 168, 0.1)", 
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" 
            }}>
               <LogOut size={28} color="#f38ba8" />
            </div>
            <h3 style={{ margin: "0 0 12px 0", color: room.textColor, fontSize: 20, fontWeight: 800 }}>Ready to leave?</h3>
            <p style={{ margin: "0 0 28px 0", color: room.textColor, fontSize: 14, opacity: 0.6, lineHeight: 1.6 }}>
              Are you sure you want to exit? <br />
              Your code will remain synced but your session will end.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => room.setExitConfirmOpen(false)}
                style={{
                  flex: 1, background: room.inputBg, color: room.textColor, 
                  border: `1px solid ${room.borderCol}`, padding: "10px 16px",
                  borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  room.setExitConfirmOpen(false);
                  onLeave();
                }}
                style={{
                  flex: 1, background: "#f38ba8", color: "#1e1e2e", 
                  border: "none", padding: "10px 16px",
                  borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Yes, Exit Room
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Video Call Bubbles */}
      {room.callActive && (
        <VideoCall 
          roomId={roomId}
          username={username}
          peerId={room.peerId}
          setPeerId={room.setPeerId}
          activeUsers={room.visibleActiveUsersList}
          themeData={{ accent: room.accent, textColor: room.textColor, panelBg: room.panelBg }}
        />
      )}
      {/* Git Diff Modal */}
      {activeDiff && (
        <DiffModal 
          roomId={roomId}
          filePath={activeDiff.path}
          staged={activeDiff.staged}
          onClose={() => setActiveDiff(null)}
          themeData={{ accent: room.accent, textColor: room.textColor, panelBg: room.panelBg, isDark: room.isDark, borderCol: room.borderCol, inputBg: room.inputBg }}
          onStage={async (path) => {
            await fetch(`${API_URL}/git/stage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId, filePaths: [path] })
            })
            room.refreshGitStatus()
          }}
        />
      )}
    </div>
  )
}

function PanelToggleButton({ icon, active, onClick, accent, count, title }) {
  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={onClick}
        title={title}
        style={{ 
          background: "transparent", border: "none", cursor: "pointer", 
          color: active ? accent : "rgba(255,255,255,0.4)",
          transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8,
          ...(active ? { background: "rgba(255,255,255,0.05)" } : {})
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.4)" }}
      >
        {icon}
      </button>
      {active && (
        <motion.div 
          layoutId="active-panel-indicator"
          style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 2, height: 20, background: accent, borderRadius: "0 2px 2px 0" }}
        />
      )}
      {count > 0 && !active && (
        <div style={{ 
          position: "absolute", top: -2, right: -2, background: accent, color: "#1e1e2e", 
          fontSize: 9, fontWeight: 800, width: 14, height: 14, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {count > 9 ? "9+" : count}
        </div>
      )}
    </div>
  )
}
