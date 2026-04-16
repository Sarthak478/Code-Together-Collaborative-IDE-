import { useState, useEffect } from "react"
import { API_URL } from "../../config"
import {
  GitBranch,
  GitCommit,
  Plus,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Trash2,
  FileJson,
  FileType,
  FileType2,
  Terminal as TerminalIcon,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Database,
  Shield,
  Layout,
  Globe,
  Package,
  Settings,
  Link,
  X,
  Check,
  Zap,
  Download,
  Upload,
  FileCode,
  Eye
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function SourceControlPanel({
  roomId,
  gitStatus,
  isGitLoading,
  onRefresh,
  themeData,
  username,
  personalPrefs,
  onOpenSettings
}) {
  const [commitMessage, setCommitMessage] = useState("")
  const [isCommitting, setIsCommitting] = useState(false)
  const [showRepoSetup, setShowRepoSetup] = useState(false)
  const [repoUrl, setRepoUrl] = useState("")
  const [isSettingUpRepo, setIsSettingUpRepo] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState("")
  const [syncSuccess, setSyncSuccess] = useState("")

  const [userRepos, setUserRepos] = useState([])
  const [isFetchingRepos, setIsFetchingRepos] = useState(false)
  const [isEditingBranch, setIsEditingBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")

  const { accent, textColor, borderCol, inputBg, panelBg } = themeData

  const hasPat = !!(personalPrefs?.githubPat?.trim())

  const handleInit = async () => {
    if (!hasPat) {
      if (onOpenSettings) onOpenSettings()
      return
    }
    try {
      const res = await fetch(`${API_URL}/git/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          roomId,
          authorName: username,
          authorEmail: personalPrefs.gitEmail || `${username}@codetogether.io`
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSyncSuccess("✓ Git Repository Initialized")
        setTimeout(() => setSyncSuccess(""), 3000)
        onRefresh()
        setShowRepoSetup(true)
      } else {
        setSyncError(data.error || "Initialization failed")
      }
    } catch (e) { console.error(e) }
  }

  const fetchUserRepos = async () => {
    if (!hasPat) return
    setIsFetchingRepos(true)
    try {
      const res = await fetch(`${API_URL}/git/user-repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pat: personalPrefs.githubPat })
      })
      if (res.ok) {
        const data = await res.json()
        setUserRepos(data)
      }
    } catch (e) { console.error(e) }
    finally { setIsFetchingRepos(false) }
  }

  const handleBranchAction = async (action, name) => {
    try {
      const res = await fetch(`${API_URL}/git/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          branchName: name || newBranchName,
          action
        })
      })
      const data = await res.json()
      if (res.ok) {
        setIsEditingBranch(false)
        setNewBranchName("")
        onRefresh()
      } else {
        setSyncError(data.error || "Branch operation failed")
      }
    } catch (e) { console.error(e) }
  }

  const handleSetupRemote = async () => {
    if (!repoUrl.trim()) return

    setIsSettingUpRepo(true)
    setSyncError("")

    try {
      const remoteRes = await fetch(`${API_URL}/git/remote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          remoteUrl: repoUrl.trim()
        })
      })

      const data = await remoteRes.json()
      if (!remoteRes.ok) {
        throw new Error(data.error || "Failed to set up remote")
      }

      setShowRepoSetup(false)
      setRepoUrl("")
      onRefresh()
    } catch (e) {
      console.error(e)
      setSyncError(e.message)
    } finally {
      setIsSettingUpRepo(false)
    }
  }

  useEffect(() => {
    if (showRepoSetup && userRepos.length === 0) {
      fetchUserRepos()
    }
  }, [showRepoSetup])

  const handlePush = async () => {
    if (!hasPat) {
      setSyncError("GitHub PAT not configured")
      return
    }

    setIsSyncing(true)
    setSyncError("")
    setSyncSuccess("")

    try {
      const res = await fetch(`${API_URL}/git/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          pat: personalPrefs.githubPat,
          username: username
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Push failed")
      }

      setSyncSuccess("✓ Successfully pushed to GitHub")
      setTimeout(() => setSyncSuccess(""), 3000)
      onRefresh()
    } catch (e) {
      console.error(e)
      setSyncError(e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePull = async () => {
    if (!hasPat) {
      setSyncError("GitHub PAT not configured")
      return
    }

    setIsSyncing(true)
    setSyncError("")
    setSyncSuccess("")

    try {
      const res = await fetch(`${API_URL}/git/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          pat: personalPrefs.githubPat,
          username: username
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Pull failed")
      }

      setSyncSuccess("✓ Successfully pulled from GitHub")
      setTimeout(() => setSyncSuccess(""), 3000)
      onRefresh()
    } catch (e) {
      console.error(e)
      setSyncError(e.message)
    } finally {
      setIsSyncing(false)
    }
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
      const res = await fetch(`${API_URL}/git/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          message: commitMessage,
          authorName: username,
          authorEmail: personalPrefs?.gitEmail || `${username}@codetogether.io`
        })
      })
      const data = await res.json()
      if (res.ok) {
        setCommitMessage("")
        onRefresh()
      } else {
        setSyncError(data.error || "Commit failed")
      }
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
            <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.6 }}>Track changes and collaborate with Git. {hasPat ? "Initialize a repository to get started." : "Configure your GitHub token in Settings first."}</p>
          </div>
          {!hasPat && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(249,226,175,0.08)", border: "1px solid rgba(249,226,175,0.2)", fontSize: 12, color: "#f9e2af", display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <SettingsIcon size={14} />
              <span>GitHub PAT not configured</span>
            </div>
          )}
          <button onClick={handleInit} className="ide-btn-premium" style={{ background: hasPat ? accent : "rgba(255,255,255,0.05)", color: hasPat ? "#1e1e2e" : textColor, border: hasPat ? "none" : `1px solid ${borderCol}`, width: "100%", justifyContent: "center" }}>
            {hasPat ? "Initialize Git Repository" : "⚙️ Open Settings to Configure GitHub"}
          </button>
        </div>
      </div>
    )
  }

  const changesCount = gitStatus.modified.length + gitStatus.not_added.length + gitStatus.deleted.length
  const hasStaged = gitStatus.staged.length > 0
  const hasRemote = !!gitStatus.remoteUrl

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${borderCol}`, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", opacity: 0.8, letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 10 }}>
          <GitBranch size={16} color={accent} /> Source Control
        </div>
        <button onClick={onRefresh} style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.4 }}>
          <RefreshCw size={14} className={isGitLoading || isSyncing ? "ide-icon-pulse" : ""} />
        </button>
      </div>

      <AnimatePresence>
        {showRepoSetup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRepoSetup(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 1999,
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)"
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                zIndex: 2000, width: "90%", maxWidth: 500,
                background: panelBg, border: `1px solid ${borderCol}`,
                borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <Link size={16} color={accent} /> Connect to GitHub Repository
                </h3>
                <button onClick={() => setShowRepoSetup(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, opacity: 0.6, display: "block", marginBottom: 8 }}>
                  Select Repository from GitHub
                </label>

                {isFetchingRepos ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", fontSize: 13, opacity: 0.5 }}>
                    <RefreshCw size={14} className="ide-icon-pulse" /> Fetching your repositories...
                  </div>
                ) : userRepos.length > 0 ? (
                  <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 10, border: `1px solid ${borderCol}`, background: inputBg }} className="ide-scroll">
                    {userRepos.map(repo => (
                      <div
                        key={repo.name}
                        onClick={() => {
                          setRepoUrl(repo.url)
                        }}
                        style={{
                          padding: "10px 12px", borderBottom: `1px solid ${borderCol}`, fontSize: 12,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                          background: repoUrl === repo.url ? `${accent}15` : "transparent",
                          transition: "background 0.2s"
                        }}
                      >
                        <Package size={14} color={repoUrl === repo.url ? accent : textColor} opacity={repoUrl === repo.url ? 1 : 0.6} />
                        <span style={{ flex: 1, fontWeight: repoUrl === repo.url ? 700 : 400 }}>{repo.name}</span>
                        {repoUrl === repo.url && <Check size={14} color={accent} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 16, textAlign: "center", opacity: 0.5, fontSize: 12, border: `1px solid ${borderCol}`, borderRadius: 10 }}>
                    No repositories found. Ensure your PAT has "Contents: Read" and "Metadata: Read" permissions.
                  </div>
                )}
              </div>

              {syncError && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(243, 139, 168, 0.1)", border: "1px solid rgba(243, 139, 168, 0.3)", fontSize: 11, color: "#f38ba8", marginBottom: 16 }}>
                  {syncError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowRepoSetup(false)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10,
                    background: "rgba(255,255,255,0.05)", color: textColor,
                    border: `1px solid ${borderCol}`, fontSize: 12, fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetupRemote}
                  disabled={isSettingUpRepo || !repoUrl.trim()}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10,
                    background: repoUrl.trim() ? accent : "rgba(255,255,255,0.05)",
                    color: repoUrl.trim() ? "#1e1e2e" : textColor,
                    border: "none", fontSize: 12, fontWeight: 700,
                    cursor: repoUrl.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  {isSettingUpRepo ? <RefreshCw size={12} className="ide-icon-pulse" /> : <Check size={14} />}
                  {isSettingUpRepo ? "Connecting..." : "Connect"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
        <div style={{ marginBottom: 20, padding: "8px 12px", background: "rgba(255,255,255,0.01)", borderRadius: 10, border: `1px solid ${borderCol}`, display: "flex", alignItems: "center", gap: 10 }}>
          <GitBranch size={14} color={accent} />
          {isEditingBranch ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <input
                autoFocus
                placeholder="branch name..."
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleBranchAction("rename")
                  if (e.key === "Escape") setIsEditingBranch(false)
                }}
                style={{
                  background: inputBg, border: "none", outline: "none", color: textColor,
                  fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, width: "100%"
                }}
              />
              <button onClick={() => handleBranchAction("rename")} style={{ background: "transparent", border: "none", cursor: "pointer", color: accent }}>
                <Check size={14} />
              </button>
            </div>
          ) : (
            <span
              onClick={() => {
                setNewBranchName(gitStatus.current || "main")
                setIsEditingBranch(true)
              }}
              style={{
                fontSize: 11, fontWeight: 700, opacity: 1, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4
              }}
            >
              {gitStatus.current || "main"} <ChevronDown size={10} opacity={0.4} />
            </span>
          )}
        </div>

        {syncSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "rgba(166, 227, 161, 0.1)", border: "1px solid rgba(166, 227, 161, 0.3)", fontSize: 11, color: "#a6e3a1", display: "flex", alignItems: "center", gap: 8 }}
          >
            <Check size={14} /> {syncSuccess}
          </motion.div>
        )}

        {syncError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "rgba(243, 139, 168, 0.1)", border: "1px solid rgba(243, 139, 168, 0.3)", fontSize: 11, color: "#f38ba8", display: "flex", alignItems: "center", gap: 8 }}
          >
            <X size={14} /> {syncError}
          </motion.div>
        )}

        {gitStatus.staged.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, textTransform: "uppercase", marginBottom: 10 }}>Staged Changes ({gitStatus.staged.length})</div>
            {gitStatus.staged.map(path => (
              <GitFileItem key={path} path={path} type="staged" onAction={() => handleUnstageFile(path)} accent={accent} textColor={textColor} />
            ))}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, textTransform: "uppercase", marginBottom: 10 }}>Changes ({changesCount})</div>
          {[...gitStatus.modified, ...gitStatus.not_added, ...gitStatus.deleted].map(path => (
            <GitFileItem key={path} path={path} type="modified" onAction={() => handleStageFile(path)} accent={accent} textColor={textColor} />
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${borderCol}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Zap size={14} color={accent} /> GitHub Sync
          </div>
          {!hasRemote ? (
            <button onClick={() => setShowRepoSetup(true)} className="ide-btn-premium" style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "8px 0", background: "transparent", border: `1px solid ${accent}`, color: accent }}>
              Connect Repository
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handlePull} disabled={isSyncing} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: `1px solid ${borderCol}`, color: textColor, padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: isSyncing ? "not-allowed" : "pointer" }}>
                <Download size={14} /> Pull
              </button>
              <button onClick={handlePush} disabled={isSyncing} className="ide-btn-premium" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: accent, border: "none", color: "#1e1e2e", padding: "8px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: isSyncing ? "not-allowed" : "pointer" }}>
                <Upload size={14} /> Push
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const getFileIcon = (name) => {
  const ext = name.split(".").pop().toLowerCase()
  const props = { size: 14 }
  switch (ext) {
    case "json": return <FileJson {...props} color="#f9e2af" />
    case "md": return <FileType {...props} color="#89b4fa" />
    case "css": case "scss": return <FileType2 {...props} color="#fab387" />
    case "py": return <FileType2 {...props} color="#89dceb" />
    case "js": case "jsx": return <FileCode {...props} color="#f9e2af" />
    case "ts": case "tsx": return <FileCode {...props} color="#89b4fa" />
    case "html": return <Globe {...props} color="#eba0ac" />
    case "png": case "jpg": case "jpeg": case "svg": case "gif": return <ImageIcon {...props} color="#a6e3a1" />
    default: return <FileCode {...props} />
  }
}

function GitFileItem({ path, type, onAction, accent, textColor }) {
  const [hovered, setHovered] = useState(false)
  const isDeleted = path.startsWith("deleted ")
  const displayPath = path.replace("modified ", "").replace("deleted ", "")
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, background: hovered ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.2s" }}>
      {getFileIcon(displayPath)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: isDeleted ? "#f38ba8" : textColor, textDecoration: isDeleted ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayPath.split("/").pop()}</div>
        <div style={{ fontSize: 9, opacity: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayPath}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {hovered && (
          <button onClick={() => onAction(displayPath)} style={{ background: "transparent", border: "none", cursor: "pointer", color: accent, padding: 4 }}>
            {type === "staged" ? <RotateCcw size={14} /> : <Plus size={14} />}
          </button>
        )}
        <div style={{ fontSize: 10, fontWeight: 800, color: type === "staged" ? accent : "#a6e3a1", padding: "2px 6px", borderRadius: 4, background: type === "staged" ? `${accent}15` : "#a6e3a115" }}>{type === "staged" ? "A" : "M"}</div>
      </div>
    </div>
  )
}
