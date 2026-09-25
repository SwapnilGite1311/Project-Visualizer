# Health and errors

When a program is connected (see [Live runtime](live-runtime.md)), every element on the map gets a health state from how it behaved recently. Errors — from the running program or pasted from anywhere — are placed on the map with a plain explanation.

## Health colors

| Look on the map | State | Why |
|---|---|---|
| Green outline | Healthy | It ran, without problems. |
| Amber | Warning | Some errors (older than 10 seconds and below the error rate), **slow** (95% of its calls take longer than the slow threshold), or a **possible loop** (called very many times within one request). |
| Purple, pulsing, `stalled` badge | Hanging | It has been running longer than the hang threshold and has not finished yet. |
| Red, `3 err` badge | Failing | Its share of failing calls is at or above the error rate, or it failed in the last 10 seconds. |
| No color | Unknown | It has not run since the program was connected. |

A package or module takes the **worst state of what it contains**, so a problem is visible from the top level: a red package means something inside it is failing. Health covers the last minute of activity by default.

The **Health** panel (on the right) repeats the legend and lists every **problem** — failing first, then hanging, then warnings, most errors first — with the reason (`errors (100%)`, `slow (p95 1300 ms)`, `child: errors (50%)`), the number of calls and errors, and the time 95% of calls stay under. Click a name to jump to it. Untick **Show health colors** to hide the colors (the list stays).

## Find the root cause

A red package tells you *where to look*, not *what broke*. **Find root cause** walks down for you: from the element you start at, it repeatedly goes to the child in the worst state (the one with the most errors when several are equal) until it reaches the element where the problem really is — usually a single function — and shows it on the map.

Use it from:

- the **Find root cause** button next to a problem in the Health panel;
- the right-click menu of any element that is not healthy;
- the keyboard: select an element and press `Ctrl+Shift+K`.

## Paste an error

Got a stack trace from a log, a colleague, a CI run or a crash report? Paste it to see where it happened:

1. Click **Find an error on the map** on the welcome screen, **Paste an error…** in the **Errors** panel, or press `Ctrl+Shift+V`.
2. Paste the whole error output (the traceback or stack trace) and click **Find on map**.

Project Visualizer recognizes Python tracebacks, JavaScript/Node.js stacks, Java and C# exceptions and Go panics (and file:line patterns in anything else). The line where the error happened is marked **error here** in red — together with the module and package containing it — and the other lines of your project that led there are numbered in orange (`1`, `2`, …) in the order they were called. Lines from libraries are listed but not placed on the map.

If none of the lines belong to the open project, you are told so: check that the right project is open (paths in the error may come from another computer — only the part after the project folder has to match).

## Runtime errors list

The **Errors** panel (bottom) lists every error: the ones the running program reported and the ones you pasted (the badge says which). Identical runtime errors are grouped with a count (`×12`) and the time they were last seen; the newest are at the top.

Select an error to see:

- **What it means** in plain words — for example, *KeyError: the code asked a dictionary for a key that is not in it* — with common causes. Explanations exist for the most frequent errors of Python, JavaScript, Java, Go and C#; other errors get a short generic line.
- The message and every line of the stack; your project's lines are in bold and clickable (click one to jump to it).
- **Clear** removes it from the list; **Clear all** empties the list.

The error is also marked on the map, like a pasted one.

## Thresholds

The Health panel has a **Thresholds** section (click to open) where you decide what counts as a problem for this project:

| Setting | Default | Meaning |
|---|---|---|
| Look at the last (seconds) | 60 | How much recent activity health is computed from. |
| Error rate for red (%) | 5 | At or above this share of failing calls, an element is red. |
| Slow above (ms) | 1000 | When 95% of calls take longer than this, the element is amber (slow). |
| Hanging after (ms) | 5000 | A call still running after this long is reported as hanging (purple). |
| Loop warning after (calls) | 1000 | More calls than this within one request is flagged as a possible loop. |

Click **Save thresholds**; the colors update with the next activity. For the Python agent, the hang limit is also set when starting the program (`PV_STALL_MS`).
