#include "saber_audio_stream.h"
#include <godot_cpp/godot.hpp>

extern "C" {
GDExtensionBool GDE_EXPORT lightsaber_library_init(GDExtensionInterfaceGetProcAddress get_proc_address,
    const GDExtensionClassLibraryPtr library, GDExtensionInitialization *initialization) {
  godot::GDExtensionBinding::InitObject init_obj(get_proc_address, library, initialization);
  init_obj.register_initializer(initialize_lightsaber_module);
  init_obj.register_terminator(uninitialize_lightsaber_module);
  init_obj.set_minimum_library_initialization_level(godot::MODULE_INITIALIZATION_LEVEL_SCENE);
  return init_obj.init();
}
}
