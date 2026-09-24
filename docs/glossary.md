# Glossary

| Term | Meaning |
|---|---|
| Digital twin | The live model (graph + runtime + AI) of a codebase. |
| Level view | The children of one node plus the aggregated edges between them; it is what the canvas shows. |
| Drill down / up | Move one level deeper / higher in the abstraction stack. |
| Overlay | Extra colors, badges or animations drawn on top of the graph (impact, runtime, health, simulation). |
| Grounding pack | Facts from the engine given to the LLM for errors and questions so it cannot invent things. |
| Hotspot | A node with unusually high complexity, size or coupling. |
| Module crossing | A runtime call that goes from one module (file) into another. |
| Sandbox | A copy-on-write copy of the graph where "what-if" changes are applied without touching the real project. |
| DEPS module | A module that is allowed to edit shared manifest files (card R3.4). |
| Wave | A group of modules that can be built at the same time. |
| Node | One element of the graph (project, package, module, class, function, method, variable, statement or external) with an id, kind, name, span, level, parent and metrics. |
| Edge | A directed relation between two nodes of kind imports, calls, inherits or references, with a weight counting how often it occurs. |
| Level | The abstraction level of a node as an integer: Project 0, Package/External 1, Module 2, Class 3, Function/Method 4, Variable/Statement 5. |
| Node ID | The unique string id of a node in the exact format `<kind>:<path>#<in-file qualname>`, for example `method:src/app/main.py#App.start`. |
| Qualified name | The language-level full name of a node (Python: dotted module path + "." + in-file qualname). |
| Span | The source location of a node: 1-based start/end lines and 0-based start/end columns (all zero = unknown). |
| Package | A directory relative to the project root that contains at least one supported source file, directly or in a sub-directory. |
| Module | One source file of the project. |
| External node | A node for a top-level library that is imported but not part of the project, for example `external:numpy`. |
| Context pack | The facts about one node (source, neighbours, metrics) that the engine builds for an AI explanation. |
| Citation | A reference `[[node:<node_id>]]` in an AI answer that must point to a real node id. |
| Runtime hub | The local HTTP server inside the desktop app (127.0.0.1:47100) that receives runtime events from agents. |
| Agent | A small library running inside the user's application that records execution events and sends them to the runtime hub. |
| OTLP | The OpenTelemetry protocol; the runtime hub accepts OTLP/HTTP JSON traces from any instrumented language. |
| Snapshot | An exported copy of a project's graph (nodes and edges, never source code) that can be shared or loaded later. |
| Entitlement | A feature or limit that an organization's plan allows, checked by the licensing service. |
| MVP checkpoint | The point in Phase 1 (module P1-MVP) where the minimum viable product is complete and demonstrated. |
