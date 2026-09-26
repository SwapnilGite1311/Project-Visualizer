pv_add_module(NAME fswatch DEPS pv_core pv_fs)
if(APPLE)
  target_link_libraries(pv_fswatch PUBLIC "-framework CoreServices")
endif()
