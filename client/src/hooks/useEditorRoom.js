import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { EditorView } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { yCollab } from "y-codemirror.next"

import { LANGUAGES, THEMES, FONT_FAMILIES, CURSORS } from "../constants/editorConfigs"
import { loadPersonalPrefs, savePersonalPrefs } from "../utils/helpers"

/* ─── useEditorRoom Hook ────────────────────────────────────────── */
export default function useEditorRoom({ roomId, initialRoomType, isCreating, username, onLeave }) {
  /* ── Yjs stable refs ── */
  const [editor] = useState(() => {
    const ydoc = new Y.Doc()
    const provider = new HocuspocusProvider({
      url: "ws://127.0.0.1:1235",
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
  const lastToastId = useRef(null)

  const addToast = useCallback((msgText) => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text: msgText }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
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

  /* ── Host transfer & Users ── */
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

    const hostId = earliest[0]
    const hostUser = earliest[1].user?.name
    if (!hostUser) return

    setHostClientId(hostId)
    setHostName(hostUser)

    if (hostId === editor.provider.awareness.clientID) {
      editor.roomMap.set("host", hostUser)
      if (!editor.roomMap.get("roomType")) editor.roomMap.set("roomType", initialRoomType)
    }
  }, [editor.provider.awareness, editor.roomMap, initialRoomType])

  /* ── Sync Subscriptions ── */
  useEffect(() => {
    const { provider, ytext, roomMap, chatArray } = editor

    provider.on("synced", () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const isDuplicate = states.some(([clientId, state]) =>
        clientId !== provider.awareness.clientID &&
        state.user?.name === username
      )

      if (isDuplicate) {
        onLeave(`⚠️ The username '@${username}' is already taken in this room. Please choose a different name.`)
        return
      }
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

    provider.awareness.on("change", recalcHost)
    recalcHost()

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
        }
      } catch (_e) { }
    }

    return () => {
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
    e.preventDefault()
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
      const res = await fetch("http://127.0.0.1:1236/run", {
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

  /* ── Dynamic CodeMirror extensions ── */
  const langExt = useMemo(() => LANGUAGES.find(l => l.id === language)?.ext ?? LANGUAGES[0].ext, [language])
  const fontExt = useMemo(() => EditorView.theme({ "&": { fontSize: `${activeFontSize}px`, fontFamily: activeFontFamily }, ".cm-content": { fontFamily: activeFontFamily } }), [activeFontSize, activeFontFamily])
  const collabExt = useMemo(() => yCollab(editor.ytext, editor.provider.awareness), [editor.ytext, editor.provider.awareness])
  const readOnlyExt = useMemo(() => EditorState.readOnly.of(!canEdit), [canEdit])
  const extensions = useMemo(() => [langExt, fontExt, collabExt, readOnlyExt], [langExt, fontExt, collabExt, readOnlyExt])

  /* ── Theme ── */
  const themeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0]
  const { base: cmBaseTheme, bg, header: headerBg, toolbar: toolbarBg, text: textColor, panel: panelBg, border: borderCol, input: inputBg, accent } = themeDef
  const isDark = cmBaseTheme === "dark"

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
    editor, extensions, cmBaseTheme,
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
    chatOpen, setChatOpen,
    usersDropdownOpen, setUsersDropdownOpen,
    toasts,
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
  }
}
