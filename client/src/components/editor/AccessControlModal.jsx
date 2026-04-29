import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, DoorOpen, Users, Settings, AlertTriangle } from "lucide-react";
import { API_URL, COLLAB_URL } from "../../config";

export default function AccessControlModal({ isOpen, onClose, roomId }) {
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [roomLimit, setRoomLimit] = useState(0);
  const [limitInput, setLimitInput] = useState("0");
  const [error, setError] = useState("");

  const hostToken = localStorage.getItem(`host_${roomId}`);

  useEffect(() => {
    if (!isOpen || !hostToken) return;

    const fetchWaiting = () => {
      fetch(`${COLLAB_URL}/room/${roomId}/waiting?hostToken=${hostToken}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setWaitingUsers(data.waiting);
            setRoomLimit(data.limit);
            if (document.activeElement.id !== "limitInput") {
                setLimitInput(data.limit.toString());
            }
          }
        }).catch(err => console.error(err));
    };

    fetchWaiting();
    const interval = setInterval(fetchWaiting, 2000);
    return () => clearInterval(interval);
  }, [isOpen, roomId, hostToken]);

  const handleAction = (username, action) => {
    fetch(`${COLLAB_URL}/room/${roomId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostToken, username })
    })
    .then(r => r.json())
    .then(data => {
      if (!data.success) setError(data.error);
      else {
        setWaitingUsers(prev => prev.filter(u => u.username !== username));
      }
    });
  };

  const handleLimitSubmit = (e) => {
    e.preventDefault();
    const limit = parseInt(limitInput, 10);
    if (isNaN(limit) || limit < 0) return setError("Invalid limit");
    
    fetch(`${COLLAB_URL}/room/${roomId}/limit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostToken, limit })
    })
    .then(r => r.json())
    .then(data => {
      if (!data.success) setError(data.error);
      else {
         setRoomLimit(limit);
         setError("");
      }
    });
  };

  const handleDestroyRoom = () => {
    if (window.confirm("Are you sure you want to permanently destroy this room? This will kick all users and delete all files. This action cannot be undone.")) {
      fetch(`${COLLAB_URL}/room/${roomId}/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken })
      }).then(() => {
        localStorage.removeItem(`host_${roomId}`);
        window.location.href = "/";
      }).catch(console.error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          style={{
            background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, width: 450, overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column"
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "rgba(137, 180, 250, 0.1)", padding: 8, borderRadius: 8 }}>
                <ShieldCheck size={24} color="#89b4fa" />
              </div>
              <h2 style={{ margin: 0, fontSize: 18, color: "#cdd6f4" }}>Access Control</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#a6adc8", cursor: "pointer" }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
            {error && <div style={{ color: "#f38ba8", fontSize: 13 }}>{error}</div>}

            {/* Capacity Limit */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Settings size={18} color="#a6adc8" />
                <h3 style={{ margin: 0, fontSize: 14, color: "#cdd6f4" }}>Room Capacity</h3>
              </div>
              <form onSubmit={handleLimitSubmit} style={{ display: "flex", gap: 8 }}>
                <input
                  id="limitInput"
                  type="number"
                  min="0"
                  value={limitInput}
                  onChange={e => setLimitInput(e.target.value)}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "8px 12px", color: "#cdd6f4", fontSize: 14
                  }}
                  placeholder="0 for unlimited"
                />
                <button
                  type="submit"
                  style={{
                    background: "rgba(137, 180, 250, 0.1)", color: "#89b4fa", border: "none",
                    borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600
                  }}
                >
                  Set Limit
                </button>
              </form>
              <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#6c7086" }}>
                Current Limit: {roomLimit === 0 ? "Unlimited" : roomLimit}
              </p>
            </div>

            {/* Waiting List */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Users size={18} color="#a6adc8" />
                <h3 style={{ margin: 0, fontSize: 14, color: "#cdd6f4" }}>Waiting Room</h3>
              </div>
              
              {waitingUsers.length === 0 ? (
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: 24, textAlign: "center", color: "#6c7086", fontSize: 13 }}>
                  No users waiting
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {waitingUsers.map(user => (
                    <div key={user.username} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "12px 16px"
                    }}>
                      <span style={{ color: "#cdd6f4", fontSize: 14 }}>{user.username}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleAction(user.username, "approve")}
                          style={{
                            background: "#a6e3a1", color: "#11111b", border: "none",
                            borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(user.username, "deny")}
                          style={{
                            background: "rgba(243, 139, 168, 0.1)", color: "#f38ba8", border: "none",
                            borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600
                          }}
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(243, 139, 168, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={18} color="#f38ba8" />
                <h3 style={{ margin: 0, fontSize: 14, color: "#f38ba8" }}>Danger Zone</h3>
              </div>
              <p style={{ color: "#a6adc8", fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>
                Destroying the room will permanently delete all files, kick all active users, and prevent anyone from rejoining.
              </p>
              <button
                onClick={handleDestroyRoom}
                style={{
                  width: "100%", background: "rgba(243, 139, 168, 0.1)", color: "#f38ba8", border: "1px solid rgba(243, 139, 168, 0.3)",
                  borderRadius: 6, padding: "10px", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.target.style.background = "rgba(243, 139, 168, 0.2)"}
                onMouseLeave={e => e.target.style.background = "rgba(243, 139, 168, 0.1)"}
              >
                Destroy Room Permanently
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
