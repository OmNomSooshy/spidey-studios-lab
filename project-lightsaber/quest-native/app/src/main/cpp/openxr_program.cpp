#include "openxr_program.h"
#include "logger.h"
#include "font8x8.h"

#include <android_native_app_glue.h>

#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <GLES3/gl3.h>

#define XR_USE_PLATFORM_ANDROID 1
#define XR_USE_GRAPHICS_API_OPENGL_ES 1
#include <openxr/openxr.h>
#include <openxr/openxr_platform.h>

#include <array>
#include <chrono>
#include <cmath>
#include <cstring>
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

    // --- Debug HUD (head-locked quad layer) ---
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

void OpenXrProgram::Impl::FillHudPixels(const TrackingFrame& f) {
    const int W = HUD_W, H = HUD_H;
    uint8_t* buf = hud_pixels.data();
    memset(buf, 0, hud_pixels.size());

    // A soft cyan orb rendered on the in-headset status panel.
    const int cx = W / 2;
    const int cy = H / 2;
    const float pulse = 0.88f + 0.12f * std::sin(static_cast<float>(f.t) * 1.3f);
    for (int y = -86; y <= 86; ++y) {
        for (int x = -86; x <= 86; ++x) {
            const float d = std::sqrt(static_cast<float>(x * x + y * y));
            if (d > 86.0f) continue;
            const float glow = 1.0f - d / 86.0f;
            uint8_t* p = buf + (static_cast<size_t>(cy + y) * W + (cx + x)) * 4;
            p[0] = static_cast<uint8_t>(24 + 65 * glow);
            p[1] = static_cast<uint8_t>(70 + 120 * glow);
            p[2] = static_cast<uint8_t>(105 + 150 * glow * pulse);
            p[3] = static_cast<uint8_t>(35 + 220 * glow);
        }
    }
    // Add a bright ring to keep the orb readable against varied rooms.
    for (int y = -66; y <= 66; ++y) {
        for (int x = -66; x <= 66; ++x) {
            const float d = std::sqrt(static_cast<float>(x * x + y * y));
            if (d < 61.0f || d > 66.0f) continue;
            uint8_t* p = buf + (static_cast<size_t>(cy + y) * W + (cx + x)) * 4;
            p[0] = 100; p[1] = 225; p[2] = 255; p[3] = 255;
        }
    }

    const int scale = 2;
    HudDrawText(buf, W, H, 16, 18, "PROJECT LIGHTSABER", scale, 230, 248, 255);
    HudDrawText(buf, W, H, 16, 42, "QUEST 3 / SMOOTHSWING V2", scale, 125, 210, 255);
    HudDrawText(buf, W, H, 16, H - 94,
                passthrough_ready ? "PASSTHROUGH ACTIVE" : "PASSTHROUGH ERROR - CHECK LOGCAT",
                scale, passthrough_ready ? 120 : 255, 255,
                passthrough_ready ? 175 : 100);
    HudDrawText(buf, W, H, 16, H - 70,
                f.font_ready ? "FONT READY" : "FONT ERROR - CHECK LOGCAT",
                scale, f.font_ready ? 120 : 255, 255, f.font_ready ? 175 : 100);
    HudDrawText(buf, W, H, 16, H - 46,
                f.audio_ready ? "AUDIO READY" : "AUDIO ERROR - CHECK LOGCAT",
                scale, f.audio_ready ? 120 : 255, 255, f.audio_ready ? 175 : 100);
    char line[96];
    std::snprintf(line, sizeof(line), "SABER %s  SWING %.0f DPS",
                  f.saber_on ? "ON" : "OFF", f.swing_speed_dps);
    HudDrawText(buf, W, H, 16, H - 22, line, scale, 200, 235, 255);
    HudDrawText(buf, W, H, 16, H - 118, f.status, scale, 210, 235, 255);
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
    XrCompositionLayerQuad quad{XR_TYPE_COMPOSITION_LAYER_QUAD};
    XrCompositionLayerQuad beams[2] = {{XR_TYPE_COMPOSITION_LAYER_QUAD},
                                       {XR_TYPE_COMPOSITION_LAYER_QUAD}};
    XrCompositionLayerQuad blade_glow{XR_TYPE_COMPOSITION_LAYER_QUAD};
    XrCompositionLayerQuad blade_core{XR_TYPE_COMPOSITION_LAYER_QUAD};
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

    if (impl_->frame_should_render && impl_->hud_swapchain != XR_NULL_HANDLE) {
        impl_->ComputeHudRays(frame);   // before RenderHud: HUD draws hit markers
        impl_->RenderHud(frame);
        impl_->FillBeamOnce();

        // A pair of controller-space quads forms a simple luminous blade.
        // Its long axis maps to the right grip's local -Z hilt direction.
        if (frame.saber_on && frame.right_grip.valid && frame.right_grip.active &&
            impl_->beam_swapchain != XR_NULL_HANDLE && impl_->beam_filled &&
            impl_->grip_space[1] != XR_NULL_HANDLE) {
            const XrQuaternionf blade_orientation{-0.70710678f, 0.0f, 0.0f, 0.70710678f};
            auto configure_blade = [&](XrCompositionLayerQuad& blade, float width) {
                blade.layerFlags = XR_COMPOSITION_LAYER_BLEND_TEXTURE_SOURCE_ALPHA_BIT;
                blade.space = impl_->grip_space[1];
                blade.eyeVisibility = XR_EYE_VISIBILITY_BOTH;
                blade.subImage.swapchain = impl_->beam_swapchain;
                blade.subImage.imageRect.offset = {0, 0};
                blade.subImage.imageRect.extent = {Impl::BEAM_W / 2, Impl::BEAM_H};
                blade.subImage.imageArrayIndex = 0;
                blade.pose.orientation = blade_orientation;
                blade.pose.position = {0.0f, 0.0f, -0.54f};
                blade.size = {width, 1.08f};
            };
            configure_blade(blade_glow, 0.060f);
            configure_blade(blade_core, 0.025f);
            layers[layer_count++] = reinterpret_cast<XrCompositionLayerBaseHeader*>(&blade_glow);
            layers[layer_count++] = reinterpret_cast<XrCompositionLayerBaseHeader*>(&blade_core);
        }

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
