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
set(FONT_ASSET_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../assets/SmthJedi)
file(GLOB_RECURSE FONT_ASSET_PATHS RELATIVE "${FONT_ASSET_DIR}" "${FONT_ASSET_DIR}/*")
set(FONT_HEADER "#pragma once\nstatic constexpr const char* kFontAssetPaths[] = {\n")
foreach(FONT_PATH ${FONT_ASSET_PATHS})
    if(NOT IS_DIRECTORY "${FONT_ASSET_DIR}/${FONT_PATH}")
        string(REPLACE "\\" "/" FONT_PATH "${FONT_PATH}")
        string(APPEND FONT_HEADER "    \"${FONT_PATH}\",\n")
    endif()
endforeach()
string(APPEND FONT_HEADER "};\nstatic constexpr int kFontAssetPathCount = sizeof(kFontAssetPaths) / sizeof(kFontAssetPaths[0]);\n")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/font_assets.h" "${FONT_HEADER}")

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
