# Dashboards, simple words and help

Project Visualizer is meant for everyone who needs to understand a program — developers, but also testers, product people, managers and students. This page explains the parts of the app that make it easy to start.

## The dashboards

The column on the far left lists the **dashboards**. Each one shows only the panels one job needs, so the screen stays calm:

| Dashboard | For | What you see |
|---|---|---|
| **Explore** (map icon) | Understanding what the project is made of | The map, Search, Insights and Pinned on the left, Details and Explanation on the right |
| **Watch it run** (pulse icon) | Following your program while it runs | The map with live colours, Health on the right, Runtime, Errors and Fixes at the bottom |
| **Change safely** (shield icon) | Checking a change before you make it | Details and the Decision on the right, Impact, Change preview and Dependencies at the bottom |
| **What if** (flask icon) | Trying changes in a safe copy, predicting problems | The Decision, Predictions and Forecast on the right, the Simulation at the bottom |
| **History** (clock icon) | Seeing how the project changed | Project history and Code Motion at the bottom |
| **All tools** (grid icon) | Experienced users | Every panel at once, as before |

Switch with a click, the arrow keys on the column, or `Ctrl+1` … `Ctrl+6`. The app remembers the last dashboard. If something you start needs a panel another dashboard has — for example "Open a sandbox" from a right-click — the app moves to that dashboard for you.

Each dashboard opens with a short card over the map: what the screen is for in two sentences and a few **Try this** buttons (for example **Explain this project**, **Open a sandbox**, **Predict problems**). **Got it** hides the card for that dashboard; **About this dashboard** brings it back. When the window is narrow the column shows pictures only; hover one to read its name.

## Simple words

The app uses everyday words by default:

| Developer word | Simple word |
|---|---|
| package | Folder |
| module | File |
| method | Function in a class |
| fan-in | Used by |
| fan-out | Uses |
| inherits | builds on |

The status bar says "Files in shop" instead of "Level 2 · Modules of shop", the Details panel says what an element is in one sentence ("One file of code. It groups related functions and classes."), and every number has a tooltip explaining it. **Settings → Words** has the full glossary and a switch for the exact developer terms.

## Getting help

- **The tour.** The first time a project opens, a five-step tour points at the dashboards, the map, the details, search and help. Press `Esc` to stop it; **Help → Take the tour** starts it again.
- **Help — how do I…** Click the **?** at the top right or press `F1`. Pick a task — understand the project, find a part, see what breaks if I change something, watch my program run, find where an error happens, try a change without risk, see how the project changed, ask the AI to explain, what the colours mean, the words used — and read three steps. **Show me** opens the right dashboard and points at the right place. Type in the search box to find a task.

## The sample project

No project at hand? On the welcome screen choose **Try a sample project**. The app creates a small online shop — a `shop` folder (catalog, cart, checkout, discounts) and a `payments` folder (card, receipt) — opens it on the Explore dashboard and starts the tour. It is recreated fresh each time, so feel free to try anything.

The sample also has a `run_demo.py` that places four orders, one with a wrong card number on purpose. Run it with the agent (see **Help → Watch my program run**) to see requests move across the map and the failing order turn red.
