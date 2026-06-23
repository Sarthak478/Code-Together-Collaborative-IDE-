const DEFAULT_REMOTE_API = "https://code-together-collaborative-ide.onrender.com"

function isLocalHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1"
}

function normalizeWsUrl(url, protocol = "https:") {
  const normalizedUrl = String(url || "").trim().replace(/\/+$/, "")
  if (!normalizedUrl) return normalizedUrl

  const parsed = new URL(normalizedUrl)
  if (parsed.protocol === "https:") parsed.protocol = "wss:"
  else if (parsed.protocol === "http:") parsed.protocol = "ws:"
  else if (protocol === "https:" && parsed.protocol === "ws:") parsed.protocol = "wss:"

  parsed.search = ""
  parsed.hash = ""
  return parsed.toString().replace(/\/+$/, "")
}

export function resolveRuntimeEndpoints({
  env = {},
  hostname = "",
  protocol = "https:",
} = {}) {
  const localApi = env.VITE_LOCAL_API_URL || "http://localhost:1236"
  const localWs = env.VITE_LOCAL_WS_URL || localApi.replace(/^http/i, "ws")
  const hybridMode = String(env.VITE_HYBRID_MODE || "").toLowerCase() === "true"
  const forceRemote = String(env.VITE_FORCE_REMOTE_BACKEND || "").toLowerCase() === "true"
  const localHost = isLocalHostname(hostname)

  const shouldUseLocal = (localHost || hybridMode) && !forceRemote
  const defaultApi = shouldUseLocal ? localApi : DEFAULT_REMOTE_API
  const defaultWs = shouldUseLocal ? localWs : DEFAULT_REMOTE_API.replace(/^https/i, "wss")

  const apiUrl = shouldUseLocal ? defaultApi : (env.VITE_API_URL || defaultApi)
  const collabUrl = shouldUseLocal ? defaultApi : (env.VITE_COLLAB_URL || defaultApi)
  const wsUrl = shouldUseLocal ? defaultWs : (env.VITE_WS_URL || defaultWs)

  return {
    mode: shouldUseLocal ? "local" : "remote",
    API_URL: String(apiUrl).replace(/\/+$/, ""),
    COLLAB_URL: String(collabUrl).replace(/\/+$/, ""),
    WS_URL: normalizeWsUrl(wsUrl, protocol),
  }
}
