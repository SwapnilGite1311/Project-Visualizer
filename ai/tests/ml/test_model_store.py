from pv_ai.ml import model_store


def test_save_and_load_latest(tmp_path, monkeypatch):
    monkeypatch.setenv("PV_AI_MODELS_DIR", str(tmp_path))
    assert model_store.load_latest("proj-1", "failures") is None
    v1 = model_store.save("proj-1", "failures", {"w": 1}, {"samples": 10})
    v2 = model_store.save("proj-1", "failures", {"w": 2}, {"samples": 20})
    assert v2 > v1
    model, meta = model_store.load_latest("proj-1", "failures")
    assert model == {"w": 2}
    assert meta == {"samples": 20, "version": v2}
    assert model_store.load_latest("proj-2", "failures") is None
    assert model_store.load_latest("proj-1", "other") is None
