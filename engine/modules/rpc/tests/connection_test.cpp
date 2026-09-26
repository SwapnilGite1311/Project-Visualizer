#include <gtest/gtest.h>

#include <condition_variable>
#include <deque>
#include <sstream>
#include <thread>

#include "pv/rpc/connection.hpp"
#include "pv/rpc/fanout.hpp"
#include "pv/rpc/framing.hpp"

using namespace pv::rpc;

namespace {

// One direction of an in-memory pipe.
struct Channel {
    std::mutex m;
    std::condition_variable cv;
    std::deque<char> bytes;
    bool closed = false;
};

class MemStream : public ByteStream {
public:
    MemStream(std::shared_ptr<Channel> in, std::shared_ptr<Channel> out) : in_(std::move(in)), out_(std::move(out)) {}
    std::size_t read_some(char* buf, std::size_t n) override {
        std::unique_lock<std::mutex> lock(in_->m);
        in_->cv.wait(lock, [&] { return !in_->bytes.empty() || in_->closed; });
        std::size_t k = 0;
        while (k < n && !in_->bytes.empty()) {
            buf[k++] = in_->bytes.front();
            in_->bytes.pop_front();
        }
        return k;
    }
    void write_all(const char* data, std::size_t n) override {
        std::lock_guard<std::mutex> lock(out_->m);
        if (out_->closed) throw std::runtime_error("closed");
        out_->bytes.insert(out_->bytes.end(), data, data + n);
        out_->cv.notify_all();
    }
    void close() override {
        for (auto* c : {in_.get(), out_.get()}) {
            std::lock_guard<std::mutex> lock(c->m);
            c->closed = true;
            c->cv.notify_all();
        }
    }

private:
    std::shared_ptr<Channel> in_, out_;
};

// The client side: writes requests into `to_server`, reads replies from `to_client`.
struct Client {
    std::shared_ptr<Channel> to_server = std::make_shared<Channel>();
    std::shared_ptr<Channel> to_client = std::make_shared<Channel>();
    std::unique_ptr<ByteStream> server_side() { return std::make_unique<MemStream>(to_server, to_client); }
    void send(const Json& message) {
        std::ostringstream out;
        write_message(out, message.dump());
        const std::string s = out.str();
        std::lock_guard<std::mutex> lock(to_server->m);
        to_server->bytes.insert(to_server->bytes.end(), s.begin(), s.end());
        to_server->cv.notify_all();
    }
    // Waits for the next framed message from the server.
    Json receive() {
        MemStream reader(to_client, std::make_shared<Channel>());
        std::string text;
        char c;
        while (text.find("\r\n\r\n") == std::string::npos) {
            if (reader.read_some(&c, 1) == 0) return nullptr;
            text += c;
        }
        const auto colon = text.find(':');
        const std::size_t length = std::stoul(text.substr(colon + 1));
        std::string body;
        while (body.size() < length) {
            if (reader.read_some(&c, 1) == 0) return nullptr;
            body += c;
        }
        return Json::parse(body);
    }
};

class Recording : public Notifier {
public:
    void notify(const std::string& method, const Json&) override { methods.push_back(method); }
    std::vector<std::string> methods;
};

}  // namespace

TEST(RpcConnection, AnswersRequests) {
    MethodTable table;
    table.add("a.echo", [](const Json& p) { return p; });
    std::mutex dispatch;
    Client client;
    Connection conn(client.server_side(), dispatch);
    std::thread t([&] { conn.run(table); });

    client.send(Json{{"jsonrpc", "2.0"}, {"id", 1}, {"method", "a.echo"}, {"params", {{"n", 7}}}});
    const Json reply = client.receive();
    EXPECT_EQ(reply["id"], 1);
    EXPECT_EQ(reply["result"]["n"], 7);

    conn.notify("x.changed", Json{{"k", 1}});
    EXPECT_EQ(client.receive()["method"], "x.changed");

    conn.close();
    t.join();
}

TEST(RpcConnection, GateRejectsRequests) {
    MethodTable table;
    table.add("a.echo", [](const Json& p) { return p; });
    table.add("graph.node", [](const Json&) { return Json{{"ok", true}}; });
    std::mutex dispatch;
    Client client;
    Connection conn(client.server_side(), dispatch, [](const Json& req) -> std::optional<Json> {
        if (req.value("method", "") == "graph.node") return Json{{"code", -32600}, {"message", "call engine.hello first"}};
        return std::nullopt;
    });
    std::thread t([&] { conn.run(table); });

    client.send(Json{{"jsonrpc", "2.0"}, {"id", 2}, {"method", "graph.node"}, {"params", Json::object()}});
    const Json reply = client.receive();
    EXPECT_EQ(reply["id"], 2);
    EXPECT_EQ(reply["error"]["code"], -32600);

    client.send(Json{{"jsonrpc", "2.0"}, {"id", 3}, {"method", "a.echo"}, {"params", {{"n", 1}}}});
    EXPECT_EQ(client.receive()["result"]["n"], 1);
    conn.close();
    t.join();
}

TEST(RpcConnection, RunEndsWhenThePeerCloses) {
    MethodTable table;
    std::mutex dispatch;
    Client client;
    Connection conn(client.server_side(), dispatch);
    std::thread t([&] { EXPECT_EQ(conn.run(table), 0); });
    {
        std::lock_guard<std::mutex> lock(client.to_server->m);
        client.to_server->closed = true;
        client.to_server->cv.notify_all();
    }
    t.join();
}

TEST(RpcConnection, FanoutReachesEverySink) {
    FanoutNotifier fanout;
    Recording a, b;
    const int ida = fanout.add(&a);
    fanout.add(&b);
    EXPECT_EQ(fanout.size(), 2u);
    fanout.notify("one", Json::object());
    fanout.remove(ida);
    fanout.notify("two", Json::object());
    EXPECT_EQ(a.methods, (std::vector<std::string>{"one"}));
    EXPECT_EQ(b.methods, (std::vector<std::string>{"one", "two"}));
}

TEST(RpcConnection, FanoutDropsAFailingSink) {
    class Failing : public Notifier {
    public:
        void notify(const std::string&, const Json&) override { throw std::runtime_error("gone"); }
    } failing;
    FanoutNotifier fanout;
    Recording ok;
    fanout.add(&failing);
    fanout.add(&ok);
    fanout.notify("one", Json::object());
    EXPECT_EQ(fanout.size(), 1u);
    EXPECT_EQ(ok.methods.size(), 1u);
}
