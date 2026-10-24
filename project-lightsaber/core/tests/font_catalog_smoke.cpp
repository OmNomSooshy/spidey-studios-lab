#include "saber_engine.h"

#include <cassert>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

int main(int argc,char**argv){
  if(argc<2){std::cerr<<"usage: font_catalog_smoke <font-directory>...\n";return 2;}
  for(int i=1;i<argc;i++){
    lightsaber::SaberEngine engine;std::string error;
    if(!engine.loadFont(argv[i],&error)){std::cerr<<argv[i]<<": "<<error<<'\n';return 1;}
    const std::string diag=engine.diagnostics();
    if(diag.find("swing_pairs=0")!=std::string::npos){std::cerr<<argv[i]<<": no swing pairs loaded\n";return 1;}
    engine.ignite();std::vector<int16_t> pcm(1024);engine.render(pcm.data(),512,48000);
    bool audible=false;for(int16_t s:pcm)audible|=s!=0;
    if(!audible){std::cerr<<argv[i]<<": ignition produced silence\n";return 1;}
    for(uint64_t n=1;n<=8;n++){engine.motion({0,0,220.0f,1'000'000'000ULL+n*20'000'000ULL});engine.render(pcm.data(),512,48000);}
    if(engine.diagnostics().find("swing=active")==std::string::npos){std::cerr<<argv[i]<<": synthetic gyro trace did not activate paired smooth swing\n";return 1;}
    engine.triggerEffect(lightsaber::SaberEffect::Clash);engine.triggerEffect(lightsaber::SaberEffect::Blaster);engine.triggerEffect(lightsaber::SaberEffect::Stab);
    engine.setLockup(true);engine.render(pcm.data(),512,48000);engine.setLockup(false);engine.retract();engine.render(pcm.data(),512,48000);
    std::cout<<argv[i]<<": ignition and gyro-driven swing rendered; clash="<<engine.effectAvailable(lightsaber::SaberEffect::Clash)
      <<" blaster="<<engine.effectAvailable(lightsaber::SaberEffect::Blaster)
      <<" stab="<<engine.effectAvailable(lightsaber::SaberEffect::Stab)
      <<" lockup="<<engine.lockupAvailable()<<"; "<<diag<<'\n';
  }
}
