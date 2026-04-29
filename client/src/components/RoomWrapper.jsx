import { useState, useEffect } from "react";
import { API_URL, COLLAB_URL } from "../config";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, DoorOpen, ShieldCheck } from "lucide-react";

export default function RoomWrapper({ roomId, roomType, isCreating, username, roomMode, onLeave, children }) {
  const [status, setStatus] = useState("checking");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If broadcast room, skip authentication checks
    if (roomType === "broadcast") {
      setStatus("approved");
      return;
    }

    const hostToken = localStorage.getItem(`host_${roomId}`);

    if (isCreating) {
      // Create room on the backend
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(`host_${roomId}`, token);
      
      fetch(`${COLLAB_URL}/room/${roomId}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken: token, roomType })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("approved");
        } else {
          setStatus("denied");
          setErrorMsg(data.error || "Failed to create room.");
        }
      })
      .catch(() => {
        setStatus("denied");
        setErrorMsg("Cannot reach the collaboration server.");
      });
      return;
    }

    if (hostToken) {
      // Re-register as host to ensure server state is correct (in case of restart)
      fetch(`${COLLAB_URL}/room/${roomId}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken, roomType })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("approved");
        } else {
          // If token doesn't match existing host on server, we must not be the host anymore
          localStorage.removeItem(`host_${roomId}`);
          // Reload to start fresh as joiner
          window.location.reload(); 
        }
      })
      .catch(() => {
          // Fallback if server is down temporarily or during a quick blip
          setStatus("approved"); 
      });
      return;
    }

    // Joiner Flow: Request access
    let isMounted = true;
    
    fetch(`${COLLAB_URL}/room/${roomId}/join-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    })
    .then(res => res.json())
    .then(data => {
      if (!isMounted) return;
      if (!data.success) {
        setStatus("denied");
        setErrorMsg(data.error);
        return;
      }
      
      setStatus(data.status); // 'approved' or 'waiting'

      if (data.status === "waiting") {
        // Start polling
        const interval = setInterval(() => {
          fetch(`${COLLAB_URL}/room/${roomId}/status?username=${encodeURIComponent(username)}`)
          .then(r => r.json())
          .then(statusData => {
            if (!isMounted) return;
            if (statusData.status === "approved" || statusData.status === "denied" || statusData.status === "destroyed" || statusData.status === "unknown") {
              setStatus(statusData.status === "approved" ? "approved" : "denied");
              if (statusData.status === "denied") {
                 setErrorMsg("The host denied your request to join the room.");
              } else if (statusData.status === "destroyed") {
                 setErrorMsg("The room was destroyed by the host.");
              } else if (statusData.status === "unknown") {
                 setErrorMsg("The room no longer exists or the server restarted.");
              }
              clearInterval(interval);
            }
          }).catch(console.error);
        }, 2000);
        
        return () => clearInterval(interval);
      }
    })
    .catch(() => {
      if (!isMounted) return;
      setStatus("denied");
      setErrorMsg("Failed to reach server.");
    });

    return () => { isMounted = false; };
  }, [roomId, roomType, isCreating, username]);

  if (status === "checking" || status === "waiting") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#1e1e2e", color: "#cdd6f4", fontFamily: "'Manrope', sans-serif"
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: "rgba(255,255,255,0.05)", padding: 40, borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.1)", textAlign: "center", maxWidth: 400,
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}
        >
          {status === "checking" ? (
             <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                 <Loader2 size={48} color="#89b4fa" className="ide-icon-pulse" />
                 <h2 style={{ margin: 0 }}>Connecting...</h2>
             </div>
          ) : (
             <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                 <div style={{ background: "rgba(249, 226, 175, 0.1)", padding: 16, borderRadius: "50%" }}>
                    <ShieldAlert size={48} color="#f9e2af" />
                 </div>
                 <h2 style={{ margin: 0, color: "#f9e2af" }}>Waiting for Host</h2>
                 <p style={{ margin: 0, opacity: 0.7 }}>The host must approve your request before you can enter.</p>
             </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#1e1e2e", color: "#cdd6f4", fontFamily: "'Manrope', sans-serif"
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          style={{
            background: "rgba(243, 139, 168, 0.05)", padding: 40, borderRadius: 24,
            border: "1px solid rgba(243, 139, 168, 0.2)", textAlign: "center", maxWidth: 400,
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}
        >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ background: "rgba(243, 139, 168, 0.1)", padding: 16, borderRadius: "50%" }}>
                  <DoorOpen size={48} color="#f38ba8" />
                </div>
                <h2 style={{ margin: 0, color: "#f38ba8" }}>Access Denied</h2>
                <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>{errorMsg}</p>
                <button 
                  onClick={() => onLeave()}
                  style={{
                    marginTop: 16, background: "rgba(255,255,255,0.1)", color: "#fff",
                    border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer",
                    fontWeight: 600, fontSize: 14
                  }}
                >
                  Return to Home
                </button>
            </div>
        </motion.div>
      </div>
    );
  }

  // Approved! Render the child component
  return children;
}
