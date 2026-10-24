#include "saber_engine.h"

#include <cassert>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char** argv) {
  if (argc != 2) {
    std::cerr << "usage: font_smoke <extracted-SmthJedi-directory>\n";
    return 2;
  }
  lightsaber::SaberEngine engine;
  std::string error;
  if (!engine.loadFont(argv[1], &error)) {
    std::cerr << "SmthJedi load failed: " << error << '\n';
    return 1;
  }
  const std::string diagnostic = engine.diagnostics();
  if (diagnostic.find("swing_pairs=8") == std::string::npos ||
      diagnostic.find("ignite_effect=out") == std::string::npos ||
      diagnostic.find("retract_effect=in") == std::string::npos) {
    std::cerr << "unexpected SmthJedi engine configuration: " << diagnostic << '\n';
    return 1;
  }
  engine.ignite();
  std::vector<int16_t> block(512);
  engine.render(block.data(), 256, 44100);
  double energy = 0;
  for (int16_t sample : block) energy += std::abs(static_cast<int>(sample));
  if (energy == 0) {
    std::cerr << "SmthJedi engine loaded but generated silent output\n";
    return 1;
  }
  std::cout << "official SmthJedi loaded: " << diagnostic << '\n';
  return 0;
}
