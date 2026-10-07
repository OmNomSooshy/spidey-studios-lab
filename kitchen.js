/* Sunburn V: one shelf, three real biscuits, and a thief using the room's existing rope. */
window.createByteKitchen = function(api) {
  const {ctx,world,byte,life,earth,web,obby,autonomy,bathroom}=api;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let history;try{history=JSON.parse(localStorage.getItem('byte-sunburn-kitchen-v1'))}catch(_){}
  const state={phase:'idle',food:null,elapsed:0,time:0,nextTheft:0,chew:0,refusal:0,satisfaction:0,
    opinion:null,opinionTime:0,rejected:0,
    meals:Math.max(0,Number(history?.meals)||0),crumbs:[],width:0,height:0,attempts:0,bites:0};
  const backdrop=document.createElement('canvas');backdrop.id='kitchen-scenery';backdrop.setAttribute('aria-hidden','true');ctx.canvas.before(backdrop);
  const wall=backdrop.getContext('2d',{alpha:false});
  const foodFrames=[];
  let vegetableFrame;
  const here=()=>api.home().room===5&&!api.home().travel&&!obby.hasLaunched;
  function geometry(){const w=world.w,h=world.h;return{shelfX:w*.17,shelfW:w*.48,shelfY:Math.min(h*.36,h-api.roomH()*1.65),tableX:w*.14,tableW:w*.72,tableY:api.floorY()+api.bodyH()*.055+16}}
  function mouth(t=performance.now()){
    const b=api.bodyGeometry(t),curious=b.frame?.src?.endsWith('/curious.png'),moving=byte.mode==='scuttle',plotting=byte.mode==='scheming';
    const lx=(moving?.23:curious?.025:plotting?.055:0)*b.frameW*byte.facing*b.squeezeX,ly=(moving?.105:plotting?.25:curious?.025:.055)*api.bodyH()*b.squeezeY,c=Math.cos(b.angle),s=Math.sin(b.angle);
    return{x:byte.x+lx*c-ly*s,y:byte.y+b.bob+lx*s+ly*c};
  }
  function save(){try{localStorage.setItem('byte-sunburn-kitchen-v1',JSON.stringify({meals:state.meals}))}catch(_){}api.home().save()}
  function box(p,x,y,w,h,r,fill,stroke){p.fillStyle=fill;p.beginPath();p.roundRect(x,y,w,h,r);p.fill();if(stroke){p.strokeStyle=stroke;p.stroke()}}
  function resize(){
    if(state.width===world.w&&state.height===world.h)return;
    cancel();state.width=world.w;state.height=world.h;
    backdrop.width=Math.ceil(world.w*.75);backdrop.height=Math.ceil(world.h*.75);wall.setTransform(.75,0,0,.75,0,0);
    const w=world.w,h=world.h,g=geometry();
    const light=wall.createLinearGradient(0,0,0,h);light.addColorStop(0,'#ead1a8');light.addColorStop(.67,'#f3e6cf');light.addColorStop(1,'#c6aa7f');wall.fillStyle=light;wall.fillRect(0,0,w,h);
    wall.strokeStyle='#bd926a30';wall.lineWidth=1;for(let x=12;x<w;x+=44){wall.beginPath();wall.moveTo(x,0);wall.lineTo(x,h);wall.stroke()}
    box(wall,w*.71,h*.13,w*.20,h*.24,32,'#bdd2ba','#ba9671');wall.strokeStyle='#fff2cf';wall.lineWidth=4;wall.beginPath();wall.moveTo(w*.81,h*.14);wall.lineTo(w*.81,h*.36);wall.moveTo(w*.72,h*.25);wall.lineTo(w*.90,h*.25);wall.stroke();
    // Pantry shelf is too high for an ordinary scuttle. The open tin is genuinely stocked.
    wall.fillStyle='#9d7955';wall.fillRect(g.shelfX,g.shelfY,g.shelfW,12);wall.fillStyle='#ddc09a';wall.fillRect(g.shelfX,g.shelfY,g.shelfW,3);
    wall.strokeStyle='#a78961';wall.lineWidth=5;wall.beginPath();for(const x of [g.shelfX+17,g.shelfX+g.shelfW-17]){wall.moveTo(x,g.shelfY+10);wall.lineTo(x,g.shelfY+35);wall.lineTo(x+15,g.shelfY+10)}wall.stroke();
    box(wall,g.shelfX+8,g.shelfY-15,g.shelfW-16,17,5,'#8ca298','#627b70');wall.strokeStyle='#d8e0bc';wall.lineWidth=2;wall.strokeRect(g.shelfX+13,g.shelfY-10,g.shelfW-26,6);
    box(wall,g.shelfX+9,g.shelfY-62,g.shelfW-18,45,7,'#9aafa0','#718b7e');
    wall.strokeStyle='#d3dbc0';wall.lineWidth=2;wall.strokeRect(g.shelfX+16,g.shelfY-55,g.shelfW-32,29);
    wall.strokeStyle='#ad8860';wall.lineWidth=3;wall.beginPath();wall.moveTo(w*.24,h*.52);wall.lineTo(w*.59,h*.52);wall.stroke();
    for(let i=0;i<3;i++){const x=w*(.29+i*.11);wall.strokeStyle='#9b7f65';wall.lineWidth=2;wall.beginPath();wall.arc(x,h*.53,5,Math.PI,Math.PI*2);wall.lineTo(x+5,h*.59);wall.stroke();wall.fillStyle=i===1?'#7c9384':'#ba9b73';wall.beginPath();wall.ellipse(x,h*.61,i===1?14:7,18,0,0,Math.PI*2);wall.fill()}
    wall.fillStyle='#a68b68';wall.fillRect(0,h-27,w,27);wall.strokeStyle='#795f4138';wall.beginPath();for(let x=-50;x<w;x+=44){wall.moveTo(x,h-26);wall.lineTo(x+30,h)}wall.stroke();
    // A low table puts an offered or fallen biscuit at face height without immobilising Byte.
    wall.fillStyle='#ab7a4e';wall.fillRect(g.tableX+14,g.tableY+9,9,h-g.tableY-21);wall.fillRect(g.tableX+g.tableW-23,g.tableY+9,9,h-g.tableY-21);
    box(wall,g.tableX,g.tableY,g.tableW,12,6,'#c39c69','#9b754a');wall.fillStyle='#ead7af';wall.beginPath();wall.ellipse(w*.48,g.tableY-1,g.tableW*.34,6,0,0,Math.PI*2);wall.fill();wall.strokeStyle='#f2e6ca';wall.lineWidth=2;wall.stroke();
    window.drawBytePassage(wall,w,h,api.roomH(),'left','#b0c0a8');
    if(!foodFrames.length)for(let bites=1;bites<=4;bites++){
      const frame=document.createElement('canvas');frame.width=frame.height=80;
      const p=frame.getContext('2d');p.setTransform(2,0,0,2,40,40);paintFood(p,{r:16,bites});foodFrames[bites]=frame;
    }
    if(!vegetableFrame){
      vegetableFrame=document.createElement('canvas');vegetableFrame.width=vegetableFrame.height=88;
      const p=vegetableFrame.getContext('2d');p.setTransform(2,0,0,2,44,44);
      p.fillStyle='#b8ca7b';p.beginPath();p.moveTo(-6,17);p.lineTo(6,17);p.lineTo(5,0);p.lineTo(12,-8);p.lineTo(-13,-8);p.lineTo(-5,1);p.closePath();p.fill();
      p.strokeStyle='#6d934e';p.lineWidth=1.5;
      for(const [x,y,r] of [[-10,-3,8],[10,-3,8],[0,-9,10]]){const g=p.createRadialGradient(x-3,y-4,1,x,y,r);g.addColorStop(0,'#8cba68');g.addColorStop(1,'#416b45');p.fillStyle=g;p.beginPath();p.arc(x,y,r,0,Math.PI*2);p.fill();p.stroke()}
      p.fillStyle='#b4ca7b';for(let i=0;i<15;i++){p.beginPath();p.arc(Math.sin(i*2.4)*12,-6+Math.cos(i*3.7)*7,1,0,Math.PI*2);p.fill()}
    }
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
  function drawFood(v){const size=(v.r+4)*2;ctx.drawImage(v.vegetable?vegetableFrame:foodFrames[v.bites],-size*.5,-size*.5,size,size)}
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
    state.refusal=state.satisfaction=0;state.opinion=null;state.opinionTime=0;
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
    v.bites--;state.bites++;state.chew=.4;life.reactionBlink=.18;life.curious=1.2;api.voice('pet',.3);api.tactile(.15);
    bathroom.foodMess();const m=mouth(t);for(let i=0;i<5&&state.crumbs.length<24;i++)state.crumbs.push({room:api.home().room,x:m.x,y:m.y,vx:Math.sin(i*2.4)*60,vy:-35-i*8,life:.6+i*.08});
    if(v.bites===0){const h=api.home();if(h.hand?.item===v){h.hand=null;life.pointer.kind='eaten'}if(h.carried===v)h.carried=null;state.meals++;cancel();state.satisfaction=2.1;state.nextTheft=state.time+35;life.curious=2;api.voice('notice',.3)}save();
  }
  function update(dt,t){
    state.time+=dt;state.chew=Math.max(0,state.chew-dt);
    state.refusal=Math.max(0,state.refusal-dt);state.satisfaction=Math.max(0,state.satisfaction-dt);
    if(byte.grabbed||hiding()){state.refusal=state.satisfaction=0;state.opinion=null;state.opinionTime=0;}
    for(const c of state.crumbs){c.life-=dt;c.vy+=800*dt;c.x+=c.vx*dt;c.y+=c.vy*dt}state.crumbs=state.crumbs.filter(c=>c.life>0);
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
      if(v.vegetable){
        v.contact=0;
        if(near&&!byte.grabbed&&!web.active&&!h.carried&&(held||state.opinion===v||v.touch>0)){
          state.satisfaction=0;life.gazeX=v.x;life.gazeY=v.y;life.curious=Math.max(life.curious,.65);
          if(state.opinion!==v){state.opinion=v;state.opinionTime=0;}
          state.opinionTime+=dt;
          if(state.opinionTime>.5&&state.time>=(v.refuseAfter||0)){
            state.refusal=1.45;state.rejected++;v.refuseAfter=state.time+2.8;
            // A real little shove; Fingers still owns a held vegetable, Byte can back away.
            const b=api.bodyGeometry(t),nx=Math.cos(b.angle)*byte.facing,ny=Math.sin(b.angle)*byte.facing;
            if(!held){v.vx+=nx*180;v.vy+=ny*180-65;v.onShelf=false;}
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
    for(const c of state.crumbs){const x=c.x+h.offset(c.room),y=c.y+h.offsetY(c.room);ctx.fillStyle='#c89c60';ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill()}
    if(state.meals&&Math.abs(h.offset(5))<world.w){const g=geometry();ctx.save();ctx.translate(h.offset(5),h.offsetY(5));ctx.fillStyle='#ad784755';for(let i=0;i<Math.min(12,state.meals*3);i++){ctx.beginPath();ctx.arc(world.w*.43+Math.sin(i*2.4)*world.w*.16,g.tableY-2+Math.cos(i)*2,1.4,0,Math.PI*2);ctx.fill()}ctx.restore()}
  }
  window.addEventListener('pagehide',()=>{cancel();save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();save()}});
  return Object.assign(state,{geometry,mouth,resize,beginFrame,drawRoom,drawFood,supportTool,carry,cancel,opportunity,start,update,foreground,save});
};
