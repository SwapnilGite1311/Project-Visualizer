#include <algorithm>
#include <filesystem>
#include <memory>

#include "pv/core/error.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/motion/body.hpp"
#include "pv/motion/trace.hpp"
#include "pv/rpc/params.hpp"
#include "pv/session/registry.hpp"

namespace {

using pv::rpc::Json;

Json block_json(const pv::motion::Block& b) {
    return Json{{"id", b.id},
                {"kind", b.kind},
                {"line", b.line},
                {"end_line", b.end_line},
                {"depth", b.depth},
                {"parent", b.parent.empty() ? Json(nullptr) : Json(b.parent)},
                {"text", b.text},
                {"calls", b.calls},
                {"writes", b.writes}};
}

Json step_json(const pv::motion::Step& s) {
    return Json{{"i", s.i},         {"kind", s.kind},   {"node_id", s.node_id}, {"file", s.file}, {"line", s.line},
                {"depth", s.depth}, {"t_ns", s.t_ns},   {"locals", s.locals},   {"value", s.value}};
}

bool ends_with(const std::string& s, const std::string& suffix) {
    return s.size() >= suffix.size() && s.compare(s.size() - suffix.size(), suffix.size(), suffix) == 0;
}

}  // namespace

void pv_register_motion(pv::session::Registry& reg) {
    using pv::core::PvError;
    namespace err = pv::core::err;
    pv::session::ProjectManager& pm = reg.projects;
    auto store = std::make_shared<pv::motion::TraceStore>();

    reg.methods.add("motion.body", [&pm](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string node_id = pv::rpc::require_string(p, "node_id");
        const pv::core::Node node = project->read([&](const pv::graph::Graph& g) {
            const pv::core::Node* n = g.find_node(node_id);
            if (!n) throw PvError(err::NodeNotFound, "node not found: " + node_id);
            return *n;
        });
        using pv::core::NodeKind;
        if (node.kind != NodeKind::Module && node.kind != NodeKind::Class && node.kind != NodeKind::Function &&
            node.kind != NodeKind::Method) {
            throw PvError(err::InvalidParams, "motion.body needs a module, class, function or method");
        }
        if (!ends_with(node.file_path, ".py")) throw PvError(err::Unsupported, "motion.body supports Python files only");
        const std::string source = pv::core::read_file_text(pv::core::path_join(project->root_path(), node.file_path));
        const bool is_module = node.kind == NodeKind::Module;
        Json blocks = Json::array();
        for (const auto& b : pv::motion::body_blocks(source, is_module ? 0 : node.span.start_line)) {
            blocks.push_back(block_json(b));
        }
        return Json{{"node_id", node.id},
                    {"file_path", node.file_path},
                    {"start_line", is_module ? 1 : node.span.start_line},
                    {"end_line", std::max(1, node.span.end_line)},
                    {"blocks", blocks}};
    });

    reg.methods.add("motion.load_trace", [&pm, store](const Json& p) {
        const auto project = pm.get_ready(pv::rpc::require_string(p, "project_id"));
        const std::string path = pv::rpc::require_string(p, "path");
        std::error_code ec;
        if (!std::filesystem::is_regular_file(std::filesystem::u8path(path), ec)) {
            throw PvError(err::Io, "trace file not found: " + path);
        }
        pv::motion::LoadedTrace trace =
            project->read([&](const pv::graph::Graph& g) { return pv::motion::load_trace_file(g, path); });
        Json functions = Json::array();
        for (const auto& f : pv::motion::function_counts(trace)) {
            if (functions.size() >= 200) break;
            functions.push_back({{"node_id", f.node_id}, {"calls", f.calls}});
        }
        Json last = nullptr;
        if (const pv::motion::Step* ex = pv::motion::last_exception(trace)) {
            last = {{"i", ex->i}, {"node_id", ex->node_id}, {"line", ex->line}, {"value", ex->value}};
        }
        Json result{{"steps_total", trace.steps.size()},
                    {"truncated", trace.truncated},
                    {"exit_code", trace.exit_code ? Json(*trace.exit_code) : Json(nullptr)},
                    {"argv", trace.argv},
                    {"skipped_lines", trace.skipped_lines},
                    {"functions", functions},
                    {"last_exception", last}};
        result["trace_id"] = store->add(std::move(trace));
        return result;
    });

    reg.methods.add("motion.steps", [store](const Json& p) {
        const std::string id = pv::rpc::require_string(p, "trace_id");
        const auto trace = store->get(id);
        if (!trace) throw PvError(err::InvalidParams, "unknown trace: " + id);
        const int total = static_cast<int>(trace->steps.size());
        const int from = std::max(0, pv::rpc::optional_int(p, "from", 0));
        const int count = pv::rpc::clamp_int(pv::rpc::optional_int(p, "count", 500), 1, 5000);
        Json steps = Json::array();
        for (int i = from; i < std::min(total, from + count); ++i) steps.push_back(step_json(trace->steps[i]));
        return Json{{"total", total}, {"steps", steps}};
    });

    reg.methods.add("motion.unload", [store](const Json& p) {
        return Json{{"removed", store->remove(pv::rpc::require_string(p, "trace_id"))}};
    });
}
