"""Health forecasting: error rate and latency ahead, with a confidence band."""

import warnings

import numpy as np

MIN_POINTS_FOR_MODEL = 12


def forecast_series(points: list[dict], horizon: int, step_ms: int) -> list[dict]:
    """Holt-Winters (additive, damped trend) with ≥ 12 points; otherwise a flat forecast at
    the mean.
    Band = ±1.96 × std of the in-sample residuals. Values never go below 0."""
    if not points:
        return []
    values = np.array([float(p["v"]) for p in points])
    last_t = int(points[-1]["t"])
    if len(values) >= MIN_POINTS_FOR_MODEL and np.ptp(values) > 0:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fit = ExponentialSmoothing(values, trend="add", damped_trend=True).fit()
        forecast = np.asarray(fit.forecast(horizon), dtype=float)
        std = float(np.std(values - np.asarray(fit.fittedvalues, dtype=float)))
    else:
        forecast = np.full(horizon, float(values.mean()))
        std = float(values.std()) if len(values) > 1 else 0.0
    band = 1.96 * std
    out = []
    for i, v in enumerate(forecast, start=1):
        v = max(0.0, float(v))
        out.append(
            {
                "t": last_t + i * step_ms,
                "v": round(v, 6),
                "lower": round(max(0.0, v - band), 6),
                "upper": round(v + band, 6),
            }
        )
    return out


def predicted_state(metric: str, forecast: list[dict]) -> str:
    peak = max((p["v"] for p in forecast), default=0.0)
    if metric == "error_rate":
        if peak >= 0.05:
            return "error"
        return "warning" if peak > 0 else "ok"
    if metric == "p95_ms":
        return "warning" if peak > 1000 else "ok"
    return "unknown"


def confidence_of(n_points: int) -> float:
    return round(min(1.0, n_points / 48), 3)
