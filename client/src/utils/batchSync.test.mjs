import test from "node:test"
import assert from "node:assert/strict"

import { syncFilesBatch } from "./batchSync.js"

test("syncFilesBatch succeeds on ok responses", async () => {
  let calls = 0
  await syncFilesBatch({
    fetchImpl: async () => {
      calls += 1
      return { ok: true }
    },
    apiUrl: "https://example.com",
    roomId: "room-1",
    files: [{ path: "/a.py", content: "print(1)" }],
  })

  assert.equal(calls, 1)
})

test("syncFilesBatch throws a single descriptive error on failed responses", async () => {
  await assert.rejects(
    () => syncFilesBatch({
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        json: async () => ({ error: "Backend unavailable" }),
      }),
      apiUrl: "https://example.com",
      roomId: "room-1",
      files: [{ path: "/a.py", content: "print(1)" }],
    }),
    /Backend unavailable/
  )
})
