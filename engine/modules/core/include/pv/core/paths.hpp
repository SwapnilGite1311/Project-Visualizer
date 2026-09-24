#pragma once
#include <optional>
#include <string>

namespace pv::core {

std::string normalize_path(const std::string& path);
std::string path_parent(const std::string& path);     // "src/app/main.py" -> "src/app"; "main.py" -> ""
std::string path_file_name(const std::string& path);  // "src/app/main.py" -> "main.py"
std::string path_stem(const std::string& path);       // "src/app/main.py" -> "main"; "a.tar.gz" -> "a.tar"; ".env" -> ".env"
std::string path_extension(const std::string& path);  // lowercase with dot: "X/Main.PY" -> ".py"; "Makefile" -> ""; ".env" -> ""
std::string path_join(const std::string& a, const std::string& b); // normalize_path(a + "/" + b); if a is "" returns normalize_path(b)

}  // namespace pv::core
