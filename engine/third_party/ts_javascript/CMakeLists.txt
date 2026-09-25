FetchContent_Declare(ts_javascript
  URL https://github.com/tree-sitter/tree-sitter-javascript/archive/refs/tags/v0.23.1.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_javascript)

add_library(pv_tp_ts_javascript STATIC
  ${ts_javascript_SOURCE_DIR}/src/parser.c
  ${ts_javascript_SOURCE_DIR}/src/scanner.c)
target_include_directories(pv_tp_ts_javascript PRIVATE ${ts_javascript_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_javascript PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_javascript PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_javascript PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_javascript PRIVATE -w)
endif()
