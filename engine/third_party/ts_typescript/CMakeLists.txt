# One repository, two grammars: TypeScript and TSX.
FetchContent_Declare(ts_typescript
  URL https://github.com/tree-sitter/tree-sitter-typescript/archive/refs/tags/v0.23.2.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(ts_typescript)

foreach(grammar typescript tsx)
  add_library(pv_tp_ts_${grammar} STATIC
    ${ts_typescript_SOURCE_DIR}/${grammar}/src/parser.c
    ${ts_typescript_SOURCE_DIR}/${grammar}/src/scanner.c)
  target_include_directories(pv_tp_ts_${grammar} PRIVATE ${ts_typescript_SOURCE_DIR}/${grammar}/src)
  target_link_libraries(pv_tp_ts_${grammar} PUBLIC pv_tp_tree_sitter)
  set_target_properties(pv_tp_ts_${grammar} PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
  if(MSVC)
    target_compile_options(pv_tp_ts_${grammar} PRIVATE /W0)
  else()
    target_compile_options(pv_tp_ts_${grammar} PRIVATE -w)
  endif()
endforeach()
