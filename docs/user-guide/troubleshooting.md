# Troubleshooting

## Engine not found

The status bar shows **Engine stopped** or **Engine crashed** (or never reaches **Engine ready**) and projects do not open.

- Installed app: reinstall it; the engine (`pv-engine`) is part of the installer. Some antivirus tools quarantine new unsigned programs; check its quarantine and allow `pv-engine`.
- Running from source: build the engine first (`cd engine && cmake --preset dev && cmake --build --preset dev`), or set the environment variable `PV_ENGINE_PATH` to the full path of `pv-engine`.

If the engine crashes, the app restarts it automatically and reopens your project.

## Project takes long to load

- Very large folders that are not source code (data sets, build output, vendored libraries) slow loading down. Add them under **Settings → General → Folders to skip** and reopen the project.
- As a guide, about 1,000 Python files load in under a few seconds on a normal laptop.
- The progress bar shows files read so far; if it stops moving for a long time, check the logs (below).

## Explain says no API key

The message "Add an API key in Settings → AI" means the selected provider needs a key and none is saved.

- Open **Settings → AI**, check the chosen provider, paste the key and save.
- "The API key was rejected": the key is wrong or expired; create a new one with your provider.
- With Ollama, make sure Ollama is running and the base URL is `http://localhost:11434/v1`.

## Git import fails

- "Git is not installed": install Git from git-scm.com and restart the app.
- "Not a valid Git URL": use a `https://…`, `ssh://…` or `git@host:owner/repo` address.
- "git clone failed: …": the text after it comes from Git. Common causes: a private repository (sign in to Git on your computer first, or use SSH), a wrong branch name, or no internet connection.
- Imported repositories are stored in the app's data folder under `repos/`.

## Where are the logs

The app writes `logs/main.log` in its data folder:

| System | Folder |
| --- | --- |
| Windows | `%APPDATA%\Project Visualizer\logs\main.log` |
| macOS | `~/Library/Application Support/Project Visualizer/logs/main.log` |
| Linux | `~/.config/Project Visualizer/logs/main.log` |

Attach this file when you report a problem.
