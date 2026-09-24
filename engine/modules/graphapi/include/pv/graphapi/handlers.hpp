#pragma once
#include <nlohmann/json.hpp>

#include "pv/session/project_manager.hpp"

namespace pv::graphapi {

using Json = nlohmann::json;

Json handle_node(session::ProjectManager& pm, const Json& params);
Json handle_children(session::ProjectManager& pm, const Json& params);
Json handle_level_view(session::ProjectManager& pm, const Json& params);
Json handle_edges(session::ProjectManager& pm, const Json& params);
Json handle_source(session::ProjectManager& pm, const Json& params);
Json handle_ancestors(session::ProjectManager& pm, const Json& params);

}  // namespace pv::graphapi
