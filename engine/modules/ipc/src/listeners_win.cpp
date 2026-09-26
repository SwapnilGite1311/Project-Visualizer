#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <sddl.h>

#include <algorithm>
#include <atomic>
#include <mutex>
#include <stdexcept>
#include <string>

#include "pv/ipc/listeners.hpp"

namespace pv::ipc {

namespace {

std::wstring widen(const std::string& s) {
    if (s.empty()) return {};
    const int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), nullptr, 0);
    std::wstring out(static_cast<std::size_t>(n), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), out.data(), n);
    return out;
}

// ---------------------------------------------------------------- named pipes (overlapped I/O)

class PipeStream : public rpc::ByteStream {
public:
    PipeStream(HANDLE h, bool server_side) : h_(h), server_side_(server_side) {
        read_event_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        write_event_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        close_event_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    }
    ~PipeStream() override {
        close();
        CloseHandle(read_event_);
        CloseHandle(write_event_);
        CloseHandle(close_event_);
    }
    std::size_t read_some(char* buf, std::size_t n) override {
        std::lock_guard<std::mutex> lock(read_mutex_);
        if (closed_) return 0;
        OVERLAPPED ov{};
        ov.hEvent = read_event_;
        ResetEvent(read_event_);
        DWORD got = 0;
        if (ReadFile(h_, buf, static_cast<DWORD>(n), &got, &ov)) return got;
        if (GetLastError() != ERROR_IO_PENDING) return 0;  // broken pipe = the peer closed
        HANDLE handles[2] = {read_event_, close_event_};
        if (WaitForMultipleObjects(2, handles, FALSE, INFINITE) != WAIT_OBJECT_0) {
            CancelIoEx(h_, &ov);
            GetOverlappedResult(h_, &ov, &got, TRUE);
            return 0;
        }
        if (!GetOverlappedResult(h_, &ov, &got, FALSE)) return 0;
        return got;
    }
    void write_all(const char* data, std::size_t n) override {
        std::lock_guard<std::mutex> lock(write_mutex_);
        while (n > 0) {
            if (closed_) throw std::runtime_error("pipe closed");
            OVERLAPPED ov{};
            ov.hEvent = write_event_;
            ResetEvent(write_event_);
            DWORD put = 0;
            if (!WriteFile(h_, data, static_cast<DWORD>(n), &put, &ov)) {
                if (GetLastError() != ERROR_IO_PENDING) throw std::runtime_error("pipe write failed");
                if (!GetOverlappedResult(h_, &ov, &put, TRUE)) throw std::runtime_error("pipe write failed");
            }
            data += put;
            n -= put;
        }
    }
    // Stops pending I/O, waits for the reader and writer to leave, then disconnects so the peer sees end-of-stream.
    void close() override {
        if (closed_.exchange(true)) return;
        SetEvent(close_event_);
        CancelIoEx(h_, nullptr);
        std::lock_guard<std::mutex> r(read_mutex_);
        std::lock_guard<std::mutex> w(write_mutex_);
        if (server_side_) DisconnectNamedPipe(h_);
        CloseHandle(h_);
        h_ = INVALID_HANDLE_VALUE;
    }

private:
    HANDLE h_;
    bool server_side_;
    HANDLE read_event_, write_event_, close_event_;
    std::mutex read_mutex_, write_mutex_;
    std::atomic<bool> closed_{false};
};

// A security descriptor that gives the current user (and nobody else) full access.
class UserOnlySecurity {
public:
    UserOnlySecurity() {
        HANDLE token = nullptr;
        if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) return;
        DWORD size = 0;
        GetTokenInformation(token, TokenUser, nullptr, 0, &size);
        std::string buffer(size, '\0');
        if (GetTokenInformation(token, TokenUser, buffer.data(), size, &size)) {
            auto* user = reinterpret_cast<TOKEN_USER*>(buffer.data());
            LPWSTR sid = nullptr;
            if (ConvertSidToStringSidW(user->User.Sid, &sid)) {
                const std::wstring sddl = L"D:P(A;;GA;;;" + std::wstring(sid) + L")";
                ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl.c_str(), SDDL_REVISION_1, &sd_, nullptr);
                LocalFree(sid);
            }
        }
        CloseHandle(token);
        attrs_.nLength = sizeof(attrs_);
        attrs_.lpSecurityDescriptor = sd_;
        attrs_.bInheritHandle = FALSE;
    }
    ~UserOnlySecurity() {
        if (sd_) LocalFree(sd_);
    }
    SECURITY_ATTRIBUTES* get() { return sd_ ? &attrs_ : nullptr; }

private:
    PSECURITY_DESCRIPTOR sd_ = nullptr;
    SECURITY_ATTRIBUTES attrs_{};
};

class PipeListener : public Listener {
public:
    explicit PipeListener(std::wstring path) : path_(std::move(path)) { stop_event_ = CreateEventW(nullptr, TRUE, FALSE, nullptr); }
    ~PipeListener() override {
        close();
        CloseHandle(stop_event_);
        if (next_ != INVALID_HANDLE_VALUE) CloseHandle(next_);
    }

    // Creates the first instance up front so a name clash is detected before we report "listening".
    bool open() {
        next_ = create_instance(true);
        return next_ != INVALID_HANDLE_VALUE;
    }

    std::unique_ptr<rpc::ByteStream> accept() override {
        if (closed_) return nullptr;
        HANDLE h = next_;
        next_ = INVALID_HANDLE_VALUE;
        if (h == INVALID_HANDLE_VALUE) h = create_instance(false);
        if (h == INVALID_HANDLE_VALUE) return nullptr;
        OVERLAPPED ov{};
        ov.hEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        bool connected = ConnectNamedPipe(h, &ov) != 0;
        if (!connected) {
            const DWORD err = GetLastError();
            if (err == ERROR_PIPE_CONNECTED) {
                connected = true;
            } else if (err == ERROR_IO_PENDING) {
                HANDLE handles[2] = {ov.hEvent, stop_event_};
                if (WaitForMultipleObjects(2, handles, FALSE, INFINITE) == WAIT_OBJECT_0) {
                    DWORD ignored = 0;
                    connected = GetOverlappedResult(h, &ov, &ignored, FALSE) != 0;
                } else {
                    CancelIoEx(h, &ov);
                    DWORD ignored = 0;
                    GetOverlappedResult(h, &ov, &ignored, TRUE);
                }
            }
        }
        CloseHandle(ov.hEvent);
        if (!connected) {
            CloseHandle(h);
            return nullptr;
        }
        return std::make_unique<PipeStream>(h, true);
    }

    void close() override {
        if (closed_.exchange(true)) return;
        SetEvent(stop_event_);
    }

private:
    HANDLE create_instance(bool first) {
        DWORD open_mode = PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED;
        if (first) open_mode |= FILE_FLAG_FIRST_PIPE_INSTANCE;  // fails when another engine already uses the name
        return CreateNamedPipeW(path_.c_str(), open_mode, PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                                PIPE_UNLIMITED_INSTANCES, 64 * 1024, 64 * 1024, 0, security_.get());
    }

    std::wstring path_;
    UserOnlySecurity security_;
    HANDLE stop_event_;
    HANDLE next_ = INVALID_HANDLE_VALUE;
    std::atomic<bool> closed_{false};
};

// ---------------------------------------------------------------- TCP (Winsock)

struct WinsockInit {
    WinsockInit() {
        WSADATA data;
        WSAStartup(MAKEWORD(2, 2), &data);
    }
};

void ensure_winsock() {
    static WinsockInit init;
}

class SocketStream : public rpc::ByteStream {
public:
    explicit SocketStream(SOCKET s) : s_(s) {}
    ~SocketStream() override {
        close();
        closesocket(s_);
    }
    // Waits in short select() steps: on Windows a thread blocked in recv() is not woken by shutdown() from another thread.
    std::size_t read_some(char* buf, std::size_t n) override {
        while (!closed_) {
            fd_set readable;
            FD_ZERO(&readable);
            FD_SET(s_, &readable);
            timeval wait{0, 200 * 1000};
            const int ready = select(0, &readable, nullptr, nullptr, &wait);
            if (ready < 0) return 0;
            if (ready == 0) continue;
            const int got = recv(s_, buf, static_cast<int>(n), 0);
            return got > 0 ? static_cast<std::size_t>(got) : 0;
        }
        return 0;
    }
    void write_all(const char* data, std::size_t n) override {
        std::lock_guard<std::mutex> lock(write_mutex_);
        while (n > 0) {
            if (closed_) throw std::runtime_error("socket closed");
            const int put = send(s_, data, static_cast<int>(n), 0);
            if (put <= 0) throw std::runtime_error("socket write failed");
            data += put;
            n -= static_cast<std::size_t>(put);
        }
    }
    void close() override {
        if (closed_.exchange(true)) return;
        shutdown(s_, SD_BOTH);  // unblocks recv in the reader thread
    }

private:
    SOCKET s_;
    std::mutex write_mutex_;
    std::atomic<bool> closed_{false};
};

class TcpListener : public Listener {
public:
    explicit TcpListener(SOCKET s) : s_(s) {}
    ~TcpListener() override { close(); }
    std::unique_ptr<rpc::ByteStream> accept() override {
        if (closed_) return nullptr;
        const SOCKET c = ::accept(s_, nullptr, nullptr);
        if (c == INVALID_SOCKET) return nullptr;
        if (closed_) {
            closesocket(c);
            return nullptr;
        }
        const BOOL on = TRUE;
        setsockopt(c, IPPROTO_TCP, TCP_NODELAY, reinterpret_cast<const char*>(&on), sizeof(on));
        return std::make_unique<SocketStream>(c);
    }
    void close() override {
        if (closed_.exchange(true)) return;
        closesocket(s_);  // makes a blocked accept() fail
    }

private:
    SOCKET s_;
    std::atomic<bool> closed_{false};
};

}  // namespace

std::string pipe_path(const std::string& name_or_path) {
    if (name_or_path.rfind("\\\\.\\pipe\\", 0) == 0) return name_or_path;
    return "\\\\.\\pipe\\" + name_or_path;
}

std::unique_ptr<Listener> listen_pipe(const std::string& name_or_path) {
    auto listener = std::make_unique<PipeListener>(widen(pipe_path(name_or_path)));
    if (!listener->open()) return nullptr;
    return listener;
}

std::unique_ptr<Listener> listen_tcp(int first_port, int tries, int& chosen_port) {
    ensure_winsock();
    chosen_port = 0;
    for (int i = 0; i < std::max(tries, 1); ++i) {
        const int port = first_port == 0 ? 0 : first_port + i;
        SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (s == INVALID_SOCKET) return nullptr;
        const BOOL exclusive = TRUE;  // no other process may bind the same port while we use it
        setsockopt(s, SOL_SOCKET, SO_EXCLUSIVEADDRUSE, reinterpret_cast<const char*>(&exclusive), sizeof(exclusive));
        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        addr.sin_port = htons(static_cast<u_short>(port));
        if (bind(s, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == 0 && listen(s, SOMAXCONN) == 0) {
            sockaddr_in bound{};
            int len = sizeof(bound);
            getsockname(s, reinterpret_cast<sockaddr*>(&bound), &len);
            chosen_port = ntohs(bound.sin_port);
            return std::make_unique<TcpListener>(s);
        }
        closesocket(s);
        if (first_port == 0) break;
    }
    return nullptr;
}

std::unique_ptr<rpc::ByteStream> connect_pipe(const std::string& name_or_path) {
    const std::wstring path = widen(pipe_path(name_or_path));
    for (int attempt = 0; attempt < 50; ++attempt) {
        HANDLE h = CreateFileW(path.c_str(), GENERIC_READ | GENERIC_WRITE, 0, nullptr, OPEN_EXISTING, FILE_FLAG_OVERLAPPED, nullptr);
        if (h != INVALID_HANDLE_VALUE) return std::make_unique<PipeStream>(h, false);
        if (GetLastError() != ERROR_PIPE_BUSY) return nullptr;
        WaitNamedPipeW(path.c_str(), 100);
    }
    return nullptr;
}

std::unique_ptr<rpc::ByteStream> connect_tcp(int port) {
    ensure_winsock();
    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) return nullptr;
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(static_cast<u_short>(port));
    if (connect(s, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) != 0) {
        closesocket(s);
        return nullptr;
    }
    return std::make_unique<SocketStream>(s);
}

std::string current_user_name() {
    wchar_t buf[256];
    DWORD n = 256;
    std::string out;
    if (GetUserNameW(buf, &n)) {
        for (DWORD i = 0; i + 1 < n; ++i) {
            const wchar_t c = buf[i];
            const bool ok = (c >= L'a' && c <= L'z') || (c >= L'A' && c <= L'Z') || (c >= L'0' && c <= L'9') || c == L'-' || c == L'_';
            out += ok ? static_cast<char>(c) : '_';
        }
    }
    return out.empty() ? "user" : out;
}

}  // namespace pv::ipc
#endif
