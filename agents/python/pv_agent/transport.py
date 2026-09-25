"""Sends events to the desktop runtime hub in the background, without ever raising into the app."""

from __future__ import annotations

import collections
import json
import threading
import urllib.request

BATCH = 1000


def _http_sender(config):
    def send(batch: dict) -> None:
        request = urllib.request.Request(
            config.url + "/v1/events",
            data=json.dumps(batch).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + config.token},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=2) as response:
            response.read()

    return send


class Transport:
    def __init__(self, config, sender=None):
        from . import __version__

        self.config = config
        self.sender = sender or _http_sender(config)
        self.source = {"agent": "python", "version": __version__, "service": config.service, "project_root": config.project_root}
        self.queue = collections.deque(maxlen=config.max_queue)
        self.dropped = 0
        self.failed = 0
        self.sent = 0
        self._lock = threading.Lock()
        self._wake = threading.Event()
        self._closed = False
        self._thread = threading.Thread(target=self._loop, name="pv-agent-transport", daemon=True)
        self._thread.start()

    def emit(self, event: dict) -> None:
        with self._lock:
            if len(self.queue) == self.queue.maxlen:
                self.dropped += 1
            self.queue.append(event)

    def flush(self) -> None:
        while True:
            with self._lock:
                if not self.queue:
                    return
                batch = [self.queue.popleft() for _ in range(min(BATCH, len(self.queue)))]
            try:
                self.sender({"source": self.source, "events": batch})
                self.sent += len(batch)
            except Exception:  # noqa: BLE001 - never raise into the app
                self.failed += 1  # the batch is dropped; the app must never notice

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._wake.set()
        self._thread.join(timeout=5)
        self.flush()

    def _loop(self) -> None:
        while not self._closed:
            self._wake.wait(self.config.flush_ms / 1000)
            self.flush()
