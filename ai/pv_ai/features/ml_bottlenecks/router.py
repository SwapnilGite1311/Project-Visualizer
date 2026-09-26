"""POST /v1/ml/bottlenecks/predict (contracts/http/ml/bottlenecks.response)."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pv_ai.features.ml_bottlenecks.model import predict_bottlenecks

router = APIRouter(prefix="/v1/ml/bottlenecks", tags=["ml"])


class RowsRequest(BaseModel):
    project_key: str = Field(min_length=1)
    rows: list[dict] = Field(max_length=200_000)


@router.post("/predict")
def predict_route(req: RowsRequest) -> dict:
    return {"bottlenecks": predict_bottlenecks(req.rows)}
