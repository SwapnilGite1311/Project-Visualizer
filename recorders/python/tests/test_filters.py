import os
import tempfile
import unittest

from pv_trace.filters import ProjectFilter


class ProjectFilterTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = os.path.join(self.tmp.name, "proj")
        os.makedirs(self.root)
        self.f = ProjectFilter(self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def test_inside(self):
        self.assertEqual(self.f.relative(os.path.join(self.root, "pkg", "a.py")), "pkg/a.py")

    def test_outside(self):
        self.assertIsNone(self.f.relative(os.path.join(self.tmp.name, "other.py")))

    def test_virtualenv_inside_root(self):
        self.assertIsNone(self.f.relative(os.path.join(self.root, "venv", "lib", "x.py")))

    def test_special_and_non_python(self):
        self.assertIsNone(self.f.relative("<string>"))
        self.assertIsNone(self.f.relative(os.path.join(self.root, "notes.txt")))


if __name__ == "__main__":
    unittest.main()
