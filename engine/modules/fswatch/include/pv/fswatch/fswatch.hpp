#pragma once
#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace pv::fswatch {

struct Change {
    enum class Kind { Modified, Created, Deleted, Rescan };
    Kind kind = Kind::Modified;
    std::string rel_path;  // relative to the watched root, '/' separators; empty for Rescan
};

using ChangeCallback = std::function<void(std::vector<Change>)>;

class Watcher {
public:
    virtual ~Watcher() = default;
    virtual void stop() = 0;  // idempotent; no callbacks after it returns
};

// Watches `root` recursively with the operating system's change events (ReadDirectoryChangesW, inotify, FSEvents).
// Events for paths matching `exclude_globs` (plus the default excludes of pv::fs) are dropped. Events are collected
// until no new event arrived for `debounce_ms`, then `on_changes` gets one batch (one entry per path, latest kind).
// A Rescan entry means events were lost (buffer overflow, new directory): the caller should compare everything.
// Returns nullptr when native watching is not possible here; the caller then polls.
std::unique_ptr<Watcher> create_watcher(const std::string& root, const std::vector<std::string>& exclude_globs,
                                        ChangeCallback on_changes, int debounce_ms = 30);

namespace detail {

// Receives raw events from a platform watcher, filters and debounces them. Shared by all platforms.
class Sink {
public:
    virtual ~Sink() = default;
    virtual void raw(Change::Kind kind, const std::string& rel_path) = 0;
};

// Platform part: starts watching and calls sink.raw() from its own thread. nullptr = not available.
std::unique_ptr<Watcher> start_platform_watcher(const std::string& root, Sink& sink);

}  // namespace detail
}  // namespace pv::fswatch
