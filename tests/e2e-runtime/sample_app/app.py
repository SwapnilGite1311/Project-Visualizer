"""A tiny program for the runtime end-to-end test: normal calls, a slow call, a handled error and a crash."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shop import cart  # noqa: E402

items = []
for x in (1, 2, 3):
    cart.add(items, x)
print("total", cart.total(items))
cart.slow()
try:
    cart.broken()
except KeyError:
    pass
cart.broken()  # not caught: the program ends with a KeyError (expected)
