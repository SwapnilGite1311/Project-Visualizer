#include "pv/session/source.hpp"

#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"

namespace pv::session {

std::string source_text_for(const std::string& root_path, const core::Node& node) {
    switch (node.kind) {
        case core::NodeKind::Module:
            return core::read_file_text(core::path_join(root_path, node.file_path));
        case core::NodeKind::Class:
        case core::NodeKind::Function:
        case core::NodeKind::Method:
        case core::NodeKind::Variable:
        case core::NodeKind::Statement:
            return core::line_range(core::read_file_text(core::path_join(root_path, node.file_path)),
                                    node.span.start_line, node.span.end_line);
        default:
            throw core::PvError(core::err::Unsupported, "node has no source: " + node.id);
    }
}

}  // namespace pv::session
