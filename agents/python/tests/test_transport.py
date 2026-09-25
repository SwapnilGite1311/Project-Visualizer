from pv_agent.config import load_config
from pv_agent.transport import Transport


def config(**env):
    return load_config({"PV_RUNTIME_TOKEN": "t", "PV_FLUSH_MS": "100000", **env})


def test_batches_of_1000():
    batches = []
    t = Transport(config(), sender=batches.append)
    for i in range(2500):
        t.emit({"i": i})
    t.close()
    assert [len(b["events"]) for b in batches] == [1000, 1000, 500]
    assert batches[0]["source"]["agent"] == "python"
    assert batches[0]["events"][0] == {"i": 0}
    assert t.sent == 2500


def test_queue_overflow_counts_dropped():
    batches = []
    t = Transport(config(PV_MAX_QUEUE="10"), sender=batches.append)
    for i in range(15):
        t.emit({"i": i})
    assert t.dropped == 5
    t.close()
    assert [e["i"] for e in batches[0]["events"]] == list(range(5, 15))


def test_sender_errors_never_reach_the_app():
    def broken(_batch):
        raise OSError("connection refused")

    t = Transport(config(), sender=broken)
    t.emit({"i": 1})
    t.flush()
    assert t.failed == 1
    t.close()


def test_http_sender_posts_json_with_the_token(monkeypatch):
    seen = {}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self):
            return b'{"accepted":1}'

    def fake_urlopen(request, timeout):
        seen["url"] = request.full_url
        seen["auth"] = request.get_header("Authorization")
        seen["timeout"] = timeout
        return Response()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    t = Transport(config())
    t.emit({"i": 1})
    t.close()
    assert seen == {"url": "http://127.0.0.1:47100/v1/events", "auth": "Bearer t", "timeout": 2}
