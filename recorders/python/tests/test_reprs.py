import unittest

from pv_trace.reprs import safe_repr


class Bad:
    def __repr__(self):
        raise RuntimeError("no")


class SafeReprTest(unittest.TestCase):
    def test_simple_values(self):
        self.assertEqual(safe_repr(1), "1")
        self.assertEqual(safe_repr("ab"), "'ab'")

    def test_long_list_is_shortened(self):
        self.assertEqual(safe_repr(list(range(100))), "[0, 1, 2, 3, 4, 5, ...]")

    def test_failing_repr(self):
        self.assertEqual(safe_repr(Bad()), "<unrepresentable Bad>")

    def test_limit(self):
        text = safe_repr("x" * 500, 10)
        self.assertEqual(len(text), 10)
        self.assertTrue(text.endswith("…"))


if __name__ == "__main__":
    unittest.main()
