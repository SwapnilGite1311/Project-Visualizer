"""Rows of the metrics dataset (contracts/http/ml/dataset.schema.json) to model inputs.

One row = one node in one minute. Features look back over the previous `window` minutes; labels look
ahead `horizon` minutes. Both are computed per node.
"""

import numpy as np
import pandas as pd

ROW_COLUMNS = [
    "node_id",
    "kind",
    "level",
    "minute",
    "loc",
    "complexity",
    "fan_in",
    "fan_out",
    "calls",
    "errors",
    "p95_ms",
    "stalls",
]
NUMERIC = [c for c in ROW_COLUMNS if c not in ("node_id", "kind")]
FEATURE_COLUMNS = [
    "loc",
    "complexity",
    "fan_in",
    "fan_out",
    "level",
    "calls_sum",
    "errors_sum",
    "error_rate",
    "p95_max",
    "stalls_sum",
    "minutes_active",
]


def rows_to_frame(rows: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(rows, columns=ROW_COLUMNS)
    for c in NUMERIC:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    df["node_id"] = df["node_id"].fillna("").astype(str)
    df["kind"] = df["kind"].fillna("").astype(str)
    return df.sort_values(["node_id", "minute"], kind="stable").reset_index(drop=True)


def build_features(df: pd.DataFrame, window: int = 60) -> pd.DataFrame:
    """Per row: static metrics plus sums over the minutes (minute - window, minute]
    of the same node."""
    out = pd.DataFrame(index=df.index)
    for c in ("loc", "complexity", "fan_in", "fan_out", "level"):
        out[c] = df[c].astype(float)
    for name in ("calls_sum", "errors_sum", "p95_max", "stalls_sum", "minutes_active"):
        out[name] = 0.0
    for _, group in df.groupby("node_id", sort=False):
        minutes = group["minute"].to_numpy(dtype=np.int64)
        calls = group["calls"].to_numpy(dtype=float)
        errors = group["errors"].to_numpy(dtype=float)
        stalls = group["stalls"].to_numpy(dtype=float)
        p95 = group["p95_ms"].to_numpy(dtype=float)
        cum = {
            k: np.concatenate([[0.0], np.cumsum(v)])
            for k, v in (("c", calls), ("e", errors), ("s", stalls))
        }
        starts = np.searchsorted(minutes, minutes - window, side="right")
        ends = np.arange(1, len(minutes) + 1)
        idx = group.index
        out.loc[idx, "calls_sum"] = cum["c"][ends] - cum["c"][starts]
        out.loc[idx, "errors_sum"] = cum["e"][ends] - cum["e"][starts]
        out.loc[idx, "stalls_sum"] = cum["s"][ends] - cum["s"][starts]
        out.loc[idx, "minutes_active"] = (ends - starts).astype(float)
        out.loc[idx, "p95_max"] = [p95[s:e].max() for s, e in zip(starts, ends, strict=True)]
    out["error_rate"] = out["errors_sum"] / out["calls_sum"].clip(lower=1)
    return out[FEATURE_COLUMNS]


def build_labels(df: pd.DataFrame, horizon: int = 60) -> pd.Series:
    """1 when the node has errors in the minutes (minute, minute + horizon], else 0."""
    labels = pd.Series(0, index=df.index, dtype=int)
    for _, group in df.groupby("node_id", sort=False):
        minutes = group["minute"].to_numpy(dtype=np.int64)
        error_minutes = minutes[group["errors"].to_numpy() > 0]
        if len(error_minutes) == 0:
            continue
        first_after = np.searchsorted(error_minutes, minutes, side="right")
        has_next = first_after < len(error_minutes)
        next_error = np.where(
            has_next, error_minutes[np.minimum(first_after, len(error_minutes) - 1)], 0
        )
        labels.loc[group.index] = (has_next & (next_error <= minutes + horizon)).astype(int)
    return labels


def latest_per_node(df: pd.DataFrame, features: pd.DataFrame) -> pd.DataFrame:
    """The feature row of each node's newest minute, with its node_id."""
    last = df.groupby("node_id", sort=True)["minute"].idxmax()
    rows = features.loc[last.to_numpy()].copy()
    rows.insert(0, "node_id", df.loc[last.to_numpy(), "node_id"].to_numpy())
    return rows.reset_index(drop=True)
