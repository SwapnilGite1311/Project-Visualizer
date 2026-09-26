"""Smoke test for `pv-engine serve`: two local clients share one engine.

Usage: python engine/modules/ipc/tests/serve_smoke.py <path-to-pv-engine>
Prints SERVE OK on success.
"""

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

FIXTURE = Path(__file__).resolve().parents[2] / "lang_python" / "tests" / "fixtures" / "pyproj_small"
TCP_PORT = 7790


class Client:
    """Framed JSON-RPC over a file-like binary stream (a socket file or a Windows named pipe)."""

    def __init__(self, stream):
        self.stream = stream
        self.next_id = 0
        self.notes = []

    def send(self, obj):
        body = json.dumps(obj).encode("utf-8")
        self.stream.write(b"Content-Length: " + str(len(body)).encode("ascii") + b"\r\n\r\n" + body)
        self.stream.flush()

    def read(self):
        length = None
        while True:
            line = self.stream.readline()
            if not line:
                raise RuntimeError("engine closed the connection")
            line = line.strip()
            if not line:
                break
            name, _, value = line.decode("ascii").partition(":")
            if name.strip().lower() == "content-length":
                length = int(value.strip())
        return json.loads(self.stream.read(length).decode("utf-8"))

    def call(self, method, params=None):
        self.next_id += 1
        self.send({"jsonrpc": "2.0", "id": self.next_id, "method": method, "params": params or {}})
        while True:
            message = self.read()
            if message.get("id") == self.next_id:
                if "error" in message:
                    raise RuntimeError(f"{method} failed: {message['error']}")
                return message["result"]
            self.notes.append(message)

    def wait_note(self, method, timeout=20):
        end = time.time() + timeout
        while time.time() < end:
            for note in self.notes:
                if note.get("method") == method:
                    self.notes.remove(note)
                    return note
            self.notes.append(self.read())
        raise RuntimeError(f"no {method} notification")


def tcp_client(port):
    sock = socket.create_connection(("127.0.0.1", port), timeout=20)
    return Client(sock.makefile("rwb"))


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    engine = str(Path(sys.argv[1]).resolve())
    home = tempfile.mkdtemp(prefix="pv-home-")
    env = dict(os.environ, PV_HOME=home)
    pipe = f"pv-smoke-{os.getpid()}"
    proc = subprocess.Popen([engine, "serve", "--pipe", pipe, "--tcp", str(TCP_PORT), "--parent-pid", str(os.getpid())],
                            env=env)
    try:
        info_file = Path(home) / "engine.json"
        for _ in range(100):
            if info_file.exists():
                break
            time.sleep(0.05)
        info = json.loads(info_file.read_text(encoding="utf-8"))
        assert info["pid"] == proc.pid, info
        assert info["tcp_port"] >= TCP_PORT, info

        # 1. VS Code-like client over TCP: hello first, then normal methods.
        code = tcp_client(info["tcp_port"])
        hello = code.call("engine.hello", {"token": info["token"], "client": "vscode"})
        assert hello["client_id"] > 0, hello
        assert "version" in code.call("engine.ping")

        # 2. A second client (the desktop) over the pipe on Windows, or the Unix socket elsewhere.
        if os.name == "nt":
            desk = Client(open(info["pipe"], "r+b", buffering=0))
        else:
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.connect(info["pipe"])
            desk = Client(sock.makefile("rwb"))
        assert "version" in desk.call("engine.ping")

        # 3. The desktop opens a project; both clients see its progress notifications.
        project_id = desk.call("project.open", {"root_path": str(FIXTURE)})["project_id"]
        for _ in range(200):
            if desk.call("project.status", {"project_id": project_id})["state"] == "ready":
                break
            time.sleep(0.05)
        code.wait_note("project.progress")
        clients = desk.call("engine.info")["clients"]
        assert sorted(c["client"] for c in clients) == ["desktop", "vscode"], clients

        # 4. Editor relay both ways.
        assert desk.call("editor.open", {"file_path": "app/main.py", "line": 1})["delivered"] == 1
        assert code.wait_note("editor.open")["params"]["file_path"] == "app/main.py"
        assert code.call("editor.reveal", {"file_path": "app/main.py", "line": 2})["delivered"] == 1
        assert desk.wait_note("editor.reveal")["params"]["line"] == 2

        # 5. Shutdown removes the info file.
        desk.call("engine.shutdown")
        proc.wait(timeout=10)
        assert not info_file.exists(), "engine.json should be removed on exit"
        print("SERVE OK")
        return 0
    finally:
        if proc.poll() is None:
            proc.kill()


if __name__ == "__main__":
    sys.exit(main())
