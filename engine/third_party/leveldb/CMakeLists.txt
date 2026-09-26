FetchContent_Declare(leveldb
  URL https://github.com/google/leveldb/archive/refs/tags/1.23.tar.gz
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
set(LEVELDB_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(LEVELDB_BUILD_BENCHMARKS OFF CACHE BOOL "" FORCE)
set(LEVELDB_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(leveldb)
set_target_properties(leveldb PROPERTIES POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(leveldb PRIVATE /W0)
else()
  target_compile_options(leveldb PRIVATE -w)
endif()
add_library(pv_tp_leveldb ALIAS leveldb)
