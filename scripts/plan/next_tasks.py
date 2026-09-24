"""Lists the next task of every module whose prerequisites are done.
Usage: python scripts/plan/next_tasks.py docs/plan/PROJECT_VISUALIZER_BUILD_PLAN.md"""
import os
import re
import sys


def main(path):
    done = {f[:-3] for f in os.listdir("docs/status/done") if f.endswith(".md")}
    lines = open(path, encoding="utf-8").read().split("\n")
    modules, order, cur, fence = {}, [], None, None
    for line in lines:
        st = line.lstrip()
        if fence is None and (st.startswith("```") or st.startswith("~~~")):
            fence = st[:3]; continue
        if fence is not None:
            if st.startswith(fence): fence = None
            continue
        m = re.match(r"^### MODULE (P\d-[A-Z0-9]+) — (.+)$", line)
        if m:
            cur = {"id": m.group(1), "title": m.group(2), "after": [], "tasks": []}
            modules[cur["id"]] = cur; order.append(cur["id"]); continue
        if cur and line.startswith("- **Starts after:**"):
            cur["after"] = re.findall(r"(P\d-[A-Z0-9]+)", line)
        t = re.match(r"^#### (P\d-[A-Z0-9]+-\d{3}) — (.+)$", line)
        if t and cur:
            cur["tasks"].append((t.group(1), t.group(2)))
    def complete(mid):
        return all(tid in done for tid, _ in modules[mid]["tasks"])
    for mid in order:
        md = modules[mid]
        if complete(mid) or not all(complete(a) for a in md["after"] if a in modules):
            continue
        for tid, title in md["tasks"]:
            if tid not in done:
                print(f"{tid} — {title}   [{md['title']}]")
                break


if __name__ == "__main__":
    main(sys.argv[1])
