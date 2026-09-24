FetchContent_Declare(ts_python
  URL https://github.com/tree-sitter/tree-sitter-python/archive/refs/tags/v0.23.6.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_python)

add_library(pv_tp_ts_python STATIC
  ${ts_python_SOURCE_DIR}/src/parser.c
  ${ts_python_SOURCE_DIR}/src/scanner.c)
target_include_directories(pv_tp_ts_python PRIVATE ${ts_python_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_python PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_python PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_python PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_python PRIVATE -w)
endif()
