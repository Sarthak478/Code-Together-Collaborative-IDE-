/* ── Centralized API Configuration ── */
let _wsUrl = import.meta.env.VITE_WS_URL || "wss://code-together-collaborative-ide.onrender.com";
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  _wsUrl = _wsUrl.replace(/^ws:\/\//i, 'wss://');
}
export const WS_URL = _wsUrl;

export const API_URL = import.meta.env.VITE_API_URL || "https://code-together-collaborative-ide.onrender.com"
export const COLLAB_URL = import.meta.env.VITE_COLLAB_URL || "https://code-together-collaborative-ide.onrender.com"
