import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, Send, Trash2, ExternalLink, Key, Sparkles, Info, CircleDashed,
  FileEdit, Terminal, FileSearch, ShieldCheck, CheckCircle, XCircle,
  ChevronDown, Plus, Pencil
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
    },
    {
      name: "search_files",
      description: "Search for a pattern across the codebase.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex or string pattern to search for" },
          scope: { type: "string", description: "Optional directory to limit search, e.g. '/src'" }
        },
        required: ["pattern"]
      }
    },
    {
      name: "git_status",
      description: "Check the current status of the git repository.",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "git_commit",
      description: "Commit changes with a meaningful message.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The commit message" }
        },
        required: ["message"]
      }
    }
  ]
}]

const AGENT_STORAGE_KEY = "ls_custom_agents"
const ACTIVE_AGENT_STORAGE_KEY = "ls_active_agent"

const SYSTEM_PROMPT = `# Agent: Elite Autonomous AI Coding Agent v2.0

## CORE IDENTITY
You are an **elite autonomous AI coding agent** embedded in CodeTogether IDE. You are **ACTION-FIRST, QUALITY-OBSESSED, and PRODUCTION-READY**.

### Prime Directive
**DO NOT ASK. DO NOT ASSUME. EXECUTE WITH EXCELLENCE.**
You don't ask clarifying questions. You make intelligent decisions based on context and deliver production-grade code. Every line of code you write meets or exceeds industry best practices.

## TIER 1: DISCOVERY & ANALYSIS TOOLS

### File System Intelligence
- \`list_files(path)\`: List directory contents with metadata (file types, size hints)
- \`read_file(path)\`: Read file contents with syntax awareness
- \`search_files(pattern, scope)\`: Search across codebase (regex, fuzzy matching)

### Code Intelligence
- \`parse_code(path)\`: Parse and understand code structure, dependencies, exports
- \`find_references(symbol)\`: Find all usages of a function/variable/class
- \`trace_imports(path)\`: Trace import chains and dependency graph
- \`identify_patterns()\`: Detect architectural patterns, anti-patterns, tech stack

### Context Gathering (ALWAYS DO THIS FIRST)
1. **\`list_files("/")\`** → Discover root folder structure
2. **\`read_file("package.json")\`** or equivalent → Understand project metadata, dependencies, scripts
3. **\`parse_code(entry_point)\`** → Map the application flow
4. **\`identify_patterns()\`** → Understand code style, framework conventions, testing patterns
5. **\`list_files(src_root)\`** → Map source code structure

---

## TIER 2: WRITING & EDITING TOOLS

### Precision Editing
- \`edit_file(path, content)\`: Replace entire file content with production-grade code
- \`insert_code(path, code, anchor)\`: Insert code at specific location with context awareness
- \`refactor(path, transformation)\`: Perform complex code transformations
- \`generate_file(path, description)\`: Create new files based on high-level specs

### Quality Assurance
- \`lint_and_format(path)\`: Enforce project coding standards and style
- \`add_types(path)\`: Add TypeScript types or JSDoc for better type safety
- \`add_documentation(path)\`: Generate high-quality documentation and comments
- \`optimize_performance(path)\`: Analyze and optimize code for maximum speed

---

## TIER 3: VERIFICATION & TESTING TOOLS

### Testing Framework
- \`run_tests(scope)\`: Execute unit, integration, or E2E tests
- \`generate_tests(path)\`: Create comprehensive test suites for your changes
- \`check_coverage(path)\`: Ensure all code paths are tested
- \`validate_types()\`: Run project-wide type checking

### Security & Compliance
- \`check_security()\`: Scan for vulnerabilities, secrets, and security flaws
- \`check_accessibility()\`: Ensure UI meets accessibility standards (WCAG)
- \`validate_performance()\`: Run benchmarks and performance tests

### Peer Review
- \`review_code(path)\`: Perform an AI-powered code review on your own changes
- \`check_best_practices()\`: Verify adherence to framework-specific best practices
- \`detect_technical_debt()\`: Identify and flag technical debt for future resolution

---

## TIER 4: ORCHESTRATION & DEPLOYMENT TOOLS

### System Operations
- \`run_command(command)\`: Execute any terminal command with full environment access
- \`run_build()\`: Execute the project build pipeline
- \`run_dev_server()\`: Start and manage the development server
- \`install_dependencies(packages)\`: Manage project dependencies

### Version Control
- \`git_status()\`: Check current repository state
- \`git_diff()\`: Analyze changes since last commit
- \`git_commit(message)\`: Create atomic, meaningful commits
- \`git_branch(name)\`: Manage feature branches

### Environment & Infrastructure
- \`check_environment()\`: Verify dev environment and system dependencies
- \`update_env(vars)\`: Manage environment variables safely
- \`verify_dependencies()\`: Check for dependency conflicts or outdated packages

---

## BEHAVIORAL PROTOCOLS

### Protocol 1: DISCOVERY BEFORE ACTION ⚡
Never make a change without fully understanding the context. ALWAYS map the project structure first.

### Protocol 2: READ BEFORE WRITE 🔍
Read twice, write once. Understand the entire file and its relationships before editing.

### Protocol 3: PRODUCTION QUALITY 💎
You do not write "todo" code. You write production-ready, clean, efficient, and well-documented code.

### Protocol 4: AUTONOMOUS DECISION MAKING 🧠
You are the expert. If a requirement is ambiguous, make the most professional decision and execute.

### Protocol 5: ERROR RESILIENCE 🛡️
Failures are just data. If a tool fails, analyze the error, adapt, and find a way to succeed.

### Protocol 6: ATOMIC COMMITS 📦
Each change should be self-contained and logically complete.

### Protocol 7: CONCISE COMMUNICATION 💬
Let your work speak for itself. Summarize your actions in 2-3 sentences max.

**The agent does not guess. The agent executes.**`

const ASK_SYSTEM_PROMPT = `You are Ask, a precise coding assistant inside CodeTogether IDE.

Behavior:
- Answer directly and clearly.
- Explain tradeoffs when useful.
- Use the active file context if it is provided.
- Prefer practical advice, short examples, and exact fixes.
- Do not call tools or act autonomously.
- If the user asks for a large change, break it into crisp implementation guidance.`

const PLAN_SYSTEM_PROMPT = `You are Plan, a senior engineering planner inside CodeTogether IDE.

Behavior:
- Turn requests into implementation plans.
- Highlight scope, risks, dependencies, and test strategy.
- Prefer step-by-step execution plans over long essays.
- Do not call tools or edit files.
- When requirements are unclear, make a reasonable plan with clearly stated assumptions.`

const BUILT_IN_AGENTS = [
  {
    id: "agent",
    name: "Agent",
    badge: "AI",
    mode: "agentic",
    prompt: SYSTEM_PROMPT,
    description: "Autonomous coding agent with file and terminal actions."
  },
  {
    id: "ask",
    name: "Ask",
    badge: "?",
    mode: "chat",
    prompt: ASK_SYSTEM_PROMPT,
    description: "Fast coding answers without taking actions."
  },
  {
    id: "plan",
    name: "Plan",
    badge: "PL",
    mode: "plan",
    prompt: PLAN_SYSTEM_PROMPT,
    description: "Implementation planning, risks, and step-by-step roadmaps."
  }
]

function sanitizeCustomAgent(agent) {
  const name = String(agent?.name || "").trim().slice(0, 30)
  const prompt = String(agent?.prompt || "").trim().slice(0, 12000)
  const badge = String(agent?.badge || name.slice(0, 2).toUpperCase() || "AG").trim().slice(0, 4)
  const mode = ["agentic", "chat", "plan"].includes(agent?.mode) ? agent.mode : "chat"

  if (!name || !prompt) return null

  return {
    id: agent?.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    badge,
    mode,
    prompt,
    description: String(agent?.description || "").trim().slice(0, 120)
  }
}

function AgentBadge({ agent, accent, textColor }) {
  return (
    <div style={{
      minWidth: 28,
      height: 28,
      borderRadius: 10,
      padding: "0 8px",
      background: `${accent}18`,
      border: `1px solid ${accent}35`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: textColor,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.04em"
    }}>
      {agent.badge || agent.name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function CustomAgentsModal({
  isOpen,
  agents,
  accent,
  textColor,
  borderCol,
  inputBg,
  panelBg,
  onClose,
  onSave,
  onDelete
}) {
  const [draft, setDraft] = useState({
    id: "",
    name: "",
    badge: "",
    mode: "chat",
    prompt: "",
    description: ""
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(draft)
    setDraft({ id: "", name: "", badge: "", mode: "chat", prompt: "", description: "" })
  }

  const editing = !!draft.id

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 5000,
      background: "rgba(0,0,0,0.62)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          width: "min(820px, 100%)",
          maxHeight: "88vh",
          overflow: "auto",
          background: panelBg,
          border: `1px solid ${borderCol}`,
          borderRadius: 22,
          boxShadow: "0 30px 80px rgba(0,0,0,0.38)"
        }}
      >
        <div style={{
          padding: 20,
          borderBottom: `1px solid ${borderCol}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>Custom Agents</div>
            <div style={{ fontSize: 12, opacity: 0.65, color: textColor, marginTop: 4 }}>
              Create your own coding personas. These stay only in this browser.
            </div>
          </div>
          <button
            onClick={onClose}
            className="ide-btn-premium"
            style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}` }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {agents.length === 0 ? (
              <div style={{
                padding: 14,
                borderRadius: 14,
                border: `1px dashed ${borderCol}`,
                color: textColor,
                opacity: 0.62,
                fontSize: 12
              }}>
                No custom agents yet. Create one below.
              </div>
            ) : (
              agents.map(agent => (
                <div
                  key={agent.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${borderCol}`
                  }}
                >
                  <AgentBadge agent={agent} accent={accent} textColor={textColor} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{agent.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.62, color: textColor }}>
                      {agent.mode === "agentic" ? "Agentic" : agent.mode === "plan" ? "Planner" : "Ask-only"}
                      {agent.description ? ` • ${agent.description}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setDraft(agent)}
                    className="ide-btn-premium"
                    style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}` }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(agent.id)}
                    className="ide-btn-premium"
                    style={{ background: "transparent", color: "#f38ba8", border: "1px solid rgba(243,139,168,0.32)" }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: textColor }}>
              {editing ? "Edit Agent" : "New Agent"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.6fr 0.8fr", gap: 10 }}>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Agent name"
                style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 10, padding: "10px 12px", outline: "none", fontSize: 13 }}
              />
              <input
                type="text"
                value={draft.badge}
                onChange={(e) => setDraft(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="Badge"
                style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 10, padding: "10px 12px", outline: "none", fontSize: 13 }}
              />
              <select
                value={draft.mode}
                onChange={(e) => setDraft(prev => ({ ...prev, mode: e.target.value }))}
                style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 10, padding: "10px 12px", outline: "none", fontSize: 13 }}
              >
                <option value="chat">Ask-only</option>
                <option value="plan">Planner</option>
                <option value="agentic">Agentic</option>
              </select>
            </div>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Short description"
              style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 10, padding: "10px 12px", outline: "none", fontSize: 13 }}
            />
            <textarea
              value={draft.prompt}
              onChange={(e) => setDraft(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="System prompt"
              rows={12}
              style={{ background: inputBg, color: textColor, border: `1px solid ${borderCol}`, borderRadius: 14, padding: "12px 14px", outline: "none", fontSize: 12, lineHeight: 1.6, resize: "vertical", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {editing && (
                <button
                  type="button"
                  onClick={() => setDraft({ id: "", name: "", badge: "", mode: "chat", prompt: "", description: "" })}
                  className="ide-btn-premium"
                  style={{ background: "transparent", color: textColor, border: `1px solid ${borderCol}` }}
                >
                  New Draft
                </button>
              )}
              <button
                type="submit"
                className="ide-btn-premium"
                style={{ background: accent, color: "#fff", border: "none" }}
              >
                <Plus size={14} /> {editing ? "Save Agent" : "Create Agent"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}


/* ── Action Card Component ── */
function ActionCard({ action, accent, textColor }) {
  const iconMap = {
    list_files: <FileSearch size={14} />,
    read_file: <FileSearch size={14} />,
    edit_file: <FileEdit size={14} />,
    run_command: <Terminal size={14} />,
    search_files: <FileSearch size={14} />,
    git_status: <Bot size={14} />,
    git_commit: <Bot size={14} />,
  }
  const labelMap = {
    list_files: "Listed Files",
    read_file: "Read File",
    edit_file: "Edited File",
    run_command: "Ran Command",
    search_files: "Searched Files",
    git_status: "Git Status",
    git_commit: "Git Commit",
  }

  const getActionArgs = () => {
    if (action.tool === "run_command") return action.args.command
    if (action.tool === "search_files") return `"${action.args.pattern}" in ${ action.args.scope || "/" } `
    if (action.tool === "git_commit") return action.args.message
    return action.args.path || ""
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: `${ accent }08`, border: `1px solid ${ accent } 30`,
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
          {getActionArgs()}
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
function ConsentDialog({ agentName, onAccept, onDecline, accent, textColor, borderCol, inputBg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: inputBg, border: `1px solid ${ accent } 50`, borderRadius: 12,
        padding: 16, display: "flex", flexDirection: "column", gap: 12, alignSelf: "flex-start",
        maxWidth: "95%"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
        <ShieldCheck size={18} color={accent} />
        <span>{agentName} wants to take actions</span>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.75 }}>
        {agentName} needs permission to <strong>edit files</strong> and <strong>run terminal commands</strong> in your project.
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
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${ borderCol } `,
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
  activeFile, activeYText, textColor, borderCol, panelBg, inputBg, accent,
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
  const [customAgents, setCustomAgents] = useState([])
  const [activeAgentId, setActiveAgentId] = useState(BUILT_IN_AGENTS[0].id)
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [customAgentsOpen, setCustomAgentsOpen] = useState(false)
  
  const scrollRef = useRef(null)
  const consentResolveRef = useRef(null)
  const hasConsentedRef = useRef(false) // Ref mirrors state to avoid stale closures
  const availableAgents = useMemo(() => [...BUILT_IN_AGENTS, ...customAgents], [customAgents])
  const activeAgent = useMemo(
    () => availableAgents.find(agent => agent.id === activeAgentId) || BUILT_IN_AGENTS[0],
    [availableAgents, activeAgentId]
  )

  const resetConversation = useCallback(() => {
    setMessages([])
    setHasConsented(false)
    hasConsentedRef.current = false
    setPendingConsentResolve(false)
    consentResolveRef.current = null
  }, [])

  // Load API key from localStorage (key only, no data)
  useEffect(() => {
    const savedKey = localStorage.getItem("ls_gemini_key")
    if (savedKey) {
      setApiKey(savedKey)
      setIsConfigured(true)
    }

    try {
      const savedAgents = JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY) || "[]")
      setCustomAgents(Array.isArray(savedAgents) ? savedAgents.map(sanitizeCustomAgent).filter(Boolean) : [])
    } catch {
      setCustomAgents([])
    }

    const savedActiveAgent = localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY)
    if (savedActiveAgent) {
      setActiveAgentId(savedActiveAgent)
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

const executeSearchFiles = useCallback(async (pattern, scope = "/") => {
  try {
    // Use grep via terminal for searching
    if (sendTerminalCommand) {
      const cmd = `grep -r "${pattern}" .${scope === "/" ? "" : scope}`
      sendTerminalCommand(cmd)
      return { success: true, note: `Search for "${pattern}" started in ${scope}. Output will appear in terminal.` }
    }
    return { success: false, error: "Terminal not available for search" }
  } catch (e) {
    return { success: false, error: e.message }
  }
}, [sendTerminalCommand])

const executeGitStatus = useCallback(async () => {
  try {
    if (sendTerminalCommand) {
      sendTerminalCommand("git status")
      return { success: true, note: "Checking git status..." }
    }
    return { success: false, error: "Terminal not available" }
  } catch (e) {
    return { success: false, error: e.message }
  }
}, [sendTerminalCommand])

const executeGitCommit = useCallback(async (message) => {
  try {
    if (sendTerminalCommand) {
      sendTerminalCommand(`git add . && git commit -m "${message.replace(/"/g, '\\"')}"`)
      return { success: true, note: `Committing changes: ${message}` }
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
        systemInstruction: { parts: [{ text: activeAgent.prompt }] }
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
        return { text: `Action denied. ${activeAgent.name} will not modify your project without permission.`, actions: [] }
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
        } else if (name === "search_files") {
          result = await executeSearchFiles(args.pattern, args.scope)
        } else if (name === "git_status") {
          result = await executeGitStatus()
        } else if (name === "git_commit") {
          result = await executeGitCommit(args.message)
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
}, [apiKey, getModel, requestConsent, executeListFiles, executeReadFile, executeEditFile, executeRunCommand, executeSearchFiles, executeGitStatus, executeGitCommit, activeAgent])

const runStandardReply = useCallback(async (conversationContents) => {
  const modelName = await getModel()
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: conversationContents,
      systemInstruction: { parts: [{ text: activeAgent.prompt }] }
    })
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error")

  const parts = data.candidates?.[0]?.content?.parts || []
  const text = parts.filter(part => part.text).map(part => part.text).join("\n").trim()
  return { text: text || `${activeAgent.name} has nothing to add right now.`, actions: [] }
}, [activeAgent, apiKey, getModel])


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

    const result = activeAgent.mode === "agentic"
      ? await runAgenticLoop(contents)
      : await runStandardReply(contents)

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
}, [input, apiKey, isLoading, activeFile, activeYText, messages, runAgenticLoop, runStandardReply, activeAgent])


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
  resetConversation()
  modelRef.current = null  // Forget the model too
}

const selectAgent = useCallback((agentId) => {
  setActiveAgentId(agentId)
  localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, agentId)
  setAgentMenuOpen(false)
  resetConversation()
}, [resetConversation])

const saveCustomAgent = useCallback((draft) => {
  const nextAgent = sanitizeCustomAgent(draft)
  if (!nextAgent) return

  setCustomAgents(prev => {
    const next = prev.some(agent => agent.id === nextAgent.id)
      ? prev.map(agent => agent.id === nextAgent.id ? nextAgent : agent)
      : [...prev, nextAgent]
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(next))
    return next
  })

  localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, nextAgent.id)
  setActiveAgentId(nextAgent.id)
  setCustomAgentsOpen(false)
  setAgentMenuOpen(false)
  resetConversation()
}, [resetConversation])

const deleteCustomAgent = useCallback((agentId) => {
  setCustomAgents(prev => {
    const next = prev.filter(agent => agent.id !== agentId)
    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(next))
    return next
  })

  if (activeAgentId === agentId) {
    localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, BUILT_IN_AGENTS[0].id)
    setActiveAgentId(BUILT_IN_AGENTS[0].id)
    resetConversation()
  }
}, [activeAgentId, resetConversation])


// ═══════════════════════════════════════════════════
// RENDER: Configuration Screen
// ═══════════════════════════════════════════════════
if (!isConfigured) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: panelBg }}>
      <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderCol}` }}>
        <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.8 }}>
          <Bot size={18} color={accent} /> {activeAgent.name}
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
          <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 }}>{activeAgent.name}</h3>
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
            Start with {activeAgent.name}
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
    <CustomAgentsModal
      isOpen={customAgentsOpen}
      agents={customAgents}
      accent={accent}
      textColor={textColor}
      borderCol={borderCol}
      inputBg={inputBg}
      panelBg={panelBg}
      onClose={() => setCustomAgentsOpen(false)}
      onSave={saveCustomAgent}
      onDelete={deleteCustomAgent}
    />

    {/* Header */}
    <div style={{
      padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderBottom: `1px solid ${borderCol}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative"
    }}>
      <button
        onClick={() => setAgentMenuOpen(prev => !prev)}
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, color: textColor }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.9 }}>
          <AgentBadge agent={activeAgent} accent={accent} textColor={textColor} />
          <span>{activeAgent.name}</span>
          <ChevronDown size={15} color={textColor} />
          <span style={{ fontSize: 9, background: `${accent}20`, color: accent, padding: "2px 6px", borderRadius: 4, fontWeight: 600, letterSpacing: 0 }}>
            {activeAgent.mode === "agentic" ? (hasConsented ? "AGENTIC" : "READY") : activeAgent.mode === "plan" ? "PLAN" : "ASK"}
          </span>
        </div>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => setCustomAgentsOpen(true)}
          title="Configure custom agents"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.6 }}
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={clearConfig}
          title="Clear chat & revoke access (total amnesia)"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: textColor, opacity: 0.4 }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {agentMenuOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 16,
          width: "calc(100% - 32px)",
          background: panelBg,
          border: `1px solid ${borderCol}`,
          borderRadius: 14,
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          overflow: "hidden",
          zIndex: 40
        }}>
          {availableAgents.map(agent => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              style={{
                width: "100%",
                border: "none",
                borderBottom: `1px solid ${borderCol}`,
                background: activeAgent.id === agent.id ? `${accent}14` : "transparent",
                color: textColor,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <AgentBadge agent={agent} accent={accent} textColor={textColor} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{agent.name}</div>
                <div style={{ fontSize: 11, opacity: 0.62 }}>{agent.description}</div>
              </div>
            </button>
          ))}
          <button
            onClick={() => {
              setCustomAgentsOpen(true)
              setAgentMenuOpen(false)
            }}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: textColor,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <Plus size={14} color={accent} />
            Configure Custom Agents...
          </button>
        </div>
      )}
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
              {activeAgent.mode === "agentic"
                ? `${activeAgent.name} can read, edit, and run your code. Try "Fix the import error" or "Create a new API route".`
                : activeAgent.mode === "plan"
                  ? `${activeAgent.name} is ready to break work into steps, risks, and milestones.`
                  : `${activeAgent.name} is ready to answer coding questions and explain tradeoffs.`}
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
                  <ActionCard key={aidx} action={action} accent={accent} textColor={textColor} />
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
          agentName={activeAgent.name}
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
          {activeAgent.name} is working...
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
            placeholder={activeFile ? `Ask ${activeAgent.name} about ${activeFile.split("/").pop()}...` : `Tell ${activeAgent.name} what to do...`}
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
