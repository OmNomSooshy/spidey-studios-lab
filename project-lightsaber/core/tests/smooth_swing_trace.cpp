#include "saber_engine.h"
#include <cassert>
#include <cmath>
#include <iostream>

int main() {
  lightsaber::SmoothSwingCore core;
  auto idle=core.update({0,0,0,1'000'000'000ULL},true);
  assert(idle.hum==1.0f && idle.swing_low==0 && idle.swing_high==0);
  lightsaber::MixGains moving{};
  for(int i=1;i<=50;i++) moving=core.update({0,0,450,1'000'000'000ULL+uint64_t(i)*20'000'000ULL},true);
  assert(core.speed_dps()>400);
  assert(moving.swing_low+moving.swing_high>0.1f);
  assert(moving.hum<1.0f);
  auto off=core.update({0,0,450,2'020'000'000ULL},false);
  assert(off.hum==0 && off.swing_low==0 && off.swing_high==0);
  lightsaber::SmoothSwingConfig config;
  lightsaber::SmoothSwingCore expected(config);
  lightsaber::MixGains mid{};
  for(int i=1;i<=8;i++) mid=expected.update({0,0,225,3'000'000'000ULL+uint64_t(i)*20'000'000ULL},true);
  const float shaped=std::pow(0.5f,config.swing_sharpness);
  assert(std::abs(mid.hum-(1.0f-shaped*config.maximum_hum_ducking/100.0f))<0.0001f);
  assert(std::abs(mid.swing_low+mid.swing_high-shaped*config.max_swing_volume)<0.0001f);
  std::cout << "smooth swing trace ok; source-derived mid-strength gains and ducking match\n";
}
