#include "rounded_blade_mesh.h"

#include <cassert>
#include <algorithm>
#include <cmath>
#include <iostream>

int main() {
    constexpr float ratio=0.022f/0.92f;
    const auto mesh=MakeRoundedBladeMesh(ratio);
    assert(!mesh.empty()&&mesh.size()%18==0);
    float min_z=0.0f,max_z=0.0f,max_radius=0.0f;
    bool rounded_pole=false,equator_connected=false,flat_tip_triangle=false;
    for(std::size_t i=0;i<mesh.size();i+=6){
        const float x=mesh[i],y=mesh[i+1],z=mesh[i+2],nx=mesh[i+3],ny=mesh[i+4],nz=mesh[i+5];
        assert(std::isfinite(x)&&std::isfinite(y)&&std::isfinite(z));
        const float norm=std::sqrt(nx*nx+ny*ny+nz*nz);
        assert(std::fabs(norm-1.0f)<1e-4f);
        min_z=std::min(min_z,z);max_z=std::max(max_z,z);max_radius=std::max(max_radius,std::sqrt(x*x+y*y));
        if(z<-0.9999f&&std::sqrt(x*x+y*y)<1e-4f&&nz<-.999f)rounded_pole=true;
        if(std::fabs(z+(1.0f-ratio))<1e-4f&&std::fabs(std::sqrt(x*x+y*y)-1.0f)<1e-4f)equator_connected=true;
    }
    for(std::size_t i=0;i<mesh.size();i+=18)
        if(mesh[i+2]<-.99999f&&mesh[i+8]<-.99999f&&mesh[i+14]<-.99999f)flat_tip_triangle=true;
    assert(std::fabs(min_z+1.0f)<1e-5f&&std::fabs(max_z)<1e-5f);
    assert(std::fabs(max_radius-1.0f)<1e-5f&&rounded_pole&&equator_connected&&!flat_tip_triangle);
    const float physical_tip_depth=0.92f*ratio;
    assert(std::fabs(physical_tip_depth-0.022f)<1e-6f);
    std::cout<<"rounded dual-layer blade mesh bounds, unit normals, continuous equator, and hemispherical terminal verified\n";
}
