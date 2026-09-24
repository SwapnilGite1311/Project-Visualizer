# Explain and What breaks?

## Explain this

Right-click any element → **Explain this**, or select it and press `Ctrl+E`. For the whole project, use **Insights → Explain the architecture**.

- **What is sent:** only a small "context pack" built by the engine: the element's own code, plus the names and kinds of the elements it is connected to (what it imports, calls, and what calls it), and your project notes. Never the whole repository.
- **Citations:** the explanation links the elements it talks about. Click a link to jump to that element on the map. Links the AI invented (elements that are not in the context pack) are removed before you see the answer.
- **Regenerate** asks again; answers are kept per element while the project is open.
- **AI can make mistakes. Check the code.** The explanation is a starting point; the code shown in **Details** is the truth.

## What breaks if I change this?

Right-click an element → **What breaks if I change this?** (also available on every hotspot in **Insights**).

- The engine follows the connections backwards: everything that uses the element is **distance 1** (direct), everything that uses those is **distance 2**, and so on (up to 5 steps).
- On the map, affected elements are colored red (direct), orange (distance 2) and yellow (further). Packages and modules that contain affected elements are colored too, so you can see the impact from any level. The changed element gets a **changed** badge.
- The bottom panel shows the list and a **risk score** from 0 to 100:
  - each direct dependent adds 8 points, each indirect dependent adds 3, and each extra package touched adds 10;
  - below 20 is **low**, below 45 **medium**, below 70 **high**, otherwise **critical**.
- Press `Escape` or **Clear** to remove the highlight.

**Limits:** the analysis only sees connections that are visible in the code (imports, direct calls, inheritance). Calls made dynamically, for example through `getattr` or a method called on a variable whose type cannot be known, are missed, so the real impact can be larger.

## Project notes

Tell the AI things it cannot read from the code, for example "This is a Flask API. The `jobs` folder runs nightly." Click the **✎** button in the toolbar (or **Project notes for AI…** in `Ctrl+K`). Notes are saved per project (up to 2,000 characters) and added to every explanation for that project.
