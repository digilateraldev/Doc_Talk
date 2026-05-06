if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/digiLATERAL12/.gradle/caches/8.13/transforms/d46296d6c53e606d477d973c961526a5/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/digiLATERAL12/.gradle/caches/8.13/transforms/d46296d6c53e606d477d973c961526a5/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

