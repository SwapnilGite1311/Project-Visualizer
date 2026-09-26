# Predictions, forecasts and decisions

Once a program has been connected with an agent for a while, Project Visualizer keeps a per-minute history of every element: calls, errors, response time and hangs. From that history it estimates what is likely to go wrong next, and it combines everything it knows into one answer to the question *should I make this change?*

All of this works without the cloud. When you are signed in, a model trained on your own history takes over where it can.

## Failure predictions

Open the **Predictions** panel (right) and click **Predict now**, or use **Predict failures and bottlenecks** from the command palette.

The panel lists the elements most likely to fail within the next hour, riskiest first, each with a bar, the probability and the **factors** behind it — for example *recent errors · high complexity · many callers*. Click a name to jump to it. On the map, each risky element and the packages and modules that contain it get a **ring** and a badge such as `45% risk` (yellow above 20 %, orange above 40 %, red above 70 %); the fill color keeps showing its health now. Elements with no risk are only counted (*4 other elements show no risk*). **Clear** removes the marks.

The badge at the top says how the numbers were made:

| Badge | Meaning |
|---|---|
| **Local estimate** | Worked out on your computer from the last hour: the share of failing calls, hangs, how complex the code is and how many places call it. Recent errors weigh by far the most; with no errors or hangs, a risk stays below 10 %. |
| **Cloud estimate (no model yet)** | The same rule, run in the cloud because no model has been trained for this project yet. |
| **Trained model** | A model trained on your project's history in the cloud; it learns which patterns came before real failures in *your* code. |

**To train a model** (signed in only): enter the **cloud project** this folder belongs to — it is remembered per folder — and click **Train model**. The status shows *Training…* and then *Model trained on 1 240 samples (AUC 0.81)*. The closer the AUC is to 1, the better the model told failing and healthy minutes apart when it was tested on history it had not seen; around 0.5 means it is guessing. Train again after a few days of new history.

## Bottlenecks

With a trained cloud project, the Predictions panel also lists **likely bottlenecks**: elements whose response time is growing. Each line shows the response time 95 % of calls stay under now and where it is heading — *P95 120 ms → 310 ms* — and the trend per hour (*+8.5 ms/h*). The local estimate does not predict bottlenecks.

## Health forecast

The **Forecast** panel (right) shows the selected element's last 48 hours and the next 24:

- **Errors** or **Latency**: the share of failing calls or the response time (p95).
- A **solid line** for the history, a **dashed line** for the forecast and a **shaded band** where the real values will most likely be (95 % of the time, if the recent pattern holds). The band widens when the history is noisy.
- **Red dots** mark unusual points in the history — a sudden spike or drop compared with the hours around it. Hover one to see its value. They are looked for once there are at least 24 hours with calls.
- **Next 24 hours** says what state the element is heading for — *Healthy*, *Warning* or *Failing* — with a confidence.

**Check visible modules** forecasts the error rate of everything on the current level of the map (up to 30 elements) and marks the ones heading for a worse state than they are in now with `risk up`. Use **Forecast health of the visible modules** from the command palette to do the same.

If an element has no history the panel says *Run your app with an agent to collect history*. Only hours in which the element was actually called count as history.

## The recommendation (go, caution, no-go)

The **Decision** panel (right) gives one answer for the change you are considering. It appears once you have a **change preview** (right-click → *Preview a change…*) or a **simulation result**, and it also takes into account the failure predictions and forecasts you have run:

| Verdict | When |
|---|---|
| **No-go** | The change preview rates the risk as critical, or the simulation fails 5 % or more of the recorded requests that work today. |
| **Caution** | A high-risk preview; a simulation that fails some requests, has no runtime data, or makes responses more than 1.5 × slower; an affected element that already has a more than 50 % chance of failing; or one forecast to be failing soon. |
| **Go** | None of the above. |

Below the verdict you get the **reasons** (*The simulation fails 12 of 180 recorded requests that work today.*) and **what to do** (*Look at the failing requests before making this change.*). **Explain with AI** turns this into a short written explanation; the verdict itself never changes — the same rules run on your computer and in the cloud.

## Confidence and data

Every number comes with a confidence, and it is only as good as the history behind it:

- **Forecast confidence** grows with the hours of history: 24 hours with calls gives 50 %, 48 hours or more gives 100 %. One hour of traffic gives about 2 % — a line, not a forecast.
- **Recommendation confidence** is the average of the signals present: a change preview counts as 80 %; a replayed simulation reaches 100 % at 200 recorded requests (a static one counts 30 %); predictions count 70 % from a trained model and 40 % from an estimate; forecasts count with their own confidence.
- **Predictions** reflect the last hour. An element that was not called in that hour can only get the small part of the risk that comes from its code.
- **Forecasts continue the recent trend.** A release, a traffic peak or a fix will not be foreseen; the band shows the usual variation, not surprises.

Collect history under realistic use — a test run of a few seconds says little about next week.

## What is sent to the cloud

Nothing, unless you are signed in to the cloud. When you are:

- **Train model** and **Predict now** send the per-minute statistics of each element: its name and file path, kind and level, lines of code, complexity, number of callers and callees, calls, errors, response time (p95) and hangs. For predictions, only the last 2 hours (24 hours for bottlenecks).
- The **forecast** sends the hourly error-rate or response-time numbers of the element(s) being forecast.
- **Unusual points** are found in the cloud when signed in (the same numbers as the forecast), on your computer otherwise.
- **Explain with AI** sends the verdict inputs: the preview's risk and affected elements, the simulation totals, predictions and forecasts.

**Source code, request contents, error messages and stack traces are never sent** for predictions, forecasts or decisions. If the cloud cannot be reached, the local estimate and forecast are used and the panel says so.
