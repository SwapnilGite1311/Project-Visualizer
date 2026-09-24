"""Decides which files belong to the user's project."""
from __future__ import annotations

import os

EXCLUDED_DIRS = {".git", ".venv", "venv", "env", "site-packages", "dist-packages", "node_modules", "__pycache__", ".tox", ".nox"}


class ProjectFilter:
    def __init__(self, root: str):
        self.root = os.path.abspath(root)
        self._cache: dict[str, str | None] = {}

    def relative(self, filename: str) -> str | None:
        """Project-relative path with "/" separators, or None when the file is not part of the project."""
        if filename in self._cache:
            return self._cache[filename]
        result = self._compute(filename)
        self._cache[filename] = result
        return result

    def _compute(self, filename: str) -> str | None:
        if filename.startswith("<") or not filename.endswith(".py"):
            return None
        try:
            rel = os.path.relpath(os.path.abspath(filename), self.root)
        except ValueError:
            return None
        parts = rel.split(os.sep)
        if parts[0] == ".." or any(part in EXCLUDED_DIRS for part in parts):
            return None
        return "/".join(parts)
