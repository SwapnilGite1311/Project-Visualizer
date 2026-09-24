# Setup

## Guides

- [Windows](windows.md)
- [Linux and macOS](linux-macos.md)
- [Secrets management](secrets.md)

## Clean machine checklist

- [ ] Install tools from the guide for your OS
- [ ] Clone the repository to a short path without spaces
- [ ] Run bash scripts/env/check_env.sh and get ALL REQUIRED TOOLS OK
- [ ] (From Phase 1) cd engine && cmake --preset dev && cmake --build --preset dev succeeds
- [ ] (From Phase 1) cd desktop && pnpm install && pnpm dev opens a window
- [ ] Record the result in validation-log.md
