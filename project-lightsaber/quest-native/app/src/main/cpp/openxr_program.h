#pragma once

#include <jni.h>
#include <string>
#include "tracking.h"

struct android_app;

// Native OpenXR lifecycle, passthrough underlay, and the holographic workshop.
class OpenXrProgram {
public:
    OpenXrProgram();
    ~OpenXrProgram();

    // Full init. Returns false on unrecoverable failure.
    bool Create(android_app* app);

    // Pumps OpenXR events (session state, recenter, loss). Sets *exitLoop when
    // the app should terminate.
    void PollXrEvents(bool* exitLoop);

    bool IsSessionRunning() const { return session_running_; }

    // Waits for and begins a frame. On success fills *predictedDisplayTime and
    // returns true; caller must then call Locate() and EndFrame().
    bool BeginFrame(int64_t* predictedDisplayTime);

    // Locates all devices in the LOCAL space at the given time and reads inputs.
    void Locate(TrackingFrame* out, int64_t predictedDisplayTime);

    // Optional stream status retained for the companion adapter.
    void SetStatusInfo(const std::string& localIp, const std::string& destIp,
                       int destPort);

    // Live stream state for the HUD: current target and whether a receiver
    // has subscribed (unicast). Call whenever it may have changed.
    void SetStreamStatus(bool unicast, const std::string& destIp, int destPort);

    // Ends the frame. Renders the workshop as a world-locked quad layer when the
    // compositor asks us to render; otherwise submits zero layers.
    void EndFrame(int64_t predictedDisplayTime, const TrackingFrame& frame);

    void Destroy();

private:
    struct Impl;
    Impl* impl_;

    bool session_running_ = false;
};
