import Editor from "@monaco-editor/react"
import useEditorRoom from "../hooks/useEditorRoom"
import { API_URL } from "../config"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, GitFork, Wand2, AlertCircle, DoorOpen } from "lucide-react"

import Navbar from "./editor/Navbar"
import Toolbar from "./editor/Toolbar"
import OutputPanel from "./editor/OutputPanel"
import ChatPanel from "./editor/ChatPanel"
import SettingsPanel from "./editor/SettingsPanel"
import VideoCall from "./editor/VideoCall"
import SourceControlPanel from "./ide/SourceControlPanel"
import AIPanel from "./ide/AIPanel"
import DiffModal from "./ui/DiffModal"
import AccessControlModal from "./editor/AccessControlModal"
import InviteModal from "./editor/InviteModal"
import { useState } from "react"

/* ─── EditorRoom ────────────────────────────────────────────────── */
export default function EditorRoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  const room = useEditorRoom({ roomId, initialRoomType, isCreating, username, onLeave })
  const [activeDiff, setActiveDiff] = useState(null)
  const [accessControlOpen, setAccessControlOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div
      className="ide-root"
      style={{
        display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
        background: room.bg, color: room.textColor,
        fontFamily: "'Manrope', 'Inter', system-ui, sans-serif",
        cursor: room.personalPrefs.cursor
      }}
    >
      <AccessControlModal 
        isOpen={accessControlOpen} 
        onClose={() => setAccessControlOpen(false)} 
        roomId={roomId} 
      />

      <InviteModal 
        isOpen={inviteOpen} 
        onClose={() => setInviteOpen(false)} 
        roomId={roomId} 
        roomType={room.actualRoomType}
        isHost={room.isHost}
        username={username}
      />

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
        onToggleSettings={() => room.setSettingsOpen(true)}
        onToggleGit={() => room.toggleRightPanel("git")}
        onToggleAccessControl={() => setAccessControlOpen(!accessControlOpen)}
        onToggleInvite={() => setInviteOpen(!inviteOpen)}
        chatOpen={room.chatOpen}
        onToggleChat={() => room.setChatOpen(o => !o)}
        onLeave={() => room.setExitConfirmOpen(true)}
        headerBg={room.headerBg}
        borderCol={room.borderCol}
        textColor={room.textColor}
        accent={room.accent}
        gitStatus={room.gitStatus}
      />

      {/* ── Toolbar ── */}
      <div>
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
          width: 48, borderRight: `1px solid ${room.borderCol}`, background: "rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4,
          backgroundImage: "linear-gradient(180deg, rgba(203,166,247,0.03) 0%, transparent 40%, transparent 60%, rgba(137,180,250,0.02) 100%)"
        }}>
          <PanelToggleButton 
            icon={<MessageCircle size={20} />} 
            active={room.rightPanel === "chat"} 
            onClick={() => room.toggleRightPanel("chat")} 
            accent={room.accent} 
            count={room.visibleChatMsgs.length}
            title="Chat"
          />
          <PanelToggleButton 
            icon={<GitFork size={20} />} 
            active={room.rightPanel === "git"} 
            onClick={() => room.toggleRightPanel("git")} 
            accent={room.accent} 
            title="Source Control"
          />
          <PanelToggleButton 
            icon={<Wand2 size={20} />} 
            active={room.rightPanel === "ai"} 
            onClick={() => room.toggleRightPanel("ai")} 
            accent={room.accent} 
            title="AI Assistant"
          />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <Editor 
                height="100%" 
                width="100%"
                language={room.language} 
                theme={room.monacoTheme} 
                options={room.monacoOptions} 
                onMount={(editor, monaco) => room.onEditorMount(editor, monaco)} 
              />
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
                    personalPrefs={room.personalPrefs}
                    onOpenSettings={() => room.setSettingsOpen(true)}
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
          roomId={roomId}
          refreshGitStatus={room.refreshGitStatus}
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
               <DoorOpen size={28} color="#f38ba8" />
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
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          ...(active ? { background: "rgba(203,166,247,0.08)", boxShadow: `0 0 12px ${accent}20` } : {})
        }}
        onMouseEnter={e => { 
          if (!active) {
            e.currentTarget.style.color = "rgba(255,255,255,0.8)"
            e.currentTarget.style.background = "rgba(255,255,255,0.04)"
            e.currentTarget.style.transform = "scale(1.1)"
          }
        }}
        onMouseLeave={e => { 
          if (!active) {
            e.currentTarget.style.color = "rgba(255,255,255,0.4)"
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }
        }}
      >
        {icon}
      </button>
      {active && (
        <motion.div 
          layoutId="active-panel-indicator"
          style={{ 
            position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", 
            width: 3, height: 22, borderRadius: "0 3px 3px 0",
            background: `linear-gradient(180deg, ${accent}, rgba(137,180,250,0.8))`,
            boxShadow: `0 0 10px ${accent}40`
          }}
        />
      )}
      {count > 0 && !active && (
        <div style={{ 
          position: "absolute", top: -3, right: -3, background: accent, color: "#1e1e2e", 
          fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 8px ${accent}50`,
          animation: "breathe 2s ease-in-out infinite"
        }}>
          {count > 9 ? "9+" : count}
        </div>
      )}
    </div>
  )
}
