/* ─── Utils ─────────────────────────────────────────────────────── */
const PERSONAL_PREFS_STORAGE_KEY = "ls_ui"
const SENSITIVE_PERSONAL_PREF_KEYS = ["githubPat"]

function stripSensitivePersonalPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return {}

  const safePrefs = { ...prefs }
  SENSITIVE_PERSONAL_PREF_KEYS.forEach(key => {
    delete safePrefs[key]
  })
  return safePrefs
}

export function loadPersonalPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PERSONAL_PREFS_STORAGE_KEY) || "{}")
    const safePrefs = stripSensitivePersonalPrefs(stored)

    if (JSON.stringify(stored) !== JSON.stringify(safePrefs)) {
      localStorage.setItem(PERSONAL_PREFS_STORAGE_KEY, JSON.stringify(safePrefs))
    }

    return safePrefs
  } catch {
    return {}
  }
}

export function savePersonalPrefs(prefs) {
  localStorage.setItem(PERSONAL_PREFS_STORAGE_KEY, JSON.stringify(stripSensitivePersonalPrefs(prefs)))
}

const ADJECTIVES = ["fast", "cool", "smart", "brave", "chill", "wild", "neat", "keen", "epic", "warm", "blue", "swift"]
const NOUNS = ["tiger", "eagle", "panda", "fox", "wolf", "bear", "lion", "hawk", "owl", "seal", "shark", "lynx"]

export function generateRoomId() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}-${noun}-${num}`
}
