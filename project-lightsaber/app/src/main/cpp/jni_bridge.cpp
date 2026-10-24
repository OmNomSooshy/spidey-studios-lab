#include <jni.h>
#include "saber_engine.h"
#include <string>
static lightsaber::SaberEngine engine;
extern "C" JNIEXPORT jboolean JNICALL Java_studios_spidey_lightsaber_MainActivity_nativeLoadFont(JNIEnv* env,jclass,jstring path,jobjectArray error){
  const char* p=env->GetStringUTFChars(path,nullptr);std::string message;bool ok=engine.loadFont(p,&message);env->ReleaseStringUTFChars(path,p);
  if(error&&env->GetArrayLength(error)>0){jstring m=env->NewStringUTF(message.c_str());env->SetObjectArrayElement(error,0,m);env->DeleteLocalRef(m);}return ok?JNI_TRUE:JNI_FALSE;
}
extern "C" JNIEXPORT void JNICALL Java_studios_spidey_lightsaber_MainActivity_nativeMotion(JNIEnv*,jclass,jfloat y,jfloat z,jlong t){engine.motion({0,y,z,uint64_t(t)});}
extern "C" JNIEXPORT void JNICALL Java_studios_spidey_lightsaber_MainActivity_nativeIgnite(JNIEnv*,jclass){engine.ignite();}
extern "C" JNIEXPORT void JNICALL Java_studios_spidey_lightsaber_MainActivity_nativeRetract(JNIEnv*,jclass){engine.retract();}
extern "C" JNIEXPORT void JNICALL Java_studios_spidey_lightsaber_MainActivity_nativeRender(JNIEnv* env,jclass,jshortArray array,jint frames,jint rate){jshort* p=env->GetShortArrayElements(array,nullptr);engine.render(reinterpret_cast<int16_t*>(p),frames,rate);env->ReleaseShortArrayElements(array,p,0);}
extern "C" JNIEXPORT jstring JNICALL Java_studios_spidey_lightsaber_MainActivity_nativeDiagnostics(JNIEnv* env,jclass){std::string s=engine.diagnostics();return env->NewStringUTF(s.c_str());}
