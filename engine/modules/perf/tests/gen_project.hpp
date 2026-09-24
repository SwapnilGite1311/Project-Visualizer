#pragma once
#include <filesystem>
#include <fstream>
#include <string>

namespace pv::perf::testing {

// Writes a synthetic Python project: <files> modules spread over 20 packages, each module
// importing f0 from the previous module and every function calling it.
inline void generate_python_project(const std::string& root, int files, int funcs_per_file) {
    namespace fs = std::filesystem;
    for (int i = 0; i < files; ++i) {
        const fs::path pkg = fs::path(root) / ("pkg_" + std::to_string(i % 20));
        fs::create_directories(pkg);
        if (!fs::exists(pkg / "__init__.py")) std::ofstream(pkg / "__init__.py", std::ios::binary);
        std::ofstream out(pkg / ("mod_" + std::to_string(i) + ".py"), std::ios::binary);
        if (i > 0) out << "from pkg_" << (i - 1) % 20 << ".mod_" << i - 1 << " import f0\n";
        for (int j = 0; j < funcs_per_file; ++j) {
            out << "def f" << j << "(x):\n";
            out << "    if x > " << j << ":\n";
            out << (i > 0 ? "        return f0(x - 1)\n" : "        return x\n");
            out << "    return x\n";
        }
    }
}

}  // namespace pv::perf::testing
