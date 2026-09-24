#include "pv/rpc/cli_table.hpp"

#include "pv/core/error.hpp"

namespace pv::rpc {

void CliTable::add(const std::string& name, CliCommand command) {
    if (commands_.count(name)) throw core::PvError(core::err::Conflict, "duplicate command: " + name);
    commands_.emplace(name, std::move(command));
}

bool CliTable::has(const std::string& name) const {
    return commands_.count(name) > 0;
}

int CliTable::run(const std::string& name, const std::vector<std::string>& args) const {
    auto it = commands_.find(name);
    if (it == commands_.end()) throw core::PvError(core::err::MethodNotFound, "command not found: " + name);
    return it->second(args);
}

std::vector<std::string> CliTable::names() const {
    std::vector<std::string> out;
    for (const auto& [name, command] : commands_) out.push_back(name);
    return out;
}

}  // namespace pv::rpc
