"""Prompt templates from contracts/prompts/v2 (same format and rules as the desktop's
parseTemplate / renderTemplate)."""

import re
from pathlib import Path

from pv_ai.core.config import get_settings
from pv_ai.core.errors import AiServiceError

_VAR = re.compile(r"\{\{([a-zA-Z0-9_]+)\}\}")


def prompts_dir() -> Path:
    configured = get_settings().prompts_dir
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[3] / "contracts" / "prompts" / "v2"


def parse_template(text: str) -> tuple[str, str]:
    lines = text.replace("\r\n", "\n").split("\n")
    if "---" not in lines:
        raise AiServiceError(500, "bad_template", "template has no --- separator")
    sep = lines.index("---")
    system, user = lines[:sep], lines[sep + 1 :]
    if system and system[0].strip() == "SYSTEM:":
        system = system[1:]
    if user and user[0].strip() == "USER:":
        user = user[1:]
    return "\n".join(system).strip(), "\n".join(user).strip()


def load_template(name: str) -> tuple[str, str]:
    path = prompts_dir() / f"{name}.md"
    if not path.is_file():
        raise AiServiceError(500, "bad_template", f"template not found: {name}")
    return parse_template(path.read_text(encoding="utf-8"))


def render(text: str, variables: dict[str, str]) -> str:
    def value(m: re.Match) -> str:
        name = m.group(1)
        if name not in variables:
            raise AiServiceError(500, "bad_template", f"missing variable: {name}")
        return str(variables[name])

    return _VAR.sub(value, text)
