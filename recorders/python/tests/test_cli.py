import json
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
PACKAGE_ROOT = os.path.dirname(HERE)
SAMPLE = os.path.join(HERE, "sample_project")


def run_recorder(root, script, out):
    env = dict(os.environ, PYTHONPATH=PACKAGE_ROOT, PYTHONIOENCODING="utf-8")
    return subprocess.run(
        [sys.executable, "-m", "pv_trace", "--root", root, "--out", out, "--", script],
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


def read_events(path):
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh]


class CliTest(unittest.TestCase):
    def test_records_a_script(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "t.jsonl")
            result = run_recorder(SAMPLE, os.path.join(SAMPLE, "main.py"), out)
            events = read_events(out)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("[10, 11, 12, -1]", result.stdout)
        self.assertEqual(events[0]["kind"], "start")
        self.assertTrue(events[0]["argv"][0].endswith("main.py"))
        end = events[-1]
        self.assertEqual((end["kind"], end["exit_code"], end["truncated"], end["events"]), ("end", 0, False, len(events)))
        self.assertTrue(any(e["kind"] == "call" and e["file"] == "calc.py" and e["func"] == "add" for e in events))
        self.assertTrue(any(e["kind"] == "call" and e["file"] == "main.py" and e["func"] == "<module>" for e in events))

    def test_failing_script(self):
        with tempfile.TemporaryDirectory() as tmp:
            script = os.path.join(tmp, "boom.py")
            with open(script, "w", encoding="utf-8") as fh:
                fh.write('raise RuntimeError("boom")\n')
            out = os.path.join(tmp, "t.jsonl")
            result = run_recorder(tmp, script, out)
            events = read_events(out)
        self.assertEqual(result.returncode, 1)
        self.assertTrue(any(e["kind"] == "exception" and e["value"] == "RuntimeError: boom" for e in events))
        self.assertEqual(events[-1]["exit_code"], 1)


if __name__ == "__main__":
    unittest.main()
