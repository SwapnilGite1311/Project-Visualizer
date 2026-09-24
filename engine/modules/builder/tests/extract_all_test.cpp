#include <gtest/gtest.h>

#include <filesystem>
#include <fstream>

#include "fake_adapter.hpp"
#include "pv/builder/builder.hpp"

using namespace pv;
using namespace pv::builder;

TEST(BuilderExtractAll, ParallelWithOneFailure) {
    const auto root = std::filesystem::temp_directory_path() / "pv_builder_extract_all";
    std::filesystem::remove_all(root);
    std::filesystem::create_directories(root);
    std::vector<fs::DiscoveredFile> files;
    for (int i = 0; i < 21; ++i) {
        const std::string rel = "f" + std::to_string(i) + ".fk";
        std::ofstream(root / rel, std::ios::binary) << (i == 7 ? "BOOM\n" : "a\nb\n");
        files.push_back(fs::DiscoveredFile{rel, (root / rel).generic_string(), 4});
    }

    parse::AdapterRegistry adapters;
    adapters.add(std::make_unique<pv::builder::testing::FakeAdapter>());
    std::vector<std::pair<int, int>> progress;
    std::vector<std::string> errors;
    const auto result = extract_all(
        adapters, files, [&](int d, int n) { progress.emplace_back(d, n); }, 4, errors);

    ASSERT_EQ(result.size(), 21u);
    ASSERT_EQ(errors.size(), 1u);
    EXPECT_EQ(errors[0].rfind("f7.fk", 0), 0u);
    ASSERT_EQ(progress.size(), 21u);
    EXPECT_EQ(progress.back(), (std::pair<int, int>{21, 21}));
    for (std::size_t i = 0; i < result.size(); ++i) {
        if (i == 7) continue;
        EXPECT_EQ(result[i].loc, 2) << i;
    }
    EXPECT_EQ(result[7].file_path, "f7.fk");
    std::filesystem::remove_all(root);
}
