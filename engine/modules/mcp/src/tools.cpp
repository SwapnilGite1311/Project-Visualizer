#include "pv/context/context.hpp"
#include "pv/core/error.hpp"
#include "pv/deps/deps.hpp"
#include "pv/grounding/grounding.hpp"
#include "pv/impact/impact.hpp"
#include "pv/mcp/mcp.hpp"
#include "pv/search/search.hpp"

namespace pv::mcp {
namespace {

using Json = nlohmann::json;

std::string require(const Json& args, const std::string& key) {
    if (!args.contains(key) || !args[key].is_string() || args[key].get<std::string>().empty()) {
        throw core::PvError(core::err::InvalidParams, "missing argument: " + key);
    }
    return args[key];
}

int int_arg(const Json& args, const std::string& key, int fallback, int low, int high) {
    if (!args.contains(key) || args[key].is_null()) return fallback;
    if (!args[key].is_number_integer()) throw core::PvError(core::err::InvalidParams, "argument must be an integer: " + key);
    return std::clamp(args[key].get<int>(), low, high);
}

Json schema(Json properties, std::vector<std::string> required = {}) {
    return {{"type", "object"}, {"properties", std::move(properties)}, {"required", required}};
}

const Json kString = {{"type", "string"}};

Json hit_json(const search::SearchHit& h) {
    return {{"node_id", h.node_id}, {"name", h.name}, {"kind", h.kind}, {"file_path", h.file_path}, {"qualified_name", h.qualified_name}};
}

}  // namespace

std::vector<Tool> make_tools(session::Project& project) {
    session::Project* p = &project;
    std::vector<Tool> tools;

    tools.push_back({"pv_overview",
                     "Start here: a short overview of the project — size, languages, entry points, what each package contains and the external "
                     "libraries it uses.",
                     schema(Json::object()), [p](const Json&) {
                         return p->read([&](const graph::Graph& g) { return Json{{"digest", grounding::build_digest(g, p->main_guard_files(), 8000)}}; });
                     }});

    tools.push_back({"pv_search",
                     "Find classes, functions, methods, modules or packages by name. Returns node ids to use with the other tools.",
                     schema({{"query", kString},
                             {"kinds", {{"type", "array"}, {"items", {{"type", "string"}, {"enum", {"package", "module", "class", "function", "method"}}}}}},
                             {"limit", {{"type", "integer"}, {"minimum", 1}, {"maximum", 50}}}},
                            {"query"}),
                     [p](const Json& args) {
                         const std::string query = require(args, "query");
                         std::vector<core::NodeKind> kinds;
                         if (args.contains("kinds") && args["kinds"].is_array()) {
                             for (const auto& k : args["kinds"]) {
                                 const auto kind = k.is_string() ? core::node_kind_from_string(k.get<std::string>()) : std::nullopt;
                                 if (!kind) throw core::PvError(core::err::InvalidParams, "unknown kind: " + k.dump());
                                 kinds.push_back(*kind);
                             }
                         }
                         const int limit = int_arg(args, "limit", 20, 1, 50);
                         return p->read([&](const graph::Graph& g) {
                             Json hits = Json::array();
                             for (const auto& h : search::search_nodes(g, query, kinds, limit)) hits.push_back(hit_json(h));
                             return Json{{"results", hits}};
                         });
                     }});

    tools.push_back({"pv_node",
                     "Read one code element before changing it: its source, its parent and children, who calls it and what it calls. Give node_id, "
                     "or a name to use the best match.",
                     schema({{"node_id", kString}, {"name", kString}}), [p](const Json& args) {
                         return p->read([&](const graph::Graph& g) {
                             std::string id = args.contains("node_id") && args["node_id"].is_string() ? args["node_id"].get<std::string>() : "";
                             if (id.empty()) {
                                 const std::string name = require(args, "name");
                                 const auto hits = search::search_nodes(g, name, {}, 1);
                                 if (hits.empty()) throw core::PvError(core::err::NodeNotFound, "nothing named like: " + name);
                                 id = hits.front().node_id;
                             }
                             return context::build_context_pack(g, p->root_path(), id, 6000);
                         });
                     }});

    tools.push_back({"pv_dependencies",
                     "What a code element uses (out), what uses it (in), or both, up to 3 steps away, through imports, calls and inheritance.",
                     schema({{"node_id", kString},
                             {"direction", {{"type", "string"}, {"enum", {"in", "out", "both"}}}},
                             {"depth", {{"type", "integer"}, {"minimum", 1}, {"maximum", 3}}}},
                            {"node_id"}),
                     [p](const Json& args) {
                         const std::string id = require(args, "node_id");
                         const std::string direction = args.value("direction", "both");
                         if (direction != "in" && direction != "out" && direction != "both") {
                             throw core::PvError(core::err::InvalidParams, "direction must be in, out or both");
                         }
                         const int depth = int_arg(args, "depth", 1, 1, 3);
                         return p->read([&](const graph::Graph& g) {
                             g.node(id);
                             return deps::to_json(deps::neighbors(g, id, direction, depth, {}));
                         });
                     }});

    tools.push_back({"pv_impact",
                     "Before changing a function, class or file, call this to see everything that depends on it and a risk level.",
                     schema({{"node_id", kString},
                             {"change_kind", {{"type", "string"}, {"enum", {"modify_body", "change_signature", "rename", "delete", "move"}}}}},
                            {"node_id"}),
                     [p](const Json& args) {
                         const std::string id = require(args, "node_id");
                         return p->read([&](const graph::Graph& g) {
                             g.node(id);
                             Json r = impact::to_json(impact::analyze_impact(g, id, 5));
                             if (args.contains("change_kind")) r["change_kind"] = args["change_kind"];
                             return r;
                         });
                     }});

    tools.push_back({"pv_path",
                     "How one code element reaches another: the shortest chain of imports, calls or inheritance between them.",
                     schema({{"from_id", kString}, {"to_id", kString}}, {"from_id", "to_id"}), [p](const Json& args) {
                         const std::string from = require(args, "from_id");
                         const std::string to = require(args, "to_id");
                         return p->read([&](const graph::Graph& g) {
                             g.node(from);
                             g.node(to);
                             return deps::to_json(deps::find_path(g, from, to, {}, 8));
                         });
                     }});
    return tools;
}

}  // namespace pv::mcp
