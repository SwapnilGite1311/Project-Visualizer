import json
import os
import sys
import tempfile
import unittest

from pv_trace.filters import ProjectFilter
from pv_trace.recorder import Recorder
from pv_trace.writer import TraceWriter

SAMPLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_project")
if SAMPLE not in sys.path:
    sys.path.insert(0, SAMPLE)

import calc  # noqa: E402


def record(max_events=200_000):
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "t.jsonl")
        writer = TraceWriter(path)
        recorder = Recorder(ProjectFilter(SAMPLE), writer, max_events=max_events)
        recorder.start()
        try:
            calc.run()
        finally:
            recorder.stop()
            writer.close()
        with open(path, encoding="utf-8") as fh:
            return [json.loads(line) for line in fh], recorder


class RecorderTest(unittest.TestCase):
    def test_calls_lines_returns_and_exceptions(self):
        events, recorder = record()
        self.assertFalse(recorder.truncated)
        first = events[0]
        self.assertEqual((first["kind"], first["func"], first["depth"], first["file"]), ("call", "run", 0, "calc.py"))
        add_calls = [e for e in events if e["kind"] == "call" and e["func"] == "add"]
        self.assertEqual(len(add_calls), 3)
        self.assertEqual(add_calls[0]["depth"], 1)
        self.assertEqual(add_calls[0]["locals"], {"a": "0", "b": "10"})
        line3 = [e for e in events if e["kind"] == "line" and e["func"] == "add" and e["line"] == 3]
        self.assertEqual(line3[0]["locals"], {"total": "10"})
        exceptions = [e for e in events if e["kind"] == "exception" and e["func"] == "run"]
        self.assertTrue(exceptions[0]["value"].startswith("ValueError: invalid literal"))
        run_return = [e for e in events if e["kind"] == "return" and e["func"] == "run"]
        self.assertEqual(run_return[0]["value"], "[10, 11, 12, -1]")

    def test_max_events(self):
        events, recorder = record(max_events=5)
        self.assertEqual(len(events), 5)
        self.assertTrue(recorder.truncated)


if __name__ == "__main__":
    unittest.main()
