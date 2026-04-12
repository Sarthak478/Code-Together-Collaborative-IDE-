import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"

import { LANGUAGES, THEMES, FONT_FAMILIES, CURSORS } from "../constants/editorConfigs"
import { loadPersonalPrefs, savePersonalPrefs } from "../utils/helpers"
import { WS_URL, API_URL } from "../config"

/* ─── useEditorRoom Hook ────────────────────────────────────────── */
export default function useEditorRoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  /* ── Yjs stable refs ── */
  const [editor] = useState(() => {
    const ydoc = new Y.Doc()
    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: roomId,
      document: ydoc,
    })
    const ytext = ydoc.getText("codemirror")
    const roomMap = ydoc.getMap("room")
    const chatArray = ydoc.getArray("chat")

    if (isCreating) {
      roomMap.set("roomType", initialRoomType)
    }

    const joinTime = Date.now()

      provider.awareness.setLocalStateField("user", {
        name: username,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
        joinTime,
        peerId: null
      })

    return { ydoc, provider, username, joinTime, ytext, roomMap, chatArray }
  })

  /* ── Execution API WebSocket ── */
  const [output, setOutput] = useState("")
  const [runner, setRunner] = useState(null)

  /* ── Room state ── */
  const [language, setLanguage] = useState("python")
  const [roomTheme, setRoomTheme] = useState(null)
  const [roomFont, setRoomFont] = useState(null)
  const [actualRoomType, setRoomType] = useState(initialRoomType)

  /* ── Chat & Moderation State ── */
  const [chatOpen, setChatOpen] = useState(false)
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false)
  const [showUsersList, setShowUsersList] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatTarget, setChatTarget] = useState("all")
  const [chatEnabled, setChatEnabled] = useState(true)
  const [kickedUsers, setKickedUsers] = useState([])
  const [toasts, setToasts] = useState([])
  const [callActive, setCallActive] = useState(false)
  const [peerId, setPeerId] = useState(null)
  const [rightPanel, setRightPanel] = useState(null)
  const [interviewTime, setInterviewTime] = useState(0) // Shared timer
  const lastToastId = useRef(null)

  const addToast = useCallback((msgText) => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text: msgText }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  /* ── Version Control (Git) State ── */
  const [gitStatus, setGitStatus] = useState(null)
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

  useEffect(() => {
    refreshGitStatus()
    const interval = setInterval(refreshGitStatus, 15000)
    return () => clearInterval(interval)
  }, [refreshGitStatus])

  const toggleRightPanel = useCallback((panel) => {
    setRightPanel(prev => prev === panel ? null : panel)
  }, [])

  /* ── Host state & Active Users ── */
  const [activeUsers, setActiveUsers] = useState([])
  const [hostClientId, setHostClientId] = useState(null)
  const [hostName, setHostName] = useState("")
  const isHost = hostClientId === editor.provider.awareness.clientID

  /* ── Permissions check ── */
  const canEdit = isHost || actualRoomType !== "broadcast"
  const canRun = isHost || actualRoomType !== "broadcast"
  const canChangeLanguage = isHost || actualRoomType === "interview"
  const canChangeRoom = isHost

  /* ── Personal UI refs ── */
  const [personalPrefs, setPersonalPrefs] = useState(() => {
    const p = loadPersonalPrefs()
    return { theme: p.theme || "dark", fontSize: p.fontSize || 14, fontFamily: p.fontFamily || "monospace", cursor: p.cursor || "text" }
  })
  const updatePersonalPref = useCallback((key, value) => {
    setPersonalPrefs(prev => { const next = { ...prev, [key]: value }; savePersonalPrefs(next); return next })
  }, [])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const activeTheme = roomTheme ?? personalPrefs.theme
  const activeFontSize = roomFont?.fontSize ?? personalPrefs.fontSize
  const activeFontFamily = roomFont?.fontFamily ?? personalPrefs.fontFamily

  useEffect(() => {
    const { provider } = editor
    const state = provider.awareness.getLocalState()
    if (state && state.user) {
      provider.awareness.setLocalStateField("user", {
        ...state.user,
        peerId
      })
    }
  }, [peerId, editor])

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

  /* ── Host transfer & Users ── */
  const recalcHost = useCallback(() => {
    const states = Array.from(editor.provider.awareness.getStates().entries())
    if (states.length === 0) return

    const validStates = states.filter(s => s[1].user?.name)
    setActiveUsers(validStates.map(s => ({ 
      id: s[0], 
      name: s[1].user.name,
      peerId: s[1].user.peerId || null
    })))

    if (validStates.length === 0) return

    const earliest = validStates.reduce((best, cur) => {
      const t = cur[1].user.joinTime ?? Infinity
      const bestT = best[1].user.joinTime ?? Infinity
      if (t === bestT) return cur[0] < best[0] ? cur : best
      return t < bestT ? cur : best
    }, validStates[0])

    const hostId = earliest[0]
    const hostUser = earliest[1].user?.name
    if (!hostUser) return

    setHostClientId(hostId)
    setHostName(hostUser)

    if (hostId === editor.provider.awareness.clientID) {
      editor.roomMap.set("host", hostUser)
      if (!editor.roomMap.get("roomType")) editor.roomMap.set("roomType", initialRoomType)
      // Start interview timer if not started
      if (initialRoomType === "interview" && !editor.roomMap.get("interviewStart")) {
        editor.roomMap.set("interviewStart", Date.now())
      }
    }
  }, [editor.provider.awareness, editor.roomMap, initialRoomType])

  /* ── Sync Subscriptions ── */
  useEffect(() => {
    const { provider, ytext, roomMap, chatArray } = editor

    provider.on("synced", () => {
      const states = Array.from(provider.awareness.getStates().entries())

    })

    const onRoomChange = () => {
      const lang = roomMap.get("language"); if (lang) setLanguage(lang)
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

    const onChatChange = () => {
      const msgs = chatArray.toArray()
      setChatMessages(msgs)
    }
    chatArray.observe(onChatChange)
    onChatChange()

    const onAwarenessChange = () => {
      recalcHost()

      const states = Array.from(provider.awareness.getStates().entries())
      const myId = provider.awareness.clientID
      
      const isDuplicate = states.some(([id, state]) => {
        if (id === myId) return false
        if (state.user?.name !== username) return false
        
        const otherJoin = state.user?.joinTime ?? Infinity
        const myJoin = editor.joinTime ?? Infinity
        return otherJoin < myJoin || (otherJoin === myJoin && id < myId)
      })

      if (isDuplicate) {
         onLeave(`⚠️ The username '@${username}' is already taken in this room. Please choose a different name.`)
      }
    }

    provider.awareness.on("change", onAwarenessChange)
    recalcHost()

    const ws = new WebSocket(API_URL.replace("http", "ws"))
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
        }
      } catch (_e) { }
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
  }, [editor, recalcHost, roomId, onLeave, username])

  /* ── Language Snippet Effect ── */
  useEffect(() => {
    const { ytext, ydoc } = editor
    const langObj = LANGUAGES.find(l => l.id === language)
    if (!langObj) return

    const timeout = setTimeout(() => {
      const currentCode = ytext.toString()
      const isDefault = currentCode === "" || LANGUAGES.some(l => l.snippet === currentCode)

      if (isDefault && currentCode !== langObj.snippet) {
        ydoc.transact(() => {
          ytext.delete(0, ytext.length)
          ytext.insert(0, langObj.snippet)
        })
      }
    }, 50)

    return () => clearTimeout(timeout)
  }, [language, editor])

  /* ── Chat Toast Effect ── */
  useEffect(() => {
    if (chatMessages.length === 0) return
    const newMsg = chatMessages[chatMessages.length - 1]

    if (newMsg.target !== "all" && newMsg.target !== editor.username && newMsg.sender !== editor.username) return;

    if (newMsg.id !== lastToastId.current) {
      lastToastId.current = newMsg.id

      if (newMsg.type === "system") {
        addToast(`🚀 @${newMsg.sender} ran the code`)
      } else if (newMsg.type === "system_kick") {
        addToast(`🚪 ${newMsg.text}`)
      } else if (!chatOpen) {
        addToast(`💬 @${newMsg.sender}: ${newMsg.text}`)
      }
    }
  }, [chatMessages, chatOpen, editor.username, addToast])

  /* ── Chat Actions ── */
  const sendChat = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!chatInput.trim() || !chatEnabled) return
    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: editor.username,
      target: chatTarget,
      text: chatInput.trim(),
      type: "chat",
      timestamp: Date.now()
    }])
    setChatInput("")
  }, [chatInput, chatEnabled, chatTarget, editor.chatArray, editor.username])

  /* ── Moderation Actions ── */
  const kickUser = useCallback((clientId, userName) => {
    editor.roomMap.set("kickedUsers", [...kickedUsers, clientId])
    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: "System",
      target: "all",
      text: `@${userName} was removed from the room.`,
      type: "system_kick",
      timestamp: Date.now()
    }])
  }, [kickedUsers, editor.roomMap, editor.chatArray])

  /* ── Download code ── */
  const downloadCode = useCallback(async (e) => {
    e.preventDefault()
    const extMap = { python: "py", javascript: "js", typescript: "ts", cpp: "cpp", java: "java", rust: "rs", go: "go", html: "html", sql: "sql", markdown: "md" }
    const ext = extMap[language] || "txt"
    const content = editor.ytext.toString()

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: `code.${ext}`,
          types: [{ description: "Source Code", accept: { "text/plain": [`.${ext}`] } }]
        })
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()
        addToast(`✅ code.${ext} saved successfully!`)
      } else {
        const file = new Blob([content], { type: "text/plain" })
        const url = URL.createObjectURL(file)
        const a = document.createElement("a")
        a.href = url
        a.download = `code.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error("Save failed", err)
    }
  }, [language, editor.ytext, addToast])

  /* ── Run code ── */
  const runCode = useCallback(async () => {
    if (!canRun) return

    editor.chatArray.push([{
      id: Date.now().toString() + Math.random(),
      sender: editor.username,
      target: "all",
      text: "",
      type: "system",
      timestamp: Date.now()
    }])

    const code = editor.ytext.toString()
    if (!code.trim()) { setOutput("(empty code)"); return }

    try {
      const res = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userId: editor.username, language, code, input: "" }),
      })
      const data = await res.json()
      if (data.status === "queued") setOutput(`⏳ Queued (position ${data.position})`)
      else if (data.isRender) setOutput(data)
      else if (data.output) setOutput(data.output)
    } catch (_err) {
      setOutput("❌ Error: Could not reach the execution server.")
    }
  }, [canRun, roomId, language, editor])

  const pushRoomUI = useCallback(() => {
    editor.roomMap.set("roomTheme", personalPrefs.theme)
    editor.roomMap.set("roomFont", { fontSize: personalPrefs.fontSize, fontFamily: personalPrefs.fontFamily })
  }, [editor.roomMap, personalPrefs])

  const clearRoomUI = useCallback(() => {
    editor.roomMap.delete("roomTheme")
    editor.roomMap.delete("roomFont")
  }, [editor.roomMap])

  const onLanguageChange = useCallback((value) => {
    if (canChangeLanguage) editor.roomMap.set("language", value)
  }, [canChangeLanguage, editor.roomMap])

  const onToggleChatEnabled = useCallback((checked) => {
    editor.roomMap.set("chatEnabled", checked)
  }, [editor.roomMap])

  const onToggleShowUsers = useCallback((checked) => {
    editor.roomMap.set("showUsersList", checked)
  }, [editor.roomMap])

  const onSetRoomTheme = useCallback((value) => {
    editor.roomMap.set("roomTheme", value)
  }, [editor.roomMap])

  /* ── Monaco Setup ── */
  const bindingRef = useRef(null)

  const onEditorMount = useCallback((monacoEditor, monaco) => {
    if (!editor.ytext || !editor.provider.awareness) return

    if (bindingRef.current) {
      bindingRef.current.destroy()
    }

    bindingRef.current = new MonacoBinding(
      editor.ytext,
      monacoEditor.getModel(),
      new Set([monacoEditor]),
      editor.provider.awareness
    )
  }, [editor.ytext, editor.provider.awareness])

  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy()
        bindingRef.current = null
      }
    }
  }, [])

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



  /* ── Filtered lists ── */
  const visibleChatMsgs = chatMessages.filter(m => m.target === "all" || m.target === editor.username || m.sender === editor.username)
  const visibleActiveUsersList = activeUsers.filter(u => {
    if (kickedUsers.includes(u.id) || kickedUsers.includes(u.name)) return false
    if (!showUsersList && !isHost) {
      return u.name === hostName || u.id === editor.provider.awareness.clientID
    }
    return true
  })

  return {
    // Editor core
    editor, onEditorMount, cmBaseTheme, monacoTheme, monacoOptions,
    // Room state
    roomId, language, actualRoomType, output, runner,
    // Permissions
    isHost, canEdit, canRun, canChangeLanguage, canChangeRoom,
    // Theme
    activeTheme, activeFontSize, activeFontFamily, isDark,
    bg, headerBg, toolbarBg, textColor, panelBg, borderCol, inputBg, accent,
    personalPrefs, roomTheme, roomFont,
    // UI state
    settingsOpen, setSettingsOpen,
    exitConfirmOpen, setExitConfirmOpen,
    previewOpen, setPreviewOpen,
    chatOpen, setChatOpen,
    rightPanel, setRightPanel, toggleRightPanel,
    usersDropdownOpen, setUsersDropdownOpen,
    callActive, setCallActive,
    peerId, setPeerId,
    toasts,
    // Git
    gitStatus, isGitLoading, refreshGitStatus,
    // Users
    activeUsers, visibleActiveUsersList, hostName,
    // Chat
    chatEnabled, showUsersList, visibleChatMsgs,
    chatInput, setChatInput,
    chatTarget, setChatTarget,
    // Actions
    runCode, downloadCode, sendChat, kickUser,
    onLanguageChange, onLeave,
    updatePersonalPref, pushRoomUI, clearRoomUI,
    onToggleChatEnabled, onToggleShowUsers, onSetRoomTheme,
    setOutput,
    // Interview
    interviewTime,
  }
}
