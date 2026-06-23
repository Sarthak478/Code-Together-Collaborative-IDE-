import { useCallback, useEffect, useMemo, useState } from "react"
import { API_URL } from "../../config"

const POLL_MS = 10000

const formatTime = (value) => {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return "—"
  }
}

function StatCard({ label, value, tone = "#2457ff", note }) {
  return (
    <div style={{
      padding: 18,
      borderRadius: 20,
      border: "1px solid rgba(36,87,255,0.12)",
      background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,247,255,0.94))",
      boxShadow: "0 16px 40px rgba(12,25,75,0.08)"
    }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#5c6685", fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800, color: tone, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      {note ? <div style={{ marginTop: 8, fontSize: 12, color: "#66708f", lineHeight: 1.5 }}>{note}</div> : null}
    </div>
  )
}

export default function AdminPanel() {
  const [session, setSession] = useState({ authenticated: false, configured: true, checking: true })
  const [accessKey, setAccessKey] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)

  const readSession = useCallback(async () => {
    const res = await fetch(`${API_URL}/admin/session`, { credentials: "include" })
    return res.json().catch(() => ({}))
  }, [])

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/metrics`, { credentials: "include" })
      if (res.status === 401) {
        setSession(prev => ({ ...prev, authenticated: false }))
        setMetrics(null)
        return
      }

      const data = await res.json()
      setMetrics(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true

    const load = async () => {
      const data = await readSession()
      if (!alive) return

      setSession({
        authenticated: !!data.authenticated,
        configured: data.configured !== false,
        checking: false
      })

      if (data?.authenticated) {
        fetchMetrics()
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [readSession, fetchMetrics])

  useEffect(() => {
    if (!session.authenticated) return
    const timer = setInterval(fetchMetrics, POLL_MS)
    return () => clearInterval(timer)
  }, [session.authenticated, fetchMetrics])

  const handleLogin = useCallback(async (e) => {
    e.preventDefault()
    setAuthError("")
    const res = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ accessKey, password })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setAuthError(data.error || "Admin login failed.")
      return
    }
    setPassword("")
    setSession({ authenticated: true, configured: true, checking: false })
    fetchMetrics()
  }, [accessKey, password, fetchMetrics])

  const handleLogout = useCallback(async () => {
    await fetch(`${API_URL}/admin/logout`, {
      method: "POST",
      credentials: "include"
    }).catch(() => {})
    setSession(prev => ({ ...prev, authenticated: false }))
    setMetrics(null)
  }, [])

  const runBreakdown = useMemo(() => {
    const counters = metrics?.counters || {}
    return [
      { label: "Terminal", value: counters.runRequestsTerminal || 0 },
      { label: "Local Agent", value: counters.runRequestsLocalAgent || 0 },
      { label: "Cloud", value: counters.runRequestsCloud || 0 },
    ]
  }, [metrics])

  if (session.checking) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eef2ff", color: "#1c2440", fontFamily: "'Manrope', sans-serif" }}>
        Checking admin session...
      </div>
    )
  }

  if (!session.authenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left, rgba(36,87,255,0.12), transparent 32%), linear-gradient(180deg, #f4f7ff, #eef2ff)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "'Manrope', sans-serif"
      }}>
        <form onSubmit={handleLogin} style={{
          width: "min(440px, 100%)",
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(36,87,255,0.12)",
          borderRadius: 28,
          padding: 32,
          boxShadow: "0 30px 70px rgba(24,42,105,0.12)"
        }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, color: "#2457ff" }}>Internal Access</div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 32, fontFamily: "'Space Grotesk', sans-serif", color: "#17203b" }}>Admin Control Room</h1>
          <p style={{ margin: 0, color: "#66708f", lineHeight: 1.6 }}>
            This panel exposes only aggregate operational data. Admin access requires a dedicated access key and server-side secret.
          </p>
          {!session.configured ? (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 16, background: "#fff2f1", color: "#ba3a2f", fontSize: 13 }}>
              Admin access is not configured on the server yet. Set `ADMIN_ACCESS_KEY` and `ADMIN_PASSWORD` or `ADMIN_SECRET`.
            </div>
          ) : null}
          <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
            <input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Admin access key"
              style={inputStyle}
              autoComplete="off"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              type="password"
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>
          {authError ? <div style={{ marginTop: 14, color: "#ba3a2f", fontSize: 13 }}>{authError}</div> : null}
          <button type="submit" disabled={!session.configured} style={{
            marginTop: 20,
            width: "100%",
            border: "none",
            borderRadius: 18,
            padding: "15px 18px",
            fontSize: 15,
            fontWeight: 800,
            background: "linear-gradient(135deg, #2457ff, #1d8fff)",
            color: "#fff",
            cursor: session.configured ? "pointer" : "not-allowed",
            opacity: session.configured ? 1 : 0.6
          }}>
            Unlock Admin Panel
          </button>
        </form>
      </div>
    )
  }

  const overview = metrics?.overview || {}
  const counters = metrics?.counters || {}
  const redis = metrics?.redis || {}
  const rooms = metrics?.rooms || []
  const recentEvents = metrics?.recentEvents || []

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #eff3ff, #f8faff)",
      color: "#18213d",
      fontFamily: "'Manrope', sans-serif"
    }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 22px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, color: "#2457ff" }}>Operational Dashboard</div>
            <h1 style={{ margin: "8px 0 8px", fontSize: 38, fontFamily: "'Space Grotesk', sans-serif" }}>CodeTogether Admin Panel</h1>
            <div style={{ fontSize: 13, color: "#6b7492" }}>Last updated {formatTime(metrics?.generatedAt)}{loading ? " · Refreshing…" : ""}</div>
          </div>
          <button onClick={handleLogout} style={{
            border: "1px solid rgba(27,48,115,0.12)",
            background: "#fff",
            color: "#1b3073",
            borderRadius: 16,
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 700
          }}>
            Log Out
          </button>
        </div>

        <div style={{ marginTop: 24, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <StatCard label="Active Rooms" value={overview.activeRooms || 0} note="Rooms currently tracked as live." />
          <StatCard label="Client Connections" value={overview.activeClientConnections || 0} tone="#00a76f" note="Live collaborative connections." />
          <StatCard label="Rooms Created" value={counters.roomsCreated || 0} tone="#7a40ff" note="Total rooms created since server boot." />
          <StatCard label="Rooms Destroyed" value={counters.roomsDestroyed || 0} tone="#ff6b3d" note="Rooms explicitly destroyed or expired." />
          <StatCard label="Waiting Users" value={overview.waitingUsers || 0} tone="#b97a12" note="Join requests still awaiting host action." />
          <StatCard label="Local Agent Rooms" value={overview.localAgentRooms || 0} tone="#cc2f7a" note="Rooms with an active user machine agent." />
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 18, gridTemplateColumns: "1.4fr 1fr" }}>
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={panelTitleStyle}>Room Flow</h2>
              <div style={mutedStyle}>Sanitized room metadata only</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    {["Room", "Type", "Mode", "Status", "Connections", "Waiting", "Created", "Last Active"].map((label) => (
                      <th key={label} style={thStyle}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr><td colSpan={8} style={emptyCellStyle}>No rooms tracked yet.</td></tr>
                  ) : rooms.map((room) => (
                    <tr key={room.roomId}>
                      <td style={tdStyleMono}>{room.roomId}</td>
                      <td style={tdStyle}>{room.roomType}</td>
                      <td style={tdStyle}>{room.roomMode}</td>
                      <td style={tdStyle}><StatusPill value={room.status} /></td>
                      <td style={tdStyle}>{room.activeConnections}</td>
                      <td style={tdStyle}>{room.waitingCount}</td>
                      <td style={tdStyle}>{formatTime(room.createdAt)}</td>
                      <td style={tdStyle}>{formatTime(room.lastActiveAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <h2 style={panelTitleStyle}>Execution Mix</h2>
                <div style={mutedStyle}>How runs are being dispatched</div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {runBreakdown.map((item) => (
                  <div key={item.label} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: "rgba(36,87,255,0.05)"
                  }}>
                    <div style={{ fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <h2 style={panelTitleStyle}>System Health</h2>
                <div style={mutedStyle}>Operational signals only</div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <HealthRow label="Redis Configured" value={redis.configured ? "Yes" : "No"} />
                <HealthRow label="Redis Fallback Mode" value={redis.fallbackMode ? "Active" : "Off"} />
                <HealthRow label="Server Terminal Rooms" value={String(overview.serverTerminalRooms || 0)} />
                <HealthRow label="Local Terminal Rooms" value={String(overview.localTerminalRooms || 0)} />
                <HealthRow label="Approvals / Denials" value={`${counters.approvals || 0} / ${counters.denials || 0}`} />
              </div>
            </div>
          </section>
        </div>

        <section style={{ ...panelStyle, marginTop: 20 }}>
          <div style={panelHeaderStyle}>
            <h2 style={panelTitleStyle}>Recent Activity</h2>
            <div style={mutedStyle}>No private payloads, only room/system events</div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {recentEvents.length === 0 ? (
              <div style={emptyEventStyle}>No recent admin-safe events yet.</div>
            ) : recentEvents.map((event) => (
              <div key={event.id} style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(18,31,77,0.03)",
                border: "1px solid rgba(18,31,77,0.06)"
              }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{event.summary}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#697390" }}>{event.type}{event.kind ? ` · ${event.kind}` : ""}</div>
                </div>
                <div style={{ fontSize: 12, color: "#697390" }}>{formatTime(event.at)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatusPill({ value }) {
  const tone = value === "active" ? "#0b9e67" : value === "destroyed" ? "#cf4b3c" : "#6f7a99"
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 10px",
      borderRadius: 999,
      background: `${tone}14`,
      color: tone,
      fontWeight: 700,
      fontSize: 12,
      textTransform: "capitalize"
    }}>
      {value}
    </span>
  )
}

function HealthRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid rgba(18,31,77,0.06)" }}>
      <div style={{ color: "#5e6888" }}>{label}</div>
      <div style={{ fontWeight: 800 }}>{value}</div>
    </div>
  )
}

const inputStyle = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid rgba(36,87,255,0.16)",
  padding: "14px 16px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#17203b"
}

const panelStyle = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(24,48,115,0.08)",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 18px 48px rgba(15,33,92,0.08)"
}

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 14,
  flexWrap: "wrap"
}

const panelTitleStyle = {
  margin: 0,
  fontSize: 22,
  fontFamily: "'Space Grotesk', sans-serif"
}

const mutedStyle = {
  fontSize: 12,
  color: "#6d7693"
}

const thStyle = {
  textAlign: "left",
  fontSize: 12,
  color: "#6a7594",
  padding: "10px 10px 12px",
  borderBottom: "1px solid rgba(18,31,77,0.08)",
  textTransform: "uppercase",
  letterSpacing: "0.06em"
}

const tdStyle = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(18,31,77,0.05)",
  fontSize: 13,
  color: "#20304f"
}

const tdStyleMono = {
  ...tdStyle,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12
}

const emptyCellStyle = {
  padding: "18px 10px",
  textAlign: "center",
  color: "#697390"
}

const emptyEventStyle = {
  padding: "16px",
  borderRadius: 16,
  background: "rgba(18,31,77,0.03)",
  color: "#697390"
}
