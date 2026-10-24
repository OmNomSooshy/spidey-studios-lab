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
    float swing_speed_dps = 0.0f;
    char status[96] = "Starting";
};
