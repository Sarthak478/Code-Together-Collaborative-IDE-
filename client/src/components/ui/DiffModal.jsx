import { useState, useEffect } from "react"
import { API_URL } from "../../config"
import ReactDiffViewer from "react-diff-viewer-continued"
import { motion, AnimatePresence } from "framer-motion"
import { X, FileCode, Check } from "lucide-react"

export default function DiffModal({ 
  roomId, 
  filePath, 
  staged, 
  onClose, 
  themeData,
  onStage 
}) {
  const [diff, setDiff] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { accent, textColor, borderCol, panelBg, isDark, inputBg } = themeData

  useEffect(() => {
    async function getDiff() {
      setIsLoading(true)
      try {
        const res = await fetch(`${API_URL}/git/diff?roomId=${roomId}&filePath=${filePath}&staged=${staged}`)
        const data = await res.json()
        setDiff(data.diff || "")
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    getDiff()
  }, [roomId, filePath, staged])

  const diffTheme = {
    variables: {
      addedBackground: isDark ? "rgba(166, 227, 161, 0.15)" : "rgba(166, 227, 161, 0.2)",
      addedGutterBackground: isDark ? "rgba(166, 227, 161, 0.1)" : "rgba(166, 227, 161, 0.15)",
      removedBackground: isDark ? "rgba(243, 139, 168, 0.15)" : "rgba(243, 139, 168, 0.2)",
      removedGutterBackground: isDark ? "rgba(243, 139, 168, 0.1)" : "rgba(243, 139, 168, 0.15)",
      wordAddedBackground: "rgba(166, 227, 161, 0.3)",
      wordRemovedBackground: "rgba(243, 139, 168, 0.3)",
      diffViewerBackground: "transparent",
      diffViewerTitleBackground: "rgba(0,0,0,0.2)",
      diffViewerTitleColor: textColor,
      gutterBackground: "transparent",
      gutterColor: textColor,
      codeFoldGutterBackground: "transparent",
      codeFoldBackground: "rgba(255,255,255,0.05)",
      emptyLineBackground: "transparent",
      gutterBorderColor: borderCol,
    }
  }

  return (
    <div 
      style={{ 
        position: "fixed", inset: 0, zIndex: 4000, 
        display: "flex", alignItems: "center", justifyContent: "center", 
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        padding: 40
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="ide-glass-effect"
        style={{
          width: "100%", maxWidth: 1000, height: "80vh", 
          background: panelBg, borderRadius: 24, 
          border: `1px solid ${borderCol}`, overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)"
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${borderCol}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
             <FileCode size={20} color={accent} />
             <div>
               <div style={{ fontSize: 16, fontWeight: 800 }}>{filePath.split("/").pop()}</div>
               <div style={{ fontSize: 11, opacity: 0.4 }}>{filePath}</div>
             </div>
           </div>
           
           <div style={{ display: "flex", gap: 12 }}>
             {staged === "false" && onStage && (
               <button 
                onClick={() => { onStage(filePath); onClose(); }}
                className="ide-btn-premium"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
               >
                 <Check size={14} /> Stage Changes
               </button>
             )}
             <button 
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${borderCol}`, color: textColor, padding: 8, borderRadius: 10, cursor: "pointer" }}
             >
               <X size={18} />
             </button>
           </div>
        </div>

        <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", background: "rgba(0,0,0,0.1)", padding: 10 }}>
           {isLoading ? (
             <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
             </div>
           ) : diff ? (
             <ReactDiffViewer 
              styles={diffTheme}
              oldValue={""} /* The library handles unidiff string if we pass it correctly? Actually simple unidiff isn't always supported great here. */
              newValue={diff}
              splitView={true}
              useDarkTheme={isDark}
             />
           ) : (
             <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
                No textual changes detected.
             </div>
           )}
        </div>
      </motion.div>
    </div>
  )
}
