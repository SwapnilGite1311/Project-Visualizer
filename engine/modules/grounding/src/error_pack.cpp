#include <algorithm>
#include <set>

#include "pv/context/context.hpp"
#include "pv/core/paths.hpp"
#include "pv/core/text.hpp"
#include "pv/grounding/grounding.hpp"

namespace pv::grounding {
namespace {

constexpr int kMaxFrames = 5;
constexpr int kSnippetRadius = 10;
constexpr int kOriginChars = 8000;

nlohmann::json snippet_for(const graph::Graph& g, const std::string& root, const errmap::Frame& f) {
    const core::Node* node = f.node_id.empty() ? nullptr : g.find_node(f.node_id);
    if (!node || node->file_path.empty()) return nullptr;
    const int start = std::max(1, f.line - kSnippetRadius);
    const int end = f.line + kSnippetRadius;
    std::string text;
    try {
        text = core::line_range(core::read_file_text(core::path_join(root, node->file_path)), start, end);
    } catch (const std::exception&) {
        text.clear();  // file gone or unreadable: the frame is still useful without its code
    }
    return {{"file_path", node->file_path}, {"start_line", start}, {"end_line", end}, {"text", text}};
}

}  // namespace

nlohmann::json build_error_pack(const graph::Graph& g, const std::string& root, const errmap::ErrorRecord& e,
                                const std::map<std::string, health::HealthInfo>& health) {
    std::set<std::string> related;
    nlohmann::json origin = nullptr;
    if (!e.origin_node_id.empty() && g.find_node(e.origin_node_id)) {
        origin = context::build_context_pack(g, root, e.origin_node_id, kOriginChars);
        for (const auto& id : origin["related_node_ids"]) related.insert(id.get<std::string>());
    }

    nlohmann::json frames = nlohmann::json::array();
    std::set<std::string> health_ids;
    if (!e.origin_node_id.empty()) health_ids.insert(e.origin_node_id);
    for (const errmap::Frame& f : e.frames) {
        if (static_cast<int>(frames.size()) >= kMaxFrames) break;
        if (!f.in_project) continue;
        frames.push_back({{"frame", errmap::frame_to_json(f)}, {"snippet", snippet_for(g, root, f)}});
        if (!f.node_id.empty()) {
            related.insert(f.node_id);
            health_ids.insert(f.node_id);
        }
    }

    nlohmann::json health_json = nlohmann::json::object();
    for (const std::string& id : health_ids) {
        const auto it = health.find(id);
        if (it != health.end()) health_json[id] = health::to_json(it->second);
    }

    nlohmann::json pack{{"kind", "error"},
                        {"error", errmap::record_to_json(e)},
                        {"origin", origin},
                        {"frames", frames},
                        {"health", health_json},
                        {"related_node_ids", std::vector<std::string>(related.begin(), related.end())}};
    pack["approx_tokens"] = static_cast<int>(pack.dump().size() / 4);
    return pack;
}

nlohmann::json check_citations(const graph::Graph& g, const std::vector<std::string>& ids) {
    std::vector<std::string> valid, invalid;
    for (const std::string& id : ids) (g.find_node(id) ? valid : invalid).push_back(id);
    return {{"valid", valid}, {"invalid", invalid}};
}

}  // namespace pv::grounding
