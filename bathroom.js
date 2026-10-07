/* Sunburn IV: one authored bathroom and one body-local washing process. */
window.createByteBathroom = function createByteBathroom(api) {
  const { ctx, world, byte, life, earth, web, obby } = api;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const key = 'byte-sunburn-care-v1';
  let saved; try { saved = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const marks = [[-.13,-.24,.065],[-.29,-.025,.07],[.27,-.025,.06],[-.13,.19,.06],[-.29,.37,.065],[.3,.36,.07]];
  const state = { fill: clamp(Number(saved?.fill)||0,0,1), source: null, draining: false, hand: null, wet: 0, washed: !!saved?.washed,
    patches: marks.map(([x,y,r],i)=>({x,y,r,dirt:clamp(Number.isFinite(saved?.mud?.[i])?saved.mud[i]:.85,0,1),foam:0})),
    puddle: clamp(Number(saved?.puddle)||0,0,1), particles: [], head: {x:0,y:0,vx:0,vy:0},
    time: 0, dirty: false, savedAt:0, wetAge:0, shake:0, mischief:false, splashes:0, scrubbed:0,
    lastSponge:null, floorContact:false, expedition:false, previousRoom:1, width:0, height:0 };
  const backdrop = document.createElement('canvas'); backdrop.id='bathroom-scenery';backdrop.setAttribute('aria-hidden','true');ctx.canvas.before(backdrop);
  const wall = backdrop.getContext('2d', {alpha:false});
  const here = () => api.home().room===4&&!api.home().travel&&!obby.hasLaunched;
  function geometry() {
    const w=world.w,h=world.h,rim=h-24-api.roomH()*.66;
    return {x:w*.18,w:w*.56,rim,bottom:h-24,surface:h-35-state.fill*(h-35-(rim+8)),
      tapX:w*.20,tapY:h*.57,dishX:w*.115,dishY:h*.61,mountX:w*.64,mountY:h*.24,pipeX:w*.65,pipeY:h*.115};
  }
  function save() {
    try {localStorage.setItem(key,JSON.stringify({mud:state.patches.map(p=>p.dirt),washed:state.washed,fill:state.fill,puddle:state.puddle}));}catch(_){}
    state.dirty=false;state.savedAt=state.time;
  }
  function rect(p,x,y,w,h,r,fill,stroke) {p.fillStyle=fill;p.beginPath();p.roundRect(x,y,w,h,r);p.fill();if(stroke){p.strokeStyle=stroke;p.stroke();}}
  function resize() {
    if(state.width===world.w&&state.height===world.h)return;
    state.width=world.w;state.height=world.h;state.hand=null;
    const g=geometry();state.head={x:g.mountX,y:g.mountY,vx:0,vy:0};
    backdrop.width=Math.ceil(world.w*.75);backdrop.height=Math.ceil(world.h*.75);
    wall.setTransform(.75,0,0,.75,0,0);const w=world.w,h=world.h;
    wall.fillStyle='#d9e6df';wall.fillRect(0,0,w,h);
    const sky=wall.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#d5e3dc');sky.addColorStop(1,'#f0eee0');wall.fillStyle=sky;wall.fillRect(0,0,w,h);
    wall.strokeStyle='#faf8e9';wall.lineWidth=3;wall.beginPath();for(let x=0;x<w;x+=48){wall.moveTo(x,0);wall.lineTo(x,h*.88)}for(let y=0;y<h*.88;y+=58){wall.moveTo(0,y);wall.lineTo(w,y)}wall.stroke();
    wall.fillStyle='#b0c4bd';wall.fillRect(0,h*.88,w,h*.12);wall.strokeStyle='#dbe5d6';wall.lineWidth=2;wall.beginPath();for(let x=-h;x<w+h;x+=58){wall.moveTo(x,h*.88);wall.lineTo(x+80,h)}wall.stroke();
    // A real doorway back into the nook, using the same arch/threshold language as home.
    const top=Math.max(h*.39,h-10-api.bodyH()*2.2);
    wall.fillStyle='#536d76';wall.strokeStyle='#9b9677';wall.lineWidth=6;wall.beginPath();wall.moveTo(w-94,h-10);wall.lineTo(w-94,top+80);wall.arc(w-14,top+80,80,Math.PI,0);wall.lineTo(w+66,h-10);wall.closePath();wall.fill();wall.stroke();
    wall.fillStyle='#c4b69c';wall.fillRect(w-93,h-24,93,14);
    wall.strokeStyle='#d9d9c7';wall.lineWidth=2;wall.beginPath();wall.moveTo(w-28,top+116);wall.quadraticCurveTo(w+10,top+165,w+48,top+112);wall.stroke();
    // Round frosted window, quiet pipes, soap dish and the back of a generous ceramic tub.
    rect(wall,w*.075,h*.15,w*.24,h*.20,36,'#a7c8c7','#9aaea0');wall.strokeStyle='#f4f1d6';wall.lineWidth=5;wall.beginPath();wall.moveTo(w*.195,h*.17);wall.lineTo(w*.195,h*.34);wall.moveTo(w*.10,h*.25);wall.lineTo(w*.29,h*.25);wall.stroke();
    wall.strokeStyle='#a38b59';wall.lineWidth=9;wall.beginPath();wall.moveTo(g.pipeX,g.pipeY);wall.lineTo(g.pipeX,h*.57);wall.stroke();wall.strokeStyle='#e0d19c';wall.lineWidth=3;wall.stroke();
    rect(wall,g.dishX-29,g.dishY,58,8,4,'#9bbcb8','#769994');
    wall.strokeStyle='#a38b59';wall.lineWidth=8;wall.beginPath();wall.moveTo(g.tapX-12,g.tapY+32);wall.lineTo(g.tapX-12,g.tapY);wall.quadraticCurveTo(g.tapX-12,g.tapY-17,g.tapX+17,g.tapY-12);wall.lineTo(g.tapX+17,g.tapY+4);wall.stroke();
    wall.strokeStyle='#e5d6a8';wall.lineWidth=2;wall.stroke();
    rect(wall,g.x-10,g.rim-13,g.w+20,g.bottom-g.rim+12,28,'#93b6b5','#759795');
    wall.fillStyle='#62969b';wall.beginPath();wall.ellipse(g.x+g.w*.5,g.rim+6,g.w*.51,23,0,0,Math.PI*2);wall.fill();
    wall.fillStyle='#edf3e6';wall.beginPath();wall.ellipse(g.x+g.w*.5,g.rim,g.w*.54,20,0,0,Math.PI*2);wall.ellipse(g.x+g.w*.5,g.rim+3,g.w*.46,12,0,0,Math.PI*2);wall.fill('evenodd');
    wall.strokeStyle='#f4f4df';wall.lineWidth=5;wall.strokeRect(0,h*.88,w,3);
  }
  function beginFrame() {
    resize();const visible=here();document.body.classList.toggle('bathroom-here',visible);return visible;
  }
  function drawRoom(t) {
    if(!here())ctx.drawImage(backdrop,0,0,world.w,world.h);
    // Long-lived walls are browser-composited; only small active water/fixtures are painted per frame.
    const g=geometry();
    ctx.fillStyle='#9eae8d';ctx.strokeStyle='#edf0d8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.tapX-12,g.tapY-24,13,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle=state.source==='bath'?'#386f7e':'#c9d1aa';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(g.tapX-22,g.tapY-24);ctx.lineTo(g.tapX-2,g.tapY-24);ctx.stroke();
    if(state.source==='bath'){ctx.strokeStyle='#d2f8e4cc';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(g.tapX+17,g.tapY+4);ctx.quadraticCurveTo(g.tapX+21,g.rim-50,g.tapX+28,g.surface+8);ctx.stroke();}
    const head=state.head;
    ctx.strokeStyle='#789aa0';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(g.pipeX,g.pipeY+20);ctx.bezierCurveTo(g.pipeX-55,head.y+70,head.x+44,head.y+75,head.x,head.y);ctx.stroke();ctx.strokeStyle='#c6d8d0';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(head.x,head.y);ctx.rotate(-.25);rect(ctx,-24,-9,48,18,8,state.source==='shower'?'#bce6e3':'#a8c9c7','#608d91');ctx.strokeStyle='#eef9e4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-19,7);ctx.lineTo(19,7);ctx.stroke();ctx.restore();
    if(state.fill>.02){const slope=api.down().x*14;ctx.fillStyle='#85c9c487';ctx.beginPath();ctx.moveTo(g.x+4,g.surface-slope);ctx.lineTo(g.x+g.w-4,g.surface+slope);ctx.lineTo(g.x+g.w-6,g.bottom-3);ctx.lineTo(g.x+6,g.bottom-3);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#d7fff0';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=12;i++){const x=g.x+4+(g.w-8)*i/12,y=g.surface+slope*(i/6-1)+Math.sin(t*.005+i*.7)*2;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();}
    if(state.source==='shower'){
      const down=api.down(),length=world.h*.69;ctx.strokeStyle='#7fbac9bd';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<18;i++){const f=(t*.00075+i*.061)%1,s=(i%5-2)*(9+f*7),x=head.x+down.x*length*f+down.y*s,y=head.y+8+down.y*length*f-down.x*s;ctx.moveTo(x,y);ctx.lineTo(x+down.x*13,y+down.y*13)}ctx.stroke();
    }
  }
  function drawSponge(v) {
    rect(ctx,-23,-13,46,26,9,'#f1cf7c','#b59046');ctx.strokeStyle='#f7e5a6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-17,-8);ctx.lineTo(15,-8);ctx.stroke();ctx.fillStyle='#ad85443b';for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(Math.sin(i*2.4)*16,Math.cos(i*3.1)*8,2,0,Math.PI*2);ctx.fill();}
  }
  function supportTool(v,previousY,dt) {
    if(v.room!==4)return;
    const g=geometry();if(v.id==='sponge'&&(!earth.enabled||api.down().y>.5)&&v.vy>0&&previousY+v.r<=g.dishY&&v.y+v.r>=g.dishY&&Math.abs(v.x-g.dishX)<30){v.y=g.dishY-v.r;v.vy=0;v.vx*=.8;}
    if(v.x>g.x+v.r&&v.x<g.x+g.w-v.r&&state.fill>.03&&v.y+v.r>g.surface){const d=api.down(),force=Math.min(1.3,(v.y+v.r-g.surface)/(v.r*2))*2200*dt;v.vx-=d.x*force;v.vy-=d.y*force;v.vx*=Math.exp(-dt*1.5);}
  }
  function downPoint(p,t) {
    const b=api.bodyGeometry(t),x=p.x*b.frameW*b.squeezeX*byte.facing,y=p.y*api.bodyH()*b.squeezeY,c=Math.cos(b.angle),s=Math.sin(b.angle);
    return{x:byte.x+x*c-y*s,y:byte.y+b.bob+x*s+y*c};
  }
  function waterAt(x,y) {
    if(!here())return 0;
    const g=geometry();let amount=state.fill>.03&&x>g.x+5&&x<g.x+g.w-5&&y>g.surface&&y<g.bottom?1:0;
    if(state.source==='shower') {const d=api.down(),dx=x-state.head.x,dy=y-state.head.y-8,along=dx*d.x+dy*d.y,across=Math.abs(dx*d.y-dy*d.x);if(along>0&&along<world.h*.72&&across<22+along*.06)amount=1;}
    return amount;
  }
  function emit(x,y,n,room=api.home().room,strength=1,muddy=false) {
    for(let i=0;i<n&&state.particles.length<36;i++){const a=i*2.399+state.time*2,s=(75+i%5*30)*strength;state.particles.push({room,x,y,vx:Math.cos(a)*s,vy:-70-Math.abs(Math.sin(a))*s,life:.6+i%4*.13,muddy});}
  }
  function dirtyFeet(strength=.3) {
    for(const i of [1,3,4,5])state.patches[i].dirt=clamp(state.patches[i].dirt+strength,0,1);state.dirty=true;
  }
  function begin(x,y,id) {
    if(!here())return false;
    const g=geometry();
    if(Math.hypot(x-(g.tapX-12),y-(g.tapY-24))<28){state.source=state.source==='bath'?null:'bath';state.draining=false;state.hand={kind:'tap',id,x,y};life.pointer.kind='fixture';api.voice('notice',.3);return true;}
    if(Math.hypot(x-(g.x+g.w-14),y-(g.rim+3))<19){state.draining=!state.draining;state.source=null;state.hand={kind:'drain',id,x,y};life.pointer.kind='fixture';return true;}
    if(Math.hypot(x-state.head.x,y-state.head.y)<34){state.hand={kind:'head',id,x,y,startX:x,startY:y,wasOn:state.source==='shower',moved:false};state.source='shower';state.draining=false;life.pointer.kind='fixture';return true;}
    return false;
  }
  function move(x,y,id) {
    const hand=state.hand;if(!hand||hand.id!==id)return false;
    if(hand.kind==='head'){hand.moved ||= Math.hypot(x-hand.startX,y-hand.startY)>8;state.head.x=clamp(x,28,world.w-28);state.head.y=clamp(y,world.h*.14,world.h*.69);state.head.vx=state.head.vy=0;}
    hand.x=x;hand.y=y;return true;
  }
  function end(id,cancelled=false) {
    const hand=state.hand;if(!hand||hand.id!==id)return false;
    if(cancelled)state.source=null;else if(hand.kind==='head'&&!hand.moved&&hand.wasOn)state.source=null;
    state.hand=null;life.pointer.active=false;save();return true;
  }
  function update(dt,t) {
    resize();state.time+=dt;
    if(obby.hasLaunched){
      // Care is read at room scale. Keep the constrained-handset expedition renderer free of care compositing.
      state.expedition=true;state.wet=Math.max(0,state.wet-dt*.012);state.wetAge+=dt;
      state.particles.forEach(p=>p.life-=dt);state.particles=state.particles.filter(p=>p.life>0);return;
    }
    const home=api.home(),d=api.down(),g=geometry(),local=here();
    if(home.room!==state.previousRoom){if(home.room!==4){state.source=null;state.hand=null;}state.previousRoom=home.room;state.mischief=false;state.scrubbed=0;}
    if(local&&state.source==='bath'){const fill=state.fill,puddle=state.puddle;state.fill=Math.min(1,state.fill+dt*.34);if(state.fill>.97)state.puddle=Math.min(1,state.puddle+dt*.1);state.dirty ||=fill!==state.fill||puddle!==state.puddle;}
    if(state.draining&&state.fill>0){state.fill=Math.max(0,state.fill-dt*.55);state.dirty=true;if(state.fill===0)state.draining=false;}
    if(earth.enabled&&state.fill>0&&d.y<.3){state.fill=Math.max(0,state.fill-dt*.35);state.puddle=Math.min(1,state.puddle+dt*.2);state.dirty=true;}
    if(state.hand?.kind!=='head'){const h=state.head;h.vx+=(g.mountX-h.x)*dt*25;h.vy+=(g.mountY-h.y)*dt*25;h.vx*=Math.exp(-dt*8);h.vy*=Math.exp(-dt*8);h.x+=h.vx*dt;h.y+=h.vy*dt;}
    const sponge=home.things.find(v=>v.id==='sponge');let stroke=0;
    if(sponge&&home.hand?.item===sponge&&state.lastSponge)stroke=Math.min(30,Math.hypot(sponge.x-state.lastSponge.x,sponge.y-state.lastSponge.y));
    state.lastSponge=sponge?{x:sponge.x,y:sponge.y}:null;
    let touchedWater=false,soapContact=false;
    for(const p of state.patches){const point=downPoint(p,t),water=waterAt(point.x,point.y),near=sponge?.room===home.room&&Math.hypot(point.x-sponge.x,point.y-sponge.y)<sponge.r+api.bodyH()*p.r;
      if(water){touchedWater=true;const old=p.dirt;p.dirt=Math.max(0,p.dirt-dt*(.014+.8*p.foam));p.foam=Math.max(0,p.foam-dt*.55);state.dirty ||= p.dirt!==old;}
      if(near&&stroke>.2){p.foam=Math.min(1,p.foam+stroke/65);soapContact=true;state.scrubbed+=stroke; if(water||state.wet>.15){const before=p.dirt;p.dirt=Math.max(0,p.dirt-stroke/95);state.dirty ||=before!==p.dirt;if(before-p.dirt>.005&&state.particles.length<28)emit(point.x,point.y,1,home.room,.3,true);}}
      p.foam=Math.max(0,p.foam-dt*.012);
    }
    state.wet=clamp(state.wet+dt*(touchedWater?1.2:-.012),0,1);state.wetAge=touchedWater?0:state.wetAge+dt;
    if(soapContact){life.reactionBlink=Math.max(life.reactionBlink,.12);byte.squash=Math.max(byte.squash,.07);life.curious=.8;api.voice('pet',.35);}
    if(local&&state.fill>.04&&byte.x>g.x+api.bodyW()*.12&&byte.x<g.x+g.w-api.bodyW()*.12&&!byte.grabbed&&life.phase==='awake'&&!home.travel){
      const immersion=clamp((byte.y+api.bodyH()*.36-g.surface)/(api.bodyH()*.48),0,1.3);
      if(immersion>.03){byte.vx-=d.x*2200*immersion*dt;byte.vy-=d.y*2200*immersion*dt;byte.vx*=Math.exp(-dt*.9);byte.vy*=Math.exp(-dt*.9);if(immersion>.65&&byte.mode==='idle')byte.mode='air';}
    }
    const free=!byte.grabbed&&!web.active&&!home.travel&&!home.journey&&life.phase==='awake'&&!obby.hasLaunched&&byte.mode!=='scheming';
    if(local&&free&&!state.mischief&&state.scrubbed>200&&state.wet>.45){state.mischief=true;state.splashes++;byte.vx+=byte.x<world.w*.48?120:-120;byte.vx-=d.x*350;byte.vy-=d.y*350;byte.mode='air';byte.squash=.18;life.reactionBlink=.28;emit(byte.x,byte.y+api.bodyH()*.22,20,4,1.4);state.puddle=1;state.dirty=true;api.voice('boing',.45);api.tactile(.4);}
    if(free&&!local&&state.wet>.15&&state.wetAge>3&&state.shake<=0&&!life.pointer.active&&byte.mode==='idle'){state.shake=.75;state.wetAge=0;emit(byte.x,byte.y,15,home.room,1.1);api.voice('pet',.35);}
    if(state.shake>0){state.shake=Math.max(0,state.shake-dt);state.wet=Math.max(0,state.wet-dt*.9);}
    const floorNow=home.room===2&&!home.travel&&Math.abs(byte.y-api.floorY())<9&&byte.mode==='air'&&byte.squash>.06;
    if(floorNow&&!state.floorContact)dirtyFeet(.14);state.floorContact=floorNow;
    if(obby.hasLaunched)state.expedition=true;else if(state.expedition){state.expedition=false;dirtyFeet(.30);}
    if(state.patches.every(p=>p.dirt<.08)&&!state.washed){state.washed=true;state.dirty=true;life.curious=2;api.voice('notice',.6);}
    for(const p of state.particles){p.life-=dt;p.vx+=d.x*800*dt;p.vy+=d.y*800*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    state.particles=state.particles.filter(p=>p.life>0&&p.x>-20&&p.x<world.w+20&&p.y<world.h+30);
    if(state.dirty&&state.time-state.savedAt>2)save();
  }
  const coating = document.createElement('canvas'); coating.width=214; coating.height=264;
  const ink=coating.getContext('2d'); let coatingKey='',coatingFrame=null,coatingAt=0;
  function paintCoat() {
    const ctx=ink,w=214,h=264;
    for(let i=0;i<state.patches.length;i++){const p=state.patches[i],x=p.x*w,y=p.y*h,r=p.r*h;
      if(p.dirt>.015){ctx.save();ctx.translate(x,y);ctx.rotate(i*.9);ctx.fillStyle=`rgba(104,71,39,${p.dirt*.8})`;ctx.beginPath();ctx.ellipse(0,0,r*.8,r*.47,0,0,Math.PI*2);ctx.ellipse(r*.48,r*.15,r*.5,r*.3,.4,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(180,132,64,${p.dirt*.5})`;ctx.beginPath();ctx.arc(-r*.2,-r*.16,r*.21,0,Math.PI*2);ctx.fill();ctx.restore();}
      if(p.foam>.03){ctx.fillStyle=`rgba(245,255,232,${p.foam*.92})`;ctx.strokeStyle='#daf8e2aa';ctx.lineWidth=.8;for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(x+Math.sin(j*2.4)*r*.5,y+Math.cos(j*2.4)*r*.4,r*(.28+(j%2)*.1),0,Math.PI*2);ctx.fill();ctx.stroke();}}
    }
    if(state.wet>.05){ctx.strokeStyle=`rgba(229,255,240,${state.wet*.75})`;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();for(const [x,y]of [[-.28,-.23],[.24,-.20],[-.12,.11],[.19,.21]]){ctx.moveTo(x*w,y*h);ctx.lineTo(x*w+1,y*h+h*.035)}ctx.stroke();}
  }
  function floorAt(x) {
    if(!here()||earth.enabled)return Infinity;
    const g=geometry();return x>g.x+api.bodyW()*.12&&x<g.x+g.w-api.bodyW()*.12?g.bottom-api.roomH()*.30:Infinity;
  }
  function afterPhysics() {
    if(!here()||byte.grabbed||earth.enabled||byte.mode==='scheming')return;
    const g=geometry(),h=api.bodyH(),inside=byte.x>g.x+api.bodyW()*.12&&byte.x<g.x+g.w-api.bodyW()*.12;
    // The tub has an interior bottom. It supports the body; holding Byte still permits placing/lifting him.
    const bottom=g.bottom-h*.30,foot=byte.y+h*.48;
    if(inside&&foot>bottom){const incoming=byte.vy;byte.y=bottom-h*.48;
      if(incoming>150){byte.vy=-incoming*.18;byte.squash=Math.max(byte.squash,Math.min(.25,incoming/2400));byte.mode='air';}
      else if(incoming>=0){byte.vy=0;if(byte.mode==='air')byte.mode='idle';}
    }
  }
  function present(frame,t) {
    if(!frame)return frame;
    if(state.wet<.05&&state.patches.every(p=>p.dirt<=.015&&p.foam<=.03))return frame;
    const key=state.patches.map(p=>`${Math.round(p.dirt*24)}:${Math.round(p.foam*24)}`).join(',')+`:${Math.round(state.wet*24)}`;
    if(frame!==coatingFrame||key!==coatingKey&&t-coatingAt>50){
      ink.clearRect(0,0,214,264);ink.drawImage(frame,0,0,214,264);
      // Bake care into this small cached sprite rather than blending a second body-sized layer every frame.
      ink.globalCompositeOperation='source-atop';paintCoat();ink.globalCompositeOperation='source-over';
      coatingKey=key;coatingFrame=frame;coatingAt=t;
    }
    return coating;
  }
  function foreground(t) {
    const home=api.home();if(obby.hasLaunched||home.travel)return;
    if(home.room===4){const g=geometry();
      ctx.fillStyle=`rgba(116,180,179,${.04+state.puddle*.10})`;ctx.beginPath();ctx.ellipse(g.x+g.w*.55,world.h-17,g.w*.67,13,0,0,Math.PI*2);ctx.fill();
      // The tub's front occludes submerged legs, but never grabs or snaps the creature.
      ctx.save();ctx.beginPath();ctx.rect(g.x-12,g.rim+5,g.w+24,g.bottom-g.rim+16);ctx.clip();const shade=ctx.createLinearGradient(0,g.rim,0,g.bottom);shade.addColorStop(0,'#d6e8dc');shade.addColorStop(1,'#a8c6c0');rect(ctx,g.x-10,g.rim-10,g.w+20,g.bottom-g.rim+8,28,shade,'#82a3a1');ctx.restore();
      ctx.strokeStyle='#f1f8e8';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(g.x-3,g.rim+4);ctx.quadraticCurveTo(g.x+g.w*.5,g.rim+20,g.x+g.w+3,g.rim+4);ctx.stroke();
      ctx.fillStyle='#759b99';ctx.beginPath();ctx.ellipse(g.x+28,g.bottom+3,10,7,-.3,0,Math.PI*2);ctx.ellipse(g.x+g.w-28,g.bottom+3,10,7,.3,0,Math.PI*2);ctx.fill();
    }
    if(home.room===4){const g=geometry();ctx.strokeStyle='#acb58c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(g.x+g.w-14,g.rim+5);ctx.quadraticCurveTo(g.x+g.w-22,g.rim+36,g.x+g.w-35,g.rim+25);ctx.stroke();ctx.fillStyle=state.draining?'#769796':'#617b72';ctx.beginPath();ctx.ellipse(g.x+g.w-14,g.rim+3,8,4,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#edf0d6';ctx.beginPath();ctx.arc(g.x+g.w-14,g.rim,5,0,Math.PI*2);ctx.stroke();}
    for(const p of state.particles){if(p.room!==home.room)continue;ctx.fillStyle=p.muddy?'#93744c99':`rgba(205,247,238,${Math.min(1,p.life)})`;ctx.beginPath();ctx.ellipse(p.x,p.y,2.3,p.muddy?2:3.5,0,0,Math.PI*2);ctx.fill();}
  }
  window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){state.hand=null;state.source=null;save();}});
  return Object.assign(state,{geometry,save,resize,beginFrame,drawRoom,drawSponge,supportTool,begin,move,end,update,floorAt,afterPhysics,present,foreground,waterAt,point:downPoint,shakeAngle:()=>state.shake>0?Math.sin(state.time*58)*.065*state.shake/.75:0});
};
