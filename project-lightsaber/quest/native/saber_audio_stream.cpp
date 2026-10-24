#include "saber_audio_stream.h"
#include "saber_engine.h"

#include <godot_cpp/classes/audio_server.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/utility_functions.hpp>
#include <algorithm>
#include <array>
#include <atomic>
#include <memory>
#include <string>

class SaberSharedState {
 public:
  lightsaber::SaberEngine engine;
  std::atomic<bool> font_ready{false};
  std::atomic<int> sample_rate{48000};
};

using namespace godot;

void SaberAudioPlayback::set_state(std::shared_ptr<SaberSharedState> state) { state_ = std::move(state); }
void SaberAudioPlayback::_start(double from_pos) { (void)from_pos; playing_ = true; position_ = 0.0; }
void SaberAudioPlayback::_stop() { playing_ = false; }
bool SaberAudioPlayback::_is_playing() const { return playing_; }
double SaberAudioPlayback::_get_playback_position() const { return position_; }

int32_t SaberAudioPlayback::_mix(AudioFrame *buffer, float rate_scale, int32_t frames) {
  (void)rate_scale;
  if (!buffer || frames <= 0) return 0;
  if (!state_ || !playing_ || !state_->font_ready.load(std::memory_order_acquire)) {
    std::fill(buffer, buffer + frames, AudioFrame{});
    return frames;
  }
  const int rate = std::max(8000, AudioServer::get_singleton()->get_mix_rate());
  state_->sample_rate.store(rate, std::memory_order_relaxed);
  int32_t done = 0;
  while (done < frames) {
    const int count = std::min<int32_t>(frames - done, 512);
    state_->engine.render(scratch_, count, rate);
    for (int i = 0; i < count; ++i) {
      buffer[done + i].left = static_cast<float>(scratch_[i * 2]) / 32768.0f;
      buffer[done + i].right = static_cast<float>(scratch_[i * 2 + 1]) / 32768.0f;
    }
    done += count;
  }
  position_ += static_cast<double>(frames) / rate;
  return frames;
}

SaberAudioStream::SaberAudioStream() : state_(std::make_shared<SaberSharedState>()) {}
void SaberAudioStream::_bind_methods() {
  ClassDB::bind_method(D_METHOD("load_font", "directory"), &SaberAudioStream::load_font);
  ClassDB::bind_method(D_METHOD("ignite"), &SaberAudioStream::ignite);
  ClassDB::bind_method(D_METHOD("retract"), &SaberAudioStream::retract);
  ClassDB::bind_method(D_METHOD("submit_motion", "x_dps", "y_dps", "z_dps", "timestamp_ns"), &SaberAudioStream::submit_motion);
  ClassDB::bind_method(D_METHOD("diagnostics"), &SaberAudioStream::diagnostics);
  ClassDB::bind_method(D_METHOD("is_font_ready"), &SaberAudioStream::is_font_ready);
  ClassDB::bind_method(D_METHOD("is_on"), &SaberAudioStream::is_on);
}

bool SaberAudioStream::load_font(const String &directory) {
  CharString path = directory.utf8();
  std::string error;
  const bool ok = state_->engine.loadFont(path.get_data(), &error);
  state_->font_ready.store(ok, std::memory_order_release);
  if (!ok) UtilityFunctions::push_error(String("Project Lightsaber font load failed: ") + String(error.c_str()));
  else UtilityFunctions::print("Project Lightsaber font loaded: ", String(path.get_data()));
  return ok;
}
void SaberAudioStream::ignite() { if (is_font_ready()) state_->engine.ignite(); }
void SaberAudioStream::retract() { state_->engine.retract(); }
void SaberAudioStream::submit_motion(double x, double y, double z, int64_t timestamp_ns) {
  state_->engine.motion({static_cast<float>(x), static_cast<float>(y), static_cast<float>(z), static_cast<uint64_t>(timestamp_ns)});
}
String SaberAudioStream::diagnostics() const { return String(state_->engine.diagnostics().c_str()); }
bool SaberAudioStream::is_font_ready() const { return state_->font_ready.load(std::memory_order_acquire); }
bool SaberAudioStream::is_on() const { return state_->engine.isOn(); }
Ref<AudioStreamPlayback> SaberAudioStream::_instantiate_playback() const {
  Ref<SaberAudioPlayback> playback;
  playback.instantiate();
  playback->set_state(state_);
  return playback;
}

void initialize_lightsaber_module(ModuleInitializationLevel level) {
  if (level != MODULE_INITIALIZATION_LEVEL_SCENE) return;
  ClassDB::register_class<SaberAudioPlayback>();
  ClassDB::register_class<SaberAudioStream>();
}
void uninitialize_lightsaber_module(ModuleInitializationLevel level) { (void)level; }
