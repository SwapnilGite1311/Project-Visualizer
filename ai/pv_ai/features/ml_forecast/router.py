"""POST /v1/ml/forecast/health (contracts/http/ml/forecast.*)."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from pv_ai.features.ml_forecast.model import confidence_of, forecast_series, predicted_state

router = APIRouter(prefix="/v1/ml/forecast", tags=["ml"])


class Point(BaseModel):
    t: int
    v: float


class Series(BaseModel):
    node_id: str
    metric: str
    points: list[Point] = Field(max_length=10_000)


class ForecastRequest(BaseModel):
    series: list[Series] = Field(max_length=500)
    horizon: int = Field(ge=1, le=168)
    step_ms: int = Field(ge=1)


@router.post("/health")
def forecast_route(req: ForecastRequest) -> dict:
    out = []
    for s in req.series:
        points = [p.model_dump() for p in s.points]
        forecast = forecast_series(points, req.horizon, req.step_ms)
        out.append(
            {
                "node_id": s.node_id,
                "metric": s.metric,
                "points": forecast,
                "predicted_state": predicted_state(s.metric, forecast),
                "confidence": confidence_of(len(points)),
            }
        )
    return {"forecasts": out}
