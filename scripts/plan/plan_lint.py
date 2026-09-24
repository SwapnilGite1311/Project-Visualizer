"""Checks the build plan for ownership overlaps. Usage: python scripts/plan/plan_lint.py docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md"""
import re
import sys

MANIFESTS = {"desktop/package.json", "desktop/pnpm-lock.yaml", "ai/pyproject.toml", "ai/uv.lock"}


def glob_to_re(g):
    out, i = "", 0
    while i < len(g):
        if g[i:i + 3] == "**/":
            out += "(?:.*/)?"; i += 3
        elif g[i:i + 2] == "**":
            out += ".*"; i += 2
        elif g[i] == "*":
            out += "[^/]*"; i += 1
        else:
            out += re.escape(g[i]); i += 1
    return re.compile("^" + out + "$")


def main(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    modules, order, tasks, errors = {}, [], {}, []
    cur, fence = None, None
    for n, line in enumerate(lines, 1):
        st = line.lstrip()
        if fence is None and (st.startswith("```") or st.startswith("~~~")):
            fence = st[:3]; continue
        if fence is not None:
            if st.startswith(fence): fence = None
            continue
        m = re.match(r"^### MODULE (P\d-[A-Z0-9]+) — (.+)$", line)
        if m:
            cur = {"id": m.group(1), "type": None, "owns": [], "tasks": []}
            if cur["id"] in modules: errors.append(f"duplicate module {cur['id']}")
            modules[cur["id"]] = cur; order.append(cur["id"]); continue
        if cur and line.startswith("- **Type:**"):
            cur["type"] = line.split("**Type:**")[1].strip().split()[0]
        if cur and line.startswith("- **Owns:**"):
            cur["owns"] = re.findall(r"`([^`]+)`", line)
        t = re.match(r"^#### (P\d-[A-Z0-9]+-\d{3}) — ", line)
        if t:
            tid = t.group(1)
            if tid in tasks: errors.append(f"duplicate task {tid}")
            if not cur or not tid.startswith(cur["id"] + "-"): errors.append(f"task {tid} outside its module")
            tasks[tid] = {"module": cur["id"] if cur else None, "files": []}
            cur["tasks"].append(tid); continue
        if cur and cur["tasks"] and line.startswith("**Files:**"):
            tasks[cur["tasks"][-1]]["files"] += re.findall(r"`([^`]+)` \((create|edit)\)", line)
    own = {mid: [glob_to_re(g) for g in md["owns"]] for mid, md in modules.items()}
    created = {}
    for mid in order:
        for tid in modules[mid]["tasks"]:
            for p, mode in tasks[tid]["files"]:
                owners = [o for o, rs in own.items() if any(r.match(p) for r in rs)]
                if mid not in owners: errors.append(f"{tid}: {p} is not owned by {mid}")
                if len(owners) > 1 and not (p in MANIFESTS and all(modules[o]["type"] == "DEPS" for o in owners)):
                    errors.append(f"{tid}: {p} owned by several modules {owners}")
                if mode == "create":
                    if p in created: errors.append(f"{tid}: {p} already created by {created[p]}")
                    created[p] = tid
                elif p not in created:
                    errors.append(f"{tid}: edits {p} before it is created")
    print(f"modules={len(modules)} tasks={len(tasks)} files={len(created)} errors={len(errors)}")
    for e in errors: print("ERROR", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
