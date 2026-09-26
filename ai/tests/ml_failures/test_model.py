from pv_ai.features.ml_failures.model import predict, train

from failures_data import synthetic_rows


def test_enough_data_trains_a_model_that_ranks_risky_nodes_first():
    rows = synthetic_rows()
    model, meta = train(rows)
    assert model is not None
    assert meta["method"] == "model"
    assert meta["samples"] == len(rows)
    assert meta["positives"] > 0
    predictions = predict(model, rows)
    risky = {f"function:app/m{n}.py#f" for n in range(3)}
    assert {p["node_id"] for p in predictions[:3]} == risky
    assert all(0 <= p["probability"] <= 1 for p in predictions)
    assert predictions[0]["top_factors"]


def test_small_data_uses_the_heuristic():
    rows = synthetic_rows(nodes=2, minutes=20)
    model, meta = train(rows)
    assert model is None
    assert meta["method"] == "heuristic"
    predictions = predict(None, rows)
    assert predictions[0]["node_id"] == "function:app/m0.py#f"  # the node with errors comes first
    assert "recent errors" in predictions[0]["top_factors"]


def test_no_rows():
    assert predict(None, []) == []
