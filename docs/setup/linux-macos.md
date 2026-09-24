# Linux and macOS setup

> On Linux/macOS the engine CMake preset is `dev-unix` instead of `dev`.

## Ubuntu 24.04

```bash
sudo apt update && sudo apt install -y git build-essential cmake ninja-build python3.12 python3.12-venv curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs && sudo npm install -g pnpm@10
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## macOS (Homebrew)

```bash
xcode-select --install
brew install git cmake ninja node@22 python@3.12 uv pnpm
```

## Check everything

```bash
bash scripts/env/check_env.sh
```
