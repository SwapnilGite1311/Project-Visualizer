FetchContent_Declare(sqlite
  URL https://www.sqlite.org/2024/sqlite-amalgamation-3460100.zip
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  SOURCE_SUBDIR pv_no_cmake)
FetchContent_MakeAvailable(sqlite)
add_library(pv_tp_sqlite STATIC ${sqlite_SOURCE_DIR}/sqlite3.c)
target_include_directories(pv_tp_sqlite PUBLIC ${sqlite_SOURCE_DIR})
target_compile_definitions(pv_tp_sqlite PRIVATE SQLITE_THREADSAFE=1 SQLITE_OMIT_LOAD_EXTENSION)
set_target_properties(pv_tp_sqlite PROPERTIES C_STANDARD 11 POSITION_INDEPENDENT_CODE ON)
if(MSVC)
  target_compile_options(pv_tp_sqlite PRIVATE /W0)
else()
  target_compile_options(pv_tp_sqlite PRIVATE -w)
  find_package(Threads REQUIRED)
  target_link_libraries(pv_tp_sqlite PUBLIC Threads::Threads ${CMAKE_DL_LIBS})
endif()
