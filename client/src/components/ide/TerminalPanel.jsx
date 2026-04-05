import { useEffect, useRef, useCallback } from "react"
import { API_URL } from "../../config"

/**
 * TerminalPanel — Integrated terminal using xterm.js + WebSocket to server PTY.
 */
export default function TerminalPanel({ roomId, height, isDark, borderCol, headerBg, textColor, accent }) {
  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const wsRef = useRef(null)
  const fitRef = useRef(null)

  useEffect(() => {
    let term = null
    let ws = null
    let fitAddon = null

    const init = async () => {
      try {
        const { Terminal } = await import("@xterm/xterm")
        const { FitAddon } = await import("@xterm/addon-fit")
        const { WebLinksAddon } = await import("@xterm/addon-web-links")

        // Import xterm CSS
        await import("@xterm/xterm/css/xterm.css")

        term = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          theme: isDark ? {
            background: "#0d0d1a",
            foreground: "#cdd6f4",
            cursor: "#89b4fa",
            selectionBackground: "rgba(137, 180, 250, 0.3)",
            black: "#45475a",
            red: "#f38ba8",
            green: "#a6e3a1",
            yellow: "#f9e2af",
            blue: "#89b4fa",
            magenta: "#cba6f7",
            cyan: "#94e2d5",
            white: "#bac2de",
          } : {
            background: "#f8f9fa",
            foreground: "#212529",
            cursor: "#0d6efd",
            selectionBackground: "rgba(13, 110, 253, 0.2)",
            black: "#212529",
            red: "#dc3545",
            green: "#198754",
            yellow: "#ffc107",
            blue: "#0d6efd",
            magenta: "#6f42c1",
            cyan: "#0dcaf0",
            white: "#6c757d",
          },
          allowProposedApi: true,
        })

        fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.loadAddon(new WebLinksAddon())

        if (termRef.current) {
          term.open(termRef.current)
          setTimeout(() => fitAddon.fit(), 50)
        }

        xtermRef.current = term
        fitRef.current = fitAddon

        // Connect to server terminal WebSocket
        ws = new WebSocket(`${API_URL.replace("http","ws")}/terminal?roomId=${encodeURIComponent(roomId)}`)
        wsRef.current = ws

        ws.onopen = () => {
          term.writeln("\x1b[1;36m╔═══════════════════════════════════════╗\x1b[0m")
          term.writeln("\x1b[1;36m║   CodeTogether Terminal Connected     ║\x1b[0m")
          term.writeln("\x1b[1;36m╚═══════════════════════════════════════╝\x1b[0m")
          term.writeln("")

          // Send initial resize
          const dims = fitAddon.proposeDimensions()
          if (dims) {
            ws.send(JSON.stringify({ type: "resize", cols: dims.cols, rows: dims.rows }))
          }
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "output") {
              term.write(data.data)
            } else if (data.type === "exit") {
              term.writeln(`\r\n\x1b[33m[Process exited with code ${data.code}]\x1b[0m`)
            }
          } catch (_) {
            // Raw text fallback
            term.write(event.data)
          }
        }

        ws.onclose = () => {
          term.writeln("\r\n\x1b[31m[Terminal disconnected]\x1b[0m")
        }

        ws.onerror = () => {
          term.writeln("\r\n\x1b[31m[Connection error — is the server running?]\x1b[0m")
        }

        // Send keystrokes to server
        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "input", data }))
          }
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
  }, [roomId, isDark])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (fitRef.current && xtermRef.current) {
        try {
          fitRef.current.fit()
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const dims = fitRef.current.proposeDimensions()
            if (dims) {
              wsRef.current.send(JSON.stringify({ type: "resize", cols: dims.cols, rows: dims.rows }))
            }
          }
        } catch (_) {}
      }
    }

    window.addEventListener("resize", handleResize)
    // Also re-fit when height changes
    const timeout = setTimeout(handleResize, 100)

    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timeout)
    }
  }, [height])

  return (
    <div className="ide-terminal-container" style={{ height, display: "flex", flexDirection: "column", borderTop: `1px solid ${borderCol}` }}>
      {/* Terminal Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "4px 12px", background: headerBg, borderBottom: `1px solid ${borderCol}`,
        fontSize: 11, fontWeight: 600, color: textColor, minHeight: 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: accent }}>⬤</span>
          <span>Terminal</span>
        </div>
      </div>
      {/* Terminal Body */}
      <div ref={termRef} style={{ flex: 1, overflow: "hidden" }} />
    </div>
  )
}
