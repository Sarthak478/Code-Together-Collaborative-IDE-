import { FILE_BADGES, DEFAULT_FILE_BADGE } from "../../constants/editorConfigs"

function getBadge(name) {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  return FILE_BADGES[ext] || DEFAULT_FILE_BADGE
}

function ExtensionBadge({ name }) {
  const badge = getBadge(name)
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 18,
        padding: "0 6px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.04em",
        color: badge.color,
        background: badge.background,
        border: `1px solid ${badge.color}33`,
        flexShrink: 0,
      }}
    >
      {badge.label}
    </span>
  )
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
            <ExtensionBadge name={name} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120, fontFamily: "'Manrope', sans-serif", fontWeight: isActive ? 600 : 400, letterSpacing: "0.01em" }}>{name}</span>
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
