import React, { useState } from "react";
import { X, Send, Mail, Plus, UserPlus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { API_URL } from "../../config";

export default function InviteModal({ isOpen, onClose, roomId, roomType, isHost, username }) {
  const [emails, setEmails] = useState([""]);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleAddEmail = () => {
    setEmails([...emails, ""]);
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleRemoveEmail = (index) => {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleSendInvites = async () => {
    const validEmails = emails.filter(email => email.trim() !== "" && email.includes("@"));
    if (validEmails.length === 0) {
      setStatus("error");
      setMessage("Please enter at least one valid email address.");
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: validEmails,
          inviter: username,
          roomType,
          isHost
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(`Successfully sent ${validEmails.length} invitation(s)!`);
        setTimeout(() => {
          onClose();
          setStatus(null);
          setEmails([""]);
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to send invitations.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Connection error. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      animation: "fadeIn 0.3s ease-out"
    }}>
      <div style={{
        background: "#0f111a",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: "24px",
        width: "480px",
        padding: "32px",
        position: "relative",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)",
        animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
      }}>
        <button 
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "50%",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: "24px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "0 8px 16px rgba(99, 102, 241, 0.3)"
          }}>
            <UserPlus size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "8px", letterSpacing: "-0.5px" }}>
            Invite to Sanctuary
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.5" }}>
            Send an ethereal invitation to your colleagues. They will receive a secure link to join room <span style={{ color: "#6366f1", fontWeight: "bold" }}>{roomId}</span>.
          </p>
        </div>

        <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "24px", paddingRight: "8px" }} className="custom-scrollbar">
          {emails.map((email, index) => (
            <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "12px", animation: "slideIn 0.2s ease-out" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Mail size={16} color="#6366f1" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input 
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "12px 12px 12px 40px",
                    color: "#fff",
                    fontSize: "14px",
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"}
                />
              </div>
              {emails.length > 1 && (
                <button 
                  onClick={() => handleRemoveEmail(index)}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "none",
                    color: "#ef4444",
                    padding: "8px",
                    borderRadius: "12px",
                    cursor: "pointer"
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
          
          <button 
            onClick={handleAddEmail}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "12px",
              color: "#94a3b8",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)"
              e.currentTarget.style.color = "#6366f1"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"
              e.currentTarget.style.color = "#94a3b8"
            }}
          >
            <Plus size={16} /> Add another recipient
          </button>
        </div>

        {status && (
          <div style={{
            padding: "12px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            background: status === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: status === "success" ? "#10b981" : "#ef4444",
            border: `1px solid ${status === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
          }}>
            {status === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message}
          </div>
        )}

        <button 
          onClick={handleSendInvites}
          disabled={isSending}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            border: "none",
            borderRadius: "14px",
            padding: "16px",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: isSending ? "not-allowed" : "pointer",
            boxShadow: "0 10px 20px rgba(99, 102, 241, 0.2)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          onMouseEnter={e => {
            if (!isSending) {
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow = "0 15px 30px rgba(99, 102, 241, 0.3)"
            }
          }}
          onMouseLeave={e => {
            if (!isSending) {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(99, 102, 241, 0.2)"
            }
          }}
        >
          {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {isSending ? "Casting Spells..." : "Establish Link"}
        </button>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        `}</style>
      </div>
    </div>
  );
}
