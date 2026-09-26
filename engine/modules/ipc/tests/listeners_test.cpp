#include <gtest/gtest.h>

#include <thread>

#include "ipc_client.hpp"

using namespace pv::ipc;
using namespace pv::ipc::testing;

namespace {

// Echoes every byte back until the peer closes.
void echo(std::unique_ptr<pv::rpc::ByteStream> s) {
    char buf[256];
    while (const std::size_t n = s->read_some(buf, sizeof(buf))) s->write_all(buf, n);
}

std::string read_exact(pv::rpc::ByteStream& s, std::size_t n) {
    std::string out;
    char buf[256];
    while (out.size() < n) {
        const std::size_t got = s.read_some(buf, std::min(sizeof(buf), n - out.size()));
        if (got == 0) break;
        out.append(buf, got);
    }
    return out;
}

}  // namespace

TEST(IpcListeners, TcpEcho) {
    int port = 0;
    auto listener = listen_tcp(0, 1, port);
    ASSERT_NE(listener, nullptr);
    ASSERT_GT(port, 0);
    std::thread server([&] { echo(listener->accept()); });
    auto client = connect_tcp(port);
    ASSERT_NE(client, nullptr);
    client->write_all("hello", 5);
    EXPECT_EQ(read_exact(*client, 5), "hello");
    client->close();
    server.join();
    listener->close();
}

TEST(IpcListeners, TcpTriesTheNextPort) {
    int first = 0;
    auto a = listen_tcp(0, 1, first);
    ASSERT_NE(a, nullptr);
    int second = 0;
    auto b = listen_tcp(first, 5, second);  // `first` is taken by `a`
    ASSERT_NE(b, nullptr);
    EXPECT_GT(second, first);
    EXPECT_LE(second, first + 4);
}

TEST(IpcListeners, PipeEchoAndNameClash) {
    const std::string name = unique_name("pv-test-");
    auto listener = listen_pipe(name);
    ASSERT_NE(listener, nullptr);
    EXPECT_EQ(listen_pipe(name), nullptr) << "a second engine must not take the same pipe";
    std::thread server([&] { echo(listener->accept()); });
    auto client = connect_pipe(name);
    ASSERT_NE(client, nullptr);
    client->write_all("pipe!", 5);
    EXPECT_EQ(read_exact(*client, 5), "pipe!");
    client->close();
    server.join();
    listener->close();
}

TEST(IpcListeners, CloseUnblocksAccept) {
    auto listener = listen_pipe(unique_name("pv-test-"));
    ASSERT_NE(listener, nullptr);
    std::thread t([&] { EXPECT_EQ(listener->accept(), nullptr); });
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    listener->close();
    t.join();

    int port = 0;
    auto tcp = listen_tcp(0, 1, port);
    std::thread t2([&] { EXPECT_EQ(tcp->accept(), nullptr); });
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    tcp->close();
    t2.join();
}

TEST(IpcListeners, PipePathAndUserName) {
    const std::string p = pipe_path("abc");
#ifdef _WIN32
    EXPECT_EQ(p, "\\\\.\\pipe\\abc");
    EXPECT_EQ(pipe_path(p), p);
#else
    EXPECT_EQ(p.substr(p.size() - 8), "abc.sock");
    EXPECT_EQ(pipe_path("/x/y.sock"), "/x/y.sock");
#endif
    const std::string user = current_user_name();
    EXPECT_FALSE(user.empty());
    EXPECT_EQ(user.find(' '), std::string::npos);
}
