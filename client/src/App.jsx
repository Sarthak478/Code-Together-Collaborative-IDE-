import { useState, useEffect } from "react"
import Landing from "./components/Landing"
import EditorRoom from "./components/EditorRoom"

const SESSION_KEY = "ls_session"

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(roomId, roomType) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, roomType }))
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export default function App() {
  const saved = getSession()
  const [roomId, setRoomId] = useState(saved?.roomId ?? null)
  const [roomType, setRoomType] = useState(saved?.roomType ?? "collaborative")
  const [isCreating, setIsCreating] = useState(saved ? false : false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState(() => {
    let un = localStorage.getItem("ls_un")
    if (!un) { un = "user-" + Math.floor(Math.random() * 1000); localStorage.setItem("ls_un", un) }
    return un
  })

  const onJoin = (id, type, creating = false) => {
    setError(null)
    setRoomId(id)
    setRoomType(type)
    setIsCreating(creating)
    saveSession(id, type)
  }

  const onLeave = (msg) => {
    setRoomId(null)
    clearSession()
    if (typeof msg === "string") setError(msg)
    else setError(null)
  }

  if (!roomId) {
    return (
      <Landing
        username={username}
        onUsernameChange={u => { setUsername(u); localStorage.setItem("ls_un", u) }}
        onJoin={onJoin}
        initialError={error}
      />
    )
  }

  return (
    <EditorRoom
      roomId={roomId}
      initialRoomType={roomType}
      isCreating={isCreating}
      username={username}
      onLeave={onLeave}
    />
  )
}
