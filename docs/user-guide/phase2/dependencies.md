# Dependencies and interactions

## Uses and used by

Right-click any element → **Show dependencies**. The **Dependencies** panel at the bottom lists:

- **→ uses** — what this element needs: functions it calls, modules it imports, classes it extends;
- **← used by** — who needs it.

Switch between **Uses**, **Used by** and **Both**. On the map, elements it uses turn green, elements that use it turn blue, and elements that are both turn purple; the element itself gets a yellow border, and everything unrelated fades. Because each element counts together with everything inside it, asking about a package shows every connection of every file in it — at any level of the map. Click a row to jump to that element. Untick **Show on map** to keep the list without the colors, or click **Clear**.

## Depth

**Depth** (1–5) follows connections further: depth 2 also shows what the direct dependencies use (or who uses the direct users), grouped as *Direct*, *2 steps away* and so on. Use depth 1 for "what breaks if I change this signature?", deeper levels to see how far an idea travels through the code.

## Find a path

Right-click an element → **Find path to…** (or the button in the Dependencies panel), then search for the element you want to reach. The app shows the shortest chain of calls and imports from one to the other, numbered 1, 2, 3… on the map and as a clickable list. "No path found within 8 steps" means the first element does not (directly or indirectly) use the second.

## Circular dependencies

In the Dependencies panel, choose a level (**Packages**, **Modules**, **Classes** or **Functions**) and click **Find cycles**. Each result is a loop such as `a.py → b.py → c.py → a.py`: every member depends on the next one, so none can be changed or tested alone. Click a loop to color it red on the map. Cycles between packages or modules are the most important to fix; small cycles between functions of one file are often fine.

## Hover cards, pins and copy actions

- **Hover card:** rest the mouse on an element for a moment to see its name, kind, file and lines, size, complexity, and how many elements use it and it uses.
- **Visited:** elements you have selected get a grey border, so you can see where you have already looked.
- **Pins:** right-click → **Pin / unpin** marks important elements with a `pin` badge; they are listed in the **Pinned** tab on the left and remembered per project.
- **Copy:** right-click → **Copy name**, **Copy element id** or **Copy file path**.
- **Show in file explorer:** opens the folder of the element's file with the file selected.
