/* XI resolves one aftermath, never a clock's worth of invisible physics.
   A saved absence proof and actual object authorship are deliberately conservative. */
window.createByteUnseen=function(api){
  const {ctx,world,byte,life,home,kitchen,bathroom,details,earth,web,obby,outside}=api;
  const key='byte-was-here-v1',leaseKey='byte-was-here-visible-v1';
  const raw=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const read=k=>{try{return JSON.parse(raw(k))}catch(_){return null}};
  const prior=read(key)||{},id=crypto.randomUUID(),minimum=90000,cooldown=18*60000;
  const state={ready:false,pending:prior.pending||null,lastAt:Number(prior.lastAt)||0,lastKind:prior.lastKind||null,
    serial:Number(prior.serial)||0,traces:Array.isArray(prior.traces)?prior.traces.slice(-3):[],lastReceipt:prior.lastReceipt||null,lastResult:'none',lastVeto:null,checkpointAt:0};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function save(){try{localStorage.setItem(key,JSON.stringify({pending:state.pending,lastAt:state.lastAt,lastKind:state.lastKind,serial:state.serial,traces:state.traces,lastReceipt:state.lastReceipt}))}catch(_){}}
  function lease(visible){const t=Date.now(),leases=read(leaseKey)||{};for(const k of Object.keys(leases))if(t-leases[k]>20000)delete leases[k];
    if(visible)leases[id]=t;else delete leases[id];try{localStorage.setItem(leaseKey,JSON.stringify(leases))}catch(_){}}
  function anotherViewer(){return Object.entries(read(leaseKey)||{}).some(([k,t])=>k!==id&&Date.now()-t<12000);}
  function free(){return life.phase==='awake'&&byte.mode==='idle'&&Math.hypot(byte.vx,byte.vy)<12&&Math.abs(byte.y-api.floorY())<12&&
    !byte.grabbed&&!life.pointer.active&&!life.pendingFollow&&!life.nest.active&&!outside.dozing&&!outside.dream&&!outside.bask&&
    !home.hand&&!home.carried&&!home.travel&&!home.journey&&!home.activity&&!web.active&&!earth.enabled&&!obby.hasLaunched&&
    !bathroom.hand&&!bathroom.source&&!bathroom.draining&&!api.pranking()&&!document.querySelector('dialog[open]');}
  function capture(kind){if(!state.ready||!world.w)return;
    if(kind==='hidden'&&state.pending?.session===id&&state.pending.kind==='hidden')return;
    home.save();bathroom.save();
    state.pending={at:Date.now(),session:id,kind,free:free(),room:home.room,homeProof:raw('byte-sunburn-home-v1'),
      recent:{...details.recent},things:home.things.filter(v=>v.room===home.room).map(v=>({id:v.id,room:v.room,origin:v.unseenOrigin,
        stored:!!v.stored,bites:v.bites,speed:Math.hypot(v.vx,v.vy),onShelf:!!v.onShelf,
        reachable:Math.abs(v.y-byte.y)<api.bodyH()*.7}))};save();}
  function empty(room,x,y,r,except){return !home.things.some(v=>v!==except&&!v.stored&&(!v.food||v.bites>0)&&v.room===room&&Math.hypot(v.x-x,v.y-y)<v.r+r+8);}
  function coveredBySound(x,y){const canvas=ctx.canvas.getBoundingClientRect(),control=document.querySelector('#sound-toggle').getBoundingClientRect();
    return x+canvas.left>=control.left&&x+canvas.left<=control.right&&y+canvas.top>=control.top&&y+canvas.top<=control.bottom;}
  function choices(s){const result=[];const actual=t=>home.things.find(v=>v.id===t.id&&v.room===t.room&&!!v.stored===t.stored&&v.unseenOrigin===t.origin&&(!v.food||v.bites===t.bites));
    if(s.room===5){const g=kitchen.geometry();
      const broccoli=s.things.find(t=>t.id==='broccoli'&&t.bites>0&&['byte','offered'].includes(t.origin)&&!t.stored&&t.reachable&&t.speed<120),b=broccoli&&actual(broccoli);
      // The packet sits beneath the far end of the table, clear of Byte and the passage.
      const bx=world.w-(b?.r||18)-32,by=world.h-28;
      if(s.recent?.kind==='food'&&s.recent.id==='broccoli'&&b&&!b.silkWrapped&&empty(5,bx,by,b.r,b))result.push({kind:'broccoli',v:b,x:bx,y:by});
      const food=s.things.find(t=>t.id.startsWith('biscuit-')&&t.origin==='pantry'&&!t.stored&&t.onShelf&&t.bites>=3&&t.speed<40),v=food&&actual(food);
      const y=g.tableY-16;
      if(v)for(const x of [g.tableX+g.tableW-18,world.w*.63,g.tableX+20]){
        if(Math.hypot(byte.x-x,byte.y-y)>api.bodyH()*.48&&empty(5,x,y,v.r,v)){result.push({kind:'picnic',v,x,y});break;}
      }
    }
    if(s.room===2&&s.recent?.kind==='toy'){
      const t=s.things.find(t=>t.id===s.recent.id&&t.origin==='byte'&&!t.stored&&t.reachable&&t.speed<120),v=t&&actual(t);
      if(v&&(v.toy||v.id==='ball')&&home.possessions.ownedToys().includes(v.id)){
        const y=world.h-v.r-10;for(const factor of [.64,.76,.88,-.64]){
          const nx=clamp(world.w*.34+api.bodyW()*factor,v.r+28,world.w-v.r-30);
          if(Math.abs(nx-world.w*.34)>api.bodyW()*.31+v.r+8&&!coveredBySound(nx,y)&&empty(0,nx,y,v.r,v)){result.push({kind:'companion',v,x:nx,y});break;}}
      }
    }
    return result.filter(v=>v.kind!==state.lastKind);
  }
  function resolve(initial=false){if(!state.ready)return;const s=state.pending;state.pending=null;save();state.lastResult='none';state.lastVeto=null;
    if(!s||!s.free||!s.homeProof||!Array.isArray(s.things)){state.lastResult='protected';return;}
    const elapsed=Date.now()-s.at;
    if(elapsed<minimum||elapsed>30*86400000){state.lastVeto='absence';return;}
    if(Date.now()-state.lastAt<cooldown){state.lastVeto='cooldown';return;}
    if(!free()){state.lastVeto='current-body-busy';return;}
    if(anotherViewer()){state.lastVeto='another-viewer';return;}
    if(!initial&&!document.hidden&&s.kind!=='hidden')return;
    if(s.homeProof!==raw('byte-sunburn-home-v1')||s.room!==home.room){state.lastResult='changed';return;}
    if(state.traces.some(t=>!t.seen))return;
    const candidates=choices(s);if(!candidates.length){state.lastVeto='no-plausible-act';return;}
    if(Math.random()>.42){state.lastVeto='nothing-happened';return;}
    // Context chooses the act; randomness only reserves the possibility that nothing happened.
    const event=candidates.find(c=>c.kind==='broccoli')||candidates[0],v=event.v;
    const before={id:v.id,room:v.room,nx:v.x/world.w,ny:v.y/world.h,bites:v.bites,origin:v.unseenOrigin};
    Object.assign(v,{x:event.x,y:event.y,vx:0,vy:0,spin:0,angle:0,onShelf:false,unseenOrigin:'byte'});
    if(event.kind==='picnic'){v.bites--;bathroom.foodMess('crumb');details.note('food','biscuit');kitchen.lastFood='biscuit';}
    if(event.kind==='broccoli'){v.silkWrapped=true;details.note('food','broccoli');}
    if(event.kind==='companion'){
      v.room=0;home.room=0;const p=home.space(0);home.cameraX=p.x;home.cameraY=p.y;
      byte.x=world.w*.34;byte.y=api.floorY();byte.targetX=byte.targetY=null;home.syncUI();details.note('toy',v.id);
    }
    const number=++state.serial,trace={id:number,kind:event.kind,room:v.room,item:v.id,nx:v.x/world.w,ny:v.y/world.h,...(event.kind==='picnic'?{shelfNX:before.nx}:{}),seen:false};
    state.traces.push(trace);state.traces=state.traces.slice(-3);state.lastAt=Date.now();state.lastKind=event.kind;
    state.lastReceipt={id:number,kind:event.kind,absenceMs:elapsed,before,after:{room:v.room,nx:v.x/world.w,ny:v.y/world.h,bites:v.bites,silkWrapped:!!v.silkWrapped},history:{...s.recent}};
    state.lastResult=event.kind;home.save();kitchen.save();bathroom.save();save();
  }
  function start(){state.ready=true;resolve(true);lease(!document.hidden);capture(document.hidden?'hidden':'checkpoint');}
  function protect(){if(state.pending?.free){state.pending.free=false;save();}}
  function update(){if(!state.ready||document.hidden)return;
    // Chrome may be killed without pagehide. Never leave an old idle proof valid
    // after a real grab or an autonomous transition into sleep/carry/other work.
    if(state.pending?.free&&!free())protect();
    let changed=false;for(const t of state.traces)if(!t.seen&&t.room===home.room&&!home.travel&&!obby.hasLaunched){t.seen=true;changed=true;}if(changed)save();
    if(Date.now()-state.checkpointAt>4000){state.checkpointAt=Date.now();lease(true);if(free())capture('checkpoint');else protect();}}
  function handled(v){if(v.silkWrapped){v.silkWrapped=false;home.save();} }
  function released(v,cancelled){if(!cancelled&&v.vegetable&&v.refusedInHand&&!home.journey&&Math.hypot(v.x-byte.x,v.y-byte.y)<api.bodyH()*.65)v.unseenOrigin='offered';v.refusedInHand=false;}
  function wipe(v,dx,dy){if(v.id!=='sponge'||Math.hypot(dx,dy)<2)return;let changed=false;
    for(const t of state.traces){if(t.room!==v.room||t.kind==='companion')continue;
      if(!t.bitsGone&&Math.hypot(v.x-t.nx*world.w,v.y-t.ny*world.h)<v.r+25){t.bitsGone=true;changed=true;}
      if(t.kind==='picnic'&&!t.strandGone){const g=kitchen.geometry(),x=(t.shelfNX??(g.shelfX+g.shelfW-8)/world.w)*world.w,y=g.shelfY+12;
        if(Math.abs(v.x-x)<v.r+13&&v.y>y-v.r&&v.y<y+64+v.r){t.strandGone=true;changed=true;}}
    }
    if(changed){state.traces=state.traces.filter(t=>t.kind==='companion'||!t.bitsGone||t.kind==='picnic'&&!t.strandGone);save();}
  }
  // A small cached skin of loose silk. It is not an active tether or a new collision body.
  const wrap=document.createElement('canvas');wrap.width=wrap.height=88;const p=wrap.getContext('2d');
  p.fillStyle='#f1eee7cc';p.strokeStyle='#b8b8aa';p.lineWidth=1.5;p.beginPath();p.ellipse(44,53,35,23,-.12,0,Math.PI*2);p.fill();p.stroke();
  p.strokeStyle='#fffdf0';p.lineWidth=2;for(let i=0;i<7;i++){p.beginPath();p.moveTo(12+i*2,40+i*5);p.bezierCurveTo(30,32+i*3,59,75-i*3,77-i*2,44+i*4);p.stroke();}
  function drawWrap(v,size){ctx.drawImage(wrap,-size*.5,-size*.5,size,size);}
  const residueCache=new Map();let residueBuilds=0;
  const dangling=document.createElement('canvas');dangling.width=80;dangling.height=156;const d=dangling.getContext('2d');d.scale(2,2);d.translate(16,0);
  d.strokeStyle='#fff8dfaa';d.lineWidth=1;d.beginPath();d.moveTo(0,0);d.bezierCurveTo(-4,20,8,37,2,51);d.bezierCurveTo(-9,65,-13,44,-7,51);d.moveTo(2,51);d.lineTo(9,61);d.stroke();
  const residueKey=t=>t.kind+':'+t.id;
  function residue(t){const key=residueKey(t);let frame=residueCache.get(key);if(frame)return frame;
    frame=document.createElement('canvas');frame.width=192;frame.height=96;const p=frame.getContext('2d');p.scale(2,2);p.translate(40,8);p.lineCap='round';
    const phase=(Number(t.id)||0)*.47,bend=((Number(t.id)||0)%3-1)*3;
    if(t.kind==='picnic'){p.fillStyle='#ae8249';for(let i=0;i<7;i++){p.beginPath();p.ellipse(Math.sin(i*2.4+phase)*23,Math.cos(i*3.2+phase)*7+13,1.4+i%3,.9+i%2,i,0,Math.PI*2);p.fill();}}
    p.strokeStyle='#fff8dfbb';p.lineWidth=1.2;p.beginPath();p.moveTo(-24,14);p.bezierCurveTo(-10,3+bend,4,22,16,13);p.bezierCurveTo(26,6,27,25-bend,34,18);p.stroke();
    p.strokeStyle='#80908777';p.lineWidth=.6;p.beginPath();p.moveTo(-25,16);p.bezierCurveTo(-13,5+bend,4,23,16,15);p.stroke();
    residueCache.set(key,frame);residueBuilds++;return frame;
  }
  function foreground(){if(obby.hasLaunched)return;
    for(const key of residueCache.keys())if(!state.traces.some(t=>residueKey(t)===key))residueCache.delete(key);
    ctx.save();
    // The companion's evidence is the actual moved toy, not an added mess tableau.
    for(const t of state.traces){if(t.kind==='companion'||Math.abs(home.offset(t.room))>=world.w)continue;
      if(!t.bitsGone)ctx.drawImage(residue(t),home.offset(t.room)+t.nx*world.w-40,home.offsetY(t.room)+t.ny*world.h-8,96,48);
      if(t.kind==='picnic'&&!t.strandGone){const g=kitchen.geometry(),x=(t.shelfNX??(g.shelfX+g.shelfW-8)/world.w)*world.w;
        ctx.drawImage(dangling,home.offset(5)+x-16,home.offsetY(5)+g.shelfY+12,40,78);}
    }ctx.restore();
  }
  function cacheStats(){return{cachedResidues:residueCache.size,residueBuilds,bitmapBytes:[wrap,dangling,...residueCache.values()].reduce((n,v)=>n+v.width*v.height*4,0)}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){capture('hidden');lease(false);}else if(state.ready){resolve();lease(true);capture('checkpoint');}},true);
  document.addEventListener('pointerdown',protect,true);
  window.addEventListener('pagehide',()=>{capture('hidden');lease(false);},true);
  return Object.assign(state,{start,update,capture,resolve,choices,free,handled,released,wipe,foreground,drawWrap,cacheStats});
};
