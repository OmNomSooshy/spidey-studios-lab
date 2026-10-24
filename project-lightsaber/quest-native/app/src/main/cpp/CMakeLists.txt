cmake_minimum_required(VERSION 3.22.1)
project(questxr)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenXR REQUIRED CONFIG)
find_library(AAUDIO_LIB aaudio REQUIRED)

add_library(native_app_glue STATIC
    ${ANDROID_NDK}/sources/android/native_app_glue/android_native_app_glue.c)
target_include_directories(native_app_glue PUBLIC
    ${ANDROID_NDK}/sources/android/native_app_glue)

set(LIGHTSABER_CORE ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../core)
set(APP_ASSET_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../assets)
file(GLOB_RECURSE BUNDLED_ASSET_PATHS RELATIVE "${APP_ASSET_DIR}" "${APP_ASSET_DIR}/*")
set(ASSET_HEADER "#pragma once\nstatic constexpr const char* kBundledAssetPaths[] = {\n")
foreach(ASSET_PATH ${BUNDLED_ASSET_PATHS})
    if(NOT IS_DIRECTORY "${APP_ASSET_DIR}/${ASSET_PATH}")
        string(REPLACE "\\" "/" ASSET_PATH "${ASSET_PATH}")
        string(APPEND ASSET_HEADER "    \"${ASSET_PATH}\",\n")
    endif()
endforeach()
string(APPEND ASSET_HEADER "};\nstatic constexpr int kBundledAssetPathCount = sizeof(kBundledAssetPaths) / sizeof(kBundledAssetPaths[0]);\n")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/bundled_assets.h" "${ASSET_HEADER}")

add_library(questxr SHARED
    main.cpp
    openxr_program.cpp
    ${LIGHTSABER_CORE}/src/saber_engine.cpp)
target_include_directories(questxr PRIVATE
    ${ANDROID_NDK}/sources/android/native_app_glue
    ${LIGHTSABER_CORE}/include
    ${CMAKE_CURRENT_BINARY_DIR})
target_compile_definitions(questxr PRIVATE
    XR_USE_PLATFORM_ANDROID=1
    XR_USE_GRAPHICS_API_OPENGL_ES=1)
set_target_properties(questxr PROPERTIES LINK_FLAGS "-u ANativeActivity_onCreate")
target_link_libraries(questxr
    native_app_glue
    OpenXR::openxr_loader
    ${AAUDIO_LIB}
    android EGL GLESv3 log)
