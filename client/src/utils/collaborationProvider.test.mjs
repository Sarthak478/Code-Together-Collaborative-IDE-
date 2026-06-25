import test from "node:test"
import assert from "node:assert/strict"

import { getCollaborationWebsocketConfig } from "./collaborationProvider.js"

test("collaboration websocket config uses bounded retries", () => {
  const config = getCollaborationWebsocketConfig("wss://example.com")

  assert.equal(config.url, "wss://example.com")
  assert.equal(config.maxAttempts, 10)
  assert.equal(config.timeout, 60000)
  assert.equal(config.delay, 1000)
  assert.equal(config.factor, 2)
  assert.equal(config.autoConnect, true)
})
