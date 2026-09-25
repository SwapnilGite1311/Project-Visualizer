import sys

import pv_agent
from pv_agent.config import load_config


def test_start_is_off_without_a_token(monkeypatch, capsys):
    monkeypatch.delenv("PV_RUNTIME_TOKEN", raising=False)
    assert pv_agent.start() is False
    assert "PV_RUNTIME_TOKEN is not set" in capsys.readouterr().err


def test_start_stays_off_when_no_tool_id_is_free(monkeypatch, capsys):
    taken = []
    for tool_id in (2, 3, 4):
        if sys.monitoring.get_tool(tool_id) is None:
            sys.monitoring.use_tool_id(tool_id, "other tool")
            taken.append(tool_id)
    try:
        config = load_config({"PV_RUNTIME_TOKEN": "t", "PV_RUNTIME_URL": "http://127.0.0.1:9"})
        assert pv_agent.start(config) is False
        assert "runtime recording is off" in capsys.readouterr().err
        assert pv_agent._state == {}
    finally:
        for tool_id in taken:
            sys.monitoring.free_tool_id(tool_id)


def test_start_stays_off_on_old_python(monkeypatch, capsys):
    monkeypatch.delattr(sys, "monitoring")
    config = load_config({"PV_RUNTIME_TOKEN": "t"})
    assert pv_agent.start(config) is False
    assert "needs Python 3.12" in capsys.readouterr().err
