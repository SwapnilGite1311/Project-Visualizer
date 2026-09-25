FetchContent_Declare(ts_csharp
  URL https://github.com/tree-sitter/tree-sitter-c-sharp/archive/refs/tags/v0.23.1.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_csharp)

set(ts_csharp_sources ${ts_csharp_SOURCE_DIR}/src/parser.c)
if(EXISTS ${ts_csharp_SOURCE_DIR}/src/scanner.c)
  list(APPEND ts_csharp_sources ${ts_csharp_SOURCE_DIR}/src/scanner.c)
endif()

add_library(pv_tp_ts_csharp STATIC ${ts_csharp_sources})
target_include_directories(pv_tp_ts_csharp PRIVATE ${ts_csharp_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_csharp PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_csharp PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_csharp PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_csharp PRIVATE -w)
endif()
