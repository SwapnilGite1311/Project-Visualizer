# Exploring the map

## Levels

Zooming in means going one level of abstraction deeper, not just making things bigger:

| Level | You see | Example |
| --- | --- | --- |
| 1 | Packages and top-level files of the project | `app`, `main.py` |
| 2 | Modules (files) of a package | `services.py`, `utils.py` |
| 3 | Classes and functions of a module | `UserService`, `normalize` |
| 4 | Methods of a class, or inner functions | `get_user` |

The status bar always says where you are, for example **Level 2 · Modules of app**. Libraries your code uses from outside the project (for example `requests`) appear as grey hexagons.

When you reopen a project, the app returns to the level and selection you last had.

## Moving around

- **Double-click** an element to go inside it.
- **Click** to select it and see its details; **right-click** for actions (Explain, What breaks?, Focus).
- **Breadcrumb** at the top: click any part of the path to jump back to that level.
- **Back / Forward / Up / Home** buttons in the toolbar, or `Alt+←`, `Alt+→`, `Alt+↑`, `Alt+Home`.
- **Scroll** to zoom the picture, **drag** the background to pan, `Ctrl+0` to fit everything on screen.
- `Ctrl+K` opens the command palette with every action.

## Colors and shapes

| Element | Shape | Color |
| --- | --- | --- |
| Project, package | rounded square | blue (project: purple) |
| Module (file) | square | cyan |
| Class | diamond | amber |
| Function | circle | green |
| Method | circle | light green |
| External library | hexagon | grey |

- **Size** grows with the number of lines of code.
- **Lines** between elements: grey = imports, green = calls, orange = inherits, purple = other references. A thicker line means more connections.
- Badges such as **d1** or **changed**, colored borders and faded elements come from an active highlight (**What breaks?** or **Focus**).

## Focus mode

Right-click an element → **Focus on this**. Everything that is not directly connected to it fades out, and the connections are drawn thicker, so you can see its neighbours at a glance. Press `Shift+Escape` (or run **Clear focus** from `Ctrl+K`) to show everything again. Moving to another level clears the focus automatically.

## 2D and 3D

The **2D / 3D** switch in the toolbar (or `Ctrl+Shift+3`) shows the same level as a 3D graph:

- Left-drag rotates, scroll zooms, right-drag pans.
- Hover shows an element's name; click selects, double-click goes inside, right-click opens the actions.
- Switching back keeps the level you are on.

3D is best for seeing clusters in large levels; 2D is clearer for reading names.
