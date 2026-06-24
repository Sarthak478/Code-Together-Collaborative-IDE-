import { useEffect, useState, useCallback, useRef } from "react"
import { motion as Motion, AnimatePresence } from "framer-motion"
import { API_URL } from "../config"
import Editor from "@monaco-editor/react"

import useIDERoom from "../hooks/useIDERoom"
import Navbar from "./editor/Navbar"
import ChatPanel from "./editor/ChatPanel"
import SettingsPanel from "./editor/SettingsPanel"
import OutputPanel from "./editor/OutputPanel"

import FileExplorer from "./ide/FileExplorer"
import TabBar from "./ide/TabBar"
import TerminalPanel from "./ide/TerminalPanel"
import StatusBar from "./ide/StatusBar"
import AIPanel from "./ide/AIPanel"
import VideoCall from "./editor/VideoCall"
import SourceControlPanel from "./ide/SourceControlPanel"
import DiffModal from "./ui/DiffModal"
import LocalAgentModal from "./ui/LocalAgentModal"
import AccessControlModal from "./editor/AccessControlModal"
import InviteModal from "./editor/InviteModal"
import { DoorOpen, AlertCircle, GitFork, MessageCircle, Wand2, Bot, TerminalSquare } from "lucide-react"
import { ROOM_MODES } from "../constants/roomModes"

export default function IDERoom(props) {
  const ide = useIDERoom(props)
  const [accessControlOpen, setAccessControlOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [activeDiff, setActiveDiff] = useState(null) // { path, staged }
  
  // Ralph Automation State
  const [ralphPrompt, setRalphPrompt] = useState(null)
  const [sendTerminalCommand, setSendTerminalCommand] = useState(null)
  const rightPanelRef = useRef(ide.rightPanel)

  useEffect(() => {
    rightPanelRef.current = ide.rightPanel
  }, [ide.rightPanel])

  const handleAskRalph = useCallback((log) => {
    // Open AI panel if not already open
    if (rightPanelRef.current !== "ai") ide.toggleRightPanel("ai")
    setRalphPrompt("I encountered this error in my terminal. Analyze it and provide a fix:\n\n```\n" + log + "\n```")
  }, [ide.toggleRightPanel])

  const handleSendCommandReady = useCallback((sendFn) => {
    setSendTerminalCommand(() => sendFn)
  }, [])

  // Global Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        ide.saveCode()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [ide])

  return (
    <div
      className="ide-root"
      style={{
        display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
        background: ide.bg, color: ide.textColor,
        fontFamily: "'Manrope', 'Inter', system-ui, sans-serif"
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <AccessControlModal 
        isOpen={accessControlOpen} 
        onClose={() => setAccessControlOpen(false)} 
        roomId={ide.roomId} 
      />

      <InviteModal 
        isOpen={inviteOpen} 
        onClose={() => setInviteOpen(false)} 
        roomId={ide.roomId} 
        roomType={ide.actualRoomType}
        roomMode={ROOM_MODES.IDE}
        isHost={ide.isHost}
        username={ide.editor.username}
      />

      <LocalAgentModal
        isOpen={ide.localAgentPrompt.open}
        fileName={ide.localAgentPrompt.fileName}
        commands={ide.localAgentCommands}
        status={ide.localAgentStatus}
        onClose={ide.closeLocalAgentPrompt}
        onOpenLocalAgent={ide.openLocalAgent}
        onContinueInCloud={ide.continueRunInCloud}
        onRunLocalAgent={ide.runOnLocalAgent}
        onRefreshStatus={ide.refreshLocalAgentStatus}
        onCopyCommand={ide.copyLocalAgentCommand}
        themeData={{ accent: ide.accent, textColor: ide.textColor, panelBg: ide.panelBg, borderCol: ide.borderCol, inputBg: ide.inputBg }}
      />

      {/* ── Navbar ── */}
      <Navbar
        roomId={ide.roomId}
        actualRoomType={ide.actualRoomType}
        isHost={ide.isHost}
        username={ide.editor.username}
        callActive={ide.callActive}
        onToggleCall={() => ide.setCallActive(!ide.callActive)}
        onToggleSettings={() => ide.setSettingsOpen(true)}
        onToggleGit={() => ide.toggleRightPanel("git")}
        onToggleAccessControl={() => setAccessControlOpen(!accessControlOpen)}
        onToggleInvite={() => setInviteOpen(!inviteOpen)}
        onLeave={() => ide.setExitConfirmOpen(true)}
        headerBg={ide.headerBg}
        borderCol={ide.borderCol}
        textColor={ide.textColor}
        accent={ide.accent}
      />

      {/* ── IDE Toolbar Area ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 12px", background: ide.toolbarBg, borderBottom: `1px solid ${ide.borderCol}`,
        height: 48, boxSizing: "border-box"
      }}>
        {/* Download Button (Left) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={ide.downloadCode}
            disabled={!ide.activeFile}
            style={{
              background: ide.inputBg, color: ide.textColor, opacity: !ide.activeFile ? 0.5 : 1,
              border: `1px solid ${ide.borderCol}`, padding: "6px 12px", borderRadius: 10,
              cursor: !ide.activeFile ? "not-allowed" : "pointer", fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'Manrope', sans-serif", fontWeight: 500
            }}
          >
            📥 Download
          </button>
        </div>

        {/* User Presence (Center-ish) with Enhanced Details */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 16px", overflowX: "auto", maxWidth: 400 }}>
          {ide.visibleActiveUsersList.map(u => {
            const isYou = u.id === ide.editor.provider.awareness.clientID;
            const onSameFile = u.activeFile === ide.activeFile;
            const statusText = isYou 
              ? `@${u.name} (You)${u.activeFile ? ` - ${u.activeFile.split("/").pop()}` : ""}`
              : `Click to follow @${u.name}${u.activeFile ? ` - ${u.activeFile.split("/").pop()}` : ""}`;
            
            return (
              <div
                key={u.id}
                onClick={() => { if (u.activeFile && !isYou) ide.openFile(u.activeFile) }}
                title={statusText}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: u.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#1e1e2e", fontWeight: "bold", fontSize: 11, cursor: isYou ? "default" : "pointer",
                  border: onSameFile ? `2px solid ${ide.accent}` : "2px solid transparent",
                  flexShrink: 0, transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: onSameFile ? `0 0 8px ${ide.accent}66` : "none",
                  position: "relative"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.15)";
                  e.currentTarget.style.boxShadow = `0 0 12px ${u.color}80`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = onSameFile ? `0 0 8px ${ide.accent}66` : "none";
                }}
              >
                {u.name.slice(0, 1).toUpperCase()}
                {/* Active indicator */}
                <div 
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 8,
                    background: "#10b981",
                    borderRadius: "50%",
                    border: "2px solid " + u.color,
                    bottom: -2,
                    right: -2,
                    animation: "pulse 2s infinite"
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Right Side: Interview + Run/Preview/Terminal */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          {ide.actualRoomType === "interview" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16 }}>
              <div style={{ 
                background: "rgba(166, 227, 161, 0.15)", color: "#a6e3a1", padding: "4px 12px", 
                borderRadius: 20, fontSize: 11, fontWeight: "bold", textTransform: "uppercase", 
                letterSpacing: "1px", border: "1px solid rgba(166, 227, 161, 0.2)",
                display: "flex", alignItems: "center", gap: 6
              }}>
                🎓 Interview Mode
              </div>
              <div style={{ 
                color: ide.textColor, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", 
                opacity: 0.8, background: "rgba(255,255,255,0.03)", padding: "4px 10px",
                borderRadius: 8, border: `1px solid ${ide.borderCol}`, letterSpacing: "0.02em"
              }}>
                ⏱️ {new Date(ide.interviewTime * 1000).toISOString().substr(11, 8)}
              </div>
              <div style={{
                background: ide.isHost ? "rgba(249, 226, 175, 0.1)" : "rgba(137, 180, 250, 0.1)",
                color: ide.isHost ? "#f9e2af" : "#89b4fa",
                fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                border: `1px solid ${ide.isHost ? "rgba(249, 226, 175, 0.2)" : "rgba(137, 180, 250, 0.2)"}`,
                textTransform: "uppercase", letterSpacing: "0.5px"
              }}>
                {ide.isHost ? "👑 Interviewer" : "👤 Candidate"}
              </div>
            </div>
          )}

          <button
            onClick={ide.runCode}
            disabled={!ide.canRun || !ide.activeFile}
            className="ide-btn-premium"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: ide.canRun && ide.activeFile ? `linear-gradient(135deg, ${ide.accent}, rgba(137,180,250,0.9))` : ide.inputBg,
              color: ide.canRun && ide.activeFile ? "#fff" : ide.textColor,
              opacity: (!ide.canRun || !ide.activeFile) ? 0.5 : 1,
              border: `1px solid ${ide.canRun && ide.activeFile ? ide.accent : ide.borderCol}`,
              padding: "6px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
              fontFamily: "'Manrope', sans-serif", letterSpacing: "0.01em",
              cursor: (!ide.canRun || !ide.activeFile) ? "not-allowed" : "pointer",
              boxShadow: (ide.canRun && ide.activeFile) ? `0 4px 20px ${ide.accent}44` : "none"
            }}
            title="Run code in terminal"
          >
            {ide.runner === ide.editor.username ? (
              <>
                <Motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>⚙️</Motion.span>
                Starting
              </>
            ) : ide.runner ? (
              "⏳ Queued"
            ) : (
              <>
                <span>▶</span> {ide.activeLanguage === "html" || ide.activeLanguage === "markdown" ? "Open Preview" : "Run in Terminal"}
              </>
            )}
          </button>

          <button
            onClick={() => ide.setPreviewOpen(!ide.previewOpen)}
            disabled={!ide.activeFile}
            style={{
              background: ide.previewOpen ? ide.accent : ide.inputBg,
              color: ide.previewOpen ? "#fff" : ide.textColor,
              opacity: !ide.activeFile ? 0.5 : 1,
              border: `1px solid ${ide.previewOpen ? ide.accent : ide.borderCol}`,
              padding: "6px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
              fontFamily: "'Manrope', sans-serif", letterSpacing: "0.01em",
              cursor: !ide.activeFile ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6
            }}
            title="Toggle Live Preview"
          >
            👁️ Live Preview
          </button>
        </div>
      </div>

      {/* ── Main content row ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "row" }}>
        
        {/* Left Mini Sidebar for Panels */}
        <div style={{ 
          width: 48, borderRight: `1px solid ${ide.borderCol}`, background: "rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 4,
          backgroundImage: "linear-gradient(180deg, rgba(203,166,247,0.03) 0%, transparent 40%, transparent 60%, rgba(137,180,250,0.02) 100%)"
        }}>
          {ide.actualRoomType !== "broadcast" && (
            <IDEPanelToggleButton 
              icon={<MessageCircle size={20} />} 
              active={ide.rightPanel === "chat"} 
              onClick={() => ide.toggleRightPanel("chat")} 
              accent={ide.accent} 
              count={ide.visibleChatMsgs.length}
              title="Chat"
            />
          )}
          <IDEPanelToggleButton 
            icon={<GitFork size={20} />} 
            active={ide.rightPanel === "git"} 
            onClick={() => ide.toggleRightPanel("git")} 
            accent={ide.accent} 
            title="Source Control"
          />
          <IDEPanelToggleButton 
            icon={<Wand2 size={20} />} 
            active={ide.rightPanel === "ai"} 
            onClick={() => ide.toggleRightPanel("ai")} 
            accent={ide.accent} 
            title="AI Coder"
          />
          <IDEPanelToggleButton 
            icon={<TerminalSquare size={20} />} 
            active={ide.terminalOpen} 
            onClick={() => ide.toggleTerminal()} 
            accent={ide.accent} 
            title="Terminal"
          />
        </div>

        {/* File Explorer */}
        <FileExplorer
          fs={ide.fs}
          activeFile={ide.activeFile}
          onFileClick={ide.openFile}
          isHost={ide.isHost}
          canEdit={ide.canEdit}
          textColor={ide.textColor}
          borderCol={ide.borderCol}
          inputBg={ide.inputBg}
          panelBg={ide.panelBg}
          accent={ide.accent}
          isDark={ide.isDark}
          headerBg={ide.headerBg}
          addToast={ide.addToast}
        />

        {/* Center Panel (Editor + Terminal) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0, position: "relative" }}>
          
          {/* Tab Bar */}
          <TabBar
            openFiles={ide.openFiles}
            activeFile={ide.activeFile}
            onSelectFile={ide.openFile}
            onCloseFile={ide.closeFile}
            fs={ide.fs}
            textColor={ide.textColor}
            borderCol={ide.borderCol}
            inputBg={ide.inputBg}
            accent={ide.accent}
            isDark={ide.isDark}
            headerBg={ide.headerBg}
          />

          {/* Editor Container */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {ide.activeFile && !ide.isSyncingFile && ide.isPersistenceSynced ? (
                <Editor
                  key={ide.activeFile}
                  height="100%"
                  width="100%"
                  language={ide.activeLanguage}
                  theme={ide.monacoTheme}
                  options={ide.monacoOptions}
                  onMount={(editor, monaco) => ide.onEditorMount(editor, monaco)}
                />
              ) : (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", opacity: 0.5, gap: 16, background: ide.panelBg,
                  backgroundImage: "radial-gradient(ellipse at 50% 40%, rgba(203,166,247,0.04) 0%, transparent 70%)"
                }}>
                  {(ide.isSyncingFile || !ide.isPersistenceSynced) ? (
                    <>
                      <div style={{ width: 44, height: 44, border: `3px solid ${ide.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", boxShadow: `0 0 20px ${ide.accent}20` }} />
                      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.5px", fontFamily: "'Manrope', sans-serif" }}>
                        {!ide.isPersistenceSynced ? "Initializing Offline Storage..." : "Synchronizing Workspace..."}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(203,166,247,0.2))" }}>🛠️</div>
                      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif", background: "linear-gradient(135deg, #cba6f7, #89b4fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CodeTogether Collaborative IDE</div>
                      <div style={{ fontSize: 13, marginTop: 8, opacity: 0.7, fontFamily: "'Manrope', sans-serif" }}>Select or create a file to start coding</div>
                    </>
                  )}
                </div>
              )}
            </div>

            {ide.previewOpen && (
              <OutputPanel
                output={{ isRender: true, lang: ide.activeLanguage, renderedCode: ide.activeYText?.toString() || "" }}
                onClear={() => ide.setPreviewOpen(false)}
                fontFamily={ide.activeFontFamily}
                fontSize={ide.activeFontSize}
                isDark={ide.isDark}
                textColor={ide.textColor}
                borderCol={ide.borderCol}
              />
            )}
          </div>

          {/* Terminal Panel at Bottom - Vertical Layout */}
          <AnimatePresence initial={false}>
            {ide.terminalOpen && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 300, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                style={{ overflow: "hidden", borderTop: `1px solid ${ide.borderCol}`, background: ide.panelBg, zIndex: 5, display: "flex", flexDirection: "column" }}
              >
                <TerminalPanel
                  roomId={ide.roomId}
                  height="100%"
                  isDark={ide.isDark}
                  borderCol={ide.borderCol}
                  headerBg={ide.headerBg}
                  textColor={ide.textColor}
                  accent={ide.accent}
                  onAskRalph={handleAskRalph}
                  onSendCommandReady={handleSendCommandReady}
                />
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel (Chat, Git, AI only) */}
        <AnimatePresence initial={false}>
          {ide.rightPanel && (
            <Motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              style={{ overflow: "hidden", borderLeft: `1px solid ${ide.borderCol}`, background: ide.panelBg, zIndex: 5, display: "flex", flexDirection: "column" }}
            >
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                {ide.rightPanel === "chat" ? (
                  <ChatPanel
                    messages={ide.visibleChatMsgs}
                    chatInput={ide.chatInput}
                    onChatInputChange={ide.setChatInput}
                    chatTarget={ide.chatTarget}
                    onChatTargetChange={ide.setChatTarget}
                    onSendChat={ide.sendChat}
                    visibleActiveUsersList={ide.visibleActiveUsersList}
                    themeData={{ bg: ide.bg, textColor: ide.textColor, borderCol: ide.borderCol, accent: ide.accent, inputBg: ide.inputBg, panelBg: ide.panelBg, headerBg: ide.headerBg }}
                    chatEnabled={ide.chatEnabled}
                    username={ide.editor.username}
                    actualRoomType={ide.actualRoomType}
                    isHost={ide.isHost}
                  />
                ) : ide.rightPanel === "git" ? (
                  <SourceControlPanel
                    roomId={ide.roomId}
                    gitStatus={ide.gitStatus}
                    isGitLoading={ide.isGitLoading}
                    onRefresh={ide.refreshGitStatus}
                    onWorkspaceSync={ide.refreshWorkspaceFromDisk}
                    onViewDiff={(path, staged) => setActiveDiff({ path, staged })}
                    username={ide.editor.username}
                    personalPrefs={ide.personalPrefs}
                    onOpenSettings={() => ide.setSettingsOpen(true)}
                    themeData={{ bg: ide.bg, textColor: ide.textColor, borderCol: ide.borderCol, accent: ide.accent, inputBg: ide.inputBg, panelBg: ide.panelBg, headerBg: ide.headerBg }}
                  />
                ) : ide.rightPanel === "ai" ? (
                  <AIPanel
                    activeFile={ide.activeFile}
                    activeYText={ide.activeYText}
                    textColor={ide.textColor}
                    borderCol={ide.borderCol}
                    panelBg={ide.panelBg}
                    inputBg={ide.inputBg}
                    accent={ide.accent}
                    isDark={ide.isDark}
                    headerBg={ide.headerBg}
                    autoPrompt={ralphPrompt}
                    fileSystem={ide.fs}
                    ydoc={ide.editor.ydoc}
                    roomId={ide.roomId}
                    openFile={ide.openFile}
                    sendTerminalCommand={sendTerminalCommand}
                  />
                ) : null}
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Preview Panel (Right side, below or beside terminal) */}
        {ide.previewOpen && !ide.terminalOpen && (
          <div style={{ 
            width: 450, borderLeft: `1px solid ${ide.borderCol}`, 
            background: ide.isDark ? "#0d0d1a" : "#f1f3f5", 
            display: "flex", flexDirection: "column", zIndex: 4
          }}>
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "space-between", 
              padding: "8px 12px", background: ide.headerBg, 
              borderBottom: `1px solid ${ide.borderCol}`, fontSize: 12,
              fontFamily: "'Manrope', sans-serif"
            }}>
              <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: ide.accent, display: "inline-block" }} />
                Live Preview
              </span>
              <button 
                onClick={() => ide.setPreviewOpen(false)} 
                style={{ background: "transparent", border: "none", cursor: "pointer", color: ide.textColor, opacity: 0.6, fontSize: 12, transition: "opacity 0.2s", fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
              >✕ Close</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
              {ide.activeLanguage === 'html' ? (
                <iframe 
                  srcDoc={ide.activeYText?.toString() || ""} 
                  title="HTML Preview" 
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: 8 }} 
                  sandbox="allow-scripts allow-forms allow-same-origin" 
                />
              ) : (
                <div style={{ color: ide.textColor }}>
                  <div style={{ marginBottom: 16, fontSize: 13, opacity: 0.7 }}>
                    Preview not available for {ide.activeLanguage} files
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ── */}
      <StatusBar
        activeLanguage={ide.activeLanguage}
        roomMode={ROOM_MODES.IDE}
        terminalOpen={ide.terminalOpen}
        isHost={ide.isHost}
        username={ide.editor.username}
        bg={ide.bg}
        textColor={ide.textColor}
        accent={ide.accent}
        actualRoomType={ide.actualRoomType}
      />

      {/* ── Modals / Overlays ── */}
      {ide.settingsOpen && (
        <SettingsPanel
          onClose={() => ide.setSettingsOpen(false)}
          personalPrefs={ide.personalPrefs}
          updatePersonalPref={ide.updatePersonalPref}
          roomTheme={ide.roomTheme}
          roomFont={ide.roomFont}
          onSetRoomTheme={ide.onSetRoomTheme}
          chatEnabled={ide.chatEnabled}
          onToggleChatEnabled={ide.onToggleChatEnabled}
          showUsersList={ide.showUsersList}
          onToggleShowUsers={ide.onToggleShowUsers}
          pushRoomUI={ide.pushRoomUI}
          clearRoomUI={ide.clearRoomUI}
          isHost={ide.isHost}
          activeUsers={ide.visibleActiveUsersList}
          hostName={ide.hostName}
          kickUser={ide.kickUser}
          restrictedUsers={ide.restrictedUsers}
          restrictUser={ide.restrictUser}
          unrestrictUser={ide.unrestrictUser}
          themeData={{ bg: ide.bg, headerBg: ide.headerBg, textColor: ide.textColor, borderCol: ide.borderCol, accent: ide.accent, inputBg: ide.inputBg, isDark: ide.isDark, panelBg: ide.panelBg }}
          username={ide.editor.username}
          clientID={ide.editor.provider.awareness.clientID}
          roomId={ide.roomId}
          roomMode={ROOM_MODES.IDE}
          refreshGitStatus={ide.refreshGitStatus}
        />
      )}

      {/* Exit Confirmation Modal */}
      {ide.exitConfirmOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", 
          alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)"
        }}>
          <Motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="ide-glass-effect"
            style={{
              background: ide.panelBg, border: `1px solid ${ide.borderCol}`, 
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
            <h3 style={{ margin: "0 0 12px 0", color: ide.textColor, fontSize: 20, fontWeight: 800 }}>Ready to leave?</h3>
            <p style={{ margin: "0 0 28px 0", color: ide.textColor, fontSize: 14, opacity: 0.6, lineHeight: 1.6 }}>
              Are you sure you want to exit? <br />
              All unsaved progress and session data will be permanently cleared.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => ide.setExitConfirmOpen(false)}
                className="ide-btn-premium"
                style={{
                  flex: 1, background: ide.inputBg, color: ide.textColor, 
                  border: `1px solid ${ide.borderCol}`, justifyContent: "center"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  ide.setExitConfirmOpen(false);
                  ide.onLeave();
                }}
                className="ide-btn-premium"
                style={{
                  flex: 1, background: "#f38ba8", color: "#1e1e2e", 
                  border: "none", justifyContent: "center"
                }}
              >
                Yes, Exit Room
              </button>
            </div>
          </Motion.div>
        </div>
      )}

      {/* Video Call Bubbles */}
      {ide.callActive && (
        <VideoCall 
          roomId={ide.roomId}
          username={ide.editor.username}
          peerId={ide.peerId}
          setPeerId={ide.setPeerId}
          activeUsers={ide.visibleActiveUsersList}
          themeData={{ accent: ide.accent, textColor: ide.textColor, panelBg: ide.panelBg }}
        />
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 60, right: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        <AnimatePresence>
          {ide.toasts.map(toast => (
            <Motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: ide.headerBg, color: ide.textColor, padding: "12px 16px", borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)", borderLeft: `4px solid ${ide.accent}`,
                fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 10
              }}
            >
              {toast.text}
            </Motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Git Diff Modal */}
      {activeDiff && (
        <DiffModal 
          roomId={ide.roomId}
          filePath={activeDiff.path}
          staged={activeDiff.staged}
          onClose={() => setActiveDiff(null)}
          themeData={{ accent: ide.accent, textColor: ide.textColor, panelBg: ide.panelBg, isDark: ide.isDark, borderCol: ide.borderCol, inputBg: ide.inputBg }}
          onStage={async (path) => {
            await fetch(`${API_URL}/git/stage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId: ide.roomId, filePaths: [path] })
            })
            ide.refreshGitStatus()
          }}
        />
      )}
    </div>
  )
}

function IDEPanelToggleButton({ icon, active, onClick, accent, count, title }) {
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
        <Motion.div 
          layoutId="ide-active-panel-indicator"
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
