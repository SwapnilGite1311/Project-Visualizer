#ifndef _WIN32
#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <poll.h>
#include <pwd.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <unistd.h>

#include <algorithm>
#include <atomic>
#include <cerrno>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <mutex>
#include <stdexcept>
#include <string>

#include "pv/ipc/listeners.hpp"

namespace pv::ipc {

namespace {

class FdStream : public rpc::ByteStream {
public:
    explicit FdStream(int fd) : fd_(fd) {}
    ~FdStream() override {
        close();
        ::close(fd_);
    }
    std::size_t read_some(char* buf, std::size_t n) override {
        while (!closed_) {
            const ssize_t got = ::recv(fd_, buf, n, 0);
            if (got > 0) return static_cast<std::size_t>(got);
            if (got < 0 && errno == EINTR) continue;
            return 0;
        }
        return 0;
    }
    void write_all(const char* data, std::size_t n) override {
        std::lock_guard<std::mutex> lock(write_mutex_);
        while (n > 0) {
            if (closed_) throw std::runtime_error("socket closed");
#ifdef MSG_NOSIGNAL
            const ssize_t put = ::send(fd_, data, n, MSG_NOSIGNAL);
#else
            const ssize_t put = ::send(fd_, data, n, 0);
#endif
            if (put < 0 && errno == EINTR) continue;
            if (put <= 0) throw std::runtime_error("socket write failed");
            data += put;
            n -= static_cast<std::size_t>(put);
        }
    }
    void close() override {
        if (closed_.exchange(true)) return;
        ::shutdown(fd_, SHUT_RDWR);  // unblocks recv in the reader thread
    }

private:
    int fd_;
    std::mutex write_mutex_;
    std::atomic<bool> closed_{false};
};

// accept() waits with poll() on the listening socket and a self-pipe, so close() always unblocks it.
class FdListener : public Listener {
public:
    FdListener(int fd, std::string unlink_path) : fd_(fd), unlink_path_(std::move(unlink_path)) {
        if (pipe(stop_) != 0) stop_[0] = stop_[1] = -1;
    }
    ~FdListener() override {
        close();
        ::close(fd_);
        if (stop_[0] >= 0) ::close(stop_[0]);
        if (stop_[1] >= 0) ::close(stop_[1]);
        if (!unlink_path_.empty()) ::unlink(unlink_path_.c_str());
    }
    std::unique_ptr<rpc::ByteStream> accept() override {
        while (!closed_) {
            pollfd fds[2] = {{fd_, POLLIN, 0}, {stop_[0], POLLIN, 0}};
            const int r = ::poll(fds, stop_[0] >= 0 ? 2 : 1, 500);
            if (r < 0 && errno != EINTR) return nullptr;
            if (r <= 0) continue;
            if (fds[1].revents & POLLIN) return nullptr;
            if (!(fds[0].revents & POLLIN)) continue;
            const int c = ::accept(fd_, nullptr, nullptr);
            if (c < 0) continue;
#ifdef SO_NOSIGPIPE
            const int one = 1;
            setsockopt(c, SOL_SOCKET, SO_NOSIGPIPE, &one, sizeof(one));
#endif
            return std::make_unique<FdStream>(c);
        }
        return nullptr;
    }
    void close() override {
        if (closed_.exchange(true)) return;
        if (stop_[1] >= 0) {
            const char c = 1;
            (void)!::write(stop_[1], &c, 1);
        }
    }

private:
    int fd_;
    std::string unlink_path_;
    int stop_[2] = {-1, -1};
    std::atomic<bool> closed_{false};
};

std::string temp_dir() {
    const char* t = std::getenv("TMPDIR");
    std::string dir = (t && *t) ? t : "/tmp";
    while (dir.size() > 1 && dir.back() == '/') dir.pop_back();
    return dir;
}

bool fill_unix_addr(const std::string& path, sockaddr_un& addr) {
    std::memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    if (path.size() >= sizeof(addr.sun_path)) return false;
    std::memcpy(addr.sun_path, path.c_str(), path.size() + 1);
    return true;
}

}  // namespace

std::string pipe_path(const std::string& name_or_path) {
    if (!name_or_path.empty() && name_or_path.front() == '/') return name_or_path;
    return temp_dir() + "/" + name_or_path + ".sock";
}

std::unique_ptr<Listener> listen_pipe(const std::string& name_or_path) {
    const std::string path = pipe_path(name_or_path);
    sockaddr_un addr;
    if (!fill_unix_addr(path, addr)) return nullptr;
    // A live engine answers on the socket; a stale file from a crashed engine is removed.
    if (auto probe = connect_pipe(path)) return nullptr;
    ::unlink(path.c_str());
    const int fd = ::socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return nullptr;
    const mode_t old = ::umask(0177);  // the socket file is created with mode 0600
    const bool ok = ::bind(fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == 0;
    ::umask(old);
    if (!ok || ::listen(fd, SOMAXCONN) != 0) {
        ::close(fd);
        return nullptr;
    }
    ::chmod(path.c_str(), 0600);
    return std::make_unique<FdListener>(fd, path);
}

std::unique_ptr<Listener> listen_tcp(int first_port, int tries, int& chosen_port) {
    chosen_port = 0;
    for (int i = 0; i < std::max(tries, 1); ++i) {
        const int port = first_port == 0 ? 0 : first_port + i;
        const int fd = ::socket(AF_INET, SOCK_STREAM, 0);
        if (fd < 0) return nullptr;
        const int one = 1;
        setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));
        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        addr.sin_port = htons(static_cast<uint16_t>(port));
        if (::bind(fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == 0 && ::listen(fd, SOMAXCONN) == 0) {
            sockaddr_in bound{};
            socklen_t len = sizeof(bound);
            ::getsockname(fd, reinterpret_cast<sockaddr*>(&bound), &len);
            chosen_port = ntohs(bound.sin_port);
            return std::make_unique<FdListener>(fd, "");
        }
        ::close(fd);
        if (first_port == 0) break;
    }
    return nullptr;
}

std::unique_ptr<rpc::ByteStream> connect_pipe(const std::string& name_or_path) {
    sockaddr_un addr;
    if (!fill_unix_addr(pipe_path(name_or_path), addr)) return nullptr;
    const int fd = ::socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return nullptr;
    if (::connect(fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
        ::close(fd);
        return nullptr;
    }
    return std::make_unique<FdStream>(fd);
}

std::unique_ptr<rpc::ByteStream> connect_tcp(int port) {
    const int fd = ::socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return nullptr;
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(static_cast<uint16_t>(port));
    if (::connect(fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
        ::close(fd);
        return nullptr;
    }
    return std::make_unique<FdStream>(fd);
}

std::string current_user_name() {
    std::string name;
    if (const passwd* pw = ::getpwuid(::getuid())) name = pw->pw_name ? pw->pw_name : "";
    std::string out;
    for (const char c : name) {
        const bool ok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_';
        out += ok ? c : '_';
    }
    return out.empty() ? "user" : out;
}

}  // namespace pv::ipc
#endif
