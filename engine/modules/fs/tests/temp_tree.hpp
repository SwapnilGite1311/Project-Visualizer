#pragma once
#include <atomic>
#include <filesystem>
#include <fstream>
#include <string>

namespace pv::fs::testing {

class TempTree {
public:
    TempTree() {
        static std::atomic<int> counter{0};
        root_ = std::filesystem::temp_directory_path() /
                ("pv_fs_test_" + std::to_string(counter++) + "_" + std::to_string(std::rand()));
        std::filesystem::create_directories(root_);
    }
    ~TempTree() {
        std::error_code ec;
        std::filesystem::remove_all(root_, ec);
    }
    TempTree(const TempTree&) = delete;
    TempTree& operator=(const TempTree&) = delete;

    void write(const std::string& rel, const std::string& content) {
        auto p = root_ / rel;
        std::filesystem::create_directories(p.parent_path());
        std::ofstream out(p, std::ios::binary);
        out << content;
    }
    std::string root() const { return root_.generic_string(); }

private:
    std::filesystem::path root_;
};

}  // namespace pv::fs::testing
