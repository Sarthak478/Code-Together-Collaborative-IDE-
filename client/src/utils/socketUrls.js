export function buildExecutionWebSocketUrl(apiUrl, pageProtocol = "https:") {
  const normalizedApiUrl = String(apiUrl || "").trim().replace(/\/+$/, "")

  if (!normalizedApiUrl) {
    throw new Error("API URL is required to build the execution websocket URL.")
  }

  const url = new URL(normalizedApiUrl)

  if (url.protocol === "https:") {
    url.protocol = "wss:"
  } else if (url.protocol === "http:") {
    url.protocol = "ws:"
  } else if (pageProtocol === "https:" && url.protocol === "ws:") {
    url.protocol = "wss:"
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/execution`
  url.search = ""
  url.hash = ""

  return url.toString()
}
