"""Server-Sent Events for streamed answers (contracts/http/ai/stream_event.schema.json):
`delta` events with text chunks, then one `done` with the normal JSON response, or `error`."""

import json
from collections.abc import Callable, Iterator

from fastapi.responses import StreamingResponse

from pv_ai.core.errors import AiServiceError, error_body


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def stream_events(chunks: Iterator[str], finish: Callable[[str], dict]) -> Iterator[str]:
    parts: list[str] = []
    try:
        for chunk in chunks:
            parts.append(chunk)
            yield sse_event("delta", {"text": chunk})
        yield sse_event("done", finish("".join(parts)))
    except AiServiceError as e:
        yield sse_event("error", error_body(e.code, e.message))
    except Exception:  # never leak internals into the stream
        yield sse_event("error", error_body("internal", "Internal server error"))


def stream_response(chunks: Iterator[str], finish: Callable[[str], dict]) -> StreamingResponse:
    return StreamingResponse(
        stream_events(chunks, finish),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
