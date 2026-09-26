#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>

#include <atomic>
#include <filesystem>
#include <string>
#include <thread>
#include <vector>

#include "pv/fswatch/fswatch.hpp"

namespace pv::fswatch::detail {

namespace {

std::filesystem::path from_utf8(const std::string& s) {
    return std::filesystem::path(std::u8string(reinterpret_cast<const char8_t*>(s.data()), s.size()));
}

std::string to_utf8(const wchar_t* w, int chars) {
    if (chars <= 0) return {};
    const int n = WideCharToMultiByte(CP_UTF8, 0, w, chars, nullptr, 0, nullptr, nullptr);
    std::string out(static_cast<std::size_t>(n), '\0');
    WideCharToMultiByte(CP_UTF8, 0, w, chars, out.data(), n, nullptr, nullptr);
    for (char& c : out) {
        if (c == '\\') c = '/';
    }
    return out;
}

class WinWatcher : public Watcher {
public:
    WinWatcher(HANDLE dir, std::filesystem::path root, Sink& sink) : dir_(dir), root_(std::move(root)), sink_(sink) {
        io_event_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        stop_event_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        thread_ = std::thread([this] { loop(); });
    }
    ~WinWatcher() override { stop(); }

    void stop() override {
        if (stopped_.exchange(true)) return;
        SetEvent(stop_event_);
        if (thread_.joinable()) thread_.join();
        CloseHandle(dir_);
        CloseHandle(io_event_);
        CloseHandle(stop_event_);
    }

private:
    void loop() {
        std::vector<DWORD> buffer(64 * 1024 / sizeof(DWORD));  // DWORD-aligned, as the API requires
        const DWORD filter = FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_DIR_NAME | FILE_NOTIFY_CHANGE_LAST_WRITE |
                             FILE_NOTIFY_CHANGE_SIZE;
        while (true) {
            OVERLAPPED ov{};
            ov.hEvent = io_event_;
            ResetEvent(io_event_);
            const DWORD bytes_size = static_cast<DWORD>(buffer.size() * sizeof(DWORD));
            if (!ReadDirectoryChangesW(dir_, buffer.data(), bytes_size, TRUE, filter, nullptr, &ov, nullptr)) {
                sink_.raw(Change::Kind::Rescan, "");
                return;  // the folder is gone or not accessible
            }
            HANDLE handles[2] = {io_event_, stop_event_};
            const DWORD which = WaitForMultipleObjects(2, handles, FALSE, INFINITE);
            if (which != WAIT_OBJECT_0) {
                CancelIoEx(dir_, &ov);
                DWORD ignored = 0;
                GetOverlappedResult(dir_, &ov, &ignored, TRUE);
                return;
            }
            DWORD got = 0;
            if (!GetOverlappedResult(dir_, &ov, &got, FALSE) || got == 0) {
                sink_.raw(Change::Kind::Rescan, "");  // buffer overflow (ERROR_NOTIFY_ENUM_DIR) or error
                continue;
            }
            const char* p = reinterpret_cast<const char*>(buffer.data());
            while (true) {
                const auto* info = reinterpret_cast<const FILE_NOTIFY_INFORMATION*>(p);
                const std::string rel = to_utf8(info->FileName, static_cast<int>(info->FileNameLength / sizeof(wchar_t)));
                switch (info->Action) {
                    case FILE_ACTION_ADDED:
                    case FILE_ACTION_RENAMED_NEW_NAME:
                        // A new or renamed-in folder brings files without their own events.
                        if (std::filesystem::is_directory(root_ / from_utf8(rel))) {
                            sink_.raw(Change::Kind::Rescan, "");
                        } else {
                            sink_.raw(Change::Kind::Created, rel);
                        }
                        break;
                    case FILE_ACTION_REMOVED:
                    case FILE_ACTION_RENAMED_OLD_NAME:
                        sink_.raw(Change::Kind::Deleted, rel);
                        break;
                    default:
                        if (!std::filesystem::is_directory(root_ / from_utf8(rel))) {
                            sink_.raw(Change::Kind::Modified, rel);
                        }
                        break;
                }
                if (info->NextEntryOffset == 0) break;
                p += info->NextEntryOffset;
            }
        }
    }

    HANDLE dir_;
    std::filesystem::path root_;
    Sink& sink_;
    HANDLE io_event_ = nullptr;
    HANDLE stop_event_ = nullptr;
    std::atomic<bool> stopped_{false};
    std::thread thread_;
};

}  // namespace

std::unique_ptr<Watcher> start_platform_watcher(const std::string& root, Sink& sink) {
    const std::filesystem::path path = from_utf8(root);
    HANDLE dir = CreateFileW(path.wstring().c_str(), FILE_LIST_DIRECTORY,
                             FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr, OPEN_EXISTING,
                             FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, nullptr);
    if (dir == INVALID_HANDLE_VALUE) return nullptr;
    return std::make_unique<WinWatcher>(dir, path, sink);
}

}  // namespace pv::fswatch::detail
#endif
