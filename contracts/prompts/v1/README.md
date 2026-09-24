# Prompt templates v1

The exact text sent to the LLM. The desktop app (Phase 1) and the Python AI service (Phase 4) parse these files the same way.

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
| `explain_node.md` | kind, name, file_path, project_notes, context_json | "Explain this" |
| `test_connection.md` | (none) | checking the API key and model in Settings |
