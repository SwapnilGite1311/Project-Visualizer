"""Probability that a node errors within the next hour, with the factors that drive it.

With enough history (≥ 200 samples, both classes) a gradient-boosting model is trained; otherwise a
transparent heuristic is used. Either way the answer names the method.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score

from pv_ai.ml.dataset import (
    FEATURE_COLUMNS,
    build_features,
    build_labels,
    latest_per_node,
    rows_to_frame,
)

MIN_SAMPLES = 200
FACTOR_NAMES = {
    "error_rate": "recent errors",
    "errors_sum": "recent errors",
    "complexity": "high complexity",
    "stalls_sum": "stalls",
    "fan_in": "many callers",
    "p95_max": "slow responses",
    "calls_sum": "heavy use",
    "loc": "large code",
    "fan_out": "many dependencies",
    "level": "position in the structure",
    "minutes_active": "long activity",
}


def train(rows: list[dict]) -> tuple[GradientBoostingClassifier | None, dict]:
    df = rows_to_frame(rows)
    features = build_features(df)
    labels = build_labels(df)
    samples, positives = len(df), int(labels.sum())
    if samples < MIN_SAMPLES or positives == 0 or positives == samples:
        return None, {"method": "heuristic", "samples": samples, "positives": positives}
    # Hold out the newest 20 % (by time) to measure how well the model ranks failures.
    order = np.argsort(df["minute"].to_numpy(), kind="stable")
    cut = int(len(order) * 0.8)
    train_idx, test_idx = order[:cut], order[cut:]
    model = GradientBoostingClassifier(random_state=0)
    model.fit(features.iloc[train_idx][FEATURE_COLUMNS], labels.iloc[train_idx])
    meta: dict = {"method": "model", "samples": samples, "positives": positives}
    held_out = labels.iloc[test_idx]
    if held_out.nunique() == 2:
        scores = model.predict_proba(features.iloc[test_idx][FEATURE_COLUMNS])[:, 1]
        meta["auc"] = float(roc_auc_score(held_out, scores))
    model.fit(features[FEATURE_COLUMNS], labels)  # final model on everything
    return model, meta


def heuristic_terms(f: pd.Series) -> list[tuple[str, float]]:
    complexity_norm = min(1.0, float(f["complexity"]) / 30)
    return [
        ("recent errors", 0.6 * float(f["error_rate"])),
        ("high complexity", 0.02 * complexity_norm),
        ("stalls", 0.1 if f["stalls_sum"] > 0 else 0.0),
        ("many callers", 0.05 * min(1.0, float(f["fan_in"]) / 20)),
    ]


def heuristic_probability(f: pd.Series) -> float:
    return min(0.95, sum(v for _, v in heuristic_terms(f)))


def predict(model: GradientBoostingClassifier | None, rows: list[dict]) -> list[dict]:
    df = rows_to_frame(rows)
    if df.empty:
        return []
    latest = latest_per_node(df, build_features(df))
    out = []
    if model is None:
        for _, f in latest.iterrows():
            terms = [name for name, value in heuristic_terms(f) if value > 0]
            out.append(
                {
                    "node_id": f["node_id"],
                    "probability": round(heuristic_probability(f), 4),
                    "top_factors": terms,
                }
            )
    else:
        x = latest[FEATURE_COLUMNS]
        probabilities = model.predict_proba(x)[:, 1]
        maxima = x.max().replace(0, 1)
        weights = x.div(maxima) * model.feature_importances_
        for i, f in latest.iterrows():
            top = weights.loc[i].sort_values(ascending=False)
            factors: list[str] = []
            for column, weight in top.items():
                name = FACTOR_NAMES[column]
                if weight > 0 and name not in factors:
                    factors.append(name)
                if len(factors) == 3:
                    break
            out.append(
                {
                    "node_id": f["node_id"],
                    "probability": round(float(probabilities[i]), 4),
                    "top_factors": factors,
                }
            )
    return sorted(out, key=lambda p: (-p["probability"], p["node_id"]))
