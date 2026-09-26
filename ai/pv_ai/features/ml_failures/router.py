"""POST /v1/ml/failures/train and /predict (contracts/http/ml/train.* and failures.response)."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pv_ai.features.ml_failures.model import predict, train
from pv_ai.ml import model_store

router = APIRouter(prefix="/v1/ml/failures", tags=["ml"])
KIND = "failures"


class RowsRequest(BaseModel):
    project_key: str = Field(min_length=1)
    rows: list[dict] = Field(max_length=200_000)


@router.post("/train")
def train_route(req: RowsRequest) -> dict:
    model, meta = train(req.rows)
    version = model_store.save(req.project_key, KIND, model, meta) if model is not None else ""
    metrics = {"method": meta["method"]}
    if "auc" in meta:
        metrics["auc"] = meta["auc"]
    return {
        "model_version": version,
        "samples": meta["samples"],
        "positives": meta["positives"],
        "metrics": metrics,
    }


@router.post("/predict")
def predict_route(req: RowsRequest) -> dict:
    stored = model_store.load_latest(req.project_key, KIND)
    model = stored[0] if stored else None
    return {
        "predictions": predict(model, req.rows),
        "method": "model" if model is not None else "heuristic",
    }
