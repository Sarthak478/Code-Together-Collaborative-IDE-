import { resolveRuntimeEndpoints } from "./utils/runtimeEndpoints"

const runtimeEndpoints = resolveRuntimeEndpoints({
  env: import.meta.env,
  hostname: typeof window !== "undefined" ? window.location.hostname : "",
  protocol: typeof window !== "undefined" ? window.location.protocol : "https:",
})

export const WS_URL = runtimeEndpoints.WS_URL
export const API_URL = runtimeEndpoints.API_URL
export const COLLAB_URL = runtimeEndpoints.COLLAB_URL
