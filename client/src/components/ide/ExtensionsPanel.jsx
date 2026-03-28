import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function ExtensionsPanel({ textColor, borderCol, panelBg, accent, isDark, headerBg }) {
  const [activeTool, setActiveTool] = useState(null)

  const tools = [
    {
      id: "json",
      icon: "{} ",
      name: "JSON Formatter",
      desc: "Format & validate JSON",
      render: () => <JSONFormatter accent={accent} inputBg={isDark ? "#181825" : "#ffffff"} textColor={textColor} borderCol={borderCol} />
    },
    {
      id: "color",
      icon: "🎨",
      name: "Color Picker",
      desc: "Pick HEX/RGB/HSL values",
      render: () => <ColorPickerTool accent={accent} inputBg={isDark ? "#181825" : "#ffffff"} textColor={textColor} borderCol={borderCol} />
    },
    {
      id: "regex",
      icon: "🔍",
      name: "Regex Tester",
      desc: "Test regular expressions",
      render: () => <RegexTesterTool accent={accent} inputBg={isDark ? "#181825" : "#ffffff"} textColor={textColor} borderCol={borderCol} />
    }
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", background: headerBg, borderBottom: `1px solid ${borderCol}`,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧩</span> Extensions & Tools
        </div>
        {activeTool && (
          <button
            onClick={() => setActiveTool(null)}
            style={{
              background: "transparent", border: "none", color: textColor,
              cursor: "pointer", fontSize: 12, opacity: 0.7, padding: "4px 8px", borderRadius: 4
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Body */}
      <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", opacity: 0.5, marginBottom: 8, marginTop: 4 }}>Built-in Tools</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {tools.map(tool => (
                  <div
                    key={tool.id}
                    className="ide-ext-card"
                    onClick={() => setActiveTool(tool.id)}
                    style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderCol}` }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 24 }}>{tool.icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{tool.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{tool.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", opacity: 0.5, marginBottom: 8 }}>External Registries</div>
              <a
                href="https://open-vsx.org/"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="ide-ext-card"
                  style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderCol}` }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24, background: "#ffffff", borderRadius: 4, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src="https://open-vsx.org/favicon.ico" alt="VSX" style={{ width: 16, height: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Open VSX Registry <span style={{ fontSize: 10 }}>↗</span></div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>Browse extensions online</div>
                    </div>
                  </div>
                </div>
              </a>
            </motion.div>
          ) : (
            <motion.div
              key="tool"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {tools.find(t => t.id === activeTool)?.render()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function JSONFormatter({ accent, inputBg, textColor, borderCol }) {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState(null)

  const format = () => {
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch (err) {
      setError(err.message)
      setOutput("")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>Input JSON string:</div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='{"key": "value"}'
          style={{
            width: "100%", height: 120, background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
            borderRadius: 6, padding: 8, fontFamily: "monospace", fontSize: 12, resize: "vertical"
          }}
        />
      </div>
      <button
        onClick={format}
        style={{
          background: accent, color: "#fff", border: "none", padding: "8px", borderRadius: 6,
          fontWeight: 600, cursor: "pointer", fontSize: 13
        }}
      >
        Format JSON
      </button>
      {error && <div style={{ color: "#f38ba8", fontSize: 12, padding: 8, background: "rgba(243,139,168,0.1)", borderRadius: 6 }}>{error}</div>}
      {output && (
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>Output:</div>
          <pre style={{
            background: inputBg, border: `1px solid ${borderCol}`, borderRadius: 6, padding: 8,
            fontSize: 12, overflowX: "auto", margin: 0
          }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}

function ColorPickerTool({ accent, inputBg, textColor, borderCol }) {
  const [color, setColor] = useState("#89b4fa")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>Select a Color:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: 50, height: 50, padding: 0, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent"
            }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              flex: 1, background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
              borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 13
            }}
          />
        </div>
      </div>
      <div style={{ height: 100, width: "100%", borderRadius: 6, background: color, border: `1px solid ${borderCol}` }} />
    </div>
  )
}

function RegexTesterTool({ accent, inputBg, textColor, borderCol }) {
  const [regexStr, setRegexStr] = useState("")
  const [flags, setFlags] = useState("g")
  const [testStr, setTestStr] = useState("")

  let error = null
  let matches = []
  
  try {
    if (regexStr) {
      const regex = new RegExp(regexStr, flags)
      const results = [...testStr.matchAll(regex)]
      matches = results.map(r => `Match: "${r[0]}" at index ${r.index}`)
    }
  } catch (err) {
    error = err.message
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>Regular Expression:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ opacity: 0.5 }}>/</span>
          <input
            type="text"
            value={regexStr}
            onChange={e => setRegexStr(e.target.value)}
            placeholder="[a-z]+"
            style={{
              flex: 1, background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
              borderRadius: 6, padding: 8, fontFamily: "monospace", fontSize: 12
            }}
          />
          <span style={{ opacity: 0.5 }}>/</span>
          <input
            type="text"
            value={flags}
            onChange={e => setFlags(e.target.value)}
            style={{
              width: 40, background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
              borderRadius: 6, padding: 8, fontFamily: "monospace", fontSize: 12
            }}
            title="Flags (e.g. g, i, m)"
          />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.8 }}>Test String:</div>
        <textarea
          value={testStr}
          onChange={e => setTestStr(e.target.value)}
          placeholder="Enter text to test against..."
          style={{
            width: "100%", height: 80, background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
            borderRadius: 6, padding: 8, fontFamily: "monospace", fontSize: 12, resize: "vertical"
          }}
        />
      </div>
      
      {error && <div style={{ color: "#f38ba8", fontSize: 12, padding: 8, background: "rgba(243,139,168,0.1)", borderRadius: 6 }}>{error}</div>}
      
      {!error && regexStr && (
        <div style={{ background: inputBg, border: `1px solid ${borderCol}`, borderRadius: 6, padding: 8, minHeight: 60 }}>
          <div style={{ fontSize: 12, marginBottom: 8, fontWeight: 600 }}>{matches.length} matches found</div>
          {matches.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, fontFamily: "monospace", color: accent, display: "flex", flexDirection: "column", gap: 4 }}>
              {matches.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>No matches.</div>
          )}
        </div>
      )}
    </div>
  )
}
