/* ─── Utils ─────────────────────────────────────────────────────── */
export function loadPersonalPrefs() {
  try { return JSON.parse(localStorage.getItem("ls_ui") || "{}") } catch { return {} }
}

export function savePersonalPrefs(prefs) {
  localStorage.setItem("ls_ui", JSON.stringify(prefs))
}

const ADJECTIVES = ["fast", "cool", "smart", "brave", "chill", "wild", "neat", "keen", "epic", "warm", "blue", "swift"]
const NOUNS = ["tiger", "eagle", "panda", "fox", "wolf", "bear", "lion", "hawk", "owl", "seal", "shark", "lynx"]

export function generateRoomId() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}-${noun}-${num}`
}
