import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { EditorView } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { IndexeddbPersistence } from "y-indexeddb"
import { yCollab } from "y-codemirror.next"

import { LANGUAGES, THEMES, FONT_FAMILIES, EXT_TO_LANG } from "../constants/editorConfigs"
import { loadPersonalPrefs, savePersonalPrefs } from "../utils/helpers"
import useFileSystem from "./useFileSystem"

export default function useIDERoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  /* ── Yjs stable refs ── */
  const [editor] = useState(() => {
    const ydoc = new Y.Doc()

    // Persist Yjs document offline in browser 
    const persistence = new IndexeddbPersistence(`liveshare-room-${roomId}`, ydoc)

    const provider = new HocuspocusProvider({
      url: "ws://127.0.0.1:1235",
      name: roomId,
      document: ydoc,
    })
    const roomMap = ydoc.getMap("room")
    const chatArray = ydoc.getArray("chat")

    if (isCreating) {
      roomMap.set("roomType", initialRoomType)
      roomMap.set("roomMode", "ide")
    }

    const joinTime = Date.now()
    provider.awareness.setLocalStateField("user", {
      name: username,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      joinTime,
    })

    return { ydoc, provider, username, joinTime, roomMap, chatArray }
  })

  /* ── File System ── */
  const fs = useFileSystem(editor.ydoc, editor.provider, isCreating, roomId)

  /* ── Open Files & Tabs ── */
  const [openFiles, setOpenFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)

  /* ── Terminal ── */
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalHeight, setTerminalHeight] = useState(200)

  /* ── Right Panel: 'chat' | 'extensions' | null ── */
  const [rightPanel, setRightPanel] = useState(null)

  /* ── Room state ── */
  const [actualRoomType, setRoomType] = useState(initialRoomType)
  const [output, setOutput] = useState("")
  const [runner, setRunner] = useState(null)

  /* ── Chat & Moderation ── */
  const [showUsersList, setShowUsersList] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatTarget, setChatTarget] = useState("all")
  const [chatEnabled, setChatEnabled] = useState(true)
  const [kickedUsers, setKickedUsers] = useState([])
  const [toasts, setToasts] = useState([])
  const lastToastId = useRef(null)

  const addToast = useCallback((msgText) => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text: msgText }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  /* ── Host state & Active Users ── */
  const [activeUsers, setActiveUsers] = useState([])
  const [hostClientId, setHostClientId] = useState(null)
  const [hostName, setHostName] = useState("")
  const isHost = hostClientId === editor.provider.awareness.clientID

  const canEdit = isHost || actualRoomType !== "broadcast"
  const canRun = isHost || actualRoomType !== "broadcast"
  const canChangeRoom = isHost

  /* ── Personal UI ── */
  const [personalPrefs, setPersonalPrefs] = useState(() => {
    const p = loadPersonalPrefs()
    return { theme: p.theme || "dark", fontSize: p.fontSize || 14, fontFamily: p.fontFamily || "monospace", cursor: p.cursor || "text" }
  })
  const updatePersonalPref = useCallback((key, value) => {
    setPersonalPrefs(prev => { const next = { ...prev, [key]: value }; savePersonalPrefs(next); return next })
  }, [])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [roomTheme, setRoomTheme] = useState(null)
  const [roomFont, setRoomFont] = useState(null)
  const activeTheme = roomTheme ?? personalPrefs.theme
  const activeFontSize = roomFont?.fontSize ?? personalPrefs.fontSize
  const activeFontFamily = roomFont?.fontFamily ?? personalPrefs.fontFamily

  /* ── Cleanup ── */
  useEffect(() => {
    const handleUnload = () => {
      editor.provider.awareness.setLocalState(null)
      editor.provider.disconnect()
    }
    window.addEventListener("beforeunload", handleUnload)
    return () => {
      window.removeEventListener("beforeunload", handleUnload)
      handleUnload()
      editor.ydoc.destroy()
    }
  }, [editor])

  /* ── Host calc ── */
  const recalcHost = useCallback(() => {
    const states = Array.from(editor.provider.awareness.getStates().entries())
    if (states.length === 0) return
    const validStates = states.filter(s => s[1].user?.name)
    setActiveUsers(validStates.map(s => ({ id: s[0], name: s[1].user.name })))
    if (validStates.length === 0) return

    const earliest = validStates.reduce((best, cur) => {
      const t = cur[1].user.joinTime ?? Infinity
      const bestT = best[1].user.joinTime ?? Infinity
      return t < bestT ? cur : best
    }, validStates[0])

    setHostClientId(earliest[0])
    setHostName(earliest[1].user?.name || "")

    if (earliest[0] === editor.provider.awareness.clientID) {
      editor.roomMap.set("host", earliest[1].user?.name)
      if (!editor.roomMap.get("roomType")) editor.roomMap.set("roomType", initialRoomType)
    }
  }, [editor.provider.awareness, editor.roomMap, initialRoomType])

  /* ── Sync Subscriptions ── */
  useEffect(() => {
    const { provider, roomMap, chatArray } = editor

    provider.on("synced", () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const isDuplicate = states.some(([clientId, state]) =>
        clientId !== provider.awareness.clientID && state.user?.name === username
      )
      if (isDuplicate) {
        onLeave(`⚠️ The username '@${username}' is already taken in this room.`)
        return
      }

      // Auto-detect room mode for joiners
      const mode = roomMap.get("roomMode")
      if (mode && mode !== "ide") {
        onLeave("This room is in Compiler mode. Please join through the correct mode.")
        return
      }
    })

    const onRoomChange = () => {
      const host = roomMap.get("host"); if (host) setHostName(host)
      const rType = roomMap.get("roomType"); if (rType) setRoomType(rType)
      const rt = roomMap.get("roomTheme"); setRoomTheme(rt ?? null)
      const rf = roomMap.get("roomFont"); setRoomFont(rf ?? null)
      const enabled = roomMap.get("chatEnabled")
      if (enabled !== undefined) setChatEnabled(enabled)
      const showUsers = roomMap.get("showUsersList")
      if (showUsers !== undefined) setShowUsersList(showUsers)
      const kicked = roomMap.get("kickedUsers") || []
      setKickedUsers(kicked)

      if (kicked.length > 0 && (kicked.includes(editor.username) || kicked.includes(editor.provider.awareness.clientID))) {
        alert("You have been removed from the room by the host.")
        onLeave()
      }
    }
    roomMap.observe(onRoomChange)
    onRoomChange()

    const onChatChange = () => setChatMessages(chatArray.toArray())
    chatArray.observe(onChatChange)
    onChatChange()

    provider.awareness.on("change", recalcHost)
    recalcHost()

    // Execution WS
    const ws = new WebSocket("ws://127.0.0.1:1236")
    ws.onopen = () => ws.send(JSON.stringify({ type: "join", roomId }))
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "run:start") {
          setRunner(data.userId)
          setOutput("Running…")
        } else if (data.type === "run:output") {
          setRunner(null)
          setOutput(data.output || "(no output)")
        } else if (data.type === "fs:changed") {
          console.log(`[IDE Room] Received fs:changed for path ${data.path}. Refreshing parent ${data.parentPath}`)
          fs.refreshPath(data.parentPath)
        }
      } catch (_) { }
    }

    return () => {
      roomMap.unobserve(onRoomChange)
      chatArray.unobserve(onChatChange)
      provider.awareness.off("change", recalcHost)
      ws.close()
    }
  }, [editor, recalcHost, roomId, onLeave, username, fs.refreshPath])


  /* ── Chat Toast ── */
  useEffect(() => {
    if (chatMessages.length === 0) return
    const newMsg = chatMessages[chatMessages.length - 1]
    if (newMsg.target !== "all" && newMsg.target !== editor.username && newMsg.sender !== editor.username) return
    if (newMsg.id !== lastToastId.current) {
      lastToastId.current = newMsg.id
      if (newMsg.type === "system") addToast(`🚀 @${newMsg.sender} ran the code`)
      else if (newMsg.type === "system_kick") addToast(`🚪 ${newMsg.text}`)
      else if (rightPanel !== "chat") addToast(`💬 @${newMsg.sender}: ${newMsg.text}`)
    }
  }, [chatMessages, rightPanel, editor.username, addToast])

  /* ── Open file in tab ── */
  const onSelectFile = useCallback((path) => {
    setActiveFile(path)
    if (path !== "__PREVIEW__" && fs.fetchFileContentToYjs) fs.fetchFileContentToYjs(path)
  }, [fs])

  const openFile = useCallback(async (path) => {
    if (!openFiles.includes(path)) setOpenFiles(prev => [...prev, path])
    setActiveFile(path)
    if (path !== "__PREVIEW__" && fs.fetchFileContentToYjs) await fs.fetchFileContentToYjs(path)
  }, [openFiles, fs])

  const closeFile = useCallback((filePath) => {
    setOpenFiles(prev => {
      const next = prev.filter(p => p !== filePath)
      if (activeFile === filePath) {
        const idx = prev.indexOf(filePath)
        const newActive = next[Math.min(idx, next.length - 1)] || null
        setActiveFile(newActive)
      }
      return next
    })
  }, [activeFile])

  /* ── Get current file's Yjs text and language extension ── */
  const activeFileEntry = activeFile ? fs.tree[activeFile] : null
  const activeLanguage = activeFileEntry?.language || "python"

  const langExt = useMemo(() => {
    const lang = LANGUAGES.find(l => l.id === activeLanguage)
    return lang?.ext ?? LANGUAGES[0].ext
  }, [activeLanguage])

  const activeYText = useMemo(() => {
    if (!activeFile) return null
    return fs.getFileText(activeFile)
  }, [activeFile, fs])

  const collabExt = useMemo(() => {
    if (!activeYText) return []
    return yCollab(activeYText, editor.provider.awareness)
  }, [activeYText, editor.provider.awareness])

  const fontExt = useMemo(() => EditorView.theme({
    "&": { fontSize: `${activeFontSize}px`, fontFamily: activeFontFamily },
    ".cm-content": { fontFamily: activeFontFamily },
  }), [activeFontSize, activeFontFamily])

  const readOnlyExt = useMemo(() => EditorState.readOnly.of(!canEdit), [canEdit])

  const extensions = useMemo(() => {
    if (!activeYText) return [langExt, fontExt, readOnlyExt]
    return [langExt, fontExt, collabExt, readOnlyExt]
  }, [langExt, fontExt, collabExt, readOnlyExt, activeYText])

  /* ── Auto-open default file ── */
  useEffect(() => {
    if (openFiles.length === 0 && fs.getAllFiles().length > 0) {
      const first = fs.getAllFiles()[0]
      if (first) openFile(first.path)
    }
  }, [fs.version, openFiles.length, fs, openFile])

  /* ── Run code (runs active file) ── */
  const runCode = useCallback(async () => {
    if (!canRun || !activeFile || !activeFileEntry) return

    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: editor.username, target: "all", text: "", type: "system", timestamp: Date.now()
    }])

    const code = activeYText?.toString() || ""
    if (!code.trim()) { addToast("⚠️ Cannot run an empty file."); return }

    try {
      // ✅ Fixed: use fs.getFileContent (returns string) instead of fs.getFileContent (was undefined)
      const allFiles = fs.getAllFiles().map(f => ({
        path: f.path,
        content: fs.getFileContent(f.path)
      }))

      setTerminalOpen(true)

      const res = await fetch("http://127.0.0.1:1236/sync-and-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          files: allFiles,
          activeFile: activeFileEntry,
          language: activeLanguage
        }),
      })

      const data = await res.json()
      if (!data.success) {
        addToast(data.error || "❌ Failed to inject command into terminal.")
      }
    } catch (_) {
      addToast("❌ Error: Could not reach the execution server.")
    }
  }, [canRun, activeFile, activeFileEntry, activeYText, roomId, activeLanguage, editor, fs, addToast])

  /* ── Sync Files (No Execution) ── */
  const syncFilesToTerminal = useCallback(async () => {
    try {
      // ✅ Fixed: use fs.getFileContent (returns string) instead of fs.getFileContent (was undefined)
      const allFiles = fs.getAllFiles().map(f => ({
        path: f.path,
        content: fs.getFileContent(f.path)
      }))

      await fetch("http://127.0.0.1:1236/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, files: allFiles })
      })
    } catch (_) {
      console.error("Failed to silently sync files to terminal")
    }
  }, [fs, roomId])


  /* ── Save Active File To Disk ── */
  const saveCode = useCallback(async () => {
    if (!activeFile || activeFile === "__PREVIEW__" || !fs.saveFileToDisk) return
    try {
      await fs.saveFileToDisk(activeFile)
      addToast(`✅ Saved ${activeFile.split("/").pop()} to disk`)
    } catch (_) {
      addToast("❌ Failed to save to disk")
    }
  }, [activeFile, fs, addToast])

  /* ── Download ── */
  const downloadCode = useCallback(async (e) => {
    e.preventDefault()
    if (!activeFile || !activeFileEntry) return
    const content = activeYText?.toString() || ""
    const fileName = activeFileEntry.name

    try {
      if (window.showSaveFilePicker) {
        const ext = fs.getExt(fileName)
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "Source Code", accept: { "text/plain": [`.${ext}`] } }]
        })
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        addToast(`✅ ${fileName} saved!`)
      } else {
        const file = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(file)
        const a = document.createElement("a"); a.href = url; a.download = fileName
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error("Save failed", err)
    }
  }, [activeFile, activeFileEntry, activeYText, fs, addToast])

  /* ── Chat actions ── */
  const sendChat = useCallback((e) => {
    e.preventDefault()
    if (!chatInput.trim() || !chatEnabled) return
    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: editor.username, target: chatTarget, text: chatInput.trim(), type: "chat", timestamp: Date.now()
    }])
    setChatInput("")
  }, [chatInput, chatEnabled, chatTarget, editor])

  const kickUser = useCallback((clientId, userName) => {
    editor.roomMap.set("kickedUsers", [...kickedUsers, clientId])
    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: "System", target: "all", text: `@${userName} was removed.`, type: "system_kick", timestamp: Date.now()
    }])
  }, [kickedUsers, editor])

  /* ── Room UI actions ── */
  const pushRoomUI = useCallback(() => {
    editor.roomMap.set("roomTheme", personalPrefs.theme)
    editor.roomMap.set("roomFont", { fontSize: personalPrefs.fontSize, fontFamily: personalPrefs.fontFamily })
  }, [editor.roomMap, personalPrefs])

  const clearRoomUI = useCallback(() => {
    editor.roomMap.delete("roomTheme")
    editor.roomMap.delete("roomFont")
  }, [editor.roomMap])

  const onToggleChatEnabled = useCallback((checked) => editor.roomMap.set("chatEnabled", checked), [editor.roomMap])
  const onToggleShowUsers = useCallback((checked) => editor.roomMap.set("showUsersList", checked), [editor.roomMap])
  const onSetRoomTheme = useCallback((value) => editor.roomMap.set("roomTheme", value), [editor.roomMap])

  /* ── Toggle right panel ── */
  const toggleRightPanel = useCallback((panel) => {
    setRightPanel(prev => prev === panel ? null : panel)
  }, [])

  /* ── Theme ── */
  const themeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0]
  const { base: cmBaseTheme, bg, header: headerBg, toolbar: toolbarBg, text: textColor, panel: panelBg, border: borderCol, input: inputBg, accent } = themeDef
  const isDark = cmBaseTheme === "dark"

  /* ── Filtered lists ── */
  const visibleChatMsgs = chatMessages.filter(m => m.target === "all" || m.target === editor.username || m.sender === editor.username)
  const visibleActiveUsersList = activeUsers.filter(u => {
    if (kickedUsers.includes(u.id) || kickedUsers.includes(u.name)) return false
    if (!showUsersList && !isHost) return u.name === hostName || u.id === editor.provider.awareness.clientID
    return true
  })

  return {
    editor, extensions, cmBaseTheme, fs,
    // Files & Tabs
    openFiles, activeFile, activeFileEntry, activeLanguage, activeYText,
    openFile, closeFile,
    // Terminal
    terminalOpen, setTerminalOpen, terminalHeight, setTerminalHeight,
    // Right panel
    rightPanel, toggleRightPanel,
    // Room state
    roomId, actualRoomType, output, runner,
    // Permissions
    isHost, canEdit, canRun, canChangeRoom,
    // Theme
    activeTheme, activeFontSize, activeFontFamily, isDark,
    bg, headerBg, toolbarBg, textColor, panelBg, borderCol, inputBg, accent,
    personalPrefs, roomTheme, roomFont,
    // UI state
    settingsOpen, setSettingsOpen,
    toasts,
    // Users
    activeUsers, visibleActiveUsersList, hostName,
    // Chat
    chatEnabled, showUsersList, visibleChatMsgs,
    chatInput, setChatInput, chatTarget, setChatTarget,
    // Actions
    runCode, syncFilesToTerminal, downloadCode, saveCode, sendChat, kickUser,
    onLeave, updatePersonalPref, pushRoomUI, clearRoomUI,
    onToggleChatEnabled, onToggleShowUsers, onSetRoomTheme,
    setOutput, addToast,
  }
}