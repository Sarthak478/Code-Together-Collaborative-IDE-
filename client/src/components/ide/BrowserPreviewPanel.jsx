import { useState } from "react"

export default function BrowserPreviewPanel({ bg, panelBg, textColor, borderCol, accent }) {
  const [url, setUrl] = useState("http://localhost:5173")
  const [iframeUrl, setIframeUrl] = useState("http://localhost:5173")
  const [key, setKey] = useState(0)

  const handleGo = () => {
    setIframeUrl(url)
    setKey(k => k + 1)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: panelBg }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: 8, background: bg, borderBottom: `1px solid ${borderCol}` }}>
        <button onClick={() => setKey(k => k + 1)} title="Refresh Window" style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.8 }}>
          🔄
        </button>
        <input 
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if(e.key === "Enter") handleGo() }}
          style={{ flex: 1, background: panelBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 6, padding: "6px 12px", fontSize: 13, fontFamily: "monospace" }}
        />
        <button onClick={handleGo} style={{ background: accent, color: "#1e1e2e", border: "none", cursor: "pointer", borderRadius: 6, padding: "6px 16px", fontSize: 13, fontWeight: "bold" }}>
          GO
        </button>
      </div>
      <div style={{ flex: 1, background: "#ffffff" }}>
        <iframe 
          key={key}
          src={iframeUrl}
          style={{ width: "100%", height: "100%", border: "none", background: "#ffffff" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title="Browser Preview"
        />
      </div>
    </div>
  )
}
