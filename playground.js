/* XIV: bounded surfaces and one pendulum, sharing the backyard's actual bodies.
   No animation owns travel. The renderer consumes these contact/velocity states. */
window.createBytePlayground=function({actor,state,project,unproject,voice}){
 const bounds={x:2200,y:1200},tower={x:1610,y:370},swing={x:1770,y:730,z:205,length:160,theta:0,omega:0,rider:false,hand:false},bounce={x:2040,y:940,r:64,z:20,compression:0,velocity:0},stats={landings:0,slides:0,boards:0,bounces:0,autonomous:0};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let slideBody=null;
 function surface(x,y){if(y>=315&&y<=425){
   if(x>=1310&&x<1410)return{z:(x-1310)*.64,gx:.64,kind:'ramp'};
   if(x>=1410&&x<1460)return{z:64,gx:0,kind:'landing'};
   if(x>=1460&&x<1530)return{z:64+(x-1460)*66/70,gx:66/70,kind:'ramp'};
   if(x>=1530&&x<1690)return{z:130,gx:0,kind:'deck'};
   if(x>=1690&&x<=1970)return{z:130*(1970-x)/280,gx:-130/280,kind:'slide'};
 }if(Math.hypot(x-bounce.x,y-bounce.y)<bounce.r)return{z:bounce.z,gx:0,kind:'bounce'};return{z:0,gx:0,kind:'lawn'};}
 function grounded(v){return v.z<=surface(v.x,v.y).z+10&&!swing.rider;}
 function seat(){return{x:swing.x+Math.sin(swing.theta)*swing.length,y:swing.y,z:swing.z-Math.cos(swing.theta)*swing.length};}
 function release(){if(swing.rider){const p=seat();actor.x=p.x;actor.y=p.y;actor.z=p.z;actor.vx=Math.cos(swing.theta)*swing.length*swing.omega;actor.vy=0;actor.vz=Math.sin(swing.theta)*swing.length*swing.omega;swing.rider=false;actor.pose=null;} }
 function interrupt(){release();state.playgroundIntent=null;}
 function route(x,y){const dest=surface(x,y);if(dest.z>35&&dest.kind!=='bounce'&&surface(actor.x,actor.y).kind==='lawn')return[{x:1330,y:370},{x,y:370},...(Math.abs(y-370)>10?[{x,y}]:[])];return[{x,y}];}
 function target(screenX,screenY){let best=null;
   // Only the actual visible raised walkway takes elevated tap authority. Ground
   // and empty-background panning retain the original gesture ownership.
   for(let x=1310;x<=1970;x+=8){const f=surface(x,370),p=project(x,370,f.z);const d=Math.hypot(screenX-p.x,screenY-p.y);if(d<30&&(!best||d<best.d))best={x,y:370,d};}
   const s=seat(),p=project(s.x,s.y,s.z);if(Math.hypot(screenX-p.x,screenY-p.y)<29)return{x:s.x,y:s.y,swing:true};return best;
 }
 function dragHeight(screenX,screenY,oldZ){let best=null;for(let x=1310;x<=1970;x+=6){const z=surface(x,370).z,p=project(x,370,z+112*.48);const d=Math.hypot(screenX-p.x,screenY-p.y);if(d<37&&(!best||d<best.d))best={d,z};}const s=seat(),p=project(s.x,s.y,s.z+112*.48);if(Math.hypot(screenX-p.x,screenY-p.y)<35)return s.z+3;return best?best.z+3:oldZ;}
 function contact(v,old,dt){const f=surface(v.x,v.y),before=surface(old.x,old.y),cross=old.z>=f.z-7&&v.z<=f.z&&v.vz<=80,walk=old.z<=before.z+5&&Math.abs(f.z-before.z)<24&&v.vz<100;
   if(f.z>0&&v.z<f.z-8&&!walk&&!cross){v.x=old.x;v.y=old.y;v.vx*=-.25;v.vy*=-.25;return false;}
   if(f.z<=0||(!cross&&!walk))return false;
   const impact=Math.max(0,-v.vz);v.z=f.z;v.vz=0;
   if(f.kind==='bounce'){v.vz=Math.max(540,impact*.83);v.z=f.z+2;v.squash=.4;bounce.velocity+=Math.min(150,impact*.3+75);stats.bounces++;voice('boing',.65);if(v===actor){if(state.playgroundIntent==='bounce')state.playgroundIntent=null;}return true;}
   if(f.kind==='slide'){const den=1+f.gx*f.gx;v.vx+=-850*f.gx/den*dt;v.vx*=Math.exp(-dt*.22);v.vy*=Math.exp(-dt*2);v.vz=f.gx*v.vx;if(v===actor){actor.target=null;if(slideBody!==actor){stats.slides++;slideBody=actor;}actor.pose='satisfied';actor.poseTime=2;actor.angle*=Math.exp(-dt*7);} }
   else{v.vx*=Math.exp(-dt*3);v.vy*=Math.exp(-dt*3);if(impact>150){v.squash=Math.min(.55,impact/700);stats.landings++;voice('land',.35);}}
   return true;
 }
 function begin(x,y){const p=seat(),q=project(p.x,p.y,p.z+8);if(Math.hypot(x-q.x,y-q.y)<29){swing.hand=true;return true;}return false;}
 function move(x,y){const p=unproject(x,y,45);const now=performance.now(),oldTheta=swing.theta;swing.theta=clamp(Math.asin(clamp((p.x-swing.x)/swing.length,-.94,.94)),-1.23,1.23);swing.flick=swing.lastInput?clamp((swing.theta-oldTheta)/Math.max(.02,(now-swing.lastInput)/1000),-4,4):0;swing.lastInput=now;swing.omega=0;}
 function end(){swing.hand=false;swing.omega=performance.now()-(swing.lastInput||0)<160?(swing.flick||0):0;}
 function update(dt){bounce.velocity+=(-bounce.compression*95-bounce.velocity*12)*dt;bounce.compression=clamp(bounce.compression+bounce.velocity*dt,-2,12);
   if(!swing.hand){swing.omega+=(-850/swing.length*Math.sin(swing.theta)-swing.omega*.12)*dt;if(swing.rider&&!state.hand&&!state.rope.active)swing.omega+=Math.sin(swing.theta)*dt*1.2;swing.theta+=swing.omega*dt;if(Math.abs(swing.theta)>1.26){swing.theta=clamp(swing.theta,-1.26,1.26);swing.omega*=-.4;}}
   const p=seat();if(!swing.rider&&!actor.grabbed&&!state.rope.active&&actor.vz<=100&&Math.hypot(actor.x-p.x,actor.y-p.y)<24&&Math.abs(actor.z-p.z)<12){swing.rider=true;swing.omega+=actor.vx/(swing.length*Math.max(.4,Math.cos(swing.theta)));stats.boards++;actor.target=null;actor.pose='satisfied';actor.poseTime=6;state.playgroundIntent=null;}
   if(swing.rider){if(actor.grabbed||state.rope.active){release();return;}Object.assign(actor,{x:p.x,y:p.y,z:p.z,vx:Math.cos(swing.theta)*swing.length*swing.omega,vy:0,vz:Math.sin(swing.theta)*swing.length*swing.omega,angle:0});}
   if(surface(actor.x,actor.y).kind!=='slide')slideBody=null;
   if(state.playgroundIntent==='swing'&&actor.target&&Math.hypot(actor.x-swing.x,actor.y-swing.y)<30&&grounded(actor)){actor.vz=270;actor.target=null;}
 }
 function opportunity(){const n=state.playgroundVisits=(state.playgroundVisits||0)+1;stats.autonomous++;if(n%3===1){state.playgroundIntent='climb';return{x:1600,y:370,reason:'playground'};}if(n%3===2){state.playgroundIntent='swing';return{x:swing.x,y:swing.y,reason:'playground'};}state.playgroundIntent='bounce';return{x:bounce.x,y:bounce.y,reason:'playground'};}
 function arrived(){if(state.playgroundIntent==='climb'){state.playgroundIntent='slide';return{x:1850,y:370,reason:'playground'};}if(state.playgroundIntent==='swing'){actor.vz=280;return null;}return null;}
 return{bounds,tower,swing,bounce,stats,surface,grounded,seat,release,interrupt,route,target,dragHeight,contact,begin,move,end,update,opportunity,arrived};
};
