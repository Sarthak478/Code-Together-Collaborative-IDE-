const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseTerminalMessage,
  parseExecutionMessage,
} = require("../utils/wsPayloads");

test("parseTerminalMessage keeps structured terminal payloads intact", () => {
  const payload = parseTerminalMessage(Buffer.from(JSON.stringify({
    type: "resize",
    cols: 120,
    rows: 40,
  })));

  assert.deepEqual(payload, { type: "resize", cols: 120, rows: 40 });
});

test("parseTerminalMessage treats raw terminal text as input", () => {
  const payload = parseTerminalMessage("echo hello\n");

  assert.deepEqual(payload, { type: "input", data: "echo hello\n" });
});

test("parseExecutionMessage rejects malformed execution payloads", () => {
  assert.throws(
    () => parseExecutionMessage("join room-1"),
    /Invalid JSON payload/
  );
});
