#pragma once

#include <cstddef>

struct BladePaletteColor {
    const char* id;
    const char* name;
    float r, g, b;
};

inline constexpr BladePaletteColor kBladePalette[] = {
    {"green",  "CLASSIC GREEN", 0.08f, 1.00f, 0.16f},
    {"blue",   "SABER BLUE",    0.06f, 0.32f, 1.00f},
    {"red",    "SITH RED",      1.00f, 0.035f,0.055f},
    {"purple", "AMETHYST",      0.58f, 0.12f, 0.98f},
    {"yellow", "GOLDEN YELLOW", 1.00f, 0.72f, 0.05f},
    {"cyan",   "ION CYAN",      0.04f, 0.88f, 1.00f},
    {"white",  "PURE WHITE",    0.94f, 0.98f, 1.00f},
};
inline constexpr std::size_t kBladePaletteCount = sizeof(kBladePalette) / sizeof(kBladePalette[0]);
inline constexpr int kDefaultBladeColor = 0;
