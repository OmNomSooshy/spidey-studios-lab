#include "openxr_program.h"
#include "blade_palette.h"
#include "logger.h"
#include "font8x8.h"
#include "rounded_blade_mesh.h"

#include <android_native_app_glue.h>

#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl3.h>

#define XR_USE_PLATFORM_ANDROID 1
#define XR_USE_GRAPHICS_API_OPENGL_ES 1
#include <openxr/openxr.h>
#include <openxr/openxr_platform.h>

#include <array>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstring>
#include <fstream>
#include <string>
#include <vector>

namespace {

const char* XrResultStr(XrInstance instance, XrResult r) {
    static char buf[XR_MAX_RESULT_STRING_SIZE];
    if (instance != XR_NULL_HANDLE &&
        XR_SUCCEEDED(xrResultToString(instance, r, buf))) {
        return buf;
    }
    snprintf(buf, sizeof(buf), "XrResult(%d)", (int)r);
    return buf;
}

const char* StateName(XrSessionState s) {
    switch (s) {
        case XR_SESSION_STATE_IDLE: return "IDLE";
        case XR_SESSION_STATE_READY: return "READY";
        case XR_SESSION_STATE_SYNCHRONIZED: return "SYNC";
        case XR_SESSION_STATE_VISIBLE: return "VISIBLE";
        case XR_SESSION_STATE_FOCUSED: return "FOCUSED";
        case XR_SESSION_STATE_STOPPING: return "STOPPING";
        case XR_SESSION_STATE_EXITING: return "EXITING";
        case XR_SESSION_STATE_LOSS_PENDING: return "LOSS";
        default: return "UNKNOWN";
    }
}

}  // namespace

#define XR_CHECK(instance, expr)                                             \
    do {                                                                     \
        XrResult _r = (expr);                                                \
        if (XR_FAILED(_r)) {                                                 \
            LOGE("%s failed: %s (%s:%d)", #expr, XrResultStr(instance, _r),  \
                 __FILE__, __LINE__);                                        \
            return false;                                                    \
        }                                                                    \
    } while (0)

struct OpenXrProgram::Impl {
    android_app* app = nullptr;

    XrInstance instance = XR_NULL_HANDLE;
    XrSystemId system_id = XR_NULL_SYSTEM_ID;
    XrSession session = XR_NULL_HANDLE;
    XrSessionState session_state = XR_SESSION_STATE_UNKNOWN;

    XrSpace local_space = XR_NULL_HANDLE;  // XR_REFERENCE_SPACE_TYPE_LOCAL
    XrSpace view_space = XR_NULL_HANDLE;   // XR_REFERENCE_SPACE_TYPE_VIEW

    // EGL objects (needed only to create a valid GLES graphics binding).
    EGLDisplay egl_display = EGL_NO_DISPLAY;
    EGLConfig egl_config = nullptr;
    EGLContext egl_context = EGL_NO_CONTEXT;
    EGLSurface egl_surface = EGL_NO_SURFACE;

    // Actions.
    XrActionSet action_set = XR_NULL_HANDLE;
    XrPath hand_path[2] = {XR_NULL_PATH, XR_NULL_PATH};  // 0=left, 1=right

    XrAction grip_pose_action = XR_NULL_HANDLE;
    XrAction aim_pose_action = XR_NULL_HANDLE;
    XrSpace grip_space[2] = {XR_NULL_HANDLE, XR_NULL_HANDLE};
    XrSpace aim_space[2] = {XR_NULL_HANDLE, XR_NULL_HANDLE};

    XrAction trigger_action = XR_NULL_HANDLE;
    XrAction squeeze_action = XR_NULL_HANDLE;
    XrAction thumbstick_action = XR_NULL_HANDLE;
    XrAction thumbclick_action = XR_NULL_HANDLE;
    XrAction primary_action = XR_NULL_HANDLE;
    XrAction secondary_action = XR_NULL_HANDLE;
    XrAction menu_action = XR_NULL_HANDLE;

    std::chrono::steady_clock::time_point start_time;
    uint64_t seq = 0;
    uint32_t recenter_count = 0;

    bool frame_should_render = false;

    // --- Holographic workshop (floating quad layer) ---
    static constexpr int32_t HUD_W = 768;
    static constexpr int32_t HUD_H = 512;
    XrSwapchain hud_swapchain = XR_NULL_HANDLE;
    std::vector<XrSwapchainImageOpenGLESKHR> hud_images;
    std::vector<uint8_t> hud_pixels;
    std::string local_ip = "?";
    std::string dest_ip = "?";
    int dest_port = 0;
    bool unicast = false;

    // World-locked HUD pose (captured once in front of the initial gaze).
    XrPosef hud_pose{{0, 0, 0, 1}, {0, 0, 0}};
    bool hud_pose_valid = false;
    static constexpr float HUD_QUAD_W = 0.75f;  // metres (see EndFrame quad.size)
    static constexpr float HUD_QUAD_H = 0.5f;

    // --- Controller aim rays to the HUD surface (thin quad "beams") ---
    static constexpr int32_t BEAM_W = 32;   // texture: left half = left hand
    static constexpr int32_t BEAM_H = 16;
    XrSwapchain beam_swapchain = XR_NULL_HANDLE;
    std::vector<XrSwapchainImageOpenGLESKHR> beam_images;
    bool beam_filled = false;
    int64_t swapchain_format = 0;
    float ray_len[2] = {1.5f, 1.5f};     // metres, to the HUD plane when hit
    bool ray_valid[2] = {false, false};  // aim pose usable this frame
    bool ray_plane[2] = {false, false};  // ray reaches the HUD plane
    bool ray_hit[2] = {false, false};    // ...and lands inside the panel
    int ray_px[2] = {0, 0}, ray_py[2] = {0, 0};  // HUD pixel of the hit

    // --- Passthrough (XR_FB_passthrough) ---
    XrPassthroughFB passthrough = XR_NULL_HANDLE;
    XrPassthroughLayerFB passthrough_layer = XR_NULL_HANDLE;
    PFN_xrCreatePassthroughFB pfnCreatePassthroughFB = nullptr;
    PFN_xrDestroyPassthroughFB pfnDestroyPassthroughFB = nullptr;
    PFN_xrPassthroughStartFB pfnPassthroughStartFB = nullptr;
    PFN_xrCreatePassthroughLayerFB pfnCreatePassthroughLayerFB = nullptr;
    PFN_xrDestroyPassthroughLayerFB pfnDestroyPassthroughLayerFB = nullptr;
    PFN_xrPassthroughLayerResumeFB pfnPassthroughLayerResumeFB = nullptr;
    bool passthrough_ready = false;

    XrSwapchain scene_swapchain = XR_NULL_HANDLE;
    std::vector<XrSwapchainImageOpenGLESKHR> scene_images;
    std::vector<XrViewConfigurationView> view_config;
    std::vector<XrCompositionLayerProjectionView> projection_views;
    uint32_t scene_width=0,scene_height=0;
    GLuint scene_fbo=0, scene_vao=0, scene_depth = 0, scene_program = 0, hilt_vbo = 0;
    GLuint blade_vbo=0, core_blade_vbo=0;
    GLsizei blade_vertex_count=0, core_blade_vertex_count=0;
    GLint scene_mvp = -1, scene_mv=-1, scene_color = -1, scene_unlit=-1;
    struct MeshRange { uint32_t first=0, count=0; float r=1,g=1,b=1,metal=0,rough=1; };
    std::vector<MeshRange> hilt_ranges;
    uint32_t hilt_vertices = 0;
    std::string loaded_hilt_asset;
    bool scene_ready = false;

    bool InitLoader();
    bool CreateInstance();
    bool InitSystem();
    bool InitEgl();
    bool CreateSession();
    bool CreateSpaces();
    bool CreateActions();
    bool SuggestBindings();
    bool AttachActionSet();
    bool CreateHudSwapchain();
    void FillHudPixels(const TrackingFrame& f);
    void RenderHud(const TrackingFrame& f);
    bool CreateBeamSwapchain();
    bool CreateSceneSwapchain();
    bool LoadHiltMesh(const std::string& relative_path);
    bool CreateScenePipeline();
    bool RenderScene(const TrackingFrame& f, XrTime time, XrCompositionLayerProjection* layer);
    void FillBeamOnce();
    void ComputeHudRays(const TrackingFrame& f);
    bool CreatePassthrough();

    XrPath StrToPath(const char* s) {
        XrPath p = XR_NULL_PATH;
        xrStringToPath(instance, s, &p);
        return p;
    }

    void LocateSpace(XrSpace space, XrTime time, Pose* out) {
        if (space == XR_NULL_HANDLE) return;
        XrSpaceVelocity velocity{XR_TYPE_SPACE_VELOCITY};
        XrSpaceLocation loc{XR_TYPE_SPACE_LOCATION};
        loc.next = &velocity;
        if (XR_FAILED(xrLocateSpace(space, local_space, time, &loc))) return;
        const bool pos_valid = (loc.locationFlags & XR_SPACE_LOCATION_POSITION_VALID_BIT) != 0;
        const bool rot_valid = (loc.locationFlags & XR_SPACE_LOCATION_ORIENTATION_VALID_BIT) != 0;
        const bool pos_tracked = (loc.locationFlags & XR_SPACE_LOCATION_POSITION_TRACKED_BIT) != 0;
        const bool rot_tracked = (loc.locationFlags & XR_SPACE_LOCATION_ORIENTATION_TRACKED_BIT) != 0;
        out->valid = pos_valid && rot_valid;
        out->active = pos_tracked && rot_tracked;
        out->px = loc.pose.position.x;
        out->py = loc.pose.position.y;
        out->pz = loc.pose.position.z;
        out->qx = loc.pose.orientation.x;
        out->qy = loc.pose.orientation.y;
        out->qz = loc.pose.orientation.z;
        out->qw = loc.pose.orientation.w;
        out->angular_velocity_valid =
            (velocity.velocityFlags & XR_SPACE_VELOCITY_ANGULAR_VALID_BIT) != 0;
        if (out->angular_velocity_valid) {
            out->angular_x_rad_s = velocity.angularVelocity.x;
            out->angular_y_rad_s = velocity.angularVelocity.y;
            out->angular_z_rad_s = velocity.angularVelocity.z;
        }
    }

    float ReadFloat(XrAction action, int hand) {
        XrActionStateGetInfo gi{XR_TYPE_ACTION_STATE_GET_INFO};
        gi.action = action;
        gi.subactionPath = hand_path[hand];
        XrActionStateFloat st{XR_TYPE_ACTION_STATE_FLOAT};
        if (XR_FAILED(xrGetActionStateFloat(session, &gi, &st))) return 0.0f;
        return st.isActive ? st.currentState : 0.0f;
    }

    bool ReadBool(XrAction action, int hand) {
        XrActionStateGetInfo gi{XR_TYPE_ACTION_STATE_GET_INFO};
        gi.action = action;
        gi.subactionPath = hand_path[hand];
        XrActionStateBoolean st{XR_TYPE_ACTION_STATE_BOOLEAN};
        if (XR_FAILED(xrGetActionStateBoolean(session, &gi, &st))) return false;
        return st.isActive && st.currentState;
    }

    void ReadStick(XrAction action, int hand, float* x, float* y) {
        XrActionStateGetInfo gi{XR_TYPE_ACTION_STATE_GET_INFO};
        gi.action = action;
        gi.subactionPath = hand_path[hand];
        XrActionStateVector2f st{XR_TYPE_ACTION_STATE_VECTOR2F};
        if (XR_FAILED(xrGetActionStateVector2f(session, &gi, &st)) || !st.isActive) {
            *x = 0.0f;
            *y = 0.0f;
            return;
        }
        *x = st.currentState.x;
        *y = st.currentState.y;
    }
};

OpenXrProgram::OpenXrProgram() : impl_(new Impl()) {}
OpenXrProgram::~OpenXrProgram() { Destroy(); delete impl_; impl_ = nullptr; }

bool OpenXrProgram::Impl::InitLoader() {
    PFN_xrInitializeLoaderKHR xrInitializeLoaderKHR = nullptr;
    if (XR_FAILED(xrGetInstanceProcAddr(
            XR_NULL_HANDLE, "xrInitializeLoaderKHR",
            reinterpret_cast<PFN_xrVoidFunction*>(&xrInitializeLoaderKHR))) ||
        xrInitializeLoaderKHR == nullptr) {
        LOGE("xrInitializeLoaderKHR not available");
        return false;
    }
    XrLoaderInitInfoAndroidKHR init{XR_TYPE_LOADER_INIT_INFO_ANDROID_KHR};
    init.applicationVM = app->activity->vm;
    init.applicationContext = app->activity->clazz;
    XR_CHECK(XR_NULL_HANDLE,
             xrInitializeLoaderKHR(reinterpret_cast<const XrLoaderInitInfoBaseHeaderKHR*>(&init)));
    return true;
}

bool OpenXrProgram::Impl::CreateInstance() {
    const char* extensions[] = {
        XR_KHR_OPENGL_ES_ENABLE_EXTENSION_NAME,
        XR_KHR_ANDROID_CREATE_INSTANCE_EXTENSION_NAME,
        XR_FB_PASSTHROUGH_EXTENSION_NAME,
    };

    XrInstanceCreateInfoAndroidKHR android_ci{XR_TYPE_INSTANCE_CREATE_INFO_ANDROID_KHR};
    android_ci.applicationVM = app->activity->vm;
    android_ci.applicationActivity = app->activity->clazz;

    XrInstanceCreateInfo ci{XR_TYPE_INSTANCE_CREATE_INFO};
    ci.next = &android_ci;
    ci.enabledExtensionCount = sizeof(extensions) / sizeof(extensions[0]);
    ci.enabledExtensionNames = extensions;
    strcpy(ci.applicationInfo.applicationName, "Project Lightsaber");
    ci.applicationInfo.applicationVersion = 1;
    strcpy(ci.applicationInfo.engineName, "none");
    ci.applicationInfo.apiVersion = XR_CURRENT_API_VERSION;

    XR_CHECK(XR_NULL_HANDLE, xrCreateInstance(&ci, &instance));

    XrInstanceProperties props{XR_TYPE_INSTANCE_PROPERTIES};
    if (XR_SUCCEEDED(xrGetInstanceProperties(instance, &props))) {
        LOGI("OpenXR runtime: %s (v%u.%u.%u)", props.runtimeName,
             XR_VERSION_MAJOR(props.runtimeVersion),
             XR_VERSION_MINOR(props.runtimeVersion),
             XR_VERSION_PATCH(props.runtimeVersion));
    }
    return true;
}

bool OpenXrProgram::Impl::InitSystem() {
    XrSystemGetInfo gi{XR_TYPE_SYSTEM_GET_INFO};
    gi.formFactor = XR_FORM_FACTOR_HEAD_MOUNTED_DISPLAY;
    XR_CHECK(instance, xrGetSystem(instance, &gi, &system_id));
    return true;
}

bool OpenXrProgram::Impl::InitEgl() {
    egl_display = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    if (egl_display == EGL_NO_DISPLAY) {
        LOGE("eglGetDisplay failed");
        return false;
    }
    if (!eglInitialize(egl_display, nullptr, nullptr)) {
        LOGE("eglInitialize failed");
        return false;
    }

    const EGLint cfg_attrs[] = {
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT_KHR,
        EGL_SURFACE_TYPE, EGL_PBUFFER_BIT,
        EGL_RED_SIZE, 8, EGL_GREEN_SIZE, 8, EGL_BLUE_SIZE, 8, EGL_ALPHA_SIZE, 8,
        EGL_DEPTH_SIZE, 0, EGL_STENCIL_SIZE, 0,
        EGL_NONE};
    EGLint num_cfg = 0;
    if (!eglChooseConfig(egl_display, cfg_attrs, &egl_config, 1, &num_cfg) || num_cfg == 0) {
        LOGE("eglChooseConfig failed");
        return false;
    }

    const EGLint ctx_attrs[] = {EGL_CONTEXT_CLIENT_VERSION, 3, EGL_NONE};
    egl_context = eglCreateContext(egl_display, egl_config, EGL_NO_CONTEXT, ctx_attrs);
    if (egl_context == EGL_NO_CONTEXT) {
        LOGE("eglCreateContext failed");
        return false;
    }

    const EGLint surf_attrs[] = {EGL_WIDTH, 16, EGL_HEIGHT, 16, EGL_NONE};
    egl_surface = eglCreatePbufferSurface(egl_display, egl_config, surf_attrs);
    if (egl_surface == EGL_NO_SURFACE) {
        LOGE("eglCreatePbufferSurface failed");
        return false;
    }

    if (!eglMakeCurrent(egl_display, egl_surface, egl_surface, egl_context)) {
        LOGE("eglMakeCurrent failed");
        return false;
    }
    return true;
}

bool OpenXrProgram::Impl::CreateSession() {
    // The runtime requires the graphics requirements query before session
    // creation, even though we submit no layers.
    PFN_xrGetOpenGLESGraphicsRequirementsKHR getReq = nullptr;
    XR_CHECK(instance, xrGetInstanceProcAddr(
                           instance, "xrGetOpenGLESGraphicsRequirementsKHR",
                           reinterpret_cast<PFN_xrVoidFunction*>(&getReq)));
    XrGraphicsRequirementsOpenGLESKHR req{XR_TYPE_GRAPHICS_REQUIREMENTS_OPENGL_ES_KHR};
    XR_CHECK(instance, getReq(instance, system_id, &req));

    XrGraphicsBindingOpenGLESAndroidKHR binding{XR_TYPE_GRAPHICS_BINDING_OPENGL_ES_ANDROID_KHR};
    binding.display = egl_display;
    binding.config = egl_config;
    binding.context = egl_context;

    XrSessionCreateInfo ci{XR_TYPE_SESSION_CREATE_INFO};
    ci.next = &binding;
    ci.systemId = system_id;
    XR_CHECK(instance, xrCreateSession(instance, &ci, &session));
    return true;
}

bool OpenXrProgram::Impl::CreateSpaces() {
    XrReferenceSpaceCreateInfo local{XR_TYPE_REFERENCE_SPACE_CREATE_INFO};
    local.referenceSpaceType = XR_REFERENCE_SPACE_TYPE_LOCAL;
    local.poseInReferenceSpace.orientation.w = 1.0f;
    XR_CHECK(instance, xrCreateReferenceSpace(session, &local, &local_space));

    XrReferenceSpaceCreateInfo view{XR_TYPE_REFERENCE_SPACE_CREATE_INFO};
    view.referenceSpaceType = XR_REFERENCE_SPACE_TYPE_VIEW;
    view.poseInReferenceSpace.orientation.w = 1.0f;
    XR_CHECK(instance, xrCreateReferenceSpace(session, &view, &view_space));
    return true;
}

bool OpenXrProgram::Impl::CreateActions() {
    hand_path[0] = StrToPath("/user/hand/left");
    hand_path[1] = StrToPath("/user/hand/right");

    XrActionSetCreateInfo asci{XR_TYPE_ACTION_SET_CREATE_INFO};
    strcpy(asci.actionSetName, "tracking");
    strcpy(asci.localizedActionSetName, "Tracking");
    asci.priority = 0;
    XR_CHECK(instance, xrCreateActionSet(instance, &asci, &action_set));

    auto make = [&](const char* name, const char* localized,
                    XrActionType type, XrAction* out) -> bool {
        XrActionCreateInfo ci{XR_TYPE_ACTION_CREATE_INFO};
        strcpy(ci.actionName, name);
        strcpy(ci.localizedActionName, localized);
        ci.actionType = type;
        ci.countSubactionPaths = 2;
        ci.subactionPaths = hand_path;
        return XR_SUCCEEDED(xrCreateAction(action_set, &ci, out));
    };

    if (!make("grip_pose", "Grip Pose", XR_ACTION_TYPE_POSE_INPUT, &grip_pose_action)) return false;
    if (!make("aim_pose", "Aim Pose", XR_ACTION_TYPE_POSE_INPUT, &aim_pose_action)) return false;
    if (!make("trigger", "Trigger", XR_ACTION_TYPE_FLOAT_INPUT, &trigger_action)) return false;
    if (!make("squeeze", "Squeeze", XR_ACTION_TYPE_FLOAT_INPUT, &squeeze_action)) return false;
    if (!make("thumbstick", "Thumbstick", XR_ACTION_TYPE_VECTOR2F_INPUT, &thumbstick_action)) return false;
    if (!make("thumbclick", "Thumbstick Click", XR_ACTION_TYPE_BOOLEAN_INPUT, &thumbclick_action)) return false;
    if (!make("primary", "Primary Button", XR_ACTION_TYPE_BOOLEAN_INPUT, &primary_action)) return false;
    if (!make("secondary", "Secondary Button", XR_ACTION_TYPE_BOOLEAN_INPUT, &secondary_action)) return false;
    if (!make("menu", "Menu Button", XR_ACTION_TYPE_BOOLEAN_INPUT, &menu_action)) return false;

    // Create one action space per hand for grip and aim poses.
    for (int h = 0; h < 2; ++h) {
        XrActionSpaceCreateInfo sci{XR_TYPE_ACTION_SPACE_CREATE_INFO};
        sci.poseInActionSpace.orientation.w = 1.0f;
        sci.subactionPath = hand_path[h];

        sci.action = grip_pose_action;
        XR_CHECK(instance, xrCreateActionSpace(session, &sci, &grip_space[h]));

        sci.action = aim_pose_action;
        XR_CHECK(instance, xrCreateActionSpace(session, &sci, &aim_space[h]));
    }
    return true;
}

bool OpenXrProgram::Impl::SuggestBindings() {
    struct B { XrAction action; const char* path; };

    // Oculus Touch controller — full set.
    {
        std::vector<XrActionSuggestedBinding> b;
        auto add = [&](XrAction a, const char* p) {
            b.push_back({a, StrToPath(p)});
        };
        add(grip_pose_action, "/user/hand/left/input/grip/pose");
        add(grip_pose_action, "/user/hand/right/input/grip/pose");
        add(aim_pose_action, "/user/hand/left/input/aim/pose");
        add(aim_pose_action, "/user/hand/right/input/aim/pose");
        add(trigger_action, "/user/hand/left/input/trigger/value");
        add(trigger_action, "/user/hand/right/input/trigger/value");
        add(squeeze_action, "/user/hand/left/input/squeeze/value");
        add(squeeze_action, "/user/hand/right/input/squeeze/value");
        add(thumbstick_action, "/user/hand/left/input/thumbstick");
        add(thumbstick_action, "/user/hand/right/input/thumbstick");
        add(thumbclick_action, "/user/hand/left/input/thumbstick/click");
        add(thumbclick_action, "/user/hand/right/input/thumbstick/click");
        add(primary_action, "/user/hand/left/input/x/click");
        add(primary_action, "/user/hand/right/input/a/click");
        add(secondary_action, "/user/hand/left/input/y/click");
        add(secondary_action, "/user/hand/right/input/b/click");
        add(menu_action, "/user/hand/left/input/menu/click");

        XrInteractionProfileSuggestedBinding s{XR_TYPE_INTERACTION_PROFILE_SUGGESTED_BINDING};
        s.interactionProfile = StrToPath("/interaction_profiles/oculus/touch_controller");
        s.suggestedBindings = b.data();
        s.countSuggestedBindings = (uint32_t)b.size();
        XR_CHECK(instance, xrSuggestInteractionProfileBindings(instance, &s));
    }

    // KHR simple controller — fallback so poses/trigger/menu still work if the
    // runtime falls back to it.
    {
        std::vector<XrActionSuggestedBinding> b;
        auto add = [&](XrAction a, const char* p) {
            b.push_back({a, StrToPath(p)});
        };
        add(grip_pose_action, "/user/hand/left/input/grip/pose");
        add(grip_pose_action, "/user/hand/right/input/grip/pose");
        add(aim_pose_action, "/user/hand/left/input/aim/pose");
        add(aim_pose_action, "/user/hand/right/input/aim/pose");
        add(primary_action, "/user/hand/left/input/select/click");
        add(primary_action, "/user/hand/right/input/select/click");
        add(menu_action, "/user/hand/left/input/menu/click");
        add(menu_action, "/user/hand/right/input/menu/click");

        XrInteractionProfileSuggestedBinding s{XR_TYPE_INTERACTION_PROFILE_SUGGESTED_BINDING};
        s.interactionProfile = StrToPath("/interaction_profiles/khr/simple_controller");
        s.suggestedBindings = b.data();
        s.countSuggestedBindings = (uint32_t)b.size();
        XR_CHECK(instance, xrSuggestInteractionProfileBindings(instance, &s));
    }
    return true;
}

bool OpenXrProgram::Impl::AttachActionSet() {
    XrSessionActionSetsAttachInfo ai{XR_TYPE_SESSION_ACTION_SETS_ATTACH_INFO};
    ai.countActionSets = 1;
    ai.actionSets = &action_set;
    XR_CHECK(instance, xrAttachSessionActionSets(session, &ai));
    return true;
}

bool OpenXrProgram::Impl::CreatePassthrough() {
    auto load = [&](const char* name, PFN_xrVoidFunction* out) -> bool {
        return XR_SUCCEEDED(
            xrGetInstanceProcAddr(instance, name, out));
    };
    if (!load("xrCreatePassthroughFB",
              reinterpret_cast<PFN_xrVoidFunction*>(&pfnCreatePassthroughFB)) ||
        !load("xrDestroyPassthroughFB",
              reinterpret_cast<PFN_xrVoidFunction*>(&pfnDestroyPassthroughFB)) ||
        !load("xrPassthroughStartFB",
              reinterpret_cast<PFN_xrVoidFunction*>(&pfnPassthroughStartFB)) ||
        !load("xrCreatePassthroughLayerFB",
              reinterpret_cast<PFN_xrVoidFunction*>(&pfnCreatePassthroughLayerFB)) ||
        !load("xrDestroyPassthroughLayerFB",
              reinterpret_cast<PFN_xrVoidFunction*>(&pfnDestroyPassthroughLayerFB)) ||
        !load("xrPassthroughLayerResumeFB",
              reinterpret_cast<PFN_xrVoidFunction*>(&pfnPassthroughLayerResumeFB))) {
        LOGW("Passthrough entry points unavailable.");
        return false;
    }

    XrPassthroughCreateInfoFB pci{XR_TYPE_PASSTHROUGH_CREATE_INFO_FB};
    XR_CHECK(instance, pfnCreatePassthroughFB(session, &pci, &passthrough));

    XrPassthroughLayerCreateInfoFB lci{XR_TYPE_PASSTHROUGH_LAYER_CREATE_INFO_FB};
    lci.passthrough = passthrough;
    lci.purpose = XR_PASSTHROUGH_LAYER_PURPOSE_RECONSTRUCTION_FB;
    XR_CHECK(instance,
             pfnCreatePassthroughLayerFB(session, &lci, &passthrough_layer));

    XR_CHECK(instance, pfnPassthroughStartFB(passthrough));
    XR_CHECK(instance, pfnPassthroughLayerResumeFB(passthrough_layer));
    LOGI("Passthrough started.");
    return true;
}

bool OpenXrProgram::Impl::CreateHudSwapchain() {
    uint32_t fmt_count = 0;
    xrEnumerateSwapchainFormats(session, 0, &fmt_count, nullptr);
    std::vector<int64_t> formats(fmt_count);
    if (fmt_count > 0) {
        xrEnumerateSwapchainFormats(session, fmt_count, &fmt_count, formats.data());
    }
    int64_t chosen = GL_RGBA8;
    bool has_rgba8 = false, has_srgb = false;
    for (int64_t f : formats) {
        if (f == GL_RGBA8) has_rgba8 = true;
        if (f == GL_SRGB8_ALPHA8) has_srgb = true;
    }
    if (has_rgba8) chosen = GL_RGBA8;
    else if (has_srgb) chosen = GL_SRGB8_ALPHA8;
    else if (!formats.empty()) chosen = formats[0];
    swapchain_format = chosen;

    XrSwapchainCreateInfo ci{XR_TYPE_SWAPCHAIN_CREATE_INFO};
    ci.usageFlags = XR_SWAPCHAIN_USAGE_SAMPLED_BIT |
                    XR_SWAPCHAIN_USAGE_COLOR_ATTACHMENT_BIT;
    ci.format = chosen;
    ci.sampleCount = 1;
    ci.width = HUD_W;
    ci.height = HUD_H;
    ci.faceCount = 1;
    ci.arraySize = 1;
    ci.mipCount = 1;
    XR_CHECK(instance, xrCreateSwapchain(session, &ci, &hud_swapchain));

    uint32_t img_count = 0;
    xrEnumerateSwapchainImages(hud_swapchain, 0, &img_count, nullptr);
    hud_images.assign(img_count, {XR_TYPE_SWAPCHAIN_IMAGE_OPENGL_ES_KHR});
    xrEnumerateSwapchainImages(
        hud_swapchain, img_count, &img_count,
        reinterpret_cast<XrSwapchainImageBaseHeader*>(hud_images.data()));

    hud_pixels.assign((size_t)HUD_W * HUD_H * 4, 0);
    LOGI("HUD swapchain created (%dx%d, %u images, fmt=0x%llx).", HUD_W, HUD_H,
         img_count, (unsigned long long)chosen);
    return true;
}

namespace {

struct V3 { float x, y, z; };
struct Mat4 { float v[16]{}; };
constexpr float kPi=3.14159265358979323846f;

inline V3 Sub(V3 a, V3 b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
inline float Dot(V3 a, V3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
inline V3 Cross(V3 a, V3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
inline V3 Scale(V3 a, float s) { return {a.x * s, a.y * s, a.z * s}; }
inline V3 Add(V3 a, V3 b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
inline float Len(V3 a) { return std::sqrt(Dot(a, a)); }
inline V3 Norm(V3 a) {
    float l = Len(a);
    return l > 1e-6f ? Scale(a, 1.0f / l) : V3{0, 0, 0};
}

// Rotate a vector by a quaternion: v' = v + 2*cross(q.xyz, cross(q.xyz, v) + w*v)
inline V3 QRot(const XrQuaternionf& q, V3 v) {
    V3 u{q.x, q.y, q.z};
    V3 t = Cross(u, Add(Cross(u, v), Scale(v, q.w)));
    return Add(v, Scale(t, 2.0f));
}

// Quaternion from an orthonormal right-handed basis (matrix columns X, Y, Z).
XrQuaternionf QuatFromCols(V3 X, V3 Y, V3 Z) {
    float m00 = X.x, m01 = Y.x, m02 = Z.x;
    float m10 = X.y, m11 = Y.y, m12 = Z.y;
    float m20 = X.z, m21 = Y.z, m22 = Z.z;
    XrQuaternionf q;
    float tr = m00 + m11 + m22;
    if (tr > 0.0f) {
        float s = std::sqrt(tr + 1.0f) * 2.0f;
        q.w = 0.25f * s;
        q.x = (m21 - m12) / s;
        q.y = (m02 - m20) / s;
        q.z = (m10 - m01) / s;
    } else if (m00 > m11 && m00 > m22) {
        float s = std::sqrt(1.0f + m00 - m11 - m22) * 2.0f;
        q.w = (m21 - m12) / s;
        q.x = 0.25f * s;
        q.y = (m01 + m10) / s;
        q.z = (m02 + m20) / s;
    } else if (m11 > m22) {
        float s = std::sqrt(1.0f + m11 - m00 - m22) * 2.0f;
        q.w = (m02 - m20) / s;
        q.x = (m01 + m10) / s;
        q.y = 0.25f * s;
        q.z = (m12 + m21) / s;
    } else {
        float s = std::sqrt(1.0f + m22 - m00 - m11) * 2.0f;
        q.w = (m10 - m01) / s;
        q.x = (m02 + m20) / s;
        q.y = (m12 + m21) / s;
        q.z = 0.25f * s;
    }
    return q;
}

}  // namespace

bool OpenXrProgram::Impl::CreateBeamSwapchain() {
    XrSwapchainCreateInfo ci{XR_TYPE_SWAPCHAIN_CREATE_INFO};
    ci.usageFlags = XR_SWAPCHAIN_USAGE_SAMPLED_BIT |
                    XR_SWAPCHAIN_USAGE_COLOR_ATTACHMENT_BIT;
    ci.format = swapchain_format ? swapchain_format : GL_RGBA8;
    ci.sampleCount = 1;
    ci.width = BEAM_W;
    ci.height = BEAM_H;
    ci.faceCount = 1;
    ci.arraySize = 1;
    ci.mipCount = 1;
    XR_CHECK(instance, xrCreateSwapchain(session, &ci, &beam_swapchain));

    uint32_t img_count = 0;
    xrEnumerateSwapchainImages(beam_swapchain, 0, &img_count, nullptr);
    beam_images.assign(img_count, {XR_TYPE_SWAPCHAIN_IMAGE_OPENGL_ES_KHR});
    xrEnumerateSwapchainImages(
        beam_swapchain, img_count, &img_count,
        reinterpret_cast<XrSwapchainImageBaseHeader*>(beam_images.data()));
    LOGI("Beam swapchain created (%dx%d, %u images).", BEAM_W, BEAM_H, img_count);
    return true;
}

namespace {
GLuint CompileShader(GLenum type,const char* source) {
    GLuint shader=glCreateShader(type);glShaderSource(shader,1,&source,nullptr);glCompileShader(shader);
    GLint ok=0;glGetShaderiv(shader,GL_COMPILE_STATUS,&ok);if(!ok){char log[1024]{};glGetShaderInfoLog(shader,sizeof(log),nullptr,log);LOGE("Scene shader compile failed: %s",log);glDeleteShader(shader);return 0;}return shader;
}
Mat4 Identity4(){Mat4 m{};m.v[0]=m.v[5]=m.v[10]=m.v[15]=1;return m;}
Mat4 Mul4(const Mat4&a,const Mat4&b){Mat4 r{};for(int c=0;c<4;c++)for(int row=0;row<4;row++)for(int k=0;k<4;k++)r.v[c*4+row]+=a.v[k*4+row]*b.v[c*4+k];return r;}
Mat4 Translate4(float x,float y,float z){Mat4 m=Identity4();m.v[12]=x;m.v[13]=y;m.v[14]=z;return m;}
Mat4 Scale4(float x,float y,float z){Mat4 m=Identity4();m.v[0]=x;m.v[5]=y;m.v[10]=z;return m;}
Mat4 Quat4(const XrQuaternionf&q){Mat4 m=Identity4();float x=q.x,y=q.y,z=q.z,w=q.w;m.v[0]=1-2*(y*y+z*z);m.v[1]=2*(x*y+z*w);m.v[2]=2*(x*z-y*w);m.v[4]=2*(x*y-z*w);m.v[5]=1-2*(x*x+z*z);m.v[6]=2*(y*z+x*w);m.v[8]=2*(x*z+y*w);m.v[9]=2*(y*z-x*w);m.v[10]=1-2*(x*x+y*y);return m;}
Mat4 PoseMatrix(const XrPosef&p){return Mul4(Translate4(p.position.x,p.position.y,p.position.z),Quat4(p.orientation));}
Mat4 ViewMatrix(const XrPosef&p){XrQuaternionf q{-p.orientation.x,-p.orientation.y,-p.orientation.z,p.orientation.w};return Mul4(Quat4(q),Translate4(-p.position.x,-p.position.y,-p.position.z));}
Mat4 ProjectionMatrix(const XrFovf&f,float near_z,float far_z){float l=std::tan(f.angleLeft),r=std::tan(f.angleRight),d=std::tan(f.angleDown),u=std::tan(f.angleUp);Mat4 m{};m.v[0]=2/(r-l);m.v[8]=(r+l)/(r-l);m.v[5]=2/(u-d);m.v[9]=(u+d)/(u-d);m.v[10]=-(far_z+near_z)/(far_z-near_z);m.v[14]=-2*far_z*near_z/(far_z-near_z);m.v[11]=-1;return m;}
void SetUniformMat(GLint loc,const Mat4&m){glUniformMatrix4fv(loc,1,GL_FALSE,m.v);}
}

bool OpenXrProgram::Impl::CreateScenePipeline(){
    static const char* vs="#version 300 es\nlayout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModelView;out vec3 vNormal;void main(){gl_Position=uMvp*vec4(aPos,1.0);vNormal=mat3(uModelView)*aNormal;}";
    static const char* fs="#version 300 es\nprecision mediump float;in vec3 vNormal;uniform vec4 uColor;uniform float uUnlit;out vec4 frag;void main(){float l=mix(0.32+0.68*max(dot(normalize(vNormal),normalize(vec3(0.3,0.7,0.8))),0.0),1.0,uUnlit);frag=vec4(uColor.rgb*l,uColor.a);}";
    GLuint v=CompileShader(GL_VERTEX_SHADER,vs),f=CompileShader(GL_FRAGMENT_SHADER,fs);if(!v||!f)return false;
    scene_program=glCreateProgram();glAttachShader(scene_program,v);glAttachShader(scene_program,f);glLinkProgram(scene_program);glDeleteShader(v);glDeleteShader(f);
    GLint linked=0;glGetProgramiv(scene_program,GL_LINK_STATUS,&linked);if(!linked){char log[1024]{};glGetProgramInfoLog(scene_program,sizeof(log),nullptr,log);LOGE("Scene program link failed: %s",log);return false;}
    scene_mvp=glGetUniformLocation(scene_program,"uMvp");scene_mv=glGetUniformLocation(scene_program,"uModelView");scene_color=glGetUniformLocation(scene_program,"uColor");scene_unlit=glGetUniformLocation(scene_program,"uUnlit");
    glGenVertexArrays(1,&scene_vao);
    auto uploadBlade=[&](GLuint*buffer,GLsizei*count,float tipRatio){
        const std::vector<float> mesh=MakeRoundedBladeMesh(tipRatio);*count=static_cast<GLsizei>(mesh.size()/6);
        glGenBuffers(1,buffer);glBindBuffer(GL_ARRAY_BUFFER,*buffer);glBufferData(GL_ARRAY_BUFFER,mesh.size()*sizeof(float),mesh.data(),GL_STATIC_DRAW);
    };
    uploadBlade(&blade_vbo,&blade_vertex_count,0.022f/0.92f);
    uploadBlade(&core_blade_vbo,&core_blade_vertex_count,0.009f/0.92f);
    glBindBuffer(GL_ARRAY_BUFFER,0);
    scene_ready=true;return true;
}

bool OpenXrProgram::Impl::LoadHiltMesh(const std::string& relative_path){
    const std::string path=std::string(app->activity->internalDataPath)+"/ProjectLightsaber/"+relative_path;
    std::ifstream in(path,std::ios::binary);if(!in){LOGE("Converted hilt mesh missing: %s",path.c_str());return false;}
    char magic[4];uint32_t version=0;in.read(magic,4);in.read(reinterpret_cast<char*>(&version),4);in.read(reinterpret_cast<char*>(&hilt_vertices),4);uint32_t mats=0,reserved=0;in.read(reinterpret_cast<char*>(&mats),4);in.read(reinterpret_cast<char*>(&reserved),4);
    if(!in||std::memcmp(magic,"SLM1",4)||version!=1||mats>64||hilt_vertices>2000000){LOGE("Invalid Luke mesh header");return false;}
    struct Mat {float rgba[4],metal,rough;};std::vector<Mat> material(mats);in.read(reinterpret_cast<char*>(material.data()),mats*sizeof(Mat));hilt_ranges.resize(mats);
    for(auto&r:hilt_ranges){in.read(reinterpret_cast<char*>(&r.first),4);in.read(reinterpret_cast<char*>(&r.count),4);}
    std::vector<float> verts((size_t)hilt_vertices*6);in.read(reinterpret_cast<char*>(verts.data()),verts.size()*sizeof(float));if(!in){LOGE("Truncated Luke mesh data");return false;}
    for(size_t i=0;i<hilt_ranges.size();i++){auto&r=hilt_ranges[i];const auto&m=material[i];r.r=m.rgba[0];r.g=m.rgba[1];r.b=m.rgba[2];r.metal=m.metal;r.rough=m.rough;if(r.first+r.count>hilt_vertices){LOGE("Invalid Luke mesh material range");return false;}}
    if(hilt_vbo)glDeleteBuffers(1,&hilt_vbo);glGenBuffers(1,&hilt_vbo);glBindBuffer(GL_ARRAY_BUFFER,hilt_vbo);glBufferData(GL_ARRAY_BUFFER,verts.size()*sizeof(float),verts.data(),GL_STATIC_DRAW);glBindBuffer(GL_ARRAY_BUFFER,0);
    loaded_hilt_asset=relative_path;LOGI("Loaded hilt asset %s: %u vertices, %zu retained source material groups",relative_path.c_str(),hilt_vertices,hilt_ranges.size());return true;
}

bool OpenXrProgram::Impl::CreateSceneSwapchain(){
    uint32_t count=0;XR_CHECK(instance,xrEnumerateViewConfigurationViews(instance,system_id,XR_VIEW_CONFIGURATION_TYPE_PRIMARY_STEREO,0,&count,nullptr));
    if(count!=2){LOGE("Expected stereo views, runtime returned %u",count);return false;}view_config.assign(count,{XR_TYPE_VIEW_CONFIGURATION_VIEW});
    XR_CHECK(instance,xrEnumerateViewConfigurationViews(instance,system_id,XR_VIEW_CONFIGURATION_TYPE_PRIMARY_STEREO,count,&count,view_config.data()));
    scene_width=view_config[0].recommendedImageRectWidth;scene_height=view_config[0].recommendedImageRectHeight;
    XrSwapchainCreateInfo ci{XR_TYPE_SWAPCHAIN_CREATE_INFO};ci.usageFlags=XR_SWAPCHAIN_USAGE_COLOR_ATTACHMENT_BIT;ci.format=swapchain_format;ci.sampleCount=1;ci.width=scene_width;ci.height=scene_height;ci.faceCount=1;ci.arraySize=count;ci.mipCount=1;
    XR_CHECK(instance,xrCreateSwapchain(session,&ci,&scene_swapchain));uint32_t n=0;xrEnumerateSwapchainImages(scene_swapchain,0,&n,nullptr);scene_images.assign(n,{XR_TYPE_SWAPCHAIN_IMAGE_OPENGL_ES_KHR});XR_CHECK(instance,xrEnumerateSwapchainImages(scene_swapchain,n,&n,reinterpret_cast<XrSwapchainImageBaseHeader*>(scene_images.data())));
    glGenFramebuffers(1,&scene_fbo);glGenRenderbuffers(1,&scene_depth);glBindRenderbuffer(GL_RENDERBUFFER,scene_depth);glRenderbufferStorage(GL_RENDERBUFFER,GL_DEPTH_COMPONENT24,scene_width,scene_height);glBindRenderbuffer(GL_RENDERBUFFER,0);
    if(!CreateScenePipeline()||!LoadHiltMesh("saber/luke_rotj.mesh"))return false;
    projection_views.assign(count,{XR_TYPE_COMPOSITION_LAYER_PROJECTION_VIEW});LOGI("Saber scene swapchain created: %ux%u x %u eyes",scene_width,scene_height,count);return true;
}

bool OpenXrProgram::Impl::RenderScene(const TrackingFrame&f,XrTime time,XrCompositionLayerProjection*layer){
    if(!scene_ready||scene_swapchain==XR_NULL_HANDLE)return false;
    if(f.hilt_asset[0]&&loaded_hilt_asset!=f.hilt_asset)LoadHiltMesh(f.hilt_asset);
    XrViewLocateInfo li{XR_TYPE_VIEW_LOCATE_INFO};li.viewConfigurationType=XR_VIEW_CONFIGURATION_TYPE_PRIMARY_STEREO;li.displayTime=time;li.space=local_space;
    XrViewState state{XR_TYPE_VIEW_STATE};uint32_t count=0;std::vector<XrView> views(view_config.size(),{XR_TYPE_VIEW});
    if(XR_FAILED(xrLocateViews(session,&li,&state,(uint32_t)views.size(),&count,views.data()))||count!=2)return false;
    uint32_t image=0;XrSwapchainImageAcquireInfo ai{XR_TYPE_SWAPCHAIN_IMAGE_ACQUIRE_INFO};if(XR_FAILED(xrAcquireSwapchainImage(scene_swapchain,&ai,&image)))return false;
    XrSwapchainImageWaitInfo wi{XR_TYPE_SWAPCHAIN_IMAGE_WAIT_INFO};wi.timeout=XR_INFINITE_DURATION;if(XR_FAILED(xrWaitSwapchainImage(scene_swapchain,&wi))){XrSwapchainImageReleaseInfo ri{XR_TYPE_SWAPCHAIN_IMAGE_RELEASE_INFO};xrReleaseSwapchainImage(scene_swapchain,&ri);return false;}
    glBindFramebuffer(GL_FRAMEBUFFER,scene_fbo);glBindRenderbuffer(GL_RENDERBUFFER,scene_depth);glFramebufferRenderbuffer(GL_FRAMEBUFFER,GL_DEPTH_ATTACHMENT,GL_RENDERBUFFER,scene_depth);
    glEnable(GL_DEPTH_TEST);glDepthFunc(GL_LEQUAL);glDisable(GL_CULL_FACE);glEnable(GL_BLEND);glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);glUseProgram(scene_program);glBindVertexArray(scene_vao);
    const bool hilt_ok=f.right_grip.valid&&f.right_grip.active&&hilt_vbo;
    XrPosef grip{};if(hilt_ok){grip.position={f.right_grip.px,f.right_grip.py,f.right_grip.pz};grip.orientation={f.right_grip.qx,f.right_grip.qy,f.right_grip.qz,f.right_grip.qw};}
    Mat4 hilt_model=PoseMatrix(grip);Mat4 blade_base=Mul4(hilt_model,Translate4(0,0,-0.157223f));
    for(uint32_t eye=0;eye<2;eye++){
        glFramebufferTextureLayer(GL_FRAMEBUFFER,GL_COLOR_ATTACHMENT0,scene_images[image].image,0,(GLint)eye);
        glViewport(0,0,(GLsizei)scene_width,(GLsizei)scene_height);glClearColor(0,0,0,0);glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT);
        if(glCheckFramebufferStatus(GL_FRAMEBUFFER)!=GL_FRAMEBUFFER_COMPLETE){LOGE("Quest eye framebuffer incomplete");continue;}
        const Mat4 view=ViewMatrix(views[eye].pose),proj=ProjectionMatrix(views[eye].fov,0.03f,20.0f);
        auto draw=[&](GLuint buffer,uint32_t first,uint32_t count,const Mat4&model,float r,float g,float b,float alpha,float unlit){
            const Mat4 mv=Mul4(view,model),mvp=Mul4(proj,mv);SetUniformMat(scene_mvp,mvp);SetUniformMat(scene_mv,mv);
            glUniform4f(scene_color,r,g,b,alpha);glUniform1f(scene_unlit,unlit);glBindBuffer(GL_ARRAY_BUFFER,buffer);
            glEnableVertexAttribArray(0);glEnableVertexAttribArray(1);glVertexAttribPointer(0,3,GL_FLOAT,GL_FALSE,6*sizeof(float),(void*)0);glVertexAttribPointer(1,3,GL_FLOAT,GL_FALSE,6*sizeof(float),(void*)(3*sizeof(float)));
            glDrawArrays(GL_TRIANGLES,(GLint)first,(GLsizei)count);
        };
        if(hilt_ok)for(const auto&m:hilt_ranges)if(m.count)draw(hilt_vbo,m.first,m.count,hilt_model,m.r,m.g,m.b,1.0f,0.0f);
        if(hilt_ok&&f.blade_visible&&f.blade_extension>0.001f){
            glDepthMask(GL_FALSE);
            draw(blade_vbo,0,blade_vertex_count,Mul4(blade_base,Scale4(0.022f,0.022f,f.blade_length_m*f.blade_extension)),f.blade_r,f.blade_g,f.blade_b,0.28f,1.0f);
            const bool classicGreen=std::fabs(f.blade_r-0.08f)<0.01f&&f.blade_g>0.98f&&std::fabs(f.blade_b-0.16f)<0.01f;
            const float coreR=classicGreen?0.72f:(0.30f*f.blade_r+0.70f);
            const float coreG=classicGreen?1.00f:(0.30f*f.blade_g+0.70f);
            const float coreB=classicGreen?0.78f:(0.30f*f.blade_b+0.70f);
            glDepthMask(GL_TRUE);
            draw(core_blade_vbo,0,core_blade_vertex_count,Mul4(blade_base,Scale4(0.009f,0.009f,f.blade_length_m*f.blade_extension)),coreR,coreG,coreB,1.0f,1.0f);
        }
        XrCompositionLayerProjectionView&pv=projection_views[eye];pv.pose=views[eye].pose;pv.fov=views[eye].fov;pv.subImage.swapchain=scene_swapchain;pv.subImage.imageRect.offset={0,0};pv.subImage.imageRect.extent={(int32_t)scene_width,(int32_t)scene_height};pv.subImage.imageArrayIndex=eye;
    }
    glBindBuffer(GL_ARRAY_BUFFER,0);glBindFramebuffer(GL_FRAMEBUFFER,0);glDisable(GL_BLEND);glDepthMask(GL_TRUE);
    XrSwapchainImageReleaseInfo ri{XR_TYPE_SWAPCHAIN_IMAGE_RELEASE_INFO};if(XR_FAILED(xrReleaseSwapchainImage(scene_swapchain,&ri)))return false;
    layer->layerFlags=XR_COMPOSITION_LAYER_BLEND_TEXTURE_SOURCE_ALPHA_BIT;layer->space=local_space;layer->viewCount=(uint32_t)projection_views.size();layer->views=projection_views.data();return true;
}

// Uploads the static beam texture once: left half cyan (left hand), right
// half orange (right hand). Runs on the GL thread inside the frame loop.
void OpenXrProgram::Impl::FillBeamOnce() {
    if (beam_swapchain == XR_NULL_HANDLE || beam_filled) return;
    constexpr int64_t GL_TEXTURE_2D_ = 0x0DE1;
    constexpr int64_t GL_RGBA_ = 0x1908;
    constexpr int64_t GL_UNSIGNED_BYTE_ = 0x1401;

    uint8_t px[(size_t)BEAM_W * BEAM_H * 4];
    for (int y = 0; y < BEAM_H; ++y) {
        for (int x = 0; x < BEAM_W; ++x) {
            uint8_t* p = px + ((size_t)y * BEAM_W + x) * 4;
            if (x < BEAM_W / 2) { p[0] = 79;  p[1] = 216; p[2] = 255; }  // cyan
            else               { p[0] = 255; p[1] = 176; p[2] = 84;  }  // orange
            p[3] = 255;
        }
    }
    // Upload every image in the swapchain so whichever one the compositor
    // samples has the content.
    for (size_t i = 0; i < beam_images.size(); ++i) {
        uint32_t idx = 0;
        XrSwapchainImageAcquireInfo ai{XR_TYPE_SWAPCHAIN_IMAGE_ACQUIRE_INFO};
        if (XR_FAILED(xrAcquireSwapchainImage(beam_swapchain, &ai, &idx))) return;
        XrSwapchainImageWaitInfo wi{XR_TYPE_SWAPCHAIN_IMAGE_WAIT_INFO};
        wi.timeout = XR_INFINITE_DURATION;
        xrWaitSwapchainImage(beam_swapchain, &wi);
        glBindTexture((GLenum)GL_TEXTURE_2D_, beam_images[idx].image);
        glTexSubImage2D((GLenum)GL_TEXTURE_2D_, 0, 0, 0, BEAM_W, BEAM_H,
                        (GLenum)GL_RGBA_, (GLenum)GL_UNSIGNED_BYTE_, px);
        XrSwapchainImageReleaseInfo ri{XR_TYPE_SWAPCHAIN_IMAGE_RELEASE_INFO};
        xrReleaseSwapchainImage(beam_swapchain, &ri);
    }
    beam_filled = true;
}

// Intersects each controller's aim ray with the HUD plane. Fills ray_len
// (beam length = distance to the dialog surface), ray_hit and the HUD pixel
// coordinates of the hit for the on-panel marker.
void OpenXrProgram::Impl::ComputeHudRays(const TrackingFrame& f) {
    for (int h = 0; h < 2; ++h) {
        const Pose& aim = (h == 0) ? f.left_aim : f.right_aim;
        ray_valid[h] = aim.valid;
        ray_plane[h] = false;
        ray_hit[h] = false;
        ray_len[h] = 1.5f;  // default beam length when not aimed at the panel
        if (!aim.valid || !hud_pose_valid) continue;

        V3 o{aim.px, aim.py, aim.pz};
        V3 d = QRot({aim.qx, aim.qy, aim.qz, aim.qw}, {0, 0, -1});
        V3 P{hud_pose.position.x, hud_pose.position.y, hud_pose.position.z};
        V3 n = QRot(hud_pose.orientation, {0, 0, 1});

        float denom = Dot(d, n);
        if (std::fabs(denom) < 1e-4f) continue;      // parallel to the panel
        float t = Dot(Sub(P, o), n) / denom;
        if (t < 0.02f || t > 8.0f) continue;         // behind / far away
        ray_plane[h] = true;
        ray_len[h] = t;

        V3 hit = Add(o, Scale(d, t));
        V3 X = QRot(hud_pose.orientation, {1, 0, 0});
        V3 Y = QRot(hud_pose.orientation, {0, 1, 0});
        float u = Dot(Sub(hit, P), X);
        float v = Dot(Sub(hit, P), Y);
        if (std::fabs(u) <= HUD_QUAD_W / 2 && std::fabs(v) <= HUD_QUAD_H / 2) {
            ray_hit[h] = true;
            ray_px[h] = (int)((u / HUD_QUAD_W + 0.5f) * HUD_W);
            ray_py[h] = (int)((0.5f - v / HUD_QUAD_H) * HUD_H);
        }
    }
}

namespace {
void WorkshopRect(uint8_t* b,int w,int h,int x,int y,int rw,int rh,uint8_t r,uint8_t g,uint8_t bl,uint8_t a){
    const int x0=std::max(0,x),y0=std::max(0,y),x1=std::min(w,x+rw),y1=std::min(h,y+rh);
    for(int py=y0;py<y1;py++)for(int px=x0;px<x1;px++){uint8_t*p=b+(static_cast<size_t>(py)*w+px)*4;p[0]=r;p[1]=g;p[2]=bl;p[3]=a;}
}
void WorkshopOutline(uint8_t*b,int w,int h,int x,int y,int rw,int rh,uint8_t r,uint8_t g,uint8_t bl,uint8_t a){
    WorkshopRect(b,w,h,x,y,rw,1,r,g,bl,a);WorkshopRect(b,w,h,x,y+rh-1,rw,1,r,g,bl,a);
    WorkshopRect(b,w,h,x,y,1,rh,r,g,bl,a);WorkshopRect(b,w,h,x+rw-1,y,1,rh,r,g,bl,a);
}
void WorkshopCircle(uint8_t*b,int w,int h,int cx,int cy,int radius,uint8_t r,uint8_t g,uint8_t bl,uint8_t a,bool filled){
    const int rr=radius*radius,inner=(radius-2)*(radius-2);
    for(int y=std::max(0,cy-radius);y<=std::min(h-1,cy+radius);y++)for(int x=std::max(0,cx-radius);x<=std::min(w-1,cx+radius);x++){
        const int d=(x-cx)*(x-cx)+(y-cy)*(y-cy);if(d>rr||(!filled&&d<inner))continue;
        uint8_t*p=b+(static_cast<size_t>(y)*w+x)*4;p[0]=r;p[1]=g;p[2]=bl;p[3]=a;
    }
}
void WorkshopText(uint8_t*b,int w,int h,int x,int y,const char*s,int scale,uint8_t r,uint8_t g,uint8_t bl){HudDrawText(b,w,h,x,y,s,scale,r,g,bl);}
void WorkshopChip(uint8_t*b,int w,int h,int cx,int cy,const BladePaletteColor&c,bool focused,bool active){
    if(focused)WorkshopCircle(b,w,h,cx,cy,22,128,242,220,210,false);
    else WorkshopCircle(b,w,h,cx,cy,19,132,157,160,180,false);
    const auto r=static_cast<uint8_t>(std::clamp(c.r,0.0f,1.0f)*255.0f);
    const auto g=static_cast<uint8_t>(std::clamp(c.g,0.0f,1.0f)*255.0f);
    const auto bl=static_cast<uint8_t>(std::clamp(c.b,0.0f,1.0f)*255.0f);
    WorkshopCircle(b,w,h,cx,cy,14,r,g,bl,255,true);
    if(active)WorkshopRect(b,w,h,cx-3,cy+18,6,3,240,222,179,255);
}
}

void OpenXrProgram::Impl::FillHudPixels(const TrackingFrame& f) {
    const int W=HUD_W,H=HUD_H;uint8_t*buf=hud_pixels.data();memset(buf,0,hud_pixels.size());
    const uint8_t goldR=235,goldG=191,goldB=126;
    WorkshopRect(buf,W,H,20,18,728,476,7,15,20,226);
    WorkshopRect(buf,W,H,20,18,728,2,goldR,goldG,goldB,240);
    WorkshopOutline(buf,W,H,20,18,728,476,99,151,148,220);
    WorkshopRect(buf,W,H,21,20,3,472,63,212,193,220);
    WorkshopText(buf,W,H,44,35,"KYBER ARCHIVE   /   SABER WORKSHOP",1,133,219,202);
    WorkshopText(buf,W,H,42,55,"SABER ATELIER",3,244,242,229);
    WorkshopText(buf,W,H,44,87,"CONFIGURE YOUR HILT, SOUND AND BLADE",1,164,183,181);

    const int mrColor=passthrough_ready?125:255;
    WorkshopRect(buf,W,H,550,34,88,23,19,49,45,235);WorkshopOutline(buf,W,H,550,34,88,23,69,184,160,230);
    WorkshopText(buf,W,H,562,42,passthrough_ready?"MR LIVE":"MR OFF",1,mrColor,235,205);
    WorkshopRect(buf,W,H,646,34,84,23,23,48,54,235);WorkshopOutline(buf,W,H,646,34,84,23,92,142,160,220);
    WorkshopText(buf,W,H,655,42,f.audio_ready?"AUDIO ON":"AUDIO OFF",1,f.audio_ready?171:255,226,208);

    WorkshopRect(buf,W,H,42,105,684,75,13,28,34,235);WorkshopOutline(buf,W,H,42,105,684,75,51,91,87,220);
    WorkshopText(buf,W,H,56,116,"EQUIPPED PROFILE",1,126,199,185);
    WorkshopText(buf,W,H,56,135,f.profile_name,2,237,236,220);
    WorkshopText(buf,W,H,56,160,f.profile_note,1,171,189,183);
    const int activeColor=std::clamp(f.active_color_index,0,static_cast<int>(kBladePaletteCount)-1);
    WorkshopCircle(buf,W,H,690,141,24,76,132,123,170,true);
    WorkshopCircle(buf,W,H,690,141,17,static_cast<uint8_t>(kBladePalette[activeColor].r*255),static_cast<uint8_t>(kBladePalette[activeColor].g*255),static_cast<uint8_t>(kBladePalette[activeColor].b*255),255,true);
    WorkshopText(buf,W,H,620,164,kBladePalette[activeColor].id,1,239,222,181);
    WorkshopRect(buf,W,H,42,193,684,1,73,111,104,220);

    if(f.selector_open){
        const bool colorPage=f.workshop_section==1;
        WorkshopRect(buf,W,H,43,207,315,34,colorPage?14:35,colorPage?35:51,colorPage?38:43,240);
        WorkshopRect(buf,W,H,380,207,346,colorPage?35:14,colorPage?51:35,colorPage?43:38,240);
        WorkshopText(buf,W,H,65,218,"SABER + SOUND",2,colorPage?151:245,colorPage?177:219,colorPage?171:153);
        WorkshopText(buf,W,H,408,218,"BLADE COLOUR",2,colorPage?245:151,colorPage?219:177,colorPage?153:171);
        if(colorPage){
            const int ci=std::clamp(f.color_index,0,static_cast<int>(kBladePaletteCount)-1);
            WorkshopText(buf,W,H,48,259,"LIVE BLADE COLOUR",1,135,213,192);
            WorkshopText(buf,W,H,48,282,kBladePalette[ci].name,2,245,239,216);
            WorkshopText(buf,W,H,48,309,ci==activeColor?"EQUIPPED":"X  APPLY COLOUR",1,192,205,193);
            WorkshopCircle(buf,W,H,680,290,29,83,127,116,200,true);
            WorkshopCircle(buf,W,H,680,290,21,static_cast<uint8_t>(kBladePalette[ci].r*255),static_cast<uint8_t>(kBladePalette[ci].g*255),static_cast<uint8_t>(kBladePalette[ci].b*255),255,true);
            for(std::size_t i=0;i<kBladePaletteCount;i++){
                const int cx=80+static_cast<int>(i)*96;const bool focused=static_cast<int>(i)==ci;const bool active=static_cast<int>(i)==activeColor;
                WorkshopChip(buf,W,H,cx,370,kBladePalette[i],focused,active);
                const int labelX=cx-static_cast<int>(std::strlen(kBladePalette[i].id))*4;
                WorkshopText(buf,W,H,labelX,400,kBladePalette[i].id,1,focused?239:155,focused?229:178,focused?199:171);
            }
        } else {
            const int pi=std::clamp(f.profile_index,0,std::max(0,f.profile_count-1));
            WorkshopText(buf,W,H,48,259,"SOUND-FONT PROFILE",1,135,213,192);
            WorkshopText(buf,W,H,48,282,f.selector_profile_name,2,245,239,216);
            WorkshopText(buf,W,H,48,309,f.selector_profile_note,1,183,198,187);
            char count[48];std::snprintf(count,sizeof(count),"PROFILE  %02d  /  %02d",pi+1,f.profile_count);
            WorkshopText(buf,W,H,48,340,count,1,211,197,164);
            WorkshopText(buf,W,H,48,367,pi==f.active_profile_index?"CURRENTLY EQUIPPED":"X  EQUIP PROFILE",1,pi==f.active_profile_index?139:231,pi==f.active_profile_index?218:206,pi==f.active_profile_index?183:159);
            WorkshopText(buf,W,H,48,401,"THE HILT AND AUDIO PROFILE CHANGE TOGETHER",1,143,168,164);
        }
        WorkshopRect(buf,W,H,43,437,683,1,73,111,104,220);
        WorkshopText(buf,W,H,48,450,"LEFT STICK: BROWSE / CHANGE TAB    X: APPLY    Y: CLOSE",1,229,218,190);
    } else {
        WorkshopText(buf,W,H,48,218,"READY FOR IGNITION",1,136,215,193);
        WorkshopText(buf,W,H,48,245,"Y  OPEN THE WORKSHOP",2,239,221,181);
        WorkshopText(buf,W,H,48,286,"A  IGNITE / RETRACT       B  BLASTER",1,194,210,198);
        WorkshopText(buf,W,H,48,309,"RT  CLASH     LT  STAB     HOLD GRIP  LOCKUP",1,194,210,198);
        WorkshopText(buf,W,H,48,353,"PROFILE",1,132,207,188);
        WorkshopText(buf,W,H,48,371,f.profile_name,2,230,232,214);
        WorkshopText(buf,W,H,48,402,"BLADE COLOUR",1,132,207,188);
        WorkshopText(buf,W,H,170,402,kBladePalette[activeColor].name,1,241,222,177);
        if(f.status[0]&&std::strncmp(f.status,"AUDIO",5)==0)
            WorkshopText(buf,W,H,48,440,f.status,1,255,155,130);
        else if(!f.font_ready)
            WorkshopText(buf,W,H,48,440,"PROFILE AUDIO UNAVAILABLE",1,255,155,130);
    }
}

void OpenXrProgram::Impl::RenderHud(const TrackingFrame& f) {
    if (hud_swapchain == XR_NULL_HANDLE) return;
    constexpr int64_t GL_TEXTURE_2D_ = 0x0DE1;
    constexpr int64_t GL_RGBA_ = 0x1908;
    constexpr int64_t GL_UNSIGNED_BYTE_ = 0x1401;

    uint32_t idx = 0;
    XrSwapchainImageAcquireInfo ai{XR_TYPE_SWAPCHAIN_IMAGE_ACQUIRE_INFO};
    if (XR_FAILED(xrAcquireSwapchainImage(hud_swapchain, &ai, &idx))) return;
    XrSwapchainImageWaitInfo wi{XR_TYPE_SWAPCHAIN_IMAGE_WAIT_INFO};
    wi.timeout = XR_INFINITE_DURATION;
    xrWaitSwapchainImage(hud_swapchain, &wi);

    FillHudPixels(f);

    // The GL texture origin is bottom-left but we rasterize top-to-bottom, so
    // flip rows vertically before upload to keep the HUD upright.
    {
        const size_t stride = (size_t)HUD_W * 4;
        uint8_t* buf = hud_pixels.data();
        std::vector<uint8_t> tmp(stride);
        for (int r = 0; r < HUD_H / 2; ++r) {
            uint8_t* top = buf + (size_t)r * stride;
            uint8_t* bot = buf + (size_t)(HUD_H - 1 - r) * stride;
            memcpy(tmp.data(), top, stride);
            memcpy(top, bot, stride);
            memcpy(bot, tmp.data(), stride);
        }
    }

    glBindTexture((GLenum)GL_TEXTURE_2D_, hud_images[idx].image);
    glTexSubImage2D((GLenum)GL_TEXTURE_2D_, 0, 0, 0, HUD_W, HUD_H,
                    (GLenum)GL_RGBA_, (GLenum)GL_UNSIGNED_BYTE_,
                    hud_pixels.data());
    glBindTexture((GLenum)GL_TEXTURE_2D_, 0);

    XrSwapchainImageReleaseInfo ri{XR_TYPE_SWAPCHAIN_IMAGE_RELEASE_INFO};
    xrReleaseSwapchainImage(hud_swapchain, &ri);
}

bool OpenXrProgram::Create(android_app* app) {
    impl_->app = app;
    impl_->start_time = std::chrono::steady_clock::now();
    if (!impl_->InitLoader()) return false;
    if (!impl_->CreateInstance()) return false;
    if (!impl_->InitSystem()) return false;
    if (!impl_->InitEgl()) return false;
    if (!impl_->CreateSession()) return false;
    if (!impl_->CreateSpaces()) return false;
    if (!impl_->CreateActions()) return false;
    if (!impl_->SuggestBindings()) return false;
    if (!impl_->AttachActionSet()) return false;
    // HUD is best-effort: if it fails, keep streaming without an overlay.
    if (!impl_->CreateHudSwapchain()) {
        LOGW("HUD swapchain creation failed; continuing without overlay.");
        impl_->hud_swapchain = XR_NULL_HANDLE;
    }
    if (!impl_->CreateSceneSwapchain()) {
        LOGE("Required saber projection renderer could not be initialized.");
        return false;
    }
    if (impl_->hud_swapchain != XR_NULL_HANDLE &&
        !impl_->CreateBeamSwapchain()) {
        LOGW("Beam swapchain creation failed; continuing without rays.");
        impl_->beam_swapchain = XR_NULL_HANDLE;
    }
    // Keep the XR session alive if passthrough setup fails so the in-headset
    // HUD can report the failure. The experience is not considered MR-ready
    // until this succeeds; this fallback is for diagnosis, not acceptance.
    impl_->passthrough_ready = impl_->CreatePassthrough();
    if (!impl_->passthrough_ready)
        LOGE("Passthrough setup failed; continuing with visible diagnostic HUD.");
    LOGI("OpenXR program initialised.");
    return true;
}

void OpenXrProgram::SetStatusInfo(const std::string& localIp,
                                  const std::string& destIp, int destPort) {
    impl_->local_ip = localIp;
    impl_->dest_ip = destIp;
    impl_->dest_port = destPort;
}

void OpenXrProgram::SetStreamStatus(bool unicast, const std::string& destIp,
                                    int destPort) {
    impl_->unicast = unicast;
    impl_->dest_ip = destIp;
    impl_->dest_port = destPort;
}

void OpenXrProgram::PollXrEvents(bool* exitLoop) {
    *exitLoop = false;
    XrEventDataBuffer ev{XR_TYPE_EVENT_DATA_BUFFER};
    while (true) {
        ev.type = XR_TYPE_EVENT_DATA_BUFFER;
        ev.next = nullptr;
        XrResult r = xrPollEvent(impl_->instance, &ev);
        if (r == XR_EVENT_UNAVAILABLE) break;
        if (XR_FAILED(r)) break;

        switch (ev.type) {
            case XR_TYPE_EVENT_DATA_INSTANCE_LOSS_PENDING: {
                LOGW("Instance loss pending; exiting.");
                *exitLoop = true;
                return;
            }
            case XR_TYPE_EVENT_DATA_REFERENCE_SPACE_CHANGE_PENDING: {
                auto* c = reinterpret_cast<XrEventDataReferenceSpaceChangePending*>(&ev);
                if (c->referenceSpaceType == XR_REFERENCE_SPACE_TYPE_LOCAL) {
                    impl_->recenter_count++;
                    impl_->hud_pose_valid = false;  // re-place HUD in front
                    LOGI("Recenter: LOCAL origin changed (count=%u). Poses "
                         "continue against the new origin.",
                         impl_->recenter_count);
                }
                break;
            }
            case XR_TYPE_EVENT_DATA_SESSION_STATE_CHANGED: {
                auto* s = reinterpret_cast<XrEventDataSessionStateChanged*>(&ev);
                impl_->session_state = s->state;
                LOGI("Session state -> %d", (int)s->state);
                switch (s->state) {
                    case XR_SESSION_STATE_READY: {
                        XrSessionBeginInfo bi{XR_TYPE_SESSION_BEGIN_INFO};
                        bi.primaryViewConfigurationType =
                            XR_VIEW_CONFIGURATION_TYPE_PRIMARY_STEREO;
                        if (XR_SUCCEEDED(xrBeginSession(impl_->session, &bi))) {
                            session_running_ = true;
                            LOGI("Session started.");
                        }
                        break;
                    }
                    case XR_SESSION_STATE_STOPPING: {
                        session_running_ = false;
                        xrEndSession(impl_->session);
                        LOGI("Session stopped.");
                        break;
                    }
                    case XR_SESSION_STATE_EXITING:
                    case XR_SESSION_STATE_LOSS_PENDING: {
                        *exitLoop = true;
                        return;
                    }
                    default:
                        break;
                }
                break;
            }
            default:
                break;
        }
    }
}

bool OpenXrProgram::BeginFrame(int64_t* predictedDisplayTime) {
    XrFrameWaitInfo wi{XR_TYPE_FRAME_WAIT_INFO};
    XrFrameState fs{XR_TYPE_FRAME_STATE};
    if (XR_FAILED(xrWaitFrame(impl_->session, &wi, &fs))) return false;
    *predictedDisplayTime = fs.predictedDisplayTime;
    impl_->frame_should_render = fs.shouldRender;

    XrFrameBeginInfo bi{XR_TYPE_FRAME_BEGIN_INFO};
    if (XR_FAILED(xrBeginFrame(impl_->session, &bi))) return false;

    // Sync inputs for this frame. Returns SESSION_NOT_FOCUSED (a success code)
    // when not focused — inputs will simply read inactive, which is fine.
    XrActiveActionSet active{impl_->action_set, XR_NULL_PATH};
    XrActionsSyncInfo si{XR_TYPE_ACTIONS_SYNC_INFO};
    si.countActiveActionSets = 1;
    si.activeActionSets = &active;
    xrSyncActions(impl_->session, &si);
    return true;
}

void OpenXrProgram::Locate(TrackingFrame* out, int64_t predictedDisplayTime) {
    XrTime t = (XrTime)predictedDisplayTime;

    auto elapsed = std::chrono::steady_clock::now() - impl_->start_time;
    out->t = std::chrono::duration<double>(elapsed).count();
    out->seq = impl_->seq++;
    out->recenter_count = impl_->recenter_count;

    impl_->LocateSpace(impl_->view_space, t, &out->hmd);
    impl_->LocateSpace(impl_->grip_space[0], t, &out->left_grip);
    impl_->LocateSpace(impl_->grip_space[1], t, &out->right_grip);
    impl_->LocateSpace(impl_->aim_space[0], t, &out->left_aim);
    impl_->LocateSpace(impl_->aim_space[1], t, &out->right_aim);

    for (int h = 0; h < 2; ++h) {
        ControllerInput& in = (h == 0) ? out->left_input : out->right_input;
        in.trigger = impl_->ReadFloat(impl_->trigger_action, h);
        in.squeeze = impl_->ReadFloat(impl_->squeeze_action, h);
        impl_->ReadStick(impl_->thumbstick_action, h, &in.thumb_x, &in.thumb_y);
        in.thumb_click = impl_->ReadBool(impl_->thumbclick_action, h);
        in.primary = impl_->ReadBool(impl_->primary_action, h);
        in.secondary = impl_->ReadBool(impl_->secondary_action, h);
        in.menu = impl_->ReadBool(impl_->menu_action, h);
    }
}

void OpenXrProgram::EndFrame(int64_t predictedDisplayTime,
                             const TrackingFrame& frame) {
    XrCompositionLayerPassthroughFB pass{XR_TYPE_COMPOSITION_LAYER_PASSTHROUGH_FB};
    XrCompositionLayerProjection projection{XR_TYPE_COMPOSITION_LAYER_PROJECTION};
    XrCompositionLayerQuad quad{XR_TYPE_COMPOSITION_LAYER_QUAD};
    XrCompositionLayerQuad beams[2] = {{XR_TYPE_COMPOSITION_LAYER_QUAD},
                                       {XR_TYPE_COMPOSITION_LAYER_QUAD}};
    XrCompositionLayerBaseHeader* layers[6];
    uint32_t layer_count = 0;

    // Passthrough underlay (drawn first, behind everything else).
    if (impl_->passthrough_layer != XR_NULL_HANDLE) {
        pass.flags = XR_COMPOSITION_LAYER_BLEND_TEXTURE_SOURCE_ALPHA_BIT;
        pass.space = XR_NULL_HANDLE;
        pass.layerHandle = impl_->passthrough_layer;
        layers[layer_count++] =
            reinterpret_cast<XrCompositionLayerBaseHeader*>(&pass);
    }

    if (impl_->frame_should_render && impl_->RenderScene(frame,(XrTime)predictedDisplayTime,&projection))
        layers[layer_count++]=reinterpret_cast<XrCompositionLayerBaseHeader*>(&projection);

    if (impl_->frame_should_render && impl_->hud_swapchain != XR_NULL_HANDLE) {
        impl_->ComputeHudRays(frame);   // before RenderHud: HUD draws hit markers
        impl_->RenderHud(frame);
        impl_->FillBeamOnce();

        // Capture a world-locked pose once: 1.2 m in front of the initial gaze,
        // yaw-only so the panel stays upright and facing the user.
        if (!impl_->hud_pose_valid) {
            XrSpaceLocation vloc{XR_TYPE_SPACE_LOCATION};
            if (XR_SUCCEEDED(xrLocateSpace(impl_->view_space, impl_->local_space,
                                           (XrTime)predictedDisplayTime, &vloc)) &&
                (vloc.locationFlags & XR_SPACE_LOCATION_ORIENTATION_VALID_BIT) &&
                (vloc.locationFlags & XR_SPACE_LOCATION_POSITION_VALID_BIT)) {
                const XrQuaternionf& q = vloc.pose.orientation;
                float fx = -2.0f * (q.w * q.y + q.x * q.z);
                float fz = -1.0f + 2.0f * (q.x * q.x + q.y * q.y);
                float len = std::sqrt(fx * fx + fz * fz);
                if (len < 1e-4f) { fx = 0.0f; fz = -1.0f; len = 1.0f; }
                fx /= len; fz /= len;
                float theta = std::atan2(-fx, -fz);
                impl_->hud_pose.orientation = {
                    0.0f, std::sin(theta * 0.5f), 0.0f, std::cos(theta * 0.5f)};
                impl_->hud_pose.position = {
                    vloc.pose.position.x + 1.2f * fx,
                    vloc.pose.position.y,
                    vloc.pose.position.z + 1.2f * fz};
                impl_->hud_pose_valid = true;
            }
        }

        if (impl_->hud_pose_valid) {
            quad.layerFlags = XR_COMPOSITION_LAYER_BLEND_TEXTURE_SOURCE_ALPHA_BIT;
            quad.space = impl_->local_space;  // world-locked
            quad.eyeVisibility = XR_EYE_VISIBILITY_BOTH;
            quad.subImage.swapchain = impl_->hud_swapchain;
            quad.subImage.imageRect.offset = {0, 0};
            quad.subImage.imageRect.extent = {Impl::HUD_W, Impl::HUD_H};
            quad.subImage.imageArrayIndex = 0;
            quad.pose = impl_->hud_pose;
            quad.size = {Impl::HUD_QUAD_W, Impl::HUD_QUAD_H};  // 768:512 aspect
            layers[layer_count++] =
                reinterpret_cast<XrCompositionLayerBaseHeader*>(&quad);
        }

        // Controller aim beams: thin quads from each controller to the HUD
        // surface (length = distance to the panel, see ComputeHudRays).
        if (impl_->beam_swapchain != XR_NULL_HANDLE && impl_->beam_filled) {
            for (int h = 0; h < 2; ++h) {
                if (!impl_->ray_valid[h]) continue;
                const Pose& aim = (h == 0) ? frame.left_aim : frame.right_aim;
                V3 o{aim.px, aim.py, aim.pz};
                V3 dir = QRot({aim.qx, aim.qy, aim.qz, aim.qw}, {0, 0, -1});
                float L = impl_->ray_len[h];
                V3 center = Add(o, Scale(dir, L * 0.5f));

                // Beam local axes: +Y along the ray, +Z facing the viewer so
                // the flat quad is seen edge-on as little as possible.
                V3 yAxis = Norm(dir);
                V3 toHead = Sub({frame.hmd.px, frame.hmd.py, frame.hmd.pz},
                                center);
                V3 zAxis = Sub(toHead, Scale(yAxis, Dot(toHead, yAxis)));
                if (Len(zAxis) < 1e-4f) zAxis = {0, 1, 0};
                zAxis = Norm(zAxis);
                V3 xAxis = Norm(Cross(yAxis, zAxis));
                zAxis = Cross(xAxis, yAxis);

                XrCompositionLayerQuad& b = beams[h];
                b.layerFlags = 0;
                b.space = impl_->local_space;
                b.eyeVisibility = XR_EYE_VISIBILITY_BOTH;
                b.subImage.swapchain = impl_->beam_swapchain;
                b.subImage.imageRect.offset = {h == 0 ? 0 : Impl::BEAM_W / 2, 0};
                b.subImage.imageRect.extent = {Impl::BEAM_W / 2, Impl::BEAM_H};
                b.subImage.imageArrayIndex = 0;
                b.pose.orientation = QuatFromCols(xAxis, yAxis, zAxis);
                b.pose.position = {center.x, center.y, center.z};
                b.size = {0.006f, L};   // 6 mm wide, panel-distance long
                layers[layer_count++] =
                    reinterpret_cast<XrCompositionLayerBaseHeader*>(&b);
            }
        }
    }

    XrFrameEndInfo ei{XR_TYPE_FRAME_END_INFO};
    ei.displayTime = (XrTime)predictedDisplayTime;
    ei.environmentBlendMode = XR_ENVIRONMENT_BLEND_MODE_OPAQUE;
    ei.layerCount = layer_count;
    ei.layers = layer_count ? layers : nullptr;
    xrEndFrame(impl_->session, &ei);
}

void OpenXrProgram::Destroy() {
    if (!impl_) return;
    for (int h = 0; h < 2; ++h) {
        if (impl_->grip_space[h]) xrDestroySpace(impl_->grip_space[h]);
        if (impl_->aim_space[h]) xrDestroySpace(impl_->aim_space[h]);
        impl_->grip_space[h] = XR_NULL_HANDLE;
        impl_->aim_space[h] = XR_NULL_HANDLE;
    }
    if (impl_->passthrough_layer && impl_->pfnDestroyPassthroughLayerFB) {
        impl_->pfnDestroyPassthroughLayerFB(impl_->passthrough_layer);
        impl_->passthrough_layer = XR_NULL_HANDLE;
    }
    if (impl_->passthrough && impl_->pfnDestroyPassthroughFB) {
        impl_->pfnDestroyPassthroughFB(impl_->passthrough);
        impl_->passthrough = XR_NULL_HANDLE;
    }
    if (impl_->scene_swapchain) { xrDestroySwapchain(impl_->scene_swapchain); impl_->scene_swapchain = XR_NULL_HANDLE; }
    if(impl_->scene_fbo)glDeleteFramebuffers(1,&impl_->scene_fbo);
    if(impl_->scene_vao)glDeleteVertexArrays(1,&impl_->scene_vao);
    if(impl_->scene_depth)glDeleteRenderbuffers(1,&impl_->scene_depth);
    if(impl_->scene_program)glDeleteProgram(impl_->scene_program);
    if(impl_->hilt_vbo)glDeleteBuffers(1,&impl_->hilt_vbo);
    if(impl_->blade_vbo)glDeleteBuffers(1,&impl_->blade_vbo);
    if(impl_->core_blade_vbo)glDeleteBuffers(1,&impl_->core_blade_vbo);
    if (impl_->hud_swapchain) { xrDestroySwapchain(impl_->hud_swapchain); impl_->hud_swapchain = XR_NULL_HANDLE; }
    if (impl_->beam_swapchain) { xrDestroySwapchain(impl_->beam_swapchain); impl_->beam_swapchain = XR_NULL_HANDLE; }
    if (impl_->view_space) { xrDestroySpace(impl_->view_space); impl_->view_space = XR_NULL_HANDLE; }
    if (impl_->local_space) { xrDestroySpace(impl_->local_space); impl_->local_space = XR_NULL_HANDLE; }
    if (impl_->action_set) { xrDestroyActionSet(impl_->action_set); impl_->action_set = XR_NULL_HANDLE; }
    if (impl_->session) { xrDestroySession(impl_->session); impl_->session = XR_NULL_HANDLE; }
    if (impl_->instance) { xrDestroyInstance(impl_->instance); impl_->instance = XR_NULL_HANDLE; }

    if (impl_->egl_display != EGL_NO_DISPLAY) {
        eglMakeCurrent(impl_->egl_display, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
        if (impl_->egl_surface != EGL_NO_SURFACE) eglDestroySurface(impl_->egl_display, impl_->egl_surface);
        if (impl_->egl_context != EGL_NO_CONTEXT) eglDestroyContext(impl_->egl_display, impl_->egl_context);
        eglTerminate(impl_->egl_display);
        impl_->egl_display = EGL_NO_DISPLAY;
        impl_->egl_surface = EGL_NO_SURFACE;
        impl_->egl_context = EGL_NO_CONTEXT;
    }
    session_running_ = false;
}
