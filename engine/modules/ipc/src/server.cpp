#include "pv/ipc/server.hpp"

#ifdef _WIN32
#include <io.h>
#else
#include <unistd.h>
#endif

#include <chrono>
#include <cstdio>

#include "pv/core/error.hpp"
#include "pv/core/log.hpp"
#include "pv/core/version.hpp"
#include "pv/rpc/fanout.hpp"

namespace pv::ipc {

namespace {

thread_local int t_current_client = 0;

// stdin/stdout as a byte stream (serve --stdio). A blocked read cannot be interrupted; the thread is detached at exit.
class StdioStream : public rpc::ByteStream {
public:
    std::size_t read_some(char* buf, std::size_t n) override {
#ifdef _WIN32
        const int got = _read(0, buf, static_cast<unsigned>(n));
#else
        const ssize_t got = ::read(0, buf, n);
#endif
        return got > 0 ? static_cast<std::size_t>(got) : 0;
    }
    void write_all(const char* data, std::size_t n) override {
        std::lock_guard<std::mutex> lock(m_);
        std::fwrite(data, 1, n, stdout);
        std::fflush(stdout);
    }
    void close() override {}

private:
    std::mutex m_;
};

nlohmann::json error_object(int code, const std::string& message) {
    return {{"code", code}, {"message", message}};
}

}  // namespace

LocalServer& server() {
    static LocalServer instance;
    return instance;
}

void LocalServer::attach(session::Registry& reg) {
    reg_ = &reg;
}

int LocalServer::current_client() {
    return t_current_client;
}

std::optional<nlohmann::json> LocalServer::gate(Client& client, const nlohmann::json& request) {
    t_current_client = client.id;
    const std::string method = request.is_object() ? request.value("method", "") : "";
    if (client.transport != "tcp" || client.authed) return std::nullopt;
    if (method != "engine.hello") return error_object(-32600, "call engine.hello first");
    const auto params = request.value("params", nlohmann::json::object());
    const std::string token = params.is_object() ? params.value("token", "") : "";
    if (token.empty() || token != info_.token) return error_object(-32600, "wrong token");
    std::lock_guard<std::mutex> lock(mutex_);
    client.authed = true;
    return std::nullopt;
}

nlohmann::json LocalServer::hello(const nlohmann::json& params) {
    const int id = current_client();
    const std::string kind = params.value("client", "");
    if (!kind.empty() && kind != "desktop" && kind != "vscode" && kind != "tool") {
        throw core::PvError(core::err::InvalidParams, "client must be desktop, vscode or tool");
    }
    std::lock_guard<std::mutex> lock(mutex_);
    const auto it = clients_.find(id);
    if (it != clients_.end() && !kind.empty()) it->second->kind = kind;
    return {{"version", core::kEngineVersion}, {"client_id", id}};
}

std::vector<ClientInfo> LocalServer::clients() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<ClientInfo> out;
    for (const auto& [id, c] : clients_) {
        if (c->done) continue;
        if (c->transport == "tcp" && !c->authed) continue;
        out.push_back(ClientInfo{id, c->kind, c->transport});
    }
    return out;
}

EngineInfo LocalServer::info() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return info_;
}

int LocalServer::broadcast(const std::string& method, const nlohmann::json& params, int except_client,
                           const std::string& only_kind) {
    std::vector<std::shared_ptr<Client>> targets;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& [id, c] : clients_) {
            if (id == except_client || c->done) continue;
            if (c->transport == "tcp" && !c->authed) continue;
            if (!only_kind.empty() && c->kind != only_kind) continue;
            targets.push_back(c);
        }
    }
    int delivered = 0;
    for (const auto& c : targets) {
        try {
            c->conn->notify(method, params);
            ++delivered;
        } catch (...) {
            // the client went away
        }
    }
    return delivered;
}

void LocalServer::add_client(std::unique_ptr<rpc::ByteStream> stream, const std::string& transport) {
    auto client = std::make_shared<Client>();
    client->transport = transport;
    client->kind = transport == "tcp" ? "tool" : "desktop";
    Client* raw = client.get();
    client->conn = std::make_shared<rpc::Connection>(std::move(stream), dispatch_mutex_,
                                                     [this, raw](const nlohmann::json& req) { return gate(*raw, req); });
    {
        std::lock_guard<std::mutex> lock(mutex_);
        client->id = next_id_++;
        clients_[client->id] = client;
    }
    if (auto* fanout = dynamic_cast<rpc::FanoutNotifier*>(&reg_->notifier)) {
        // Unauthenticated TCP clients get notifications only after engine.hello: the gate blocks their requests, and
        // notifications carry project data, so wrap the sink.
        class Guarded : public rpc::Notifier {
        public:
            Guarded(std::shared_ptr<Client> c) : c_(std::move(c)) {}
            void notify(const std::string& method, const nlohmann::json& params) override {
                if (c_->transport == "tcp" && !c_->authed) return;
                c_->conn->notify(method, params);
            }
            std::shared_ptr<Client> c_;
        };
        auto guarded = std::make_shared<Guarded>(client);
        client->fanout_id = fanout->add(guarded.get());
        client->thread = std::thread([this, client, guarded, fanout] {
            client->conn->run(reg_->methods);
            fanout->remove(client->fanout_id);
            client->done = true;
            cv_.notify_all();
        });
    } else {
        client->thread = std::thread([this, client] {
            client->conn->run(reg_->methods);
            client->done = true;
            cv_.notify_all();
        });
    }
}

void LocalServer::reap(bool all) {
    std::vector<std::shared_ptr<Client>> finished;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (auto it = clients_.begin(); it != clients_.end();) {
            if (all || it->second->done) {
                finished.push_back(it->second);
                it = clients_.erase(it);
            } else {
                ++it;
            }
        }
    }
    for (const auto& c : finished) {
        c->conn->close();
        if (c->thread.joinable()) {
            if (c->transport == "stdio") c->thread.detach();  // a blocked stdin read cannot be interrupted
            else c->thread.join();
        }
    }
}

int LocalServer::run(const ServeOptions& options) {
    if (!reg_) return 1;
    stop_ = false;
    const std::string pipe = pipe_path(options.pipe.empty() ? "pv-engine-" + current_user_name() : options.pipe);
    auto pipe_listener = listen_pipe(pipe);
    if (!pipe_listener) {
        core::log_error("serve: cannot listen on " + pipe + " (another engine may use it)");
        return 1;
    }
    int port = 0;
    std::unique_ptr<Listener> tcp_listener;
    if (options.tcp_port > 0 || options.tcp_port == -1) {
        tcp_listener = listen_tcp(options.tcp_port == -1 ? 0 : options.tcp_port, options.tcp_tries, port);
        if (!tcp_listener) core::log_warn("serve: TCP ports " + std::to_string(options.tcp_port) + "+ are busy; TCP is off");
    }
    {
        std::lock_guard<std::mutex> lock(mutex_);
        info_ = EngineInfo{current_pid(), core::kEngineVersion, pipe, port, random_token()};
        listeners_.push_back(std::move(pipe_listener));
        if (tcp_listener) listeners_.push_back(std::move(tcp_listener));
    }
    if (options.write_info) write_info(info_);
    running_ = true;
    core::log_info("pv-engine serving pipe=" + pipe + " tcp=" + std::to_string(port));

    for (std::size_t i = 0; i < listeners_.size(); ++i) {
        const std::string transport = i == 0 ? "pipe" : "tcp";
        Listener* l = listeners_[i].get();
        accept_threads_.emplace_back([this, l, transport] {
            while (auto stream = l->accept()) {
                if (stop_) break;
                add_client(std::move(stream), transport);
            }
        });
    }
    if (options.stdio) add_client(std::make_unique<StdioStream>(), "stdio");

    {
        std::unique_lock<std::mutex> lock(mutex_);
        while (!stop_) {
            cv_.wait_for(lock, std::chrono::seconds(2));
            if (options.parent_pid > 0 && !process_alive(options.parent_pid)) {
                core::log_info("serve: parent process ended; stopping");
                stop_ = true;
            }
            lock.unlock();
            reap(false);
            lock.lock();
        }
    }

    std::this_thread::sleep_for(std::chrono::milliseconds(150));  // let a pending engine.shutdown answer go out
    for (auto& l : listeners_) l->close();
    for (auto& t : accept_threads_) {
        if (t.joinable()) t.join();
    }
    accept_threads_.clear();
    reap(true);
    listeners_.clear();
    if (options.write_info) remove_info(info_.pid);
    running_ = false;
    return 0;
}

void LocalServer::stop() {
    stop_ = true;
    cv_.notify_all();
}

}  // namespace pv::ipc
