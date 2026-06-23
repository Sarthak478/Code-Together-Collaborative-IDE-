const test = require("node:test");
const assert = require("node:assert/strict");

const { getTerminalShellLaunchConfig } = require("../utils/terminalShell");

test("getTerminalShellLaunchConfig uses a profile-free PowerShell on Windows", () => {
  const config = getTerminalShellLaunchConfig("win32");

  assert.equal(config.shell, "powershell.exe");
  assert.deepEqual(config.args, ["-NoLogo", "-NoProfile"]);
});

test("getTerminalShellLaunchConfig uses bash on non-Windows platforms", () => {
  const config = getTerminalShellLaunchConfig("linux");

  assert.equal(config.shell, "bash");
  assert.deepEqual(config.args, []);
});
