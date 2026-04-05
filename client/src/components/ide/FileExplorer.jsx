import { useState, useMemo, useRef } from "react"
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
  X
} from "lucide-react"

export default function FileExplorer({ fs, activeFile, onFileClick, isHost, canEdit, textColor, borderCol, inputBg, panelBg, accent, isDark, headerBg }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const handleImport = async (e, mode) => {
    const files = Array.from(e.target.files)
    if (files.length > 0 && fs.importFiles) {
      await fs.importFiles(files, "/")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (folderInputRef.current) folderInputRef.current.value = ""
  }
  
  const files = useMemo(() => fs.getAllFiles(), [fs])
  
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files
    return files.filter(f => f.path.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [files, searchTerm])

  return (
    <div 
      className="ide-glass-effect"
      style={{ 
        width: 260, display: "flex", flexDirection: "column", 
        borderRight: `1px solid ${borderCol}`, background: panelBg,
        margin: "0 0 10px 10px", borderRadius: 12, height: "calc(100% - 10px)",
        overflow: "hidden"
      }}
    >
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
                title="New File"
                onClick={() => fs.createFile("/")}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6, padding: 4 }}
              >
                <FilePlus size={14} />
              </button>
              <button 
                title="New Folder" 
                onClick={() => fs.createFolder("/")}
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

      {/* File List */}
      <div className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {filteredFiles.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.4, fontSize: 12 }}>
            No files found
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
             {/* Simple Flat List for now, or Nested if we want to be fancy */}
             {filteredFiles.map(file => (
               <FileItem 
                key={file.path}
                file={file}
                isActive={activeFile === file.path}
                onClick={onFileClick}
                textColor={textColor}
                accent={accent}
               />
             ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FileItem({ file, isActive, onClick, textColor, accent }) {
  const isFolder = file.type === "directory"
  
  return (
    <div 
      className={`ide-file-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(file.path)}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: isActive ? `${accent}15` : "transparent",
        color: isActive ? accent : textColor,
        transition: "all 0.15s ease",
        height: 32,
        boxSizing: "border-box"
      }}
      onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
      onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = "transparent" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isFolder ? (
           <Folder size={14} fill={isActive ? `${accent}44` : "transparent"} />
        ) : (
           <FileCode size={14} opacity={isActive ? 1 : 0.7} />
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis" }}>
        {file.name}
      </span>
      {isActive && (
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, marginLeft: "auto" }} />
      )}
    </div>
  )
}
