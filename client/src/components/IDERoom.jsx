import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CodeMirror from "@uiw/react-codemirror"
import { keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"

import useIDERoom from "../hooks/useIDERoom"
import Navbar from "./editor/Navbar"
import ChatPanel from "./editor/ChatPanel"
import SettingsPanel from "./editor/SettingsPanel"
import OutputPanel from "./editor/OutputPanel"

import FileExplorer from "./ide/FileExplorer"
import TabBar from "./ide/TabBar"
import TerminalPanel from "./ide/TerminalPanel"
import ExtensionsPanel from "./ide/ExtensionsPanel"
import StatusBar from "./ide/StatusBar"


export default function IDERoom(props) {
  const ide = useIDERoom(props)
  
  // Terminal Resize Handle State
  const [isResizingTerminal, setIsResizingTerminal] = useState(false)
  const isResizingTerminalRef = useRef(false)

  // Sync ref with state for mousemove event listener
  useEffect(() => {
    isResizingTerminalRef.current = isResizingTerminal
  }, [isResizingTerminal])

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

  // Resize Drag Handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingTerminalRef.current) return
      // Prevent highlighting text while dragging
      e.preventDefault()
      
      const windowHeight = window.innerHeight
      const statusBarHeight = 24
      const navbarHeight = 56
      const minHeight = 40
      const maxHeight = windowHeight - statusBarHeight - navbarHeight - 100 // Leave space for editor

      // Calculate new height from bottom
      const newHeight = windowHeight - e.clientY - statusBarHeight
      
      ide.setTerminalHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)))
    }

    const handleMouseUp = () => {
      setIsResizingTerminal(false)
    }

    if (isResizingTerminal) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingTerminal, ide])

  const handleMouseDownTerminal = useCallback((e) => {
    e.preventDefault()
    setIsResizingTerminal(true)
  }, [])

  return (
    <div
      className="ide-root"
      style={{
        display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
        background: ide.bg, color: ide.textColor,
        fontFamily: "'Inter', system-ui, sans-serif"
      }}
    >
      {/* ── Navbar ── */}
      <Navbar
        roomId={ide.roomId}
        actualRoomType={ide.actualRoomType}
        isHost={ide.isHost}
        username={ide.editor.username}
        onToggleSettings={() => ide.setSettingsOpen(true)}
        onLeave={ide.onLeave}
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
        {/* Run Button (Left) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={ide.runCode}
            disabled={!ide.canRun || !ide.activeFile}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: ide.canRun && ide.activeFile ? ide.accent : ide.inputBg,
              color: ide.canRun && ide.activeFile ? "#fff" : ide.textColor,
              opacity: (!ide.canRun || !ide.activeFile) ? 0.5 : 1,
              border: `1px solid ${ide.canRun && ide.activeFile ? ide.accent : ide.borderCol}`,
              padding: "6px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13,
              cursor: (!ide.canRun || !ide.activeFile) ? "not-allowed" : "pointer"
            }}
          >
            {ide.runner === ide.editor.username ? (
              <>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>⚙️</motion.span>
                Starting
              </>
            ) : ide.runner ? (
              "⏳ Queued"
            ) : (
              <>
                <span>▶</span> Run in Terminal
              </>
            )}
          </button>
          
          <button
            onClick={ide.downloadCode}
            disabled={!ide.activeFile}
            style={{
              background: ide.inputBg, color: ide.textColor, opacity: !ide.activeFile ? 0.5 : 1,
              border: `1px solid ${ide.borderCol}`, padding: "6px 12px", borderRadius: 6,
              cursor: !ide.activeFile ? "not-allowed" : "pointer", fontSize: 13,
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            📥 Download Option
          </button>
        </div>

        {/* User Presence (Center-ish) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 16px", overflowX: "auto", maxWidth: 400 }}>
          {ide.visibleActiveUsersList.map(u => (
            <div
              key={u.id}
              onClick={() => { if (u.activeFile && u.id !== ide.editor.provider.awareness.clientID) ide.openFile(u.activeFile) }}
              title={u.id === ide.editor.provider.awareness.clientID ? `@${u.name} (You)` : `Click to follow @${u.name}`}
              style={{
                width: 28, height: 28, borderRadius: "50%", background: u.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#1e1e2e", fontWeight: "bold", fontSize: 11, cursor: "pointer",
                border: u.activeFile === ide.activeFile ? `2px solid ${ide.accent}` : "2px solid transparent",
                flexShrink: 0, transition: "transform 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {u.name.slice(0, 1).toUpperCase()}
            </div>
          ))}
        </div>

        {/* Right Toggle Panel Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          {ide.actualRoomType !== "broadcast" && (
            <button
              onClick={() => ide.toggleRightPanel("chat")}
              style={{
                background: ide.rightPanel === "chat" ? (ide.isDark ? "rgba(137, 180, 250, 0.2)" : "rgba(13, 110, 253, 0.1)") : "transparent",
                color: ide.rightPanel === "chat" ? ide.accent : ide.textColor,
                border: "none", height: "100%", padding: "0 12px", borderRadius: 6,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontWeight: 600, fontSize: 13
              }}
            >
              💬 Chat
            </button>
          )}

          <button
            onClick={() => ide.toggleRightPanel("extensions")}
            style={{
              background: ide.rightPanel === "extensions" ? (ide.isDark ? "rgba(137, 180, 250, 0.2)" : "rgba(13, 110, 253, 0.1)") : "transparent",
              color: ide.rightPanel === "extensions" ? ide.accent : ide.textColor,
              border: "none", height: "100%", padding: "0 12px", borderRadius: 6,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontWeight: 600, fontSize: 13
            }}
          >
            🧩 Tools
          </button>

          <button
            onClick={() => {
              const nextState = !ide.terminalOpen;
              ide.setTerminalOpen(nextState);
              if (nextState) {
                ide.syncFilesToTerminal();
              }
            }}
            style={{
              background: ide.terminalOpen ? (ide.isDark ? "rgba(137, 180, 250, 0.2)" : "rgba(13, 110, 253, 0.1)") : "transparent",
              color: ide.terminalOpen ? ide.accent : ide.textColor,
              border: "none", height: "100%", padding: "0 12px", borderRadius: 6,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontWeight: 600, fontSize: 13
            }}
          >
            &gt;_ Terminal
          </button>

          {ide.actualRoomType === "interview" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16 }}>
              <div style={{ background: "#a6e3a1", color: "#1e1e2e", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                🎓 Interview Mode
              </div>
              <div style={{ color: ide.textColor, fontSize: 13, fontWeight: "bold", fontFamily: "monospace", opacity: 0.8 }}>
                ⏱️ {new Date(ide.interviewTime * 1000).toISOString().substr(11, 8)}
              </div>
            </div>
          )}

          <button
            onClick={() => ide.setPreviewOpen(!ide.previewOpen)}
            style={{
              background: ide.previewOpen ? "transparent" : (ide.isDark ? "rgba(137, 180, 250, 0.2)" : "rgba(13, 110, 253, 0.1)"),
              color: ide.previewOpen ? ide.textColor : ide.accent,
              border: `1px solid ${ide.previewOpen ? "transparent" : ide.borderCol}`, cursor: "pointer", fontSize: 13, fontWeight: "bold",
              padding: "4px 10px", borderRadius: 6, transition: "all 0.2s"
            }}
          >
            {ide.previewOpen ? "❌ Close Preview" : "🚀 Open Preview"}
          </button>
        </div>
      </div>

      {/* ── Main content row ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* File Explorer (Left) */}
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
          <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "row" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {ide.activeFile && !ide.isSyncingFile && ide.isPersistenceSynced ? (
                <CodeMirror
                  key={ide.activeFile}
                  extensions={[
                    ...ide.extensions,
                    keymap.of([indentWithTab])
                  ]}
                  theme={ide.cmBaseTheme}
                  style={{ flex: 1, fontSize: `${ide.activeFontSize}px`, fontFamily: ide.activeFontFamily, height: "100%" }}
                  readOnly={!ide.canEdit}
                />
              ) : (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", opacity: 0.4, gap: 16, background: ide.panelBg
                }}>
                  {(ide.isSyncingFile || !ide.isPersistenceSynced) ? (
                    <>
                      <div style={{ width: 40, height: 40, border: `3px solid ${ide.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {!ide.isPersistenceSynced ? "Initializing Offline Storage..." : "Synchronizing Workspace..."}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 64 }}>🛠️</div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>LiveShare Collaborative IDE</div>
                      <div style={{ fontSize: 13, marginTop: 8 }}>Select or create a file to start coding</div>
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



          {/* Resize Handle */}
          {ide.terminalOpen && (
            <div
              className={`ide-resize-handle ${isResizingTerminal ? 'dragging' : ''}`}
              onMouseDown={handleMouseDownTerminal}
            />
          )}

          {/* Terminal */}
          {ide.terminalOpen && (
            <TerminalPanel
              roomId={ide.roomId}
              height={ide.terminalHeight}
              isDark={ide.isDark}
              borderCol={ide.borderCol}
              headerBg={ide.headerBg}
              textColor={ide.textColor}
              accent={ide.accent}
            />
          )}
        </div>

        {/* Right Panel (Chat or Extensions) */}
        <AnimatePresence initial={false}>
          {ide.rightPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              style={{ overflow: "hidden", borderLeft: `1px solid ${ide.borderCol}`, background: ide.panelBg, zIndex: 5 }}
            >
              <div style={{ width: 320, height: "100%", display: "flex", flexDirection: "column" }}>
                {ide.rightPanel === "chat" ? (
                  <ChatPanel
                    messages={ide.visibleChatMsgs}
                    chatInput={ide.chatInput}
                    setChatInput={ide.setChatInput}
                    chatTarget={ide.chatTarget}
                    setChatTarget={ide.setChatTarget}
                    onSendMessage={ide.sendChat}
                    activeUsers={ide.visibleActiveUsersList}
                    themeData={{ bg: ide.bg, textColor: ide.textColor, borderCol: ide.borderCol, accent: ide.accent, inputBg: ide.inputBg, panelBg: ide.panelBg, headerBg: ide.headerBg }}
                    chatEnabled={ide.chatEnabled}
                    username={ide.editor.username}
                    actualRoomType={ide.actualRoomType}
                    isHost={ide.isHost}
                  />
                ) : (
                  <ExtensionsPanel
                    textColor={ide.textColor}
                    borderCol={ide.borderCol}
                    panelBg={ide.panelBg}
                    accent={ide.accent}
                    isDark={ide.isDark}
                    headerBg={ide.headerBg}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Status Bar ── */}
      <StatusBar
        activeLanguage={ide.activeLanguage}
        roomMode="ide"
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
          themeData={{ bg: ide.bg, headerBg: ide.headerBg, textColor: ide.textColor, borderCol: ide.borderCol, accent: ide.accent, inputBg: ide.inputBg, isDark: ide.isDark, panelBg: ide.panelBg }}
          username={ide.editor.username}
        />
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 60, right: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        <AnimatePresence>
          {ide.toasts.map(toast => (
            <motion.div
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
