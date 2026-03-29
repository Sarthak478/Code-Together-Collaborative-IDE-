import { FILE_ICONS, DEFAULT_FILE_ICON } from "../../constants/editorConfigs"

function getIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  return FILE_ICONS[ext] || DEFAULT_FILE_ICON
}

export default function TabBar({ openFiles, activeFile, onSelectFile, onCloseFile, textColor, borderCol, accent, isDark, headerBg }) {
  if (openFiles.length === 0) return null

  return (
    <div className="ide-tab-bar" style={{ background: headerBg, borderBottom: `1px solid ${borderCol}`, '--ide-border': borderCol }}>
      {openFiles.map(filePath => {
        const isActive = filePath === activeFile


        const name = filePath.split("/").pop() || filePath

        return (
          <div
            key={filePath}
            className="ide-tab"
            onClick={() => onSelectFile(filePath)}
            style={{
              background: isActive
                ? (isDark ? 'rgba(137,180,250,0.08)' : '#ffffff')
                : 'transparent',
              color: isActive ? accent : textColor,
              borderBottom: isActive ? `2px solid ${accent}` : '2px solid transparent',
              opacity: isActive ? 1 : 0.6,
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 12 }}>{getIcon(name)}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{name}</span>
            <span
              className="tab-close"
              onClick={(e) => { e.stopPropagation(); onCloseFile(filePath) }}
              style={{ color: textColor }}
              title="Close"
            >✕</span>
          </div>
        )
      })}
    </div>
  )
}
