import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { IndexeddbPersistence } from "y-indexeddb"

import { LANGUAGES, THEMES, FONT_FAMILIES, EXT_TO_LANG } from "../constants/editorConfigs"
import { loadPersonalPrefs, savePersonalPrefs } from "../utils/helpers"
import useFileSystem from "./useFileSystem"
import { WS_URL, API_URL } from "../config"

export default function useIDERoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  /* ── Yjs stable refs ── */
  const [editor] = useState(() => {
    const ydoc = new Y.Doc()

    // Persist Yjs document offline in browser 
    const persistence = new IndexeddbPersistence(`liveshare-room-${roomId}`, ydoc)

    const provider = new HocuspocusProvider({
      url: WS_URL,
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
    const userColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
    provider.awareness.setLocalStateField("user", {
      name: username,
      color: userColor,
      joinTime,
      activeFile: null
    })

    return { ydoc, provider, username, joinTime, roomMap, chatArray, userColor, persistence }
  })

  /* ── Host state & Active Users ── */
  const [activeUsers, setActiveUsers] = useState([])
  const [hostClientId, setHostClientId] = useState(null)
  const [hostName, setHostName] = useState("")
  const isHost = hostClientId === editor.provider.awareness.clientID

  /* ── Room state ── */
  const [actualRoomType, setRoomType] = useState(initialRoomType)
  const [output, setOutput] = useState("")
  const [runner, setRunner] = useState(null)

  /* canEdit: host always can; others check room type AND not individually restricted */
  const myClientId = editor.provider.awareness.clientID
  const [restrictedUsers, setRestrictedUsers] = useState([])
  const isRestricted = !isHost && restrictedUsers.includes(myClientId)
  const canEdit = !isRestricted && (isHost || actualRoomType === "collaborative" || actualRoomType === "interview")
  const canRun = !isRestricted && (isHost || actualRoomType === "collaborative" || actualRoomType === "interview")
  const canChangeRoom = isHost

  /* ── File System ── */
  const fs = useFileSystem(editor.ydoc, editor.provider, isCreating, roomId, isHost)

  /* ── Open Files & Tabs ── */
  const [openFiles, setOpenFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)

  /* ── Terminal ── */
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalHeight, setTerminalHeight] = useState(200)

  /* ── Right Panel: 'chat' | 'extensions' | null ── */
  const [rightPanel, setRightPanel] = useState(null)

  /* ── Preview Panel ── */
  const [previewOpen, setPreviewOpen] = useState(false)

  /* ── Video Call State ── */
  const [callActive, setCallActive] = useState(false)
  const [peerId, setPeerId] = useState(null)

  /* ── Chat & Moderation ── */
  const [showUsersList, setShowUsersList] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatTarget, setChatTarget] = useState("all")
  const [chatEnabled, setChatEnabled] = useState(true)
  const [kickedUsers, setKickedUsers] = useState([])
  const [toasts, setToasts] = useState([])
  const [interviewTime, setInterviewTime] = useState(0) // Shared timer
  const [isSyncingFile, setIsSyncingFile] = useState(false)
  const [isPersistenceSynced, setIsPersistenceSynced] = useState(false)
  const lastToastId = useRef(null)

  const addToast = useCallback((msgText) => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text: msgText }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  /* ── Version Control (Git) State ── */
  const [gitStatus, setGitStatus] = useState(null) // { isRepo, modified, staged, etc }
  const [isGitLoading, setIsGitLoading] = useState(false)

  const refreshGitStatus = useCallback(async () => {
    setIsGitLoading(true)
    try {
      const res = await fetch(`${API_URL}/git/status?roomId=${roomId}`)
      const data = await res.json()
      setGitStatus(data)
    } catch (err) {
      console.error("Git Status Error:", err)
    } finally {
      setIsGitLoading(false)
    }
  }, [roomId])

  // Refresh git status periodically or when files change significantly
  useEffect(() => {
    refreshGitStatus()
    const interval = setInterval(refreshGitStatus, 15000) // Every 15s
    return () => clearInterval(interval)
  }, [refreshGitStatus])

  /* ── Personal UI ── */
  const [personalPrefs, setPersonalPrefs] = useState(() => {
    const p = loadPersonalPrefs()
    return { theme: p.theme || "dark", fontSize: p.fontSize || 14, fontFamily: p.fontFamily || "monospace", cursor: p.cursor || "text" }
  })
  const updatePersonalPref = useCallback((key, value) => {
    setPersonalPrefs(prev => { const next = { ...prev, [key]: value }; savePersonalPrefs(next); return next })
  }, [])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
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
    
    // Check initial persistence sync
    if (editor.persistence.synced) setIsPersistenceSynced(true)
    editor.persistence.on("synced", () => setIsPersistenceSynced(true))

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
    setActiveUsers(validStates.map(s => ({
      id: s[0],
      name: s[1].user.name,
      color: s[1].user.color || "#89b4fa",
      activeFile: s[1].user.activeFile || null,
      peerId: s[1].user.peerId || null
    })))
    if (validStates.length === 0) return

    const earliest = validStates.reduce((best, cur) => {
      const t = cur[1].user.joinTime ?? Infinity
      const bestT = best[1].user.joinTime ?? Infinity
      if (t === bestT) return cur[0] < best[0] ? cur : best
      return t < bestT ? cur : best
    }, validStates[0])

    setHostClientId(earliest[0])
    setHostName(earliest[1].user?.name || "")

    if (earliest[0] === editor.provider.awareness.clientID) {
      editor.roomMap.set("host", earliest[1].user?.name)
      if (!editor.roomMap.get("roomType")) editor.roomMap.set("roomType", initialRoomType)
      if (editor.roomMap.get("roomMode") !== "ide") editor.roomMap.set("roomMode", "ide")
      // Start interview timer if not started
      if (initialRoomType === "interview" && !editor.roomMap.get("interviewStart")) {
        editor.roomMap.set("interviewStart", Date.now())
      }
    }
  }, [editor.provider.awareness, editor.roomMap, initialRoomType])

  /* ── Sync Subscriptions ── */
  useEffect(() => {
    const { provider, roomMap, chatArray } = editor

    provider.on("synced", () => {


      // Auto-detect room mode for joiners
      const mode = roomMap.get("roomMode")
      if (mode && mode !== "ide" && !isHost) {
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

      const restricted = roomMap.get("restrictedUsers") || []
      setRestrictedUsers(restricted)

      if (kicked.length > 0 && !isHost && (kicked.includes(editor.username) || kicked.includes(editor.provider.awareness.clientID))) {
        alert("You have been removed from the room by the host.")
        onLeave()
      }
    }
    roomMap.observe(onRoomChange)
    onRoomChange()

    const onChatChange = () => setChatMessages(chatArray.toArray())
    chatArray.observe(onChatChange)
    onChatChange()

    const onAwarenessChange = () => {
      recalcHost()

      const states = Array.from(provider.awareness.getStates().entries())
      const myId = provider.awareness.clientID
      
      const isDuplicate = states.some(([id, state]) => {
        if (id === myId) return false
        if (state.user?.name !== editor.username) return false
        
        const otherJoin = state.user?.joinTime ?? Infinity
        const myJoin = editor.joinTime ?? Infinity
        return otherJoin < myJoin || (otherJoin === myJoin && id < myId)
      })

      if (isDuplicate) {
         onLeave(`⚠️ The username '@${editor.username}' is already taken in this room. Please choose a different name.`)
      }
    }

    provider.awareness.on("change", onAwarenessChange)
    recalcHost()

    // Execution WS
    const ws = new WebSocket(`${API_URL.replace("http","ws")}`)
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


    // 🕒 Shared Interview Timer Update
    const timerInterval = setInterval(() => {
      const start = roomMap.get("interviewStart")
      const currentType = roomMap.get("roomType")
      if (start && currentType === "interview") {
        setInterviewTime(Math.floor((Date.now() - start) / 1000))
      }
    }, 1000)

    return () => {
      clearInterval(timerInterval)
      roomMap.unobserve(onRoomChange)
      chatArray.unobserve(onChatChange)
      provider.awareness.off("change", recalcHost)
      ws.close()
    }
  }, [editor, recalcHost, roomId, onLeave, username, fs.refreshPath])


  /* ── Broadcast Active File ── */
  useEffect(() => {
    const { provider } = editor
    const state = provider.awareness.getLocalState()
    if (state && state.user) {
      provider.awareness.setLocalStateField("user", {
        ...state.user,
        activeFile,
        peerId
      })
    }
  }, [activeFile, peerId, editor])

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
    if (fs.fetchFileContentToYjs) fs.fetchFileContentToYjs(path)
  }, [fs])

  const openFile = useCallback(async (path) => {
    if (!path) return
    setIsSyncingFile(true)
    try {
      if (!openFiles.includes(path)) setOpenFiles(prev => [...prev, path])
      if (fs.fetchFileContentToYjs) await fs.fetchFileContentToYjs(path)
      setActiveFile(path)
    } finally {
      setIsSyncingFile(false)
    }
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
  const activeFileEntry = useMemo(() => {
    if (!activeFile) return null
    // fs.tree maps parentPath → children array, so search all entries
    for (const children of Object.values(fs.tree)) {
      const found = children.find(c => c.path === activeFile)
      if (found) return found
    }
    // Fallback: construct a minimal entry from the path
    const name = activeFile.split("/").pop()
    const ext = name.split(".").pop()
    return { path: activeFile, name, type: "file", language: EXT_TO_LANG[ext] || "python" }
  }, [activeFile, fs.tree])
  const activeLanguage = activeFileEntry?.language || "python"

  const activeYText = useMemo(() => {
    if (!activeFile) return null
    return fs.getFileText(activeFile)
  }, [activeFile, fs])

  const bindingRef = useRef(null)

  const onEditorMount = useCallback((monacoEditor, monaco) => {
    if (!activeFile || !editor.provider.awareness || !activeYText) return

    if (bindingRef.current) {
      bindingRef.current.destroy()
    }

    bindingRef.current = new MonacoBinding(
      activeYText,
      monacoEditor.getModel(),
      new Set([monacoEditor]),
      editor.provider.awareness
    )

  }, [activeFile, activeYText, editor.provider.awareness])

  /* Cleanup binding when active file changes or unmounts */
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy()
        bindingRef.current = null
      }
    }
  }, [activeFile])

  /* ── Theme ── */
  const themeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0]
  const { base: cmBaseTheme, bg, header: headerBg, toolbar: toolbarBg, text: textColor, panel: panelBg, border: borderCol, input: inputBg, accent } = themeDef
  const isDark = cmBaseTheme === "dark"

  const monacoTheme = isDark ? "vs-dark" : "light"
  const monacoOptions = useMemo(() => ({
    fontSize: activeFontSize,
    fontFamily: activeFontFamily,
    readOnly: !canEdit,
    minimap: { enabled: false },
    automaticLayout: true,
  }), [activeFontSize, activeFontFamily, canEdit])

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

    // Intercept Heavy ML Workloads
    if (activeLanguage === "python" && (code.includes("import tensorflow") || code.includes("from tensorflow"))) {
      const proceed = window.confirm(
        "⚠️ Heavy Compute Detected!\n\n" +
        "It looks like you are importing TensorFlow. Running machine learning models on our cloud CPUs may crash the room and terminate your session.\n\n" +
        "INSTRUCTIONS FOR LOCAL GPU:\n" +
        `1. Open your computer's terminal (not this web terminal).\n` +
        `2. Run this command: npx liveshare-agent connect --room ${roomId}\n` +
        "3. Your web IDE will now use your local hardware!\n\n" +
        "(Note: Local Agent is currently in Beta)\n\n" +
        "Are you absolutely sure you want to run this code on the cloud?"
      )
      if (!proceed) return
    }

    try {
      // ✅ Fixed: use fs.getFileContent (returns string) instead of fs.getFileContent (was undefined)
      const allFiles = fs.getAllFiles().map(f => ({
        path: f.path,
        content: fs.getFileContent(f.path)
      }))

      setTerminalOpen(true)

      const res = await fetch(`${API_URL}/sync-and-run`, {
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

      await fetch(`${API_URL}/sync`, {
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
    if (!activeFile || !fs.saveFileToDisk) return
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
        const ext = fileName.split(".").pop()
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
    if (e && e.preventDefault) e.preventDefault()
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

  const restrictUser = useCallback((clientId, userName) => {
    if (!restrictedUsers.includes(clientId)) {
      editor.roomMap.set("restrictedUsers", [...restrictedUsers, clientId])
      editor.chatArray.push([{
        id: Date.now().toString() + Math.random(),
        sender: "System", target: "all",
        text: `@${userName}'s edit access was revoked.`, type: "system_kick", timestamp: Date.now()
      }])
    }
  }, [restrictedUsers, editor])

  const unrestrictUser = useCallback((clientId, userName) => {
    editor.roomMap.set("restrictedUsers", restrictedUsers.filter(id => id !== clientId))
    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: "System", target: "all",
      text: `@${userName}'s edit access was restored.`, type: "system_kick", timestamp: Date.now()
    }])
  }, [restrictedUsers, editor])

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


  /* ── Filtered lists ── */
  const visibleChatMsgs = chatMessages.filter(m => m.target === "all" || m.target === editor.username || m.sender === editor.username)
  const visibleActiveUsersList = activeUsers.filter(u => {
    if (kickedUsers.includes(u.id) || kickedUsers.includes(u.name)) return false
    if (!showUsersList && !isHost) return u.name === hostName || u.id === editor.provider.awareness.clientID
    return true
  })

  return {
    editor, onEditorMount, monacoTheme, monacoOptions, fs,
    // Files & Tabs
    openFiles, activeFile, activeFileEntry, activeLanguage, activeYText,
    openFile, closeFile,
    // Terminal
    terminalOpen, setTerminalOpen, terminalHeight, setTerminalHeight,
    // Right panel
    rightPanel, toggleRightPanel,
    previewOpen, setPreviewOpen,
    // Room state
    roomId, actualRoomType, output, runner,
    // Permissions
    isHost, canEdit, canRun, canChangeRoom,
    // Theme
    activeTheme, activeFontSize, activeFontFamily, isDark,
    bg, headerBg, toolbarBg, textColor, panelBg, borderCol, inputBg, accent,
    personalPrefs, roomTheme, roomFont,
    // Interview
    interviewTime,
    // Navigation / Sync
    isSyncingFile,
    isPersistenceSynced,
    // UI state
    settingsOpen, setSettingsOpen,
    exitConfirmOpen, setExitConfirmOpen,
    callActive, setCallActive,
    peerId, setPeerId,
    toasts,
    // Users
    activeUsers, visibleActiveUsersList, hostName, restrictedUsers,
    // Chat
    chatEnabled, showUsersList, visibleChatMsgs,
    chatInput, setChatInput, chatTarget, setChatTarget,
    // Actions
    runCode, syncFilesToTerminal, downloadCode, saveCode, sendChat, kickUser, restrictUser, unrestrictUser,
    onLeave, updatePersonalPref, pushRoomUI, clearRoomUI,
    onToggleChatEnabled, onToggleShowUsers, onSetRoomTheme,
    setOutput, addToast, gitStatus, isGitLoading, refreshGitStatus
  }
}