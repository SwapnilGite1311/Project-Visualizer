# Code Motion

Code Motion records a real run of your program and replays it: you watch the code move across the map and step through a function line by line, with the values of its variables — in 2D or 3D.

## Record a run

1. Open the **Code Motion** tab at the bottom (or `Ctrl+Shift+M`).
2. Type the command you would type after `python` in a terminal, run from the project folder: `main.py`, `app.py --debug`, or `-m pytest tests/test_users.py`.
3. Click **Record and play**.

You need Python 3.9 or newer (the panel shows which one it found). **This runs your program on your computer, like running it in a terminal** — only record code you trust. A run is stopped after 2 minutes; keep recordings short (one script or one test). While recording, the program runs roughly 10–50× slower than normal.

Recordings you made elsewhere (`python -m pv_trace …`) open with **Load trace…**.

## Watch it on the map

With **Map** selected, press **▶ Play**. The element that is running glows yellow with a `▶` badge, elements further down the call stack turn light blue, and when the program moves from one element to another, the line between them lights up and animates. It works at every level: at the top you see which package or file is busy; drill in to see functions. Switch to **3D** with the toolbar and the same glow and flowing particles move through the 3D map.

Use **⏮ / ⏭** to go one step at a time, the slider to jump anywhere, and **Speed** (0.25× to 8×) to slow down or speed up. In Map mode each step is a call or a return, so you follow the program function by function.

## Inside a function

Select **Inside** and open the **Inside view** tab above the map. The running function is drawn as a path of its statements (`if`, loops, `try`, assignments, `return`…), and a yellow runner moves to the statement that is about to run. Calls made by that statement are listed next to it, and when the function finishes, the returned value appears.

The **Variables** table below shows the function's local variables; the ones that just changed are highlighted. The **Call stack** lists which function called which (click one to find it on the map). **Jump to error** goes straight to the last exception.

In **3D**, the call stack becomes floors: the running function is the bright top floor, and the functions that called it are dimmer floors underneath, so you can see how deep the program is.

Right-click a function on the map → **Watch this run inside** to jump to the first time it ran.

## Walk through without running

If you cannot run the program (missing data, a server, the wrong Python), click **Walk through without running**, or right-click a function → **Walk through from here**. The app follows the calls it can see in the code, starting from the selected function or the program's entry point, and plays them on the map. It shows *how the code is meant to flow*, without values — a walkthrough is not a real run.

## Limits and privacy

- Only your project's own files are recorded; the standard library and installed packages are skipped. Only the main thread is recorded.
- Recording stops after 200,000 events; the panel then says "Recording stopped after … events".
- Values are short text versions of your variables (long lists and strings are cut).
- Code Motion works for Python today; other languages can be walked through but not recorded yet.
- **Privacy:** recordings contain your variables' values. They are saved only on your computer (the app's data folder, newest 10 kept) and are never uploaded.
