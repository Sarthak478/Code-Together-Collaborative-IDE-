/* ─── Language registry ─────────────────────────────────────────── */
export const LANGUAGES = [
  { id: "python", label: "Python", snippet: "print('Welcome to CodeTogether')" },
  { id: "javascript", label: "JavaScript", snippet: "console.log('Welcome to CodeTogether');" },
  { id: "typescript", label: "TypeScript", snippet: "console.log('Welcome to CodeTogether');" },
  { id: "kotlin", label: "Kotlin", snippet: 'fun main() {\n    println("Welcome to CodeTogether")\n}' },
  { id: "cpp", label: "C++", snippet: '#include <iostream>\n\nint main() {\n    std::cout << "Welcome to CodeTogether" << std::endl;\n    return 0;\n}' },
  { id: "java", label: "Java", snippet: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to CodeTogether");\n    }\n}' },
  { id: "rust", label: "Rust", snippet: 'fn main() {\n    println!("Welcome to CodeTogether");\n}' },
  { id: "go", label: "Go", snippet: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Welcome to CodeTogether")\n}' },
  { id: "html", label: "HTML", snippet: '<h1>Welcome to CodeTogether</h1>' },
  { id: "sql", label: "SQL", snippet: "-- Welcome to CodeTogether\nSELECT 'Welcome to CodeTogether';" },
  { id: "markdown", label: "Markdown", snippet: '# Welcome to CodeTogether' },
]

export const FONT_FAMILIES = [
  { id: "monospace", label: "Monospace (System default)" },
  { id: "'Fira Code', monospace", label: "Fira Code" },
  { id: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
  { id: "'Source Code Pro', monospace", label: "Source Code Pro" },
  { id: "'Ubuntu Mono', monospace", label: "Ubuntu Mono" },
  { id: "'IBM Plex Mono', monospace", label: "IBM Plex Mono" },
]

export const THEMES = [
  { id: "dark", label: "🌙 Dark IDE", base: "dark", bg: "#1e1e2e", header: "#181825", toolbar: "#11111b", text: "#cdd6f4", panel: "#1e1e2e", border: "#313244", input: "#11111b", accent: "#89b4fa" },
  { id: "dracula", label: "🧛 Dracula", base: "dark", bg: "#282a36", header: "#21222c", toolbar: "#191a21", text: "#f8f8f2", panel: "#282a36", border: "#44475a", input: "#191a21", accent: "#bd93f9" },
  { id: "one-dark", label: "🌌 One Dark Pro", base: "dark", bg: "#282c34", header: "#21252b", toolbar: "#1c1f24", text: "#abb2bf", panel: "#282c34", border: "#3e4451", input: "#1c1f24", accent: "#61afef" },
  { id: "monokai", label: "🎨 Monokai", base: "dark", bg: "#272822", header: "#1e1f1c", toolbar: "#171814", text: "#f8f8f2", panel: "#272822", border: "#3e3d32", input: "#171814", accent: "#a6e22e" },
  { id: "github-dark", label: "🐙 GitHub Dark", base: "dark", bg: "#0d1117", header: "#010409", toolbar: "#000000", text: "#c9d1d9", panel: "#0d1117", border: "#30363d", input: "#010409", accent: "#58a6ff" },
  { id: "rose-pine", label: "🌹 Rosé Pine", base: "dark", bg: "#191724", header: "#12101a", toolbar: "#0d0b13", text: "#e0def4", panel: "#191724", border: "#26233a", input: "#12101a", accent: "#c4a7e7" },
  { id: "light", label: "☀️ Light IDE", base: "light", bg: "#f8f9fa", header: "#e9ecef", toolbar: "#dee2e6", text: "#212529", panel: "#ffffff", border: "#ced4da", input: "#f1f3f5", accent: "#339af0" },
  { id: "github-light", label: "🤍 GitHub Light", base: "light", bg: "#ffffff", header: "#f6f8fa", toolbar: "#f0f2f5", text: "#24292f", panel: "#ffffff", border: "#d0d7de", input: "#f6f8fa", accent: "#0969da" },
]

export const CURSORS = [
  { id: "text", label: "✦ Default", css: "text" },
  { id: "default", label: "⬇️ Arrow", css: "default" },
  { id: "crosshair", label: "✛ Crosshair", css: "crosshair" },
  { id: "pointer", label: "👆 Pointer", css: "pointer" },
  { id: "cell", label: "⊞ Cell", css: "cell" },
]

/* ─── File extension → language mapping ────────────────────────── */
export const EXT_TO_LANG = {
  'py': 'python',
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'kt': 'kotlin',
  'cpp': 'cpp',
  'cc': 'cpp',
  'c': 'c',
  'h': 'c',
  'hpp': 'cpp',
  'java': 'java',
  'rs': 'rust',
  'go': 'go',
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'sql': 'sql',
  'md': 'markdown',
  'json': 'json',
  'xml': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml',
  'txt': 'markdown',
  'sh': 'shell',
  'bash': 'shell',
  'toml': 'markdown',
  'cfg': 'markdown',
  'env': 'markdown',
}

export const FILE_BADGES = {
  py: { label: "PY", color: "#89dceb", background: "rgba(137, 220, 235, 0.16)" },
  js: { label: "JS", color: "#f9e2af", background: "rgba(249, 226, 175, 0.16)" },
  jsx: { label: "JSX", color: "#74c7ec", background: "rgba(116, 199, 236, 0.16)" },
  ts: { label: "TS", color: "#89b4fa", background: "rgba(137, 180, 250, 0.16)" },
  tsx: { label: "TSX", color: "#94e2d5", background: "rgba(148, 226, 213, 0.16)" },
  kt: { label: "KT", color: "#cba6f7", background: "rgba(203, 166, 247, 0.16)" },
  c: { label: "C", color: "#fab387", background: "rgba(250, 179, 135, 0.16)" },
  h: { label: "H", color: "#f38ba8", background: "rgba(243, 139, 168, 0.16)" },
  cpp: { label: "C++", color: "#fab387", background: "rgba(250, 179, 135, 0.16)" },
  cc: { label: "C++", color: "#fab387", background: "rgba(250, 179, 135, 0.16)" },
  hpp: { label: "HPP", color: "#f38ba8", background: "rgba(243, 139, 168, 0.16)" },
  java: { label: "JAVA", color: "#f38ba8", background: "rgba(243, 139, 168, 0.16)" },
  rs: { label: "RS", color: "#fab387", background: "rgba(250, 179, 135, 0.16)" },
  go: { label: "GO", color: "#74c7ec", background: "rgba(116, 199, 236, 0.16)" },
  html: { label: "HTML", color: "#f38ba8", background: "rgba(243, 139, 168, 0.16)" },
  htm: { label: "HTML", color: "#f38ba8", background: "rgba(243, 139, 168, 0.16)" },
  css: { label: "CSS", color: "#74c7ec", background: "rgba(116, 199, 236, 0.16)" },
  scss: { label: "SCSS", color: "#f5c2e7", background: "rgba(245, 194, 231, 0.16)" },
  sql: { label: "SQL", color: "#cba6f7", background: "rgba(203, 166, 247, 0.16)" },
  md: { label: "MD", color: "#a6e3a1", background: "rgba(166, 227, 161, 0.16)" },
  json: { label: "JSON", color: "#f9e2af", background: "rgba(249, 226, 175, 0.16)" },
  xml: { label: "XML", color: "#94e2d5", background: "rgba(148, 226, 213, 0.16)" },
  yaml: { label: "YAML", color: "#94e2d5", background: "rgba(148, 226, 213, 0.16)" },
  yml: { label: "YAML", color: "#94e2d5", background: "rgba(148, 226, 213, 0.16)" },
  toml: { label: "TOML", color: "#94e2d5", background: "rgba(148, 226, 213, 0.16)" },
  env: { label: "ENV", color: "#f38ba8", background: "rgba(243, 139, 168, 0.16)" },
  sh: { label: "SH", color: "#a6e3a1", background: "rgba(166, 227, 161, 0.16)" },
  bash: { label: "SH", color: "#a6e3a1", background: "rgba(166, 227, 161, 0.16)" },
  png: { label: "PNG", color: "#a6e3a1", background: "rgba(166, 227, 161, 0.16)" },
  jpg: { label: "JPG", color: "#a6e3a1", background: "rgba(166, 227, 161, 0.16)" },
  jpeg: { label: "JPG", color: "#a6e3a1", background: "rgba(166, 227, 161, 0.16)" },
  svg: { label: "SVG", color: "#fab387", background: "rgba(250, 179, 135, 0.16)" },
}

export const DEFAULT_FILE_BADGE = { label: "FILE", color: "#bac2de", background: "rgba(186, 194, 222, 0.14)" }

/* ─── File icon mapping ────────────────────────────────────────── */
export const FILE_ICONS = {
  'py': '🐍',
  'js': '📜',
  'jsx': '⚛️',
  'ts': '🔷',
  'tsx': '⚛️',
  'cpp': '⚙️',
  'c': '⚙️',
  'h': '📋',
  'java': '☕',
  'rs': '🦀',
  'go': '🐹',
  'html': '🌐',
  'htm': '🌐',
  'css': '🎨',
  'sql': '🗄️',
  'md': '📝',
  'json': '📦',
  'xml': '📄',
  'yaml': '⚙️',
  'yml': '⚙️',
  'txt': '📄',
  'sh': '💻',
  'bash': '💻',
  'toml': '⚙️',
  'env': '🔐',
  'gitignore': '🚫',
  'dockerfile': '🐳',
  'lock': '🔒',
}

export const FOLDER_ICON = '📁'
export const FOLDER_OPEN_ICON = '📂'
export const DEFAULT_FILE_ICON = '📄'

