"""The decision recommendation (go / caution / no-go).

Same thresholds, confidence math and texts as the desktop's offline rules
(desktop/src/renderer/src/features/recommend/local-rules.ts): a verdict must not change when
the cloud explains it. Change both together."""

import math

RANK = {"go": 0, "caution": 1, "no_go": 2}
TITLE = {"go": "Go", "caution": "Caution", "no_go": "No-go"}
NO_GO_FAILURE_SHARE = 0.05
SLOWDOWN_FACTOR = 1.5
FAILURE_PROBABILITY = 0.5
REPLAY_TRACES_FOR_FULL_CONFIDENCE = 200


def name_of(node_id: str) -> str:
    if "#" in node_id:
        return node_id[node_id.index("#") + 1 :]
    if ":" in node_id:
        return node_id[node_id.index(":") + 1 :] or node_id
    return node_id


def _round(n: float, digits: int = 0) -> float:
    # JavaScript Math.round semantics (halves go up), so both sides print the same numbers.
    f = 10**digits
    return math.floor(n * f + 0.5) / f


def _fmt(n: float) -> str:
    return str(int(n)) if float(n).is_integer() else str(n)


def recommend(req: dict) -> dict:
    verdict = "go"
    reasons: list[str] = []
    actions: list[str] = []

    def raise_to(v: str) -> None:
        nonlocal verdict
        if RANK[v] > RANK[verdict]:
            verdict = v

    def add_action(a: str) -> None:
        if a not in actions:
            actions.append(a)

    preview = req.get("change_preview") or None
    sim = req.get("simulation") or None
    predictions = req.get("failure_predictions") or None
    forecasts = req.get("forecasts") or None

    # 1. Change preview risk.
    risk = (preview or {}).get("risk") or {}
    level, score = risk.get("level"), risk.get("score", 0)
    if level == "critical":
        raise_to("no_go")
        reasons.append(f"The change preview rates the risk as critical (score {_fmt(score)}/100).")
        add_action("Split the change into smaller steps and check the impact again.")
    elif level == "high":
        raise_to("caution")
        reasons.append(f"The change preview rates the risk as high (score {_fmt(score)}/100).")
        add_action("Add or run tests for the directly affected parts before merging.")

    # 2. Simulation.
    if sim:
        mode = sim.get("mode")
        total = sim.get("traces_total", 0)
        extra = sim.get("traces_failed_sim", 0) - sim.get("traces_failed_real", 0)
        if mode == "replay" and extra > 0:
            share = extra / max(1, total)
            raise_to("no_go" if share >= NO_GO_FAILURE_SHARE else "caution")
            reasons.append(
                f"The simulation fails {extra} of {total} recorded requests that work today."
            )
            failed = sim.get("failed_trace_ids") or []
            add_action(
                f"Look at the failing requests (for example {failed[0]}) before making this change."
                if failed
                else "Look at the failing requests before making this change."
            )
        broken = sim.get("broken_node_ids") or []
        if mode == "static" and broken:
            raise_to("caution")
            reasons.append(f"Without runtime data, {len(broken)} parts depend on what you change.")
            add_action("Connect an agent and run the simulation on real requests.")
        real, simulated = sim.get("latency_p95_real_ms", 0), sim.get("latency_p95_sim_ms", 0)
        if mode == "replay" and real > 0 and simulated > real * SLOWDOWN_FACTOR:
            raise_to("caution")
            reasons.append(
                f"Simulated response time (p95) rises from {_fmt(_round(real))} ms"
                f" to {_fmt(_round(simulated))} ms."
            )
            add_action("Check the slowed-down calls for caching or batching options.")

    # The parts the change touches; without a preview every predicted part counts.
    touched = {a["node_id"] for a in (preview or {}).get("affected") or []}
    changed = ((preview or {}).get("change") or {}).get("node_id")
    if changed:
        touched.add(changed)

    def concerns(node_id: str) -> bool:
        return not touched or node_id in touched

    # 3. Failure predictions.
    for p in (predictions or {}).get("predictions") or []:
        if not concerns(p["node_id"]) or p["probability"] <= FAILURE_PROBABILITY:
            continue
        raise_to("caution")
        pct = _fmt(_round(p["probability"] * 100))
        reasons.append(
            f"{name_of(p['node_id'])} already has a {pct}% chance of failing within the hour."
        )
        add_action(f"Fix current errors in {name_of(p['node_id'])} first.")

    # 4. Forecasts.
    for f in (forecasts or {}).get("forecasts") or []:
        if not concerns(f["node_id"]) or f.get("predicted_state") != "error":
            continue
        raise_to("caution")
        reasons.append(f"{name_of(f['node_id'])} is forecast to be failing soon.")
        add_action(f"Stabilise {name_of(f['node_id'])} before changing code that depends on it.")

    # Confidence: the mean quality of the signals that are present.
    quality: list[float] = []
    if preview:
        quality.append(0.8)
    if sim:
        quality.append(
            min(1.0, sim.get("traces_total", 0) / REPLAY_TRACES_FOR_FULL_CONFIDENCE)
            if sim.get("mode") == "replay"
            else 0.3
        )
    if predictions:
        quality.append(0.7 if predictions.get("method") == "model" else 0.4)
    fc = (forecasts or {}).get("forecasts") or []
    if fc:
        quality.append(sum(f.get("confidence", 0) for f in fc) / len(fc))
    raw = sum(quality) / len(quality) if quality else 0.2
    confidence = _round(min(1.0, max(0.0, raw)), 2)

    if not reasons:
        if not quality:
            reasons.append("No preview, simulation or prediction yet.")
            add_action("Preview the change or run a simulation first.")
        else:
            reasons.append("No risk signal found in the data available.")
            add_action("Go ahead; keep an eye on the live map after the change.")

    markdown = "\n".join(
        [
            f"**Verdict: {TITLE[verdict]}** (confidence {_fmt(_round(confidence * 100))}%)",
            "",
            "**Why**",
            *[f"- {r}" for r in reasons],
            "",
            "**What to do**",
            *[f"- {a}" for a in actions],
        ]
    )
    return {
        "verdict": verdict,
        "confidence": confidence,
        "reasons": reasons,
        "actions": actions,
        "markdown": markdown,
    }
