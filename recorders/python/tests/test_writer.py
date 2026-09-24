import json
import os
import tempfile
import unittest

from pv_trace.writer import TraceWriter


class TraceWriterTest(unittest.TestCase):
    def test_writes_json_lines(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "t.jsonl")
            w = TraceWriter(path)
            w.write("call", "a.py", 1, "f", 0, locals={"x": "1"}, value=None)
            w.write("return", "a.py", 2, "f", 0, value="None")
            self.assertEqual(w.count, 2)
            w.close()
            w.close()
            with open(path, encoding="utf-8") as fh:
                events = [json.loads(line) for line in fh]
        self.assertEqual([e["seq"] for e in events], [0, 1])
        self.assertEqual(events[0]["locals"], {"x": "1"})
        self.assertNotIn("value", events[0])
        self.assertEqual(events[1]["value"], "None")
        self.assertLessEqual(events[0]["t_ns"], events[1]["t_ns"])


if __name__ == "__main__":
    unittest.main()
