def test_healthz_needs_no_token(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_metrics(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "python_info" in r.text


def test_unknown_path(client, auth_headers):
    assert client.post("/v1/nothing/here", headers=auth_headers, json={}).status_code == 404
