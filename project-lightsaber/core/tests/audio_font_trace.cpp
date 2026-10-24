#include "saber_engine.h"
#include <cassert>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace fs=std::filesystem;
static void put16(std::ofstream& f,unsigned v){f.put(char(v));f.put(char(v>>8));}
static void put32(std::ofstream& f,unsigned v){put16(f,v);put16(f,v>>16);}
static void wav(const fs::path& path,float hz){
  fs::create_directories(path.parent_path()); constexpr unsigned rate=44100,frames=4410,data=frames*2;
  std::ofstream f(path,std::ios::binary);f.write("RIFF",4);put32(f,36+data);f.write("WAVEfmt ",8);put32(f,16);put16(f,1);put16(f,1);put32(f,rate);put32(f,rate*2);put16(f,2);put16(f,16);f.write("data",4);put32(f,data);
  for(unsigned i=0;i<frames;i++)put16(f,unsigned(uint16_t(int16_t(std::sin(2*3.14159265*hz*i/rate)*6000))));
}
static float rms(const std::vector<int16_t>& x){double s=0;for(auto v:x)s+=double(v)*v;return float(std::sqrt(s/x.size()));}
int main(){
  fs::path root=fs::temp_directory_path()/"lightsaber-font-fixture";fs::remove_all(root);
  wav(root/"hum.wav",110);wav(root/"in.wav",220);wav(root/"out.wav",330);
  wav(root/"swingl"/"swingl01.wav",500);wav(root/"swingh"/"swingh01.wav",900);
  {std::ofstream c(root/"smoothsw.ini");c<<"SwingSensitivity=100\nSwingStrengthThreshold=20\nSwingSharpness=1.5\nMaxSwingVolume=1.0\n";}
  lightsaber::SaberEngine engine;std::string error;
  assert(engine.loadFont(root.string(),&error));assert(error.empty());assert(engine.fontReady());
  assert(engine.diagnostics().find("sensitivity=100")!=std::string::npos);
  assert(engine.diagnostics().find("ignite_effect=out")!=std::string::npos);
  assert(engine.diagnostics().find("retract_effect=in")!=std::string::npos);
  assert(engine.diagnostics().find("swing_pairs=1")!=std::string::npos);
  engine.ignite();std::vector<int16_t> block(512);engine.render(block.data(),256,44100);assert(rms(block)>100);
  for(int i=1;i<=8;i++){engine.motion({0,0,360,1'000'000'000ULL+uint64_t(i)*20'000'000ULL});engine.render(block.data(),256,44100);}
  assert(rms(block)>100);for(auto s:block)assert(std::abs(int(s))<32767);
  engine.retract();engine.render(block.data(),256,44100);assert(rms(block)>0);
  fs::remove_all(root);
  fs::path legacy=fs::temp_directory_path()/"lightsaber-legacy-font";fs::remove_all(legacy);wav(legacy/"hum.wav",90);wav(legacy/"poweron.wav",330);wav(legacy/"poweroff.wav",220);wav(legacy/"lswing.wav",400);wav(legacy/"hswing.wav",800);
  assert(engine.loadFont(legacy.string(),&error));fs::remove_all(legacy);
  fs::path mismatch=fs::temp_directory_path()/"lightsaber-mismatch-font";fs::remove_all(mismatch);wav(mismatch/"hum.wav",90);wav(mismatch/"in.wav",330);wav(mismatch/"out.wav",220);wav(mismatch/"swingl"/"swingl01.wav",400);
  assert(!engine.loadFont(mismatch.string(),&error));assert(error.find("Missing required WAV files")!=std::string::npos);fs::remove_all(mismatch);
  fs::path invalid=fs::temp_directory_path()/"lightsaber-invalid-font";fs::remove_all(invalid);fs::create_directories(invalid);{std::ofstream f(invalid/"hum.wav");f<<"unsupported";}
  assert(!engine.loadFont(invalid.string(),&error));assert(error.find("Unsupported audio encoding")!=std::string::npos);fs::remove_all(invalid);
  fs::path missing=fs::temp_directory_path()/"lightsaber-missing-font";fs::remove_all(missing);fs::create_directories(missing);
  assert(!engine.loadFont(missing.string(),&error));assert(error.find("Missing required WAV files")!=std::string::npos);fs::remove_all(missing);
  fs::path bad_pair=fs::temp_directory_path()/"lightsaber-unsupported-pair-font";fs::remove_all(bad_pair);wav(bad_pair/"hum.wav",90);wav(bad_pair/"in.wav",330);wav(bad_pair/"out.wav",220);{std::ofstream f(bad_pair/"swingl01.wav");f<<"not wav";}wav(bad_pair/"swingh01.wav",800);
  assert(!engine.loadFont(bad_pair.string(),&error));assert(error.find("Unsupported audio encoding")!=std::string::npos);fs::remove_all(bad_pair);
  fs::path wrong_config=fs::temp_directory_path()/"lightsaber-config-font";fs::remove_all(wrong_config);wav(wrong_config/"hum.wav",90);wav(wrong_config/"out.wav",330);wav(wrong_config/"in.wav",220);wav(wrong_config/"swingl01.wav",400);wav(wrong_config/"swingh01.wav",800);{std::ofstream c(wrong_config/"smoothsw.ini");c<<"Version=1\n";}
  assert(!engine.loadFont(wrong_config.string(),&error));assert(error.find("Version=2")!=std::string::npos);fs::remove_all(wrong_config);
  std::cout<<"font/config discovery, numbered and legacy pairs, mismatches, WAV rejection, and saber render ok\n";
}
