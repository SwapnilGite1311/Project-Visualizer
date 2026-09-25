"""Trace, span and event ids (the formats of card R12)."""

import os
import time
import uuid


def new_trace_id() -> str:
    return os.urandom(16).hex()


def new_span_id() -> str:
    return os.urandom(8).hex()


def new_event_id() -> str:
    return uuid.uuid4().hex


def now_ns() -> int:
    return time.time_ns()
