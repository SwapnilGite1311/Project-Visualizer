#ifdef __APPLE__
#include <CoreServices/CoreServices.h>
#include <dispatch/dispatch.h>

#include <atomic>
#include <filesystem>
#include <string>

#include "pv/fswatch/fswatch.hpp"

namespace pv::fswatch::detail {

namespace {

class MacWatcher : public Watcher {
public:
    MacWatcher(std::string root, Sink& sink) : root_(std::move(root)), sink_(sink) {
        queue_ = dispatch_queue_create("pv.fswatch", DISPATCH_QUEUE_SERIAL);
    }
    ~MacWatcher() override { stop(); }

    bool start() {
        CFStringRef path = CFStringCreateWithCString(nullptr, root_.c_str(), kCFStringEncodingUTF8);
        CFArrayRef paths = CFArrayCreate(nullptr, reinterpret_cast<const void**>(&path), 1, &kCFTypeArrayCallBacks);
        FSEventStreamContext ctx{0, this, nullptr, nullptr, nullptr};
        stream_ = FSEventStreamCreate(nullptr, &MacWatcher::callback, &ctx, paths, kFSEventStreamEventIdSinceNow, 0.02,
                                      kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagNoDefer |
                                          kFSEventStreamCreateFlagUseCFTypes);
        CFRelease(paths);
        CFRelease(path);
        if (!stream_) return false;
        FSEventStreamSetDispatchQueue(stream_, queue_);
        if (!FSEventStreamStart(stream_)) {
            FSEventStreamInvalidate(stream_);
            FSEventStreamRelease(stream_);
            stream_ = nullptr;
            return false;
        }
        return true;
    }

    void stop() override {
        if (stopped_.exchange(true)) return;
        if (stream_) {
            FSEventStreamStop(stream_);
            FSEventStreamInvalidate(stream_);
            FSEventStreamRelease(stream_);
            stream_ = nullptr;
        }
        dispatch_sync(queue_, ^{
                      });  // wait for a running callback to finish
        dispatch_release(queue_);
    }

private:
    static void callback(ConstFSEventStreamRef, void* info, size_t count, void* event_paths,
                         const FSEventStreamEventFlags flags[], const FSEventStreamEventId[]) {
        auto* self = static_cast<MacWatcher*>(info);
        if (self->stopped_) return;
        auto* paths = static_cast<CFArrayRef>(event_paths);
        for (size_t i = 0; i < count; ++i) {
            const FSEventStreamEventFlags f = flags[i];
            if (f & (kFSEventStreamEventFlagMustScanSubDirs | kFSEventStreamEventFlagUserDropped |
                     kFSEventStreamEventFlagKernelDropped)) {
                self->sink_.raw(Change::Kind::Rescan, "");
                continue;
            }
            auto* cf = static_cast<CFStringRef>(CFArrayGetValueAtIndex(paths, static_cast<CFIndex>(i)));
            char buf[4096];
            if (!CFStringGetCString(cf, buf, sizeof(buf), kCFStringEncodingUTF8)) continue;
            std::error_code ec;
            const std::string rel = std::filesystem::path(buf).lexically_relative(self->root_).generic_string();
            if (rel.empty() || rel.rfind("..", 0) == 0) continue;
            if (f & kFSEventStreamEventFlagItemIsDir) {
                if (f & (kFSEventStreamEventFlagItemCreated | kFSEventStreamEventFlagItemRenamed)) {
                    self->sink_.raw(Change::Kind::Rescan, "");
                }
                continue;
            }
            const bool exists = std::filesystem::exists(buf, ec);
            if (!exists) {
                self->sink_.raw(Change::Kind::Deleted, rel);
            } else if (f & kFSEventStreamEventFlagItemCreated) {
                self->sink_.raw(Change::Kind::Created, rel);
            } else {
                self->sink_.raw(Change::Kind::Modified, rel);
            }
        }
    }

    std::string root_;
    Sink& sink_;
    dispatch_queue_t queue_ = nullptr;
    FSEventStreamRef stream_ = nullptr;
    std::atomic<bool> stopped_{false};
};

}  // namespace

std::unique_ptr<Watcher> start_platform_watcher(const std::string& root, Sink& sink) {
    std::error_code ec;
    const std::string canonical = std::filesystem::weakly_canonical(root, ec).string();  // FSEvents reports real paths
    auto watcher = std::make_unique<MacWatcher>(ec ? root : canonical, sink);
    if (!watcher->start()) return nullptr;
    return watcher;
}

}  // namespace pv::fswatch::detail
#endif
