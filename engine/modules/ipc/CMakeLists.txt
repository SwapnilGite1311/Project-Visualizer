pv_add_module(NAME ipc DEPS pv_core pv_rpc pv_session TEST_DEPS pv_lang_python)
if(WIN32)
  target_link_libraries(pv_ipc PUBLIC ws2_32 advapi32)
endif()
