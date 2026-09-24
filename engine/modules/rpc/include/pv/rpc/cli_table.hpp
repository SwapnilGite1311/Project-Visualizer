#pragma once
#include <functional>
#include <map>
#include <string>
#include <vector>

namespace pv::rpc {

using CliCommand = std::function<int(const std::vector<std::string>& args)>;
class CliTable {
public:
    void add(const std::string& name, CliCommand command);  // duplicate -> PvError(err::Conflict)
    bool has(const std::string& name) const;
    int run(const std::string& name, const std::vector<std::string>& args) const; // unknown -> PvError(err::MethodNotFound)
    std::vector<std::string> names() const;  // sorted
private:
    std::map<std::string, CliCommand> commands_;
};

}  // namespace pv::rpc
