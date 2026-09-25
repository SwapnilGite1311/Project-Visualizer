FetchContent_Declare(ts_java
  URL https://github.com/tree-sitter/tree-sitter-java/archive/refs/tags/v0.23.5.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_java)

set(ts_java_sources ${ts_java_SOURCE_DIR}/src/parser.c)
if(EXISTS ${ts_java_SOURCE_DIR}/src/scanner.c)
  list(APPEND ts_java_sources ${ts_java_SOURCE_DIR}/src/scanner.c)
endif()

add_library(pv_tp_ts_java STATIC ${ts_java_sources})
target_include_directories(pv_tp_ts_java PRIVATE ${ts_java_SOURCE_DIR}/src)
target_link_libraries(pv_tp_ts_java PUBLIC pv_tp_tree_sitter)
set_target_properties(pv_tp_ts_java PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_ts_java PRIVATE /W0)
else()
  target_compile_options(pv_tp_ts_java PRIVATE -w)
endif()
