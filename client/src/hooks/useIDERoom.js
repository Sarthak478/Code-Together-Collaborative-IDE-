import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { IndexeddbPersistence } from "y-indexeddb"

import { LANGUAGES, THEMES, FONT_FAMILIES, EXT_TO_LANG } from "../constants/editorConfigs"
import { loadPersonalPrefs, savePersonalPrefs } from "../utils/helpers"
import useFileSystem from "./useFileSystem"
import { WS_URL, API_URL, COLLAB_URL } from "../config"

const LOCAL_AGENT_TRIGGERS = [
  "import tensorflow",
  "from tensorflow",
  "import torch",
  "from torch",
  "import transformers",
  "from transformers",
  "import sklearn",
  "from sklearn",
  "import cv2",
  "from cv2",
  "import llama_cpp",
  "from llama_cpp",
  "import keras",
  "from keras",
]

const hasLocalComputeTrigger = (language, code) => {
  if (language !== "python") return false
  const normalized = code.toLowerCase()
  return LOCAL_AGENT_TRIGGERS.some(trigger => normalized.includes(trigger))
}

const getLocalAgentBootstrapCommand = (pythonCommand, roomId) => {
  const serverUrl = API_URL.replace(/\/$/, "")
  const scriptUrl = `${serverUrl}/local-agent.py`
  const escapePythonString = (value) => String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")
  const bootstrap = [
    "import pathlib,tempfile,urllib.request,runpy,sys",
    "p=pathlib.Path(tempfile.gettempdir())/'liveshare-agent.py'",
    `urllib.request.urlretrieve('${escapePythonString(scriptUrl)}', p)`,
    `sys.argv=['liveshare-agent.py','--room','${escapePythonString(roomId)}','--server','${escapePythonString(serverUrl)}']`,
    "runpy.run_path(str(p), run_name='__main__')"
  ].join("; ")

  return `${pythonCommand} -c "${bootstrap}"`
}

const getLocalAgentFallbackText = (roomId) => [
  "Use one of these commands in your own terminal. No npm install or pip package is required.",
  "",
  getLocalAgentBootstrapCommand("py -3", roomId),
  "",
  getLocalAgentBootstrapCommand("python3", roomId),
  "",
  getLocalAgentBootstrapCommand("python", roomId),
].join("\n")

const getLocalAgentCommandOptions = (roomId) => ([
  {
    id: "windows-python",
    title: "Windows Python Launcher",
    description: "Best for Windows users who have the py launcher installed.",
    command: getLocalAgentBootstrapCommand("py -3", roomId),
  },
  {
    id: "python3",
    title: "Python 3",
    description: "Best for macOS, Linux, and many Python-first setups.",
    command: getLocalAgentBootstrapCommand("python3", roomId),
  },
  {
    id: "python",
    title: "Python",
    description: "Use this if your system exposes Python as python.",
    command: getLocalAgentBootstrapCommand("python", roomId),
  },
])

export default function useIDERoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  /* ── Yjs stable refs ── */
  const [editor] = useState(() => {
    const ydoc = new Y.Doc()

    // Persist Yjs document offline in browser 
    const persistence = new IndexeddbPersistence(`liveshare-room-${roomId}`, ydoc)

    const hostToken = localStorage.getItem(`host_${roomId}`) || "";
    const authUrl = `${WS_URL}?username=${encodeURIComponent(username)}&hostToken=${encodeURIComponent(hostToken)}`;

    const provider = new HocuspocusProvider({
      url: authUrl,
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
  const isHost = !!localStorage.getItem(`host_${roomId}`)
  const [hostName, setHostName] = useState("")

  /* ── Room state ── */
  const [actualRoomType, setRoomType] = useState(initialRoomType)
  const [output, setOutput] = useState("")
  const [runner, setRunner] = useState(null)
  const [gitStatus, setGitStatus] = useState(null)
  const [isGitLoading, setIsGitLoading] = useState(false)

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
  const [localAgentPrompt, setLocalAgentPrompt] = useState({
    open: false,
    fileName: "",
    language: "python"
  })
  const [localAgentStatus, setLocalAgentStatus] = useState({
    checking: false,
    connected: false,
    agents: [],
    error: ""
  })
  const lastToastId = useRef(null)

  const refreshGitStatus = useCallback(async () => {
    if (!roomId) return

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

  const addToast = useCallback((msgText) => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text: msgText }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const localAgentCommands = useMemo(() => getLocalAgentCommandOptions(roomId), [roomId])

  const refreshLocalAgentStatus = useCallback(async () => {
    if (!roomId) return

    setLocalAgentStatus(prev => ({ ...prev, checking: true, error: "" }))
    try {
      const res = await fetch(`${API_URL}/local-agent/status?roomId=${encodeURIComponent(roomId)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Local Agent status is unavailable.")
      }

      setLocalAgentStatus({
        checking: false,
        connected: !!data.connected,
        agents: Array.isArray(data.agents) ? data.agents : [],
        error: ""
      })
    } catch (err) {
      setLocalAgentStatus({
        checking: false,
        connected: false,
        agents: [],
        error: err.message || "Could not reach the Local Agent status endpoint."
      })
    }
  }, [roomId])

  const closeLocalAgentPrompt = useCallback(() => {
    setLocalAgentPrompt(prev => ({ ...prev, open: false }))
  }, [])

  const copyLocalAgentCommand = useCallback(async (command, successMessage = "Local Agent command copied.") => {
    try {
      await navigator.clipboard?.writeText(command)
      addToast(successMessage)
    } catch (_err) {
      addToast("Unable to copy automatically. You can still copy it from the dialog.")
    }
  }, [addToast])

  const openLocalAgent = useCallback(async () => {
    await copyLocalAgentCommand(
      localAgentCommands[0]?.command || getLocalAgentFallbackText(roomId),
      "Local Agent starter command copied."
    )
    refreshLocalAgentStatus()
  }, [copyLocalAgentCommand, localAgentCommands, refreshLocalAgentStatus, roomId])

  useEffect(() => {
    if (!localAgentPrompt.open) return

    refreshLocalAgentStatus()
    const timer = setInterval(() => {
      refreshLocalAgentStatus()
    }, 2500)

    return () => clearInterval(timer)
  }, [localAgentPrompt.open, refreshLocalAgentStatus])

  /* ── Personal UI ── */
  const [personalPrefs, setPersonalPrefs] = useState(() => {
    const p = loadPersonalPrefs()
    return {
      ...p,
      theme: p.theme || "dark",
      fontSize: p.fontSize || 14,
      fontFamily: p.fontFamily || "monospace",
      cursor: p.cursor || "text"
    }
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

  useEffect(() => {
    refreshGitStatus()
  }, [refreshGitStatus])

  useEffect(() => {
    if (isHost && editor.roomMap) {
      editor.roomMap.set("host", editor.username)
      if (!editor.roomMap.get("roomType")) editor.roomMap.set("roomType", initialRoomType)
      if (editor.roomMap.get("roomMode") !== "ide") editor.roomMap.set("roomMode", "ide")
      // Start interview timer if not started
      if (initialRoomType === "interview" && !editor.roomMap.get("interviewStart")) {
        editor.roomMap.set("interviewStart", Date.now())
      }
    }
  }, [isHost, editor.roomMap, initialRoomType, editor.username])

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
  }, [editor.provider.awareness])

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
    }

    provider.awareness.on("change", onAwarenessChange)
    recalcHost()

    // Execution WS
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${API_URL.replace(/^https?:/, wsProtocol)}/execution`)
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
          if (data.eventType === "change" || data.eventType === "add") {
            fs.reloadFileContentFromDisk?.(data.path)
          }
          if (data.eventType === "unlink") {
            const ytext = fs.getFileText?.(data.path)
            if (ytext && ytext.length > 0) {
              editor.ydoc.transact(() => {
                ytext.delete(0, ytext.length)
              })
            }
          }
        }
      } catch (_err) { /* ignored */ }
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
  }, [editor, recalcHost, roomId, onLeave, username, fs, isHost])


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

  const onEditorMount = useCallback((monacoEditor, _monaco) => {
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
  const runCode = useCallback(async ({ bypassLocalAgentPrompt = false } = {}) => {
    if (!canRun || !activeFile || !activeFileEntry) return

    const code = activeYText?.toString() || ""
    if (!bypassLocalAgentPrompt && hasLocalComputeTrigger(activeLanguage, code)) {
      setLocalAgentPrompt({
        open: true,
        fileName: activeFileEntry.name,
        language: activeLanguage
      })
      return
    }
    if (!code.trim()) { addToast("⚠️ Cannot run an empty file."); return }

    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: editor.username, target: "all", text: "", type: "system", timestamp: Date.now()
    }])

    if (activeLanguage === "html" || activeLanguage === "markdown") {
      setPreviewOpen(true)
      setTerminalOpen(false)
      addToast(`📺 ${activeFileEntry.name} is now in Live Preview`)
      return
    }
    
    // For frontend files (React, Vue, etc), also show preview option
    const frontendExtensions = ["jsx", "tsx", "vue", "svelte", "astro"]
    if (frontendExtensions.some(ext => activeLanguage?.includes(ext))) {
      setTerminalOpen(true)
      addToast(`⌨️ Running ${activeLanguage} file in Terminal`)
    } else {
      // For backend files (Python, Node, etc), open terminal
      setTerminalOpen(true)
      addToast(`⌨️ Running ${activeLanguage} file in Terminal`)
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
    } catch (_err) {
      addToast("❌ Error: Could not reach the execution server.")
    }
  }, [canRun, activeFile, activeFileEntry, activeYText, roomId, activeLanguage, editor, fs, addToast])

  /* ── Sync Files (No Execution) ── */
  const continueRunInCloud = useCallback(async () => {
    closeLocalAgentPrompt()
    await runCode({ bypassLocalAgentPrompt: true })
  }, [closeLocalAgentPrompt, runCode])

  const runOnLocalAgent = useCallback(async () => {
    if (!canRun || !activeFile || !activeFileEntry) return

    const code = activeYText?.toString() || ""
    if (!code.trim()) {
      addToast("Cannot run an empty file.")
      return
    }

    try {
      const allFiles = fs.getAllFiles().map(f => ({
        path: f.path,
        content: fs.getFileContent(f.path)
      }))

      setTerminalOpen(true)

      const res = await fetch(`${API_URL}/local-agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId: editor.username,
          files: allFiles,
          activeFile: activeFileEntry,
          language: activeLanguage
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        addToast(data.error || "Start the Local Agent command first, then try again.")
        refreshLocalAgentStatus()
        return
      }

      closeLocalAgentPrompt()
      addToast("Queued on your Local Agent. Keep that terminal open.")
    } catch (_err) {
      addToast("Could not reach the Local Agent coordinator.")
    }
  }, [canRun, activeFile, activeFileEntry, activeYText, fs, roomId, editor.username, activeLanguage, addToast, closeLocalAgentPrompt, refreshLocalAgentStatus])

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
    } catch (_err) {
      console.error("Failed to silently sync files to terminal")
    }
  }, [fs, roomId])

  const toggleTerminal = useCallback(() => {
    setTerminalOpen(prev => {
      const next = !prev
      if (next) {
        setTimeout(() => {
          syncFilesToTerminal()
        }, 0)
      }
      return next
    })
  }, [syncFilesToTerminal])


  /* ── Save Active File To Disk ── */
  const saveCode = useCallback(async () => {
    if (!activeFile || !fs.saveFileToDisk) return
    try {
      await fs.saveFileToDisk(activeFile)
      addToast(`✅ Saved ${activeFile.split("/").pop()} to disk`)
    } catch (_err) {
      addToast("❌ Failed to save to disk")
    }
  }, [activeFile, fs, addToast])

  const refreshWorkspaceFromDisk = useCallback(async () => {
    const loadedPaths = Object.keys(fs.tree || {})
    const pathsToRefresh = Array.from(new Set(["/", ...loadedPaths]))
    const filePathsToReload = Array.from(
      new Set([
        ...openFiles,
        ...fs.getAllFiles().map(file => file.path)
      ])
    )

    pathsToRefresh.forEach((path) => fs.refreshPath(path))

    await Promise.all(
      filePathsToReload.map((filePath) => fs.reloadFileContentFromDisk?.(filePath))
    )
  }, [fs, openFiles])

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
  }, [activeFile, activeFileEntry, activeYText, addToast])

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

    const hostToken = localStorage.getItem(`host_${roomId}`);
    if (hostToken) {
      fetch(`${COLLAB_URL}/room/${roomId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken, username: userName })
      }).catch(console.error);
    }
  }, [kickedUsers, editor, roomId])

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

  return useMemo(() => ({
    editor, onEditorMount, monacoTheme, monacoOptions, fs,
    // Files & Tabs
    openFiles, activeFile, activeFileEntry, activeLanguage, activeYText,
    openFile, closeFile,
    // Terminal
    terminalOpen, setTerminalOpen, terminalHeight, setTerminalHeight, toggleTerminal,
    // Right panel
    rightPanel, toggleRightPanel,
    previewOpen, setPreviewOpen,
    // Room state
    roomId, actualRoomType, output, runner,
    gitStatus, isGitLoading,
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
    localAgentPrompt,
    localAgentCommands,
    localAgentStatus,
    // Users
    activeUsers, visibleActiveUsersList, hostName, restrictedUsers,
    // Chat
    chatEnabled, showUsersList, visibleChatMsgs,
    chatInput, setChatInput, chatTarget, setChatTarget,
    // Actions
    runCode, syncFilesToTerminal, downloadCode, saveCode, sendChat, kickUser, restrictUser, unrestrictUser,
    refreshGitStatus,
    refreshWorkspaceFromDisk,
    closeLocalAgentPrompt, copyLocalAgentCommand, openLocalAgent, continueRunInCloud, runOnLocalAgent, refreshLocalAgentStatus,
    onLeave, updatePersonalPref, pushRoomUI, clearRoomUI,
    onToggleChatEnabled, onToggleShowUsers, onSetRoomTheme,
    setOutput, addToast
  }), [
    editor, onEditorMount, monacoTheme, monacoOptions, fs,
    openFiles, activeFile, activeFileEntry, activeLanguage, activeYText,
    openFile, closeFile,
    terminalOpen, terminalHeight, toggleTerminal,
    rightPanel, toggleRightPanel,
    previewOpen,
    roomId, actualRoomType, output, runner,
    gitStatus, isGitLoading,
    isHost, canEdit, canRun, canChangeRoom,
    activeTheme, activeFontSize, activeFontFamily, isDark,
    bg, headerBg, toolbarBg, textColor, panelBg, borderCol, inputBg, accent,
    personalPrefs, roomTheme, roomFont,
    interviewTime,
    isSyncingFile,
    isPersistenceSynced,
    settingsOpen,
    exitConfirmOpen,
    callActive,
    peerId,
    toasts,
    localAgentPrompt,
    localAgentCommands,
    localAgentStatus,
    activeUsers, visibleActiveUsersList, hostName, restrictedUsers,
    chatEnabled, showUsersList, visibleChatMsgs,
    chatInput, chatTarget,
    runCode, syncFilesToTerminal, downloadCode, saveCode, sendChat, kickUser, restrictUser, unrestrictUser,
    refreshGitStatus,
    refreshWorkspaceFromDisk,
    closeLocalAgentPrompt, copyLocalAgentCommand, openLocalAgent, continueRunInCloud, runOnLocalAgent, refreshLocalAgentStatus,
    onLeave, updatePersonalPref, pushRoomUI, clearRoomUI,
    onToggleChatEnabled, onToggleShowUsers, onSetRoomTheme,
    addToast
  ])
}
