#pragma once

#include <godot_cpp/classes/audio_stream.hpp>
#include <godot_cpp/classes/audio_stream_playback.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/string.hpp>
#include <memory>

namespace lightsaber { class SaberEngine; }

class SaberSharedState;

class SaberAudioPlayback : public godot::AudioStreamPlayback {
  GDCLASS(SaberAudioPlayback, godot::AudioStreamPlayback)
 public:
  SaberAudioPlayback() = default;
  void set_state(std::shared_ptr<SaberSharedState> state);
 protected:
  static void _bind_methods() {}
  int32_t _mix(godot::AudioFrame *buffer, float rate_scale, int32_t frames) override;
  void _start(double from_pos) override;
  void _stop() override;
  bool _is_playing() const override;
  double _get_playback_position() const override;
 private:
  std::shared_ptr<SaberSharedState> state_;
  bool playing_ = false;
  double position_ = 0.0;
  int sample_rate_ = 48000;
  int16_t scratch_[1024]{};
};

class SaberAudioStream : public godot::AudioStream {
  GDCLASS(SaberAudioStream, godot::AudioStream)
 public:
  SaberAudioStream();
  bool load_font(const godot::String &directory);
  void ignite();
  void retract();
  void submit_motion(double x_dps, double y_dps, double z_dps, int64_t timestamp_ns);
  godot::String diagnostics() const;
  bool is_font_ready() const;
  bool is_on() const;
 protected:
  static void _bind_methods();
  godot::Ref<godot::AudioStreamPlayback> _instantiate_playback() const override;
 private:
  std::shared_ptr<SaberSharedState> state_;
};

void initialize_lightsaber_module(godot::ModuleInitializationLevel level);
void uninitialize_lightsaber_module(godot::ModuleInitializationLevel level);
