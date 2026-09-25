"""A mini runtime hub for the end-to-end test: runs pv-engine, opens the sample app and forwards agent events to it.

Usage from the runner:
    fw = Forwarder(engine_path, project_root)
    fw.start()              # engine ready, project parsed, HTTP server listening
    fw.url                  # e.g. http://127.0.0.1:53211 (token: e2e)
    fw.call("runtime.status", {"project_id": fw.project_id})
    fw.stop()
"""

from __future__ import annotations

import json
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOKEN = "e2e"


class EngineError(RuntimeError):
    pass


class Forwarder:
    def __init__(self, engine_path: str, project_root: str):
        self.engine_path = str(Path(engine_path).resolve())  # Windows CreateProcess needs an absolute path
        self.project_root = str(Path(project_root).resolve())
        self.project_id = ""
        self.url = ""
        self.received = 0
        self.notifications = 0
        self._proc: subprocess.Popen | None = None
        self._server: ThreadingHTTPServer | None = None
        self._lock = threading.Lock()
        self._next_id = 1

    # --- engine (Content-Length framed JSON-RPC over stdio, like engine/app/smoke_test.py) ---

    def _send(self, obj: dict) -> None:
        body = json.dumps(obj).encode("utf-8")
        self._proc.stdin.write(b"Content-Length: " + str(len(body)).encode("ascii") + b"\r\n\r\n" + body)
        self._proc.stdin.flush()

    def _read(self) -> dict:
        length = None
        while True:
            line = self._proc.stdout.readline()
            if not line:
                raise EngineError("engine closed stdout")
            line = line.strip()
            if not line:
                break
            name, _, value = line.decode("ascii").partition(":")
            if name.strip().lower() == "content-length":
                length = int(value.strip())
        if length is None:
            raise EngineError("message without Content-Length")
        return json.loads(self._proc.stdout.read(length).decode("utf-8"))

    def call(self, method: str, params: dict) -> dict:
        with self._lock:
            request_id = self._next_id
            self._next_id += 1
            self._send({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
            while True:
                message = self._read()
                if "id" not in message:
                    self.notifications += 1
                    continue
                if message["id"] != request_id:
                    continue
                if "error" in message:
                    raise EngineError(f"{method} failed: {message['error']}")
                return message["result"]

    # --- HTTP receiver ---

    def _handler(self):
        forwarder = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length)
                if self.path != "/v1/events":
                    return self._reply(404, {"error": "not found"})
                if self.headers.get("Authorization") != "Bearer " + TOKEN:
                    return self._reply(401, {"error": "wrong token"})
                try:
                    events = json.loads(body)["events"]
                    forwarder.call("runtime.ingest", {"project_id": forwarder.project_id, "events": events})
                except (ValueError, KeyError, EngineError) as error:
                    return self._reply(400, {"error": str(error)})
                forwarder.received += len(events)
                return self._reply(200, {"accepted": len(events)})

            def _reply(self, status: int, body: dict) -> None:
                data = json.dumps(body).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        return Handler

    def start(self, timeout_s: float = 30) -> None:
        self._proc = subprocess.Popen([self.engine_path], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        self.call("engine.ping", {})
        self.project_id = self.call("project.open", {"root_path": self.project_root})["project_id"]
        deadline = time.time() + timeout_s
        state = ""
        while time.time() < deadline:
            state = self.call("project.status", {"project_id": self.project_id})["state"]
            if state in ("ready", "error"):
                break
            time.sleep(0.1)
        if state != "ready":
            raise EngineError(f"project not ready: {state}")
        self._server = ThreadingHTTPServer(("127.0.0.1", 0), self._handler())
        threading.Thread(target=self._server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self._server.server_port}"

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()
            self._server = None
        if self._proc:
            try:
                self.call("engine.shutdown", {})
                self._proc.wait(timeout=5)
            except Exception:  # noqa: BLE001 - make sure the engine does not outlive the test
                self._proc.kill()
            self._proc = None
