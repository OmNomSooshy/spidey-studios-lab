#pragma once
#include <atomic>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace lightsaber {

struct SmoothSwingConfig {
  float swing_sensitivity = 450.0f;
  float maximum_hum_ducking = 75.0f;
  float swing_sharpness = 1.75f;
  float swing_strength_threshold = 20.0f;
  float transition1_degrees = 45.0f;
  float transition2_degrees = 160.0f;
  float low_to_high_separation_degrees = 180.0f;
  float high_to_low_separation_degrees = 180.0f;
  float max_swing_volume = 3.0f;
};

struct MotionFrame { float x_dps, y_dps, z_dps; uint64_t timestamp_ns; };

struct MixGains { float hum = 0.0f, swing_low = 0.0f, swing_high = 0.0f; };

// Portable SmoothSwing V2 motion/blend state. Coordinates and timestamps are
// supplied by the platform; angular velocity is in degrees/second.
class SmoothSwingCore {
 public:
  explicit SmoothSwingCore(SmoothSwingConfig config = {});
  MixGains update(const MotionFrame& frame, bool blade_on);
  void reset();
  void resetTransition(float offset_degrees, bool a_starts_low);
  float speed_dps() const { return filtered_speed_; }
  float angle_degrees() const { return angle_degrees_; }
  bool active() const { return swinging_; }
 private:
  SmoothSwingConfig config_;
  float filtered_speed_ = 0.0f;
  float angle_degrees_ = 0.0f;
  float midpoint_a_ = 35.0f, midpoint_b_ = 215.0f;
  float width_a_ = 45.0f, width_b_ = 160.0f, separation_a_ = 180.0f;
  bool a_is_low_ = true;
  float gyro_y_[3] = {0,0,0}, gyro_z_[3] = {0,0,0};
  int filter_index_ = 0, filter_count_ = 0;
  bool swinging_ = false;
  uint64_t last_ns_ = 0;
};

class SaberEngine {
 public:
  SaberEngine();
  ~SaberEngine();
  bool loadFont(const std::string& directory, std::string* error);
  bool fontReady() const;
  std::string fontName() const;
  void ignite();
  void retract();
  void motion(const MotionFrame& frame);
  void render(int16_t* interleaved_stereo, int frames, int sample_rate);
  bool isOn() const;
  std::string diagnostics() const;
 private:
  struct Impl;
  std::unique_ptr<Impl> impl_;
};

}  // namespace lightsaber
