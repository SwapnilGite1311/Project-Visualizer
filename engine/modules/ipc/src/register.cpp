#include <cstdio>
#include <string>
#include <vector>

#include "pv/core/error.hpp"
#include "pv/core/version.hpp"
#include "pv/ipc/server.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

int parse_int(const std::string& text, const std::string& flag) {
    try {
        return std::stoi(text);
    } catch (const std::exception&) {
        throw pv::core::PvError(pv::core::err::InvalidParams, flag + " needs a number");
    }
}

int require_int(const Json& p, const std::string& key) {
    if (!p.contains(key) || !p[key].is_number_integer()) {
        throw pv::core::PvError(pv::core::err::InvalidParams, "missing integer param: " + key);
    }
    return p[key].get<int>();
}

pv::ipc::ServeOptions parse_serve_args(const std::vector<std::string>& args) {
    pv::ipc::ServeOptions o;
    for (std::size_t i = 0; i < args.size(); ++i) {
        const std::string& a = args[i];
        auto value = [&]() -> const std::string& {
            if (i + 1 >= args.size()) throw pv::core::PvError(pv::core::err::InvalidParams, a + " needs a value");
            return args[++i];
        };
        if (a == "--pipe") o.pipe = value();
        else if (a == "--tcp") o.tcp_port = parse_int(value(), a);
        else if (a == "--parent-pid") o.parent_pid = parse_int(value(), a);
        else if (a == "--stdio") o.stdio = true;
        else if (a == "--no-info-file") o.write_info = false;
        else throw pv::core::PvError(pv::core::err::InvalidParams, "unknown option " + a);
    }
    return o;
}

}  // namespace

void pv_register_ipc(pv::session::Registry& reg) {
    pv::ipc::server().attach(reg);
    reg.request_shutdown = [previous = reg.request_shutdown] {
        pv::ipc::server().stop();
        if (previous) previous();
    };

    reg.cli.add("serve", [](const std::vector<std::string>& args) {
        try {
            return pv::ipc::server().run(parse_serve_args(args));
        } catch (const pv::core::PvError& e) {
            std::fprintf(stderr, "serve: %s\n", e.what());
            return 2;
        }
    });

    reg.methods.add("engine.hello", [](const Json& p) {
        if (!pv::ipc::server().running()) return Json{{"version", pv::core::kEngineVersion}, {"client_id", 0}};
        return pv::ipc::server().hello(p);
    });

    reg.methods.add("engine.info", [](const Json&) {
        auto& srv = pv::ipc::server();
        if (!srv.running()) {
            return Json{{"version", pv::core::kEngineVersion},
                        {"pid", pv::ipc::current_pid()},
                        {"pipe", ""},
                        {"tcp_port", nullptr},
                        {"clients", Json::array({Json{{"client_id", 0}, {"client", "desktop"}, {"transport", "stdio"}}})}};
        }
        const auto info = srv.info();
        Json clients = Json::array();
        for (const auto& c : srv.clients()) {
            clients.push_back(Json{{"client_id", c.client_id}, {"client", c.client}, {"transport", c.transport}});
        }
        return Json{{"version", info.version},
                    {"pid", info.pid},
                    {"pipe", info.pipe},
                    {"tcp_port", info.tcp_port == 0 ? Json(nullptr) : Json(info.tcp_port)},
                    {"clients", clients}};
    });

    // Editor relay: VS Code asks the map to show code, the map asks VS Code to open code.
    reg.methods.add("editor.reveal", [](const Json& p) {
        Json params{{"file_path", pv::rpc::require_string(p, "file_path")}, {"line", require_int(p, "line")}};
        if (p.contains("column")) params["column"] = require_int(p, "column");
        const int delivered = pv::ipc::server().broadcast("editor.reveal", params, pv::ipc::LocalServer::current_client(), "");
        return Json{{"delivered", delivered}};
    });
    reg.methods.add("editor.open", [](const Json& p) {
        const Json params{{"file_path", pv::rpc::require_string(p, "file_path")}, {"line", require_int(p, "line")}};
        const int delivered = pv::ipc::server().broadcast("editor.open", params, pv::ipc::LocalServer::current_client(), "vscode");
        return Json{{"delivered", delivered}};
    });
}
