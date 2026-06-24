import test from "node:test"
import assert from "node:assert/strict"

import { buildExecutionWebSocketUrl, buildTerminalWebSocketUrl } from "./socketUrls.js"

test("buildExecutionWebSocketUrl keeps secure remote APIs on wss", () => {
  const url = buildExecutionWebSocketUrl(
    "https://code-together-collaborative-ide.onrender.com",
    "http:"
  )

  assert.equal(url, "wss://code-together-collaborative-ide.onrender.com/execution")
})

test("buildExecutionWebSocketUrl keeps local http APIs on ws", () => {
  const url = buildExecutionWebSocketUrl(
    "http://localhost:1236/",
    "https:"
  )

  assert.equal(url, "ws://localhost:1236/execution")
})

test("buildTerminalWebSocketUrl keeps secure remote APIs on wss", () => {
  const url = buildTerminalWebSocketUrl(
    "https://code-together-collaborative-ide.onrender.com",
    "http:"
  )

  assert.equal(url, "wss://code-together-collaborative-ide.onrender.com/terminal")
})

test("buildTerminalWebSocketUrl keeps local http APIs on ws", () => {
  const url = buildTerminalWebSocketUrl(
    "http://localhost:1236/",
    "https:"
  )

  assert.equal(url, "ws://localhost:1236/terminal")
})
