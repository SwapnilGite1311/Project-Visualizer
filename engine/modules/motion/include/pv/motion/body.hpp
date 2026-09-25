#pragma once
#include <string>
#include <vector>

namespace pv::motion {

struct Block {
    std::string id, kind, text, parent;   // parent "" = top level of the body
    int line = 0, end_line = 0, depth = 0;
    std::vector<std::string> calls, writes;
};

// Blocks of the body of the class/function definition that starts on def_line (1-based),
// or of the whole module when def_line is 0.
// Throws PvError(err::NodeNotFound, "no definition starts on line <n>") if there is none.
std::vector<Block> body_blocks(const std::string& source, int def_line);

}  // namespace pv::motion
