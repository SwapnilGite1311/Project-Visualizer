# Design diary

Short notes about design moments that matter but are too small for an architecture decision record (ADR, `docs/decisions/`).

## When to write an entry

- A design choice that shapes how a module works, but is easy to change later.
- A surprise: something behaved differently than the plan expected (link the bug note in `docs/status/bugs/` if there is one).
- A lesson worth remembering the next time a similar module is built.

If the choice is hard to reverse or affects several modules, write an ADR instead.

## How

- One file per topic: `YYYY-MM-DD-<topic>.md` (for example `2026-10-01-snapshot-privacy.md`), using `template.md`.
- Keep it short: a few sentences per section.
- One owner: the person (or model run) who writes the entry. Others add comments in their own entries instead of rewriting it.
