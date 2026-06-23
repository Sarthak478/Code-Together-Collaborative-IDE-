function toMessageText(raw) {
  if (Buffer.isBuffer(raw)) return raw.toString();
  if (typeof raw === "string") return raw;
  if (raw == null) return "";
  return String(raw);
}

function tryParseJson(text) {
  return JSON.parse(text);
}

function parseTerminalMessage(raw) {
  const text = toMessageText(raw);

  try {
    const parsed = tryParseJson(text);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (_) {
    // Some terminal clients send raw keystrokes instead of JSON envelopes.
  }

  return { type: "input", data: text };
}

function parseExecutionMessage(raw) {
  const text = toMessageText(raw);

  try {
    const parsed = tryParseJson(text);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Execution payload must be an object.");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }
}

module.exports = {
  parseTerminalMessage,
  parseExecutionMessage,
};
