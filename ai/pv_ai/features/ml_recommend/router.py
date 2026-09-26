"""POST /v1/ml/recommend (contracts/http/ml/recommend.*). With ?explain=true an LLM adds a short
plain-language paragraph; the verdict itself always comes from the rules, and LLM failures
are ignored."""

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from pv_ai.core.citations import clean
from pv_ai.core.llm import LlmProvider, get_provider
from pv_ai.core.prompts import load_template, render
from pv_ai.features.ml_recommend.rules import recommend

router = APIRouter(prefix="/v1/ml", tags=["ml"])
log = logging.getLogger("pv_ai.recommend")


class RecommendRequest(BaseModel):
    change_preview: dict | None = None
    simulation: dict | None = None
    failure_predictions: dict | None = None
    forecasts: dict | None = None
    notes: str | None = None


def _explained(req: dict, result: dict, provider: LlmProvider) -> str:
    system, user = load_template("change_summary")
    text = render(
        user,
        {"preview_json": json.dumps(req, indent=1), "project_notes": req.get("notes") or "(none)"},
    )
    answer = provider.complete(system, [{"role": "user", "content": text}], max_tokens=500).text
    affected = {
        a["node_id"]: a["node_id"].split("#")[-1]
        for a in (req.get("change_preview") or {}).get("affected") or []
    }
    cleaned, _ = clean(answer, affected)
    return cleaned


def _provider_or_none() -> LlmProvider | None:
    try:
        return get_provider()
    except Exception:  # no provider configured: the rules still answer
        return None


@router.post("/recommend")
def recommend_route(
    body: RecommendRequest,
    provider: Annotated[LlmProvider | None, Depends(_provider_or_none)],
    explain: bool = False,
) -> dict:
    req = body.model_dump()
    result = recommend(req)
    if explain and provider is not None:
        try:
            result["markdown"] += "\n\n" + _explained(req, result, provider)
        except Exception as e:
            log.warning("recommend_explain_failed", extra={"error": type(e).__name__})
    return result
