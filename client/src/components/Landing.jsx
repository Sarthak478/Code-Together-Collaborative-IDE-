import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { generateRoomId } from "../utils/helpers"
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion"
import { COLLAB_URL } from "../config"

/* ─── Theme Configuration (Aether Prime — by Stitch) ────────────── */
const themes = {
  dark: {
    background: "#0c0c1f",
    cardBg: "rgba(23, 23, 46, 0.55)",
    cardBorder: "rgba(209, 171, 253, 0.12)",
    inputBg: "rgba(17, 17, 38, 0.7)",
    inputBorder: "rgba(70, 70, 92, 0.3)",
    textPrimary: "#e5e3fe",
    textSecondary: "#aaa8c2",
    accent: "#d1abfd",
    accentHover: "#c39eee",
    secondaryAccent: "#8cb7fe",
    success: "#22c55e",
    error: "#ff6e84",
    warning: "#f59e0b",
    info: "#8cb7fe",
    tabBg: "rgba(17, 17, 38, 0.5)",
    tabActive: "#d1abfd",
    tabInactive: "transparent",
    placeholder: "#53536a",
    gradient: "linear-gradient(135deg, #d1abfd 0%, #8cb7fe 100%)",
    glow: "0 0 60px rgba(209, 171, 253, 0.12)",
    buttonText: "#0c0c1f",
    surfaceContainer: "#17172e",
    surfaceHigh: "#1d1d36",
    surfaceHighest: "#23233f"
  },
  light: {
    background: "#fcf8ff",
    cardBg: "rgba(255, 255, 255, 0.85)",
    cardBorder: "rgba(0, 94, 185, 0.12)",
    inputBg: "rgba(255, 255, 255, 0.95)",
    inputBorder: "rgba(0, 94, 185, 0.15)",
    textPrimary: "#00224b",
    textSecondary: "#53536a",
    accent: "#704f99",
    accentHover: "#583190",
    secondaryAccent: "#1e5190",
    success: "#198754",
    error: "#d7383b",
    warning: "#ffc107",
    info: "#1e5190",
    tabBg: "rgba(112, 79, 153, 0.06)",
    tabActive: "#704f99",
    tabInactive: "transparent",
    placeholder: "#aaa8c2",
    gradient: "linear-gradient(135deg, #704f99 0%, #1e5190 100%)",
    glow: "0 10px 30px rgba(112, 79, 153, 0.08)",
    buttonText: "#ffffff",
    surfaceContainer: "#f0eef5",
    surfaceHigh: "#e8e6ee",
    surfaceHighest: "#ddd9e7"
  }
}

/* ─── Animated Background Grid ──────────────────────────────────── */
function AnimatedGrid({ theme }) {
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0
    }}>
      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(209,171,253,${theme === 'dark' ? '0.03' : '0.02'}) 1px, transparent 1px),
          linear-gradient(90deg, rgba(209,171,253,${theme === 'dark' ? '0.03' : '0.02'}) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%)"
      }} />
      
      {/* Aurora strip at top */}
      <motion.div
        animate={{ 
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "3px",
          background: "linear-gradient(90deg, transparent, #d1abfd, #8cb7fe, #ff94a5, #d1abfd, transparent)",
          backgroundSize: "200% 100%",
          opacity: 0.8
        }}
      />
      
      {/* Large orb top-left */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.12, 0.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "-15%", left: "-8%",
          width: "65vw", height: "65vw",
          background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(209,171,253,0.1)' : 'rgba(112,79,153,0.04)'} 0%, transparent 55%)`,
        }}
      />
      
      {/* Large orb bottom-right */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.1, 0.06] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute", bottom: "-20%", right: "-8%",
          width: "55vw", height: "55vw",
          background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(140,183,254,0.08)' : 'rgba(30,81,144,0.03)'} 0%, transparent 55%)`,
        }}
      />
    </div>
  )
}

/* ─── Floating Particle System ──────────────────────────────────── */
function ParticleField({ theme, count = 20 }) {
  const particles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      duration: 5 + Math.random() * 8,
      delay: Math.random() * 5,
      color: i % 3 === 0 ? "#d1abfd" : i % 3 === 1 ? "#8cb7fe" : "#ff94a5"
    }))
  , [count])

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{ 
            opacity: [0, 0.6, 0],
            y: [0, -30, 0],
            x: [0, (Math.random() - 0.5) * 20, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: theme === 'dark' ? p.color : "#704f99",
            borderRadius: "50%",
            boxShadow: `0 0 ${p.size * 4}px ${theme === 'dark' ? p.color : '#704f99'}`,
            filter: "blur(0.3px)"
          }}
        />
      ))}
    </div>
  )
}

/* ─── Floating Nav Bar ──────────────────────────────────────────── */
function FloatingNav({ theme, currentTheme, toggleTheme }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", h)
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <motion.nav
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", borderRadius: 20,
        background: scrolled ? (theme === 'dark' ? "rgba(12,12,31,0.85)" : "rgba(252,248,255,0.9)") : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
        border: scrolled ? `1px solid ${currentTheme.cardBorder}` : "1px solid transparent",
        width: "min(90vw, 900px)", zIndex: 1000,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: currentTheme.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: `0 0 20px rgba(209,171,253,0.3)`
          }}
        >
          {"🚀"}
        </motion.div>
        <span style={{ 
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, 
          letterSpacing: "-0.03em", color: currentTheme.textPrimary
        }}>
          Code<span style={{ color: currentTheme.accent }}>Together</span>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.a
          href="https://github.com/Sarthak478/Code-Together-Collaborative-IDE-"
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 10,
            background: currentTheme.surfaceContainer,
            border: `1px solid ${currentTheme.cardBorder}`,
            color: currentTheme.textSecondary, fontSize: 12, fontWeight: 600,
            fontFamily: "'Manrope', sans-serif", textDecoration: "none",
            cursor: "pointer", letterSpacing: "0.02em"
          }}
        >
          ⭐ Star on GitHub
        </motion.a>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          style={{
            background: currentTheme.surfaceContainer,
            border: `1px solid ${currentTheme.cardBorder}`,
            borderRadius: 10, padding: "7px 14px", cursor: "pointer",
            color: currentTheme.textSecondary, fontSize: 12, fontWeight: 600,
            fontFamily: "'Manrope', sans-serif", display: "flex", alignItems: "center", gap: 6
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
        </motion.button>
      </div>
    </motion.nav>
  )
}

/* ─── Stat Pill Component ───────────────────────────────────────── */
function StatPill({ icon, text, delay, currentTheme }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -3, boxShadow: `0 8px 24px rgba(209,171,253,0.15)` }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px", borderRadius: 12,
        background: currentTheme.surfaceContainer,
        border: `1px solid ${currentTheme.cardBorder}`,
        fontSize: 12, fontWeight: 600, color: currentTheme.textSecondary,
        fontFamily: "'Manrope', sans-serif", cursor: "default",
        transition: "all 0.3s ease", letterSpacing: "0.02em"
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {text}
    </motion.div>
  )
}

/* ─── Typewriter Effect ─────────────────────────────────────────── */
function TypewriterText({ texts, currentTheme }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayed, setDisplayed] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentText = texts[currentIndex]
    let timeout

    if (!isDeleting && displayed.length < currentText.length) {
      timeout = setTimeout(() => setDisplayed(currentText.slice(0, displayed.length + 1)), 80)
    } else if (!isDeleting && displayed.length === currentText.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false)
      setCurrentIndex((prev) => (prev + 1) % texts.length)
    }

    return () => clearTimeout(timeout)
  }, [displayed, isDeleting, currentIndex, texts])

  return (
    <span style={{ color: currentTheme.secondaryAccent, fontFamily: "'JetBrains Mono', monospace" }}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        style={{ color: currentTheme.accent }}
      >|</motion.span>
    </span>
  )
}

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
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) return savedTheme
    return 'dark'
  })
  const joinInputRef = useRef(null)
  const cardRef = useRef(null)

  // Mouse tracking for card tilt
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 20 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3, 3]), { stiffness: 150, damping: 20 })

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0)
    mouseY.set(0)
  }, [mouseX, mouseY])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(prev => prev === 'dark' ? 'light' : 'dark'), [])
  const currentTheme = themes[theme]

  const roomModes = {
    compiler: { icon: "⚡", title: "Compiler", description: "Single-file playground", color: currentTheme.warning, badge: "Quick" },
    ide: { icon: "🌌", title: "Full IDE", description: "Multi-file workspace & terminal", color: currentTheme.accent, badge: "Power" }
  }

  const roomTypes = {
    collaborative: { icon: "🤝", title: "Collaborative", description: "Everyone writes and executes code", color: currentTheme.success, badge: "Open" },
    interview: { icon: "🎯", title: "Interview", description: "Host controls execution, others write", color: currentTheme.warning, badge: "Structured" },
    broadcast: { icon: "📡", title: "Broadcast", description: "Host teaches, others watch safely", color: currentTheme.info, badge: "Read-only" }
  }

  const addToast = useCallback((text, type = "error") => {
    const id = Date.now() + Math.random().toString()
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  useEffect(() => { if (initialError) addToast(initialError) }, [initialError, addToast])

  const validateRoom = useCallback(async (roomId) => {
    if (!roomId.trim()) { setRoomExists(null); return }
    setIsValidating(true)
    try {
      const res = await fetch(`${COLLAB_URL}/rooms`)
      const activeRooms = await res.json()
      setRoomExists(activeRooms.includes(roomId.trim().replace(/^#/, '')))
    } catch(e) { console.error(e); setRoomExists(null) }
    finally { setIsValidating(false) }
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => { if (joinId.trim()) validateRoom(joinId) }, 500)
    return () => clearTimeout(debounce)
  }, [joinId, validateRoom])

  const handleJoin = async () => {
    const id = joinId.trim().replace(/^#/, '')
    if (!id) return
    setIsJoining(true)
    try {
      const res = await fetch(`${COLLAB_URL}/rooms`)
      const activeRooms = await res.json()
      if (!activeRooms.includes(id)) { addToast("Room not found. Please check the ID.", "error"); setIsJoining(false); return }
      onJoin(id, "collaborative", false, "ide")
    } catch(e) { addToast("Unable to connect. Check your network.", "error"); setIsJoining(false) }
  }

  const handleCreate = async (type) => {
    setIsCreating(true)
    await new Promise(resolve => setTimeout(resolve, 400))
    onJoin(generateRoomId(), type, true, roomMode)
    setIsCreating(false)
  }

  const getToastStyles = (type) => {
    switch(type) {
      case "error": return { background: "rgba(255,110,132,0.15)", color: "#ff6e84", borderColor: "rgba(255,110,132,0.3)" }
      case "success": return { background: "rgba(34,197,94,0.15)", color: "#22c55e", borderColor: "rgba(34,197,94,0.3)" }
      default: return { background: currentTheme.surfaceContainer, color: currentTheme.textPrimary, borderColor: currentTheme.cardBorder }
    }
  }

  /* ── Stagger animation variants ── */
  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }
  const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } }
  }

  return (
    <div
      className="landing-root"
      style={{ 
        minHeight: "100vh",
        background: currentTheme.background, color: currentTheme.textPrimary, 
        fontFamily: "'Manrope', 'Inter', sans-serif",
        position: "relative",
        transition: "background 0.5s ease, color 0.5s ease"
      }}>
      <AnimatedGrid theme={theme} />
      <ParticleField theme={theme} />
      <FloatingNav theme={theme} currentTheme={currentTheme} toggleTheme={toggleTheme} />

      {/* Toast Notifications */}
      <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none", width: "100%", maxWidth: 420, alignItems: "center" }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -30, scale: 0.9, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(4px)" }}
              style={{ 
                ...getToastStyles(t.type), padding: "14px 24px", borderRadius: 14,
                boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
                fontSize: 13, fontWeight: 600, textAlign: "center",
                backdropFilter: "blur(20px)", border: `1px solid ${getToastStyles(t.type).borderColor}`,
                width: "100%", fontFamily: "'Manrope', sans-serif"
              }}
            >{t.text}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Content Wrapper ── */}
      <div
        className="landing-content-wrapper"
        style={{
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          flexWrap: "wrap", gap: "28px 4vw",
          padding: "88px 5vw 60px",
          boxSizing: "border-box",
          position: "relative", zIndex: 1
        }}>

      {/* ── LEFT: Hero Content ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ flex: "1 1 400px", maxWidth: 560, zIndex: 1, alignSelf: "flex-start" }}
      >
        {/* Micro-label */}
        <motion.div variants={fadeUp} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 20,
          background: currentTheme.surfaceContainer,
          border: `1px solid ${currentTheme.cardBorder}`,
          fontSize: 11, fontWeight: 700, color: currentTheme.accent,
          fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase",
          letterSpacing: "0.1em", marginBottom: 24
        }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: currentTheme.success, display: "inline-block" }}
          />
          Live — Real-time Collaboration
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={fadeUp} style={{ 
          fontFamily: "'Space Grotesk', sans-serif", 
          fontSize: "clamp(2.8rem, 5vw, 4.5rem)", fontWeight: 700, 
          lineHeight: 1.05, margin: "0 0 8px 0", letterSpacing: "-0.03em"
        }}>
          Code<span style={{ 
            background: currentTheme.gradient, WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>Together</span>
        </motion.h1>

        {/* Secondary headline with typewriter */}
        <motion.div variants={fadeUp} style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "clamp(1.2rem, 2vw, 1.6rem)", fontWeight: 500,
          color: currentTheme.textSecondary, marginBottom: 20,
          lineHeight: 1.4
        }}>
          Real-Time Collaborative{" "}
          <TypewriterText 
            texts={["IDE", "Compiler", "Interview Room", "Broadcast"]} 
            currentTheme={currentTheme}
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p variants={fadeUp} style={{ 
          fontSize: 15, color: currentTheme.textSecondary, lineHeight: 1.7,
          marginBottom: 28, maxWidth: "90%", fontWeight: 400
        }}>
          The hyper-fused, zero-latency environment built for modern engineering teams. 
          Write, compile, and ship code together — in an ethereal digital workspace.
        </motion.p>

        {/* Stat Pills */}
        <motion.div variants={fadeUp} style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          <StatPill icon="⚡" text="Zero Latency" delay={0.4} currentTheme={currentTheme} />
          <StatPill icon="🔒" text="End-to-End Encrypted" delay={0.5} currentTheme={currentTheme} />
          <StatPill icon="🛡️" text="No Data Saved" delay={0.6} currentTheme={currentTheme} />
        </motion.div>

        {/* Zero-Data Sanctuary Banner */}
        <motion.div 
          variants={fadeUp}
          whileHover={{ x: 4, boxShadow: `0 0 30px rgba(241, 166, 255, 0.08)` }}
          style={{
            background: theme === 'dark' ? 'rgba(241, 166, 255, 0.04)' : 'rgba(112, 79, 153, 0.04)',
            borderRadius: 16, padding: 24,
            backdropFilter: "blur(12px)", position: "relative", overflow: "hidden",
            border: `1px solid ${theme === 'dark' ? 'rgba(241, 166, 255, 0.12)' : 'rgba(112, 79, 153, 0.12)'}`,
            transition: "all 0.3s ease", cursor: "default", marginBottom: 28
          }}
        >
          {/* Gradient left accent bar */}
          <div style={{ 
            position: "absolute", top: 0, left: 0, width: 3, height: "100%", 
            background: `linear-gradient(180deg, ${theme === 'dark' ? '#d1abfd' : '#704f99'}, ${theme === 'dark' ? '#8cb7fe' : '#1e5190'})`,
            borderRadius: "3px 0 0 3px"
          }} />
          <div style={{ display: "flex", gap: 14, paddingLeft: 8 }}>
            <div style={{ fontSize: 22, display: "flex", alignItems: "flex-start", paddingTop: 2 }}>🛡️</div>
            <div>
              <h3 style={{ 
                fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 6px 0", 
                fontSize: 13, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: theme === 'dark' ? '#d1abfd' : '#704f99'
              }}>Zero-Data Sanctuary</h3>
              <p style={{ margin: 0, fontSize: 13, color: currentTheme.textSecondary, lineHeight: 1.6, fontWeight: 400 }}>
                <b style={{ color: currentTheme.textPrimary }}>Strict No Data Saving.</b> Every character, file, and message exists <i>only</i> during the live session. Once closed, your entire workspace is permanently purged.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex" }}>
            {["#d1abfd", "#8cb7fe", "#ff94a5", "#22c55e", "#f59e0b"].map((c, i) => (
              <motion.div
                key={i}
                initial={{ x: -10 * i, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.08 }}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: `2px solid ${currentTheme.background}`,
                  marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0c0c1f",
                  fontFamily: "'Manrope', sans-serif"
                }}
              >{String.fromCharCode(65 + i)}</motion.div>
            ))}
          </div>
          <span style={{ fontSize: 12, color: currentTheme.textSecondary, fontWeight: 500 }}>
            Trusted by <b style={{ color: currentTheme.textPrimary }}>1,200+</b> developers worldwide
          </span>
        </motion.div>
      </motion.div>

      {/* ── RIGHT: Interaction Card ── */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.92, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ 
          flex: "0 1 440px", minWidth: 310, width: "100%",
          alignSelf: "flex-start",
          background: currentTheme.cardBg, padding: "28px", borderRadius: 24, 
          border: `1px solid ${currentTheme.cardBorder}`,
          boxShadow: currentTheme.glow,
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          position: "relative", zIndex: 1,
          rotateX, rotateY,
          transformPerspective: 1200,
          transformStyle: "preserve-3d"
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Gradient shimmer border */}
        <div style={{
          position: "absolute", inset: -1, borderRadius: 25, padding: 1,
          background: `linear-gradient(135deg, rgba(209,171,253,0.15), transparent 40%, transparent 60%, rgba(140,183,254,0.1))`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor", maskComposite: "exclude",
          pointerEvents: "none"
        }} />

        {/* Username Input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: "block", fontSize: 10, textTransform: "uppercase", 
            letterSpacing: "0.1em", fontWeight: 700, color: currentTheme.accent, marginBottom: 8,
            fontFamily: "'Manrope', sans-serif"
          }}>Operator Identity</label>
          <div style={{ 
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", 
            background: currentTheme.inputBg, borderRadius: 12, 
            border: `1px solid ${currentTheme.inputBorder}`,
            transition: "all 0.3s ease"
          }}>
            <span style={{ fontSize: 16, opacity: 0.6 }}>👤</span>
            <input 
              value={username} onChange={e => onUsernameChange(e.target.value)} 
              placeholder="Enter your handle..."
              style={{ 
                flex: 1, background: "transparent", border: "none", color: currentTheme.textPrimary, 
                fontWeight: 600, outline: "none", fontSize: 14, fontFamily: "'Manrope', sans-serif",
              }} 
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: "flex", gap: 4, marginBottom: 18, background: currentTheme.tabBg, 
          padding: 4, borderRadius: 14
        }}>
          {[
            { id: "create", label: "Initialize", icon: "✨" },
            { id: "join", label: "Connect", icon: "🔗" }
          ].map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActiveTab(tab.id); setJoinId(""); setRoomExists(null); }}
              style={{
                flex: 1, padding: "9px", position: "relative",
                background: activeTab === tab.id ? currentTheme.tabActive : "transparent",
                color: activeTab === tab.id ? currentTheme.buttonText : currentTheme.textSecondary,
                border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", 
                fontSize: 12, fontFamily: "'Manrope', sans-serif",
                letterSpacing: "0.04em", transition: "all 0.25s ease",
                boxShadow: activeTab === tab.id ? `0 4px 16px rgba(209,171,253,0.25)` : "none"
              }}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "create" ? (
            <motion.div key="create" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.25 }}>
              
              {/* Environment Mode */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: currentTheme.textSecondary, marginBottom: 10, fontFamily: "'Manrope', sans-serif" }}>
                  Environment
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {Object.entries(roomModes).map(([key, mode]) => (
                    <motion.div
                      key={key} whileHover={{ y: -3, boxShadow: `0 8px 24px rgba(0,0,0,0.2)` }} whileTap={{ scale: 0.97 }} onClick={() => setRoomMode(key)}
                      style={{
                        flex: 1, padding: "12px 10px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                        background: roomMode === key ? `rgba(209,171,253,0.06)` : currentTheme.inputBg,
                        border: `1.5px solid ${roomMode === key ? mode.color : 'transparent'}`,
                        transition: "all 0.25s ease"
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4, filter: roomMode === key ? `drop-shadow(0 0 8px ${mode.color})` : 'none', transition: "filter 0.3s" }}>{mode.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: roomMode === key ? mode.color : currentTheme.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>{mode.title}</div>
                      <div style={{ fontSize: 9, color: currentTheme.textSecondary, marginTop: 2, fontFamily: "'Manrope', sans-serif" }}>{mode.description}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Protocol Type */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: currentTheme.textSecondary, marginBottom: 10, fontFamily: "'Manrope', sans-serif" }}>
                  Protocol
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(roomTypes).map(([key, type]) => (
                    <motion.div
                      key={key} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }} onClick={() => setCreateType(key)}
                      style={{
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: createType === key ? `rgba(209,171,253,0.04)` : currentTheme.inputBg,
                        borderLeft: `3px solid ${createType === key ? type.color : 'transparent'}`,
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{type.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: currentTheme.textPrimary, fontFamily: "'Manrope', sans-serif" }}>{type.title}</div>
                          <div style={{ fontSize: 9, color: currentTheme.textSecondary, marginTop: 1 }}>{type.description}</div>
                        </div>
                      </div>
                      {createType === key && (
                        <motion.div layoutId="type-check" style={{ width: 8, height: 8, borderRadius: "50%", background: type.color, boxShadow: `0 0 10px ${type.color}` }} />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: `0 0 40px rgba(209,171,253,0.3)` }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleCreate(createType)} disabled={isCreating}
                style={{
                  width: "100%", padding: 14, background: currentTheme.gradient, color: currentTheme.buttonText,
                  border: "none", borderRadius: 14, fontWeight: 800, cursor: isCreating ? "not-allowed" : "pointer",
                  fontSize: 14, opacity: isCreating ? 0.7 : 1, fontFamily: "'Space Grotesk', sans-serif", 
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  boxShadow: `0 4px 24px rgba(209,171,253,0.2)`, transition: "all 0.3s ease",
                  position: "relative", overflow: "hidden"
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                  style={{
                    position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                    pointerEvents: "none"
                  }}
                />
                {isCreating ? "Initializing..." : "🚀 Ignite Session"}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="join" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }}>
              
              <div style={{ marginBottom: 28, marginTop: 12 }}>
                <label style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: currentTheme.accent, marginBottom: 10, fontFamily: "'Manrope', sans-serif" }}>
                  Room ID
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    ref={joinInputRef} disabled={isJoining} value={joinId} onChange={e => setJoinId(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && joinId.trim() && !isJoining && roomExists) handleJoin() }}
                    placeholder="e.g. quantum-fox-99"
                    style={{
                      width: "100%", padding: "15px 50px 15px 18px", background: currentTheme.inputBg, color: currentTheme.textPrimary,
                      border: `1.5px solid ${roomExists === true ? currentTheme.success : roomExists === false ? currentTheme.error : currentTheme.inputBorder}`,
                      borderRadius: 14, outline: "none", fontSize: 14, transition: "all 0.3s ease", fontWeight: 500,
                      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em",
                      boxShadow: roomExists === true ? `0 0 20px rgba(34,197,94,0.1)` : roomExists === false ? `0 0 20px rgba(255,110,132,0.1)` : "none"
                    }}
                  />
                  <div style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)" }}>
                    {isValidating ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }} style={{ width: 16, height: 16, border: `2px solid transparent`, borderTopColor: currentTheme.accent, borderRightColor: currentTheme.accent, borderRadius: "50%" }} />
                    ) : roomExists === true ? (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: currentTheme.success, fontSize: 16, textShadow: `0 0 10px ${currentTheme.success}` }}>✓</motion.span>
                    ) : roomExists === false && joinId.trim() ? (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: currentTheme.error, fontSize: 14 }}>✗</motion.span>
                    ) : null}
                  </div>
                </div>
                <AnimatePresence>
                  {roomExists === false && joinId.trim() && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 8, fontSize: 12, color: currentTheme.error, fontWeight: 500 }}>
                      Room not found. Double-check the ID.
                    </motion.div>
                  )}
                  {roomExists === true && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 8, fontSize: 12, color: currentTheme.success, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                      <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: currentTheme.success }} /> Room found! Ready to connect.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                disabled={!joinId.trim() || isJoining || !roomExists} onClick={handleJoin}
                style={{
                  width: "100%", padding: 16,
                  background: (joinId.trim() && roomExists && !isJoining) ? currentTheme.success : currentTheme.inputBg,
                  color: (joinId.trim() && roomExists && !isJoining) ? "#0c0c1f" : currentTheme.textSecondary,
                  border: "none", borderRadius: 14, fontWeight: 800,
                  cursor: (joinId.trim() && roomExists && !isJoining) ? "pointer" : "not-allowed",
                  fontSize: 14, opacity: isJoining ? 0.7 : 1, fontFamily: "'Space Grotesk', sans-serif", 
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  boxShadow: (joinId.trim() && roomExists && !isJoining) ? `0 4px 24px rgba(34,197,94,0.3)` : "none",
                  transition: "all 0.3s ease"
                }}
              >
                {isJoining ? "Connecting..." : "🔗 Establish Link"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          input::placeholder { color: ${currentTheme.placeholder}; opacity: 0.5; }
          * { box-sizing: border-box; }
        `}</style>
      </motion.div>

      </div>{/* end content wrapper */}
    </div>
  )
}