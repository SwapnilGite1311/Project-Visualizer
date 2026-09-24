FetchContent_Declare(tree_sitter
  URL https://github.com/tree-sitter/tree-sitter/archive/refs/tags/v0.24.4.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(tree_sitter)

add_library(pv_tp_tree_sitter STATIC ${tree_sitter_SOURCE_DIR}/lib/src/lib.c)
target_include_directories(pv_tp_tree_sitter
  PUBLIC ${tree_sitter_SOURCE_DIR}/lib/include
  PRIVATE ${tree_sitter_SOURCE_DIR}/lib/src)
set_target_properties(pv_tp_tree_sitter PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_tree_sitter PRIVATE /W0)
else()
  target_compile_options(pv_tp_tree_sitter PRIVATE -w)
  target_compile_definitions(pv_tp_tree_sitter PRIVATE _POSIX_C_SOURCE=200112L _DEFAULT_SOURCE)
endif()
