"""The same cases as desktop/src/renderer/src/features/recommend/local-rules.test.ts:
the answers must match."""

from pv_ai.core.llm import FakeProvider, get_provider
from pv_ai.features.ml_recommend.rules import recommend


def replay(**over):
    return {
        "mode": "replay",
        "traces_total": 100,
        "traces_failed_real": 0,
        "traces_failed_sim": 0,
        "latency_p95_real_ms": 100,
        "latency_p95_sim_ms": 100,
        "failed_trace_ids": [],
        "broken_node_ids": [],
        **over,
    }


def test_no_signals():
    r = recommend({})
    assert (r["verdict"], r["confidence"]) == ("go", 0.2)
    assert r["reasons"] == ["No preview, simulation or prediction yet."]


def test_clean_simulation():
    r = recommend({"simulation": replay()})
    assert (r["verdict"], r["confidence"]) == ("go", 0.5)
    assert r["reasons"] == ["No risk signal found in the data available."]


def test_critical_preview():
    r = recommend({"change_preview": {"risk": {"score": 92, "level": "critical"}, "affected": []}})
    assert (r["verdict"], r["confidence"]) == ("no_go", 0.8)
    assert r["reasons"][0] == "The change preview rates the risk as critical (score 92/100)."


def test_high_preview():
    assert (
        recommend({"change_preview": {"risk": {"score": 70, "level": "high"}}})["verdict"]
        == "caution"
    )


def test_simulated_failures():
    many = recommend({"simulation": replay(traces_failed_sim=5, failed_trace_ids=["t9"])})
    assert many["verdict"] == "no_go"
    assert "The simulation fails 5 of 100 recorded requests that work today." in many["reasons"]
    assert (
        many["actions"][0]
        == "Look at the failing requests (for example t9) before making this change."
    )
    assert recommend({"simulation": replay(traces_failed_sim=4)})["verdict"] == "caution"


def test_slowdown():
    r = recommend({"simulation": replay(latency_p95_sim_ms=151)})
    assert r["verdict"] == "caution"
    assert r["reasons"] == ["Simulated response time (p95) rises from 100 ms to 151 ms."]
    assert recommend({"simulation": replay(latency_p95_sim_ms=150)})["verdict"] == "go"


def test_static_simulation():
    sim = {
        "mode": "static",
        "traces_total": 0,
        "traces_failed_real": 0,
        "traces_failed_sim": 0,
        "latency_p95_real_ms": 0,
        "latency_p95_sim_ms": 0,
        "broken_node_ids": ["a", "b"],
    }
    r = recommend({"simulation": sim})
    assert (r["verdict"], r["confidence"]) == ("caution", 0.3)
    assert r["reasons"] == ["Without runtime data, 2 parts depend on what you change."]


def test_predictions_and_forecasts_only_for_touched_parts():
    r = recommend(
        {
            "change_preview": {
                "change": {"node_id": "function:a.py#f"},
                "affected": [{"node_id": "function:b.py#g"}],
                "risk": {"score": 10, "level": "low"},
            },
            "failure_predictions": {
                "predictions": [
                    {"node_id": "function:b.py#g", "probability": 0.8},
                    {"node_id": "function:z.py#other", "probability": 0.99},
                ],
                "method": "model",
            },
            "forecasts": {
                "forecasts": [
                    {"node_id": "function:a.py#f", "predicted_state": "error", "confidence": 0.5}
                ]
            },
        }
    )
    assert r["verdict"] == "caution"
    assert r["reasons"] == [
        "g already has a 80% chance of failing within the hour.",
        "f is forecast to be failing soon.",
    ]
    assert r["actions"] == [
        "Fix current errors in g first.",
        "Stabilise f before changing code that depends on it.",
    ]
    assert r["confidence"] == 0.67


def test_markdown():
    r = recommend({"change_preview": {"risk": {"score": 92, "level": "critical"}}})
    assert r["markdown"].split("\n")[0] == "**Verdict: No-go** (confidence 80%)"
    assert "- Split the change into smaller steps and check the impact again." in r["markdown"]


def test_router_with_and_without_explanation(client, auth_headers):
    body = {"change_preview": {"risk": {"score": 92, "level": "critical"}}}
    plain = client.post("/v1/ml/recommend", headers=auth_headers, json=body).json()
    assert plain["verdict"] == "no_go"
    client.app.dependency_overrides[get_provider] = lambda: FakeProvider(["Splitting it is safer."])
    try:
        from pv_ai.features.ml_recommend import router as rec

        client.app.dependency_overrides[rec._provider_or_none] = lambda: FakeProvider(
            ["Splitting it is safer."]
        )
        explained = client.post(
            "/v1/ml/recommend?explain=true", headers=auth_headers, json=body
        ).json()
    finally:
        client.app.dependency_overrides.clear()
    assert explained["verdict"] == "no_go"
    assert explained["markdown"].endswith("Splitting it is safer.")
