# Windows setup

> Close and reopen the terminal after installing tools so PATH updates.

## 1. Git

```powershell
winget install --id Git.Git -e
```

## 2. Node.js and pnpm

```powershell
winget install --id OpenJS.NodeJS.LTS -e
npm install -g pnpm@10
```

## 3. Python and uv

```powershell
winget install --id Python.Python.3.12 -e
winget install --id astral-sh.uv -e
```

## 4. C++ toolchain

```powershell
winget install --id Kitware.CMake -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --wait"
```

## 5. Docker Desktop (from Phase 2)

```powershell
winget install --id Docker.DockerDesktop -e
```

Needed from Phase 2. Requires WSL2; follow the Docker Desktop first-run wizard.

## 6. Editors

```powershell
winget install --id Microsoft.VisualStudioCode -e
```

## 7. Git settings

```powershell
git config --global core.longpaths true
git config --global core.autocrlf false
git config --global init.defaultBranch main
```

## 8. Check everything

```powershell
bash scripts/env/check_env.sh
```

Run it in Git Bash from the repository root.
