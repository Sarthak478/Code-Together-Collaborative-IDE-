// import { useEffect, useState, useCallback } from "react"
// import { generateRoomId } from "../utils/helpers"

// /* ─── Landing Page ──────────────────────────────────────────────── */
// export default function Landing({ username, onUsernameChange, onJoin, initialError }) {
//   const [joinId, setJoinId] = useState("")
//   const [createType, setCreateType] = useState("collaborative")
//   const [isJoining, setIsJoining] = useState(false)
//   const [toasts, setToasts] = useState([])

//   const addToast = useCallback((text) => {
//     const id = Date.now() + Math.random().toString()
//     setToasts(prev => [...prev, { id, text }])
//     setTimeout(() => {
//       setToasts(prev => prev.filter(t => t.id !== id))
//     }, 3000)
//   }, [])

//   useEffect(() => {
//     if (initialError) addToast(initialError)
//   }, [initialError, addToast])

//   const handleJoin = async () => {
//     const id = joinId.trim().replace(/^#/, '')
//     if (!id) return
//     setIsJoining(true)
//     try {
//       const res = await fetch("http://127.0.0.1:1235/rooms")
//       const activeRooms = await res.json()
//       if (!activeRooms.includes(id)) {
//         addToast("❌ Please enter a correct room ID. This room does not exist.")
//         setIsJoining(false)
//         return
//       }
//       onJoin(id, "collaborative", false)
//     } catch(e) {
//       console.error(e)
//       addToast("⚠️ Failed to connect to server to verify room.")
//       setIsJoining(false)
//     }
//   }

//   return (
//     <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1e2e", color: "#cdd6f4", fontFamily: "system-ui", position: "relative", overflow: "hidden" }}>
//       {/* Landing Toasts */}
//       <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none", width: "100%", alignItems: "center" }}>
//         {toasts.map(t => (
//           <div key={t.id} style={{ background: "#313244", color: "#cdd6f4", padding: "12px 20px", borderRadius: 8, border: "1px solid #45475a", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", animation: "toastIn 0.3s ease-out forwards", fontSize: 13, fontWeight: 500, maxWidth: 380, textAlign: "center" }}>
//             {t.text}
//             <style>{`
//               @keyframes toastIn {
//                 from { opacity: 0; transform: translateY(-20px); }
//                 to { opacity: 1; transform: translateY(0); }
//               }
//             `}</style>
//           </div>
//         ))}
//       </div>

//       <div style={{ width: 440, background: "#181825", padding: 32, borderRadius: 12, border: "1px solid #313244", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
//         <h1 style={{ marginTop: 0, textAlign: "center", fontSize: 26, color: "#89b4fa" }}>⚡ LiveShare IDE</h1>

//         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "8px 12px", background: "#11111b", borderRadius: 8, border: "1px solid #313244" }}>
//           <span style={{ opacity: 0.7, fontSize: 13 }}>Username:</span>
//           <input value={username} onChange={e => onUsernameChange(e.target.value)} style={{ flex: 1, background: "transparent", border: "none", color: "#a6e3a1", fontWeight: 700, outline: "none", fontSize: 13 }} />
//         </div>

//         <div style={{ marginBottom: 24, padding: 16, background: "#11111b", borderRadius: 8, border: "1px solid #313244" }}>
//           <div style={{ fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
//             <span>Create a New Room</span>
//             <span style={{ fontSize: 12, background: "#cba6f7", color: "#11111b", padding: "2px 8px", borderRadius: 12 }}>Host</span>
//           </div>
//           <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>Select Room Type:</div>
//           <select value={createType} onChange={e => setCreateType(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 12, background: "#1e1e2e", color: "#cdd6f4", border: "1px solid #313244", borderRadius: 6, cursor: "pointer" }}>
//             <option value="collaborative">🤝 Collaborative (Friends) - All edit & run</option>
//             <option value="interview">🎤 Interview - Participants can only run/change language</option>
//             <option value="broadcast">📺 Broadcast (Teacher) - Participants are Read-Only</option>
//           </select>
//           <button onClick={() => onJoin(generateRoomId(), createType, true)} style={{ width: "100%", padding: 12, background: "#89b4fa", color: "#1e1e2e", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity=0.9} onMouseLeave={e => e.currentTarget.style.opacity=1}>
//             Create & Join Automatically
//           </button>
//         </div>

//         <div style={{ padding: 16, background: "#11111b", borderRadius: 8, border: "1px solid #313244" }}>
//           <div style={{ fontWeight: 700, marginBottom: 12 }}>Join Existing Room</div>
//           <div style={{ display: "flex", gap: 8 }}>
//             <input disabled={isJoining} value={joinId} onChange={e => setJoinId(e.target.value)} onKeyDown={e => {
//               if (e.key === "Enter" && joinId.trim() && !isJoining) handleJoin()
//             }} placeholder="e.g. fast-tiger-42" style={{ flex: 1, padding: 10, background: "#1e1e2e", color: "#cdd6f4", border: "1px solid #313244", borderRadius: 6, outline: "none", opacity: isJoining ? 0.5 : 1 }} />

//             <button disabled={!joinId.trim() || isJoining} onClick={handleJoin} style={{ padding: "0 24px", background: joinId.trim() ? "#a6e3a1" : "#45475a", color: "#1e1e2e", border: "none", borderRadius: 6, fontWeight: 700, cursor: (joinId.trim() && !isJoining) ? "pointer" : "not-allowed", opacity: isJoining ? 0.5 : 1 }}>
//               {isJoining ? "..." : "Join"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
import { useEffect, useState, useCallback, useRef } from "react"
import { generateRoomId } from "../utils/helpers"
import { motion, AnimatePresence } from "framer-motion"

/* ─── Theme Configuration ──────────────────────────────────────────────── */
const themes = {
  dark: {
    background: "linear-gradient(135deg, #1e1e2e 0%, #11111b 100%)",
    cardBg: "rgba(24, 24, 37, 0.95)",
    cardBorder: "rgba(49, 50, 68, 0.5)",
    inputBg: "rgba(17, 17, 27, 0.6)",
    inputBorder: "#313244",
    textPrimary: "#cdd6f4",
    textSecondary: "#a6adc8",
    accent: "#89b4fa",
    success: "#a6e3a1",
    error: "#f38ba8",
    warning: "#f9e2af",
    info: "#cba6f7",
    tabBg: "#11111b",
    tabActive: "#89b4fa",
    tabInactive: "transparent",
    placeholder: "#6c7086",
    gradient: "linear-gradient(135deg, #89b4fa, #cba6f7)",
    buttonText: "#1e1e2e"
  },
  light: {
    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
    cardBg: "#ffffff",
    cardBorder: "#e9ecef",
    inputBg: "#f8f9fa",
    inputBorder: "#dee2e6",
    textPrimary: "#212529",
    textSecondary: "#6c757d",
    accent: "#0d6efd",
    success: "#198754",
    error: "#dc3545",
    warning: "#ffc107",
    info: "#6f42c1",
    tabBg: "#e9ecef",
    tabActive: "#0d6efd",
    tabInactive: "transparent",
    placeholder: "#adb5bd",
    gradient: "linear-gradient(135deg, #0d6efd, #6f42c1)",
    buttonText: "#ffffff"
  }
}

/* ─── Landing Page ──────────────────────────────────────────────── */
export default function Landing({ username, onUsernameChange, onJoin, initialError }) {
  const [joinId, setJoinId] = useState("")
  const [createType, setCreateType] = useState("collaborative")
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState("create")
  const [isValidating, setIsValidating] = useState(false)
  const [roomExists, setRoomExists] = useState(null)
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      return savedTheme
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })
  const joinInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const currentTheme = themes[theme]

  const roomTypes = {
    collaborative: {
      icon: "🤝",
      title: "Collaborative",
      description: "Full access for all participants",
      color: currentTheme.success,
      badge: "All can edit & run"
    },
    interview: {
      icon: "🎤",
      title: "Interview Mode",
      description: "Participants can run code only",
      color: currentTheme.warning,
      badge: "Run only"
    },
    broadcast: {
      icon: "📺",
      title: "Broadcast Mode",
      description: "Read-only for participants",
      color: currentTheme.info,
      badge: "Read-only"
    }
  }

  const addToast = useCallback((text, type = "error") => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    if (initialError) addToast(initialError)
  }, [initialError, addToast])

  const validateRoom = useCallback(async (roomId) => {
    if (!roomId.trim()) {
      setRoomExists(null)
      return
    }

    setIsValidating(true)
    try {
      const res = await fetch("http://127.0.0.1:1235/rooms")
      const activeRooms = await res.json()
      const exists = activeRooms.includes(roomId.trim().replace(/^#/, ''))
      setRoomExists(exists)
    } catch (e) {
      console.error(e)
      setRoomExists(null)
    } finally {
      setIsValidating(false)
    }
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (joinId.trim()) validateRoom(joinId)
    }, 500)
    return () => clearTimeout(debounce)
  }, [joinId, validateRoom])

  const handleJoin = async () => {
    const id = joinId.trim().replace(/^#/, '')
    if (!id) return

    setIsJoining(true)
    try {
      const res = await fetch("http://127.0.0.1:1235/rooms")
      const activeRooms = await res.json()

      if (!activeRooms.includes(id)) {
        addToast("❌ Room not found. Please check the room ID and try again.", "error")
        setIsJoining(false)
        return
      }

      onJoin(id, "collaborative", false)
    } catch (e) {
      console.error(e)
      addToast("⚠️ Unable to connect to server. Please check your connection.", "error")
      setIsJoining(false)
    }
  }

  const handleCreate = async (type) => {
    setIsCreating(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    onJoin(generateRoomId(), type, true)
    setIsCreating(false)
  }

  const getToastStyles = (type) => {
    switch (type) {
      case "error":
        return { background: currentTheme.error, color: "#ffffff", border: currentTheme.error }
      case "success":
        return { background: currentTheme.success, color: "#ffffff", border: currentTheme.success }
      default:
        return { background: theme === 'dark' ? "#313244" : "#e9ecef", color: currentTheme.textPrimary, border: currentTheme.inputBorder }
    }
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: currentTheme.background,
      color: currentTheme.textPrimary,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.3s ease, color 0.3s ease"
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none"
      }}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              scale: [0, 1, 0],
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            style={{
              position: "absolute",
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              background: currentTheme.accent,
              borderRadius: "50%",
              filter: "blur(1px)"
            }}
          />
        ))}
      </div>

      {/* Theme Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: currentTheme.cardBg,
          backdropFilter: "blur(10px)",
          border: `1px solid ${currentTheme.cardBorder}`,
          borderRadius: 40,
          padding: "10px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: currentTheme.textPrimary,
          fontSize: 14,
          fontWeight: 500,
          zIndex: 100,
          transition: "all 0.2s",
          boxShadow: theme === 'dark' ? "none" : "0 2px 4px rgba(0,0,0,0.1)"
        }}
      >
        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </motion.button>

      {/* Toast Notifications */}
      <div style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
        width: "100%",
        maxWidth: 400,
        alignItems: "center"
      }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              style={{
                ...getToastStyles(t.type),
                padding: "12px 20px",
                borderRadius: 12,
                boxShadow: theme === 'dark' ? "0 8px 24px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.15)",
                fontSize: 13,
                fontWeight: 500,
                textAlign: "center",
                backdropFilter: "blur(10px)",
                border: `1px solid ${getToastStyles(t.type).border}`,
                width: "100%"
              }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: 480,
          background: currentTheme.cardBg,
          padding: 32,
          borderRadius: 24,
          border: `1px solid ${currentTheme.cardBorder}`,
          boxShadow: theme === 'dark'
            ? "0 20px 60px rgba(0,0,0,0.5)"
            : "0 20px 40px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 1,
          transition: "all 0.3s ease"
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            style={{
              margin: 0,
              fontSize: 32,
              // background: currentTheme.gradient,
              WebkitBackgroundClip: "text",
              // WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontWeight: 700,
              marginBottom: 8
            }}
          >
            ⚡ LiveShare IDE
          </motion.h1>
          <p style={{
            fontSize: 13,
            marginTop: 0,
            color: currentTheme.textSecondary,
            fontWeight: 500
          }}>
            Real-time collaborative coding environment
          </p>
        </div>

        {/* Username Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            padding: "12px 16px",
            background: currentTheme.inputBg,
            borderRadius: 12,
            border: `1px solid ${currentTheme.inputBorder}`,
            transition: "all 0.2s"
          }}
        >
          <span style={{ fontSize: 18, color: currentTheme.textSecondary }}>👤</span>
          <input
            value={username}
            onChange={e => onUsernameChange(e.target.value)}
            placeholder="Enter your username"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: currentTheme.textPrimary,
              fontWeight: 500,
              outline: "none",
              fontSize: 14,
              padding: "4px 0"
            }}
          />
        </motion.div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          background: currentTheme.tabBg,
          padding: 4,
          borderRadius: 12,
          border: theme === 'light' ? `1px solid ${currentTheme.cardBorder}` : 'none'
        }}>
          {[
            { id: "create", label: "Create Room", icon: "✨" },
            { id: "join", label: "Join Room", icon: "🔗" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setJoinId("")
                setRoomExists(null)
              }}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: activeTab === tab.id ? currentTheme.tabActive : currentTheme.tabInactive,
                color: activeTab === tab.id ? "#ffffff" : currentTheme.textPrimary,
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: 14,
                opacity: activeTab === tab.id ? 1 : 0.8
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontWeight: 700,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: currentTheme.textPrimary,
                  fontSize: 15
                }}>
                  <span>🚀 Room Configuration</span>
                  <span style={{
                    fontSize: 11,
                    background: currentTheme.info,
                    color: "#ffffff",
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontWeight: 600
                  }}>Host</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(roomTypes).map(([key, type]) => (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCreateType(key)}
                      style={{
                        padding: 16,
                        background: createType === key ? (theme === 'dark' ? `rgba(137, 180, 250, 0.1)` : `rgba(13, 110, 253, 0.05)`) : currentTheme.inputBg,
                        border: `2px solid ${createType === key ? type.color : currentTheme.inputBorder}`,
                        borderRadius: 12,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 24 }}>{type.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: currentTheme.textPrimary }}>{type.title}</div>
                            <div style={{ fontSize: 12, color: currentTheme.textSecondary }}>{type.description}</div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          background: type.color,
                          color: "#ffffff",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontWeight: 600
                        }}>
                          {type.badge}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCreate(createType)}
                disabled={isCreating}
                style={{
                  width: "100%",
                  padding: 14,
                  background: currentTheme.gradient,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: isCreating ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  fontSize: 15,
                  opacity: isCreating ? 0.7 : 1
                }}
              >
                {isCreating ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: `2px solid #ffffff`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    Creating Room...
                  </div>
                ) : (
                  "✨ Create & Launch Room"
                )}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontWeight: 700,
                  marginBottom: 12,
                  color: currentTheme.textPrimary,
                  fontSize: 15
                }}>
                  🔍 Join Existing Room
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    ref={joinInputRef}
                    disabled={isJoining}
                    value={joinId}
                    onChange={e => setJoinId(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && joinId.trim() && !isJoining && roomExists) handleJoin()
                    }}
                    placeholder="Enter room ID (e.g., fast-tiger-42)"
                    style={{
                      width: "100%",
                      padding: "14px 48px 14px 16px",
                      background: currentTheme.inputBg,
                      color: currentTheme.textPrimary,
                      border: `2px solid ${roomExists === true ? currentTheme.success : roomExists === false ? currentTheme.error : currentTheme.inputBorder}`,
                      borderRadius: 12,
                      outline: "none",
                      fontSize: 14,
                      transition: "all 0.2s"
                    }}
                  />
                  <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
                    {isValidating ? (
                      <div style={{ width: 20, height: 20, border: `2px solid ${currentTheme.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    ) : roomExists === true ? (
                      <span style={{ color: currentTheme.success, fontSize: 20, fontWeight: "bold" }}>✓</span>
                    ) : roomExists === false && joinId.trim() ? (
                      <span style={{ color: currentTheme.error, fontSize: 20, fontWeight: "bold" }}>✗</span>
                    ) : null}
                  </div>
                </div>
                {roomExists === false && joinId.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 8, fontSize: 12, color: currentTheme.error, fontWeight: 500 }}
                  >
                    Room not found. Check the ID and try again.
                  </motion.div>
                )}
                {roomExists === true && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 8, fontSize: 12, color: currentTheme.success, fontWeight: 500 }}
                  >
                    ✓ Room found! Ready to join.
                  </motion.div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!joinId.trim() || isJoining || !roomExists}
                onClick={handleJoin}
                style={{
                  width: "100%",
                  padding: 14,
                  background: (joinId.trim() && roomExists && !isJoining) ? currentTheme.success : (theme === 'dark' ? "#313244" : "#e9ecef"),
                  color: (joinId.trim() && roomExists && !isJoining) ? "#ffffff" : currentTheme.textSecondary,
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: (joinId.trim() && roomExists && !isJoining) ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  fontSize: 15,
                  opacity: isJoining ? 0.7 : 1
                }}
              >
                {isJoining ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, border: `2px solid #ffffff`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    Joining Room...
                  </div>
                ) : (
                  "🚀 Join Room"
                )}
              </motion.button>

              <div style={{
                marginTop: 16,
                fontSize: 12,
                textAlign: "center",
                color: currentTheme.textSecondary,
                fontWeight: 500
              }}>
                Don't have a room ID? Create one in the "Create Room" tab
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          input::placeholder {
            color: ${currentTheme.placeholder};
            opacity: 0.7;
          }
          
          * {
            box-sizing: border-box;
          }
        `}</style>
      </motion.div>
    </div>
  )
}