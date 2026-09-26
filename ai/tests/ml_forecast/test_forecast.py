from pv_ai.features.ml_forecast.model import confidence_of, forecast_series, predicted_state

HOUR = 3_600_000


def pts(values: list[float]) -> list[dict]:
    return [{"t": i * HOUR, "v": v} for i, v in enumerate(values)]


def test_rising_error_rate_is_predicted_to_fail():
    history = pts([0.001 * i for i in range(30)])  # 0 -> 2.9 %
    forecast = forecast_series(history, 24, HOUR)
    assert len(forecast) == 24
    assert forecast[0]["t"] == 30 * HOUR
    assert forecast[-1]["v"] > history[-1]["v"]
    assert all(p["lower"] <= p["v"] <= p["upper"] for p in forecast)
    assert predicted_state("error_rate", forecast) == "error"


def test_short_series_is_flat_at_the_mean():
    forecast = forecast_series(pts([2.0, 4.0]), 3, HOUR)
    assert [p["v"] for p in forecast] == [3.0, 3.0, 3.0]
    assert forecast[0]["lower"] >= 0


def test_states_and_confidence():
    assert predicted_state("error_rate", [{"v": 0.0}]) == "ok"
    assert predicted_state("error_rate", [{"v": 0.01}]) == "warning"
    assert predicted_state("p95_ms", [{"v": 1500}]) == "warning"
    assert confidence_of(24) == 0.5
    assert confidence_of(100) == 1.0


def test_router(client, auth_headers):
    body = {
        "series": [{"node_id": "n", "metric": "p95_ms", "points": pts([100.0] * 20)}],
        "horizon": 5,
        "step_ms": HOUR,
    }
    r = client.post("/v1/ml/forecast/health", headers=auth_headers, json=body)
    assert r.status_code == 200
    f = r.json()["forecasts"][0]
    assert f["predicted_state"] == "ok"
    assert len(f["points"]) == 5
    bad = client.post("/v1/ml/forecast/health", headers=auth_headers, json={**body, "horizon": 500})
    assert bad.status_code == 400
