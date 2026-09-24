# Getting started

## Install

1. Download the installer for your system from the project's releases page (Windows `.exe`, macOS `.dmg`, Linux `.AppImage`).
2. Run it. On Windows the app is not code-signed yet, so SmartScreen may say "Windows protected your PC": click **More info → Run anyway**.
3. Start **Project Visualizer**. The status bar at the bottom shows **Engine ready** when the analysis engine is running.

Project Visualizer currently understands **Python** (`.py` files and Jupyter notebooks `.ipynb`).

## Open your first project

The welcome screen offers three ways in:

- **Open folder** (`Ctrl+O`): pick the root folder of a project on your disk. Recently opened projects are listed on the welcome screen; click one to reopen it.
- **Import from Git**: paste a repository URL (`https://…`, `ssh://…` or `git@host:owner/repo`) and optionally a branch. The app makes a shallow copy (latest version only) and opens it. Git must be installed.
- **Paste a code snippet**: paste some Python code, give it a file name and click **Visualize**. Handy for a quick look at a single file.

While the project loads, a progress bar shows how many files have been read. Files with syntax errors are still shown; they are listed under **Insights → Files with syntax errors**.

## Add an AI key or use Ollama

The map, search, insights and **What breaks?** work without AI. **Explain** needs a language model:

1. Open **Settings** (`Ctrl+,`) → **AI**.
2. Choose a provider:
   - **Anthropic**: paste your API key.
   - **OpenAI-compatible**: works with OpenAI and with any compatible server. Enter the model name, the base URL and, if needed, a key.
   - **Ollama (free, runs on your computer)**: choose OpenAI-compatible, set the base URL to `http://localhost:11434/v1` and the model to one you have pulled (for example `llama3.1`). No key is needed.
3. Keys are stored encrypted by your operating system. See [Settings, privacy and AI keys](settings-and-privacy.md).

## Your first 5 minutes

1. **Drill down**: the first map shows the top level of the project (packages and top-level files). Double-click a package to see its modules, a module to see its classes and functions.
2. **Inspect**: click any element. The **Details** panel on the right shows its code with syntax highlighting, its size and its connections.
3. **Explain**: right-click an element → **Explain this** (or select it and press `Ctrl+E`). The explanation cites the elements it talks about; click a citation to jump to it on the map.
4. **What breaks?**: right-click → **What breaks if I change this?** The map colors everything that depends on it and the bottom panel lists them with a risk level. Press `Escape` to clear.
5. **Go back**: use the breadcrumb at the top, or `Alt+Home` for the project overview.
