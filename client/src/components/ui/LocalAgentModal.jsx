import { motion } from "framer-motion"
import { Cpu, Copy, PlayCircle, TerminalSquare, Cloud, X } from "lucide-react"

export default function LocalAgentModal({
  isOpen,
  fileName,
  commands,
  onClose,
  onOpenLocalAgent,
  onContinueInCloud,
  onRunLocalAgent,
  onCopyCommand,
  themeData
}) {
  if (!isOpen) return null

  const { accent, textColor, panelBg, borderCol, inputBg } = themeData

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4200,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="ide-glass-effect"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "85vh",
          overflow: "auto",
          background: panelBg,
          border: `1px solid ${borderCol}`,
          borderRadius: 24,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)"
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: 24,
          borderBottom: `1px solid ${borderCol}`
        }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `${accent}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Cpu size={24} color={accent} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textColor }}>
                Run This On Your Machine
              </h3>
              <p style={{ margin: "8px 0 0 0", fontSize: 13, lineHeight: 1.6, opacity: 0.72, color: textColor }}>
                `{fileName}` imports libraries that usually need sustained CPU or GPU work. To keep the shared runner responsive,
                use the Local Agent on your own system or continue in the cloud if you just want a quick test.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: textColor,
              cursor: "pointer",
              opacity: 0.6,
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 18 }}>
          <div style={{
            display: "grid",
            gap: 12,
            padding: 16,
            borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${borderCol}`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TerminalSquare size={16} color={accent} />
              <div style={{ fontSize: 15, fontWeight: 700, color: textColor }}>Start the Local Agent</div>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, opacity: 0.72, color: textColor }}>
              Copy one command, paste it into your own terminal, and keep that terminal open. It downloads the current agent script
              from this server and runs it with your existing Python, without npm or a pip package install.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={onOpenLocalAgent}
                className="ide-btn-premium"
                style={{ background: accent, color: "#1e1e2e", border: "none" }}
              >
                <Copy size={14} /> Copy Starter Command
              </button>
              <button
                onClick={() => onCopyCommand(commands[0]?.command || "")}
                className="ide-btn-premium"
                style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}` }}
              >
                <Copy size={14} /> Copy Windows Command
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {commands.map((option) => (
              <div
                key={option.id}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${borderCol}`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: textColor }}>{option.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.68, color: textColor }}>{option.description}</div>
                  </div>
                  <button
                    onClick={() => onCopyCommand(option.command, `${option.title} command copied.`)}
                    className="ide-btn-premium"
                    style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}` }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 14,
                    borderRadius: 14,
                    background: inputBg,
                    border: `1px solid ${borderCol}`,
                    color: textColor,
                    fontSize: 12,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  {option.command}
                </pre>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingTop: 6,
            flexWrap: "wrap"
          }}>
            <div style={{ fontSize: 12, opacity: 0.65, color: textColor }}>
              Recommended path: copy the Windows command, start it locally, then click Run On Local Agent.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={onRunLocalAgent}
                className="ide-btn-premium"
                style={{ background: accent, color: "#1e1e2e", border: "none" }}
              >
                <PlayCircle size={14} /> Run On Local Agent
              </button>
              <button
                onClick={onContinueInCloud}
                className="ide-btn-premium"
                style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}` }}
              >
                <Cloud size={14} /> Continue In Cloud
              </button>
              <button
                onClick={onClose}
                className="ide-btn-premium"
                style={{ background: "rgba(255,255,255,0.05)", color: textColor, border: `1px solid ${borderCol}` }}
              >
                <TerminalSquare size={14} /> Decide Later
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
