import json
import os
import subprocess
import sys
import textwrap
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

AGENT_ROOT = Path(__file__).resolve().parent.parent


def start_server():
    bodies = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers["Content-Length"])
            bodies.append((self.path, self.headers["Authorization"], json.loads(self.rfile.read(length))))
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"accepted": 1}')

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, bodies


def run_agent(args, env_extra, cwd):
    env = dict(os.environ, PYTHONPATH=str(AGENT_ROOT), **env_extra)
    return subprocess.run(
        [sys.executable, "-m", "pv_agent", *args], cwd=cwd, env=env, capture_output=True, text=True, timeout=60, check=False
    )


def test_run_sends_call_events(tmp_path):
    (tmp_path / "app.py").write_text(
        textwrap.dedent("""
        def helper():
            return 2

        def main():
            return helper() + 1

        print(main())
    """)
    )
    server, bodies = start_server()
    try:
        env = {"PV_RUNTIME_URL": f"http://127.0.0.1:{server.server_port}", "PV_RUNTIME_TOKEN": "tok", "PV_PROJECT_ROOT": str(tmp_path)}
        result = run_agent(["run", "app.py"], env, tmp_path)
    finally:
        server.shutdown()
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "3"
    events = [e for path, auth, body in bodies for e in body["events"]]
    assert all(path == "/v1/events" and auth == "Bearer tok" for path, auth, _ in bodies)
    names = {e["name"] for e in events if e["kind"] == "call"}
    assert {"app.helper", "app.main"} <= names
    assert bodies[0][2]["source"]["agent"] == "python"


def test_check_and_missing_token(tmp_path):
    server, bodies = start_server()
    try:
        ok = run_agent(["check"], {"PV_RUNTIME_URL": f"http://127.0.0.1:{server.server_port}", "PV_RUNTIME_TOKEN": "tok"}, tmp_path)
    finally:
        server.shutdown()
    assert ok.returncode == 0 and ok.stdout.strip() == "OK"
    assert bodies[0][2]["events"][0]["kind"] == "log"

    env = {k: v for k, v in os.environ.items() if k != "PV_RUNTIME_TOKEN"}
    env["PYTHONPATH"] = str(AGENT_ROOT)
    missing = subprocess.run(
        [sys.executable, "-m", "pv_agent", "check"], cwd=tmp_path, env=env, capture_output=True, text=True, timeout=60, check=False
    )
    assert missing.returncode == 1
