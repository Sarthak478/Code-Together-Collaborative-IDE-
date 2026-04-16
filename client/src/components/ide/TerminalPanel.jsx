import { useEffect, useRef, useState } from "react"
import { API_URL } from "../../config"
import { Plus, X } from "lucide-react"

/**
 * TerminalInstance — A single xterm.js terminal view connected to the server PTY via WebSocket.
 */
function TerminalInstance({ roomId, terminalId, isActive, isDark, onAskRalph, onTerminalReady }) {
  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const wsRef = useRef(null)
  const fitRef = useRef(null)
  const hasMounted = useRef(false)
  const outBufferRef = useRef("")
  const ralphTimerRef = useRef(null)

  useEffect(() => {
    if (hasMounted.current) return
    hasMounted.current = true

    let term = null
    let ws = null
    let fitAddon = null

    const init = async () => {
      try {
        const { Terminal } = await import("@xterm/xterm")
        const { FitAddon } = await import("@xterm/addon-fit")
        const { WebLinksAddon } = await import("@xterm/addon-web-links")

        await import("@xterm/xterm/css/xterm.css")

        term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          theme: isDark ? {
            background: "#0d0d1a", foreground: "#cdd6f4", cursor: "#89b4fa", selectionBackground: "rgba(137, 180, 250, 0.3)",
            black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af", blue: "#89b4fa",
            magenta: "#cba6f7", cyan: "#94e2d5", white: "#bac2de"
          } : {
            background: "#f8f9fa", foreground: "#212529", cursor: "#0d6efd", selectionBackground: "rgba(13, 110, 253, 0.2)",
            black: "#212529", red: "#dc3545", green: "#198754", yellow: "#ffc107", blue: "#0d6efd",
            magenta: "#6f42c1", cyan: "#0dcaf0", white: "#6c757d"
          },
          allowProposedApi: true,
        })

        fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.loadAddon(new WebLinksAddon())

        if (termRef.current) {
          term.open(termRef.current)
          setTimeout(() => { if (fitAddon) fitAddon.fit() }, 50)
        }

        xtermRef.current = term
        fitRef.current = fitAddon

        // Connect to server terminal WebSocket WITH terminalId
        ws = new WebSocket(`${API_URL.replace("http","ws")}/terminal?roomId=${encodeURIComponent(roomId)}&terminalId=${terminalId}`)
        wsRef.current = ws

        ws.onopen = () => {
          term.writeln("\x1b[1;36m╔═══════════════════════════════════════╗\x1b[0m")
          term.writeln(`\x1b[1;36m║   Terminal ${terminalId} Connected              ║\x1b[0m`)
          term.writeln("\x1b[1;36m╚═══════════════════════════════════════╝\x1b[0m")
          term.writeln("")

          const dims = fitAddon.proposeDimensions()
          if (dims) ws.send(JSON.stringify({ type: "resize", cols: dims.cols, rows: dims.rows }))

          // Expose sendCommand for Ralph
          if (onTerminalReady) {
            onTerminalReady((cmd) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "input", data: cmd + "\n" }))
              }
            })
          }
        }

        ws.onmessage = (event) => {
          let textData = ""
          try {
            const data = JSON.parse(event.data)
            if (data.type === "output") {
               term.write(data.data)
               textData = data.data
            }
            else if (data.type === "exit") term.writeln(`\r\n\x1b[33m[Process exited with code ${data.code}]\x1b[0m`)
          } catch (_) {
            term.write(event.data)
            textData = event.data
          }

          if (textData) {
            outBufferRef.current += textData
            if (outBufferRef.current.length > 8000) {
              outBufferRef.current = outBufferRef.current.slice(-8000)
            }

            // Check for error keywords
            const textStr = textData.toString()
            if (
              textStr.includes("Error:") || 
              textStr.includes("Exception:") || 
              textStr.includes("MODULE_NOT_FOUND") || 
              textStr.includes("npm ERR!")
            ) {
              // Wait 1000ms for the full stack trace to finish printing
              if (ralphTimerRef.current) clearTimeout(ralphTimerRef.current)
              ralphTimerRef.current = setTimeout(() => {
                const log = outBufferRef.current
                if (onAskRalph) onAskRalph(log)
              }, 1000)
            }
          }
        }

        ws.onclose = () => term.writeln("\r\n\x1b[31m[Terminal disconnected]\x1b[0m")
        ws.onerror = () => term.writeln("\r\n\x1b[31m[Connection error — is the server running?]\x1b[0m")

        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input", data }))
        })

      } catch (err) {
        console.error("Terminal init error:", err)
      }
    }

    init()

    return () => {
      if (ws) ws.close()
      if (term) term.dispose()
    }
  }, [roomId, terminalId, isDark])

  // Resize handler
  const resizeTimeoutRef = useRef(null)
  useEffect(() => {
    if (!isActive) return // only auto-fit if active!
    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        if (fitRef.current && xtermRef.current) {
          try {
            fitRef.current.fit()
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              const dims = fitRef.current.proposeDimensions()
              if (dims) wsRef.current.send(JSON.stringify({ type: "resize", cols: dims.cols, rows: dims.rows }))
            }
          } catch (_) {}
        }
      }, 250)
    }

    const windowResizeHandler = () => handleResize()
    window.addEventListener("resize", windowResizeHandler)
    handleResize() // Initial fit

    return () => {
      window.removeEventListener("resize", windowResizeHandler)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
    }
  }, [isActive])

  return (
    <div key={`term-${terminalId}`} style={{ display: isActive ? "block" : "none", flex: 1, overflow: "hidden", height: "100%" }}>
       <div ref={termRef} style={{ height: "100%", width: "100%" }} />
    </div>
  )
}


/**
 * TerminalPanel — Manages multiple tabs of TerminalInstances.
 */
export default function TerminalPanel({ roomId, height, isDark, borderCol, headerBg, textColor, accent, onAskRalph, onSendCommandReady }) {
  const [terminals, setTerminals] = useState([{ id: "1" }])
  const [activeTab, setActiveTab] = useState("1")

  const addTerminal = () => {
    const nextId = (Math.max(...terminals.map(t => parseInt(t.id) || 0)) + 1).toString();
    setTerminals(prev => [...prev, { id: nextId }])
    setActiveTab(nextId)
  }

  const removeTerminal = (e, id) => {
    e.stopPropagation()
    if (terminals.length === 1) return // Keep at least one!
    const newTerms = terminals.filter(t => t.id !== id)
    setTerminals(newTerms)
    if (activeTab === id) setActiveTab(newTerms[newTerms.length - 1].id)
  }

  return (
    <div className="ide-terminal-container" style={{ height, display: "flex", flexDirection: "column", borderTop: `1px solid ${borderCol}` }}>
      {/* Terminal Header Tabs */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: headerBg, borderBottom: `1px solid ${borderCol}`, minHeight: 28,
        position: "relative"
      }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1, overflowX: "auto" }} className="ide-scroll">
          {terminals.map((term) => {
            const isActive = activeTab === term.id;
            return (
              <div 
                key={term.id}
                onClick={() => setActiveTab(term.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", 
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  fontFamily: "'Manrope', sans-serif",
                  color: isActive ? textColor : textColor + "88",
                  background: isActive ? "transparent" : "rgba(0,0,0,0.1)",
                  borderRight: `1px solid ${borderCol}`,
                  minWidth: 100, borderTop: isActive ? `1px solid ${accent}` : "1px solid transparent"
                }}
              >
                <span style={{ color: isActive ? accent : "inherit", fontSize: 10 }}>⬤</span>
                <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.02em" }}>Terminal {term.id}</span>
                {terminals.length > 1 && (
                  <X 
                    size={10} 
                    opacity={isActive ? 1 : 0.5} 
                    cursor="pointer" 
                    onClick={(e) => removeTerminal(e, term.id)} 
                  />
                )}
              </div>
            )
          })}
        </div>
        
        {/* Add Terminal Button */}
        <div 
          onClick={addTerminal}
          style={{
            padding: "0 12px", cursor: "pointer", borderLeft: `1px solid ${borderCol}`, 
            display: "flex", alignItems: "center", justifyContent: "center",  color: textColor
          }}
          title="New Terminal"
        >
          <Plus size={14} />
        </div>
      </div>
      
      {/* Terminal Bodies */}
      <div style={{ flex: 1, position: "relative" }}>
        {terminals.map(term => (
          <TerminalInstance 
             key={term.id}
             roomId={roomId}
             terminalId={term.id}
             isActive={activeTab === term.id}
             isDark={isDark}
             onAskRalph={onAskRalph}
             onTerminalReady={term.id === "1" ? onSendCommandReady : undefined}
          />
        ))}
      </div>
    </div>
  )
}
