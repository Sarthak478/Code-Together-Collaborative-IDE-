import { useCallback, useState, useEffect } from "react"
import { EXT_TO_LANG } from "../constants/editorConfigs"

const API_URL = "http://localhost:1236"

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

  /* ── Tree API Fetching ── */
  const refreshPath = useCallback(async (path = "/") => {
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
  const saveFileToDisk = useCallback(async (filePath) => {
    const content = getFileText(filePath).toString()
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

  const importFiles = useCallback(async (files, parentPath = "/") => {
    for (const file of files) {
      // webkitRelativePath gives "folder/subfolder/file.txt"
      const relativePath = file.webkitRelativePath || file.name
      const parts = relativePath.split("/")
      let currentPath = parentPath === "/" ? "" : parentPath

      // Create intermediate folders
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i]
        const folderPath = (currentPath === "" ? "" : currentPath + "/") + folderName
        // Check if folder exists or just try creating
        await createFolder(currentPath || "/", folderName)
        currentPath = folderPath
      }

      // Create the file
      const fileName = parts[parts.length - 1]
      const finalParent = currentPath || "/"
      const filePath = (finalParent === "/" ? "/" : finalParent + "/") + fileName

      // Read file content
      const content = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.readAsText(file)
      })

      // Create on server
      await createFile(finalParent, fileName)
      
      // Sync content to Yjs
      const ytext = getFileText(filePath)
      ydoc.transact(() => {
        if (ytext.length > 0) ytext.delete(0, ytext.length)
        ytext.insert(0, content)
      })
      
      // Save to disk
      await saveFileToDisk(filePath)
    }
    refreshPath(parentPath)
  }, [createFile, createFolder, getFileText, ydoc, saveFileToDisk, refreshPath])

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
  }
}