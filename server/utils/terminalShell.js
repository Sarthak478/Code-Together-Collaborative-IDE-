function getTerminalShellLaunchConfig(platformName) {
  if (platformName === "win32") {
    return {
      shell: "powershell.exe",
      args: ["-NoLogo", "-NoProfile"],
    };
  }

  return {
    shell: "bash",
    args: [],
  };
}

module.exports = {
  getTerminalShellLaunchConfig,
};
