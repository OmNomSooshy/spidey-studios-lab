#pragma once
#include <cstdint>

// OpenXR right-handed, local reference-space pose, metres, quaternion x/y/z/w.
struct Pose {
    bool valid = false;
    bool active = false;
    bool angular_velocity_valid = false;
    float px = 0, py = 0, pz = 0;
    float qx = 0, qy = 0, qz = 0, qw = 1;
    float angular_x_rad_s = 0, angular_y_rad_s = 0, angular_z_rad_s = 0;
};

struct ControllerInput {
    float trigger = 0.0f;
    float squeeze = 0.0f;
    float thumb_x = 0.0f;
    float thumb_y = 0.0f;
    bool thumb_click = false;
    bool primary = false;   // A (right) / X (left)
    bool secondary = false; // B (right) / Y (left)
    bool menu = false;
};

struct TrackingFrame {
    double t = 0.0;
    uint64_t seq = 0;
    Pose hmd;
    Pose left_grip, right_grip;
    Pose left_aim, right_aim;
    ControllerInput left_input, right_input;
    uint32_t recenter_count = 0;

    bool font_ready = false;
    bool audio_ready = false;
    bool saber_on = false;
    bool motion_valid = false;
    bool swing_active = false;
    bool selector_open = false;
    int workshop_section = 0; // 0 = saber/font, 1 = blade colour
    bool blade_visible = false;
    float blade_extension = 0.0f;
    float blade_r = 0.08f, blade_g = 1.0f, blade_b = 0.16f;
    float blade_length_m = 0.92f;
    int profile_index = 0, profile_count = 0, active_profile_index = 0;
    int color_index = 0, active_color_index = 0, color_count = 0;
    float swing_speed_dps = 0.0f;
    char profile_name[96] = "Luke ROTJ / SmthJedi proxy";
    char selector_profile_name[96] = "";
    char selector_profile_note[96] = "";
    char color_name[40] = "CLASSIC GREEN";
    char selector_color_name[40] = "CLASSIC GREEN";
    char profile_note[96] = "Luke ROTJ visual; temporary SmthJedi audio proxy";
    char hilt_asset[160] = "saber/luke_rotj.mesh";
    char active_font[64] = "smthjedi";
    char status[96] = "Starting";
};
