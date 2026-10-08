/* Sunburn IV: one authored bathroom and one body-local washing process. */
window.createByteBathroom = function createByteBathroom(api) {
  const { ctx, world, byte, life, earth, web, obby } = api;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const key = 'byte-sunburn-care-v1';
  let saved; try { saved = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const marks = [[-.08,-.19,.145],[-.28,.02,.12],[.27,.025,.12],[-.03,.18,.15],[-.28,.36,.12],[.29,.35,.12]];
  function stain(i,n,kind='mud') {
    const a=(i*1.3+n*2.399),reach=n?Math.min(.82,.3+n*.08):.13;
    return {dx:Math.cos(a)*reach,dy:Math.sin(a)*reach,r:.23+(n%3)*.09,angle:a,shape:(i+n)%3,kind};
  }
  const state = { fill: clamp(Number(saved?.fill)||0,0,1), source: null, draining: false, hand: null, wet: 0, washed: !!saved?.washed,
    patches: marks.map(([x,y,r],i)=>({x,y,r,dirt:clamp(Number.isFinite(saved?.mud?.[i])?saved.mud[i]:.85,0,1),foam:0,
      stains:Array.isArray(saved?.stains?.[i])?saved.stains[i].slice(-8).filter(s=>s&&['dx','dy','r','angle','shape'].every(k=>Number.isFinite(s[k]))&&Math.abs(s.dx)<=1&&Math.abs(s.dy)<=1&&s.r>0&&s.r<1).map(s=>({...s,kind:['jam','berry','crumb'].includes(s.kind)?s.kind:'mud'})):[stain(i,0),stain(i,1)]})),
    puddle: clamp(Number(saved?.puddle)||0,0,1), particles: [], head: {x:0,y:0,vx:0,vy:0},
    time: 0, dirty: false, savedAt:0, wetAge:0, shake:0, mischief:false, splashes:0, scrubbed:0,
    lastSponge:null, floorContact:false, expedition:false, previousRoom:1, width:0, height:0,
    dirtEvents:Math.max(0,Number(saved?.dirtEvents)||0),stainVersion:0 };
  const backdrop = document.createElement('canvas'); backdrop.id='bathroom-scenery';backdrop.setAttribute('aria-hidden','true');ctx.canvas.before(backdrop);
  const wall = backdrop.getContext('2d', {alpha:false});
  const here = () => api.home().room===4&&!api.home().travel&&!obby.hasLaunched;
  function geometry() {
    const w=world.w,h=world.h,rim=h-24-api.roomH()*.66;
    return {x:w*.18,w:w*.56,rim,bottom:h-24,surface:h-35-state.fill*(h-35-(rim+8)),
      tapX:w*.20,tapY:h*.57,dishX:w*.115,dishY:h*.61,mountX:w*.64,mountY:h*.24,pipeX:w*.65,pipeY:h*.115};
  }
  function save() {
    try {localStorage.setItem(key,JSON.stringify({mud:state.patches.map(p=>p.dirt),stains:state.patches.map(p=>p.stains),dirtEvents:state.dirtEvents,washed:state.washed,fill:state.fill,puddle:state.puddle}));}catch(_){}
    state.dirty=false;state.savedAt=state.time;
  }
  function rect(p,x,y,w,h,r,fill,stroke) {p.fillStyle=fill;p.beginPath();p.roundRect(x,y,w,h,r);p.fill();if(stroke){p.strokeStyle=stroke;p.stroke();}}
  function resize() {
    if(state.width===world.w&&state.height===world.h)return;
    state.width=world.w;state.height=world.h;state.hand=null;
    const g=geometry();state.head={x:g.mountX,y:g.mountY,vx:0,vy:0};
    backdrop.width=Math.ceil(world.w*.75);backdrop.height=Math.ceil(world.h*.75);
    wall.setTransform(.75,0,0,.75,0,0);const w=world.w,h=world.h;
    const art=window.ByteWorldArt;art.base(wall,4,w,h);api.home().details?.paintDecor(wall,4);
    window.drawBytePassage(wall,w,h,api.roomH(),'right','#536d76');
    art.rect(wall,'round-window',w*.075,h*.15,w*.24,h*.20);
    wall.strokeStyle='#857251';wall.lineWidth=9;wall.beginPath();wall.moveTo(g.pipeX,g.pipeY);wall.lineTo(g.pipeX,h*.57);wall.stroke();wall.strokeStyle='#e4d4a0';wall.lineWidth=3;wall.stroke();
    art.rect(wall,'dish',g.dishX-29,g.dishY-4,58,12);
    art.rect(wall,'tap',g.tapX-21,g.tapY-22,54,55);
    art.shadow(wall,g.x+g.w*.5,g.bottom+5,g.w*1.25,25);
    // Open-front dimensional ceramic keeps the old real water/cutaway contract.
    art.rect(wall,'tub',g.x-11,g.rim-13,g.w+22,g.bottom-g.rim+24);

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
    ctx.save();ctx.translate(head.x,head.y);ctx.rotate(-.25);window.ByteWorldArt.rect(ctx,'shower',-24,-9,48,18);if(state.source==='shower'){ctx.strokeStyle='#d5fff5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-19,7);ctx.lineTo(19,7);ctx.stroke();}ctx.restore();
    if(state.fill>.02){const slope=api.down().x*14;ctx.fillStyle='#85c9c487';ctx.beginPath();ctx.moveTo(g.x+4,g.surface-slope);ctx.lineTo(g.x+g.w-4,g.surface+slope);ctx.lineTo(g.x+g.w-6,g.bottom-3);ctx.lineTo(g.x+6,g.bottom-3);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#d7fff0';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=12;i++){const x=g.x+4+(g.w-8)*i/12,y=g.surface+slope*(i/6-1)+Math.sin(t*.005+i*.7)*2;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();}
    if(state.source==='shower'){
      const down=api.down(),length=world.h*.69;ctx.strokeStyle='#7fbac9bd';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<18;i++){const f=(t*.00075+i*.061)%1,s=(i%5-2)*(9+f*7),x=head.x+down.x*length*f+down.y*s,y=head.y+8+down.y*length*f-down.x*s;ctx.moveTo(x,y);ctx.lineTo(x+down.x*13,y+down.y*13)}ctx.stroke();
    }
  }
  function drawSponge(v) {window.ByteWorldArt.item(ctx,'sponge',46,26);}

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
    state.dirtEvents++;
    const regions=[3,4,5];if(state.dirtEvents>1)regions.push(1,2);if(state.dirtEvents>3)regions.push(0);
    for(const i of regions){const p=state.patches[i];if(p.dirt<.02)p.stains=[];
      p.dirt=clamp(p.dirt+strength,0,1);p.stains.push(stain(i,state.dirtEvents),stain(i,state.dirtEvents+3));p.stains=p.stains.slice(-8);}
    state.stainVersion++;state.dirty=true;
  }
  function foodMess(kind='jam'){const p=state.patches[3];if(p.dirt<.02)p.stains=[];
    p.dirt=clamp(p.dirt+.14,0,1);p.stains.push({dx:.16,dy:-.83,r:.22,angle:.2,shape:2,kind});p.stains=p.stains.slice(-8);state.stainVersion++;state.dirty=true;}
  function begin(x,y,id) {
    if(!here())return false;
    const g=geometry();
    if(Math.hypot(x-(g.tapX-12),y-(g.tapY-24))<28){state.source=state.source==='bath'?null:'bath';state.draining=false;state.hand={kind:'tap',id,x,y};life.pointer.kind='fixture';api.voice('notice',.3);return true;}
    const stopper=drainGeometry(g);
    if(Math.hypot(x-stopper.handleX,y-stopper.handleY)<19||Math.hypot(x-stopper.x,y-stopper.plugY)<20){state.draining=!state.draining;state.source=null;state.hand={kind:'drain',id,x,y};life.pointer.kind='fixture';return true;}
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
    ctx.save();ctx.translate(w*.5,h*.5);
    for(let i=0;i<state.patches.length;i++){const p=state.patches[i],x=p.x*w,y=p.y*h,r=p.r*h;
      if(p.dirt>.015){const count=Math.ceil(p.stains.length*Math.min(1,p.dirt*1.2));
        for(let n=0;n<count;n++){const s=p.stains[n],sx=x+s.dx*r,sy=y+s.dy*r,sr=r*s.r;
          ctx.save();ctx.translate(sx,sy);ctx.rotate(s.angle);const color={jam:'145,64,45',berry:'124,66,137',crumb:'177,130,55'}[s.kind];ctx.fillStyle=color?`rgba(${color},${p.dirt*.85})`:`rgba(99,65,35,${.16+p.dirt*.64})`;ctx.beginPath();
          if(s.shape===0){ctx.ellipse(0,0,sr*1.8,sr*.65,0,0,Math.PI*2);ctx.ellipse(sr*.5,sr*.25,sr,sr*.5,.3,0,Math.PI*2)}
          else if(s.shape===1){for(let k=0;k<5;k++)ctx.ellipse(Math.sin(k*2.4)*sr*.8,Math.cos(k*2.4)*sr*.8,sr*(k?.45:.85),sr*.55,k,0,Math.PI*2)}
          else {ctx.moveTo(-sr,-sr*.25);ctx.lineTo(sr*1.4,-sr*.55);ctx.lineTo(sr*.9,sr*.8);ctx.lineTo(-sr*.6,sr*.55);ctx.closePath()}
          ctx.fill();ctx.fillStyle=`rgba(184,128,61,${p.dirt*.55})`;ctx.beginPath();ctx.ellipse(-sr*.4,-sr*.18,sr*.6,sr*.18,0,0,Math.PI*2);ctx.fill();ctx.restore();
        }
      }
      if(p.foam>.03){const foamR=Math.min(r,h*.075);ctx.fillStyle=`rgba(245,255,232,${p.foam*.92})`;ctx.strokeStyle='#daf8e2aa';ctx.lineWidth=.8;for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(x+Math.sin(j*2.4)*foamR*.5,y+Math.cos(j*2.4)*foamR*.4,foamR*(.28+(j%2)*.1),0,Math.PI*2);ctx.fill();ctx.stroke();}}
    }
    if(state.wet>.05){ctx.strokeStyle=`rgba(229,255,240,${state.wet*.75})`;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();for(const [x,y]of [[-.28,-.23],[.24,-.20],[-.12,.11],[.19,.21]]){ctx.moveTo(x*w,y*h);ctx.lineTo(x*w+1,y*h+h*.035)}ctx.stroke();}
    ctx.restore();
  }
  function floorAt(x) {
    if(!here()||earth.enabled)return Infinity;
    const g=geometry();return x>g.x+api.bodyW()*.12&&x<g.x+g.w-api.bodyW()*.12?g.bottom-api.roomH()*.30:Infinity;
  }
  function afterPhysics() {
    if(!here()||byte.grabbed||earth.enabled||byte.mode==='scheming')return;
    const g=geometry(),h=api.bodyH(),inside=byte.x>g.x+api.bodyW()*.12&&byte.x<g.x+g.w-api.bodyW()*.12;
    // The tub has an interior bottom. It supports the body; holding Bob still permits placing/lifting him.
    const bottom=g.bottom-h*.30,foot=byte.y+h*.48;
    if(inside&&foot>bottom){const incoming=byte.vy;byte.y=bottom-h*.48;
      if(incoming>150){byte.vy=-incoming*.18;byte.squash=Math.max(byte.squash,Math.min(.25,incoming/2400));byte.mode='air';}
      else if(incoming>=0){byte.vy=0;if(byte.mode==='air')byte.mode='idle';}
    }
  }
  function present(frame,t) {
    if(!frame)return frame;
    if(state.wet<.05&&state.patches.every(p=>p.dirt<=.015&&p.foam<=.03))return frame;
    const key=state.patches.map(p=>`${Math.round(p.dirt*24)}:${Math.round(p.foam*24)}`).join(',')+`:${Math.round(state.wet*24)}:${state.stainVersion}`;
    if(frame!==coatingFrame||key!==coatingKey&&t-coatingAt>50){
      ink.clearRect(0,0,214,264);ink.drawImage(frame,0,0,214,264);
      // Bake care into this small cached sprite rather than blending a second body-sized layer every frame.
      ink.globalCompositeOperation='source-atop';paintCoat();ink.globalCompositeOperation='source-over';
      coatingKey=key;coatingFrame=frame;coatingAt=t;
    }
    return coating;
  }
  function drainGeometry(g=geometry()) {
    return {x:g.x+g.w*.76,y:g.bottom-17,handleX:g.x+g.w-14,handleY:g.rim+3,
      plugY:g.bottom-17-(state.draining?42:0)};
  }
  function drawBasinFront(t) {
    const g=geometry(),drain=drainGeometry(g);
    ctx.fillStyle=`rgba(116,180,179,${.04+state.puddle*.10})`;ctx.beginPath();ctx.ellipse(g.x+g.w*.55,world.h-17,g.w*.67,13,0,0,Math.PI*2);ctx.fill();
    // A clear basin reveals the same surface used by waterAt and the existing buoyancy forces.
    ctx.save();ctx.beginPath();ctx.roundRect(g.x-8,g.rim+4,g.w+16,g.bottom-g.rim-2,22);ctx.clip();
    ctx.fillStyle='#eff8e51c';ctx.fillRect(g.x-8,g.rim+4,g.w+16,g.bottom-g.rim);
    // Reveal the existing raised interior support rather than leaving an apparently floating dry body.
    const supportY=g.bottom-api.roomH()*.30;
    ctx.strokeStyle='#789f9770';ctx.lineWidth=2;ctx.beginPath();
    ctx.moveTo(g.x+8,supportY+5);ctx.lineTo(g.x+g.w-8,supportY+5);
    for(let x=g.x+16;x<g.x+g.w-8;x+=18){ctx.moveTo(x,supportY);ctx.lineTo(x+5,supportY+5)}ctx.stroke();
    ctx.strokeStyle='#9ab5a766';ctx.lineWidth=3;ctx.beginPath();
    for(const x of [g.x+25,g.x+g.w-25]){ctx.moveTo(x,supportY+5);ctx.lineTo(x,g.bottom-9)}ctx.stroke();
    // Floor outlet + rubber stopper. The chain connects the rim handle to the actual drain.
    ctx.fillStyle='#c7d8cf';ctx.strokeStyle='#75958d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(drain.x,drain.y,14,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#354c4d';ctx.beginPath();ctx.ellipse(drain.x,drain.y,10,4,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#bccfc1';ctx.lineWidth=1.3;ctx.beginPath();for(let i=-1;i<=1;i++){ctx.moveTo(drain.x-8,drain.y+i*2);ctx.lineTo(drain.x+8,drain.y+i*2)}ctx.stroke();
    if(state.fill>.02){
      ctx.fillStyle='#58afb44c';ctx.beginPath();ctx.moveTo(g.x+4,g.surface-api.down().x*14);ctx.lineTo(g.x+g.w-4,g.surface+api.down().x*14);ctx.lineTo(g.x+g.w-6,g.bottom-3);ctx.lineTo(g.x+6,g.bottom-3);ctx.closePath();ctx.fill();
      const slope=api.down().x*14;ctx.strokeStyle='#3f939aa8';ctx.lineWidth=3;ctx.beginPath();
      const bodyX=api.home().space(api.home().room).x+byte.x-api.home().space(4).x;
      for(let i=0;i<=24;i++){const x=g.x+4+(g.w-8)*i/24,contact=Math.exp(-Math.pow((x-bodyX)/28,2))*clamp(byte.vy/100,-2,2);
        const y=g.surface+slope*(i/12-1)+Math.sin(t*.005+i*.35)*1.5+contact;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
      ctx.strokeStyle='#eaffec';ctx.lineWidth=1.4;ctx.stroke();
      if(state.draining){ctx.strokeStyle='#e1fff0b0';ctx.lineWidth=1.4;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(drain.x,g.surface+4+i*3,15-i*4,3,Math.sin(t*.004)*.12,0,Math.PI*1.65);ctx.stroke();}}
    }
    ctx.restore();
    // Clear front has a solid rim/base. Bob's wet body remains visible through it, with no physical changes.
    ctx.strokeStyle='#89aaa3';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(g.x-10,g.rim+4,g.w+20,g.bottom-g.rim-4,25);ctx.stroke();
    ctx.strokeStyle='#f1f8e8';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(g.x-3,g.rim+4);ctx.quadraticCurveTo(g.x+g.w*.5,g.rim+20,g.x+g.w+3,g.rim+4);ctx.stroke();
    ctx.strokeStyle='#abc9bc';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(g.x+13,g.bottom-8);ctx.lineTo(g.x+g.w-13,g.bottom-8);ctx.stroke();
    ctx.strokeStyle='#ffffff66';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(g.x+8,g.rim+27);ctx.lineTo(g.x+8,g.bottom-30);ctx.stroke();
    ctx.fillStyle='#759b99';ctx.beginPath();ctx.ellipse(g.x+28,g.bottom+3,10,7,-.3,0,Math.PI*2);ctx.ellipse(g.x+g.w-28,g.bottom+3,10,7,.3,0,Math.PI*2);ctx.fill();
    // Linked chain and raised stopper visibly agree with the live drain state.
    ctx.strokeStyle='#a39d69';ctx.lineWidth=1.5;const controlX=(drain.handleX+drain.x)*.5+10;
    ctx.beginPath();ctx.moveTo(drain.handleX,drain.handleY);ctx.quadraticCurveTo(controlX,drain.plugY-18,drain.x,drain.plugY-6);ctx.stroke();
    const links=10;for(let i=0;i<=links;i++){const f=i/links,x=(1-f)*(1-f)*drain.handleX+2*(1-f)*f*controlX+f*f*drain.x,y=(1-f)*(1-f)*drain.handleY+2*(1-f)*f*(drain.plugY-18)+f*f*(drain.plugY-6);ctx.beginPath();ctx.ellipse(x,y,2,3.5,-.3,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#344c49';ctx.strokeStyle='#142d2c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(drain.x,drain.plugY,12,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#d3d8a4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(drain.x,drain.plugY-5,4,Math.PI,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#aeb994';ctx.strokeStyle='#eff2cf';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(drain.handleX,drain.handleY,9,7,-.3,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  function foreground(t) {
    const home=api.home();if(obby.hasLaunched)return;
    // Same front/occlusion during passage as at rest; no transition-only cutaway.
    const ox=home.offset(4),oy=home.offsetY(4);
    if(ox>-world.w&&ox<world.w){ctx.save();ctx.translate(ox,oy);ctx.beginPath();ctx.rect(0,0,world.w,world.h);ctx.clip();drawBasinFront(t);ctx.restore();}
    if(home.travel)return;
    for(const p of state.particles){if(p.room!==home.room)continue;ctx.fillStyle=p.muddy?'#93744c99':`rgba(205,247,238,${Math.min(1,p.life)})`;ctx.beginPath();ctx.ellipse(p.x,p.y,2.3,p.muddy?2:3.5,0,0,Math.PI*2);ctx.fill();}
  }
  window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){state.hand=null;state.source=null;save();}});
  return Object.assign(state,{geometry,drainGeometry,save,resize,beginFrame,drawRoom,drawSponge,supportTool,begin,move,end,update,floorAt,afterPhysics,present,foreground,waterAt,point:downPoint,dirtyFeet,foodMess,shakeAngle:()=>state.shake>0?Math.sin(state.time*58)*.065*state.shake/.75:0});
};
