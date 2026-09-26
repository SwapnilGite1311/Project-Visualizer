#include <gtest/gtest.h>

#include <cstdlib>
#include <filesystem>
#include <random>

#include "pv/ipc/engine_info.hpp"

using namespace pv::ipc;

namespace {

// Points PV_HOME at a fresh temp folder for one test.
struct HomeScope {
    HomeScope() {
        std::random_device rd;
        dir = std::filesystem::temp_directory_path() / ("pv-home-" + std::to_string(rd()));
        set(dir.generic_string());
    }
    ~HomeScope() {
        set("");
        std::error_code ec;
        std::filesystem::remove_all(dir, ec);
    }
    static void set(const std::string& value) {
#ifdef _WIN32
        _putenv_s("PV_HOME", value.c_str());
#else
        if (value.empty()) unsetenv("PV_HOME");
        else setenv("PV_HOME", value.c_str(), 1);
#endif
    }
    std::filesystem::path dir;
};

}  // namespace

TEST(IpcInfo, WriteReadRemove) {
    HomeScope home;
    EXPECT_EQ(info_path(), home.dir.generic_string() + "/engine.json");
    EXPECT_FALSE(read_info().has_value());
    EngineInfo info{current_pid(), "0.1.0", "\\\\.\\pipe\\x", 7700, random_token()};
    write_info(info);
    const auto back = read_info();
    ASSERT_TRUE(back.has_value());
    EXPECT_EQ(back->pid, info.pid);
    EXPECT_EQ(back->pipe, info.pipe);
    EXPECT_EQ(back->tcp_port, 7700);
    EXPECT_EQ(back->token, info.token);

    remove_info(info.pid + 1);  // not ours: stays
    EXPECT_TRUE(read_info().has_value());
    remove_info(info.pid);
    EXPECT_FALSE(read_info().has_value());
}

TEST(IpcInfo, TokensAreRandomHex) {
    const std::string a = random_token();
    const std::string b = random_token();
    EXPECT_EQ(a.size(), 64u);
    EXPECT_NE(a, b);
    EXPECT_EQ(a.find_first_not_of("0123456789abcdef"), std::string::npos);
}

TEST(IpcInfo, ProcessAlive) {
    EXPECT_TRUE(process_alive(current_pid()));
    EXPECT_FALSE(process_alive(0));
}
