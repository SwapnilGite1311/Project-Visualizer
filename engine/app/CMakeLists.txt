pv_generate_registry(${CMAKE_CURRENT_BINARY_DIR}/registry_gen.cpp)
add_executable(pv-engine main.cpp ${CMAKE_CURRENT_BINARY_DIR}/registry_gen.cpp)
get_property(pv_module_targets GLOBAL PROPERTY PV_MODULE_TARGETS)
target_link_libraries(pv-engine PRIVATE ${pv_module_targets})
