/* XII: a ground-plane body and a viewpoint. Neither owns the other.
   World metres are small pixel-like units; height, velocity and contacts are physical state. */
window.createByteBackyard = function(api) {
  const {ctx,world,byte,life,home,assets,economy,bathroom}=api;
  const key='byte-backyard-xii-v1',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let old;try{old=JSON.parse(localStorage.getItem(key))}catch(_){}
  const maxX=2200,maxY=1200, H=112, W=H*.81;
  const seeds=[{id:'seed-rose',kind:'seed',x:255,y:175,color:'#ef8da4'}, {id:'seed-sun',kind:'seed',x:315,y:175,color:'#f6cf67'}, {id:'seed-blue',kind:'seed',x:375,y:175,color:'#90bfe8'}];
  const defaults=[{id:'can',kind:'can',x:255,y:265,r:22},{id:'ball',kind:'ball',x:600,y:750,r:19},
    {id:'bench',kind:'bench',x:840,y:910,r:45},{id:'lantern',kind:'lantern',x:735,y:865,r:20},{id:'pot',kind:'pot',x:960,y:810,r:24}];
  const valid=n=>Number.isFinite(n);
  const actor={x:180,y:250,z:0,vx:0,vy:0,vz:0,angle:0,spin:0,squash:0,facing:1,frame:0,clock:0,target:null,grabbed:false,carry:null,pose:null,poseTime:0};
  const state={active:false,pending:false,time:0,idle:0,nextInterest:10,interest:null,care:null,invitation:null,inviteSerial:0,
    camera:{x:0,y:0},actor,hand:null,play:{phase:'idle',home:{x:610,y:760},answered:0,returns:0},
    rope:{active:false,planted:false},flowers:[],items:[],visits:0,cacheBytes:0,cacheBuilds:0};
  for(const v of defaults){const s=old?.items?.find(x=>x.id===v.id);state.items.push({...v,...(s&&valid(s.x)&&valid(s.y)?{x:clamp(s.x,40,maxX-40),y:clamp(s.y,40,1160),z:clamp(s.z||0,0,400)}:{}),z:clamp(Number(s?.z)||0,0,400),vx:0,vy:0,vz:0,angle:0});}
  for(let i=0;i<6;i++){const f=old?.flowers?.[i];state.flowers.push({id:i,x:340+(i%3)*110,y:370+Math.floor(i/3)*105,stage:clamp(Number(f?.stage)||0,0,3),water:clamp(Number(f?.water)||0,0,1),shown:!!f?.shown,color:['#ef8da4','#f6cf67','#90bfe8'].includes(f?.color)?f.color:'#ef8da4'});}
  if(old?.active&&valid(old?.actor?.x)&&valid(old?.actor?.y)){Object.assign(actor,{x:clamp(old.actor.x,30,maxX-30),y:clamp(old.actor.y,30,1170),z:clamp(old.actor.z||0,0,400)});state.active=true;}
  state.visits=Number(old?.visits)||0;
  if(valid(old?.camera?.x)&&valid(old?.camera?.y))Object.assign(state.camera,old.camera);
  if(old?.rope?.active&&valid(old.rope.x)&&valid(old.rope.y))Object.assign(state.rope,{active:true,planted:true,x:clamp(old.rope.x,0,maxX),y:clamp(old.rope.y,0,1200),z:0,length:clamp(old.rope.length,20,190)});
  const iso=(x,y)=>({x:(x-y)*.8,y:(x+y)*.42});
  const inverse=(x,y)=>({x:(x/.8+y/.42)/2,y:(y/.42-x/.8)/2});
  function project(x,y,z=0){const p=iso(x,y);return{x:p.x-state.camera.x+world.w*.5,y:p.y-z-state.camera.y+world.h*.52};}
  function unproject(x,y,z=0){return inverse(x-world.w*.5+state.camera.x,y-world.h*.52+state.camera.y+z);}
  const playground=window.createBytePlayground({actor,state,project,unproject,voice:api.voice});state.playground=playground;
  function save(){try{localStorage.setItem(key,JSON.stringify({active:state.active,actor:{x:actor.x,y:actor.y,z:actor.z},camera:state.camera,visits:state.visits,
    items:state.items.map(({id,x,y,z})=>({id,x,y,z})),flowers:state.flowers.map(({stage,water,color,shown})=>({stage,water,color,shown})),rope:state.rope.active&&state.rope.planted?state.rope:null}))}catch(_){} }
  function cameraBounds(){state.camera.x=clamp(state.camera.x,-960,maxX*.8);state.camera.y=clamp(state.camera.y,60,(maxX+maxY)*.42);}
  function ui(){document.body.classList.toggle('backyard-away',state.active);}
  function enter(){if(state.active)return;if(!state.cacheBuilds)cache();lastDraw='';home.cancel();api.wakeByte();state.active=true;state.pending=false;state.visits++;actor.x=180;actor.y=250;actor.z=0;actor.vx=actor.vy=actor.vz=0;actor.target=null;byte.targetX=byte.targetY=null;life.pendingFollow=false;
    Object.assign(state.camera,iso(210,290));state.idle=0;home.save();save();ui();api.voice('notice',.6);}
  function leave(){state.active=false;state.pending=false;state.hand=null;actor.grabbed=false;actor.carry=null;actor.target=null;state.invitation=null;state.rope.active=false;
    home.room=5;const p=home.space(5);home.cameraX=p.x;home.cameraY=p.y;byte.x=Math.min(world.w*.88,world.w-api.extents().x-12);byte.y=api.floorY();byte.targetX=byte.targetY=null;byte.vx=byte.vy=0;byte.mode='idle';life.lastTouch=performance.now();home.syncUI();home.save();save();ui();}
  const door=()=>{const g=window.bytePassageBounds(world.w,world.h,api.roomH());return{x:world.w-g.hitWidth*.4,y:(g.top+24+g.floor)/2,w:g.hitWidth,h:g.floor-g.top-24,top:g.top};};
  function doorway(){if(state.active||home.room!==5||home.travel||api.obby.hasLaunched)return;window.drawBytePassage(ctx,world.w,world.h,api.roomH(),'right','#a3bf8c');}
  function entryTarget(){const e=api.extents();if(api.earth.enabled){if(!api.earth.support.active)return null;if(api.earth.support.edge==='right')return{x:world.w-e.x,y:clamp(door().y,e.y,world.h-e.y)};if(api.earth.support.edge!=='bottom')return null;return{x:world.w-e.x-12,y:world.h-e.y};}return{x:world.w-e.x-12,y:api.floorY()};}
  function indoorBegin(x,y){if(home.room!==5||home.travel||api.obby.hasLaunched)return false;const d=door();if(x<world.w-d.w||y<d.top+24)return false;
    if(api.web.active||byte.grabbed||home.hand)return false;const target=entryTarget();if(!target)return false;home.cancel();api.wakeByte();state.pending=true;state.entryPoint=target;byte.targetX=target.x;byte.targetY=target.y;byte.mode='scuttle';life.pointer.kind='garden-door';life.lastTouch=performance.now();return true;}
  function afterRelease(x,y){if(home.room!==5||home.travel||api.obby.hasLaunched||api.web.active)return;const d=door();if(x>world.w-d.w&&y>d.top+24&&world.w-byte.x-api.extents().x<72)enter();}
  function ready(){ui();if(state.active&&!state.cacheBuilds)cache();if(state.active){home.unseen?.capture('backyard');cameraBounds();}else state.camera={...iso(210,290)};}
  function idleIndoor(){if(!state.pending)return;if(home.room!==5||home.travel||byte.grabbed||api.web.active){state.pending=false;return;}if(state.entryPoint&&Math.hypot(byte.x-state.entryPoint.x,byte.y-state.entryPoint.y)<20)enter();}
  function bodyPoint(){return project(actor.x,actor.y,actor.z+H*.48);}
  function hitByte(x,y){const p=bodyPoint(),dx=x-p.x,dy=y-p.y,c=Math.cos(actor.angle),s=Math.sin(actor.angle);return Math.abs(dx*c+dy*s)<W*.54*(1+actor.squash*.4)&&Math.abs(-dx*s+dy*c)<H*.55*(1-actor.squash*.45);}
  function spoolWorld(){const lx=W*.205*actor.facing*(1+actor.squash*.4),ly=H*.205*(1-actor.squash*.45),c=Math.cos(actor.angle),s=Math.sin(actor.angle),offset=inverse(c*lx-s*ly,0);return{x:actor.x+offset.x,y:actor.y+offset.y,z:actor.z+H*.48-(s*lx+c*ly)};}
  function spoolPoint(){const p=spoolWorld();return project(p.x,p.y,p.z);}
  function follow(x,y,reason='call'){if(reason==='call')playground.interrupt();const route=playground.route(x,y);state.route=route;const first=route.shift();x=first.x;y=first.y;if(reason==='call'&&state.care){state.care=null;releaseCarry();}actor.detour=null;actor.target={x:clamp(x,35,maxX-35),y:clamp(y,35,maxY-35),reason};state.idle=0;state.interest=null;if(reason==='call')state.invitation=null;}
  function releaseCarry(){if(actor.carry){const v=actor.carry;v.vx=actor.vx;v.vy=actor.vy;v.vz=actor.vz;actor.carry=null;}}
  function begin(x,y,id){if(!state.active)return false;
    const rope=state.rope;if(rope.active&&rope.planted){const p=project(rope.x,rope.y,rope.z);if(Math.hypot(x-p.x,y-p.y)<27){rope.active=false;save();return true;}}
    const inv=invitationPoint();if(inv&&Math.hypot(x-inv.knobX,y-inv.knobY)<35){state.hand={kind:'invite',id,x,y,lastX:x,lastY:y,startX:x,startY:y};return true;}
    const all=[...state.items,...seeds].sort((a,b)=>b.x+b.y-a.x-a.y);
    for(const v of all){if(hitByte(x,y)&&v.x+v.y<actor.x+actor.y)continue;const p=project(v.x,v.y,(v.z||0)+(v.kind==='bench'?28:16));if(Math.hypot(x-p.x,y-p.y)<(v.r||23)+9){
      let item=v;if(v.kind==='seed')item={...v,id:'held-seed',z:20,vx:0,vy:0,vz:0};
      if(actor.carry===v){actor.carry=null;if(state.care){state.care=null;actor.target=null;}}state.idle=0;state.nextInterest=state.time+9;state.hand={kind:'item',id,item,x,y,lastX:x,lastY:y,samples:[]};state.play.phase=v.kind==='ball'&&state.play.phase==='wait'?'answer':state.play.phase;return true;}}
    if(hitByte(x,y)){const spool=spoolPoint(),origin=spoolWorld();if(!rope.active&&Math.hypot(x-spool.x,y-spool.y)<18){Object.assign(rope,{active:true,planted:false,id,x:origin.x,y:origin.y,z:0,length:Math.max(20,origin.z)});state.hand={kind:'rope',id,x,y};return true;}
      playground.interrupt();releaseCarry();state.route=null;state.care=null;state.idle=0;state.nextInterest=state.time+9;state.play.phase='idle';actor.target=null;actor.grabbed=true;actor.vx=actor.vy=actor.vz=actor.spin=0;const p=bodyPoint();state.hand={kind:'byte',id,dx:x-p.x,dy:y-p.y,x,y,lastX:x,lastY:y,samples:[]};actor.z=Math.max(actor.z,40);actor.pose=null;return true;}
    if(playground.begin(x,y)){state.hand={kind:'swing',id,x,y,startX:x,startY:y,lastX:x,lastY:y,pan:false};return true;}
    state.hand={kind:'background',id,x,y,startX:x,startY:y,lastX:x,lastY:y,pan:false};return true;
  }
  function move(x,y,id){const h=state.hand;if(!h||h.id!==id)return false;const t=performance.now();
    if(h.kind==='background'||h.kind==='invite'){if(Math.hypot(x-h.startX,y-h.startY)>8)h.pan=true;if(h.pan||h.kind==='invite'){state.camera.x-=x-h.lastX;state.camera.y-=y-h.lastY;cameraBounds();}}
    else if(h.kind==='swing'){if(Math.hypot(x-h.startX,y-h.startY)>6)h.pan=true;if(h.pan)playground.move(x,y);}
    else if(h.kind==='byte'){actor.z=playground.dragHeight(x-h.dx,y-h.dy,actor.z);const p=unproject(x-h.dx,y-h.dy,H*.48+actor.z);actor.x=clamp(p.x,30,maxX-30);actor.y=clamp(p.y,30,1170);actor.squash=Math.min(.4,Math.hypot(actor.x-p.x,actor.y-p.y)/160);if(actor.x<235&&actor.y<172)actor.y=172;h.samples.push({x:actor.x,y:actor.y,t});h.samples=h.samples.filter(s=>t-s.t<140);}
    else if(h.kind==='item'){const p=unproject(x,y,28);h.item.x=clamp(p.x,25,maxX-25);h.item.y=clamp(p.y,25,1175);if(h.item.x<235&&h.item.y<172)h.item.y=172;h.item.z=28;h.samples.push({x:h.item.x,y:h.item.y,t});h.samples=h.samples.filter(s=>t-s.t<140);}
    else if(h.kind==='rope'){const p=unproject(x,y);const a=spoolWorld(),d=Math.hypot(p.x-a.x,p.y-a.y,a.z);ropePay(p,d);}
    h.lastX=x;h.lastY=y;h.x=x;h.y=y;return true;
  }
  function ropePay(p,d){Object.assign(state.rope,{x:clamp(p.x,0,maxX),y:clamp(p.y,0,1200),z:0,length:Math.min(H*1.2,Math.max(state.rope.length,d))});}
  function end(id,cancel=false){const h=state.hand;if(!h||h.id!==id)return false;
    if(h.kind==='background'&&!h.pan&&!cancel){const elevated=playground.target(h.x,h.y),p=elevated||unproject(h.x,h.y);if(p.x>=0&&p.x<=maxX&&p.y>=0&&p.y<=1200){if(p.x<225&&p.y<185){p.x=145;p.y=175;}follow(p.x,p.y);if(elevated?.swing)state.playgroundIntent='swing';state.play.phase='idle';}}
    if(h.kind==='byte'||h.kind==='item'){const v=h.kind==='byte'?actor:h.item,s=h.samples;v.vx=v.vy=0;if(s.length>1&&performance.now()-s.at(-1).t<160){const a=s[0],b=s.at(-1),dt=Math.max(.02,(b.t-a.t)/1000);v.vx=clamp((b.x-a.x)/dt*.78,-750,750);v.vy=clamp((b.y-a.y)/dt*.78,-750,750);}
      if(cancel)v.vx=v.vy=0;if(v===actor)v.spin=clamp((v.vx-v.vy)*.002,-2,2);v.vz=Math.min(270,Math.hypot(v.vx,v.vy)*.32);actor.grabbed=false;
      if(v.kind==='seed'){const f=state.flowers.find(f=>Math.hypot(v.x-f.x,v.y-f.y)<57);if(f&&!cancel){f.stage=Math.max(1,f.stage);f.color=v.color;f.water=0;api.voice('pet',.5);}}
      if(v.kind==='ball'&&state.play.phase==='answer'&&!cancel){if(Math.hypot(v.vx,v.vy)>35){state.play.phase='chase';state.play.answered++;actor.target={x:v.x,y:v.y,reason:'play'};actor.pose=null;}else state.play.phase='wait';}
    }
    if(h.kind==='rope'){state.rope.planted=true;delete state.rope.id;}
    if(h.kind==='swing'){playground.end();if(!h.pan&&!cancel&&!playground.swing.rider){const p=playground.seat();follow(p.x,p.y);state.playgroundIntent='swing';}}state.hand=null;save();return true;
  }
  function contact(v,dt){const old={x:v.x,y:v.y,z:v.z};if(api.earth.enabled){const force=inverse(api.earth.x*.065,api.earth.y*.065);v.vx+=force.x*dt;v.vy+=force.y*dt;}v.z+=v.vz*dt;v.vz-=850*dt;v.x+=v.vx*dt;v.y+=v.vy*dt;if(v.x<235&&v.y<172&&v.z<115){v.y=172;v.vy=Math.abs(v.vy)*.4;}
    for(const c of ['x','y']){if(v[c]<28||v[c]>(c==='x'?maxX:maxY)-28){v[c]=clamp(v[c],28,(c==='x'?maxX:maxY)-28);v['v'+c]*=-.5;v.squash=Math.max(v.squash||0,.32);}}
    const supported=playground.contact(v,old,dt);if(!supported&&v.z<=0){v.z=0;const speed=-v.vz;v.vz=speed>85?speed*(v.kind==='ball'?.61:.27):0;if(v===actor&&speed>150){v.squash=Math.min(.55,speed/700);api.voice('land',.4);}v.vx*=Math.exp(-dt*3);v.vy*=Math.exp(-dt*3);}
    v.vx*=Math.exp(-dt*(v.z>0?.4:2));v.vy*=Math.exp(-dt*(v.z>0?.4:2));
  }
  function solveRope(){const r=state.rope;if(!r.active||actor.grabbed)return;const a=spoolWorld(),dx=r.x-a.x,dy=r.y-a.y,dz=r.z-a.z,d=Math.hypot(dx,dy,dz);if(d<=r.length)return;
    const n={x:dx/d,y:dy/d,z:dz/d},ex=d-r.length;actor.x+=n.x*ex;actor.y+=n.y*ex;actor.z=Math.max(0,actor.z+n.z*ex);
    const outward=actor.vx*n.x+actor.vy*n.y+actor.vz*n.z;if(outward<0){actor.vx-=outward*n.x;actor.vy-=outward*n.y;actor.vz-=outward*n.z;}}
  function pick(v){if(state.hand?.item===v||actor.grabbed)return false;if(Math.hypot(actor.x-v.x,actor.y-v.y)>35||Math.abs(actor.z-v.z)>45)return false;actor.carry=v;return true;}
  function interest(){const growing=state.flowers.find(f=>f.stage>0&&f.stage<3),can=state.items.find(v=>v.kind==='can');if(growing&&!state.hand){releaseCarry();state.care={phase:'fetch',flower:growing,can};follow(can.x,can.y,'water-can');return;}const flower=state.flowers.find(f=>f.stage>=2&&!f.shown);if(flower){state.interest={kind:'flower',flower};follow(flower.x+48,flower.y+40,'flower');state.interest={kind:'flower',flower};return;}
    const ball=state.items.find(v=>v.kind==='ball');if(state.play.phase==='idle'&&(state.roams=(state.roams||0)+1)%3===1){state.play.phase='fetch';follow(ball.x,ball.y,'fetch');return;}
    if((state.roams||1)%3!==1){const next=playground.opportunity();follow(next.x,next.y,next.reason);return;}
    const places=[{x:1000,y:1040},{x:990,y:270},{x:220,y:1050}];const place=places[(state.roams||1)%places.length];follow(place.x+(Math.random()-.5)*80,place.y+(Math.random()-.5)*80,'wander');}
  function update(dt){if(!state.active){idleIndoor();return;}state.time+=dt;state.idle+=dt;
    const sensed=api.senses?.state;if(sensed?.open){if(state.soundId!==sensed.soundId||state.joltId!==sensed.joltId){if(state.soundId!==undefined&&!actor.grabbed){actor.vz+=Math.min(260,120+(sensed.level||0)*300);actor.squash=.2;}state.soundId=sensed.soundId;state.joltId=sensed.joltId;}
      const loose=state.items.find(v=>v.kind==='ball');if(loose!==actor.carry&&state.hand?.item!==loose){loose.vx+=(sensed.breathX||0)*(sensed.breath||0)*dt*800;loose.vy+=(sensed.breathY||0)*(sensed.breath||0)*dt*800;}}
    actor.squash*=Math.exp(-dt*6);if(!playground.grounded(actor)&&!actor.grabbed){actor.angle+=actor.spin*dt;actor.spin*=Math.exp(-dt*.7);}else{actor.angle*=Math.exp(-dt*4);actor.spin*=Math.exp(-dt*4);}actor.poseTime=Math.max(0,actor.poseTime-dt);if(!actor.poseTime&&!['wait','fetch','return'].includes(state.play.phase))actor.pose=null;
    const ball=state.items.find(v=>v.kind==='ball');
    if(state.play.phase==='chase'){actor.target={x:ball.x,y:ball.y,reason:'play'};if(pick(ball)){state.play.phase='return';actor.target={...state.play.home,reason:'return'};}}
    if(actor.target&&!actor.grabbed&&playground.grounded(actor)){let goal=actor.target;
      if(actor.detour&&Math.hypot(actor.detour.x-actor.x,actor.detour.y-actor.y)<8)actor.detour=null;
      if(!actor.detour){const gx=goal.x-actor.x,gy=goal.y-actor.y,gd=Math.max(1,Math.hypot(gx,gy));for(const v of state.items){if(!['bench','lantern','pot'].includes(v.kind)||state.hand?.item===v)continue;const r=(v.kind==='bench'?43:22)+36,dx=v.x-actor.x,dy=v.y-actor.y,a=(dx*gx+dy*gy)/gd,across=(dx*gy-dy*gx)/gd;
          if(a>0&&a<Math.min(gd,180)&&Math.abs(across)<r){const side=across>0?-1:1;actor.detour={x:clamp(v.x-gy/gd*(r+25)*side,35,maxX-35),y:clamp(v.y+gx/gd*(r+25)*side,35,1165)};break;}}}
      goal=actor.detour||goal;const dx=goal.x-actor.x,dy=goal.y-actor.y,d=Math.hypot(dx,dy),speed=state.play.phase==='chase'?195:165;
      if(d<15&&!actor.detour){const reason=actor.target.reason;if(state.route?.length){actor.target={...state.route.shift(),reason};}else{actor.target=null;actor.vx*=.4;actor.vy*=.4;
        if(reason==='call'){state.nextInterest=state.time+10;actor.pose='curious';actor.poseTime=2.2;state.idle=0;}
        if(reason==='water-can'&&state.care){if(pick(state.care.can)){state.care.phase='walk';actor.target={x:state.care.flower.x-42,y:state.care.flower.y+2,reason:'water'};}else state.care=null;}
        if(reason==='water'&&state.care){state.care.phase='pour';actor.pose='curious';actor.poseTime=10;}
        if(reason==='fetch'&&pick(ball)){state.play.phase='return';actor.target={...state.play.home,reason:'return'};}
        if(reason==='return'){releaseCarry();ball.vx=55;ball.vy=55;ball.vz=35;state.play.phase='wait';state.play.returns++;actor.pose='expectant';actor.poseTime=20;state.idle=0;api.voice('invite',.7);}
        if(reason==='flower'&&state.interest?.flower){const f=state.interest.flower;actor.pose='curious';actor.poseTime=6;if(!onScreen()){state.invitation={x:actor.x,y:actor.y,flower:f.id,born:state.time};state.inviteSerial++;}f.shown=true;state.nextInterest=state.time+24;}
        if(reason==='playground'){const next=playground.arrived();if(next)follow(next.x,next.y,next.reason);}
        if(actor.x<230&&actor.y<200&&reason==='call'){leave();return;}}
      }else{const blend=1-Math.exp(-dt*7);actor.vx+=(dx/d*speed-actor.vx)*blend;actor.vy+=(dy/d*speed-actor.vy)*blend;actor.facing=(dx-dy)<0?-1:1;actor.clock+=dt;actor.frame=Math.floor(actor.clock/.095)%4;}}
    if(!actor.grabbed&&!playground.swing.rider)contact(actor,dt);playground.update(dt);
    for(const v of state.items){if(state.hand?.item===v)continue;if(actor.carry===v){v.x=actor.x+18;v.y=actor.y-2;v.z=actor.z+37;v.vx=actor.vx;v.vy=actor.vy;v.vz=actor.vz;}else contact(v,dt);}
    // Actual contact with the lawn toy, not animation authority.
    for(const v of [actor,ball])if(!v.grabbed&&state.hand?.item!==v&&v.vz<=0&&v.z<8&&Math.hypot(v.x-855,v.y-455)<42){v.vz=430;v.z=9;v.squash=.35;api.voice('boing',.7);}
    if(ball.z<20&&Math.hypot(ball.x-880,ball.y-690)<38&&Math.hypot(ball.vx,ball.vy)>35){ball.vz=120;ball.vx*=-.4;ball.vy*=-.4;actor.pose='proud';actor.poseTime=2;}
    for(const body of [actor,ball])if(!body.grabbed&&body.z<18&&state.hand?.item!==body&&actor.carry!==body)for(const v of state.items){if(v===actor.carry||state.hand?.item===v||!['bench','lantern','pot'].includes(v.kind))continue;
      const dx=body.x-v.x,dy=body.y-v.y,d=Math.hypot(dx,dy),radius=(v.kind==='bench'?43:22)+20;if(d>0&&d<radius){body.x+=dx/d*(radius-d);body.y+=dy/d*(radius-d);const into=body.vx*dx/d+body.vy*dy/d;if(into<0){body.vx-=into*dx/d*(body===ball?1.6:1);body.vy-=into*dy/d*(body===ball?1.6:1);body.squash=Math.min(.3,-into/700);}}}
    solveRope();
    const held=state.hand?.item,pouring=held?.kind==='can'?held:state.care?.phase==='pour'&&actor.carry===state.care.can?actor.carry:null;
    if(pouring){for(const f of state.flowers)if(f.stage>0&&f.stage<3&&Math.hypot(pouring.x+24-f.x,pouring.y-f.y)<65){f.water+=dt*.34;if(f.water>=1){f.water=0;f.stage++;f.shown=false;actor.pose='curious';actor.poseTime=2;save();}}}
    if(state.care?.phase==='pour'&&state.care.flower.stage===3){const f=state.care.flower;releaseCarry();state.care=null;actor.pose='proud';actor.poseTime=4;if(!onScreen()){state.invitation={x:actor.x,y:actor.y,flower:f.id,born:state.time};state.inviteSerial++;}f.shown=true;state.nextInterest=state.time+25;save();}
    if(actor.z<5&&Math.hypot(actor.vx,actor.vy)>25&&state.time>(state.dirtyAt||0)&&state.flowers.some(f=>Math.hypot(f.x-actor.x,f.y-actor.y)<42)){state.dirtyAt=state.time+9;bathroom.dirtyFeet(.06);bathroom.save();}
    if(!state.hand&&!actor.target&&!actor.grabbed&&!state.rope.active&&state.time>state.nextInterest&&state.play.phase!=='wait'&&!state.invitation&&!playground.swing.rider){state.nextInterest=state.time+15;interest();}
    if(state.play.phase==='wait'&&state.idle>24){state.play.phase='idle';actor.pose=null;state.nextInterest=state.time+18;}
    if(state.invitation&&state.time-state.invitation.born>35)state.invitation=null;
    if(onScreen()&&state.invitation)state.invitation=null;
    if(state.time-(state.savedAt||0)>2){state.savedAt=state.time;save();}
  }
  function onScreen(){const p=bodyPoint();return p.x>-W/2&&p.x<world.w+W/2&&p.y>-H/2&&p.y<world.h+H/2;}
  function invitationPoint(){if(!state.invitation||onScreen())return null;const p=bodyPoint(),cx=world.w/2,cy=world.h/2,dx=p.x-cx,dy=p.y-cy;
    const n=Math.min((world.w/2-22)/Math.max(1,Math.abs(dx)),(world.h/2-45)/Math.max(1,Math.abs(dy)));const x=cx+dx*n,y=cy+dy*n,d=Math.hypot(dx,dy);return{x,y,knobX:x-dx/d*59,knobY:y-dy/d*59};}
  const scenery=document.createElement('canvas');scenery.width=0;scenery.height=0;const ink=scenery.getContext('2d');
  const landscape=document.createElement('div');landscape.id='backyard-scenery';landscape.setAttribute('aria-hidden','true');landscape.append(scenery);ctx.canvas.before(landscape);scenery.style.cssText='position:absolute;width:2100px;height:1280px;transform-origin:0 0;will-change:transform';
  const textures=new Map();let textureBytes=0;
  function path(p,points,fill,stroke){p.beginPath();points.forEach((v,i)=>{const q=iso(v[0],v[1]);i?p.lineTo(q.x,q.y):p.moveTo(q.x,q.y)});p.closePath();if(fill){p.fillStyle=fill;p.fill()}if(stroke){p.strokeStyle=stroke;p.stroke()}}
  function cache(){scenery.width=1680;scenery.height=1024;state.cacheBytes=scenery.width*scenery.height*4;state.cacheBuilds++;cacheMeadow();ink.setTransform(.8,0,0,.8,0,0);ink.drawImage(window.ByteWorldArt.images.get('terrain-xiv'),0,0,2100,1280);ink.translate(1050,210);for(const seed of seeds){const p=iso(seed.x,seed.y);ink.save();ink.translate(p.x,p.y);paintItem(seed,ink,true);ink.restore();}}
  function paintItem(v,target,local=false){const p=local?{x:0,y:0}:project(v.x,v.y,(v.z||0));target.save();target.translate(p.x,p.y);const a=window.ByteWorldArt,kind=v.kind;
    if(kind==='ball')a.rect(target,'ball',-19,-35,38,38);
    else if(kind==='can')a.rect(target,'can',-34,-40,74,42);
    else if(kind==='bench')a.rect(target,'bench',-47,-57,94,60);
    else if(kind==='lantern')a.rect(target,'lantern',-14,-52,28,51);
    else if(kind==='pot')a.rect(target,'pot',-24,-62,48,63);
    else if(kind==='seed')a.rect(target,'seed'+(v.color==='#f6cf67'?'-yellow':v.color==='#90bfe8'?'-blue':''),-14,-27,28,24);
    if(v.id==='held-seed'){target.fillStyle=v.color;target.beginPath();target.ellipse(0,-13,7,10,.4,0,7);target.fill();}target.restore();}
  function texture(key,paint,w=220,h=180){let c=textures.get(key);if(!c){c=document.createElement('canvas');c.width=w;c.height=h;const p=c.getContext('2d');p.setTransform(2,0,0,2,w/2,h-20);paint(p);textures.set(key,c);textureBytes+=w*h*4;}return c;}
  const mounted=new Map();let visibleNodes=new Set();
  function placed(key,image,p,ax,ay,depth,stamp,extra='',density=2){
    let v=mounted.get(key);if(!v){const c=document.createElement('canvas');c.style.cssText='position:absolute;left:0;top:0;transform-origin:50% 50%;pointer-events:none';landscape.append(c);v={canvas:c,ink:c.getContext('2d'),stamp:null,transform:null};mounted.set(key,v);}
    const c=v.canvas;if(stamp!==v.stamp){if(c.width!==image.width||c.height!==image.height){c.width=image.width;c.height=image.height;c.style.width=c.width/density+'px';c.style.height=c.height/density+'px';}v.ink.clearRect(0,0,c.width,c.height);v.ink.drawImage(image,0,0);v.stamp=stamp;}
    const transform=`translate(${p.x-ax}px,${p.y-ay}px) ${extra}`;if(transform!==v.transform){c.style.transform=transform;v.transform=transform;}c.style.zIndex=Math.max(1,Math.round(depth));if(c.style.visibility==='hidden')c.style.visibility='visible';visibleNodes.add(key);
  }
  const shadow=document.createElement('canvas');shadow.width=120;shadow.height=44;const shadowInk=shadow.getContext('2d');window.ByteWorldArt.shadow(shadowInk,60,22,118,40);
  function drawItem(v){const p=project(v.x,v.y,v.z||0);if(p.x<-70||p.x>world.w+70||p.y<-20||p.y>world.h+85)return;
    placed('shadow-'+v.id,shadow,project(v.x,v.y),30,11,v.x+v.y-1,'shadow');
    const image=texture(v.kind+(v.color||'')+(v.id==='held-seed'?'held':''),p=>paintItem({...v,z:0},p,true));placed('item-'+v.id,image,p,image.width/4,(image.height-20)/2,v.x+v.y,'item'+v.kind+v.color);
    if(v.kind==='can'&&(state.hand?.item===v||state.care?.phase==='pour'&&actor.carry===v)){ctx.strokeStyle='#cff6ff';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<6;i++){const d=(state.time*70+i*9)%42;ctx.moveTo(p.x+36+i*2,p.y-19+d);ctx.lineTo(p.x+37+i*2,p.y-14+d);}ctx.stroke();}}
  function paintFlower(f,target,local=false){const p=local?{x:0,y:0}:project(f.x,f.y);target.save();target.translate(p.x,p.y);const top=f.stage?f.stage*18+15:24;window.ByteWorldArt.rect(target,'bed'+f.stage+(f.stage>=2?(f.color==='#f6cf67'?'-yellow':f.color==='#90bfe8'?'-blue':''):''),-43,-top,86,top+23);
    if(f.water>0){target.fillStyle='#86b8be66';target.beginPath();target.ellipse(0,2,35*f.water,12,0,0,7);target.fill();}target.restore();}
  const flowerImages=new Map();
  function drawFlower(f){const p=project(f.x,f.y);if(p.x<-60||p.x>world.w+60||p.y<-15||p.y>world.h+85)return;
    const water=Math.round(f.water*100),stamp=f.stage+f.color+'w'+water;let image=flowerImages.get(f.id);if(!image){image=document.createElement('canvas');image.width=180;image.height=260;flowerImages.set(f.id,image);}if(image.stamp!==stamp){const p=image.getContext('2d');p.setTransform(1,0,0,1,0,0);p.clearRect(0,0,180,260);p.setTransform(2,0,0,2,90,200);paintFlower({...f,water:water/100},p,true);image.stamp=stamp;}
    placed('flower-'+f.id,image,p,image.width/4,100,f.x+f.y,f.stage+f.color+'w'+water);
  }
  // Reuse an unchanged foreground. Physical state, offscreen movement and input
  // still run every frame; only sub-pixel-invisible raster work is skipped.
  let lastDraw='',drawCount=0;
  function draw(t){const q=n=>Math.round((n||0)*10),animation=!!invitationPoint()||state.hand?.item?.kind==='can'||state.care?.phase==='pour'||bathroom.wet>0;
    const stamp=[world.w,world.h,q(state.camera.x),q(state.camera.y),q(actor.x),q(actor.y),q(actor.z),Math.round(actor.angle*500),Math.round(actor.squash*500),actor.facing,actor.frame,actor.pose,!!actor.target,q(playground.swing.theta),q(playground.bounce.compression),api.screenWeb?.phase,api.screenWeb?.proud>0,bathroom.stainVersion,bathroom.wet,JSON.stringify(economy.gear),animation?Math.floor(t/50):0,
      ...state.items.flatMap(v=>[v.id,q(v.x),q(v.y),q(v.z)]),...state.flowers.flatMap(f=>[f.stage,q(f.water),f.color]),state.hand?.kind,state.hand?.item?.id==='held-seed'?q(state.hand.item.x)+','+q(state.hand.item.y):'',state.rope.active,state.rope.active?[q(state.rope.x),q(state.rope.y),q(state.rope.length)].join(','):''].join('|');
    if(stamp===lastDraw)return;lastDraw=stamp;drawCount++;visibleNodes=new Set();ctx.clearRect(0,0,world.w,world.h);const tx=-1050-state.camera.x+world.w*.5,ty=-210-state.camera.y+world.h*.52;if(tx!==state.lastMaterialX||ty!==state.lastMaterialY){scenery.style.transform=`translate(${tx}px,${ty}px)`;state.lastMaterialX=tx;state.lastMaterialY=ty;}
    drawPlayground();const nodes=[...state.flowers.map(f=>({depth:f.x+f.y,draw:()=>drawFlower(f)})),...state.items.map(v=>({depth:v.x+v.y,draw:()=>drawItem(v)})),{depth:actor.x+actor.y,draw:()=>drawActor(t)}];nodes.sort((a,b)=>a.depth-b.depth);for(const n of nodes)n.draw();if(state.hand?.item?.id==='held-seed')drawItem(state.hand.item);
    for(const [key,v] of mounted)if(!visibleNodes.has(key)&&v.canvas.style.visibility!=='hidden')v.canvas.style.visibility='hidden';
    drawSwingRopes();drawRope();const ip=invitationPoint();if(ip){ctx.strokeStyle='#69816d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(ip.x,ip.y);const center={x:world.w/2,y:world.h/2};const dx=center.x-ip.x,dy=center.y-ip.y,d=Math.hypot(dx,dy);ctx.quadraticCurveTo(ip.x+dx/d*30,ip.y+dy/d*30+Math.sin(t*.006)*5,ip.x+dx/d*59,ip.y+dy/d*59);ctx.stroke();ctx.strokeStyle='#fff7de';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#efca7d';ctx.beginPath();ctx.arc(ip.x+dx/d*59,ip.y+dy/d*59,7,0,7);ctx.fill();}
  }
  // New static layers use the same baked-art / compositor path as XIII.
  // Camera motion transforms cached pixels; it never lights/redraws a meadow.
  const meadow=document.createElement('canvas');meadow.style.cssText='position:absolute;width:1920px;height:1152px;transform-origin:0 0;will-change:transform;pointer-events:none';landscape.insertBefore(meadow,scenery);
  function cacheMeadow(){meadow.width=1536;meadow.height=922;meadow.getContext('2d').drawImage(window.ByteWorldArt.images.get('play-meadow'),0,0,1536,922);state.cacheBytes+=meadow.width*meadow.height*4;}
  const equipmentImages=new Map();let equipmentBytes=0;
  function playSprite(name,x,y,z,w,h,depth,extra=''){
    const p=project(x,y,z);if(p.x<-w/2||p.x>world.w+w/2||p.y<-h/2||p.y>world.h+h/2)return;
    let image=equipmentImages.get(name);if(!image){image=document.createElement('canvas');image.width=Math.ceil(w);image.height=Math.ceil(h);window.ByteWorldArt.rect(image.getContext('2d'),name,0,0,w,h);equipmentImages.set(name,image);equipmentBytes+=image.width*image.height*4;}
    placed(name,image,p,w/2,h/2,depth,name,extra,1);
  }
  function drawPlayground(){
    const ground=project(1700,600),mt=`translate(${ground.x-960}px,${ground.y-576}px)`;if(mt!==state.meadowTransform){meadow.style.transform=mt;state.meadowTransform=mt;}
    playSprite('play-structure',1610,370,0,760,560,1400);
    playSprite('play-swing',1770,730,0,330,540,2350);
    const s=playground.seat();playSprite('play-seat',s.x,s.y,s.z,120,90,s.x+s.y-.5,`rotate(${-playground.swing.theta*.3}rad)`);
    playSprite('play-bounce',2040,940,0,210,160,2975,`scale(1,${1-playground.bounce.compression*.007})`);
  }
  function drawSwingRopes(){const s=playground.seat(),a=project(playground.swing.x,playground.swing.y,playground.swing.z),b=project(s.x,s.y,s.z+6);if(a.x<-180||a.x>world.w+180||a.y<-250||a.y>world.h+250)return;
    ctx.strokeStyle='#425955';ctx.lineWidth=3;ctx.beginPath();for(const dx of [-17,17]){ctx.moveTo(a.x+dx,a.y);ctx.lineTo(b.x+dx,b.y);}ctx.stroke();ctx.strokeStyle='#eadab5';ctx.lineWidth=1;ctx.stroke();
  }
  const actorImage=document.createElement('canvas');actorImage.width=Math.ceil(W*2);actorImage.height=H*2;let actorImageStamp='';
  function drawActor(t){if(!onScreen())return;const p=bodyPoint(),moving=actor.target&&playground.grounded(actor)&&!actor.grabbed&&Math.hypot(actor.vx,actor.vy)>12;let name=moving?'walk':actor.pose||'idle';if(api.screenWeb?.phase==='scheming')name='scheming';else if(api.screenWeb?.proud>0&&!actor.pose&&!actor.grabbed&&!moving&&actor.z<10)name='proud';
    const frame=name==='walk'?assets.walk[actor.frame]:assets[name]||assets.idle;if(!frame)return;const stamp=[name,name==='walk'?actor.frame:0,JSON.stringify(economy.gear),bathroom.stainVersion,bathroom.wet,bathroom.wet>0?Math.floor(t/50):0].join('|');
    if(stamp!==actorImageStamp){const p=actorImage.getContext('2d');p.clearRect(0,0,actorImage.width,actorImage.height);p.drawImage(bathroom.present(economy.bodyPresentation(frame),t),0,0,actorImage.width,actorImage.height);actorImageStamp=stamp;}
    placed('shadow-byte',shadow,project(actor.x,actor.y),30,11,actor.x+actor.y-1,'shadow');
    placed('byte',actorImage,p,actorImage.width/4,H/2,actor.x+actor.y,stamp,`rotate(${actor.angle}rad) scale(${actor.facing*(1+actor.squash*.4)},${1-actor.squash*.45})`);
  }
  function drawRope(){const r=state.rope;if(!r.active)return;const root=spoolWorld(),a=spoolPoint(),b=project(r.x,r.y,r.z),d=Math.hypot(root.x-r.x,root.y-r.y,root.z-r.z);ctx.strokeStyle='#3f5860';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2+Math.max(0,r.length-d)*.16,b.x,b.y);ctx.stroke();ctx.strokeStyle='#f6fff4';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ed9857';ctx.beginPath();ctx.arc(b.x,b.y,7,0,7);ctx.fill();}
  function resize(){state.pending=false;state.entryPoint=null;if(state.hand)end(state.hand.id,true);cameraBounds();}
  function suspend(){if(state.hand)end(state.hand.id,true);save();}
  window.addEventListener('pagehide',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend()});
  return Object.assign(state,{enter,leave,ready,resize,save,update,draw,begin,move,end,project,unproject,bodyPoint,spoolPoint,spoolWorld,hitByte,onScreen,invitationPoint,doorway,door,indoorBegin,afterRelease,follow,solveRope,
    screenPoint:bodyPoint,bodyHeight:H,cacheStats:()=>({bytes:state.cacheBytes,builds:state.cacheBuilds,textureBytes:textureBytes+equipmentBytes,textures:textures.size+equipmentImages.size,foregroundPaints:drawCount,mountedSprites:mounted.size,spriteBytes:[...mounted.values()].reduce((n,v)=>n+v.canvas.width*v.canvas.height*4,0)+actorImage.width*actorImage.height*4+flowerImages.size*180*260*4})});
};
