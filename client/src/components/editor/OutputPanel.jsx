import ReactMarkdown from 'react-markdown'

/* ─── OutputPanel Component ─────────────────────────────────────── */
export default function OutputPanel({
  output, onClear, fontFamily, fontSize, isDark,
  textColor, borderCol
}) {
  return (
    <div style={{ width: "34%", display: "flex", flexDirection: "column", background: isDark ? "#0d0d1a" : "#f1f3f5", borderLeft: `1px solid ${borderCol}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: isDark ? "#181825" : "#dee2e6", borderBottom: `1px solid ${borderCol}`, fontSize: 12 }}>
        <span style={{ fontWeight: 700 }}>Output</span>
        <button onClick={onClear} style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6 }}>Clear</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12, fontFamily: fontFamily, fontSize: `${fontSize - 1}px` }}>
        {output?.isRender ? (
          output.lang === 'html' ? (
            <iframe srcDoc={output.renderedCode} title="HTML Preview" style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: 4 }} sandbox="allow-scripts allow-forms allow-same-origin" />
          ) : (
            <div style={{ color: textColor, padding: 8 }}>
              <ReactMarkdown>{output.renderedCode}</ReactMarkdown>
            </div>
          )
        ) : output ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: isDark ? "#a6e3a1" : "#2f9e44" }}>{output}</pre> : <span style={{ opacity: 0.4 }}>No output. Click ▶ Run to execute.</span>}
      </div>
    </div>
  )
}
