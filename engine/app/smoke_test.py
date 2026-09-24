"""End-to-end smoke test for the pv-engine executable.

Usage: python engine/app/smoke_test.py <path-to-pv-engine>
"""

import json
import subprocess
import sys
import time
from pathlib import Path

FIXTURE = Path(__file__).resolve().parent.parent / "modules" / "lang_python" / "tests" / "fixtures" / "pyproj_small"
notifications = 0


def send(proc: subprocess.Popen, obj: dict) -> None:
    body = json.dumps(obj).encode("utf-8")
    proc.stdin.write(b"Content-Length: " + str(len(body)).encode("ascii") + b"\r\n\r\n" + body)
    proc.stdin.flush()


def read(proc: subprocess.Popen) -> dict:
    length = None
    while True:
        line = proc.stdout.readline()
        if not line:
            raise RuntimeError("engine closed stdout")
        line = line.strip()
        if not line:
            break
        name, _, value = line.decode("ascii").partition(":")
        if name.strip().lower() == "content-length":
            length = int(value.strip())
    if length is None:
        raise RuntimeError("message without Content-Length")
    return json.loads(proc.stdout.read(length).decode("utf-8"))


def request(proc: subprocess.Popen, request_id: int, method: str, params: dict) -> dict:
    global notifications
    send(proc, {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
    while True:
        message = read(proc)
        if "id" not in message:
            notifications += 1
            continue
        if message["id"] != request_id:
            continue
        if "error" in message:
            raise RuntimeError(f"{method} failed: {message['error']}")
        return message["result"]


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python engine/app/smoke_test.py <path-to-pv-engine>")
        return 1
    engine = str(Path(sys.argv[1]).resolve())  # Windows CreateProcess needs an absolute path here
    proc = subprocess.Popen([engine], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        ping = request(proc, 1, "engine.ping", {})
        assert ping["protocol"] == 1, f"bad protocol: {ping}"

        languages = request(proc, 2, "lang.list", {})["languages"]
        assert any(lang["id"] == "python" for lang in languages), f"python missing: {languages}"

        project_id = request(proc, 3, "project.open", {"root_path": str(FIXTURE)})["project_id"]
        deadline = time.time() + 20
        status = {}
        next_id = 4
        while time.time() < deadline:
            status = request(proc, next_id, "project.status", {"project_id": project_id})
            next_id += 1
            if status["state"] in ("ready", "error"):
                break
            time.sleep(0.1)
        assert status.get("state") == "ready", f"project not ready: {status}"
        assert status["files_total"] == 8, f"bad files_total: {status}"

        request(proc, next_id, "engine.shutdown", {})
        code = proc.wait(timeout=5)
        assert code == 0, f"exit code {code}"
    except Exception as error:  # noqa: BLE001 - report any failure and exit 1
        print(f"SMOKE FAILED: {error}")
        proc.kill()
        return 1
    print(f"SMOKE OK ({notifications} notifications)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
