/* ─── UI Helpers ────────────────────────────────────────────────── */

export function Section({ label, children, borderCol, faded }) {
  return (
    <div style={{ marginBottom: 24, opacity: faded ? 0.7 : 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.5, marginBottom: 12 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${borderCol}` }}>{children}</div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      {label && <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 5 }}>{label}</div>}
      {children}
    </div>
  )
}

export function GridRow({ options, value, onChange, isDark, inputBg, borderCol, textColor }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{ padding: "8px 6px", borderRadius: 6, border: `1px solid ${value === opt.id ? (isDark ? "#89b4fa" : "#339af0") : borderCol}`, background: value === opt.id ? (isDark ? "#313244" : "#d0ebff") : inputBg, color: textColor, fontWeight: value === opt.id ? 700 : 500, cursor: "pointer", fontSize: 12, transition: "all 0.15s ease", boxShadow: value === opt.id ? `0 0 0 1px ${isDark ? "#89b4fa" : "#339af0"}20` : "none" }}
          onMouseEnter={(e) => { if (value !== opt.id) e.currentTarget.style.borderColor = isDark ? "#45475a" : "#adb5bd" }}
          onMouseLeave={(e) => { if (value !== opt.id) e.currentTarget.style.borderColor = borderCol }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
