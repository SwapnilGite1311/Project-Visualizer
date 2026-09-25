# fixsync — fix detection and live resolution

Notices when you fix an error: saving the file that contains a failing function marks the error "fix pending", and successful runs of that function afterwards confirm the fix and remove the error from the list. If the same error happens again, the fix is marked as regressed.

RPC: `fixes.list {project_id}` → `{items: [{error_id, node_id, file_path, state, changed_at_ms, ok_calls}]}`. Notification `fixes.changed {project_id, items}` whenever items change state.

## States

```text
            file with the error saved
  open  ─────────────────────────────►  fix_pending
                                          │      │
             3 successful calls after     │      │  the same error again
             the save                     ▼      ▼
                                     verified   regressed
                                          │      │
                                          └──┬───┘
                           file saved again  │
                                             ▼
                                        fix_pending
```

## Rules

- **fix_pending**: live sync (the `incremental` module) reports changed files; every error in the list (runtime or pasted) whose origin element lives in one of those files becomes pending, with the save time and a call count of 0.
- **verified**: runtime events on the pending element count only when the call **started after the save** (calls already running when you saved do not prove anything). After 3 successful calls, the fix is verified and the error is removed from the errors list.
- **regressed**: an error on the pending element with the same type and message (the same key `type|message|element`) means the fix did not work. Other errors on that element do not change the state.
- Saving the file again makes a verified or regressed item pending again.

## Limits

- Verifying needs runtime traffic: without a connected agent (or OpenTelemetry), an item stays pending until the error is cleared by hand.
- The program must actually run the new code: interpreted programs (Python, Node.js) usually need a restart, compiled ones a rebuild.
- An error is tied to the element where it happened; a fix made in another file (a caller or a helper) is not noticed until that element's own file changes.
- Items are kept in memory for the session; they are not saved with the project.
