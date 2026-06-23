#!/usr/bin/env python3
"""Stdlib-only Local Agent for LiveShare IDE rooms.

This agent keeps a real shell running on the user's machine and polls the
backend for terminal input, file sync updates, and run commands.
"""

import argparse
import json
import pathlib
import platform
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import uuid


MAX_OUTPUT_CHARS = 250_000


def post_json(server, path, payload, timeout=30):
    url = server.rstrip("/") + path
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return json.loads(raw or "{}")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw or "{}")
        except json.JSONDecodeError:
            data = {"error": raw or str(exc)}
        raise RuntimeError(data.get("error") or str(exc)) from exc


def safe_relative_path(value):
    cleaned = str(value or "main.py").replace("\\", "/").lstrip("/")
    parts = [part for part in cleaned.split("/") if part not in ("", ".", "..")]
    return pathlib.Path(*parts) if parts else pathlib.Path("main.py")


def ensure_workspace(room_id, agent_id):
    safe_room = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in room_id)
    safe_agent = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in agent_id)
    workspace = pathlib.Path(tempfile.gettempdir()) / f"liveshare_agent_{safe_room}_{safe_agent}"
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


def sync_workspace_files(workspace, files):
    if not isinstance(files, list):
        return

    for file_info in files:
        rel_path = safe_relative_path(file_info.get("path", "main.py"))
        target = workspace / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(file_info.get("content") or "", encoding="utf-8")


class ShellBridge:
    def __init__(self, workspace):
        self.workspace = pathlib.Path(workspace)
        self.process = None
        self._output_chunks = []
        self._lock = threading.Lock()
        self._reader_thread = None
        self._last_exit_code = None
        self._shell_name = ""

    @property
    def shell_name(self):
        return self._shell_name

    def _shell_command(self):
        system = platform.system().lower()
        if system == "windows":
            self._shell_name = "powershell.exe"
            return ["powershell.exe", "-NoLogo", "-NoProfile"]
        self._shell_name = "bash"
        return ["bash"]

    def ensure_running(self):
        if self.process and self.process.poll() is None:
            return

        if self.process and self.process.poll() is not None:
            self._last_exit_code = self.process.returncode

        command = self._shell_command()
        self.process = subprocess.Popen(
            command,
            cwd=str(self.workspace),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=0,
        )

        self._reader_thread = threading.Thread(target=self._pump_output, daemon=True)
        self._reader_thread.start()

    def _pump_output(self):
        assert self.process is not None
        assert self.process.stdout is not None

        stream = self.process.stdout
        while True:
            chunk = stream.read(1)
            if not chunk:
                break

            text = chunk.decode("utf-8", errors="replace")
            with self._lock:
                self._output_chunks.append(text)

        self._last_exit_code = self.process.poll()

    def drain_output(self):
        with self._lock:
            if not self._output_chunks:
                return ""
            joined = "".join(self._output_chunks)
            self._output_chunks = []
        if len(joined) > MAX_OUTPUT_CHARS:
            return joined[-MAX_OUTPUT_CHARS:]
        return joined

    def consume_exit_code(self):
        code = self._last_exit_code
        self._last_exit_code = None
        return code

    def write(self, data):
        if not data:
            return
        self.ensure_running()
        assert self.process is not None
        assert self.process.stdin is not None
        encoded = data.encode("utf-8", errors="replace")
        self.process.stdin.write(encoded)
        self.process.stdin.flush()

    def set_workspace(self, workspace):
        self.workspace = pathlib.Path(workspace)

    def write_reset_cwd(self):
        system = platform.system().lower()
        if system == "windows":
            self.write(f'Set-Location "{self.workspace}"\n')
        else:
            self.write(f'cd "{self.workspace}"\n')

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()


def main():
    parser = argparse.ArgumentParser(description="Connect this machine as a LiveShare Local Agent.")
    parser.add_argument("--room", required=True, help="LiveShare room id")
    parser.add_argument("--server", required=True, help="LiveShare API server URL")
    parser.add_argument("--agent", default="", help="Optional stable agent id")
    parser.add_argument("--interval", type=float, default=0.35, help="Polling interval in seconds")
    args = parser.parse_args()

    agent_id = args.agent or f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
    label = f"{socket.gethostname()} ({platform.system()})"
    workspace = ensure_workspace(args.room, agent_id)
    shell = ShellBridge(workspace)

    print("[LiveShare Agent] Connected.")
    print(f"[LiveShare Agent] Room: {args.room}")
    print(f"[LiveShare Agent] Workspace: {workspace}")
    print("[LiveShare Agent] Keep this terminal open while running heavy code.")

    try:
        while True:
            try:
                shell.ensure_running()

                payload = {
                    "roomId": args.room,
                    "agentId": agent_id,
                    "label": label,
                    "shell": shell.shell_name,
                    "output": shell.drain_output(),
                }

                exit_code = shell.consume_exit_code()
                if exit_code is not None:
                    payload["exitCode"] = int(exit_code)

                data = post_json(args.server, "/local-agent/terminal/poll", payload, timeout=30)
                actions = data.get("actions") or {}

                sync_files = actions.get("syncFiles")
                if sync_files:
                    sync_workspace_files(workspace, sync_files)
                    shell.set_workspace(workspace)

                resize = actions.get("resize")
                if resize:
                    # We currently accept resize commands to keep the protocol stable.
                    # The stdlib subprocess bridge does not support PTY resizing.
                    _ = resize

                for item in actions.get("inputs") or []:
                    if isinstance(item, dict):
                        if item.get("resetCwd"):
                            shell.write_reset_cwd()
                        shell.write(item.get("command") or "")
                    else:
                        shell.write(str(item))

                time.sleep(max(args.interval, 0.15))
            except Exception as exc:
                print(f"[LiveShare Agent] {exc}", flush=True)
                time.sleep(2)
    except KeyboardInterrupt:
        print("\n[LiveShare Agent] Disconnected.")
        shell.stop()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
