"""[[node:<id>]] citations: invalid ones are removed before anyone sees the answer
(R11 grounding rule)."""

import re

_CITATION = re.compile(r"\[\[node:(.+?)\]\]")
_WITH_SPACE = re.compile(r" ?\[\[node:(.+?)\]\]")


def extract_ids(text: str) -> list[str]:
    ids: list[str] = []
    for m in _CITATION.finditer(text):
        if m.group(1) not in ids:
            ids.append(m.group(1))
    return ids


def clean(text: str, valid: dict[str, str]) -> tuple[str, list[dict]]:
    cited: list[dict] = []

    def keep(m: re.Match) -> str:
        node_id = m.group(1)
        if node_id not in valid:
            return ""
        if not any(c["id"] == node_id for c in cited):
            cited.append({"id": node_id, "name": valid[node_id]})
        return m.group(0)

    return _WITH_SPACE.sub(keep, text), cited
