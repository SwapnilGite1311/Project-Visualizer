import random

from pv_ai.features.ml_anomaly.model import detect


def pts(values):
    return [{"t": i * 60_000, "v": v} for i, v in enumerate(values)]


def test_a_spike_in_a_flat_series_is_the_only_anomaly():
    values = [100.0] * 48
    values[30] = 900.0
    out = detect(pts(values), "p95_ms")
    assert [a["t"] for a in out] == [30 * 60_000]
    assert out[0]["direction"] == "up"


def test_short_series_has_none():
    assert detect(pts([1.0, 50.0, 1.0]), "calls") == []


def test_long_noisy_series_is_deterministic_and_finds_the_spike():
    rng = random.Random(1)
    values = [100 + rng.gauss(0, 3) for _ in range(300)]
    values[150] = 400.0
    a = detect(pts(values), "p95_ms")
    assert a == detect(pts(values), "p95_ms")
    assert 150 * 60_000 in [x["t"] for x in a]
    assert len(a) <= 3


def test_router(client, auth_headers):
    values = [0.0] * 30
    values[10] = 0.5
    body = {"series": [{"node_id": "n", "metric": "error_rate", "points": pts(values)}]}
    r = client.post("/v1/ml/anomaly/detect", headers=auth_headers, json=body)
    assert r.status_code == 200
    assert r.json()["results"][0]["anomalies"][0]["t"] == 600_000
