"""POST /v1/ml/anomaly/detect."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pv_ai.features.ml_anomaly.model import detect

router = APIRouter(prefix="/v1/ml/anomaly", tags=["ml"])


class Point(BaseModel):
    t: int
    v: float


class Series(BaseModel):
    node_id: str
    metric: str
    points: list[Point] = Field(max_length=5000)


class DetectRequest(BaseModel):
    series: list[Series] = Field(max_length=200)


@router.post("/detect")
def detect_route(req: DetectRequest) -> dict:
    return {
        "results": [
            {
                "node_id": s.node_id,
                "metric": s.metric,
                "anomalies": detect([p.model_dump() for p in s.points], s.metric),
            }
            for s in req.series
        ]
    }
