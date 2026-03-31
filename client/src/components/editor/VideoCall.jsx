import { useEffect, useRef, useState } from "react"
import Peer from "peerjs"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Video, VideoOff, Maximize2, User } from "lucide-react"

export default function VideoCall({ 
  roomId, 
  username, 
  peerId, 
  setPeerId, 
  activeUsers, 
  themeData 
}) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({}) 
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [error, setError] = useState(null)
  
  const peerRef = useRef(null)
  const localVideoRef = useRef(null)
  const callsRef = useRef({}) 

  useEffect(() => {
    let peer = null;
    let stream = null;

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
        if (localVideoRef.current) localVideoRef.current.srcObject = stream

        const myId = `ls-${roomId}-${username}-${Math.floor(Math.random() * 1000)}`
        peer = new Peer(myId, { debug: 1 })
        peerRef.current = peer

        peer.on("open", (id) => setPeerId(id))

        peer.on("call", (call) => {
          call.answer(stream)
          call.on("stream", (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }))
          })
          callsRef.current[call.peer] = call
        })

        peer.on("error", (err) => {
          console.error("PeerJS Error:", err)
          setError("Connection error. Try refreshing.")
        })

      } catch (err) {
        console.error("Media Error:", err)
        setError("Camera/Mic permission denied.")
      }
    }

    init()

    return () => {
      if (peer) {
        peer.destroy()
        setPeerId(null)
      }
      if (stream) {
          stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [roomId, username, setPeerId])

  useEffect(() => {
    if (!peerRef.current || !localStream) return

    activeUsers.forEach(user => {
      if (user.peerId && user.peerId !== peerId && !remoteStreams[user.peerId] && !callsRef.current[user.peerId]) {
        const call = peerRef.current.call(user.peerId, localStream)
        call.on("stream", (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [user.peerId]: remoteStream }))
        })
        call.on("close", () => {
            setRemoteStreams(prev => {
                const next = { ...prev }
                delete next[user.peerId]
                return next
            })
        })
        callsRef.current[user.peerId] = call
      }
    })
  }, [activeUsers, peerId, localStream, remoteStreams])

  const toggleMute = () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled
            setIsMuted(!audioTrack.enabled)
        }
    }
  }

  const toggleCamera = () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled
            setIsCameraOff(!videoTrack.enabled)
        }
    }
  }

  const getUsername = (pid) => {
    const user = activeUsers.find(u => u.peerId === pid)
    return user ? user.name : "Guest"
  }

  if (error) {
    return (
        <div style={{ position: "fixed", bottom: 80, left: 24, background: "#f38ba8", color: "#fff", padding: "12px 20px", borderRadius: 16, fontSize: 13, zIndex: 1000, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
            ⚠️ {error}
        </div>
    )
  }

  return (
    <div style={{ 
      position: "fixed", bottom: 80, left: 32, 
      display: "flex", flexWrap: "wrap", gap: 20, 
      pointerEvents: "none", zIndex: 1000 
    }}>
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          drag
          whileDrag={{ scale: 0.95, cursor: "grabbing" }}
          style={{ 
            width: 160, height: 160, borderRadius: 24, 
            overflow: "hidden", border: `3px solid ${themeData.accent}88`,
            background: "#11111b", position: "relative", pointerEvents: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)", cursor: "grab"
          }}
        >
          {isCameraOff ? (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1e2e" }}>
               <User size={48} color={themeData.accent} opacity={0.5} />
            </div>
          ) : (
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} 
            />
          )}

          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, zIndex: 2 }}>
             <div style={{ background: isMuted ? "#f38ba8" : "#a6e3a1", width: 8, height: 8, borderRadius: "50%", boxShadow: `0 0 10px ${isMuted ? "#f38ba8" : "#a6e3a1"}88` }} />
          </div>

          <div className="ide-glass-effect" style={{ 
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", 
            padding: "4px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800, 
            color: "#fff", pointerEvents: "none", letterSpacing: "0.5px"
          }}>
            YOU {isMuted && " (MUTED)"}
          </div>
          
          <div className="ide-glass-effect" style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0, transition: "opacity 0.3s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12
          }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
            <button 
              onClick={toggleMute} 
              style={{ 
                border: "none", background: isMuted ? "#f38ba8" : themeData.accent, 
                width: 36, height: 36, borderRadius: 12, cursor: "pointer", 
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" 
              }}
            >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button 
              onClick={toggleCamera} 
              style={{ 
                border: "none", background: isCameraOff ? "#f38ba8" : themeData.accent, 
                width: 36, height: 36, borderRadius: 12, cursor: "pointer", 
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" 
              }}
            >
                {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
          </div>
        </motion.div>

        {Object.entries(remoteStreams).map(([pid, stream]) => (
          <RemoteVideoBubble key={pid} peerId={pid} stream={stream} username={getUsername(pid)} themeData={themeData} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function RemoteVideoBubble({ peerId, stream, username, themeData }) {
    const videoRef = useRef(null)

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
    }, [stream])

    return (
        <motion.div
          initial={{ scale: 0, opacity: 0, x: -50 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          drag
          whileDrag={{ scale: 0.95, cursor: "grabbing" }}
          style={{ 
            width: 160, height: 160, borderRadius: 24, 
            overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)",
            background: "#11111b", position: "relative", pointerEvents: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)", cursor: "grab"
          }}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          />
          <div className="ide-glass-effect" style={{ 
            position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", 
            padding: "4px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800, 
            color: "#fff", letterSpacing: "0.5px"
          }}>
            {username}
          </div>
        </motion.div>
    )
}
