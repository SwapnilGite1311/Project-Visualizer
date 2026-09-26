"""Nodes whose latency is trending up, or that slow down under load."""

import numpy as np

from pv_ai.ml.dataset import rows_to_frame

MIN_MINUTES = 10


def _corr(a: np.ndarray, b: np.ndarray) -> float:
    if len(a) < 2 or np.std(a) == 0 or np.std(b) == 0:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


def predict_bottlenecks(
    rows: list[dict], horizon_hours: float = 24, threshold_ms: float = 1000
) -> list[dict]:
    df = rows_to_frame(rows)
    out = []
    for node_id, g in df.groupby("node_id", sort=True):
        if len(g) < MIN_MINUTES:
            continue
        hours = g["minute"].to_numpy(dtype=float) / 60.0
        p95 = g["p95_ms"].to_numpy(dtype=float)
        calls = g["calls"].to_numpy(dtype=float)
        trend = float(np.polyfit(hours - hours[0], p95, 1)[0]) if np.ptp(hours) > 0 else 0.0
        current = float(p95[-1])
        predicted = max(0.0, current + trend * horizon_hours)
        load_sensitivity = _corr(calls, p95)
        confidence = min(1.0, len(g) / 600) * (0.5 + 0.5 * abs(_corr(hours, p95)))
        flagged = predicted > threshold_ms or (
            load_sensitivity > 0.7 and current > threshold_ms / 2
        )
        if flagged:
            out.append(
                {
                    "node_id": node_id,
                    "current_p95_ms": round(current, 3),
                    "predicted_p95_ms": round(predicted, 3),
                    "trend_ms_per_hour": round(trend, 3),
                    "load_sensitivity": round(load_sensitivity, 3),
                    "confidence": round(confidence, 3),
                }
            )
    return sorted(out, key=lambda b: (-b["predicted_p95_ms"], b["node_id"]))
