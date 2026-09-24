#include "pv/lang_ipynb/notebook.hpp"

#include <nlohmann/json.hpp>

#include "pv/core/error.hpp"
#include "pv/core/text.hpp"

namespace pv::lang_ipynb {

std::string notebook_to_source(const std::string& ipynb_json) {
    const nlohmann::json nb = nlohmann::json::parse(ipynb_json, nullptr, false);
    if (nb.is_discarded() || !nb.is_object() || !nb.contains("cells") || !nb["cells"].is_array()) {
        throw core::PvError(core::err::InvalidParams, "invalid notebook");
    }
    std::string out;
    for (const nlohmann::json& cell : nb["cells"]) {
        if (!cell.is_object() || cell.value("cell_type", "") != "code") continue;
        std::string text;
        const nlohmann::json& source = cell.contains("source") ? cell["source"] : nlohmann::json("");
        if (source.is_array()) {
            for (const nlohmann::json& part : source) {
                if (part.is_string()) text += part.get<std::string>();
            }
        } else if (source.is_string()) {
            text = source.get<std::string>();
        }
        // Blank IPython magics and shell escapes but keep the line so line numbers stay stable.
        std::vector<std::string> lines = core::split(text, '\n');
        for (std::string& line : lines) {
            const std::size_t first = line.find_first_not_of(" \t");
            if (first != std::string::npos && (line[first] == '%' || line[first] == '!')) line.clear();
        }
        text = core::join(lines, "\n");
        out += text;
        if (out.empty() || out.back() != '\n') out += '\n';
    }
    return out;
}

}  // namespace pv::lang_ipynb
