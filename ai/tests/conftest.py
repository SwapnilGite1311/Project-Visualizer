import pytest
from fastapi.testclient import TestClient
from pv_ai.core.config import get_settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("PV_AI_INTERNAL_TOKEN", "test-token")
    get_settings.cache_clear()
    from pv_ai.app import create_app

    with TestClient(create_app()) as c:
        yield c
    get_settings.cache_clear()


@pytest.fixture
def auth_headers():
    return {"x-pv-internal-token": "test-token"}
