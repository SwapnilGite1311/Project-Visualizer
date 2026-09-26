#pragma once
#include <memory>
#include <string>

#include "pv/rpc/connection.hpp"

namespace pv::ipc {

// Accepts local connections and hands each one out as a byte stream.
class Listener {
public:
    virtual ~Listener() = default;
    virtual std::unique_ptr<rpc::ByteStream> accept() = 0;  // blocks; nullptr after close()
    virtual void close() = 0;                               // thread-safe; unblocks accept()
};

// The full pipe / socket path for a name: Windows "\\.\pipe\<name>"; elsewhere "<tmp>/<name>.sock".
// A value that already is a full path ("\\.\pipe\…" or an absolute path) is returned unchanged.
std::string pipe_path(const std::string& name_or_path);

// Named pipe (Windows) or Unix domain socket (macOS, Linux) that only the current OS user can open.
// Returns nullptr when it cannot be created (for example the name is in use).
std::unique_ptr<Listener> listen_pipe(const std::string& name_or_path);

// TCP on 127.0.0.1 only. Tries first_port, first_port + 1, … (tries ports); chosen_port = 0 when all are busy.
// first_port = 0 lets the OS choose a free port.
std::unique_ptr<Listener> listen_tcp(int first_port, int tries, int& chosen_port);

// Client side (tests and tools).
std::unique_ptr<rpc::ByteStream> connect_pipe(const std::string& name_or_path);
std::unique_ptr<rpc::ByteStream> connect_tcp(int port);

std::string current_user_name();  // letters, digits, '-' and '_' only (others become '_')

}  // namespace pv::ipc
