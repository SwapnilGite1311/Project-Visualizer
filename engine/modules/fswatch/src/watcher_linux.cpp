#ifdef __linux__
#include <poll.h>
#include <sys/inotify.h>
#include <unistd.h>

#include <atomic>
#include <cerrno>
#include <filesystem>
#include <map>
#include <mutex>
#include <string>
#include <system_error>
#include <thread>
#include <vector>

#include "pv/fswatch/fswatch.hpp"

namespace pv::fswatch::detail {

namespace {

constexpr uint32_t kMask = IN_CLOSE_WRITE | IN_MODIFY | IN_CREATE | IN_DELETE | IN_MOVED_FROM | IN_MOVED_TO |
                           IN_DELETE_SELF | IN_ONLYDIR;

class LinuxWatcher : public Watcher {
public:
    LinuxWatcher(int fd, std::string root, Sink& sink) : fd_(fd), root_(std::move(root)), sink_(sink) {
        if (pipe(stop_pipe_) != 0) stop_pipe_[0] = stop_pipe_[1] = -1;
    }
    ~LinuxWatcher() override { stop(); }

    // Adds a watch for `rel_dir` and every directory below it. Returns false when the kernel limit is reached.
    bool add_tree(const std::string& rel_dir) {
        const std::filesystem::path base = rel_dir.empty() ? std::filesystem::path(root_) : std::filesystem::path(root_) / rel_dir;
        if (!add_one(base, rel_dir)) return false;
        std::error_code ec;
        for (auto it = std::filesystem::recursive_directory_iterator(
                 base, std::filesystem::directory_options::skip_permission_denied, ec);
             it != std::filesystem::recursive_directory_iterator(); it.increment(ec)) {
            if (ec) break;
            if (!it->is_directory(ec) || it->is_symlink(ec)) continue;
            const std::string rel = std::filesystem::relative(it->path(), root_, ec).generic_string();
            if (rel == ".git" || rel.find("/.git") != std::string::npos || rel.find("node_modules") != std::string::npos) {
                it.disable_recursion_pending();
                continue;
            }
            if (!add_one(it->path(), rel)) return false;
        }
        return true;
    }

    void start() { thread_ = std::thread([this] { loop(); }); }

    void stop() override {
        if (stopped_.exchange(true)) return;
        if (stop_pipe_[1] >= 0) {
            const char c = 1;
            (void)!write(stop_pipe_[1], &c, 1);
        }
        if (thread_.joinable()) thread_.join();
        close(fd_);
        if (stop_pipe_[0] >= 0) close(stop_pipe_[0]);
        if (stop_pipe_[1] >= 0) close(stop_pipe_[1]);
    }

private:
    bool add_one(const std::filesystem::path& abs, const std::string& rel) {
        const int wd = inotify_add_watch(fd_, abs.c_str(), kMask);
        if (wd < 0) return errno != ENOSPC;  // ENOSPC = user watch limit reached
        std::lock_guard<std::mutex> lock(m_);
        dirs_[wd] = rel;
        return true;
    }

    void loop() {
        std::vector<char> buf(64 * 1024);
        while (!stopped_) {
            pollfd fds[2] = {{fd_, POLLIN, 0}, {stop_pipe_[0], POLLIN, 0}};
            if (poll(fds, stop_pipe_[0] >= 0 ? 2 : 1, 500) <= 0) continue;
            if (fds[1].revents & POLLIN) return;
            const ssize_t n = read(fd_, buf.data(), buf.size());
            if (n <= 0) continue;
            for (ssize_t off = 0; off < n;) {
                const auto* ev = reinterpret_cast<const inotify_event*>(buf.data() + off);
                off += static_cast<ssize_t>(sizeof(inotify_event) + ev->len);
                if (ev->mask & IN_Q_OVERFLOW) {
                    sink_.raw(Change::Kind::Rescan, "");
                    continue;
                }
                std::string dir;
                {
                    std::lock_guard<std::mutex> lock(m_);
                    const auto it = dirs_.find(ev->wd);
                    if (it == dirs_.end()) continue;
                    dir = it->second;
                    if (ev->mask & IN_IGNORED) {
                        dirs_.erase(it);
                        continue;
                    }
                }
                const std::string name = ev->len > 0 ? std::string(ev->name) : std::string();
                const std::string rel = dir.empty() ? name : (name.empty() ? dir : dir + "/" + name);
                if (ev->mask & IN_ISDIR) {
                    if (ev->mask & (IN_CREATE | IN_MOVED_TO)) {
                        add_tree(rel);
                        sink_.raw(Change::Kind::Rescan, "");  // files may exist before the watch was added
                    } else if (ev->mask & (IN_DELETE | IN_MOVED_FROM)) {
                        sink_.raw(Change::Kind::Deleted, rel);
                    }
                    continue;
                }
                if (ev->mask & (IN_DELETE | IN_MOVED_FROM)) {
                    sink_.raw(Change::Kind::Deleted, rel);
                } else if (ev->mask & (IN_CREATE | IN_MOVED_TO)) {
                    sink_.raw(Change::Kind::Created, rel);
                } else if (ev->mask & (IN_CLOSE_WRITE | IN_MODIFY)) {
                    sink_.raw(Change::Kind::Modified, rel);
                }
            }
        }
    }

    int fd_;
    std::string root_;
    Sink& sink_;
    int stop_pipe_[2] = {-1, -1};
    std::mutex m_;
    std::map<int, std::string> dirs_;
    std::atomic<bool> stopped_{false};
    std::thread thread_;
};

}  // namespace

std::unique_ptr<Watcher> start_platform_watcher(const std::string& root, Sink& sink) {
    const int fd = inotify_init1(IN_NONBLOCK | IN_CLOEXEC);
    if (fd < 0) return nullptr;
    auto watcher = std::make_unique<LinuxWatcher>(fd, root, sink);
    if (!watcher->add_tree("")) return nullptr;  // destructor closes the descriptor
    watcher->start();
    return watcher;
}

}  // namespace pv::fswatch::detail
#endif
