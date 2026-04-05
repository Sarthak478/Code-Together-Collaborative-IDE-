import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bot, 
  Send, 
  Trash2, 
  ExternalLink, 
  Key, 
  Sparkles, 
  Info,
  CircleDashed
} from "lucide-react"

export default function AIPanel({ activeFile, activeYText, textColor, borderCol, panelBg, inputBg, accent, isDark, headerBg }) {
  const [apiKey, setApiKey] = useState("")
  const [isConfigured, setIsConfigured] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const scrollRef = useRef(null)

  useEffect(() => {
    const savedKey = localStorage.getItem("ls_gemini_key")
    if (savedKey) {
      setApiKey(savedKey)
      setIsConfigured(true)
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const saveConfig = (e) => {
    e.preventDefault()
    if (!apiKey.trim()) return
    localStorage.setItem("ls_gemini_key", apiKey.trim())
    setIsConfigured(true)
  }

  const clearConfig = () => {
    localStorage.removeItem("ls_gemini_key")
    setApiKey("")
    setIsConfigured(false)
    setMessages([])
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || !apiKey || isLoading) return

    const userMsg = input.trim()
    setInput("")
    
    setMessages(prev => [...prev, { role: "user", text: userMsg }])
    setIsLoading(true)

    try {
      const fileCode = activeYText ? activeYText.toString() : ""
      let prompt = userMsg

      if (activeFile && fileCode.trim()) {
        prompt += `\n\n--- Context: Current file (${activeFile.split("/").pop()}) ---\n\`\`\`\n${fileCode}\n\`\`\`\n`
      }

      const contents = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }))
      
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      })

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: "You are an expert AI pair programmer integrated into a web-based IDE. Provide concise, accurate code snippets and architectural advice." }]
          }
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Error calling Gemini API")
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received."
      setMessages(prev => [...prev, { role: "model", text: replyText }])
    } catch (err) {
      setMessages(prev => [...prev, { role: "model", text: `❌ Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConfigured) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
        <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderCol}` }}>
          <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.8 }}>
             <Bot size={18} color={accent} /> AI Assistant
          </div>
        </div>

        <div style={{ padding: "32px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 24, alignItems: "center", textAlign: "center" }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: 20, background: `${accent}15`, 
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 10px 30px ${accent}22`
          }}>
            <Sparkles size={32} color={accent} />
          </div>
          
          <div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 }}>Intelligent Pairing</h3>
            <p style={{ fontSize: 13, color: textColor, opacity: 0.6, lineHeight: 1.6 }}>
              Unlock the power of Gemini 1.5 Flash directly in your workspace. 
              Purely anonymous—your keys stay local.
            </p>
          </div>
          
          <form onSubmit={saveConfig} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
                <Key size={12} /> Gemini API Key
              </label>
              <input
                type="password"
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{
                  background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
                  borderRadius: 10, padding: "10px 14px", outline: "none", fontSize: 13,
                  width: "100%", boxSizing: "border-box"
                }}
              />
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ 
                fontSize: 11, color: accent, textDecoration: "none", 
                display: "flex", alignItems: "center", gap: 4, alignSelf: "flex-end",
                fontWeight: 600
              }}>
                Get free key <ExternalLink size={10} />
              </a>
            </div>
            
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="ide-btn-premium"
              style={{
                background: apiKey.trim() ? accent : inputBg,
                color: apiKey.trim() ? "#fff" : textColor,
                opacity: apiKey.trim() ? 1 : 0.5,
                justifyContent: "center", border: "none"
              }}
            >
              Initialize Assistant
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      <div style={{
        padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderCol}`,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.8 }}>
          <Bot size={18} color={accent} /> Gemini Assistant
        </div>
        <button
          onClick={clearConfig}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.4 }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.4, textAlign: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Info size={24} />
            </div>
            <div>
               <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>How can I help?</div>
               <div style={{ fontSize: 11, maxWidth: 180, lineHeight: 1.5 }}>
                 Active file content is automatically shared as context for better answers.
               </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "90%", 
                background: msg.role === "user" ? accent : "rgba(255,255,255,0.03)",
                color: msg.role === "user" ? "#fff" : textColor,
                padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                border: msg.role === "model" ? `1px solid ${borderCol}` : "none",
                boxShadow: msg.role === "user" ? `0 4px 15px ${accent}22` : "none"
              }}
            >
              <div style={{ whiteSpace: "pre-wrap", fontFamily: msg.role === "model" && msg.text.includes("```") ? "monospace" : "inherit" }}>
                {msg.text}
              </div>
            </motion.div>
          ))
        )}
        
        {isLoading && (
          <div style={{ alignSelf: "flex-start", opacity: 0.6, fontSize: 12, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
               <CircleDashed size={14} color={accent} />
            </motion.div>
            Gemini is analyzing...
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: `1px solid ${borderCol}`, background: "rgba(255,255,255,0.02)" }}>
        <form onSubmit={sendMessage} style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={activeFile ? `Ask about ${activeFile.split("/").pop()}...` : "How can I help you code?"}
              style={{
                width: "100%", background: inputBg, color: textColor, border: `1px solid ${borderCol}`,
                borderRadius: 12, padding: "10px 14px", paddingRight: 40, outline: "none", fontSize: 13,
                boxSizing: "border-box"
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer",
                color: input.trim() && !isLoading ? accent : textColor,
                opacity: input.trim() && !isLoading ? 1 : 0.3,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
