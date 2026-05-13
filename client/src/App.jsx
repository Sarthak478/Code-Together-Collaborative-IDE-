import { useEffect, useState, lazy, Suspense } from "react"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import Landing from "./components/Landing"
import RoomWrapper from "./components/RoomWrapper"
import { ROOM_MODES } from "./constants/roomModes"
import { WS_URL } from "./config"

const EditorRoom = lazy(() => import("./components/EditorRoom"))
const IDERoom = lazy(() => import("./components/IDERoom"))

const SESSION_KEY = "ls_session"

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(roomId, roomType, roomMode) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, roomType, roomMode }))
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export default function App() {
  const saved = getSession()
  const [roomId, setRoomId] = useState(saved?.roomId ?? null)
  const [roomType, setRoomType] = useState(saved?.roomType ?? "collaborative")
  const [roomMode, setRoomMode] = useState(saved?.roomMode ?? null)
  const [isResolvingRoomMode, setIsResolvingRoomMode] = useState(Boolean(saved?.roomId))
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState(() => {
    let un = localStorage.getItem("ls_un")
    if (!un) { un = "user-" + Math.floor(Math.random() * 1000); localStorage.setItem("ls_un", un) }
    return un
  })

  const onJoin = (id, type, creating = false, mode = null) => {
    setError(null)
    setRoomId(id)
    setRoomType(type)
    setIsCreating(creating)
    // When joining (not creating), mode will be null — detect from room
    // When creating, mode is explicitly set
    const nextMode = creating ? mode : (mode ?? null)
    setIsResolvingRoomMode(!creating)
    setRoomMode(nextMode)
    saveSession(id, type, nextMode)
  }

  const onLeave = (msg) => {
    setRoomId(null)
    setRoomMode(null)
    setIsResolvingRoomMode(false)
    clearSession()
    if (typeof msg === "string") setError(msg)
    else setError(null)
  }

  useEffect(() => {
    if (!roomId || isCreating || !isResolvingRoomMode) return

    let isActive = true
    const ydoc = new Y.Doc()
    const hostToken = localStorage.getItem(`host_${roomId}`) || ""
    const authUrl = `${WS_URL}?username=${encodeURIComponent(username)}&hostToken=${encodeURIComponent(hostToken)}`
    const provider = new HocuspocusProvider({
      url: authUrl,
      name: roomId,
      document: ydoc,
    })
    const roomMap = ydoc.getMap("room")
    let didCleanup = false

    const cleanup = () => {
      if (didCleanup) return
      didCleanup = true
      provider.destroy()
      ydoc.destroy()
    }

    const finish = (resolvedMode) => {
      if (!isActive) return
      const nextMode = resolvedMode === ROOM_MODES.IDE ? ROOM_MODES.IDE : ROOM_MODES.COMPILER
      setRoomMode(nextMode)
      setIsResolvingRoomMode(false)
      saveSession(roomId, roomType, nextMode)
      cleanup()
    }

    const timeout = setTimeout(() => finish(roomMap.get("roomMode")), 3000)
    provider.on("synced", () => {
      clearTimeout(timeout)
      finish(roomMap.get("roomMode"))
    })

    return () => {
      isActive = false
      clearTimeout(timeout)
      cleanup()
    }
  }, [roomId, roomType, isCreating, isResolvingRoomMode, username])

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

  if (isResolvingRoomMode || !roomMode) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0c0c1f",
        color: "#e5e3ff",
        fontFamily: "'Manrope', sans-serif",
      }}>
        Resolving room mode...
      </div>
    )
  }

  // Route to IDE or Compiler based on roomMode
  return (
    <Suspense fallback={null}>
      <RoomWrapper
        roomId={roomId}
        roomType={roomType}
        isCreating={isCreating}
        username={username}
        roomMode={roomMode}
        onLeave={onLeave}
      >
        {roomMode === ROOM_MODES.IDE ? (
          <IDERoom
            roomId={roomId}
            initialRoomType={roomType}
            isCreating={isCreating}
            username={username}
            onLeave={onLeave}
          />
        ) : (
          <EditorRoom
            roomId={roomId}
            initialRoomType={roomType}
            isCreating={isCreating}
            username={username}
            onLeave={onLeave}
          />
        )}
      </RoomWrapper>
    </Suspense>
  )
}
