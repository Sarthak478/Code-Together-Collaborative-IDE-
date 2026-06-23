import test from "node:test"
import assert from "node:assert/strict"

import { resolveRuntimeEndpoints } from "./runtimeEndpoints.js"

test("localhost ignores stale remote env overrides by default", () => {
  const endpoints = resolveRuntimeEndpoints({
    env: {
      VITE_API_URL: "https://code-together-collaborative-ide.onrender.com",
      VITE_COLLAB_URL: "https://code-together-collaborative-ide.onrender.com",
      VITE_WS_URL: "wss://code-together-collaborative-ide.onrender.com",
      VITE_LOCAL_API_URL: "http://localhost:1236",
    },
    hostname: "localhost",
    protocol: "http:",
  })

  assert.equal(endpoints.API_URL, "http://localhost:1236")
  assert.equal(endpoints.COLLAB_URL, "http://localhost:1236")
  assert.equal(endpoints.WS_URL, "ws://localhost:1236")
  assert.equal(endpoints.mode, "local")
})

test("localhost can still force remote backend explicitly", () => {
  const endpoints = resolveRuntimeEndpoints({
    env: {
      VITE_API_URL: "https://code-together-collaborative-ide.onrender.com",
      VITE_COLLAB_URL: "https://code-together-collaborative-ide.onrender.com",
      VITE_WS_URL: "wss://code-together-collaborative-ide.onrender.com",
      VITE_FORCE_REMOTE_BACKEND: "true",
    },
    hostname: "localhost",
    protocol: "http:",
  })

  assert.equal(endpoints.API_URL, "https://code-together-collaborative-ide.onrender.com")
  assert.equal(endpoints.COLLAB_URL, "https://code-together-collaborative-ide.onrender.com")
  assert.equal(endpoints.WS_URL, "wss://code-together-collaborative-ide.onrender.com")
  assert.equal(endpoints.mode, "remote")
})

test("hosted app defaults to remote backend", () => {
  const endpoints = resolveRuntimeEndpoints({
    env: {},
    hostname: "code-together.me",
    protocol: "https:",
  })

  assert.equal(endpoints.API_URL, "https://code-together-collaborative-ide.onrender.com")
  assert.equal(endpoints.COLLAB_URL, "https://code-together-collaborative-ide.onrender.com")
  assert.equal(endpoints.WS_URL, "wss://code-together-collaborative-ide.onrender.com")
  assert.equal(endpoints.mode, "remote")
})
