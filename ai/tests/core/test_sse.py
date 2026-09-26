import json

from pv_ai.core.errors import AiServiceError
from pv_ai.core.sse import sse_event, stream_events


def parse(events: list[str]) -> list[tuple[str, dict]]:
    out = []
    for e in events:
        lines = e.strip().split("\n")
        out.append((lines[0].removeprefix("event: "), json.loads(lines[1].removeprefix("data: "))))
    return out


def test_event_format():
    assert sse_event("delta", {"text": "hi"}) == 'event: delta\ndata: {"text": "hi"}\n\n'


def test_deltas_then_done():
    events = parse(
        list(stream_events(iter(["a", "b", "c"]), lambda full: {"markdown": full.upper()}))
    )
    assert [e for e, _ in events] == ["delta", "delta", "delta", "done"]
    assert events[-1][1] == {"markdown": "ABC"}


def test_error_mid_stream():
    def chunks():
        yield "partial"
        raise AiServiceError(503, "provider_rate_limit", "busy")

    events = parse(list(stream_events(chunks(), lambda full: {})))
    assert events[-1] == ("error", {"error": {"code": "provider_rate_limit", "message": "busy"}})
