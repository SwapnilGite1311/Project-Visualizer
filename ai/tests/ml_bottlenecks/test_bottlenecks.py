from pv_ai.features.ml_bottlenecks.model import predict_bottlenecks


def series(node: str, p95s: list[float], calls: list[int] | None = None) -> list[dict]:
    return [
        {
            "node_id": node,
            "kind": "function",
            "minute": 1_000_000 + i * 60,
            "calls": (calls or [10] * len(p95s))[i],
            "p95_ms": v,
        }
        for i, v in enumerate(p95s)
    ]


def test_rising_latency_is_flagged_and_flat_is_not():
    rising = series("function:a.py#slow", [200 + 40 * i for i in range(24)])  # +40 ms per hour
    flat = series("function:b.py#fine", [50.0] * 24)
    out = predict_bottlenecks(rising + flat)
    assert [b["node_id"] for b in out] == ["function:a.py#slow"]
    b = out[0]
    assert abs(b["trend_ms_per_hour"] - 40) < 1e-6
    assert b["predicted_p95_ms"] > 1000
    assert 0 < b["confidence"] <= 1


def test_load_sensitive_node_is_flagged():
    calls = [10 * (i % 5 + 1) for i in range(20)]
    p95 = [120 * c / 10 for c in calls]  # slower when busier, around 600-ish ms at peak
    out = predict_bottlenecks(series("function:c.py#busy", p95, calls))
    assert out and out[0]["load_sensitivity"] > 0.9


def test_too_little_data_is_skipped(client, auth_headers):
    body = {"project_key": "p", "rows": series("function:d.py#x", [5000.0] * 5)}
    r = client.post("/v1/ml/bottlenecks/predict", headers=auth_headers, json=body)
    assert r.status_code == 200
    assert r.json() == {"bottlenecks": []}
