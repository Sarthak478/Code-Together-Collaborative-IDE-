import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Folder, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FilePlus, 
  FolderPlus,
  FileUp,
  FolderUp,
  Search,
  MoreVertical,
  X,
  Pencil,
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
  Globe
} from "lucide-react"

export default function FileExplorer({ fs, activeFile, onFileClick, isHost, canEdit, textColor, borderCol, inputBg, panelBg, accent, isDark, headerBg }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [creatingIn, setCreatingIn] = useState(null) // parentPath where we're creating
  const [creatingType, setCreatingType] = useState(null) // 'file' | 'folder' | null
  const [newName, setNewName] = useState("")
  const [expandedFolders, setExpandedFolders] = useState(new Set([]))
  const [renamingPath, setRenamingPath] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const renameInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const creationInputRef = useRef(null)
  const [pendingFolderImport, setPendingFolderImport] = useState(null) // files awaiting confirmation

  // Focus the creation input when it appears
  useEffect(() => {
    if (creatingType && creationInputRef.current) {
      creationInputRef.current.focus()
    }
  }, [creatingType, creatingIn])

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingPath])

  const startRename = (path, currentName) => {
    setRenamingPath(path)
    setRenameValue(currentName)
  }

  const handleRenameSubmit = async (e) => {
    if (e.key === "Enter" && renameValue.trim() && renameValue.trim() !== renamingPath.split("/").pop()) {
      const path = renamingPath
      const newN = renameValue.trim()
      setRenamingPath(null)
      setRenameValue("")
      if (fs.renameEntry) await fs.renameEntry(path, newN)
    } else if (e.key === "Escape") {
      setRenamingPath(null)
      setRenameValue("")
    }
  }

  const handleImport = async (e, mode) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    if (mode === "folder") {
      // Folder import: show confirmation dialog first
      const rootName = files[0]?.webkitRelativePath?.split("/")[0] || "folder"
      setPendingFolderImport({ files, rootName, count: files.length })
    } else {
      // File import: proceed directly
      if (fs.importFiles) await fs.importFiles(files, "/")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (folderInputRef.current) folderInputRef.current.value = ""
  }

  const confirmFolderImport = async () => {
    if (pendingFolderImport && fs.importFiles) {
      const files = pendingFolderImport.files
      setPendingFolderImport(null)
      await fs.importFiles(files, "/")
    }
  }

  const cancelFolderImport = () => {
    setPendingFolderImport(null)
    if (folderInputRef.current) folderInputRef.current.value = ""
  }

  const handleCreateSubmit = async (e) => {
    if (e.key === "Enter" && newName.trim()) {
      const type = creatingType
      const name = newName.trim()
      const parentPath = creatingIn || "/"
      setCreatingType(null)
      setCreatingIn(null)
      setNewName("")
      
      if (type === "file") {
        await fs.createFile(parentPath, name)
      } else {
        await fs.createFolder(parentPath, name)
      }
    } else if (e.key === "Escape") {
      setCreatingType(null)
      setCreatingIn(null)
      setNewName("")
    }
  }

  const startCreation = (type, parentPath = "/") => {
    setCreatingType(type)
    setCreatingIn(parentPath)
    setNewName("")
    // Auto-expand the folder where we're creating
    if (parentPath !== "/") {
      setExpandedFolders(prev => new Set([...prev, parentPath]))
    }
    setTimeout(() => creationInputRef.current?.focus(), 50)
  }

  const toggleFolder = async (folderPath) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
        // Load children when expanding
        fs.refreshPath(folderPath)
      }
      return next
    })
  }
  
  // For search mode, use flat list
  const allFiles = useMemo(() => fs.getAllFiles(), [fs])
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return null
    return allFiles.filter(f => f.path.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [allFiles, searchTerm])

  // Root children for tree view
  const rootChildren = useMemo(() => fs.getChildren("/"), [fs, fs.version])

  const handleDelete = async (path, type) => {
    const itemName = path.split("/").pop()
    const confirmMsg = type === "folder" 
      ? `Are you sure you want to delete the folder "${itemName}" and all its contents?`
      : `Are you sure you want to delete "${itemName}"?`
    
    if (window.confirm(confirmMsg)) {
      if (fs.deleteEntry) await fs.deleteEntry(path)
    }
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
      case "yaml": case "yml": case "toml": return <SettingsIcon {...props} color="#94e2d5" />
      case "sql": return <Database {...props} color="#cba6f7" />
      case "env": return <Shield {...props} color="#eba0ac" />
      case "sh": case "bash": return <TerminalIcon {...props} color="#89dceb" />
      default: return <FileCode {...props} />
    }
  }

  return (
    <div 
      className="ide-glass-effect"
      style={{ 
        width: 260, display: "flex", flexDirection: "column", 
        borderRight: `1px solid ${borderCol}`, background: panelBg,
        margin: "0 0 10px 10px", borderRadius: 12, height: "calc(100% - 10px)",
        overflow: "hidden", position: "relative"
      }}
    >
      <ImportOverlay progress={fs.importProgress} accent={accent} textColor={textColor} panelBg={panelBg} borderCol={borderCol} />
      {/* Explorer Header */}
      <div style={{ 
        padding: "12px 16px", background: "rgba(255,255,255,0.03)", 
        borderBottom: `1px solid ${borderCol}`, display: "flex", 
        alignItems: "center", justifyContent: "space-between" 
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.6, letterSpacing: "1px" }}>
          Explorer
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}
          >
            <Search size={14} />
          </button>
          {canEdit && (
            <>
              <button 
                title="New File (root)"
                onClick={() => startCreation("file", "/")}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}
              >
                <FilePlus size={14} />
              </button>
              <button 
                title="New Folder (root)" 
                onClick={() => startCreation("folder", "/")}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}
              >
                <FolderPlus size={14} />
              </button>
            </>
          )}
          {isHost && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import Files"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}
              >
                <FileUp size={14} />
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                title="Import Folder"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}
              >
                <FolderUp size={14} />
              </button>
              <input type="file" multiple ref={fileInputRef} onChange={e => handleImport(e, "file")} style={{ display: "none" }} />
              <input type="file" multiple webkitdirectory="true" ref={folderInputRef} onChange={e => handleImport(e, "folder")} style={{ display: "none" }} />
            </>
          )}
        </div>
      </div>

      {/* Folder Import Confirmation Dialog */}
      <AnimatePresence>
        {pendingFolderImport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "12px 14px", borderBottom: `1px solid ${borderCol}`,
              background: isDark ? "rgba(255,180,50,0.06)" : "rgba(255,180,50,0.1)",
              display: "flex", flexDirection: "column", gap: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <FolderUp size={14} color={accent} />
                Import "{pendingFolderImport.rootName}"?
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.5 }}>
                This will <strong>replace all existing files</strong> with {pendingFolderImport.count.toLocaleString()} files from this folder.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={confirmFolderImport}
                  style={{
                    flex: 1, padding: "6px 12px", borderRadius: 6, border: "none",
                    background: accent, color: "#fff", fontWeight: 700, fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  Replace & Import
                </button>
                <button
                  onClick={cancelFolderImport}
                  style={{
                    padding: "6px 12px", borderRadius: 6, border: `1px solid ${borderCol}`,
                    background: "transparent", color: textColor, fontWeight: 600, fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      {isSearchOpen && (
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${borderCol}`, background: "rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", background: inputBg, borderRadius: 6, padding: "4px 8px", border: `1px solid ${borderCol}` }}>
            <Search size={12} opacity={0.4} />
            <input 
              type="text" 
              placeholder="Search files..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: "transparent", border: "none", color: textColor, fontSize: 12, paddingLeft: 8, outline: "none", flex: 1 }}
            />
            {searchTerm && <X size={12} opacity={0.4} cursor="pointer" onClick={() => setSearchTerm("")} />}
          </div>
        </div>
      )}

      {/* File Tree */}
      <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 4px" }}>
        {filteredFiles ? (
          /* Search results — flat list */
          filteredFiles.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", opacity: 0.4, fontSize: 12 }}>
              No files found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredFiles.map(file => (
                <FileItem 
                  key={file.path}
                  file={file}
                  isActive={activeFile === file.path}
                  onClick={onFileClick}
                  textColor={textColor}
                  accent={accent}
                  depth={0}
                />
              ))}
            </div>
          )
        ) : (
          /* Tree view */
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Root-level creation input */}
            {creatingType && creatingIn === "/" && (
              <CreationInput
                ref={creationInputRef}
                creatingType={creatingType}
                newName={newName}
                setNewName={setNewName}
                onKeyDown={handleCreateSubmit}
                onBlur={() => { if (!newName.trim()) { setCreatingType(null); setCreatingIn(null) } }}
                accent={accent}
                textColor={textColor}
                depth={0}
              />
            )}
            {rootChildren.length === 0 && !creatingType ? (
              <div style={{ padding: 20, textAlign: "center", opacity: 0.4, fontSize: 12 }}>
                No files yet
              </div>
            ) : (
              rootChildren.map(entry => (
                entry.type === "folder" ? (
                  <FolderNode
                    key={entry.path}
                    entry={entry}
                    fs={fs}
                    activeFile={activeFile}
                    onFileClick={onFileClick}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    canEdit={canEdit}
                    startCreation={startCreation}
                    creatingIn={creatingIn}
                    creatingType={creatingType}
                    creationInputRef={creationInputRef}
                    newName={newName}
                    setNewName={setNewName}
                    handleCreateSubmit={handleCreateSubmit}
                    setCreatingType={setCreatingType}
                    setCreatingIn={setCreatingIn}
                    textColor={textColor}
                    accent={accent}
                    depth={0}
                    startRename={startRename}
                    renamingPath={renamingPath}
                    renameValue={renameValue}
                    setRenameValue={setRenameValue}
                    renameInputRef={renameInputRef}
                    handleRenameSubmit={handleRenameSubmit}
                    onDelete={handleDelete}
                  />
                ) : (
                  <FileItem
                    key={entry.path}
                    file={entry}
                    isActive={activeFile === entry.path}
                    onClick={onFileClick}
                    textColor={textColor}
                    accent={accent}
                    depth={0}
                    canEdit={canEdit}
                    startRename={startRename}
                    renamingPath={renamingPath}
                    renameValue={renameValue}
                    setRenameValue={setRenameValue}
                    renameInputRef={renameInputRef}
                    handleRenameSubmit={handleRenameSubmit}
                    onDelete={handleDelete}
                    getFileIcon={getFileIcon}
                  />
                )
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Folder Node (recursive) ── */
function FolderNode({ entry, fs, activeFile, onFileClick, expandedFolders, toggleFolder, canEdit, startCreation, creatingIn, creatingType, creationInputRef, newName, setNewName, handleCreateSubmit, setCreatingType, setCreatingIn, textColor, accent, depth, startRename, renamingPath, renameValue, setRenameValue, renameInputRef, handleRenameSubmit, onDelete }) {
  const isExpanded = expandedFolders.has(entry.path)
  const children = fs.getChildren(entry.path)
  const [isHovered, setIsHovered] = useState(false)
  const isRenaming = renamingPath === entry.path

  return (
    <div>
      {/* Folder row */}
      <div
        style={{
          padding: `4px 8px 4px ${8 + depth * 16}px`,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          color: textColor,
          transition: "background 0.1s ease",
          height: 30,
          boxSizing: "border-box",
          background: isHovered ? "rgba(255,255,255,0.04)" : "transparent"
        }}
        onClick={() => toggleFolder(entry.path)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isExpanded ? <ChevronDown size={12} opacity={0.5} /> : <ChevronRight size={12} opacity={0.5} />}
        <Folder size={14} fill={isExpanded ? `${accent}33` : "transparent"} color={isExpanded ? accent : textColor} />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={handleRenameSubmit}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: `1px solid ${accent}`, borderRadius: 4, color: textColor, fontSize: 12, padding: "2px 6px", outline: "none" }}
          />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.name}
          </span>
        )}
        {/* Per-folder action buttons */}
        {canEdit && isHovered && !isRenaming && (
          <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
            <button
              title="Rename"
              onClick={() => startRename(entry.path, entry.name)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, padding: 2, opacity: 0.7 }}
            >
              <Pencil size={11} />
            </button>
            <button
              title={`New File in ${entry.name}`}
              onClick={() => startCreation("file", entry.path)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: accent, padding: 2, opacity: 0.7 }}
            >
              <FilePlus size={12} />
            </button>
            <button
              title={`New Folder in ${entry.name}`}
              onClick={() => startCreation("folder", entry.path)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: accent, padding: 2, opacity: 0.7 }}
            >
              <FolderPlus size={12} />
            </button>
            <button
              title={`Delete ${entry.name}`}
              onClick={() => onDelete(entry.path, "folder")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f38ba8", padding: 2, opacity: 0.7 }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Expanded children */}
      {isExpanded && (
        <div>
          {/* Creation input inside this folder */}
          {creatingType && creatingIn === entry.path && (
            <CreationInput
              ref={creationInputRef}
              creatingType={creatingType}
              newName={newName}
              setNewName={setNewName}
              onKeyDown={handleCreateSubmit}
              onBlur={() => { if (!newName.trim()) { setCreatingType(null); setCreatingIn(null) } }}
              accent={accent}
              textColor={textColor}
              depth={depth + 1}
            />
          )}
          {children.map(child => (
            child.type === "folder" ? (
              <FolderNode
                key={child.path}
                entry={child}
                fs={fs}
                activeFile={activeFile}
                onFileClick={onFileClick}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                canEdit={canEdit}
                startCreation={startCreation}
                creatingIn={creatingIn}
                creatingType={creatingType}
                creationInputRef={creationInputRef}
                newName={newName}
                setNewName={setNewName}
                handleCreateSubmit={handleCreateSubmit}
                setCreatingType={setCreatingType}
                setCreatingIn={setCreatingIn}
                textColor={textColor}
                accent={accent}
                depth={depth + 1}
                startRename={startRename}
                renamingPath={renamingPath}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                renameInputRef={renameInputRef}
                handleRenameSubmit={handleRenameSubmit}
                onDelete={onDelete}
              />
            ) : (
              <FileItem
                key={child.path}
                file={child}
                isActive={activeFile === child.path}
                onClick={onFileClick}
                textColor={textColor}
                accent={accent}
                depth={depth + 1}
                canEdit={canEdit}
                startRename={startRename}
                renamingPath={renamingPath}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                renameInputRef={renameInputRef}
                handleRenameSubmit={handleRenameSubmit}
                onDelete={onDelete}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Creation Input ── */
import { forwardRef } from "react"

const CreationInput = forwardRef(function CreationInput({ creatingType, newName, setNewName, onKeyDown, onBlur, accent, textColor, depth }, ref) {
  return (
    <div style={{
      padding: `4px 8px 4px ${8 + depth * 16}px`,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.05)",
      border: `1px solid ${accent}44`,
      margin: "1px 4px"
    }}>
      {creatingType === "folder" ? <FolderPlus size={13} color={accent} /> : <FilePlus size={13} color={accent} />}
      <input
        ref={ref}
        type="text"
        value={newName}
        onChange={e => setNewName(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={creatingType === "folder" ? "Folder name..." : "File name..."}
        style={{
          background: "transparent", border: "none", color: textColor,
          fontSize: 12, outline: "none", width: "100%"
        }}
      />
    </div>
  )
})

/* ── File Item ── */
function FileItem({ file, isActive, onClick, textColor, accent, depth, canEdit, startRename, renamingPath, renameValue, setRenameValue, renameInputRef, handleRenameSubmit, onDelete, getFileIcon }) {
  const [isHovered, setIsHovered] = useState(false)
  const isRenaming = renamingPath === file.path

  if (isRenaming) {
    return (
      <div
        style={{
          padding: `4px 8px 4px ${8 + (depth + 1) * 16}px`,
          borderRadius: 6, display: "flex", alignItems: "center", gap: 8,
          background: `${accent}10`, height: 30, boxSizing: "border-box"
        }}
      >
        <FileCode size={14} color={accent} />
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={handleRenameSubmit}
          style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: `1px solid ${accent}`, borderRadius: 4, color: textColor, fontSize: 12, padding: "2px 6px", outline: "none" }}
        />
      </div>
    )
  }

  return (
    <div 
      className={`ide-file-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(file.path)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: `4px 8px 4px ${8 + (depth + 1) * 16}px`,
        borderRadius: 6, display: "flex", alignItems: "center", gap: 8,
        background: isActive ? `${accent}15` : (isHovered ? "rgba(255,255,255,0.03)" : "transparent"),
        color: isActive ? accent : textColor,
        transition: "all 0.15s ease", height: 30, boxSizing: "border-box", cursor: "pointer"
      }}
    >
      {getFileIcon ? getFileIcon(file.name) : <FileCode size={14} opacity={isActive ? 1 : 0.6} />}
      <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {file.name}
      </span>
      {canEdit && isHovered && (
        <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
          <button
            title="Rename"
            onClick={e => { e.stopPropagation(); startRename && startRename(file.path, file.name) }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, padding: 2, opacity: 0.6, flexShrink: 0 }}
          >
            <Pencil size={11} />
          </button>
          <button
            title="Delete"
            onClick={e => { e.stopPropagation(); onDelete && onDelete(file.path, "file") }}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f38ba8", padding: 2, opacity: 0.6, flexShrink: 0 }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
      {isActive && !isHovered && (
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, marginLeft: "auto" }} />
      )}
    </div>
  )
}

/* ── Import Overlay ── */
function ImportOverlay({ progress, accent, textColor, panelBg, borderCol }) {
  if (!progress) return null
  const percent = Math.round((progress.current / progress.total) * 100)
  
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", zIndex: 100,
      backdropFilter: "blur(4px)", padding: 20, textAlign: "center"
    }}>
      <div style={{ color: accent, marginBottom: 12 }}>
        <FileUp size={32} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 4 }}>
        Importing Files...
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, color: textColor, marginBottom: 16, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {progress.fileName}
      </div>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: accent, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: borderCol }}>
        {progress.current} / {progress.total}
      </div>
    </div>
  )
}
