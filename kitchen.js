/* Sunburn V: one shelf, three real biscuits, and a thief using the room's existing rope. */
window.createByteKitchen = function(api) {
  const {ctx,world,byte,life,earth,web,obby,autonomy,bathroom}=api;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let history;try{history=JSON.parse(localStorage.getItem('byte-sunburn-kitchen-v1'))}catch(_){}
  const state={phase:'idle',food:null,elapsed:0,time:0,nextTheft:0,chew:0,refusal:0,satisfaction:0,
    opinion:null,opinionTime:0,rejected:0,anticipation:0,sour:0,lastFood:history?.lastFood||null,serial:Math.max(0,Number(history?.serial)||0),fizz:[],
    meals:Math.max(0,Number(history?.meals)||0),crumbs:[],width:0,height:0,attempts:0,bites:0};
  const backdrop=document.createElement('canvas');backdrop.id='kitchen-scenery';backdrop.setAttribute('aria-hidden','true');ctx.canvas.before(backdrop);
  const wall=backdrop.getContext('2d',{alpha:false});
  const foodFrames=[],treatFrames=new Map();
  let vegetableFrame;
  const here=()=>api.home().room===5&&!api.home().travel&&!obby.hasLaunched;
  function geometry(){const w=world.w,h=world.h;return{shelfX:w*.17,shelfW:w*.48,shelfY:Math.min(h*.36,h-api.roomH()*1.65),tableX:w*.14,tableW:w*.72,tableY:api.floorY()+api.bodyH()*.055+16}}
  function mouth(t=performance.now()){
    const b=api.bodyGeometry(t),curious=b.frame?.src?.endsWith('/curious.png'),moving=byte.mode==='scuttle',plotting=byte.mode==='scheming';
    const lx=(moving?.23:curious?.025:plotting?.055:0)*b.frameW*byte.facing*b.squeezeX,ly=(moving?.105:plotting?.25:curious?.025:.055)*api.bodyH()*b.squeezeY,c=Math.cos(b.angle),s=Math.sin(b.angle);
    return{x:byte.x+lx*c-ly*s,y:byte.y+b.bob+lx*s+ly*c};
  }
  function save(){try{localStorage.setItem('byte-sunburn-kitchen-v1',JSON.stringify({meals:state.meals,lastFood:state.lastFood,serial:state.serial}))}catch(_){}api.home().save()}
  function box(p,x,y,w,h,r,fill,stroke){p.fillStyle=fill;p.beginPath();p.roundRect(x,y,w,h,r);p.fill();if(stroke){p.strokeStyle=stroke;p.stroke()}}
  function resize(){
    if(state.width===world.w&&state.height===world.h)return;
    cancel();state.width=world.w;state.height=world.h;
    backdrop.width=Math.ceil(world.w*.75);backdrop.height=Math.ceil(world.h*.75);wall.setTransform(.75,0,0,.75,0,0);
    const w=world.w,h=world.h,g=geometry();
    const art=window.ByteWorldArt;art.base(wall,5,w,h);
    art.rect(wall,'window',w*.71,h*.13,w*.20,h*.24);
    art.rect(wall,'shelf',g.shelfX,g.shelfY-2,g.shelfW,35);
    art.rect(wall,'pantry',g.shelfX+8,g.shelfY-62,g.shelfW-16,64);
    for(let i=0;i<3;i++){const x=w*(.29+i*.11);art.rect(wall,i===1?'dish':'towel',x-10,h*.53,20,h*.10);}
    art.shadow(wall,g.tableX+g.tableW*.5,h-18,g.tableW*1.1,24);
    art.rect(wall,'table',g.tableX,g.tableY-1,g.tableW,h-g.tableY-12);
    api.home().details?.paintDecor(wall,5);
    window.drawBytePassage(wall,w,h,api.roomH(),'left','#c1bb9b');
    window.drawBytePassage(wall,w,h,api.roomH(),'right','#b4c796');
    // Existing bite authority stays in the same cached food frames.
    for(let bites=1;bites<=4;bites++)foodFrames[bites]=art.foodFrame('biscuit',bites);
    vegetableFrame=art.foodFrame('broccoli',4);

  }
  function beginFrame(){resize();const visible=here();document.body.classList.toggle('kitchen-here',visible);return visible}
  function drawRoom(){if(!here())ctx.drawImage(backdrop,0,0,world.w,world.h)}
  function paintFood(p,v){
    const ctx=p;
    const r=v.r,bites=4-v.bites;
    // Bite scallops expose the real diminishing biscuit, rather than an eating VFX replacement.
    ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);
    for(let i=0;i<bites;i++){const a=-.45+i*.6;ctx.moveTo(Math.cos(a)*r+8,Math.sin(a)*r);ctx.arc(Math.cos(a)*r,Math.sin(a)*r,8,0,Math.PI*2)}
    ctx.fillStyle='#d9a75b';ctx.fill('evenodd');ctx.clip('evenodd');ctx.strokeStyle='#edca87';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r-3,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#ac674a';ctx.beginPath();ctx.arc(0,0,r*.42,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eac382';for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.arc(Math.cos(a)*r*.65,Math.sin(a)*r*.65,1.4,0,Math.PI*2);ctx.fill()}ctx.restore();
  }
  function drawFood(v){const size=(v.r+4)*2;let frame=v.vegetable?vegetableFrame:foodFrames[v.bites];
    if(v.treat){const item=window.byteTreasures.find(t=>t.id===v.treat);frame=window.ByteWorldArt.foodFrame(v.treat,v.bites,item?.portions||4);}
    if(frame)ctx.drawImage(frame,-size*.5,-size*.5,size,size);
    if(v.silkWrapped)api.home().unseen?.drawWrap(v,size);
  }
  function deliver(item){if(item.category!=='food'||!world.w)return false;const h=api.home(),g=geometry();let id;do{id='treat-'+(++state.serial)+'-'+item.id}while(h.things.some(v=>v.id===id));
    const v={id,treat:item.id,food:true,bites:item.portions,r:18,room:5,nx:.77,ny:0,x:world.w*(.77+Math.sin(state.serial*2.4)*.045),y:g.tableY-18,vx:0,vy:0,angle:Math.sin(state.serial)*.2,spin:0,touch:0};h.things.push(v);save();
    // A shop can remain open while Byte starts a room trip. Preserve this delivery even
    // while normal home-position saving waits for that transition to finish.
    if(h.travel){try{const remembered=JSON.parse(localStorage.getItem('byte-sunburn-home-v1'))||{};remembered.things=remembered.things||[];remembered.things.push({id:v.id,treat:v.treat,room:5,nx:v.x/world.w,ny:v.y/world.h,bites:v.bites});localStorage.setItem('byte-sunburn-home-v1',JSON.stringify(remembered));}catch(_){} }
    return v;
  }
  function supportTool(v,previousY){
    if(!v.food||v.room!==5||v.bites<=0)return;
    const g=geometry(),insideShelf=v.x>g.shelfX-v.r*.2&&v.x<g.shelfX+g.shelfW+v.r*.2;
    if(v.onShelf){if(insideShelf){v.y=g.shelfY-v.r;if(v.vy>0)v.vy=0}else v.onShelf=false}
    if(!v.onShelf&&insideShelf&&v.vy>0&&previousY+v.r<=g.shelfY+1&&v.y+v.r>=g.shelfY){v.y=g.shelfY-v.r;v.vy=0;v.onShelf=true}
    if(!v.onShelf&&v.x>g.tableX-v.r*.2&&v.x<g.tableX+g.tableW+v.r*.2&&v.vy>=0&&previousY+v.r<=g.tableY+5&&v.y+v.r>=g.tableY){v.y=g.tableY-v.r;v.vy=Math.abs(v.vy)>100?-v.vy*.15:0;v.vx*=.93}
  }
  function carry(v){const m=v.inMouth?mouth():{x:byte.x+byte.facing*api.bodyGeometry().frameW*.34,y:byte.y-api.bodyH()*.13};v.room=api.home().room;v.x=m.x;v.y=m.y;v.vx=byte.vx;v.vy=byte.vy;v.angle=api.bodyGeometry().angle}
  function cancel(){
    const home=api.home();api.releaseFoodWeb();
    state.refusal=state.satisfaction=state.anticipation=state.sour=0;state.opinion=null;state.opinionTime=0;
    if(state.phase!=='idle'){if(home.activity?.kind==='food')home.activity=null;byte.targetX=byte.targetY=null;if(byte.mode==='scheming')byte.mode=earth.enabled?'air':'idle';autonomy.choice=null;autonomy.idleTime=0;state.nextTheft=state.time+7}
    state.phase='idle';state.food=null;state.elapsed=0;
  }
  function opportunity(){const h=api.home();return here()&&!earth.enabled&&!web.active&&!byte.grabbed&&!h.hand&&life.phase==='awake'&&state.time>=state.nextTheft&&state.phase==='idle'&&!h.carried&&h.things.some(v=>v.food&&!v.vegetable&&v.room===5&&v.bites>0)}
  function start(){
    if(!opportunity())return false;
    const home=api.home(),foods=home.things.filter(v=>v.food&&!v.vegetable&&v.room===5&&v.bites>0);
    state.food=foods.sort((a,b)=>Math.hypot(a.x-byte.x,a.y-byte.y)-Math.hypot(b.x-byte.x,b.y-byte.y))[0];
    state.phase='approach';state.elapsed=0;state.attempts++;home.activity={kind:'food'};autonomy.choice='food';life.curious=1.2;return true;
  }
  function bite(v,t){
    v.bites--;state.bites++;state.lastFood=v.treat||'biscuit';state.chew=.4;life.reactionBlink=.18;life.curious=1.2;api.voice('pet',.3);api.tactile(.15);
    const m=mouth(t),treat=window.byteTreasures.find(vv=>vv.id===v.treat),taste=treat?.taste;
    bathroom.foodMess(taste==='fizz'?'berry':taste==='crunch'||taste==='sour'?'crumb':'jam');
    if(taste==='sour'){state.sour=1.35;api.voice('sour',.5);}
    if(taste==='crunch')api.voice('crunch',.55);
    if(taste==='fizz'){for(let i=0;i<7&&state.fizz.length<18;i++)state.fizz.push({room:api.home().room,x:m.x,y:m.y,vx:Math.sin(i*2.4)*24,vy:-25-i*7,age:0,r:2+i%3});api.voice('bubble',.4);}
    if(taste==='delight')api.voice('happy',.6);
    for(let i=0;i<5&&state.crumbs.length<24;i++)state.crumbs.push({room:api.home().room,x:m.x,y:m.y,vx:Math.sin(i*2.4)*60,vy:-35-i*8,life:.6+i*.08,color:taste==='fizz'?'#9b80ad':taste==='jam'||taste==='delight'?'#c87585':'#c89c60'});
    if(v.bites===0){const h=api.home();if(h.hand?.item===v){h.hand=null;life.pointer.kind='eaten'}if(h.carried===v)h.carried=null;state.meals++;const sourLeft=state.sour;cancel();state.sour=sourLeft;state.satisfaction=2.1;if(v.treat)h.things.splice(h.things.indexOf(v),1);state.nextTheft=state.time+35;life.curious=2;api.voice('notice',.3)}save();
  }
  function update(dt,t){
    state.time+=dt;state.chew=Math.max(0,state.chew-dt);
    state.anticipation=Math.max(0,state.anticipation-dt);state.sour=Math.max(0,state.sour-dt);
    state.refusal=Math.max(0,state.refusal-dt);state.satisfaction=Math.max(0,state.satisfaction-dt);
    if(byte.grabbed||hiding()){state.refusal=state.satisfaction=state.anticipation=state.sour=0;state.opinion=null;state.opinionTime=0;}
    for(const c of state.crumbs){c.life-=dt;c.vy+=800*dt;c.x+=c.vx*dt;c.y+=c.vy*dt}state.crumbs=state.crumbs.filter(c=>c.life>0);
    for(const b of state.fizz){b.age+=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;}state.fizz=state.fizz.filter(b=>b.age<1.5);
    if(obby.hasLaunched)return;
    const h=api.home();
    if(state.phase!=='idle'){
      const v=state.food;if(!here()||!v||v.bites<=0||byte.grabbed||life.phase!=='awake'||h.hand||earth.enabled||state.elapsed>14){cancel()}
      else {
        state.elapsed+=dt;life.gazeX=v.x;life.gazeY=v.y;
        if(state.phase==='approach'){
          const desired=v.onShelf?world.w*.80:v.x,tx=clamp(desired,api.extents().x+6,world.w-api.extents().x-6);
          if(byte.mode==='idle'&&Math.abs(byte.x-tx)>12){byte.targetX=tx;byte.targetY=api.floorY();byte.mode='scuttle'}
          if(byte.mode==='idle'&&Math.abs(byte.x-tx)<=16){byte.facing=v.x<byte.x?-1:1;byte.mode='scheming';byte.frame=0;state.phase='scheming';state.elapsed=0;api.voice('notice',.25)}
        }else if(state.phase==='scheming'){
          if(byte.mode!=='scheming')cancel();else if(state.elapsed>=1.2){api.castFoodWeb(v);state.phase='reel';state.elapsed=0;byte.mode='air';api.voice('web',.7)}
        }else if(state.phase==='reel'){
          if(web.food!==v)cancel();else{
            web.progress=Math.min(1,state.elapsed/.25);
            web.reel=web.progress===1?140:0;
            web.deployedLength=Math.max(18,web.deployedLength-web.reel*dt);
          }
        }
      }
    }
    if(h.travel||life.phase!=='awake')return;
    const m=mouth(t);
    for(const v of h.things){
      if(!v.food||v.bites<=0||v.room!==h.room)continue;
      const near=Math.hypot(v.x-m.x,v.y-m.y)<v.r+api.bodyH()*.055;
      const held=h.hand?.item===v,carried=h.carried===v;
      if(v.treat&&held&&!byte.grabbed&&state.sour<=0&&state.refusal<=0&&Math.hypot(v.x-m.x,v.y-m.y)<api.bodyH()*.48&& !near)state.anticipation=.35;
      if(v.treat==='carrot-curl'&&near&&!v.accepted){v.tasteContact=(v.tasteContact||0)+dt;if(v.tasteContact>.4&&v.tasteContact<1)state.refusal=.35;if(v.tasteContact<1.6){v.contact=0;continue;}v.accepted=true;}
      else if(v.treat==='carrot-curl'&&!near)v.tasteContact=0;
      if(v.vegetable){
        v.contact=0;
        if(near&&!byte.grabbed&&!web.active&&!h.carried&&(held||state.opinion===v||v.touch>0)){
          state.satisfaction=0;life.gazeX=v.x;life.gazeY=v.y;life.curious=Math.max(life.curious,.65);
          if(state.opinion!==v){state.opinion=v;state.opinionTime=0;}
          state.opinionTime+=dt;
          if(state.opinionTime>.5&&state.time>=(v.refuseAfter||0)){
            state.refusal=1.45;state.rejected++;v.refuseAfter=state.time+2.8;
            if(held)v.refusedInHand=true;
            // A real little shove; Fingers still owns a held vegetable, Byte can back away.
            const b=api.bodyGeometry(t),nx=Math.cos(b.angle)*byte.facing,ny=Math.sin(b.angle)*byte.facing;
            if(!held){v.unseenOrigin='byte';v.vx+=nx*180;v.vy+=ny*180-65;v.onShelf=false;}
            if(!earth.enabled||earth.support.active){byte.vx-=nx*155;byte.vy-=ny*155;if(!earth.enabled)byte.mode='air';}
            api.voice('land',.2);api.tactile(.1);
          }
        }else if(state.opinion===v){state.opinion=null;state.opinionTime=0;}
        continue;
      }
      if(near&&(held||carried||Math.hypot(v.vx-byte.vx,v.vy-byte.vy)<450)){
        if(!held&&!carried){h.carried=v;v.inMouth=true;v.onShelf=false;carry(v);api.releaseFoodWeb();if(h.activity?.kind==='food')h.activity=null;state.phase='idle';state.food=null;autonomy.choice=null;state.nextTheft=state.time+35}
        v.contact=(v.contact||0)+dt;
        if(v.contact>.42){v.contact=0;bite(v,t)}
      }else v.contact=0;
      if(held){life.gazeX=v.x;life.gazeY=v.y;life.curious=Math.max(life.curious,.6)}
    }
    if(h.carried?.food)carry(h.carried);
  }
  function hiding(){return api.home().travel||obby.hasLaunched||life.phase!=='awake';}
  function foreground(){
    const h=api.home();if(obby.hasLaunched)return;
    for(const c of state.crumbs){const x=c.x+h.offset(c.room),y=c.y+h.offsetY(c.room);ctx.fillStyle=c.color||'#c89c60';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill()}
    for(const b of state.fizz){ctx.save();ctx.translate(h.offset(b.room),h.offsetY(b.room));ctx.globalAlpha=(1-b.age/1.5)*.8;ctx.strokeStyle='#c6a9d2';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(b.x,b.y,b.r+b.age*2,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff2f3';ctx.fillRect(b.x-1,b.y-2,1.5,1.5);ctx.restore();}
    if(state.meals&&Math.abs(h.offset(5))<world.w){const g=geometry();ctx.save();ctx.translate(h.offset(5),h.offsetY(5));ctx.fillStyle='#ad784755';for(let i=0;i<Math.min(12,state.meals*3);i++){ctx.beginPath();ctx.arc(world.w*.43+Math.sin(i*2.4)*world.w*.16,g.tableY-2+Math.cos(i)*2,1.4,0,Math.PI*2);ctx.fill()}ctx.restore()}
  }
  window.addEventListener('pagehide',()=>{cancel();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();save()}});
  return Object.assign(state,{dreamFood:id=>id==='broccoli'?vegetableFrame:foodFrames[4],deliver,treatFrames,geometry,mouth,resize,beginFrame,drawRoom,drawFood,supportTool,carry,cancel,opportunity,start,update,foreground,save});
};
