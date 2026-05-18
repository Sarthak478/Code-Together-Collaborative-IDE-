/* -- Centralized API Configuration -- */
const LOCAL_API = import.meta.env.VITE_LOCAL_API_URL || "http://localhost:1236";
const LOCAL_WS = import.meta.env.VITE_LOCAL_WS_URL || LOCAL_API.replace(/^http/i, "ws");

const isHybridMode = String(import.meta.env.VITE_HYBRID_MODE || "").toLowerCase() === "true";
const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const defaultApi = isHybridMode || isLocalHost
  ? LOCAL_API
  : "https://code-together-collaborative-ide.onrender.com";

const defaultWs = isHybridMode || isLocalHost
  ? LOCAL_WS
  : "wss://code-together-collaborative-ide.onrender.com";

let _wsUrl = import.meta.env.VITE_WS_URL || defaultWs;
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  _wsUrl = _wsUrl.replace(/^ws:\/\//i, "wss://");
}

export const WS_URL = _wsUrl;
export const API_URL = import.meta.env.VITE_API_URL || defaultApi;
export const COLLAB_URL = import.meta.env.VITE_COLLAB_URL || defaultApi;
