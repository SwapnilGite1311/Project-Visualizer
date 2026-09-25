# change — change impact preview with risk scoring

`change.preview {project_id, change: {kind, node_id, new_name?, new_parent_id?}}` answers "what could break if I make this change?" before you make it: the elements that depend on the target (from `impact.analyze`, up to 5 steps away) and a risk score that combines the static dependencies, the kind of change, and what the running program showed recently.

Result: `{change, affected, risk: {score, level, factors}, breakdown: {static_score, type_multiplier, runtime_bonus}}` (contract `contracts/rpc/change/preview.result.schema.json`).

## Formula

```text
static_score  = impact.analyze risk score (0–100): 8 per direct dependent, 3 per indirect one, 10 per extra package touched
runtime_bonus = min(20, 2 × affected parts that ran recently) + (10 if the target or any affected part is unhealthy now)
score         = min(100, round(static_score × type_multiplier) + runtime_bonus)
level         = low (< 20) · medium (< 45) · high (< 70) · critical
```

"Ran recently" and "unhealthy" come from the runtime health of the project (warning, hanging or failing count as unhealthy), over the health window (1 minute by default). Without a connected program the runtime bonus is 0 and the score is purely static.

`factors` explains the score: impact's three factors (direct dependents, indirect dependents, packages touched), then `change type: <kind> (x<multiplier>)`, then `<n> affected parts ran recently` and `some affected parts are currently unhealthy` when they apply.

## Multipliers

| Kind | Multiplier | Why |
|---|---|---|
| `modify_body` | 0.6 | The signature stays; callers keep working unless behaviour changes. |
| `move` | 0.8 | Imports must follow, but the code is the same. |
| `rename` | 1.0 | Every caller and import must be updated. |
| `change_signature` | 1.0 | Every caller must be updated. |
| `delete` | 1.3 | Every caller breaks. |

Example (the Python fixture, `UserService` with 4 direct dependents in 2 packages, static score 42): `modify_body` → 25 (medium), `rename` → 42 (medium), `delete` → 55 (high).

## Limits

- The affected set is the same for every kind of change: `new_name` and `new_parent_id` are echoed back (for the AI summary) but do not change the set.
- Dynamic calls the static analysis cannot see (reflection, `getattr`, dependency injection) are missing from both the affected list and the score.
- Runtime evidence is only as good as the traffic: code paths that did not run in the last minute do not add to the score.
