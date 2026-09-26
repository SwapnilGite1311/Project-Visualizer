#pragma once
#include <atomic>
#include <condition_variable>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <vector>

#include "pv/ipc/engine_info.hpp"
#include "pv/ipc/listeners.hpp"
#include "pv/rpc/connection.hpp"
#include "pv/session/registry.hpp"

namespace pv::ipc {

struct ServeOptions {
    std::string pipe;        // name or full path; empty = "pv-engine-<user>"
    int tcp_port = 7700;     // 0 = no TCP, -1 = any free port (tests)
    int tcp_tries = 10;      // 7700 … 7709
    int parent_pid = 0;      // stop when this process ends (checked every 2 s)
    bool stdio = false;      // also serve stdin/stdout
    bool write_info = true;  // write ~/.project-visualizer/engine.json
};

struct ClientInfo {
    int client_id = 0;
    std::string client;     // desktop | vscode | tool
    std::string transport;  // stdio | pipe | tcp
};

// `pv-engine serve`: one engine, several local clients (R9 "Local server mode").
class LocalServer {
public:
    void attach(session::Registry& reg);
    int run(const ServeOptions& options);  // blocks until stop(); 0 = clean stop, 1 = could not listen
    void stop();                           // thread-safe and non-blocking (may be called from a request handler)
    bool running() const { return running_; }

    std::vector<ClientInfo> clients() const;
    EngineInfo info() const;
    // Sends a notification to connected clients except `except_client`; only those of kind `only_kind` when not empty.
    int broadcast(const std::string& method, const nlohmann::json& params, int except_client, const std::string& only_kind);
    nlohmann::json hello(const nlohmann::json& params);  // for the calling client
    static int current_client();                           // id of the client whose request runs on this thread (0 = none)

private:
    struct Client {
        int id = 0;
        std::string kind;
        std::string transport;
        bool authed = false;
        int fanout_id = 0;
        std::shared_ptr<rpc::Connection> conn;
        std::thread thread;
        std::atomic<bool> done{false};
    };
    void add_client(std::unique_ptr<rpc::ByteStream> stream, const std::string& transport);
    std::optional<nlohmann::json> gate(Client& client, const nlohmann::json& request);
    void reap(bool all);

    session::Registry* reg_ = nullptr;
    std::mutex dispatch_mutex_;
    mutable std::mutex mutex_;
    std::condition_variable cv_;
    std::map<int, std::shared_ptr<Client>> clients_;
    std::vector<std::unique_ptr<Listener>> listeners_;
    std::vector<std::thread> accept_threads_;
    EngineInfo info_;
    int next_id_ = 1;
    std::atomic<bool> stop_{false};
    std::atomic<bool> running_{false};
};

LocalServer& server();

}  // namespace pv::ipc
