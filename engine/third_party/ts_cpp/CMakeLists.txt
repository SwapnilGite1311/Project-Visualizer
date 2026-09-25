FetchContent_Declare(ts_cpp
  URL https://github.com/tree-sitter/tree-sitter-cpp/archive/refs/tags/v0.23.4.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_cpp)

set(ts_cpp_sources ${ts_cpp_SOURCE_DIR}/src/parser.c)
if(EXISTS ${ts_cpp_SOURCE_DIR}/src/scanner.c)
  list(APPEND ts_cpp_sources ${ts_cpp_SOURCE_DIR}/src/scanner.c)
endif()

add_library(pv_tp_ts_cpp STATIC ${ts_cpp_sources})
target_include_directories(pv_tp_ts_cpp PRIVATE ${ts_cpp_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_cpp PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_cpp PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_cpp PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_cpp PRIVATE -w)
endif()
