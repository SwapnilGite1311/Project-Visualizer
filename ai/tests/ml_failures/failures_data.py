import random


def synthetic_rows(nodes: int = 6, minutes: int = 120, seed: int = 0) -> list[dict]:
    """Nodes 0-2 fail often (and are complex); nodes 3-5 almost never."""
    rng = random.Random(seed)
    rows = []
    for n in range(nodes):
        risky = n < nodes // 2
        for m in range(minutes):
            calls = rng.randint(5, 20)
            rows.append(
                {
                    "node_id": f"function:app/m{n}.py#f",
                    "kind": "function",
                    "level": 4,
                    "minute": 1_000_000 + m,
                    "loc": 40 if risky else 8,
                    "complexity": 20 if risky else 2,
                    "fan_in": 10 if risky else 1,
                    "fan_out": 3,
                    "calls": calls,
                    "errors": (1 if rng.random() < 0.3 else 0)
                    if risky
                    else (1 if rng.random() < 0.01 else 0),
                    "p95_ms": rng.uniform(50, 200) if risky else rng.uniform(5, 20),
                    "stalls": 0,
                }
            )
    return rows
