# Acceptance criteria (MVP)

## US-01

- **Given** a Python project folder with ≤ 5,000 .py files
- **When** the user selects it
- **Then** within 30 s the map shows the project's top level, and a progress indicator is visible while loading.

## US-02

- **Given** a map
- **When** the user double-clicks a package, module or class
- **Then** the view shows that node's children and aggregated edges between them within 500 ms.

## US-03

- **Given** the user is 3 levels deep
- **When** they click the first breadcrumb item
- **Then** the project top level is shown.

## US-04

- **Given** any function node is selected
- **When** the inspector opens
- **Then** it shows name, kind, file path, line range, metrics and the exact source lines.

## US-05

- **Given** an API key is configured
- **When** the user clicks Explain on a node
- **Then** a plain-language explanation appears within 20 s, every `[[node:…]]` citation is clickable, and invalid citations are removed.

## US-06

- **Given** a function called by 3 other functions
- **When** the user clicks What breaks?
- **Then** those 3 are highlighted as distance 1, a list shows all affected nodes with distances, and a risk level (low/medium/high/critical) is shown.
