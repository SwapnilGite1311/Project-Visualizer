#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>
#include <random>
#include <sstream>

#include "pv/lang_python/python_adapter.hpp"
#include "pv/session/test_env.hpp"

void pv_register_gdiff(pv::session::Registry& reg);

using namespace pv;
namespace stdfs = std::filesystem;

TEST(GdiffRpc, OneFunctionRemoved) {
    std::random_device rd;
    const stdfs::path dir = stdfs::temp_directory_path() / ("pv-gdiff-" + std::to_string(rd()));
    const std::string fixture = session::pyproj_small_path();
    stdfs::copy(stdfs::path(std::u8string(reinterpret_cast<const char8_t*>(fixture.data()), fixture.size())), dir,
                stdfs::copy_options::recursive);
    // Remove is_valid from utils.py in the copy (the head version).
    const stdfs::path utils = dir / "app" / "utils.py";
    std::stringstream ss;
    ss << std::ifstream(utils, std::ios::binary).rdbuf();
    std::string text = ss.str();
    const auto start = text.find("def is_valid");
    ASSERT_NE(start, std::string::npos);
    auto end = text.find("\ndef ", start + 1);
    text.erase(start, end == std::string::npos ? std::string::npos : end + 1 - start);
    std::ofstream(utils, std::ios::binary | std::ios::trunc) << text;

    session::TestEnv env(std::make_unique<lang_python::PythonAdapter>());
    pv_register_gdiff(*env.reg);
    const std::string base = env.open_and_wait(fixture);
    const std::string head = env.open_and_wait(dir.generic_string());
    const auto d = env.call("gdiff.compare", {{"base_project_id", base}, {"head_project_id", head}});
    EXPECT_EQ(d["removed"], nlohmann::json::array({"function:app/utils.py#is_valid"}));
    EXPECT_GT(d["edges_removed"].get<int>(), 0);
    std::error_code ec;
    stdfs::remove_all(dir, ec);
}
