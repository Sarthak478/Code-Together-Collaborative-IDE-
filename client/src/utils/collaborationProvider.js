import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider"

export function getCollaborationWebsocketConfig(url) {
  return {
    url,
    autoConnect: true,
    delay: 1000,
    factor: 2,
    maxAttempts: 4,
    maxDelay: 8000,
    minDelay: 1000,
    timeout: 15000,
    jitter: true,
  }
}

export function createManagedCollaborationProvider({ url, name, document }) {
  const websocketProvider = new HocuspocusProviderWebsocket(
    getCollaborationWebsocketConfig(url)
  )

  return new HocuspocusProvider({
    name,
    document,
    websocketProvider,
  })
}
