FetchContent_Declare(ts_c
  URL https://github.com/tree-sitter/tree-sitter-c/archive/refs/tags/v0.23.4.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_c)

set(ts_c_sources ${ts_c_SOURCE_DIR}/src/parser.c)
if(EXISTS ${ts_c_SOURCE_DIR}/src/scanner.c)
  list(APPEND ts_c_sources ${ts_c_SOURCE_DIR}/src/scanner.c)
endif()

add_library(pv_tp_ts_c STATIC ${ts_c_sources})
target_include_directories(pv_tp_ts_c PRIVATE ${ts_c_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_c PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_c PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_c PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_c PRIVATE -w)
endif()
