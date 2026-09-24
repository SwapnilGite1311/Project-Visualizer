# Settings, privacy and AI keys

Open **Settings** with `Ctrl+,` or the gear button in the toolbar.

## AI providers

- **Anthropic**: needs an API key from console.anthropic.com. The default model is a fast, low-cost Claude model; you can change it.
- **OpenAI-compatible**: works with OpenAI and any server that speaks the same API. Set the model, the base URL and, if the server needs one, a key.
- **Ollama (local and free)**: install Ollama, pull a model (`ollama pull llama3.1`), then choose OpenAI-compatible with base URL `http://localhost:11434/v1` and that model name. Nothing leaves your computer.

The map, search, insights and **What breaks?** never use AI and work fully offline.

## Where keys are stored

API keys are encrypted with your operating system's secure storage (Windows DPAPI, macOS Keychain, Linux Secret Service) and saved in the app's data folder. They are only read by the app's background process when it calls the provider; the window you see never receives them. **Remove key** in Settings deletes it.

## What is sent to the AI

Only when you ask for an explanation, and only the context pack for that element:

- the element's own code;
- the names, kinds and file paths of the elements it is directly connected to;
- your project notes, if you wrote any.

The rest of your repository, other files' code, your settings and your keys are never sent. The engine that reads your code runs on your computer and does not use the network.

## Excluding folders

**Settings → General → Folders to skip** takes one pattern per line, for example `tests/**` or `**/migrations/**`. These are always skipped: `.git`, `node_modules`, `venv`, `.venv`, `env`, `__pycache__` and tool caches. Reopen the project after changing the list.

## Themes

**Settings → General → Theme**: **Same as system** (follows your operating system), **Light** or **Dark**.
