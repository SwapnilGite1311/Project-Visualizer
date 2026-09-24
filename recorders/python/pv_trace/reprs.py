"""Short, crash-proof text for any Python value."""
import builtins
import reprlib


class _Repr(reprlib.Repr):
    # reprlib hides a failing __repr__ behind "<X instance at 0x…>"; let it raise so safe_repr reports it.
    def repr_instance(self, x, level):
        text = builtins.repr(x)
        if len(text) > self.maxother:
            i = max(0, (self.maxother - 3) // 2)
            j = max(0, self.maxother - 3 - i)
            text = text[:i] + "..." + text[len(text) - j:]
        return text


_repr = _Repr()
_repr.maxlevel = 2
_repr.maxstring = 60
_repr.maxother = 60
_repr.maxlist = _repr.maxtuple = _repr.maxset = _repr.maxfrozenset = 6
_repr.maxdict = _repr.maxdeque = _repr.maxarray = 6


def safe_repr(value, limit=120):
    try:
        text = _repr.repr(value)
    except Exception:
        text = "<unrepresentable " + type(value).__name__ + ">"
    if len(text) > limit:
        text = text[: limit - 1] + "…"
    return text
