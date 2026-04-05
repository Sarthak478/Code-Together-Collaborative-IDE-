import { useState } from "react"
import { API_URL } from "../../config"
import { 
  GitBranch, 
  GitCommit, 
  Plus, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw,
  FileCode,
  FileDiff,
  Zap,
  Package,
  History,
  Check,
  Eye
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SourceControlPanel({ 
  roomId, 
  gitStatus, 
  isGitLoading, 
  onRefresh, 
  themeData,
  username
}) {
  const [commitMessage, setCommitMessage] = useState("")
  const [isCommitting, setIsCommitting] = useState(false)
  const { accent, textColor, borderCol, inputBg, panelBg } = themeData

  const handleInit = async () => {
    try {
      const res = await fetch(`${API_URL}/git/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) onRefresh()
    } catch (e) { console.error(e) }
  }

  const handleStageFile = async (filePath) => {
    try {
      await fetch(`${API_URL}/git/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, filePaths: [filePath] })
      })
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const handleUnstageFile = async (filePath) => {
    try {
      await fetch(`${API_URL}/git/unstage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, filePaths: [filePath] })
      })
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    setIsCommitting(true)
    try {
      await fetch(`${API_URL}/git/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomId, 
          message: commitMessage,
          authorName: username,
          authorEmail: `${username}@codetogether.io`
        })
      })
      setCommitMessage("")
      onRefresh()
    } catch (e) { console.error(e) }
    finally { setIsCommitting(false) }
  }

  if (!gitStatus || !gitStatus.isRepo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${borderCol}`, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", opacity: 0.8, letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 10 }}>
            <GitBranch size={16} color={accent} /> Source Control
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={32} color={accent} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700 }}>Version Control</h3>
            <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.6 }}>Track changes and collaborate with Git. Initialize a repository to get started.</p>
          </div>
          <button onClick={handleInit} className="ide-btn-premium" style={{ background: accent, color: "#1e1e2e", border: "none", width: "100%", justifyContent: "center" }}>
            Initialize Git
          </button>
        </div>
      </div>
    )
  }

  const changesCount = gitStatus.modified.length + gitStatus.not_added.length + gitStatus.deleted.length
  const hasStaged = gitStatus.staged.length > 0

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${borderCol}`, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", opacity: 0.8, letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          <GitBranch size={16} color={accent} /> Source Control
        </div>
        <button onClick={onRefresh} style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.4 }}>
          <RefreshCw size={14} className={isGitLoading ? "ide-icon-pulse" : ""} />
        </button>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
         <div style={{ position: "relative" }}>
           <textarea 
            placeholder="Commit message..."
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            style={{
              width: "100%", height: 80, background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
              borderRadius: 12, padding: "10px 12px", outline: "none", fontSize: 13, resize: "none", boxSizing: "border-box",
              fontFamily: "inherit"
            }}
           />
           {commitMessage && (
             <motion.button 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={handleCommit}
              disabled={isCommitting || !hasStaged}
              style={{
                position: "absolute", bottom: 10, right: 10, 
                background: hasStaged ? accent : "rgba(255,255,255,0.05)", 
                color: hasStaged ? "#1e1e2e" : textColor,
                border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                cursor: hasStaged ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6,
                boxShadow: hasStaged ? `0 4px 12px ${accent}44` : "none"
              }}
             >
                {isCommitting ? <RefreshCw size={12} className="ide-icon-pulse" /> : <GitCommit size={14} />}
                {isCommitting ? "Committing..." : "Commit"}
             </motion.button>
           )}
         </div>
      </div>

      <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        
        {/* Branch Info */}
        <div style={{ marginBottom: 20, padding: "8px 12px", background: "rgba(255,255,255,0.01)", borderRadius: 10, border: `1px solid ${borderCol}`, display: "flex", alignItems: "center", gap: 10 }}>
           <GitBranch size={14} color={accent} />
           <span style={{ fontSize: 11, fontWeight: 700, opacity: 1 }}>{gitStatus.current || "main"}</span>
           <span style={{ fontSize: 10, opacity: 0.4, marginLeft: "auto" }}>Local Repository</span>
        </div>

        {/* Staged Changes */}
        {gitStatus.staged.length > 0 && (
          <div style={{ marginBottom: 20 }}>
             <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, textTransform: "uppercase", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <span>Staged Changes ({gitStatus.staged.length})</span>
             </div>
             {gitStatus.staged.map(path => (
               <GitFileItem 
                key={path} 
                path={path} 
                type="staged" 
                onAction={() => handleUnstageFile(path)} 
                onViewDiff={() => props.onViewDiff(path.replace("modified ", "").replace("deleted ", ""), "true")}
                accent={accent} 
                textColor={textColor} 
               />
             ))}
          </div>
        )}

        {/* Changes */}
        <div style={{ marginBottom: 20 }}>
           <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, textTransform: "uppercase", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
              <span>Changes ({changesCount})</span>
           </div>
           
           {[...gitStatus.modified, ...gitStatus.not_added, ...gitStatus.deleted].map(path => (
              <GitFileItem 
                key={path} 
                path={path} 
                type="modified" 
                onAction={() => handleStageFile(path)} 
                onViewDiff={() => props.onViewDiff(path.replace("modified ", "").replace("deleted ", ""), "false")}
                accent={accent} 
                textColor={textColor} 
              />
           ))}

           {changesCount === 0 && gitStatus.staged.length === 0 && (
             <div style={{ padding: 20, textAlign: "center", opacity: 0.3, fontSize: 12 }}>
                No changes in working directory.
             </div>
           )}
        </div>

        {/* Remote Info */}
        <div style={{ marginTop: "auto", padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${borderCol}` }}>
           <div style={{ fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Zap size={14} color={accent} /> Sync to GitHub
           </div>
           <p style={{ fontSize: 10, opacity: 0.5, margin: "0 0 12px 0", lineHeight: 1.4 }}>Ensure your PAT is configured in settings to push your changes.</p>
           <button className="ide-btn-premium" style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "8px 0", background: "transparent", border: `1px solid ${accent}`, color: accent }}>
              Publish Repository
           </button>
        </div>
      </div>
    </div>
  )
}

function GitFileItem({ path, type, onAction, onViewDiff, accent, textColor }) {
  const [hovered, setHovered] = useState(false)
  const isDeleted = path.startsWith("deleted ") // Simplified check
  const displayPath = path.replace("modified ", "").replace("deleted ", "")

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", 
        borderRadius: 8, background: hovered ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.2s"
      }}
    >
      <FileCode size={14} opacity={0.6} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayPath.split("/").pop()}
        </div>
        <div style={{ fontSize: 9, opacity: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayPath}
        </div>
      </div>
      
      <div style={{ display: "flex", gap: 4 }}>
        {hovered && (
          <>
            <button onClick={() => onViewDiff(displayPath)} title="View Diff" style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}>
              <Eye size={14} />
            </button>
            <button onClick={() => onAction(displayPath)} style={{ background: "transparent", border: "none", cursor: "pointer", color: accent, padding: 4 }}>
              {type === "staged" ? <RotateCcw size={14} /> : <Plus size={14} />}
            </button>
          </>
        )}
        <div style={{ fontSize: 10, fontWeight: 800, color: type === "staged" ? accent : "#a6e3a1", padding: "2px 6px", borderRadius: 4, background: type === "staged" ? `${accent}15` : "#a6e3a115" }}>
          {type === "staged" ? "A" : "M"}
        </div>
      </div>
    </div>
  )
}
