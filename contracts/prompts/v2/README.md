# Prompt templates v2

The exact text sent to the LLM in Phase 4. The desktop app (direct mode) and the Python AI service parse these files the same way. v2 keeps the v1 format and adds error explanations, questions about the codebase and change summaries; `v1/` stays unchanged for the Phase 1 features.

## File format

```text
SYSTEM:
<system text, any number of lines>
---
USER:
<user text, any number of lines>
```

The first line is `SYSTEM:`. A line containing only `---` separates the system part from the user part, which starts with the line `USER:`.

## Variables

Placeholders are written `{{name}}`. Every placeholder in a template must be given a value when the template is rendered; an unknown or missing placeholder is an error (the app refuses to send the prompt).

## Citations

The model must cite code elements as `[[node:<id>]]`, copying ids exactly from the facts. The app checks every cited id against the real graph and removes invalid citations before showing the answer.

## Templates

| File | Variables | Used for |
| --- | --- | --- |
| `explain_node.md` | kind, name, file_path, project_notes, context_json | "Explain this" (v1 text, plus runtime health and errors in "Watch out for") |
| `explain_error.md` | project_notes, error_json | "Explain this error": one JSON object with summary, likely_cause, fix_steps, confidence and markdown |
| `qa_answer.md` | project_notes, question, history, grounding_json | "Ask the codebase": grounded answers, with a final `NEED:` line when facts are missing |
| `change_summary.md` | project_notes, preview_json | explaining the risk of a planned change |
