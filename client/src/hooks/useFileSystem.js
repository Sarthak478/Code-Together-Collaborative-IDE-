import { useCallback, useState, useEffect, useRef } from "react"
import { EXT_TO_LANG } from "../constants/editorConfigs"
import { API_URL } from "../config"

export default function useFileSystem(ydoc, provider, isCreating, roomId, isHost) {
  const [tree, setTree] = useState({}) // Maps parentPath -> Array of children
  const [version, setVersion] = useState(0)

  /* Helper: get file extension */
  const getExt = useCallback((name) => {
    const parts = name.split(".")
    return parts.length > 1 ? parts.pop().toLowerCase() : ""
  }, [])

  /* Helper: detect language from filename */
  const detectLanguage = useCallback((name) => {
    const ext = getExt(name)
    return EXT_TO_LANG[ext] || "markdown"
  }, [getExt])

  /* Helper: get Y.Text for a file path */
  const getFileText = useCallback((filePath) => {
    return ydoc.getText(`file::${filePath}`)
  }, [ydoc])

  /* Helper: get file content as a plain string */
  const getFileContent = useCallback((filePath) => {
    return getFileText(filePath).toString()
  }, [getFileText])

  const pendingRefreshes = useRef(new Set())

  /* ── Tree API Fetching ── */
  const refreshPath = useCallback((path = "/") => {
    if (pendingRefreshes.current.has(path)) return
    pendingRefreshes.current.add(path)
    
    setTimeout(async () => {
      pendingRefreshes.current.delete(path)
      try {
      const resp = await fetch(`${API_URL}/tree?roomId=${roomId}&path=${encodeURIComponent(path)}`)
      if (!resp.ok) return
      let children = await resp.json()

      children = children.map(c => ({
        ...c,
        language: c.type === "file" ? detectLanguage(c.name) : null
      }))

      children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setTree(prev => ({ ...prev, [path]: children }))
      setVersion(v => v + 1)
    } catch (e) {
      console.error("Failed to fetch tree:", e)
    }
    }, 100)
  }, [roomId, detectLanguage])

  // Initial load
  useEffect(() => {
    if (roomId) refreshPath("/")
  }, [roomId, refreshPath])

  /* Fetch specific file content to Yjs */
  const fetchFileContentToYjs = useCallback(async (filePath) => {
    const ytext = getFileText(filePath)
    // If Y.Text already has content, skip fetch (collaborative state is source of truth)
    if (ytext.length > 0) return
    try {
      const resp = await fetch(`${API_URL}/content?roomId=${roomId}&path=${encodeURIComponent(filePath)}`)
      if (resp.ok) {
        const content = await resp.text()
        // Any user can populate empty Y.Text — CRDT handles conflicts (first writer wins)
        if (content && ytext.length === 0) {
          ydoc.transact(() => { ytext.insert(0, content) })
        }
      }
    } catch (e) { console.error("Content fetch block:", e) }
  }, [roomId, getFileText, ydoc, isHost])

  /* Save Yjs text back to Disk via REST */
  const saveFileToDisk = useCallback(async (filePath, forcedContent = null) => {
    const content = forcedContent !== null ? forcedContent : getFileText(filePath).toString()
    try {
      await fetch(`${API_URL}/fs/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, path: filePath, content })
      })
    } catch (e) { console.error("Save error:", e) }
  }, [roomId, getFileText])

  /* ── File Operations via Server ── */
  const createFile = useCallback(async (parentPath, name) => {
    const cleanParent = parentPath.endsWith("/") ? parentPath : parentPath + "/"
    const filePath = cleanParent + name
    await fetch(`${API_URL}/fs/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, type: "file", path: filePath })
    })
    refreshPath(parentPath)
    return filePath
  }, [roomId, refreshPath])

  const createFolder = useCallback(async (parentPath, name) => {
    const cleanParent = parentPath.endsWith("/") ? parentPath : parentPath + "/"
    const folderPath = cleanParent + name
    await fetch(`${API_URL}/fs/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, type: "folder", path: folderPath })
    })
    refreshPath(parentPath)
    return folderPath
  }, [roomId, refreshPath])

  const deleteEntry = useCallback(async (path) => {
    const parts = path.split("/")
    const parentPath = parts.slice(0, -1).join("/") || "/"

    await fetch(`${API_URL}/fs/delete`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, path })
    })
    refreshPath(parentPath)
  }, [roomId, refreshPath])

  const renameEntry = useCallback(async (oldPath, newName) => {
    const parts = oldPath.split("/")
    const parentPath = parts.slice(0, -1).join("/") || "/"
    const newPath = (parentPath.endsWith("/") ? parentPath : parentPath + "/") + newName

    await fetch(`${API_URL}/fs/rename`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, oldPath, newPath })
    })

    // Migrate content inside Yjs if active
    const oldText = getFileText(oldPath)
    const newText = getFileText(newPath)
    if (oldText.length > 0) {
      ydoc.transact(() => {
        const content = oldText.toString()
        if (newText.length > 0) newText.delete(0, newText.length)
        if (content) newText.insert(0, content)
        oldText.delete(0, oldText.length)
      })
    }

    refreshPath(parentPath)
    return newPath
  }, [roomId, refreshPath, getFileText, ydoc])

  const [importProgress, setImportProgress] = useState(null) // { current, total, fileName }

  const IGNORE_PATTERNS = ["node_modules", ".git", "__pycache__", ".venv", ".pytest_cache", ".next", ".DS_Store"]

  const isPathIgnored = (path) => {
    return IGNORE_PATTERNS.some(p => path.includes(`/${p}/`) || path.startsWith(`${p}/`))
  }

  const importFiles = useCallback(async (files, parentPath = "/") => {
    const fileList = Array.from(files)
    if (fileList.length === 0) return

    // Detect if this is a folder import (webkitRelativePath will have a root dir)
    const isFolder = fileList[0]?.webkitRelativePath?.includes("/")

    // If importing a folder, clear old room content first (one root folder at a time)
    if (isFolder) {
      // 1. Clear all existing Yjs file texts before replacing
      for (const children of Object.values(tree)) {
        const clearYjsRecursive = (entries) => {
          entries.forEach(entry => {
            if (entry.type === "file") {
              const ytext = getFileText(entry.path)
              if (ytext.length > 0) {
                ydoc.transact(() => ytext.delete(0, ytext.length))
              }
            }
          })
        }
        clearYjsRecursive(children)
      }

      // 2. Tell server to wipe the room folder before writing new files
      try {
        await fetch(`${API_URL}/fs/clear-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId })
        })
      } catch (e) {
        console.error("Clear room error:", e)
      }

      // 3. Reset local tree state
      setTree({})
    }

    setImportProgress({ current: 0, total: fileList.length, fileName: "" })

    // Process in batches of 100 to prevent freezing
    const batchSize = 100
    for (let i = 0; i < fileList.length; i += batchSize) {
      const batch = fileList.slice(i, i + batchSize)
      const syncPayload = []

      await Promise.all(batch.map(async (file, index) => {
        const fileIdx = i + index
        const relativePath = file.webkitRelativePath || file.name

        const ignored = isPathIgnored(relativePath)
        if (ignored) return

        setImportProgress(prev => ({ ...prev, current: fileIdx + 1, fileName: file.name }))

        let filePath = parentPath === "/" ? "/" + relativePath : parentPath + "/" + relativePath
        filePath = filePath.replace(/\/\//g, "/") // normalize

        // Read file content
        const content = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsText(file)
        })

        syncPayload.push({
          path: filePath,
          content: content
        })

        const ytext = getFileText(filePath)
        const CHUNK_SIZE = 50000 // 50KB chunks

        if (content.length > CHUNK_SIZE) {
          ydoc.transact(() => {
            if (ytext.length > 0) ytext.delete(0, ytext.length)
            for (let k = 0; k < content.length; k += CHUNK_SIZE) {
              ytext.insert(k, content.slice(k, k + CHUNK_SIZE))
            }
          })
        } else {
          ydoc.transact(() => {
            if (ytext.length > 0) ytext.delete(0, ytext.length)
            ytext.insert(0, content)
          })
        }
      }))

      if (syncPayload.length > 0) {
        try {
          await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, files: syncPayload })
          })
        } catch (e) {
          console.error("Batch sync error:", e)
        }
      }
    }

    setImportProgress(null)
    refreshPath(parentPath)
  }, [roomId, getFileText, ydoc, refreshPath, tree])

  /* ── Tree helpers ── */
  const getChildren = useCallback((parentPath) => {
    const normalizedParent = parentPath === "/" ? "/" : parentPath
    return tree[normalizedParent] || []
  }, [tree])

  const getAllFiles = useCallback(() => {
    return Object.values(tree).flat().filter(e => e.type === "file")
  }, [tree])

  return {
    tree,
    version,
    getChildren,
    getFileText,
    getFileContent,
    fetchFileContentToYjs,
    saveFileToDisk,
    refreshPath,
    getAllFiles,
    createFile,
    createFolder,
    deleteEntry,
    renameEntry,
    detectLanguage,
    getExt,
    importFiles,
    importProgress,
  }
}