import ReactMarkdown from 'react-markdown'

/* ─── OutputPanel Component ─────────────────────────────────────── */
export default function OutputPanel({
  output, onClear, fontFamily, fontSize, isDark,
  textColor, borderCol
}) {
  return (
    <div style={{ width: "34%", display: "flex", flexDirection: "column", background: isDark ? "#0d0d1a" : "#f1f3f5", borderLeft: `1px solid ${borderCol}` }}>
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", 
        background: isDark ? "linear-gradient(135deg, #181825, rgba(203,166,247,0.05))" : "#dee2e6", 
        borderBottom: `1px solid ${borderCol}`, fontSize: 12 
      }}>
        <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "'Manrope', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDark ? "#a6e3a1" : "#2f9e44", display: "inline-block" }} />
          Output
        </span>
        <button onClick={onClear} style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, fontSize: 12, transition: "opacity 0.2s", fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
        >Clear</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12, fontFamily: fontFamily, fontSize: `${fontSize - 1}px`, backgroundImage: isDark ? "radial-gradient(ellipse at 50% 80%, rgba(166,227,161,0.02) 0%, transparent 60%)" : "none" }}>
        {output?.isRender ? (
          output.lang === 'html' ? (
            <iframe srcDoc={output.renderedCode} title="HTML Preview" style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: 8 }} sandbox="allow-scripts allow-forms allow-same-origin" />
          ) : (
            <div style={{ color: textColor, padding: 8 }}>
              <ReactMarkdown>{output.renderedCode}</ReactMarkdown>
            </div>
          )
        ) : output ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: isDark ? "#a6e3a1" : "#2f9e44", textShadow: isDark ? "0 0 8px rgba(166,227,161,0.15)" : "none", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: `${fontSize - 1}px` }}>{output}</pre> : <span style={{ opacity: 0.4, fontFamily: "'Manrope', sans-serif" }}>No output. Click ▶ Run to execute.</span>}
      </div>
    </div>
  )
}
