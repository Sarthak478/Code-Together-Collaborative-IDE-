export async function syncFilesBatch({
  fetchImpl = fetch,
  apiUrl,
  roomId,
  files,
}) {
  const response = await fetchImpl(`${apiUrl}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, files }),
  })

  if (response.ok) return

  let errorMessage = `Batch sync failed with status ${response.status || "unknown"}`
  try {
    const data = await response.json()
    if (data?.error) errorMessage = data.error
  } catch (_) {
    // Ignore JSON parsing failures and keep the fallback message.
  }

  throw new Error(errorMessage)
}
