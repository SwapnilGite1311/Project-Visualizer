import os

from pv_agent.config import load_config


def test_defaults():
    c = load_config({"PV_RUNTIME_TOKEN": "tok", "PV_PROJECT_ROOT": "."})
    assert c.url == "http://127.0.0.1:47100"
    assert c.token == "tok"
    assert c.project_root == os.path.abspath(".").replace("\\", "/")
    assert "\\" not in c.project_root
    assert c.sample_rate == 1.0
    assert (c.stall_ms, c.max_queue, c.flush_ms) == (5000, 20000, 200)


def test_missing_token_turns_the_agent_off():
    assert load_config({}) is None
    assert load_config({"PV_RUNTIME_TOKEN": ""}) is None


def test_bad_numbers_use_defaults():
    c = load_config({"PV_RUNTIME_TOKEN": "t", "PV_SAMPLE_RATE": "2.5", "PV_STALL_MS": "soon", "PV_FLUSH_MS": "50"})
    assert c.sample_rate == 1.0
    assert c.stall_ms == 5000
    assert c.flush_ms == 50
    assert load_config({"PV_RUNTIME_TOKEN": "t", "PV_SAMPLE_RATE": "0.25"}).sample_rate == 0.25


def test_service_and_url():
    c = load_config({"PV_RUNTIME_TOKEN": "t", "PV_SERVICE": "shop", "PV_RUNTIME_URL": "http://127.0.0.1:9999/"})
    assert c.service == "shop"
    assert c.url == "http://127.0.0.1:9999"
