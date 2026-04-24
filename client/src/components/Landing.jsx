import { useEffect, useState, useCallback, useRef } from "react"
import { generateRoomId } from "../utils/helpers"
import { motion, AnimatePresence } from "framer-motion"
import { COLLAB_URL } from "../config"

/* ─── Theme Configuration (Neon Luminary) ────────────────────────────── */
const themes = {
  dark: {
    background: "#0c0c1f",
    cardBg: "rgba(29, 29, 55, 0.4)",
    cardBorder: "rgba(127, 175, 255, 0.15)",
    inputBg: "rgba(17, 17, 39, 0.6)",
    inputBorder: "rgba(127, 175, 255, 0.3)",
    textPrimary: "#e5e3ff",
    textSecondary: "#aaa8c3",
    accent: "#7fafff",
    accentHover: "#64a1ff",
    secondaryAccent: "#c198fe",
    success: "#22c55e",
    error: "#ff716c",
    warning: "#f59e0b",
    info: "#c198fe",
    tabBg: "rgba(17, 17, 39, 0.4)",
    tabActive: "#7fafff",
    tabInactive: "transparent",
    placeholder: "#53536a",
    gradient: "linear-gradient(135deg, #7fafff 0%, #c198fe 100%)",
    glow: "0 0 40px rgba(127, 175, 255, 0.15)",
    buttonText: "#002e60"
  },
  light: {
    background: "#fcf8ff",
    cardBg: "rgba(255, 255, 255, 0.8)",
    cardBorder: "rgba(0, 94, 185, 0.15)",
    inputBg: "rgba(255, 255, 255, 0.9)",
    inputBorder: "rgba(0, 94, 185, 0.2)",
    textPrimary: "#00224b",
    textSecondary: "#53536a",
    accent: "#005eb9",
    accentHover: "#004a94",
    secondaryAccent: "#583190",
    success: "#198754",
    error: "#d7383b",
    warning: "#ffc107",
    info: "#623b9a",
    tabBg: "rgba(0, 94, 185, 0.05)",
    tabActive: "#005eb9",
    tabInactive: "transparent",
    placeholder: "#aaa8c3",
    gradient: "linear-gradient(135deg, #005eb9 0%, #623b9a 100%)",
    glow: "0 10px 30px rgba(0, 94, 185, 0.1)",
    buttonText: "#ffffff"
  }
}

/* ─── Style Constants ──────────────────────────────────────────────── */
const SPACING = { xs: 6, sm: 12, md: 16, lg: 24, xl: 32, xxl: 36 }
const BORDER_RADIUS = { sm: 10, md: 12, lg: 14, xl: 16, full: 40 }
const FONT_SIZES = { xs: 12, sm: 13, base: 14, lg: 15, xl: 18, heading: 24 }

/* ─── Reusable Style Generators ──────────────────────────────────────── */
const getInputStyles = (theme, currentTheme, isActive = false) => ({
  width: "100%",
  padding: `${SPACING.md}px ${SPACING.lg}px`,
  background: currentTheme.inputBg,
  color: currentTheme.textPrimary,
  border: `1.5px solid ${isActive ? currentTheme.accent : currentTheme.inputBorder}`,
  borderRadius: BORDER_RADIUS.lg,
  outline: "none",
  fontSize: FONT_SIZES.lg,
  transition: "all 0.3s ease",
  fontWeight: 500,
  fontFamily: "'Inter', sans-serif"
})

const getLabelStyles = (currentTheme) => ({
  display: "block",
  fontSize: FONT_SIZES.xs,
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: 700,
  color: currentTheme.textSecondary,
  marginBottom: SPACING.md,
  fontFamily: "'Space Grotesk', sans-serif"
})

const getButtonStyles = (currentTheme, isDisabled = false, variant = "primary") => {
  const variants = {
    primary: {
      background: currentTheme.gradient,
      color: currentTheme.buttonText,
      boxShadow: currentTheme.glow
    },
    secondary: {
      background: currentTheme.inputBg,
      color: currentTheme.textSecondary
    },
    success: {
      background: currentTheme.success,
      color: currentTheme.background,
      boxShadow: `0 0 20px rgba(34, 197, 94, 0.4)`
    }
  }

  return {
    width: "100%",
    padding: `${SPACING.md}px`,
    ...variants[variant],
    border: "none",
    borderRadius: BORDER_RADIUS.lg,
    fontWeight: 800,
    cursor: isDisabled ? "not-allowed" : "pointer",
    fontSize: FONT_SIZES.lg,
    opacity: isDisabled ? 0.7 : 1,
    fontFamily: "'Space Grotesk', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "1px",
    transition: "all 0.3s ease"
  }
}

const getCardStyles = (currentTheme, theme) => ({
  background: currentTheme.cardBg,
  border: `1px solid ${currentTheme.cardBorder}`,
  borderRadius: BORDER_RADIUS.xl,
  boxShadow: currentTheme.glow,
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  transition: "all 0.3s ease"
})

const getToastStyles = (type) => {
  switch(type) {
    case "error":
      return { background: "#ff716c", color: "#ffffff", border: "#ff716c" }
    case "success":
      return { background: "#22c55e", color: "#ffffff", border: "#22c55e" }
    default:
      return { background: "#313244", color: "#e5e3ff", border: "#313244" }
  }
}

/* ─── Font Injection ──────────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

/* ─── Landing Page ──────────────────────────────────────────────── */
export default function Landing({ username, onUsernameChange, onJoin, initialError }) {
  const [joinId, setJoinId] = useState("")
  const [createType, setCreateType] = useState("collaborative")
  const [roomMode, setRoomMode] = useState("ide")
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
    return 'dark' // Defaulting to dark for Neon Luminary
  })
  const joinInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Handle URL Parameter for Room Invitation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get("room")
    if (roomId) {
      setJoinId(roomId)
      setActiveTab("join")
      // Clear the URL parameter without refreshing
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname
      window.history.replaceState({ path: newUrl }, "", newUrl)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const currentTheme = themes[theme]

  const roomModes = {
    compiler: {
      icon: "⚡",
      title: "Compiler",
      description: "Fast, single-file playground",
      color: currentTheme.warning,
      badge: "Quick"
    },
    ide: {
      icon: "🌌",
      title: "Full IDE",
      description: "Multi-file workspace & terminal",
      color: currentTheme.accent,
      badge: "Power"
    }
  }

  const roomTypes = {
    collaborative: {
      icon: "🤝",
      title: "Collaborative",
      description: "Everyone writes and executes code",
      color: currentTheme.success,
      badge: "Open"
    },
    interview: {
      icon: "🎯",
      title: "Interview",
      description: "Host controls execution, others write",
      color: currentTheme.warning,
      badge: "Structured"
    },
    broadcast: {
      icon: "📡",
      title: "Broadcast",
      description: "Host teaches, others watch safely",
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
      const res = await fetch(`${COLLAB_URL}/rooms`)
      const activeRooms = await res.json()
      const exists = activeRooms.includes(roomId.trim().replace(/^#/, ''))
      setRoomExists(exists)
    } catch(e) {
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
      const res = await fetch(`${COLLAB_URL}/rooms`)
      const activeRooms = await res.json()
      
      if (!activeRooms.includes(id)) {
        addToast("❌ Room not found. Please check the room ID.", "error")
        setIsJoining(false)
        return
      }
      
      onJoin(id, "collaborative", false, "ide")
    } catch(e) {
      console.error(e)
      addToast("⚠️ Unable to connect to sanctuary servers.", "error")
      setIsJoining(false)
    }
  }

  const handleCreate = async (type) => {
    setIsCreating(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    onJoin(generateRoomId(), type, true, roomMode)
    setIsCreating(false)
  }

  const getToastStyles = (type) => {
    switch(type) {
      case "error":
        return { background: currentTheme.error, color: "#ffffff", border: currentTheme.error }
      case "success":
        return { background: currentTheme.success, color: "#ffffff", border: currentTheme.success }
      default:
        return { background: currentTheme.inputBg, color: currentTheme.textPrimary, border: currentTheme.inputBorder }
    }
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      background: currentTheme.background, 
      color: currentTheme.textPrimary, 
      fontFamily: "'Inter', sans-serif",
      position: "relative",
      overflowX: "hidden",
      overflowY: "auto",
      padding: "0 5vw",
      transition: "background 0.4s ease, color 0.4s ease"
    }}>
      {/* Deep Space Radial Gradient */}
      <div style={{
        position: "absolute",
        top: "-20%",
        left: "-10%",
        width: "70vw",
        height: "70vw",
        background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(127,175,255,0.08)' : 'rgba(0,94,185,0.04)'} 0%, transparent 60%)`,
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        bottom: "-20%",
        right: "-10%",
        width: "60vw",
        height: "60vw",
        background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(193,152,254,0.06)' : 'rgba(98,59,154,0.05)'} 0%, transparent 60%)`,
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Floating Orbs */}
      <div style={{ position: "absolute", width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.4, 0],
              scale: [0, 1.5, 0],
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight
            }}
            transition={{
              duration: 4 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            style={{
              position: "absolute",
              width: 1 + Math.random() * 3,
              height: 1 + Math.random() * 3,
              background: i % 2 === 0 ? currentTheme.accent : currentTheme.secondaryAccent,
              borderRadius: "50%",
              boxShadow: `0 0 10px ${i % 2 === 0 ? currentTheme.accent : currentTheme.secondaryAccent}`,
              filter: "blur(0.5px)"
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
          position: "fixed",
          top: SPACING.xl,
          right: SPACING.xl,
          background: currentTheme.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${currentTheme.cardBorder}`,
          borderRadius: BORDER_RADIUS.full,
          padding: `${SPACING.sm}px ${SPACING.lg}px`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: SPACING.sm,
          color: currentTheme.textPrimary,
          fontSize: FONT_SIZES.sm,
          fontWeight: 600,
          zIndex: 1000,
          fontFamily: "'Space Grotesk', sans-serif",
          transition: "all 0.3s ease",
          letterSpacing: "0.5px",
          boxShadow: theme === 'dark' ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        {theme === 'dark' ? '☀️ LIGHT' : '🌙 DARK'}
      </motion.button>

      {/* Toast Notifications */}
      <div style={{ 
        position: "fixed", 
        top: SPACING.xl, 
        left: "50%", 
        transform: "translateX(-50%)", 
        zIndex: 1000, 
        display: "flex", 
        flexDirection: "column", 
        gap: SPACING.lg, 
        pointerEvents: "none", 
        width: "100%", 
        maxWidth: 420, 
        alignItems: "center" 
      }} role="region" aria-live="polite" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              style={{ 
                ...getToastStyles(t.type),
                padding: "16px 24px", 
                borderRadius: 16, 
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                fontSize: 14, 
                fontWeight: 500, 
                textAlign: "center",
                backdropFilter: "blur(20px)",
                border: `1px solid ${getToastStyles(t.type).border}`,
                width: "100%",
                fontFamily: "'Space Grotesk', sans-serif"
              }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Left Column: Hero & Policies */}
      <div style={{ flex: "1 1 50%", maxWidth: "600px", zIndex: 1, paddingRight: "40px", paddingTop: "20px", paddingBottom: "40px" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <h1 style={{ 
            fontFamily: "'Space Grotesk', sans-serif", 
            fontSize: "clamp(3rem, 5vw, 4.5rem)", 
            fontWeight: 800, 
            lineHeight: 1.1, 
            margin: "0 0 16px 0",
            letterSpacing: "-1px"
          }}>
            Code<span style={{ color: currentTheme.accent }}>Together</span>
            <br />
            <span style={{ 
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}>Neon Luminary</span>
          </h1>
          <p style={{ 
            fontSize: "1.1rem", 
            color: currentTheme.textSecondary, 
            lineHeight: 1.6, 
            marginBottom: "40px",
            maxWidth: "90%",
            fontWeight: 400
          }}>
            The hyper-fused, high-performance real-time environment built for modern engineering teams. Experience zero-latency sync in an ethereal digital void.
          </p>
        </motion.div>

        {/* The Zero-Data Sanctuary Policy Banner */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            background: theme === 'dark' ? 'rgba(241, 166, 255, 0.05)' : 'rgba(215, 56, 59, 0.05)',
            border: `1px solid ${theme === 'dark' ? 'rgba(241, 166, 255, 0.2)' : 'rgba(215, 56, 59, 0.2)'}`,
            borderRadius: "16px",
            padding: "24px",
            backdropFilter: "blur(12px)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ 
            position: "absolute", top: 0, left: 0, width: "4px", height: "100%", 
            background: theme === 'dark' ? '#f1a6ff' : '#d7383b' 
          }} />
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ 
              fontSize: "24px", 
              color: theme === 'dark' ? '#f1a6ff' : '#d7383b', 
              display: "flex", alignItems: "flex-start", paddingTop: "2px" 
            }}>
              🛡️
            </div>
            <div>
              <h3 style={{ 
                fontFamily: "'Space Grotesk', sans-serif", 
                margin: "0 0 6px 0", 
                fontSize: "1.1rem", 
                fontWeight: 700,
                color: theme === 'dark' ? '#f1a6ff' : '#d7383b',
                letterSpacing: "0.5px"
              }}>
                ZERO-DATA SANCTUARY
              </h3>
              <p style={{ margin: 0, fontSize: "0.9rem", color: currentTheme.textSecondary, lineHeight: 1.5 }}>
                <b style={{ color: currentTheme.textPrimary }}>Strict No Data Saving Policy.</b> Every character you type, every file you create, and every message you send exists <i>only</i> during the live session. Once closed, your entire workspace is instantly and permanently purged from our servers. Zero persistence. Total privacy.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Column: Interaction Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        style={{ 
          flex: "0 1 480px",
          background: currentTheme.cardBg, 
          padding: "36px", 
          borderRadius: "24px", 
          border: `1px solid ${currentTheme.cardBorder}`,
          boxShadow: currentTheme.glow,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          position: "relative",
          zIndex: 1
        }}
      >
        
        {/* Identity / Username Input */}
        <div style={{ marginBottom: "32px" }}>
          <label style={{ 
            display: "block", fontSize: "12px", textTransform: "uppercase", 
            letterSpacing: "1px", fontWeight: 700, color: currentTheme.accent, marginBottom: "10px",
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            Operator Identity
          </label>
          <motion.div
            whileFocus={{ scale: 1.01 }}
            style={{ 
              display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", 
              background: currentTheme.inputBg, borderRadius: "14px", 
              border: `1px solid ${currentTheme.inputBorder}`,
              transition: "all 0.3s ease"
            }}
          >
            <span style={{ fontSize: "18px", opacity: 0.7 }}>👤</span>
            <input 
              value={username} 
              onChange={e => onUsernameChange(e.target.value)} 
              placeholder="Designate your handle..."
              style={{ 
                flex: 1, background: "transparent", border: "none", color: currentTheme.textPrimary, 
                fontWeight: 600, outline: "none", fontSize: "15px", fontFamily: "'Inter', sans-serif",
              }} 
            />
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: "flex", gap: "6px", marginBottom: "28px", background: currentTheme.tabBg, 
          padding: "6px", borderRadius: "14px"
        }}>
          {[
            { id: "create", label: "Initialize Room", icon: "✨" },
            { id: "join", label: "Connect", icon: "🔗" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setJoinId(""); setRoomExists(null); }}
              style={{
                flex: 1, padding: "12px", 
                background: activeTab === tab.id ? currentTheme.tabActive : currentTheme.tabInactive,
                color: activeTab === tab.id ? currentTheme.buttonText : currentTheme.textSecondary,
                border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer", 
                transition: "all 0.3s ease", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.5px"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "create" ? (
            <motion.div key="create" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              
              {/* Environment Mode Selection */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, color: currentTheme.textSecondary, marginBottom: "12px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Sector Environment
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  {Object.entries(roomModes).map(([key, mode]) => (
                    <motion.div
                      key={key} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setRoomMode(key)}
                      style={{
                        flex: 1, padding: "16px", borderRadius: "14px", cursor: "pointer", textAlign: "center",
                        background: roomMode === key ? `rgba(127, 175, 255, 0.08)` : currentTheme.inputBg,
                        border: `1.5px solid ${roomMode === key ? mode.color : 'transparent'}`,
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ fontSize: "24px", marginBottom: "8px", filter: roomMode === key ? `drop-shadow(0 0 8px ${mode.color})` : 'none' }}>{mode.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: roomMode === key ? mode.color : currentTheme.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>{mode.title}</div>
                      <div style={{ fontSize: "11px", color: currentTheme.textSecondary, marginTop: "4px" }}>{mode.description}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Room Type Selection */}
              <div style={{ marginBottom: "32px" }}>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, color: currentTheme.textSecondary, marginBottom: "12px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Protocol Type
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Object.entries(roomTypes).map(([key, type]) => (
                    <motion.div
                      key={key} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateType(key)}
                      style={{
                        padding: "14px 18px", borderRadius: "12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: createType === key ? `rgba(127, 175, 255, 0.05)` : currentTheme.inputBg,
                        border: `1px solid ${createType === key ? type.color : 'transparent'}`,
                        borderLeft: `4px solid ${createType === key ? type.color : 'transparent'}`,
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <span style={{ fontSize: "20px" }}>{type.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: currentTheme.textPrimary }}>{type.title}</div>
                          <div style={{ fontSize: "11px", color: currentTheme.textSecondary, marginTop: "2px" }}>{type.description}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleCreate(createType)} disabled={isCreating}
                style={{
                  width: "100%", padding: "16px", background: currentTheme.gradient, color: currentTheme.buttonText,
                  border: "none", borderRadius: "14px", fontWeight: 800, cursor: isCreating ? "not-allowed" : "pointer",
                  fontSize: "15px", opacity: isCreating ? 0.7 : 1, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "1px",
                  boxShadow: currentTheme.glow
                }}
              >
                {isCreating ? "Initializing Link..." : "Ignite Session"}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              
              <div style={{ marginBottom: "32px", marginTop: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, color: currentTheme.accent, marginBottom: "12px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  Target Vector (Room ID)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    ref={joinInputRef} disabled={isJoining} value={joinId} onChange={e => setJoinId(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && joinId.trim() && !isJoining && roomExists) handleJoin() }}
                    placeholder="e.g. quantum-fox-99"
                    style={{
                      width: "100%", padding: "16px 50px 16px 20px", background: currentTheme.inputBg, color: currentTheme.textPrimary,
                      border: `1.5px solid ${roomExists === true ? currentTheme.success : roomExists === false ? currentTheme.error : currentTheme.inputBorder}`,
                      borderRadius: "14px", outline: "none", fontSize: "15px", transition: "all 0.3s ease", fontWeight: 500,
                      fontFamily: "'Inter', sans-serif"
                    }}
                  />
                  <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)" }}>
                    {isValidating ? (
                      <div style={{ width: 18, height: 18, border: `3px solid transparent`, borderTopColor: currentTheme.accent, borderRightColor: currentTheme.accent, borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    ) : roomExists === true ? (
                      <span style={{ color: currentTheme.success, fontSize: "18px", textShadow: `0 0 10px ${currentTheme.success}` }}>●</span>
                    ) : roomExists === false && joinId.trim() ? (
                      <span style={{ color: currentTheme.error, fontSize: "18px", textShadow: `0 0 10px ${currentTheme.error}` }}>■</span>
                    ) : null}
                  </div>
                </div>
                {roomExists === false && joinId.trim() && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, fontSize: 13, color: currentTheme.error, fontWeight: 500 }}>
                    Vector trace failed. Room does not exist.
                  </motion.div>
                )}
                {roomExists === true && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, fontSize: 13, color: currentTheme.success, fontWeight: 500 }}>
                    Signal acquired. Ready to bridge.
                  </motion.div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!joinId.trim() || isJoining || !roomExists} onClick={handleJoin}
                style={{
                  width: "100%", padding: "16px",
                  background: (joinId.trim() && roomExists && !isJoining) ? currentTheme.success : currentTheme.inputBg,
                  color: (joinId.trim() && roomExists && !isJoining) ? currentTheme.background : currentTheme.textSecondary,
                  border: "none", borderRadius: "14px", fontWeight: 800,
                  cursor: (joinId.trim() && roomExists && !isJoining) ? "pointer" : "not-allowed",
                  fontSize: "15px", opacity: isJoining ? 0.7 : 1, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "1px",
                  boxShadow: (joinId.trim() && roomExists && !isJoining) ? `0 0 20px rgba(34, 197, 94, 0.4)` : "none",
                  transition: "all 0.3s ease"
                }}
              >
                {isJoining ? "Bridging Connection..." : "Establish Link"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          input::placeholder { color: ${currentTheme.placeholder}; opacity: 0.6; }
          * { box-sizing: border-box; }
        `}</style>
      </motion.div>
    </div>
  )
}
