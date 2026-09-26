# Time travel and simulation

Two ways to see code that is not the code you have now: **time travel** shows an earlier version from your Git history, and a **simulation sandbox** shows a version that does not exist yet — the one you are thinking about making.

## Time travel

Open the **History** panel (bottom), use **Show project history** from the command palette, or press `Ctrl+Shift+H`. It works for folders that are Git repositories; other folders show *Not a Git repository*.

1. Pick a commit from the list (newest first) or drag the **timeline** slider (oldest on the left).
2. The panel tells you what changed since then — *3 new, 5 changed, 1 removed; links +4 / −2* — with a table **per package** and a list of what was **removed since then**.
3. The current map marks the differences: green `new`, orange `changed`, and an orange outline with `changes inside` on packages and modules that contain changes, so you can see them from the top level and drill down.

**Show this version** switches the map to the code as it was at that commit. A banner says *Viewing commit a1b2c3d (2026-08-14) — read-only*; you can explore, search and explain as usual, but nothing is written. **Back to current** returns to today's code; **Clear** removes the marks.

The first time you open a commit it is read from Git and analysed, which takes a moment for large projects; opening it again is fast because the result is cached.

## Open a sandbox

A sandbox is a copy of the map where you can change things freely. Your files are never touched.

- Right-click an element and choose **What if…? (open a sandbox)**, use **What if…? Open a simulation sandbox** from the command palette, or open the **Simulation** panel (bottom), give the sandbox a name (optional) and click **Open a sandbox**.
- A banner stays at the top while you are inside: *Simulation sandbox 'no validation' — nothing here changes your real code*. **Exit** goes back to the real project and keeps the sandbox for later; **Discard** throws it away.

Everything else works inside the sandbox: drill down, search, the inspector, change preview.

## Simulated changes

Inside a sandbox, right-click an element to change it:

| Action | What it simulates |
|---|---|
| **Simulate removing this** | The element is gone; everything that called it now fails. It stays on the map, faded, with a `removed` badge. |
| **Simulate slower…** | Every call to it takes ×2, ×5 or ×10 as long. Orange, with the factor as badge. |
| **Simulate failures…** | 10 %, 50 % or 100 % of its calls fail. Red, with the share as badge. |
| **Simulate removing a dependency…** | Pick one of the things it uses; that link is cut. |

Each change is added to the **Changes** list in the Simulation panel. Add as many as you like, then click **Run simulation** (in the banner or the panel).

## Reading the comparison

If a program has been connected with an agent (see the Phase 3 guide), the simulation **replays the requests that were recorded** — for example *Replayed 180 recorded requests* — through the changed code and compares:

- **Real and simulated**: failed requests and response time (p95) today versus in the sandbox.
- **Effects per element**: calls, failures and response time for each element the requests went through, real and simulated.
- **Requests that would fail**: the recorded requests that work today and would break; the sandbox map draws the broken elements in red, pulsing, and the flows between them (green when fine, red when failing).

The result also goes to the **Decision** panel on the right (see [Predictions, forecasts and decisions](predictions-and-decisions.md)), which stays filled when you exit the sandbox, so you can compare with a change preview on the real map.

Without recorded requests the panel says *No runtime data — showing static impact only*: you see which elements depend on what you changed, but not how many requests would fail or how much slower they would get.

## Limits of simulation

A simulation is an estimate built from what was recorded, not a test run of your program:

- **Only recorded paths are replayed.** Requests that did not happen while the agent was connected, or code paths they did not reach, are not in the result. Record typical use of the program first.
- **Code is not executed.** Removing an element makes its callers fail; the sandbox does not know whether your code would catch that error and carry on.
- **Slower means proportionally slower.** A ×5 slowdown multiplies the recorded times; queues, timeouts and retries that a real slowdown can cause are not modelled.
- **Failures are spread, not modelled.** A 50 % failure rate fails about half of the calls, chosen by a fixed rule from each recorded call, so the same calls fail every time you run it; real failures often come in bursts instead.
- **Static mode is only a dependency check.** Without runtime data, treat the result as "these parts would need attention", not as a prediction of failures.
