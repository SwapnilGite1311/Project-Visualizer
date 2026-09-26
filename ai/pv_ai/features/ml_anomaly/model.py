"""Unusual points in a node's runtime series (calls, error rate, latency).

Robust z-score on the residual after a rolling median; with long series an IsolationForest
must agree too, which removes most false alarms. Short series (< 24 points) have no anomalies."""

import numpy as np

MIN_POINTS = 24
FOREST_POINTS = 200
WINDOW = 12


def _rolling_median(values: np.ndarray, window: int) -> np.ndarray:
    half = window // 2
    return np.array(
        [np.median(values[max(0, i - half) : i + half + 1]) for i in range(len(values))]
    )


def detect(points: list[dict], metric: str, sensitivity: float = 3.5) -> list[dict]:
    if len(points) < MIN_POINTS:
        return []
    values = np.array([float(p["v"]) for p in points])
    residual = values - _rolling_median(values, WINDOW)
    median = np.median(residual)
    mad = np.median(np.abs(residual - median))
    if mad == 0:
        mad = np.mean(np.abs(residual - median)) or 1e-9
    scores = 0.6745 * np.abs(residual - median) / mad
    flagged = scores > sensitivity
    if len(values) >= FOREST_POINTS:
        from sklearn.ensemble import IsolationForest

        features = np.column_stack([values, np.concatenate([[0.0], np.diff(values)])])
        forest = IsolationForest(contamination="auto", random_state=0).fit_predict(features)
        flagged &= forest == -1
    out = []
    for i in np.nonzero(flagged)[0]:
        out.append(
            {
                "t": int(points[i]["t"]),
                "v": float(values[i]),
                "score": round(float(scores[i]), 3),
                "direction": "up" if residual[i] > median else "down",
            }
        )
    return out
