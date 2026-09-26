from pv_ai.core.config import Settings, get_settings


def test_defaults():
    s = Settings(_env_file=None)
    assert s.port == 8200
    assert s.provider == "anthropic"
    assert s.vector_store == "qdrant"
    assert s.fallback_provider == ""


def test_env_override(monkeypatch):
    monkeypatch.setenv("PV_AI_MODEL", "my-model")
    get_settings.cache_clear()
    try:
        assert get_settings().model == "my-model"
    finally:
        get_settings.cache_clear()
