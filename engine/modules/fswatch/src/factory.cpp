#include <chrono>
#include <condition_variable>
#include <map>
#include <mutex>
#include <thread>

#include "pv/fs/fs.hpp"
#include "pv/fswatch/fswatch.hpp"

namespace pv::fswatch {

namespace {

using Clock = std::chrono::steady_clock;

class DebouncedWatcher : public Watcher, public detail::Sink {
public:
    DebouncedWatcher(const std::vector<std::string>& excludes, ChangeCallback cb, int debounce_ms)
        : excludes_(excludes), cb_(std::move(cb)), debounce_(std::chrono::milliseconds(debounce_ms)) {
        thread_ = std::thread([this] { loop(); });
    }
    ~DebouncedWatcher() override { stop(); }

    void attach(std::unique_ptr<Watcher> platform) { platform_ = std::move(platform); }

    void raw(Change::Kind kind, const std::string& rel_path) override {
        if (kind != Change::Kind::Rescan && (rel_path.empty() || excludes_.matches(rel_path))) return;
        std::lock_guard<std::mutex> lock(m_);
        if (kind == Change::Kind::Rescan) {
            rescan_ = true;
        } else {
            auto it = pending_.find(rel_path);
            // created then modified is still "created"; created then deleted is dropped by the consumer's hash check
            if (it != pending_.end() && it->second == Change::Kind::Created && kind == Change::Kind::Modified) {
                // keep Created
            } else {
                pending_[rel_path] = kind;
            }
        }
        last_ = Clock::now();
        cv_.notify_all();
    }

    void stop() override {
        {
            std::lock_guard<std::mutex> lock(m_);
            if (stopped_) return;
            stopped_ = true;
        }
        if (platform_) platform_->stop();  // no more raw() calls after this
        cv_.notify_all();
        if (thread_.joinable()) thread_.join();
    }

private:
    void loop() {
        std::unique_lock<std::mutex> lock(m_);
        while (!stopped_) {
            if (pending_.empty() && !rescan_) {
                cv_.wait(lock, [&] { return stopped_ || !pending_.empty() || rescan_; });
                continue;
            }
            const auto due = last_ + debounce_;
            if (Clock::now() < due) {
                cv_.wait_until(lock, due);
                continue;
            }
            std::vector<Change> batch;
            if (rescan_) batch.push_back(Change{Change::Kind::Rescan, ""});
            for (const auto& [path, kind] : pending_) batch.push_back(Change{kind, path});
            pending_.clear();
            rescan_ = false;
            lock.unlock();
            try {
                cb_(std::move(batch));
            } catch (...) {
                // a failing consumer must not kill the watcher
            }
            lock.lock();
        }
    }

    fs::GlobSet excludes_;
    ChangeCallback cb_;
    std::chrono::milliseconds debounce_;
    std::unique_ptr<Watcher> platform_;
    std::mutex m_;
    std::condition_variable cv_;
    std::map<std::string, Change::Kind> pending_;
    bool rescan_ = false;
    bool stopped_ = false;
    Clock::time_point last_ = Clock::now();
    std::thread thread_;
};

std::vector<std::string> all_excludes(const std::vector<std::string>& extra) {
    std::vector<std::string> out = fs::default_excludes();
    out.insert(out.end(), extra.begin(), extra.end());
    return out;
}

}  // namespace

std::unique_ptr<Watcher> create_watcher(const std::string& root, const std::vector<std::string>& exclude_globs,
                                        ChangeCallback on_changes, int debounce_ms) {
    auto watcher = std::make_unique<DebouncedWatcher>(all_excludes(exclude_globs), std::move(on_changes), debounce_ms);
    auto platform = detail::start_platform_watcher(root, *watcher);
    if (!platform) {
        watcher->stop();
        return nullptr;
    }
    watcher->attach(std::move(platform));
    return watcher;
}

#if !defined(_WIN32) && !defined(__linux__) && !defined(__APPLE__)
namespace detail {
std::unique_ptr<Watcher> start_platform_watcher(const std::string&, Sink&) {
    return nullptr;  // no native watcher on this platform: callers poll
}
}  // namespace detail
#endif

}  // namespace pv::fswatch
