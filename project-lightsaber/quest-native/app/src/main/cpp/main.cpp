#include <aaudio/AAudio.h>
#include <algorithm>
#include <android/asset_manager.h>
#include <android_native_app_glue.h>
#include <android/native_activity.h>

#include "bundled_assets.h"
#include "logger.h"
#include "openxr_program.h"
#include "saber_engine.h"
#include "tracking.h"

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <system_error>
#include <vector>

namespace {
constexpr float kRadToDeg = 57.29577951308232f;

struct AudioOutput {
    lightsaber::SaberEngine* engine = nullptr;
    AAudioStream* stream = nullptr;
    std::string error;

    static aaudio_data_callback_result_t OnAudio(AAudioStream* stream,
            void* user_data, void* audio_data, int32_t frames) {
        auto* self = static_cast<AudioOutput*>(user_data);
        if (self == nullptr || self->engine == nullptr) {
            std::memset(audio_data, 0, static_cast<size_t>(frames) * 2 * sizeof(int16_t));
            return AAUDIO_CALLBACK_RESULT_CONTINUE;
        }
        self->engine->render(static_cast<int16_t*>(audio_data), frames,
                             AAudioStream_getSampleRate(stream));
        return AAUDIO_CALLBACK_RESULT_CONTINUE;
    }

    bool Start(lightsaber::SaberEngine* saber) {
        engine = saber;
        AAudioStreamBuilder* builder = nullptr;
        aaudio_result_t result = AAudio_createStreamBuilder(&builder);
        if (result != AAUDIO_OK || builder == nullptr) {
            error = "AAudio builder failed";
            return false;
        }
        AAudioStreamBuilder_setDirection(builder, AAUDIO_DIRECTION_OUTPUT);
        AAudioStreamBuilder_setFormat(builder, AAUDIO_FORMAT_PCM_I16);
        AAudioStreamBuilder_setChannelCount(builder, 2);
        AAudioStreamBuilder_setSampleRate(builder, 48000);
        AAudioStreamBuilder_setPerformanceMode(builder, AAUDIO_PERFORMANCE_MODE_LOW_LATENCY);
        AAudioStreamBuilder_setSharingMode(builder, AAUDIO_SHARING_MODE_SHARED);
        AAudioStreamBuilder_setUsage(builder, AAUDIO_USAGE_GAME);
        AAudioStreamBuilder_setContentType(builder, AAUDIO_CONTENT_TYPE_SONIFICATION);
        AAudioStreamBuilder_setDataCallback(builder, OnAudio, this);
        result = AAudioStreamBuilder_openStream(builder, &stream);
        AAudioStreamBuilder_delete(builder);
        if (result != AAUDIO_OK || stream == nullptr) {
            error = std::string("AAudio open failed: ") + AAudio_convertResultToText(result);
            return false;
        }
        const int32_t burst = AAudioStream_getFramesPerBurst(stream);
        if (burst > 0) AAudioStream_setBufferSizeInFrames(stream, burst * 2);
        result = AAudioStream_requestStart(stream);
        if (result != AAUDIO_OK) {
            error = std::string("AAudio start failed: ") + AAudio_convertResultToText(result);
            AAudioStream_close(stream);
            stream = nullptr;
            return false;
        }
        LOGI("AAudio started: %d Hz, %d channels, burst=%d, buffer=%d frames",
             AAudioStream_getSampleRate(stream), AAudioStream_getChannelCount(stream),
             burst, AAudioStream_getBufferSizeInFrames(stream));
        return true;
    }

    void Pause() { if (stream) AAudioStream_requestPause(stream); }
    void Resume() { if (stream) AAudioStream_requestStart(stream); }
    void Close() {
        if (stream) {
            AAudioStream_requestStop(stream);
            AAudioStream_close(stream);
            stream = nullptr;
        }
    }
};

struct AppState {
    bool destroy_requested = false;
    lightsaber::SaberEngine* saber = nullptr;
    AudioOutput* audio = nullptr;
};

struct SaberProfile {
    std::string id, name, hilt, font, note, effects;
    float r=0.08f, g=1.0f, b=0.16f, blade_length=0.92f;
};

void OnAppCmd(android_app* app, int32_t cmd) {
    auto* state = static_cast<AppState*>(app->userData);
    if (state == nullptr) return;
    if (cmd == APP_CMD_DESTROY) state->destroy_requested = true;
    if (cmd == APP_CMD_PAUSE || cmd == APP_CMD_STOP) {
        if (state->saber) state->saber->retract();
        if (state->audio) state->audio->Pause();
    }
    if (cmd == APP_CMD_RESUME) {
        if (state->audio) state->audio->Resume();
    }
}

bool InstallBundledAssets(android_app* app, std::string* destination, std::string* error) {
    if (app == nullptr || app->activity == nullptr || app->activity->assetManager == nullptr) {
        *error = "Android asset manager unavailable";
        return false;
    }
    const std::string root = std::string(app->activity->internalDataPath) + "/ProjectLightsaber";
    std::error_code ec;
    std::filesystem::create_directories(root, ec);
    if (ec) { *error = "Cannot create app font directory: " + ec.message(); return false; }

    const std::string marker = root + "/.assets-installed";
    if (std::filesystem::exists(marker)) { *destination=root; return true; }
    for (const char* relative : kBundledAssetPaths) {
        const std::string asset_path = relative;
        const std::string file_path = root + "/" + relative;
        const std::filesystem::path parent = std::filesystem::path(file_path).parent_path();
        std::filesystem::create_directories(parent, ec);
        if (ec) { *error = "Cannot create font subdirectory: " + ec.message(); return false; }
        AAsset* asset = AAssetManager_open(app->activity->assetManager,
                                            asset_path.c_str(), AASSET_MODE_BUFFER);
        if (asset == nullptr) { *error = "Bundled saber asset missing: " + asset_path; return false; }
        const off64_t length = AAsset_getLength64(asset);
        if (length < 0) { AAsset_close(asset); *error = "Invalid bundled font length"; return false; }
        std::vector<uint8_t> bytes(static_cast<size_t>(length));
        size_t offset = 0;
        while (offset < bytes.size()) {
            const int count = AAsset_read(asset, bytes.data() + offset, bytes.size() - offset);
            if (count <= 0) { AAsset_close(asset); *error = "Font asset read failed: " + asset_path; return false; }
            offset += static_cast<size_t>(count);
        }
        AAsset_close(asset);
        FILE* file = std::fopen(file_path.c_str(), "wb");
        if (file == nullptr) { *error = "Font file write failed: " + file_path; return false; }
        const size_t written = std::fwrite(bytes.data(), 1, bytes.size(), file);
        std::fclose(file);
        if (written != bytes.size()) { *error = "Short write for font file: " + file_path; return false; }
    }
    FILE* done=std::fopen(marker.c_str(),"wb");if(done)std::fclose(done);
    *destination = root;
    return true;
}

bool LoadProfiles(const std::string& root,std::vector<SaberProfile>* profiles,std::string* error) {
    std::ifstream in(root+"/saber_profiles.tsv");
    if(!in){*error="Bundled saber_profiles.tsv missing";return false;}
    std::string line;std::getline(in,line);
    while(std::getline(in,line)){
        if(line.empty())continue;std::vector<std::string> c;std::stringstream ss(line);std::string cell;
        while(std::getline(ss,cell,'\t'))c.push_back(cell);
        if(c.size()<8)continue;SaberProfile p;p.id=c[0];p.name=c[1];p.hilt=c[2];p.font=c[3];p.effects=c[6];p.note=c[7];p.blade_length=std::strtof(c[5].c_str(),nullptr);
        std::stringstream rgb(c[4]);std::string v;if(std::getline(rgb,v,','))p.r=std::strtof(v.c_str(),nullptr);if(std::getline(rgb,v,','))p.g=std::strtof(v.c_str(),nullptr);if(std::getline(rgb,v,','))p.b=std::strtof(v.c_str(),nullptr);
        profiles->push_back(std::move(p));
    }
    if(profiles->empty()){*error="No saber profiles were found";return false;}return true;
}

void FillProfileFrame(const SaberProfile& p,TrackingFrame* frame,int index,int count) {
    std::snprintf(frame->profile_name,sizeof(frame->profile_name),"%s",p.name.c_str());
    std::snprintf(frame->profile_note,sizeof(frame->profile_note),"%s",p.note.c_str());
    std::snprintf(frame->hilt_asset,sizeof(frame->hilt_asset),"%s",p.hilt.c_str());
    std::snprintf(frame->active_font,sizeof(frame->active_font),"%s",p.font.c_str());
    frame->blade_r=p.r;frame->blade_g=p.g;frame->blade_b=p.b;frame->blade_length_m=p.blade_length;frame->profile_index=index;frame->profile_count=count;
}

void SubmitRightControllerMotion(lightsaber::SaberEngine& saber,
                                 const TrackingFrame& frame,
                                 int64_t predicted_display_time) {
    const Pose& pose = frame.right_grip;
    if (!pose.valid || !pose.active || !pose.angular_velocity_valid) return;

    // OpenXR angular velocity is in the local reference frame, radians/second.
    // Rotate it into the grip frame, then map the grip's long -Z axis to core X
    // and its transverse local X/Y axes to core Y/Z (the core swing plane).
    const float qx = -pose.qx, qy = -pose.qy, qz = -pose.qz, qw = pose.qw;
    const float vx = pose.angular_x_rad_s, vy = pose.angular_y_rad_s, vz = pose.angular_z_rad_s;
    const float tx = 2.0f * (qy * vz - qz * vy);
    const float ty = 2.0f * (qz * vx - qx * vz);
    const float tz = 2.0f * (qx * vy - qy * vx);
    const float local_x = vx + qw * tx + (qy * tz - qz * ty);
    const float local_y = vy + qw * ty + (qz * tx - qx * tz);
    const float local_z = vz + qw * tz + (qx * ty - qy * tx);
    saber.motion({local_z * kRadToDeg, local_x * kRadToDeg,
                  local_y * kRadToDeg,
                  static_cast<uint64_t>(predicted_display_time)});
}
} // namespace

void android_main(android_app* app) {
    AppState state;
    app->userData = &state;
    app->onAppCmd = OnAppCmd;

    lightsaber::SaberEngine saber;
    state.saber = &saber;
    std::string asset_root, asset_error;
    const bool assets_copied=InstallBundledAssets(app,&asset_root,&asset_error);
    std::vector<SaberProfile> profiles;std::string profile_error;
    const bool profiles_ready=assets_copied&&LoadProfiles(asset_root,&profiles,&profile_error);
    size_t active_profile=0,selected_profile=0;std::string font_load_error;
    bool font_loaded=profiles_ready&&saber.loadFont(asset_root+"/"+profiles[0].font,&font_load_error);
    if(!font_loaded)LOGE("Initial sound-font load failed: %s",profiles_ready?font_load_error.c_str():(assets_copied?profile_error.c_str():asset_error.c_str()));
    else LOGI("Initial sound-font loaded: %s",saber.diagnostics().c_str());

    AudioOutput audio;
    state.audio = &audio;
    const bool audio_ready = audio.Start(&saber);
    if (!audio_ready) LOGE("Audio output unavailable: %s", audio.error.c_str());

    OpenXrProgram program;
    if (!program.Create(app)) {
        LOGE("OpenXR initialization failed; see preceding OpenXR result.");
        audio.Close();
        return;
    }

    bool previous_a = false, previous_b = false, previous_y = false, previous_x = false;
    bool previous_right_trigger=false,previous_left_trigger=false,was_tracking=false;
    bool selector_open=false,previous_lock=false;
    float blade_extension=0.0f;double previous_frame_t=0;float stick_latched=0;
    while (!app->destroyRequested && !state.destroy_requested) {
        for (;;) {
            int events = 0;
            android_poll_source* source = nullptr;
            const int timeout = program.IsSessionRunning() ? 0 : 250;
            const int ident = ALooper_pollOnce(timeout, nullptr, &events,
                                                reinterpret_cast<void**>(&source));
            if (ident < 0) break;
            if (source) source->process(app, source);
            if (app->destroyRequested) break;
        }

        bool exit_loop = false;
        program.PollXrEvents(&exit_loop);
        if (exit_loop) break;
        if (!program.IsSessionRunning()) continue;

        int64_t display_time = 0;
        if (!program.BeginFrame(&display_time)) continue;
        TrackingFrame frame;
        program.Locate(&frame, display_time);

        const bool tracking = frame.right_grip.valid && frame.right_grip.active;
        if (tracking) {
            SubmitRightControllerMotion(saber, frame, display_time);
            frame.motion_valid = frame.right_grip.angular_velocity_valid;
        } else if (was_tracking && saber.isOn()) {
            saber.retract();
        }
        was_tracking = tracking;

        const bool a = frame.right_input.primary;
        const bool b = frame.right_input.secondary;
        const bool y=frame.left_input.secondary,x=frame.left_input.primary;
        if(y&&!previous_y&&profiles_ready){selector_open=!selector_open;selected_profile=active_profile;}
        if(selector_open){
            const float sy=frame.left_input.thumb_y;
            if(std::fabs(sy)<0.35f)stick_latched=0;
            if(stick_latched==0&&sy>0.65f){selected_profile=(selected_profile+profiles.size()-1)%profiles.size();stick_latched=1;}
            else if(stick_latched==0&&sy<-.65f){selected_profile=(selected_profile+1)%profiles.size();stick_latched=-1;}
            if(x&&!previous_x&&profiles_ready){
                if(saber.isOn())saber.retract();
                audio.Pause();
                std::string err;
                if(saber.loadFont(asset_root+"/"+profiles[selected_profile].font,&err)){active_profile=selected_profile;font_loaded=true;font_load_error.clear();LOGI("Selected profile %s: %s",profiles[active_profile].id.c_str(),saber.diagnostics().c_str());}
                else {font_loaded=false;font_load_error=err;LOGE("Profile font load failed: %s",err.c_str());}
                audio.Resume();
                selector_open=false;
            }
        }
        if (font_loaded && tracking && a && !previous_a) { if(saber.isOn())saber.retract();else saber.ignite(); }
        if(font_loaded&&saber.isOn()&&b&&!previous_b)saber.triggerEffect(lightsaber::SaberEffect::Blaster);
        if(font_loaded&&saber.isOn()&&frame.right_input.trigger>0.8f&&!previous_right_trigger)saber.triggerEffect(lightsaber::SaberEffect::Clash);
        if(font_loaded&&saber.isOn()&&frame.left_input.trigger>0.8f&&!previous_left_trigger)saber.triggerEffect(lightsaber::SaberEffect::Stab);
        const bool lock=font_loaded&&saber.isOn()&&frame.right_input.squeeze>0.85f;
        if(lock!=previous_lock)saber.setLockup(lock);
        previous_lock=lock;previous_right_trigger=frame.right_input.trigger>0.8f;previous_left_trigger=frame.left_input.trigger>0.8f;
        previous_y=y;previous_x=x;
        previous_a = a;
        previous_b = b;

        frame.font_ready = font_loaded;
        frame.audio_ready = audio_ready;
        frame.saber_on = saber.isOn();
        frame.selector_open=selector_open;
        FillProfileFrame(profiles_ready?profiles[active_profile]:SaberProfile{},&frame,(int)active_profile,(int)profiles.size());
        if(profiles_ready)std::snprintf(frame.selector_profile_name,sizeof(frame.selector_profile_name),"%s",profiles[selector_open?selected_profile:active_profile].name.c_str());
        const double dt=previous_frame_t>0?std::clamp(frame.t-previous_frame_t,0.0,0.05):0.0;previous_frame_t=frame.t;
        const float step=static_cast<float>(dt/0.30);
        blade_extension+=std::clamp((frame.saber_on?1.0f:0.0f)-blade_extension,-step,step);
        frame.blade_extension=blade_extension;frame.blade_visible=blade_extension>0.002f;
        frame.profile_index=(int)(selector_open?selected_profile:active_profile);
        // Keep the render-facing status concise; detailed engine diagnostics go to logcat.
        const std::string diagnostics = saber.diagnostics();
        frame.swing_active = diagnostics.find("swing=active") != std::string::npos;
        const size_t speed_at = diagnostics.find("speed_dps=");
        if (speed_at != std::string::npos) frame.swing_speed_dps = std::strtof(diagnostics.c_str() + speed_at + 10, nullptr);
        if (!font_loaded) std::snprintf(frame.status, sizeof(frame.status), "FONT ERROR — see logcat");
        else if (!audio_ready) std::snprintf(frame.status, sizeof(frame.status), "AUDIO ERROR — see logcat");
        else if (!tracking) std::snprintf(frame.status, sizeof(frame.status), "WAITING FOR RIGHT CONTROLLER");
        else if(selector_open)std::snprintf(frame.status,sizeof(frame.status),"SELECT: LEFT STICK   CONFIRM: X");
        else std::snprintf(frame.status, sizeof(frame.status), "A TOGGLE   B BLASTER   RT CLASH   LT STAB   GRIP LOCK   Y MENU");

        program.EndFrame(display_time, frame);
    }

    saber.retract();
    audio.Close();
    program.Destroy();
    LOGI("Project Lightsaber Quest stopped.");
}
