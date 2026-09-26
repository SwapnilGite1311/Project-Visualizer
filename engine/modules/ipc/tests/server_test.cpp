#include <gtest/gtest.h>

#include <thread>

#include "ipc_client.hpp"
#include "pv/ipc/server.hpp"
#include "pv/parse/registry.hpp"
#include "pv/rpc/cli_table.hpp"
#include "pv/rpc/fanout.hpp"
#include "pv/rpc/method_table.hpp"
#include "pv/session/project_manager.hpp"

void pv_register_ipc(pv::session::Registry& reg);

using namespace pv;
using namespace pv::ipc::testing;

namespace {

// A registry like the engine's, with a fan-out notifier, and `serve` running on a background thread.
struct ServeFixture {
    rpc::MethodTable methods;
    rpc::CliTable cli;
    parse::AdapterRegistry adapters;
    rpc::FanoutNotifier fanout;
    session::ProjectManager projects{adapters, fanout};
    session::Registry reg{methods, cli, projects, adapters, fanout, [] {}};
    std::string pipe = unique_name("pv-test-serve-");
    std::thread thread;

    ServeFixture() {
        methods.add("engine.ping", [](const rpc::Json&) { return rpc::Json{{"version", "test"}}; });
        pv_register_ipc(reg);
        ipc::ServeOptions o;
        o.pipe = pipe;
        o.tcp_port = -1;  // any free port
        o.write_info = false;
        thread = std::thread([this, o] { ipc::server().run(o); });
        for (int i = 0; i < 200 && !ipc::server().running(); ++i) std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    ~ServeFixture() {
        ipc::server().stop();
        thread.join();
    }
    TestClient tcp_client() { return TestClient(ipc::connect_tcp(ipc::server().info().tcp_port)); }
    TestClient pipe_client() { return TestClient(ipc::connect_pipe(pipe)); }
};

}  // namespace

TEST(IpcServer, TcpNeedsTheToken) {
    ServeFixture f;
    ASSERT_TRUE(ipc::server().running());
    auto c = f.tcp_client();
    ASSERT_TRUE(c.ok());
    EXPECT_EQ(c.call("engine.ping")["error"]["code"], -32600);
    EXPECT_EQ(c.call("engine.hello", {{"token", "nope"}, {"client", "vscode"}})["error"]["message"], "wrong token");
    const auto hello = c.call("engine.hello", {{"token", ipc::server().info().token}, {"client", "vscode"}});
    EXPECT_GT(hello["result"]["client_id"].get<int>(), 0);
    EXPECT_EQ(c.call("engine.ping")["result"]["version"], "test");
    c.close();
}

TEST(IpcServer, PipeNeedsNoTokenAndInfoListsClients) {
    ServeFixture f;
    auto desk = f.pipe_client();
    ASSERT_TRUE(desk.ok());
    EXPECT_EQ(desk.call("engine.ping")["result"]["version"], "test");
    auto code = f.tcp_client();
    code.call("engine.hello", {{"token", ipc::server().info().token}, {"client", "vscode"}});
    const auto info = desk.call("engine.info")["result"];
    EXPECT_EQ(info["pipe"], ipc::pipe_path(f.pipe));
    EXPECT_EQ(info["tcp_port"], ipc::server().info().tcp_port);
    ASSERT_EQ(info["clients"].size(), 2u);
    EXPECT_EQ(info["clients"][0]["transport"], "pipe");
    EXPECT_EQ(info["clients"][0]["client"], "desktop");
    EXPECT_EQ(info["clients"][1]["client"], "vscode");
    desk.close();
    code.close();
}

TEST(IpcServer, NotificationsReachEveryClient) {
    ServeFixture f;
    auto desk = f.pipe_client();
    auto code = f.tcp_client();
    auto stranger = f.tcp_client();  // never says hello
    desk.call("engine.ping");
    code.call("engine.hello", {{"token", ipc::server().info().token}, {"client", "vscode"}});
    stranger.call("engine.ping");  // rejected; registers the connection
    f.fanout.notify("project.progress", rpc::Json{{"project_id", "p1"}});
    EXPECT_EQ(desk.wait_note("project.progress")["params"]["project_id"], "p1");
    EXPECT_EQ(code.wait_note("project.progress")["params"]["project_id"], "p1");
    // The unauthenticated client got nothing: its next message is the answer to its next request.
    const auto next = stranger.call("engine.ping");
    EXPECT_TRUE(next.contains("error"));
    EXPECT_TRUE(stranger.notes.empty());
    desk.close();
    code.close();
    stranger.close();
}

TEST(IpcServer, EditorRelay) {
    ServeFixture f;
    auto desk = f.pipe_client();
    auto code = f.tcp_client();
    auto tool = f.tcp_client();
    desk.call("engine.ping");
    code.call("engine.hello", {{"token", ipc::server().info().token}, {"client", "vscode"}});
    tool.call("engine.hello", {{"token", ipc::server().info().token}, {"client", "tool"}});

    // Map -> VS Code: only the vscode client gets editor.open.
    const auto opened = desk.call("editor.open", {{"file_path", "app/main.py"}, {"line", 3}});
    EXPECT_EQ(opened["result"]["delivered"], 1);
    EXPECT_EQ(code.wait_note("editor.open")["params"]["line"], 3);

    // VS Code -> map: everyone else gets editor.reveal.
    const auto revealed = code.call("editor.reveal", {{"file_path", "app/main.py"}, {"line", 9}});
    EXPECT_EQ(revealed["result"]["delivered"], 2);
    EXPECT_EQ(desk.wait_note("editor.reveal")["params"]["file_path"], "app/main.py");
    EXPECT_EQ(tool.wait_note("editor.reveal")["params"]["line"], 9);
    EXPECT_TRUE(code.call("editor.reveal", {{"file_path", "x"}}).contains("error"));  // line is required
    desk.close();
    code.close();
    tool.close();
}

TEST(IpcServer, ShutdownStopsTheServer) {
    auto f = std::make_unique<ServeFixture>();
    auto desk = f->pipe_client();
    auto code = f->tcp_client();
    desk.call("engine.ping");
    code.call("engine.hello", {{"token", ipc::server().info().token}, {"client", "vscode"}});
    f->reg.request_shutdown();  // what engine.shutdown calls
    for (int i = 0; i < 300 && ipc::server().running(); ++i) std::this_thread::sleep_for(std::chrono::milliseconds(10));
    EXPECT_FALSE(ipc::server().running());
    EXPECT_TRUE(desk.receive().is_null());  // both connections were closed by the server
    EXPECT_TRUE(code.receive().is_null());
    f.reset();
}

TEST(IpcServer, InfoWithoutServe) {
    rpc::MethodTable methods;
    rpc::CliTable cli;
    parse::AdapterRegistry adapters;
    rpc::FanoutNotifier fanout;
    session::ProjectManager projects{adapters, fanout};
    session::Registry reg{methods, cli, projects, adapters, fanout, [] {}};
    pv_register_ipc(reg);
    const auto info = methods.call("engine.info", rpc::Json::object());
    EXPECT_EQ(info["clients"][0]["transport"], "stdio");
    EXPECT_EQ(methods.call("editor.open", {{"file_path", "a"}, {"line", 1}})["delivered"], 0);
    EXPECT_EQ(methods.call("engine.hello", rpc::Json::object())["client_id"], 0);
}
