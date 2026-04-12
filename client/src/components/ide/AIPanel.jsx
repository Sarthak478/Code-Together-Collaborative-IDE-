import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Bot, Send, Trash2, ExternalLink, Key, Sparkles, Info, CircleDashed,
  FileEdit, Terminal, FileSearch, ShieldCheck, CheckCircle, XCircle, AlertTriangle
} from "lucide-react"
import { API_URL } from "../../config"

/* ═══════════════════════════════════════════════════════════════════
   RALPH — Agentic AI Pair Programmer
   Tools: read_file, edit_file, run_command
   Privacy: Zero persistence. useState only. Clear = total amnesia.
   ═══════════════════════════════════════════════════════════════════ */

const GEMINI_TOOLS = [{
  functionDeclarations: [
    {
      name: "list_files",
      description: "List all files and folders in a directory. ALWAYS call this first with path '/' to discover the project's root folder name and structure before doing anything else.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list, e.g. '/' for root, or '/myproject/src' for a subfolder" }
        },
        required: ["path"]
      }
    },
    {
      name: "read_file",
      description: "Read the full contents of an existing file. Use the exact path as discovered by list_files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Exact file path as shown by list_files, e.g. /myproject/src/index.js" }
        },
        required: ["path"]
      }
    },
    {
      name: "edit_file",
      description: "Replace the entire contents of an EXISTING file. Use the exact path as discovered by list_files. Only create a new file if the user explicitly asks for a new file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Exact file path as shown by list_files, e.g. /myproject/src/App.jsx" },
          content: { type: "string", description: "The complete new file content" }
        },
        required: ["path", "content"]
      }
    },
    {
      name: "run_command",
      description: "Execute a shell command in the project terminal.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run, e.g. npm install express" }
        },
        required: ["command"]
      }
    }
  ]
}]

const SYSTEM_PROMPT = `You are Ralph, an elite autonomous AI coding agent embedded in CodeTogether IDE.

CORE IDENTITY: You are an ACTION-FIRST agent. You DO things. You DO NOT ask clarifying questions.

TOOLS:
- list_files(path): List directory contents. ALWAYS call this FIRST with "/" to discover the project structure.
- read_file(path): Read a file. Use EXACT paths from list_files results.
- edit_file(path, content): Replace an existing file's content. Use EXACT paths from list_files.
- run_command(command): Run a terminal command.

CRITICAL RULES — PATH DISCOVERY:

1. YOUR ABSOLUTE FIRST ACTION on every task must be: list_files("/") to discover the root folder name. Projects are usually inside a root folder like /myproject/ — files are NOT directly at /.

2. After discovering the root folder, call list_files on subfolders (e.g. list_files("/myproject/src")) to map out the structure before making any changes.

3. NEVER GUESS file paths. ALWAYS use the exact paths returned by list_files. If list_files shows /qrgen/src/App.jsx, you must use exactly "/qrgen/src/App.jsx" — not "/src/App.jsx" or "/App.jsx".

4. NEVER CREATE NEW FILES unless the user explicitly asks you to create a new file. If the task is to modify existing behavior, EDIT the existing files.

5. Before editing ANY file, ALWAYS read_file it first to see its current content.

BEHAVIORAL RULES:

1. NEVER ASK CLARIFYING QUESTIONS. Make smart professional decisions.

2. ALWAYS READ BEFORE WRITING. Read the file first, understand it, then edit.

3. RESEARCH THE CODEBASE. list_files to find the structure, then read 3-5 key files (package.json, main entry, config, relevant components) to understand patterns.

4. MAKE DECISIONS. You are the expert. If details are ambiguous, decide.

5. PROVIDE COMPLETE FILE CONTENT. When using edit_file, provide the ENTIRE file.

6. BE CONCISE. After completing work, give a 2-3 sentence summary. Let the code speak.

7. ZERO MEMORY. Each conversation starts fresh. Always discover the project structure first.

8. HANDLE ERRORS AUTONOMOUSLY. If something fails, adapt and try alternatives.`


/* ── Action Card Component ── */
function ActionCard({ action, accent, borderCol, textColor }) {
  const iconMap = {
    list_files: <FileSearch size={14} />,
    read_file: <FileSearch size={14} />,
    edit_file: <FileEdit size={14} />,
    run_command: <Terminal size={14} />,
  }
  const labelMap = {
    list_files: "Listed Files",
    read_file: "Read File",
    edit_file: "Edited File",
    run_command: "Ran Command",
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: `${accent}08`, border: `1px solid ${accent}30`,
        borderRadius: 8, padding: "8px 12px", fontSize: 12,
        display: "flex", alignItems: "center", gap: 8,
        color: textColor, fontFamily: "monospace"
      }}
    >
      <div style={{ color: accent, display: "flex", alignItems: "center" }}>
        {iconMap[action.tool] || <Bot size={14} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700, color: accent, marginRight: 6 }}>
          {labelMap[action.tool] || action.tool}
        </span>
        <span style={{ opacity: 0.8, wordBreak: "break-all" }}>
          {action.tool === "run_command" ? action.args.command : (action.args.path || "")}
        </span>
      </div>
      {action.status === "success" ? (
        <CheckCircle size={14} color="#4ade80" />
      ) : action.status === "error" ? (
        <XCircle size={14} color="#f87171" />
      ) : (
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <CircleDashed size={14} color={accent} />
        </motion.div>
      )}
    </motion.div>
  )
}


/* ── Consent Dialog ── */
function ConsentDialog({ onAccept, onDecline, accent, textColor, borderCol, inputBg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: inputBg, border: `1px solid ${accent}50`, borderRadius: 12,
        padding: 16, display: "flex", flexDirection: "column", gap: 12, alignSelf: "flex-start",
        maxWidth: "95%"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
        <ShieldCheck size={18} color={accent} />
        <span>Ralph wants to take actions</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.75 }}>
        Ralph needs permission to <strong>edit files</strong> and <strong>run terminal commands</strong> in your project.
        This is a one-time approval for this session. Clearing the chat revokes all access.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onAccept}
          style={{
            flex: 1, padding: "8px 16px", borderRadius: 8, border: "none",
            background: accent, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer"
          }}
        >
          ✓ Allow Actions
        </button>
        <button
          onClick={onDecline}
          style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${borderCol}`,
            background: "transparent", color: textColor, fontWeight: 600, fontSize: 12, cursor: "pointer"
          }}
        >
          Deny
        </button>
      </div>
    </motion.div>
  )
}


/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function AIPanel({ 
  activeFile, activeYText, textColor, borderCol, panelBg, inputBg, accent, isDark, headerBg,
  autoPrompt,
  // Agentic props
  fileSystem, ydoc, roomId, openFile, sendTerminalCommand
}) {
  // ── All state is ephemeral (useState only, ZERO localStorage for data) ──
  const [apiKey, setApiKey] = useState("")
  const [isConfigured, setIsConfigured] = useState(false)
  const [messages, setMessages] = useState([])   // { role, text, actions[] }
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)
  const [pendingConsentResolve, setPendingConsentResolve] = useState(null)
  
  const scrollRef = useRef(null)
  const consentResolveRef = useRef(null)
  const hasConsentedRef = useRef(false) // Ref mirrors state to avoid stale closures

  // Load API key from localStorage (key only, no data)
  useEffect(() => {
    const savedKey = localStorage.getItem("ls_gemini_key")
    if (savedKey) {
      setApiKey(savedKey)
      setIsConfigured(true)
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading])

  // ── Model Discovery (cached per session in state, NOT localStorage) ──
  const modelRef = useRef(null)

  const getModel = useCallback(async () => {
    if (modelRef.current) return modelRef.current
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      const data = await res.json()
      if (data.models) {
        const best = data.models.find(m => m.name.includes("flash") && m.supportedGenerationMethods?.includes("generateContent")) ||
                     data.models.find(m => m.supportedGenerationMethods?.includes("generateContent"))
        modelRef.current = best ? best.name : "models/gemini-2.0-flash"
      } else {
        modelRef.current = "models/gemini-2.0-flash"
      }
    } catch {
      modelRef.current = "models/gemini-2.0-flash"
    }
    return modelRef.current
  }, [apiKey])


  // ── Tool Executors ──

  const executeListFiles = useCallback(async (path) => {
    try {
      const resp = await fetch(`${API_URL}/tree?roomId=${roomId}&path=${encodeURIComponent(path)}`)
      if (!resp.ok) throw new Error(`Cannot list: ${path}`)
      const entries = await resp.json()
      const listing = entries.map(e => `${e.type === "folder" ? "📁" : "📄"} ${e.path}`).join("\n")
      return { success: true, files: listing || "(empty directory)" }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }, [roomId])

  const executeReadFile = useCallback(async (path) => {
    try {
      const resp = await fetch(`${API_URL}/content?roomId=${roomId}&path=${encodeURIComponent(path)}`)
      if (!resp.ok) throw new Error(`File not found: ${path}`)
      const content = await resp.text()
      return { success: true, content: content.substring(0, 30000) } // Cap at 30k chars
    } catch (e) {
      return { success: false, error: e.message }
    }
  }, [roomId])

  const executeEditFile = useCallback(async (path, content) => {
    try {
      // 1. Write to Yjs (collaboratively synced)
      if (ydoc && fileSystem) {
        const ytext = ydoc.getText(`file::${path}`)
        ydoc.transact(() => {
          if (ytext.length > 0) ytext.delete(0, ytext.length)
          ytext.insert(0, content)
        })
      }

      // 2. Save to disk via REST
      await fetch(`${API_URL}/fs/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, path, content })
      })

      // 3. Open the file in the editor so the user can see it
      if (openFile) openFile(path)

      // 4. Refresh the file tree
      const parentPath = path.split("/").slice(0, -1).join("/") || "/"
      if (fileSystem?.refreshPath) fileSystem.refreshPath(parentPath)

      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }, [ydoc, fileSystem, roomId, openFile])

  const executeRunCommand = useCallback(async (command) => {
    try {
      if (sendTerminalCommand) {
        sendTerminalCommand(command)
        return { success: true, note: "Command sent to terminal. Output will appear in the terminal panel." }
      }
      return { success: false, error: "Terminal not available" }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }, [sendTerminalCommand])


  // ── Consent Management ──

  const requestConsent = useCallback(() => {
    return new Promise((resolve) => {
      consentResolveRef.current = resolve
      setPendingConsentResolve(true)
    })
  }, [])

  const handleConsentAccept = useCallback(() => {
    setHasConsented(true)
    hasConsentedRef.current = true
    setPendingConsentResolve(false)
    if (consentResolveRef.current) consentResolveRef.current(true)
    consentResolveRef.current = null
  }, [])

  const handleConsentDecline = useCallback(() => {
    setPendingConsentResolve(false)
    if (consentResolveRef.current) consentResolveRef.current(false)
    consentResolveRef.current = null
  }, [])


  // ═══════════════════════════════════════════════════
  // THE AGENTIC LOOP
  // ═══════════════════════════════════════════════════
  const runAgenticLoop = useCallback(async (conversationContents) => {
    const modelName = await getModel()
    const MAX_ITERATIONS = 15 // Allow enough iterations for reading + editing + running
    let currentContents = [...conversationContents]
    let allActions = []

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Call Gemini with tools
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: currentContents,
          tools: GEMINI_TOOLS,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Gemini API error")

      const candidate = data.candidates?.[0]
      if (!candidate?.content?.parts) throw new Error("No response from Gemini")

      const parts = candidate.content.parts

      // Check if there are function calls
      const functionCalls = parts.filter(p => p.functionCall)
      const textParts = parts.filter(p => p.text)

      if (functionCalls.length === 0) {
        // No tool calls — final text response
        const finalText = textParts.map(p => p.text).join("\n") || "Done."
        return { text: finalText, actions: allActions }
      }

      // There are tool calls — request consent if needed (use ref to avoid stale closure)
      if (!hasConsentedRef.current) {
        const approved = await requestConsent()
        if (!approved) {
          return { text: "⚠️ Action denied. Ralph will not modify your project without permission.", actions: [] }
        }
      }

      // Add the model's response (with function calls) to conversation
      currentContents.push({ role: "model", parts })

      // Execute each function call
      const functionResponses = []
      for (const part of functionCalls) {
        const { name, args } = part.functionCall
        const action = { tool: name, args: args || {}, status: "running" }
        allActions.push(action)

        // Update UI with running action
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === "model") {
            return [...prev.slice(0, -1), { ...last, actions: [...allActions] }]
          }
          return [...prev, { role: "model", text: "", actions: [...allActions] }]
        })

        let result
        try {
          if (name === "list_files") {
            result = await executeListFiles(args.path)
          } else if (name === "read_file") {
            result = await executeReadFile(args.path)
          } else if (name === "edit_file") {
            result = await executeEditFile(args.path, args.content)
          } else if (name === "run_command") {
            result = await executeRunCommand(args.command)
          } else {
            result = { error: `Unknown tool: ${name}` }
          }
          action.status = result.success !== false ? "success" : "error"
        } catch (e) {
          result = { error: e.message }
          action.status = "error"
        }

        // Update UI with completed action
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === "model") {
            return [...prev.slice(0, -1), { ...last, actions: [...allActions] }]
          }
          return prev
        })

        functionResponses.push({
          functionResponse: {
            name,
            response: result
          }
        })
      }

      // Add function responses to conversation
      currentContents.push({ role: "user", parts: functionResponses })
    }

    return { text: "Reached maximum tool iterations. Please continue the conversation.", actions: allActions }
  }, [apiKey, getModel, hasConsented, requestConsent, executeListFiles, executeReadFile, executeEditFile, executeRunCommand])


  // ── Send Message Handler ──
  const sendMessage = useCallback(async (e, overrideText = null) => {
    if (e) e.preventDefault()
    const userMsg = overrideText || input.trim()
    if (!userMsg || !apiKey || isLoading) return

    setInput("")
    setMessages(prev => [...prev, { role: "user", text: userMsg }])
    setIsLoading(true)

    try {
      // Build context
      const fileCode = activeYText ? activeYText.toString() : ""
      let prompt = userMsg
      if (activeFile && fileCode.trim()) {
        prompt += `\n\n--- Context: Currently open file (${activeFile}) ---\n\`\`\`\n${fileCode.substring(0, 15000)}\n\`\`\`\n`
      }

      // Build conversation contents
      const contents = messages
        .filter(m => m.role === "user" || m.role === "model")
        .map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text || "OK" }]
        }))
      contents.push({ role: "user", parts: [{ text: prompt }] })

      // Run the agentic loop
      const result = await runAgenticLoop(contents)

      // Add final response
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === "model" && last.actions?.length > 0) {
          // Merge text with existing action card message
          return [...prev.slice(0, -1), { ...last, text: result.text }]
        }
        return [...prev, { role: "model", text: result.text, actions: result.actions }]
      })
    } catch (err) {
      setMessages(prev => [...prev, { role: "model", text: `❌ Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }, [input, apiKey, isLoading, activeFile, activeYText, messages, runAgenticLoop])


  // ── Auto-prompt from terminal error watcher ──
  useEffect(() => {
    if (autoPrompt && isConfigured && !isLoading) {
      sendMessage(null, autoPrompt)
    }
  }, [autoPrompt]) // eslint-disable-line


  // ── Config ──
  const saveConfig = (e) => {
    e.preventDefault()
    if (!apiKey.trim()) return
    localStorage.setItem("ls_gemini_key", apiKey.trim())
    setIsConfigured(true)
  }

  const clearConfig = () => {
    // ═══ TOTAL AMNESIA ═══
    localStorage.removeItem("ls_gemini_key")
    localStorage.removeItem("ls_gemini_model")
    setApiKey("")
    setIsConfigured(false)
    setMessages([])
    setHasConsented(false)
    hasConsentedRef.current = false
    setPendingConsentResolve(false)
    consentResolveRef.current = null
    modelRef.current = null  // Forget the model too
  }


  // ═══════════════════════════════════════════════════
  // RENDER: Configuration Screen
  // ═══════════════════════════════════════════════════
  if (!isConfigured) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
        <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderCol}` }}>
          <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.8 }}>
             <Bot size={18} color={accent} /> Ralph
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
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 }}>Agentic AI Programmer</h3>
            <p style={{ fontSize: 13, color: textColor, opacity: 0.6, lineHeight: 1.6 }}>
              Ralph can read your files, edit your code, and run terminal commands — all autonomously.
              Zero data persistence. Your keys stay local, your code stays private.
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
              Awaken Ralph
            </button>
          </form>
        </div>
      </div>
    )
  }


  // ═══════════════════════════════════════════════════
  // RENDER: Chat Interface
  // ═══════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderCol}`,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.8 }}>
          <Bot size={18} color={accent} /> Ralph
          {hasConsented && (
            <span style={{ fontSize: 9, background: `${accent}20`, color: accent, padding: "2px 6px", borderRadius: 4, fontWeight: 600, letterSpacing: 0 }}>
              AGENTIC
            </span>
          )}
        </div>
        <button
          onClick={clearConfig}
          title="Clear chat & revoke access (total amnesia)"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.4 }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="ide-scroll" style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.4, textAlign: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <Info size={24} />
            </div>
            <div>
               <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>What should I build?</div>
               <div style={{ fontSize: 11, maxWidth: 200, lineHeight: 1.5 }}>
                 Ralph can read, edit, and run your code autonomously. Try: "Fix the import error" or "Create a new API route"
               </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx}>
              {/* Action Cards */}
              {msg.actions?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: msg.text ? 8 : 0 }}>
                  {msg.actions.map((action, aidx) => (
                    <ActionCard key={aidx} action={action} accent={accent} borderCol={borderCol} textColor={textColor} />
                  ))}
                </div>
              )}

              {/* Text Message */}
              {msg.text && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "90%", 
                    background: msg.role === "user" ? accent : "rgba(255,255,255,0.03)",
                    color: msg.role === "user" ? "#fff" : textColor,
                    padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                    border: msg.role === "model" ? `1px solid ${borderCol}` : "none",
                    boxShadow: msg.role === "user" ? `0 4px 15px ${accent}22` : "none",
                    display: msg.role === "user" ? "block" : "block",
                    marginLeft: msg.role === "model" ? 0 : "auto"
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap", fontFamily: msg.role === "model" && msg.text.includes("```") ? "monospace" : "inherit", fontSize: msg.role === "model" && msg.text.includes("```") ? 11 : 13 }}>
                    {msg.text}
                  </div>
                </motion.div>
              )}
            </div>
          ))
        )}
        
        {/* Consent Dialog */}
        {pendingConsentResolve && (
          <ConsentDialog
            onAccept={handleConsentAccept}
            onDecline={handleConsentDecline}
            accent={accent}
            textColor={textColor}
            borderCol={borderCol}
            inputBg={inputBg}
          />
        )}

        {/* Loading */}
        {isLoading && !pendingConsentResolve && (
          <div style={{ alignSelf: "flex-start", opacity: 0.6, fontSize: 12, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
               <CircleDashed size={14} color={accent} />
            </motion.div>
            Ralph is working...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 16, borderTop: `1px solid ${borderCol}`, background: "rgba(255,255,255,0.02)" }}>
        <form onSubmit={sendMessage} style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={activeFile ? `Ask Ralph about ${activeFile.split("/").pop()}...` : "Tell Ralph what to do..."}
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
