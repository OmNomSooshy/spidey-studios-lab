#include "saber_engine.h"
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <vector>

namespace {
float clamp(float x, float lo, float hi) { return std::max(lo, std::min(x, hi)); }

// Independent, test-only transcription of SmoothSwingV2::SB_Motion's box
// filter, angular A/B transition, volume curve, and A/B role swap.
struct SourceTrace {
  struct Player { float midpoint=0, width=0, separation=0; bool low=false; } a,b;
  float gy[3]{}, gz[3]{};
  int next=0;
  bool swinging=false;
  uint64_t last_ns=0;
  unsigned transitions=0;
  explicit SourceTrace(const lightsaber::SmoothSwingConfig& c, bool a_low=true) {
    a={35,c.transition1_degrees,c.low_to_high_separation_degrees,a_low};
    b={215,c.transition2_degrees,c.high_to_low_separation_degrees,!a_low};
  }
  lightsaber::MixGains update(const lightsaber::MotionFrame& f,
                              const lightsaber::SmoothSwingConfig& c,
                              bool on=true) {
    gy[next]=f.y_dps; gz[next]=f.z_dps; next=(next+1)%3;
    const float speed=std::hypot((gy[0]+gy[1]+gy[2])/3.0f,
                                 (gz[0]+gz[1]+gz[2])/3.0f);
    float dt=last_ns && f.timestamp_ns>last_ns ? (f.timestamp_ns-last_ns)*1e-9f : 0;
    if(dt>1.0f)dt=0;
    last_ns=f.timestamp_ns;
    lightsaber::MixGains g{};
    if(!on){swinging=false;g.hum=0;return g;}
    const float strength=std::min(1.0f,speed/c.swing_sensitivity);
    if(!swinging&&speed<c.swing_strength_threshold){g.hum=1;return g;}
    swinging=true;
    if(speed>=c.swing_strength_threshold*.9f){
      a.midpoint-=speed*dt;
      while(a.midpoint+a.width*.5f<0){b.midpoint=a.midpoint+a.separation;std::swap(a,b);++transitions;}
      float mixab=0;
      if(a.midpoint-a.width*.5f<0)mixab=clamp(-(a.midpoint-a.width*.5f)/a.width,0,1);
      const float mixhum=std::pow(strength,c.swing_sharpness);
      const float swing=mixhum*c.max_swing_volume;
      g.hum=1-mixhum*c.maximum_hum_ducking/100;
      g.swing_low=swing*(a.low?mixab:1-mixab);
      g.swing_high=swing*(a.low?1-mixab:mixab);
    } else {g.hum=1;swinging=false;}
    return g;
  }
};

void sameGains(const lightsaber::MixGains& a,const lightsaber::MixGains& b) {
  assert(std::abs(a.hum-b.hum)<1e-5f);
  assert(std::abs(a.swing_low-b.swing_low)<1e-5f);
  assert(std::abs(a.swing_high-b.swing_high)<1e-5f);
}
}

int main() {
  using namespace lightsaber;
  SmoothSwingConfig c;
  SmoothSwingCore core(c); SourceTrace source(c);
  core.resetTransition(35,true);
  std::vector<float> trace;
  uint64_t t=2'000'000'000ULL;
  float max_component_step=0, previous_low=0, previous_high=0;
  auto step=[&](float y,float z){
    t+=5'000'000ULL;
    MotionFrame f{0,y,z,t};
    MixGains actual=core.update(f,true), expected=source.update(f,c);
    sameGains(actual,expected);
    assert(std::isfinite(actual.hum)&&std::isfinite(actual.swing_low)&&std::isfinite(actual.swing_high));
    assert(actual.swing_low>=0&&actual.swing_high>=0);
    max_component_step=std::max(max_component_step,std::max(std::abs(actual.swing_low-previous_low),std::abs(actual.swing_high-previous_high)));
    previous_low=actual.swing_low;previous_high=actual.swing_high;
    trace.push_back(actual.swing_low+actual.swing_high);
  };
  for(int i=0;i<10;i++)step(0,0);                    // threshold idle
  for(int i=0;i<120;i++)step(0,50+i*3.0f);          // gradual acceleration
  for(int i=0;i<180;i++)step(0,410);                // steady movement + swaps
  for(int i=0;i<80;i++)step(0,410-i*4.8f);          // gradual deceleration
  for(int i=0;i<80;i++)step(0,25);                  // hysteresis entry/exit
  for(int i=0;i<100;i++)step(0,360);                // renewed swing
  for(int i=0;i<80;i++)step(0,-360);                // direction reversal
  for(int i=0;i<120;i++)step(0,-360+i*6.0f);        // reversal acceleration
  assert(trace.size()==770);
  assert(source.transitions>=3);
  assert(core.speed_dps()>0);
  auto off=core.update({0,0,0,t+5'000'000ULL},false);
  assert(off.hum==0&&off.swing_low==0&&off.swing_high==0);
  std::cout<<"SmoothSwingV2 source trace matched 770 timestamped motion events across "<<source.transitions<<" A/B transition swaps; "
           <<"max observed per-event low/high target step="<<max_component_step
           <<" (reported for inspection; not a perceptual acceptance threshold)\n";
}
