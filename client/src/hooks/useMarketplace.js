import { useState, useCallback, useEffect } from 'react'

export function useMarketplace(roomMap) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [installedExtensions, setInstalledExtensions] = useState([])

  useEffect(() => {
    if (!roomMap) return
    const updateExts = () => {
      const exts = roomMap.get("installedExtensions") || []
      setInstalledExtensions(exts)
    }
    updateExts()
    roomMap.observe(updateExts)
    return () => roomMap.unobserve(updateExts)
  }, [roomMap])


  const searchExtensions = useCallback(async (query) => {
    if (!query) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      // https://open-vsx.org/api/-/search?query=python
      const res = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}&size=10`)
      const data = await res.json()
      setResults(data.extensions || [])
    } catch (err) {
      setError("Failed to fetch extensions from Open VSX")
    } finally {
      setLoading(false)
    }
  }, [])

  const installExtension = useCallback(async (extension) => {
    const id = `${extension.namespace}.${extension.name}`
    if (installedExtensions.includes(id)) return
    
    try {
      if (roomMap) {
        roomMap.set("installedExtensions", [...installedExtensions, id])
      }
    } catch (err) {
      console.error(err)
      alert("Failed to install extension " + id)
    }
  }, [installedExtensions, roomMap])

  return {
    searchQuery,
    setSearchQuery,
    results,
    loading,
    error,
    searchExtensions,
    installExtension,
    installedExtensions
  }
}
