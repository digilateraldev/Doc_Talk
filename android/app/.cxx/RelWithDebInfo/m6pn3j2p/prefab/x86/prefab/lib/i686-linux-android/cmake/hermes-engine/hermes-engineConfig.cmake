if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/digiLATERAL12/.gradle/caches/8.13/transforms/637946134142fd2c354dfff75b15ae5f/transformed/hermes-android-250829098.0.10-release/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/digiLATERAL12/.gradle/caches/8.13/transforms/637946134142fd2c354dfff75b15ae5f/transformed/hermes-android-250829098.0.10-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

