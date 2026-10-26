#pragma once

#include <array>
#include <cmath>
#include <vector>

// Returns interleaved position/normal triangles for a unit-length cylinder
// whose terminal end is a hemisphere. X/Y radius is one and Z spans [0,-1].
inline std::vector<float> MakeRoundedBladeMesh(float tip_ratio, int sides=32, int tip_rings=10) {
    if (!(tip_ratio > 0.0f && tip_ratio < 0.5f) || sides < 8 || tip_rings < 2) return {};
    std::vector<float> mesh;
    auto vertex=[&](float x,float y,float z,float nx,float ny,float nz){mesh.insert(mesh.end(),{x,y,z,nx,ny,nz});};
    auto triangle=[&](const std::array<float,6>&a,const std::array<float,6>&b,const std::array<float,6>&c){
        vertex(a[0],a[1],a[2],a[3],a[4],a[5]);vertex(b[0],b[1],b[2],b[3],b[4],b[5]);vertex(c[0],c[1],c[2],c[3],c[4],c[5]);
    };
    const float body=1.0f-tip_ratio;
    constexpr float pi=3.14159265358979323846f;
    for(int i=0;i<sides;i++){
        const float a=2*pi*i/sides,b=2*pi*(i+1)/sides;
        const float ax=std::cos(a),ay=std::sin(a),bx=std::cos(b),by=std::sin(b);
        const std::array<float,6>a0{ax,ay,0,ax,ay,0},b0{bx,by,0,bx,by,0};
        const std::array<float,6>a1{ax,ay,-body,ax,ay,0},b1{bx,by,-body,bx,by,0};
        triangle(a0,b0,b1);triangle(a0,b1,a1);
        for(int ring=0;ring<tip_rings;ring++){
            const float t0=(pi*.5f*ring)/tip_rings,t1=(pi*.5f*(ring+1))/tip_rings;
            auto point=[&](float phi,float theta){
                const float s=std::sin(theta),c=std::cos(theta);
                return std::array<float,6>{s*std::cos(phi),s*std::sin(phi),-body-tip_ratio*c,s*std::cos(phi),s*std::sin(phi),-c};
            };
            const auto p00=point(a,t0),p01=point(a,t1),p10=point(b,t0),p11=point(b,t1);
            triangle(p00,p10,p11);triangle(p00,p11,p01);
        }
    }
    return mesh;
}
