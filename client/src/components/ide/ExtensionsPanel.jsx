import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search } from "lucide-react"
import { useMarketplace } from "../../hooks/useMarketplace"

export default function ExtensionsPanel({ roomMap, textColor, borderCol, panelBg, accent, isDark, headerBg }) {
  const { searchQuery, setSearchQuery, results, loading, error, searchExtensions, installExtension, installedExtensions } = useMarketplace(roomMap)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", background: headerBg, borderBottom: `1px solid ${borderCol}`,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📦</span> Marketplace
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${borderCol}` }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
             <Search size={14} color={textColor} style={{ position: "absolute", left: 10, opacity: 0.5 }} />
             <input 
               type="text" 
               placeholder="Search Extensions in Open VSX..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') searchExtensions(searchQuery) }}
               style={{
                 width: "100%", background: isDark ? "rgba(0,0,0,0.2)" : "#fff", border: `1px solid ${borderCol}`, color: textColor,
                 padding: "8px 12px 8px 32px", borderRadius: 6, fontSize: 13, outline: "none"
               }}
             />
          </div>
        </div>

        <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && <div style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: 20 }}>Searching...</div>}
          {!loading && error && <div style={{ fontSize: 13, color: "#f38ba8", textAlign: "center", padding: 20 }}>{error}</div>}
          {!loading && !error && results.length === 0 && searchQuery && (
            <div style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: 20 }}>No extensions found.</div>
          )}
          {!loading && !error && results.length === 0 && !searchQuery && (
             <div style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
               <span style={{ fontSize: 32 }}>🔍</span>
               Search the Open VSX Registry for VS Code Extensions
             </div>
          )}

          {results.map((ext) => {
            const isInstalled = installedExtensions.includes(`${ext.namespace}.${ext.name}`)
            return (
              <div key={`${ext.namespace}.${ext.name}`} style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#f8f9fa",
                border: `1px solid ${borderCol}`,
                borderRadius: 8, padding: 12, display: "flex", gap: 12
              }}>
                <img src={ext.iconUrl || "https://open-vsx.org/favicon.ico"} alt={ext.displayName} style={{ width: 40, height: 40, borderRadius: 6 }} onError={(e) => e.target.src = "https://open-vsx.org/favicon.ico"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ext.displayName}</div>
                   <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ext.namespace}</div>
                   <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 12, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ext.description}</div>
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, opacity: 0.6 }}>
                        <span>⬇️ {ext.downloadCount >= 1000 ? (ext.downloadCount/1000).toFixed(1) + 'k' : ext.downloadCount}</span>
                        <span>⭐ {ext.averageRating?.toFixed(1) || "-"}</span>
                      </div>
                      <button 
                        onClick={() => installExtension(ext)}
                        disabled={isInstalled}
                        style={{
                          background: isInstalled ? "transparent" : accent,
                          color: isInstalled ? textColor : "#1e1e2e",
                          border: isInstalled ? `1px solid ${borderCol}` : "none",
                          padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: "bold",
                          cursor: isInstalled ? "default" : "pointer", opacity: isInstalled ? 0.5 : 1
                        }}
                      >
                        {isInstalled ? "Installed" : "Install"}
                      </button>
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
