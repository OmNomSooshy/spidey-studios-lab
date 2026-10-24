#include "saber_engine.h"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cctype>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <map>
#include <mutex>
#include <random>
#include <sstream>

namespace lightsaber {
namespace fs = std::filesystem;
namespace {
float clampf(float x, float a, float b) { return std::max(a, std::min(x, b)); }
uint16_t u16(const unsigned char* p) { return uint16_t(p[0] | (p[1] << 8)); }
uint32_t u32(const unsigned char* p) { return uint32_t(p[0] | (p[1] << 8) | (p[2] << 16) | (p[3] << 24)); }
struct Wav {
  int rate = 0, channels = 0;
  std::vector<int16_t> samples;
  size_t frames() const { return channels ? samples.size() / channels : 0; }
  bool load(const fs::path& path) {
    std::ifstream in(path, std::ios::binary);
    if (!in) return false;
    std::vector<unsigned char> b((std::istreambuf_iterator<char>(in)), {});
    if (b.size() < 44 || std::memcmp(b.data(), "RIFF", 4) || std::memcmp(b.data()+8, "WAVE", 4)) return false;
    int format = 0, bits = 0; size_t off = 12, data_off = 0, data_size = 0;
    while (off + 8 <= b.size()) {
      uint32_t n = u32(&b[off+4]);
      if (off + 8ull + n > b.size()) return false;
      if (!std::memcmp(&b[off], "fmt ", 4) && n >= 16) {
        format = u16(&b[off+8]); channels = u16(&b[off+10]); rate = int(u32(&b[off+12])); bits = u16(&b[off+22]);
      } else if (!std::memcmp(&b[off], "data", 4)) { data_off = off + 8; data_size = n; }
      off += 8 + n + (n & 1);
    }
    if (format != 1 || bits != 16 || channels < 1 || channels > 2 || rate < 8000 || !data_size) return false;
    samples.resize(data_size / 2);
    for (size_t i=0;i<samples.size();++i) samples[i] = int16_t(u16(&b[data_off+i*2]));
    return frames() > 0;
  }
  float sample(double position, int channel) const {
    if (!frames()) return 0;
    size_t a = std::min<size_t>(size_t(position), frames()-1), b = std::min(a+1, frames()-1);
    float t = float(position - a);
    auto at = [&](size_t f) { return float(samples[f*channels + (channels == 1 ? 0 : channel)]); };
    return at(a) + (at(b)-at(a))*t;
  }
};
std::string lower(std::string s) { for (auto& c:s) c=char(std::tolower((unsigned char)c)); return s; }
std::string zeroPad(int n, int digits) { char b[24]; std::snprintf(b,sizeof(b),"%0*d",digits,n); return b; }
}

SmoothSwingCore::SmoothSwingCore(SmoothSwingConfig c):config_(c){}
void SmoothSwingCore::reset(){filtered_speed_=0;angle_degrees_=0;last_ns_=0;swinging_=false;midpoint_a_=35;midpoint_b_=215;width_a_=config_.transition1_degrees;width_b_=config_.transition2_degrees;separation_a_=config_.low_to_high_separation_degrees;a_is_low_=true;filter_index_=filter_count_=0;for(int i=0;i<3;i++)gyro_y_[i]=gyro_z_[i]=0;}
void SmoothSwingCore::resetTransition(float offset,bool a_starts_low){midpoint_a_=offset;midpoint_b_=offset+config_.low_to_high_separation_degrees;width_a_=config_.transition1_degrees;width_b_=config_.transition2_degrees;separation_a_=config_.low_to_high_separation_degrees;a_is_low_=a_starts_low;}
MixGains SmoothSwingCore::update(const MotionFrame& f, bool on) {
  // SmoothSwingV2's embedded path filters a three-axis gyro, then uses the
  // Y/Z plane magnitude. This adapter expects the platform to map its hilt
  // axis to X, leaving Y/Z as the swing plane.
  gyro_y_[filter_index_]=f.y_dps;gyro_z_[filter_index_]=f.z_dps;
  filter_index_=(filter_index_+1)%3;filter_count_=std::min(3,filter_count_+1);
  float fy=0,fz=0;for(int i=0;i<filter_count_;i++){fy+=gyro_y_[i];fz+=gyro_z_[i];}
  float speed=std::hypot(fy/filter_count_,fz/filter_count_);
  float dt=last_ns_ && f.timestamp_ns>last_ns_ ? float(f.timestamp_ns-last_ns_)*1e-9f : 0.0f;
  if (dt>1.0f) dt=0.0f;
  last_ns_=f.timestamp_ns;
  filtered_speed_=speed;
  MixGains g; if (!on) { swinging_=false; return g; }
  if (!swinging_ && filtered_speed_<config_.swing_strength_threshold) { g.hum=1; return g; }
  swinging_=true;
  if (filtered_speed_ >= config_.swing_strength_threshold*0.9f) {
    angle_degrees_ -= filtered_speed_*dt;
    midpoint_a_ -= filtered_speed_*dt;
    const float strength=std::min(1.0f,filtered_speed_/config_.swing_sensitivity);
    float begin=midpoint_a_-width_a_*.5f;
    float end=midpoint_a_+width_a_*.5f;
    while(end<0) { midpoint_b_=midpoint_a_+separation_a_; std::swap(midpoint_a_,midpoint_b_); std::swap(width_a_,width_b_); separation_a_=a_is_low_?config_.high_to_low_separation_degrees:config_.low_to_high_separation_degrees; a_is_low_=!a_is_low_; begin=midpoint_a_-width_a_*.5f; end=midpoint_a_+width_a_*.5f; }
    // V2's player transition rotates the selected loop positions. For this
    // portable blend, preserve the configured angular crossfade and paired
    // role handoff; clip-aware transition decoding is an identified deviation.
    float blend=clampf(-begin/std::max(1.0f,width_a_),0,1);
    float shaped_strength=std::pow(strength,config_.swing_sharpness);
    float swing=shaped_strength*config_.max_swing_volume;
    g.hum=1.0f-shaped_strength*config_.maximum_hum_ducking*.01f;
    g.swing_low=swing*(a_is_low_?blend:1.0f-blend);
    g.swing_high=swing*(a_is_low_?1.0f-blend:blend);
  } else {
    swinging_=false; g.hum=1.0f;
  }
  return g;
}

struct SaberEngine::Impl {
  mutable std::mutex mutex;
  fs::path dir; std::string name, ignition_name, retraction_name, hum_name; bool ready=false, on=false, ignition=false, retracting=false, playing_postoff=false;
  Wav hum, ignite, retract, postoff, clash, blaster, stab, lock_start, lock_loop, lock_end;
  std::vector<Wav> lows, highs;
  double effect_pos=0, postoff_pos=0, hum_pos=0, low_pos=0, high_pos=0;
  double one_shot_pos=0, lock_pos=0, lock_start_pos=0;
  Wav* one_shot=nullptr;
  bool lock_active=false, lock_ending=false;
  float hum_gain=0, swing_low_gain=0, swing_high_gain=0, target_hum=0;
  float swing_low_current=0, swing_high_current=0;
  float font_hum_volume=15.0f/16.0f, font_effect_volume=1.0f;
  int hum_start_ms=100, smooth_swing_hum_start=0;
  float proffie_hum_delay_ms=-1.0f, hum_start_delay=0.0f, hum_fade_seconds=0.2f;
  double ignition_elapsed_seconds=0.0;
  int current_rate=44100;
  std::atomic<float> gy{0}, gz{0}; std::atomic<uint64_t> timestamp{0};
  std::atomic<uint64_t> motion_samples{0}, rendered_frames{0};
  std::atomic<float> reported_speed{0}; std::atomic<bool> reported_swing{false};
  SmoothSwingConfig config;
  SmoothSwingCore core;
  std::mt19937 rng{0x50524f46};
  size_t current=0; bool have_pair=false, was_swinging=false, reseed_after_swing=false;
  uint64_t last_pair_pick_ns=0;
  bool loadSwing(const std::string& base,int n,Wav& w) {
    if(n==1 && (w.load(dir/(base+".wav")) || w.load(dir/base/(base+".wav"))))return true;
    for(int digits:{1,2,3,4}) { std::string number=zeroPad(n,digits),file=base+number+".wav";
      if(w.load(dir/base/file) || w.load(dir/base/(number+".wav")) || w.load(dir/file))return true;
    }
    return false;
  }
  bool hasSwing(const std::string& base,int n) const {
    if(n==1&&(fs::exists(dir/(base+".wav"))||fs::exists(dir/base/(base+".wav"))))return true;
    for(int digits:{1,2,3,4}){std::string number=zeroPad(n,digits),file=base+number+".wav";if(fs::exists(dir/base/file)||fs::exists(dir/base/(number+".wav"))||fs::exists(dir/file))return true;}
    return false;
  }
  bool findEffect(const std::string& n, Wav& w) {
    fs::path flat=dir/(n+".wav"); if(w.load(flat)) return true;
    fs::path folder=dir/n;
    if(fs::exists(folder)) {
      std::vector<fs::path> files;
      for(auto& e:fs::directory_iterator(folder)) if(e.is_regular_file() && lower(e.path().extension().string())==".wav") files.push_back(e.path());
      std::sort(files.begin(), files.end());
      for(const auto& file:files) if(w.load(file)) return true;
    }
    return false;
  }
  bool effectPresent(const std::string& n) const {
    if (fs::exists(dir/(n+".wav"))) return true;
    fs::path folder=dir/n;
    if(!fs::is_directory(folder)) return false;
    for(const auto& e:fs::directory_iterator(folder))
      if(e.is_regular_file()&&lower(e.path().extension().string())==".wav") return true;
    return false;
  }
  void newPair() { if(lows.empty()) return;uint64_t now=timestamp.load(std::memory_order_relaxed);if(have_pair&&now>=last_pair_pick_ns&&now-last_pair_pick_ns<1'000'000'000ULL)return;std::uniform_int_distribution<size_t>d(0,lows.size()-1); std::uniform_real_distribution<float>offset(10.0f,60.0f); current=d(rng);last_pair_pick_ns=now;double start=smooth_swing_hum_start==0?now*1e-9:hum_pos/std::max(1,current_rate);low_pos=high_pos=start*std::max(1,current_rate);have_pair=true;core.resetTransition(offset(rng),(rng()&1)==0); }
  float source(const Wav& w, double& pos, int outch, int rate, bool loop) {
    if(!w.frames()) return 0;
    if(loop) { if(pos>=w.frames()*double(rate)/w.rate) pos=std::fmod(pos,w.frames()*double(rate)/w.rate); }
    else if(pos>=w.frames()*double(rate)/w.rate) return 0;
    float s=w.sample(pos*w.rate/rate,outch); pos+=1.0; return s;
  }
  bool loadConfig(std::string* error) {
    fs::path p=dir/"smoothsw.ini"; std::ifstream f(p); if(!f) return true;
    auto trim=[](std::string s){size_t a=s.find_first_not_of(" \t\r\n"),b=s.find_last_not_of(" \t\r\n");return a==std::string::npos?std::string{}:s.substr(a,b-a+1);};
    std::string line; while(std::getline(f,line)) { auto comment=line.find('#');if(comment!=std::string::npos)line.resize(comment);auto pos=line.find('='); if(pos==std::string::npos) pos=line.find(':'); if(pos==std::string::npos) continue;
      std::string k=lower(trim(line.substr(0,pos))),value=trim(line.substr(pos+1));char* end=nullptr;float v=std::strtof(value.c_str(),&end);if(value.empty()||end==value.c_str()||!std::isfinite(v))continue;
      if(k=="version"&&v!=2.0f){if(error)*error="smoothsw.ini Version="+value+" is incompatible; SmoothSwing V2 requires Version=2.";return false;}
      else if(k=="swingsensitivity")config.swing_sensitivity=v;
      else if(k=="maximumhumducking")config.maximum_hum_ducking=v;
      else if(k=="swingsharpness")config.swing_sharpness=v;
      else if(k=="swingstrengththreshold")config.swing_strength_threshold=v;
      else if(k=="transition1degrees")config.transition1_degrees=v;
      else if(k=="transition2degrees")config.transition2_degrees=v;
      else if(k=="low2highseparationdegrees")config.low_to_high_separation_degrees=v;
      else if(k=="maxswingvolume")config.max_swing_volume=v;
    }
    core=SmoothSwingCore(config);
    return true;
  }
  void loadFontConfig() {
    fs::path path=dir/"config.ini";std::ifstream f(path);if(!f)return;
    auto trim=[](std::string s){size_t a=s.find_first_not_of(" \t\r\n"),b=s.find_last_not_of(" \t\r\n");return a==std::string::npos?std::string{}:s.substr(a,b-a+1);};
    std::string line;while(std::getline(f,line)){auto c=line.find('#');if(c!=std::string::npos)line.resize(c);auto sep=line.find('=');if(sep==std::string::npos)sep=line.find(':');if(sep==std::string::npos)continue;std::string key=lower(trim(line.substr(0,sep))),value=trim(line.substr(sep+1));char*end=nullptr;float v=std::strtof(value.c_str(),&end);if(value.empty()||end==value.c_str()||!std::isfinite(v))continue;
      if(key=="humstart")hum_start_ms=int(v);else if(key=="volhum")font_hum_volume=v/16.0f;else if(key=="voleff")font_effect_volume=v/16.0f;else if(key=="proffieoshumdelay")proffie_hum_delay_ms=v;else if(key=="proffieossmoothswinghumstart")smooth_swing_hum_start=int(v);
    }
  }
};

SaberEngine::SaberEngine():impl_(new Impl){}
SaberEngine::~SaberEngine()=default;
bool SaberEngine::loadFont(const std::string& path,std::string* error) {
  std::lock_guard<std::mutex> lock(impl_->mutex); auto& p=*impl_; p.dir=fs::path(path);
  p.ready=false;
  if(!fs::is_directory(p.dir)){if(error)*error="Choose a Proffie sound-font ZIP or font directory.";return false;}
  p.name=p.dir.filename().string(); p.hum=Wav{};p.ignite=Wav{};p.retract=Wav{};p.postoff=Wav{};p.lows.clear();p.highs.clear();
  p.clash=Wav{};p.blaster=Wav{};p.stab=Wav{};p.lock_start=Wav{};p.lock_loop=Wav{};p.lock_end=Wav{};p.one_shot=nullptr;p.lock_active=p.lock_ending=false;
  p.hum_name.clear();if(p.findEffect("humm",p.hum))p.hum_name="humm";else if(p.findEffect("hum",p.hum))p.hum_name="hum";
  if(p.hum_name.empty()){
    bool present=p.effectPresent("humm")||p.effectPresent("hum");
    if(error)*error=present?"Unsupported audio encoding: hum.wav/humm.wav must be PCM 16-bit mono or stereo WAV.":"Missing required WAV files: hum.wav or humm.wav.";
    return false;
  }
  p.ignition_name.clear();p.retraction_name.clear();
  for(const char*n:{"out","poweron","fastout"})if(p.findEffect(n,p.ignite)){p.ignition_name=n;break;}
  if(p.findEffect("in",p.retract))p.retraction_name="in";
  if(!p.retraction_name.empty()&&p.findEffect("pstoff",p.postoff))p.retraction_name+="+pstoff";
  if(p.retraction_name.empty())for(const char*n:{"pstoff","poweroff","pwroff"})if(p.findEffect(n,p.retract)){p.retraction_name=n;break;}
  if(p.ignition_name.empty()){
    bool present=p.effectPresent("out")||p.effectPresent("poweron")||p.effectPresent("fastout");
    if(error)*error=present?"Unsupported audio encoding: ignition WAV must be PCM 16-bit mono or stereo WAV.":"Missing required WAV files: ignition needs out.wav or a supported power-on effect.";
    return false;
  }
  if(p.retraction_name.empty()){
    bool present=p.effectPresent("in")||p.effectPresent("pstoff")||p.effectPresent("poweroff")||p.effectPresent("pwroff");
    if(error)*error=present?"Unsupported audio encoding: retraction WAV must be PCM 16-bit mono or stereo WAV.":"Missing required WAV files: retraction needs in.wav, pstoff.wav, or a supported power-off effect.";
    return false;
  }
  p.findEffect("clsh",p.clash);
  p.findEffect("blst",p.blaster);
  p.findEffect("stab",p.stab);
  p.findEffect("bgnlock",p.lock_start);
  p.findEffect("lock",p.lock_loop);
  p.findEffect("endlock",p.lock_end);
  Wav probe_l,probe_h; bool modern=p.hasSwing("swingl",0)||p.hasSwing("swingh",0)||p.hasSwing("swingl",1)||p.hasSwing("swingh",1);
  std::string low_name=modern?"swingl":"lswing", high_name=modern?"swingh":"hswing";
  int first_file=(p.hasSwing(low_name,0)||p.hasSwing(high_name,0))?0:1;
  for(int i=first_file;i<=9999;i++) {
    Wav l,h; bool lp=p.hasSwing(low_name,i),hp=p.hasSwing(high_name,i);
    bool lf=p.loadSwing(low_name,i,l),hf=p.loadSwing(high_name,i,h);
    if(lf&&hf){p.lows.push_back(std::move(l));p.highs.push_back(std::move(h));}
    else if(lp||hp){
      if(error)*error=(lp&&!lf)||(hp&&!hf)?"Unsupported audio encoding: swing WAVs must be PCM 16-bit mono or stereo.":"Missing required WAV files: each swing recording needs its matching low/high partner.";
      return false;
    } else break;
  }
  if(p.lows.empty()){
    bool files=p.hasSwing(low_name,0)||p.hasSwing(high_name,0)||p.hasSwing(low_name,1)||p.hasSwing(high_name,1);
    if(error)*error=files?"Unsupported audio encoding: swing WAVs must be PCM 16-bit mono or stereo.":"Missing required WAV files: no paired swingl/swingh or legacy lswing/hswing recordings found.";
    return false;
  }
  p.config=SmoothSwingConfig{};p.core=SmoothSwingCore(p.config);if(!p.loadConfig(error))return false;p.font_hum_volume=15.0f/16.0f;p.font_effect_volume=1;p.hum_start_ms=100;p.proffie_hum_delay_ms=-1;p.smooth_swing_hum_start=0;p.loadFontConfig();
  p.ready=true;p.on=false;p.hum_pos=p.low_pos=p.high_pos=p.postoff_pos=0;p.current=0;p.have_pair=false;p.was_swinging=false;p.reseed_after_swing=false;p.playing_postoff=false;p.swing_low_current=p.swing_high_current=0;p.motion_samples=0;p.rendered_frames=0;p.reported_speed=0;p.reported_swing=false;p.ignition_elapsed_seconds=0;p.core.reset();
  if(error) *error="";
  return true;
}
bool SaberEngine::fontReady() const {std::lock_guard<std::mutex>l(impl_->mutex);return impl_->ready;}
std::string SaberEngine::fontName() const {std::lock_guard<std::mutex>l(impl_->mutex);return impl_->name;}
void SaberEngine::ignite(){std::lock_guard<std::mutex>l(impl_->mutex);auto&p=*impl_;if(!p.ready)return;p.on=true;p.retracting=false;p.ignition=p.ignite.frames()>0;p.effect_pos=0;p.ignition_elapsed_seconds=0;p.hum_pos=0;p.target_hum=0;p.swing_low_current=p.swing_high_current=0;p.was_swinging=p.reseed_after_swing=false;p.core.reset();p.hum_fade_seconds=p.hum_name=="humm"?double(p.ignite.frames())/p.ignite.rate:0.2f;if(p.proffie_hum_delay_ms>=0)p.hum_start_delay=p.proffie_hum_delay_ms/1000.0f;else p.hum_start_delay=p.hum_name=="humm"?0.0f:std::max(0.0,double(p.ignite.frames())/p.ignite.rate-p.hum_start_ms/1000.0);p.newPair();}
void SaberEngine::retract(){std::lock_guard<std::mutex>l(impl_->mutex);auto&p=*impl_;if(!p.on)return;p.on=false;p.retracting=p.retract.frames()>0;p.playing_postoff=false;p.effect_pos=p.postoff_pos=0;p.target_hum=0;p.was_swinging=p.reseed_after_swing=false;}
bool SaberEngine::effectAvailable(SaberEffect e) const {std::lock_guard<std::mutex>l(impl_->mutex);const auto&p=*impl_;switch(e){case SaberEffect::Clash:return p.clash.frames()>0;case SaberEffect::Blaster:return p.blaster.frames()>0;case SaberEffect::Stab:return p.stab.frames()>0;}return false;}
void SaberEngine::triggerEffect(SaberEffect e) {std::lock_guard<std::mutex>l(impl_->mutex);auto&p=*impl_;if(!p.ready||!p.on)return;switch(e){case SaberEffect::Clash:p.one_shot=p.clash.frames()?&p.clash:nullptr;break;case SaberEffect::Blaster:p.one_shot=p.blaster.frames()?&p.blaster:nullptr;break;case SaberEffect::Stab:p.one_shot=p.stab.frames()?&p.stab:nullptr;break;}p.one_shot_pos=0;}
bool SaberEngine::lockupAvailable() const {std::lock_guard<std::mutex>l(impl_->mutex);const auto&p=*impl_;return p.lock_loop.frames()>0;}
void SaberEngine::setLockup(bool active) {std::lock_guard<std::mutex>l(impl_->mutex);auto&p=*impl_;if(!p.ready)return;if(active&&p.on&&p.lock_loop.frames()&&!p.lock_active){p.lock_active=true;p.lock_ending=false;p.lock_pos=0;p.lock_start_pos=0;}else if(!active&&p.lock_active){p.lock_active=false;p.lock_ending=p.lock_end.frames()>0;p.lock_pos=0;}}
void SaberEngine::motion(const MotionFrame&f){impl_->gy.store(f.y_dps,std::memory_order_relaxed);impl_->gz.store(f.z_dps,std::memory_order_relaxed);impl_->timestamp.store(f.timestamp_ns,std::memory_order_relaxed);impl_->motion_samples.fetch_add(1,std::memory_order_relaxed);}
bool SaberEngine::isOn()const{std::lock_guard<std::mutex>l(impl_->mutex);return impl_->on;}
std::string SaberEngine::diagnostics()const{std::lock_guard<std::mutex>l(impl_->mutex);const auto&p=*impl_;std::ostringstream s;s<<"font="<<(p.ready?p.name:"none")<<";blade="<<(p.on?"on":"off")<<";gyro_samples="<<p.motion_samples.load()<<";speed_dps="<<p.reported_speed.load()<<";swing="<<(p.reported_swing.load()?"active":"idle")<<";sensitivity="<<p.config.swing_sensitivity<<";sharpness="<<p.config.swing_sharpness<<";hum="<<p.hum_name<<";ignite_effect="<<p.ignition_name<<";retract_effect="<<p.retraction_name<<";swing_pairs="<<p.lows.size()<<";humStart_ms="<<p.hum_start_ms<<";audio_frames="<<p.rendered_frames.load();return s.str();}
void SaberEngine::render(int16_t*out,int frames,int rate){
  std::lock_guard<std::mutex> lock(impl_->mutex); auto&p=*impl_; if(!out||frames<=0||rate<=0)return;
  MotionFrame mf{0,p.gy.load(),p.gz.load(),p.timestamp.load()}; MixGains gains=p.core.update(mf,p.on);
  p.reported_speed.store(p.core.speed_dps(),std::memory_order_relaxed);
  p.current_rate=rate;
  bool swinging=p.on&&p.core.speed_dps()>=p.config.swing_strength_threshold*.9f;
  if(!swinging&&p.was_swinging)p.reseed_after_swing=true;
  if(swinging&&p.reseed_after_swing){gains.swing_low=0;gains.swing_high=0;}
  p.swing_low_gain=gains.swing_low*.5f;p.swing_high_gain=gains.swing_high*.5f;
  p.was_swinging=swinging;
  p.reported_swing.store(p.core.active(),std::memory_order_relaxed);
  if(p.on&&!p.have_pair)p.newPair();
  const float swing_ramp_per_sample=1.0f/(rate*(p.on?0.002f:0.2f));
  for(int i=0;i<frames;i++){
    bool hum_wait=p.on&&p.ignition_elapsed_seconds<p.hum_start_delay;
    p.target_hum=gains.hum*(p.on&&!hum_wait?p.font_hum_volume:0.0f);
    float fade_seconds=!p.on?0.2f:(p.ignition_elapsed_seconds<p.hum_start_delay+p.hum_fade_seconds?p.hum_fade_seconds:0.002f);
    const float hum_ramp_per_sample=1.0f/(rate*std::max(0.002f,fade_seconds));
    p.hum_gain+=clampf(p.target_hum-p.hum_gain,-hum_ramp_per_sample,hum_ramp_per_sample);
    p.swing_low_current+=clampf(p.swing_low_gain-p.swing_low_current,-swing_ramp_per_sample,swing_ramp_per_sample);
    p.swing_high_current+=clampf(p.swing_high_gain-p.swing_high_current,-swing_ramp_per_sample,swing_ramp_per_sample);
    float l=p.on?p.source(p.hum,p.hum_pos,0,rate,true)*p.hum_gain:0;
    if(p.ignition){l+=p.source(p.ignite,p.effect_pos,0,rate,false)*p.font_effect_volume;if(p.effect_pos>=p.ignite.frames()*double(rate)/p.ignite.rate)p.ignition=false;}
    if(p.retracting){
      if(p.playing_postoff){l+=p.source(p.postoff,p.postoff_pos,0,rate,false)*p.font_effect_volume;if(p.postoff_pos>=p.postoff.frames()*double(rate)/p.postoff.rate)p.retracting=false;}
      else {l+=p.source(p.retract,p.effect_pos,0,rate,false)*p.font_effect_volume;if(p.effect_pos>=p.retract.frames()*double(rate)/p.retract.rate){if(p.postoff.frames())p.playing_postoff=true;else p.retracting=false;}}
    }
    if(p.one_shot&&p.one_shot->frames()){l+=p.source(*p.one_shot,p.one_shot_pos,0,rate,false)*p.font_effect_volume;if(p.one_shot_pos>=p.one_shot->frames()*double(rate)/p.one_shot->rate)p.one_shot=nullptr;}
    if(p.on&&p.lock_active&&p.lock_start.frames()&&p.lock_start_pos<p.lock_start.frames()*double(rate)/p.lock_start.rate)l+=p.source(p.lock_start,p.lock_start_pos,0,rate,false)*p.font_effect_volume;
    if(p.on&&p.lock_active&&p.lock_loop.frames())l+=p.source(p.lock_loop,p.lock_pos,0,rate,true)*p.font_effect_volume;
    else if(p.lock_ending&&p.lock_end.frames()){l+=p.source(p.lock_end,p.lock_pos,0,rate,false)*p.font_effect_volume;if(p.lock_pos>=p.lock_end.frames()*double(rate)/p.lock_end.rate)p.lock_ending=false;}
    float lo=0,hi=0;
    if(p.on&&p.have_pair){lo=p.source(p.lows[p.current],p.low_pos,0,rate,true)*p.swing_low_current;hi=p.source(p.highs[p.current],p.high_pos,0,rate,true)*p.swing_high_current;}
    float sample=32767.0f*std::tanh(((l+lo+hi)*0.78f)/32767.0f);
    out[i*2]=int16_t(sample);out[i*2+1]=int16_t(sample);
    p.ignition_elapsed_seconds+=1.0/rate;
  }
  if(p.reseed_after_swing&&p.swing_low_current<.01f&&p.swing_high_current<.01f){p.newPair();p.reseed_after_swing=false;}
  p.rendered_frames.fetch_add(uint64_t(frames),std::memory_order_relaxed);
  if(!p.on&&!p.retracting&&p.hum_gain<0.0001f)p.hum_gain=0;
}
}
