from pv_ai.ml.dataset import build_features, build_labels, latest_per_node, rows_to_frame


def row(node, minute, calls=0, errors=0, p95=0.0, stalls=0, complexity=3):
    return {
        "node_id": node,
        "kind": "function",
        "level": 4,
        "minute": minute,
        "loc": 10,
        "complexity": complexity,
        "fan_in": 1,
        "fan_out": 2,
        "calls": calls,
        "errors": errors,
        "p95_ms": p95,
        "stalls": stalls,
    }


def test_rows_to_frame_sorts_and_fills():
    df = rows_to_frame([row("b", 5), row("a", 7), row("a", 3), {"node_id": "c", "minute": 1}])
    assert list(zip(df["node_id"], df["minute"], strict=True)) == [
        ("a", 3),
        ("a", 7),
        ("b", 5),
        ("c", 1),
    ]
    assert df.loc[3, "calls"] == 0


def test_rolling_window_per_node():
    df = rows_to_frame(
        [
            row("a", 0, calls=10, errors=1, p95=5),
            row("a", 30, calls=10, errors=0, p95=9),
            # at minute 61, minute 0 has left the 60-minute window
            row("a", 61, calls=4, errors=2, p95=3, stalls=1),
            row("b", 30, calls=100, p95=50),
        ]
    )
    f = build_features(df, window=60)
    a_last = f.iloc[2]
    assert a_last["calls_sum"] == 14
    assert a_last["errors_sum"] == 2
    assert a_last["error_rate"] == 2 / 14
    assert a_last["p95_max"] == 9
    assert a_last["stalls_sum"] == 1
    assert a_last["minutes_active"] == 2
    assert f.iloc[3]["calls_sum"] == 100  # b is separate


def test_labels_look_ahead():
    df = rows_to_frame(
        [row("a", 0), row("a", 30), row("a", 80, errors=1), row("a", 200), row("b", 0)]
    )
    assert list(build_labels(df, horizon=60)) == [0, 1, 0, 0, 0]


def test_latest_row_per_node():
    df = rows_to_frame([row("a", 1, calls=1), row("a", 9, calls=5), row("b", 3, calls=2)])
    latest = latest_per_node(df, build_features(df))
    assert list(latest["node_id"]) == ["a", "b"]
    assert list(latest["calls_sum"]) == [6, 2]
