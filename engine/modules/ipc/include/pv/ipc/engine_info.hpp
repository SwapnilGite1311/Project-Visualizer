#pragma once
#include <optional>
#include <string>

#include <nlohmann/json.hpp>

namespace pv::ipc {

// Contents of ~/.project-visualizer/engine.json: how local tools find the running engine.
struct EngineInfo {
    int pid = 0;
    std::string version;
    std::string pipe;   // full pipe / socket path
    int tcp_port = 0;   // 0 = TCP off
    std::string token;  // required by engine.hello on TCP
};

nlohmann::json info_to_json(const EngineInfo& info);
std::string random_token();             // 64 hex characters from std::random_device
std::string pv_home();                  // $PV_HOME, else <home>/.project-visualizer
std::string info_path();                // <pv_home>/engine.json
void write_info(const EngineInfo& info);  // temp file + rename; user-only permissions on POSIX
std::optional<EngineInfo> read_info();
void remove_info(int pid);              // only when the file still belongs to `pid`
int current_pid();
bool process_alive(int pid);

}  // namespace pv::ipc
