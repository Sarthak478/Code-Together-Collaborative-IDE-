import { useState, useCallback, useEffect, useRef } from "react"
import { FILE_ICONS, FOLDER_ICON, FOLDER_OPEN_ICON, DEFAULT_FILE_ICON } from "../../constants/editorConfigs"

function getIcon(entry) {
  if (entry.type === "folder") return null // handled inline
  const ext = entry.name.split(".").pop()?.toLowerCase() || ""
  return FILE_ICONS[ext] || DEFAULT_FILE_ICON
}

/* ── Context Menu ── */
function ContextMenu({ x, y, items, onClose, panelBg, borderCol, textColor }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener("click", handler)
    document.addEventListener("contextmenu", handler)
    return () => {
      document.removeEventListener("click", handler)
      document.removeEventListener("contextmenu", handler)
    }
  }, [onClose])

  return (
    <div ref={ref} className="ide-context-menu" style={{ left: x, top: y, background: panelBg, border: `1px solid ${borderCol}`, color: textColor }}>
      {items.map((item, i) =>
        item.separator
          ? <div key={i} className="ide-context-menu-sep" style={{ background: borderCol }} />
          : <div key={i} className="ide-context-menu-item" onClick={(e) => { e.stopPropagation(); item.action(); onClose() }}>
            <span style={{ width: 18, textAlign: "center", fontSize: 13 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
      )}
    </div>
  )
}

/* ── Single Tree Item ── */
function TreeItem({ entry, depth, fs, activeFile, onFileClick, expandedFolders, toggleFolder, onContextMenu, textColor, borderCol, inputBg, accent, isDark }) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const inputRef = useRef(null)
  const isActive = activeFile === entry.path
  const isFolder = entry.type === "folder"
  const isExpanded = expandedFolders.has(entry.path)

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus()
      const dotIdx = renameValue.lastIndexOf(".")
      inputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : renameValue.length)
    }
  }, [renaming, renameValue])

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== entry.name) {
      fs.renameEntry(entry.path, trimmed)
    }
    setRenaming(false)
  }

  const handleRename = () => {
    setRenameValue(entry.name)
    setRenaming(true)
  }

  const paddingLeft = 12 + depth * 16

  return (
    <>
      <div
        className={`ide-file-item ${isActive ? 'active' : ''}`}
        style={{
          paddingLeft,
          background: isActive
            ? (isDark ? 'rgba(137,180,250,0.12)' : 'rgba(13,110,253,0.08)')
            : 'transparent',
          color: isActive ? accent : textColor,
          borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent'
        }}
        onClick={() => {
          if (isFolder) toggleFolder(entry.path)
          else onFileClick(entry.path)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(e, entry, handleRename)
        }}
      >
        {isFolder ? (
          <span style={{ fontSize: 12, width: 16, textAlign: "center", transition: "transform 0.15s" }}>
            {isExpanded ? FOLDER_OPEN_ICON : FOLDER_ICON}
          </span>
        ) : (
          <span style={{ fontSize: 13, width: 16, textAlign: "center" }}>{getIcon(entry)}</span>
        )}
        {renaming ? (
          <input
            ref={inputRef}
            className="ide-rename-input"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") setRenaming(false)
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</span>
        )}
      </div>
      {/* Render children if folder is expanded */}
      {isFolder && isExpanded && (
        <TreeChildren
          parentPath={entry.path}
          depth={depth + 1}
          fs={fs}
          activeFile={activeFile}
          onFileClick={onFileClick}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onContextMenu={onContextMenu}
          textColor={textColor}
          borderCol={borderCol}
          inputBg={inputBg}
          accent={accent}
          isDark={isDark}
        />
      )}
    </>
  )
}

function TreeChildren({ parentPath, depth, fs, activeFile, onFileClick, expandedFolders, toggleFolder, onContextMenu, textColor, borderCol, inputBg, accent, isDark }) {
  const children = fs.getChildren(parentPath)
  return children.map(child => (
    <TreeItem
      key={child.path}
      entry={child}
      depth={depth}
      fs={fs}
      activeFile={activeFile}
      onFileClick={onFileClick}
      expandedFolders={expandedFolders}
      toggleFolder={toggleFolder}
      onContextMenu={onContextMenu}
      textColor={textColor}
      borderCol={borderCol}
      inputBg={inputBg}
      accent={accent}
      isDark={isDark}
    />
  ))
}

/* ── File Explorer ── */
export default function FileExplorer({ fs, activeFile, onFileClick, isHost, canEdit, textColor, borderCol, inputBg, panelBg, accent, isDark, headerBg }) {
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const [creatingType, setCreatingType] = useState(null) // 'file' | 'folder' | null
  const [creatingParent, setCreatingParent] = useState("/")
  const [newItemName, setNewItemName] = useState("")
  const newItemRef = useRef(null)

  useEffect(() => {
    if (creatingType && newItemRef.current) newItemRef.current.focus()
  }, [creatingType])

  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        if (fs.refreshPath) fs.refreshPath(path)
      }
      return next
    })
  }, [fs])

  const handleContextMenu = useCallback((e, entry, onRename) => {
    const items = []
    if (entry.type === "folder") {
      items.push({ icon: "📄", label: "New File", action: () => { setCreatingType("file"); setCreatingParent(entry.path); setNewItemName("") } })
      items.push({ icon: "📁", label: "New Folder", action: () => { setCreatingType("folder"); setCreatingParent(entry.path); setNewItemName(""); setExpandedFolders(prev => new Set([...prev, entry.path])) } })
      items.push({ separator: true })
    }
    if (canEdit) {
      items.push({ icon: "✏️", label: "Rename", action: onRename })
      items.push({ icon: "🗑️", label: "Delete", action: () => { if (confirm(`Delete "${entry.name}"?`)) fs.deleteEntry(entry.path) } })
    }
    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }, [canEdit, fs])

  const commitCreate = () => {
    const name = newItemName.trim()
    if (!name) { setCreatingType(null); return }
    if (creatingType === "file") fs.createFile(creatingParent, name)
    else fs.createFolder(creatingParent, name)
    setCreatingType(null)
    setNewItemName("")
  }

  return (
    <div style={{ width: 240, minWidth: 200, display: "flex", flexDirection: "column", background: isDark ? '#181825' : '#f6f8fa', borderRight: `1px solid ${borderCol}`, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${borderCol}`, background: headerBg }}>
        <span style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.7, color: textColor }}>Explorer</span>
        {canEdit && (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => { if (fs.refreshPath) fs.refreshPath("/") }}
              title="Refresh Directory"
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: textColor, padding: "2px 4px", borderRadius: 4, opacity: 0.6 }}
            >🔄</button>
            <button
              onClick={() => { setCreatingType("file"); setCreatingParent("/"); setNewItemName("") }}
              title="New File"
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: textColor, padding: "2px 4px", borderRadius: 4, opacity: 0.6 }}
            >📄</button>
            <button
              onClick={() => { setCreatingType("folder"); setCreatingParent("/"); setNewItemName("") }}
              title="New Folder"
              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: textColor, padding: "2px 4px", borderRadius: 4, opacity: 0.6 }}
            >📁</button>
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="ide-file-tree ide-scroll" style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        <TreeChildren
          parentPath="/"
          depth={0}
          fs={fs}
          activeFile={activeFile}
          onFileClick={onFileClick}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onContextMenu={handleContextMenu}
          textColor={textColor}
          borderCol={borderCol}
          inputBg={inputBg}
          accent={accent}
          isDark={isDark}
        />

        {/* Inline create input */}
        {creatingType && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px" }}>
            <span style={{ fontSize: 13 }}>{creatingType === "file" ? "📄" : "📁"}</span>
            <input
              ref={newItemRef}
              className="ide-rename-input"
              value={newItemName}
              placeholder={creatingType === "file" ? "filename.ext" : "folder-name"}
              onChange={e => setNewItemName(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={e => {
                if (e.key === "Enter") commitCreate()
                if (e.key === "Escape") setCreatingType(null)
              }}
            />
          </div>
        )}

        {/* Empty state */}
        {fs.getChildren("/").length === 0 && !creatingType && (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.4, fontSize: 12 }}>
            No files yet.
            {canEdit && <div style={{ marginTop: 8 }}>Click 📄 or 📁 above to create.</div>}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
          panelBg={panelBg}
          borderCol={borderCol}
          textColor={textColor}
        />
      )}
    </div>
  )
}
