from failures_data import synthetic_rows


def test_train_then_predict(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setenv("PV_AI_MODELS_DIR", str(tmp_path))
    rows = synthetic_rows()
    before = client.post(
        "/v1/ml/failures/predict", headers=auth_headers, json={"project_key": "p1", "rows": rows}
    )
    assert before.json()["method"] == "heuristic"

    trained = client.post(
        "/v1/ml/failures/train", headers=auth_headers, json={"project_key": "p1", "rows": rows}
    )
    assert trained.status_code == 200
    body = trained.json()
    assert body["metrics"]["method"] == "model"
    assert body["model_version"]

    after = client.post(
        "/v1/ml/failures/predict", headers=auth_headers, json={"project_key": "p1", "rows": rows}
    )
    assert after.json()["method"] == "model"
    assert len(after.json()["predictions"]) == 6


def test_internal_token_required(client):
    assert (
        client.post("/v1/ml/failures/predict", json={"project_key": "p", "rows": []}).status_code
        == 401
    )
