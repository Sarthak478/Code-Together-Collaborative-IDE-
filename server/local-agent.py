#!/usr/bin/env python3
"""Small stdlib-only Local Agent for LiveShare IDE rooms.

The browser copies a Python one-liner that downloads this file from the server
and runs it locally. Keeping the agent in the backend avoids npm/pip package
installation while still letting us update the handoff protocol centrally.
"""

import argparse
import json
import os
import pathlib
import platform
import shutil
import socket
import subprocess
import sys
import tempfile
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


def reset_workspace(room_id, agent_id):
    safe_room = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in room_id)
    safe_agent = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in agent_id)
    workspace = pathlib.Path(tempfile.gettempdir()) / f"liveshare_agent_{safe_room}_{safe_agent}"
    shutil.rmtree(workspace, ignore_errors=True)
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


def write_job_files(workspace, files):
    for file_info in files:
        rel_path = safe_relative_path(file_info.get("path", "main.py"))
        target = workspace / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(file_info.get("content") or "", encoding="utf-8")


def command_for(language, active_path):
    lang = (language or "").lower()
    system = platform.system().lower()

    commands = {
        "python": [sys.executable, str(active_path)],
        "javascript": ["node", str(active_path)],
        "typescript": ["node", "--experimental-strip-types", str(active_path)],
        "go": ["go", "run", str(active_path)],
        "php": ["php", str(active_path)],
        "ruby": ["ruby", str(active_path)],
        "perl": ["perl", str(active_path)],
        "lua": ["lua", str(active_path)],
    }

    if lang == "shell":
        return ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(active_path)] if system == "windows" else ["bash", str(active_path)]

    if lang == "java":
        class_name = active_path.stem
        if system == "windows":
            return ["cmd", "/c", f'javac "{active_path.name}" && java "{class_name}"']
        return ["sh", "-lc", f'javac "{active_path.name}" && java "{class_name}"']

    if lang == "c":
        if system == "windows":
            return ["cmd", "/c", f'gcc "{active_path.name}" -o a.exe && a.exe']
        exe = "./a.out"
        return ["sh", "-lc", f'gcc "{active_path.name}" -o a.out && {exe}']

    if lang == "cpp":
        if system == "windows":
            return ["cmd", "/c", f'g++ "{active_path.name}" -o a.exe && a.exe']
        exe = "./a.out"
        return ["sh", "-lc", f'g++ "{active_path.name}" -o a.out && {exe}']

    return commands.get(lang) or [sys.executable, str(active_path)]


def run_job(job, room_id, agent_id):
    workspace = reset_workspace(room_id, agent_id)
    write_job_files(workspace, job.get("files") or [])

    active_file = job.get("activeFile") or {}
    active_rel = safe_relative_path(active_file.get("path") or active_file.get("name") or "main.py")
    active_path = workspace / active_rel
    if not active_path.exists():
        return f"Active file not found in Local Agent workspace: {active_rel}", 1

    command = command_for(job.get("language"), active_path)
    print(f"[LiveShare Agent] Running job {job.get('id')} with: {' '.join(command)}", flush=True)

    try:
        proc = subprocess.Popen(
            command,
            cwd=str(active_path.parent),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError as exc:
        return f"Required local runtime was not found: {exc}", 1
    except Exception as exc:  # pragma: no cover - defensive local-runtime guard
        return f"Failed to start local run: {exc}", 1

    chunks = []
    assert proc.stdout is not None
    for line in proc.stdout:
        print(line, end="", flush=True)
        chunks.append(line)
        if sum(len(chunk) for chunk in chunks) > MAX_OUTPUT_CHARS:
            chunks = ["".join(chunks)[-MAX_OUTPUT_CHARS:]]

    exit_code = proc.wait()
    output = "".join(chunks).strip()
    return output or "(no output)", int(exit_code or 0)


def main():
    parser = argparse.ArgumentParser(description="Connect this machine as a LiveShare Local Agent.")
    parser.add_argument("--room", required=True, help="LiveShare room id")
    parser.add_argument("--server", required=True, help="LiveShare API server URL")
    parser.add_argument("--agent", default="", help="Optional stable agent id")
    parser.add_argument("--interval", type=float, default=1.5, help="Polling interval in seconds")
    args = parser.parse_args()

    agent_id = args.agent or f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
    label = f"{socket.gethostname()} ({platform.system()})"

    print("[LiveShare Agent] Connected.")
    print(f"[LiveShare Agent] Room: {args.room}")
    print("[LiveShare Agent] Keep this terminal open while running heavy code.")

    while True:
        try:
            payload = {"roomId": args.room, "agentId": agent_id, "label": label}
            data = post_json(args.server, "/local-agent/jobs/next", payload, timeout=30)
            job = data.get("job")

            if not job:
                time.sleep(max(args.interval, 0.5))
                continue

            output, exit_code = run_job(job, args.room, agent_id)
            post_json(
                args.server,
                "/local-agent/jobs/result",
                {
                    "roomId": args.room,
                    "agentId": agent_id,
                    "label": label,
                    "jobId": job.get("id"),
                    "userId": job.get("userId"),
                    "output": output,
                    "exitCode": exit_code,
                },
                timeout=30,
            )
        except KeyboardInterrupt:
            print("\n[LiveShare Agent] Disconnected.")
            return 0
        except Exception as exc:
            print(f"[LiveShare Agent] {exc}", flush=True)
            time.sleep(3)


if __name__ == "__main__":
    raise SystemExit(main())
