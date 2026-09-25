FetchContent_Declare(ts_rust
  URL https://github.com/tree-sitter/tree-sitter-rust/archive/refs/tags/v0.23.2.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_rust)

set(ts_rust_sources ${ts_rust_SOURCE_DIR}/src/parser.c)
if(EXISTS ${ts_rust_SOURCE_DIR}/src/scanner.c)
  list(APPEND ts_rust_sources ${ts_rust_SOURCE_DIR}/src/scanner.c)
endif()

add_library(pv_tp_ts_rust STATIC ${ts_rust_sources})
target_include_directories(pv_tp_ts_rust PRIVATE ${ts_rust_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_rust PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_rust PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_rust PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_rust PRIVATE -w)
endif()
