import { MessageSquare, Send, Users, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ─── ChatPanel Component ───────────────────────────────────────── */
export default function ChatPanel({
  messages = [],
  chatInput = "",
  onChatInputChange = () => {},
  chatTarget = "all",
  onChatTargetChange = () => {},
  onSendChat = () => {},
  visibleActiveUsersList = [],
  themeData = {},
  chatEnabled = true,
  username = "",
  actualRoomType = "collaborative",
  isHost = false,
}) {
  const {
    headerBg = "rgba(30, 41, 59, 0.96)",
    borderCol = "rgba(148, 163, 184, 0.32)",
    textColor = "#f8fafc",
    inputBg = "rgba(255, 255, 255, 0.12)",
    accent = "#8b5cf6",
    panelBg = "rgba(15, 23, 42, 0.96)",
    surfaceBg = "rgba(255, 255, 255, 0.14)",
    secondaryText = "#cbd5e1",
  } = themeData;

  const messagesEndRef = useRef(null);
  const [hasInitialScroll, setHasInitialScroll] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Ensure initial scroll happens after mount
  useEffect(() => {
    if (!hasInitialScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
      setHasInitialScroll(true);
    }
  }, [hasInitialScroll, messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim() && chatEnabled) {
      onSendChat();
    }
  };

  // Filter out current user from active users list
  const activeUsers = Array.from(
    new Set(
      visibleActiveUsersList
        .map((u) => u.name || u)
        .filter((name) => name && name !== username)
    )
  );

  // If no messages array is provided, use empty array
  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div
      style={{
        width: 360,
        minWidth: 320,
        maxWidth: "100%",
        height: "100%",
        background: panelBg,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${borderCol}`,
        boxShadow: "-4px 0 32px rgba(0,0,0,0.35)",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        borderRadius: "0 20px 20px 0",
        position: "relative",
      }}
    >
      {/* CSS Keyframes for animation */}
      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .chat-panel {
            animation: slideInRight 0.2s ease;
          }
          .message-appear {
            animation: fadeIn 0.2s ease;
          }
        `}
      </style>

      {/* Header Section */}
      <div
        style={{
          padding: 18,
          borderBottom: `1px solid ${borderCol}`,
          background: headerBg,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                background: accent,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 0 20px ${accent}30`,
              }}
            >
              <MessageSquare size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                Live Chat
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: secondaryText,
                  marginTop: 4,
                  maxWidth: 240,
                }}
              >
              
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: secondaryText,
              fontSize: 12,
            }}
          >
            <Users size={14} />
            <span>{activeUsers.length + 1} online</span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              color: "#eef2ff",
              background: "rgba(99, 102, 241, 0.22)",
              padding: "6px 12px",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            Everyone can message
          </span>
          {isHost && (
            <span
              style={{
                fontSize: 11,
                color: "#facc15",
                background: "rgba(250, 204, 21, 0.18)",
                padding: "6px 12px",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              Host mode
            </span>
          )}
          <span style={{ color: secondaryText, fontSize: 11, opacity: 0.95 }}>
            {actualRoomType === "collaborative" ? "Collaborative mode" : "Room chat"}
          </span>
        </div>
      </div>

      {/* Messages Container - Scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minHeight: 0, // Important for flex child scrolling
        }}
      >
        {safeMessages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              opacity: 0.72,
              marginTop: 20,
              fontSize: 13,
              color: secondaryText,
              lineHeight: 1.6,
            }}
          >
            No messages yet. Send the first message to kick things off.
          </div>
        )}

        {safeMessages.map((m, idx) => {
          // System message for code run
          if (m.type === "system") {
            return (
              <div
                key={m.id || idx}
                className="message-appear"
                style={{
                  alignSelf: "center",
                  background: "rgba(148, 163, 184, 0.12)",
                  color: secondaryText,
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontSize: 11,
                  textAlign: "center",
                  border: `1px solid ${borderCol}`,
                }}
              >
                🚀 @{m.sender} ran the code
              </div>
            );
          }

          // System message for kick
          if (m.type === "system_kick") {
            return (
              <div
                key={m.id || idx}
                className="message-appear"
                style={{
                  alignSelf: "center",
                  background: "rgba(251, 113, 133, 0.18)",
                  color: "#fecaca",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontSize: 11,
                  textAlign: "center",
                  border: `1px solid rgba(251, 113, 133, 0.3)`,
                }}
              >
                🚪 {m.text || `User ${m.sender} was removed`}
              </div>
            );
          }

          const isMe = m.sender === username;
          return (
            <div
              key={m.id || idx}
              className="message-appear"
              style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "84%",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  color: secondaryText,
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: isMe ? accent : textColor,
                  }}
                >
                  {isMe ? "You" : `@${m.sender}`}
                </span>
                {m.target && m.target !== "all" && m.target !== "everyone" && (
                  <span style={{ color: accent, fontWeight: 700 }}>
                    (Whisper)
                  </span>
                )}
              </div>
              <div
                style={{
                  background: isMe ? accent : surfaceBg,
                  color: isMe ? "#111827" : textColor,
                  padding: "14px 16px",
                  borderRadius: 20,
                  border: isMe ? "none" : `1px solid rgba(255,255,255,0.16)`,
                  fontSize: 13,
                  lineHeight: 1.6,
                  boxShadow: isMe
                    ? "0 18px 30px rgba(124, 58, 237, 0.16)"
                    : "0 6px 18px rgba(0, 0, 0, 0.18)",
                  backdropFilter: isMe ? "none" : "blur(4px)",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        style={{
          borderTop: `1px solid ${borderCol}`,
          padding: 16,
          background: headerBg,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {actualRoomType === "collaborative" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: secondaryText,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Message target
            </label>
            <select
              value={chatTarget}
              onChange={(e) => onChatTargetChange(e.target.value)}
              style={{
                background: inputBg,
                color: textColor,
                border: `1px solid ${borderCol}`,
                padding: "10px 14px",
                borderRadius: 14,
                fontSize: 12,
                outline: "none",
                appearance: "none",
                width: "100%",
                cursor: "pointer",
              }}
            >
              <option value="all">Send to Everyone</option>
              {activeUsers.map((name) => (
                <option key={name} value={name}>
                  Direct to @{name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            disabled={!chatEnabled}
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder={
              chatEnabled ? "Type your message..." : "Chat disabled by host"
            }
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 999,
              border: `1px solid ${borderCol}`,
              background: inputBg,
              color: textColor,
              outline: "none",
              padding: "14px 18px",
              fontSize: 14,
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.18)",
              transition: "border-color 0.2s ease, background 0.2s ease",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim() && chatEnabled) {
                  onSendChat();
                }
              }
            }}
          />
          <button
            type="submit"
            disabled={!chatEnabled || !chatInput.trim()}
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              border: "none",
              background:
                chatEnabled && chatInput.trim()
                  ? accent
                  : "rgba(145, 125, 255, 0.35)",
              color: "#fff",
              cursor:
                chatEnabled && chatInput.trim() ? "pointer" : "not-allowed",
              boxShadow:
                chatEnabled && chatInput.trim()
                  ? `0 14px 28px ${accent}40`
                  : "none",
              display: "grid",
              placeItems: "center",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            aria-label="Send message"
            onMouseEnter={(e) => {
              if (chatEnabled && chatInput.trim()) {
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Send size={18} />
          </button>
        </div>

        {!chatEnabled && (
          <div
            style={{
              fontSize: 11,
              color: "#facc15",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            💬 The host has disabled chat
          </div>
        )}
      </form>
    </div>
  );
}