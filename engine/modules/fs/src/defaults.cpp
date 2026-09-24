#include "pv/fs/fs.hpp"

namespace pv::fs {

std::vector<std::string> default_excludes() {
    return {".git/**",        "**/.git/**",         "node_modules/**",       "**/node_modules/**",
            ".venv/**",       "**/.venv/**",        "venv/**",               "**/venv/**",
            "env/**",         "**/__pycache__/**",  "**/.mypy_cache/**",     "**/.pytest_cache/**",
            "**/.tox/**",     "**/site-packages/**", "build/**",             "dist/**",
            ".pv/**",         ".idea/**",           ".vscode/**"};
}

bool looks_binary(const std::string& first_bytes) {
    return first_bytes.find('\0') != std::string::npos;
}

}  // namespace pv::fs
