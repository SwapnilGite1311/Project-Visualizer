import sqlite3
import threading
from pathlib import Path

import pytest

from pv_agent import errors
from pv_agent.config import load_config
from pv_agent.dbapi import wrap_connection

HERE = Path(__file__).resolve().parent
CONFIG = load_config({"PV_RUNTIME_TOKEN": "t", "PV_PROJECT_ROOT": str(HERE)})


def test_queries_are_timed_and_located():
    events = []
    conn = wrap_connection(sqlite3.connect(":memory:"), events.append, CONFIG)
    cur = conn.cursor()
    cur.execute("CREATE TABLE users (id INTEGER, name TEXT)")
    cur.executemany("INSERT INTO users VALUES (?, ?)", [(1, "a"), (2, "b")])
    cur.execute("SELECT name FROM users WHERE id = ?", (2,))
    assert cur.fetchall() == [("b",)]
    with pytest.raises(sqlite3.OperationalError):
        cur.execute("SELECT * FROM missing")
    assert [e["kind"] for e in events] == ["db_query"] * 4
    select = events[2]
    assert select["name"] == "SELECT name FROM users WHERE id = ?"
    assert select["attrs"] == {"db.statement": "SELECT name FROM users WHERE id = ?", "db.system": "sqlite3"}
    assert select["file_path"].replace("\\", "/").endswith("tests/test_db_errors.py")
    assert select["line"] > 0
    assert events[3]["status"] == "error"
    assert events[3]["error"]["type"] == "OperationalError"


@pytest.mark.filterwarnings("ignore::pytest.PytestUnhandledThreadExceptionWarning")
def test_thread_exceptions_become_error_events():
    events = []
    errors.install(events.append, CONFIG)
    try:

        def fail():
            raise KeyError("missing")

        t = threading.Thread(target=fail)
        t.start()
        t.join()
    finally:
        errors.uninstall()
    [e] = events
    assert e["kind"] == "error" and e["status"] == "error"
    assert e["error"]["type"] == "KeyError"
    assert e["file_path"].replace("\\", "/").endswith("tests/test_db_errors.py")
    assert threading.excepthook is not None
