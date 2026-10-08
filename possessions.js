/* Sunburn VIII: a chest, a wardrobe, five toy verbs, and a bounded crystal collection.
   Home owns carried/loose bodies. This module supplies intentions and presentation. */
window.createBytePossessions=function(api){
  const {ctx,world,byte,life,earth,web,obby,home,economy,autonomy}=api;
  const key='byte-sunburn-possessions-v1',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let saved;try{saved=JSON.parse(localStorage.getItem(key))}catch(_){}
  const state={act:null,pose:null,cooldown:6,time:0,lid:0,answered:0,invitations:0,retrievals:0,trophyVisits:0,collectionFlash:0,serial:Math.max(0,Number(saved?.serial)||0),effects:[],turn:Math.max(0,Number(saved?.turn)||0)};
  const catalogue=economy.catalogue.filter(v=>v.category==='toy');
  const textures=new Map();for(const item of catalogue){const image=new Image();image.src=item.src;image.onload=()=>{const c=document.createElement('canvas');c.width=128;c.height=80;c.getContext('2d').drawImage(image,0,0,128,80);textures.set(item.id,c)};}
  const wheelTexture=document.createElement('canvas');wheelTexture.width=wheelTexture.height=128;const wheelInk=wheelTexture.getContext('2d');wheelInk.translate(64,64);
  for(const color of ['#b77d6b','#8ba59c','#d9bc77','#8499b2']){wheelInk.fillStyle=color;wheelInk.strokeStyle='#4d6658';wheelInk.lineWidth=2;wheelInk.beginPath();wheelInk.moveTo(0,0);wheelInk.lineTo(-43,-50);wheelInk.lineTo(8,-48);wheelInk.closePath();wheelInk.fill();wheelInk.stroke();wheelInk.rotate(Math.PI/2);}wheelInk.fillStyle='#e4d5ab';wheelInk.beginPath();wheelInk.arc(0,0,7,0,Math.PI*2);wheelInk.fill();
  const drawer=document.createElement('dialog');drawer.id='possession-drawer';drawer.innerHTML='<div class="collection-window"><header><div><p class="shop-eyebrow">UNDER THE LOFT</p><h2>Bob’s toy chest</h2></div><button class="collection-close" aria-label="Close chest">×</button></header><div class="collection-items"></div><p class="collection-note">Out to play. Back in the chest. Always his.</p></div>';document.querySelector('#playground').append(drawer);
  let backdropPress=false;drawer.addEventListener('pointerdown',e=>{backdropPress=e.target===drawer});
  drawer.querySelector('.collection-close').onclick=()=>drawer.close();drawer.addEventListener('click',e=>{if(e.target===drawer&&backdropPress)drawer.close();backdropPress=false});
  const ownedToys=()=>['ball',...catalogue.filter(v=>economy.owned.includes(v.id)).map(v=>v.id)];
  const storable=()=>[...ownedToys(),'sponge',...(home.found?['stone']:[])];
  // Separate footprint from the left passage and the established ladder carry target.
  const chest=()=>({x:world.w*.27,y:world.h-72,w:world.w*.24,h:54});
  const wardrobe=()=>({x:world.w*.76,y:Math.max(world.h*.4,world.h-api.roomH()*1.8),w:world.w*.22,h:api.roomH()*1.55});
  const cabinet=()=>({x:world.w*.18,y:world.h*.47,w:world.w*.27,h:Math.min(world.h*.26,170)});
  function save(){try{localStorage.setItem(key,JSON.stringify({serial:state.serial,turn:state.turn}))}catch(_){}api.save();}
  function loose(){return home.things.filter(v=>v.trophy&&!v.stored)}
  function storedTrophies(){return Math.max(0,economy.trophies-loose().length)}
  function ensureToy(id){let v=home.things.find(v=>v.id===id);if(!v){v={id,toy:true,stored:true,room:2,nx:.64,ny:.9,x:0,y:0,vx:0,vy:0,angle:0,spin:0,touch:0,r:id==='ring-toy'?24:20};home.things.push(v);}return v;}
  for(const id of ownedToys()){const v=ensureToy(id);if(id!=='ball'&&!api.remembered?.things?.some(t=>t.id===id))v.stored=true;}
  function acquired(item){if(item.category==='toy'){ensureToy(item.id);save();}}
  function takeOut(id,byByte=false){if(!storable().includes(id))return null;const v=ensureToy(id);if(!v.stored)return v;v.unseenOrigin=byByte?'byte':'human';const g=chest();Object.assign(v,{stored:false,room:2,x:g.x,y:g.y-20,vx:0,vy:0,angle:0,spin:0});state.lid=1;state.retrievals++;save();return v;}
  function putAway(v){if(!v||(!v.toy&&!['ball','sponge','stone'].includes(v.id))||home.hand?.item===v)return false;if(home.carried===v)api.drop();if(state.act?.item===v)cancel();v.stored=true;v.vx=v.vy=0;save();return true;}
  function withdraw(byByte=false){if(storedTrophies()<=0)return null;const g=cabinet();let id;do{id='fragment-'+(++state.serial)}while(home.things.some(v=>v.id===id));
    const v={id,trophy:true,room:2,x:g.x,y:g.y+g.h*.5-12,nx:.18,ny:.6,vx:0,vy:0,angle:0,spin:0,touch:1,r:13};home.things.push(v);state.collectionFlash=1;save();return v;}
  function deposit(v){if(!v?.trophy||home.hand?.item===v)return false;if(home.carried===v)home.carried=null;if(state.act?.item===v)cancel();home.things.splice(home.things.indexOf(v),1);state.collectionFlash=1;save();return true;}
  function historyChanged(){save()}
  function renderChest(){const list=drawer.querySelector('.collection-items');list.replaceChildren();for(const id of storable()){const v=ensureToy(id),item=catalogue.find(t=>t.id===id),card=document.createElement('article');card.dataset.possession=id;
    const img=document.createElement('img');img.src=item?.src||(v.id==='sponge'?'assets/cosmetics/bath-sponge.svg':v.id==='stone'?'assets/cosmetics/crystal-fragment.svg':'assets/cosmetics/comet-ball.svg');img.alt='';const title=document.createElement('h3');title.textContent=item?.name||({ball:'Old faithful',sponge:'Bath sponge',stone:'First expedition stone'}[id]);const note=document.createElement('p');note.textContent=v.stored?'In the chest':`Out ${['by the nook','in the hall','in the playroom','in the loft','in the bathroom','in the kitchen'][v.room]}`;
    const b=document.createElement('button');b.textContent=v.stored?'Take out':'Put away';b.onclick=()=>{if(v.stored)takeOut(id);else putAway(v);renderChest()};card.append(img,title,note,b);list.append(card);}}
  function hitFixture(x,y){if(obby.hasLaunched||home.travel)return false;
    if(home.things.some(v=>!v.stored&&(!v.food||v.bites>0)&&v.room===home.room&&Math.hypot(x-v.x,y-v.y)<Math.max(28,v.r+9)))return false;
    if(home.room===0){const g=wardrobe();const body=api.extents();if(Math.abs(x-byte.x)<body.x*.9&&Math.abs(y-byte.y)<body.y*.9)return false;if(Math.abs(x-g.x)<g.w*.6&&y>g.y&&y<g.y+g.h){cancel();life.pointer.active=false;economy.openWardrobe();return true;}}
    if(home.room!==2)return false;const c=chest(),g=cabinet();
    // Loose objects win over furniture, so returning a fragment never makes it impossible to grab.
    const body=api.extents();if(Math.abs(x-byte.x)<body.x*.9&&Math.abs(y-byte.y)<body.y*.9)return false;
    if(Math.abs(x-c.x)<c.w*.6&&Math.abs(y-c.y)<c.h*.8){cancel();life.pointer.active=false;renderChest();drawer.showModal();state.lid=1;return true;}
    if(Math.abs(x-g.x)<g.w*.6&&y>g.y-g.h*.55&&y<g.y+g.h*.6){cancel();withdraw();api.voice('notice',.3);return true;}return false;}
  function onGrab(v){if(state.act?.item===v&&state.act.phase==='invite'){state.act.phase='human';state.act.elapsed=0;state.pose=null;}v.pressed=0;v.lastHandX=v.x;v.lastHandY=v.y;}
  function onMove(v,hand){const distance=Math.hypot(v.x-v.lastHandX,v.y-v.lastHandY);if(v.id==='pinwheel')v.wheelSpin=Math.min(40,(v.wheelSpin||0)+distance*.15);
    if(v.id==='rattle'&&distance>4&&(v.rattleAt===undefined||state.time-v.rattleAt>.10)){v.rattleAt=state.time;v.shakes=(v.shakes||0)+1;api.voice('notice',.25);spark(v);home.household?.noise(v,distance/12);}v.lastHandX=v.x;v.lastHandY=v.y;}
  function canAnswer(v){return state.act?.item===v&&['invite','human'].includes(state.act.phase)}
  function answerAt(x,y){return state.act?.phase==='invite'&&Math.hypot(x-state.act.item.x,y-state.act.item.y)<40;}
  function spark(v,color='#e7d5a7'){for(let i=0;i<5&&state.effects.length<24;i++)state.effects.push({x:v.x,y:v.y,room:v.room,vx:Math.sin(i*2.4)*65,vy:-90-Math.cos(i*2.4)*25,age:0,color});}
  function onRelease(v,hand,cancelled){if(cancelled){cancel();return;}
    // A deliberate doorway/hatch release is the established carrying grammar, not a toy throw.
    if(home.journey&&home.carried===v){if(state.act?.item===v){state.answered++;state.act=null;state.pose=null;home.activity=null;state.cooldown=18;}return;}
    if(v.room===2&&storable().includes(v.id)){const c=chest();if(Math.abs(v.x-c.x)<c.w*.5&&Math.abs(v.y-c.y)<c.h*.6){state.lid=1;putAway(v);return;}}
    if(v.trophy&&v.room===2){const g=cabinet();if(Math.abs(v.x-g.x)<g.w*.62&&v.y>g.y-g.h*.55&&v.y<g.y+g.h*.7){deposit(v);return;}}
    if(v.id==='frog-toy'&&v.pressed>.12){v.vy=-Math.min(920,320+v.pressed*430);v.vx=hand.vx*.55;spark(v,'#b8d393');api.voice('land',.55);}
    if(v.id==='pinwheel')v.wheelSpin=clamp((v.wheelSpin||0)+Math.hypot(hand.vx,hand.vy)*.035,0,40);
    if(v.id==='rattle'&&v.shakes>0){api.voice('notice',.45);spark(v);}
    if(state.act?.item===v&&state.act.phase==='human'){state.answered++;state.act.phase=['pinwheel','rattle'].includes(v.id)?'respond':'chase';state.act.elapsed=0;state.pose=null;life.curious=2;api.voice('notice',.65);}
    save();}
  function cancel(){state.pose=null;if(state.act){if(web.food===state.act.item)api.releaseFoodWeb();if(home.carried===state.act.item)api.drop();state.act=null;if(home.activity?.kind==='possession')home.activity=null;byte.targetX=byte.targetY=null;if(byte.mode==='scuttle'||byte.mode==='scheming')byte.mode=earth.enabled?'air':'idle';state.cooldown=18;autonomy.choice=null;autonomy.idleTime=0;}}
  function opportunity(){return state.cooldown<=0&&!earth.enabled&&!obby.hasLaunched&&!home.travel&&!home.journey&&!home.activity&&life.phase==='awake'&&(home.room===2||home.things.some(v=>!v.stored&&v.room===home.room&&(v.toy||v.id==='ball')))&&!home.hand&&!web.active&&!byte.grabbed;}
  function start(){if(!opportunity()&&!(home.room===2&&!home.activity&&!earth.enabled&&state.cooldown<=0))return false;
    const ids=ownedToys().filter(id=>home.room===2||(!ensureToy(id).stored&&ensureToy(id).room===home.room));if(!ids.length)return false;const stored=ids.filter(id=>ensureToy(id).stored);const chooseTrophy=home.room===2&&storedTrophies()>0&&state.turn%5===4;
    const eligible=stored.length?stored:ids.filter(id=>ensureToy(id).room===home.room);if(!chooseTrophy&&!eligible.length)return false;const id=chooseTrophy?null:eligible[state.turn%eligible.length];state.turn++;save();
    state.act={phase:chooseTrophy?'to-cabinet':ensureToy(id).stored?'to-chest':'seek',item:chooseTrophy?null:ensureToy(id),elapsed:0,cycles:0,originX:world.w*.48};home.activity={kind:'possession'};autonomy.choice=null;state.cooldown=35;return true;}
  function bedtime(){const recent=home.details?.recent;if(home.room!==2||recent?.kind!=='toy'||state.act||home.activity||home.hand||web.active||earth.enabled||byte.grabbed)return false;
    const v=home.things.find(v=>v.id===recent.id&&!v.stored&&v.room===2&&(v.toy||v.id==='ball'));
    if(!v||Math.abs(v.y-byte.y)>api.bodyH()*.7||Math.hypot(v.vx,v.vy)>120)return false;
    state.act={phase:'seek',item:v,elapsed:0,cycles:0,bedtime:true};home.activity={kind:'possession'};autonomy.choice=null;return true;}
  function bedArrive(){state.act=null;state.pose=null;home.activity=null;life.sleepmate=home.carried?.id;state.cooldown=35;}
  function seek(x){const ex=api.extents().x,target=clamp(x,ex+4,world.w-ex-4);if(Math.abs(byte.x-target)<14){byte.targetX=byte.targetY=null;if(byte.mode==='scuttle')byte.mode='idle';return true;}
    if(byte.mode==='idle'||byte.mode==='scuttle'){byte.targetX=target;byte.targetY=api.floorY();byte.mode='scuttle';}return false;}
  function invite(act){const v=act.item;v.unseenOrigin='byte';byte.facing=byte.x>world.w*.55?-1:1;api.drop();v.room=home.room;v.vx=byte.facing*95;v.vy=Math.min(0,byte.vy)-40;v.spin=byte.facing*2;
    act.phase='invite';act.elapsed=0;state.invitations++;state.pose='expectant';life.gazeX=v.x;life.gazeY=v.y;save();api.voice('pet',.55);}
  function finish(){state.pose=null;state.act=null;home.activity=null;byte.targetX=byte.targetY=null;autonomy.choice=null;autonomy.idleTime=0;state.cooldown=26;save();}
  function update(dt){state.time+=dt;state.collectionFlash=Math.max(0,state.collectionFlash-dt*2);state.cooldown=Math.max(0,state.cooldown-dt);state.lid=Math.max(0,state.lid-dt*.4);state.pose=null;
    for(const v of home.things){if(v.stored)continue;if(v.id==='frog-toy'&&home.hand?.item!==v)v.pressed=Math.max(0,(v.pressed||0)-dt*3);if(v.id==='pinwheel'){const wind=api.senses.state.open?api.senses.state.breath:0;v.wheelSpin=((v.wheelSpin||0)+wind*dt*100)*Math.exp(-dt*.6);v.wheel=(v.wheel||0)+(v.wheelSpin||0)*dt;}
      if(home.hand?.item===v){if(v.id==='frog-toy')v.pressed=Math.min(1.4,(v.pressed||0)+dt);if(v.id==='rattle'){const dx=v.x-(v.lastHandX||v.x),dy=v.y-(v.lastHandY||v.y);if(Math.hypot(dx,dy)>4&&state.time-(v.rattleAt||0)>.12){v.rattleAt=state.time;v.shakes=(v.shakes||0)+1;api.voice('notice',.25);spark(v);}}
        if(v.id==='pinwheel')v.wheelSpin=Math.min(40,(v.wheelSpin||0)+Math.hypot(v.x-(v.lastHandX||v.x),v.y-(v.lastHandY||v.y))*.15);v.lastHandX=v.x;v.lastHandY=v.y;}}
    for(const e of state.effects){e.age+=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;}state.effects=state.effects.filter(e=>e.age<.6);
    const act=state.act;if(!act)return;
    if(byte.grabbed||web.active&&web.food!==act.item||obby.hasLaunched||life.phase!=='awake'||earth.enabled){cancel();return;}
    if(home.travel||home.journey)return;
    if(!home.activity)home.activity={kind:'possession'};
    act.elapsed+=dt;if(act.elapsed>38){cancel();return;}
    if(act.phase==='to-chest'||act.phase==='to-cabinet'){const x=act.phase==='to-chest'?chest().x-api.bodyW()*.28:cabinet().x;
      if(seek(x)){act.phase=act.phase==='to-chest'?'rummage':'inspect';act.elapsed=0;}return;}
    if(act.phase==='rummage'||act.phase==='inspect'){state.pose='rummaging';state.lid=act.phase==='rummage'?1:0;life.curious=.5;
      if(act.elapsed>1.9){if(act.phase==='inspect'){act.item=withdraw(true);state.trophyVisits++;}else act.item=takeOut(act.item.id,true);
        if(!act.item){finish();return;}home.carried=act.item;act.phase=act.item.trophy?'rock-carry':'present';act.elapsed=0;}return;}
    if(act.phase==='rock-carry'){if(seek(world.w*.42)){home.activity=null;state.act=null;state.cooldown=45;home.request(0,'visit',act.item);}return;}
    if(act.phase==='fetch-thought'){if(act.elapsed>1.15){byte.mode='idle';api.castFoodWeb(act.item);act.phase='fetch-reel';act.elapsed=0;api.voice('web',.6);}return;}
    if(act.phase==='fetch-reel'){const v=act.item;if(v.stored||v.room!==home.room||web.food!==v){cancel();return;}
      web.progress=Math.min(1,act.elapsed/.25);web.reel=web.progress===1?140:0;web.deployedLength=Math.max(18,web.deployedLength-web.reel*dt);
      life.gazeX=v.x;life.gazeY=v.y;
      if(act.elapsed>.35&&Math.hypot(v.x-byte.x,v.y-byte.y)<api.bodyH()*.6){api.releaseFoodWeb();home.carried=v;act.phase='present';act.elapsed=0;act.cycles++;state.fetches=(state.fetches||0)+1;}return;}
    if(act.phase==='seek'||act.phase==='chase'){const v=act.item;if(v.stored||v.room!==home.room){finish();return;}
      // A high throw gives his existing food-retrieval rope a second, very Bob-like purpose.
      if(act.phase==='chase'&&!act.cheated&&['ball','comet-ball','ring-toy'].includes(v.id)&&act.elapsed>.35&&v.y<byte.y-api.bodyH()*.55&&['idle','scuttle'].includes(byte.mode)){
        act.cheated=true;act.phase='fetch-thought';act.elapsed=0;byte.targetX=byte.targetY=null;byte.mode='scheming';return;}
      life.gazeX=v.x;life.gazeY=v.y;const side=v.x<byte.x?-1:1;seek(v.x-side*api.bodyW()*.36);
      if(Math.abs(v.x-byte.x)<api.bodyW()*.58+v.r&&Math.abs(v.y-byte.y)<api.bodyH()*.7&&Math.hypot(v.vx,v.vy)<420&&!home.hand){
        byte.targetX=byte.targetY=null;if(byte.mode==='scuttle')byte.mode='idle';if(v.id==='ring-toy'&&act.phase==='chase'){v.vx=(v.x<world.w*.5?1:-1)*220;v.vy=-35;v.spin=v.vx/v.r;act.phase='invite';act.elapsed=0;state.pose='expectant';state.invitations++;api.voice('pet',.5);}else{home.carried=v;act.phase='present';act.elapsed=0;}act.cycles++;}return;}
    if(act.phase==='bed-trip')return;
    if(act.phase==='present'){if(act.bedtime){act.phase='bed-trip';home.request(0,'rest-buddy',act.item);return;}if(seek(act.originX)){if(act.elapsed>.5)invite(act);}return;}
    if(act.phase==='respond'){state.pose='expectant';const v=act.item;
      if(act.elapsed>.55&&!act.replied){act.replied=true;act.cycles++;if(v.id==='pinwheel'){v.wheelSpin=Math.min(40,(v.wheelSpin||0)+22);spark(v,'#bfd9c5');api.voice('pet',.6);}
        else{api.voice('notice',.6);byte.squash=Math.max(byte.squash,.12);spark(v);}}
      if(act.elapsed>1.4){act.replied=false;act.phase='invite';act.elapsed=0;}return;}
    if(act.phase==='human'){state.pose='expectant';return;}
    if(act.phase==='invite'){state.pose='expectant';const v=act.item;life.gazeX=v.x;life.gazeY=v.y;
      if(act.elapsed>4&&act.elapsed<4+dt){byte.facing=v.x>=byte.x?1:-1;api.voice('notice',.4);}
      if(act.elapsed>18||act.cycles>=3){act.phase='self-play';act.elapsed=0;state.pose=null;}
      return;}
    if(act.phase==='self-play'){const v=act.item;life.curious=1;
      if(v.id==='pinwheel'){v.wheelSpin=25;api.voice('pet',.3);}
      else if(v.id==='frog-toy'){v.pressed=.8;v.vy=-620;spark(v,'#bfd796');}
      else if(v.id==='rattle'){v.vx=-byte.facing*80;v.vy=-260;v.spin=9;spark(v);api.voice('notice',.45);}
      else{v.vx=byte.facing*(v.id==='ring-toy'?230:290);v.vy=v.id==='ring-toy'?-60:-330;v.spin=9;}
      if(act.cycles<2){act.phase='chase';act.elapsed=0;act.cycles++;}else finish();}
  }
  function box(x,y,w,h,r,fill,stroke='#6c6750'){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();}
  function drawFixtures(room,t){
    if(window.ByteWorldArt.ready&&room===0){const g=wardrobe(),a=window.ByteWorldArt;a.shadow(ctx,g.x,g.y+g.h,g.w*1.35,22);a.rect(ctx,'wardrobe',g.x-g.w*.54,g.y,g.w*1.08,g.h);const top=economy.catalogue.find(v=>v.id===economy.gear.top);ctx.fillStyle=top?.color||'#64858b';ctx.fillRect(g.x-g.w*.29,g.y+g.h*.39,g.w*.17,g.h*.14);return;}
    if(room===0){const g=wardrobe();box(g.x-g.w/2,g.y,g.w,g.h,8,'#788d81','#b2bc9d');box(g.x-g.w*.41,g.y+9,g.w*.34,g.h-20,4,'#627b73','#94a799');box(g.x+g.w*.06,g.y+9,g.w*.34,g.h-20,4,'#627b73','#94a799');ctx.fillStyle='#d3c395';ctx.beginPath();ctx.arc(g.x-5,g.y+g.h*.57,3,0,Math.PI*2);ctx.arc(g.x+5,g.y+g.h*.57,3,0,Math.PI*2);ctx.fill();
      const top=economy.catalogue.find(v=>v.id===economy.gear.top);ctx.fillStyle=top?.color||'#64858b';ctx.fillRect(g.x-g.w*.31,g.y+g.h*.36,g.w*.20,g.h*.16);ctx.strokeStyle='#d7c894';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(g.x-g.w*.43,g.y+g.h-8);ctx.lineTo(g.x+g.w*.43,g.y+g.h-8);ctx.stroke();
      ctx.strokeStyle='#c1c6a7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(g.x-14,g.y+g.h*.27);ctx.lineTo(g.x,g.y+g.h*.21);ctx.lineTo(g.x+14,g.y+g.h*.27);ctx.lineTo(g.x-14,g.y+g.h*.27);ctx.stroke();}
    if(room!==2)return;const c=chest();
    if(window.ByteWorldArt.ready){const a=window.ByteWorldArt;a.shadow(ctx,c.x,c.y+c.h*.6,c.w*1.3,22);a.rect(ctx,state.lid>.25?'chest-open':'chest',c.x-c.w*.55,c.y-c.h*.4-(state.lid>.25?42:18),c.w*1.1,c.h+(state.lid>.25?42:18));}
    if(state.lid>.3){const inside=ownedToys().map(id=>home.things.find(v=>v.id===id)).filter(v=>v?.stored).slice(0,3);ctx.save();ctx.globalAlpha=Math.min(1,state.lid);inside.forEach((v,i)=>{const name=v.id==='ball'||v.id==='comet-ball'?'ball':v.id;window.ByteWorldArt.rect(ctx,name,c.x-c.w*.32+i*c.w*.20,c.y-c.h*.44,c.w*.25,c.w*.156)});ctx.restore();}
    const g=cabinet(),n=storedTrophies();window.ByteWorldArt.rect(ctx,'cabinet',g.x-g.w*.55,g.y-g.h*.53,g.w*1.1,g.h*1.1);
    // The stored collection is an authored formation, not one body per trophy. Bounded at 36 facets.
    const front=n>0?(n-1)%5+1:0,count=Math.min(36,Math.max(0,n-front)),cols=5,rows=Math.ceil(count/cols);for(let i=0;i<count;i++){const x=g.x+(i%cols-2)*g.w*.14+Math.sin(i*2.4)*2,y=g.y+g.h*.22-Math.floor(i/cols)*Math.min(15,g.h*.60/Math.max(1,rows));window.ByteWorldArt.rect(ctx,'stone',x-8,y-20-(i%3)*3,16,26+(i%3)*3);}
    for(let i=0;i<front;i++){const x=g.x+(i-2)*g.w*.16,y=g.y+g.h*.39;window.ByteWorldArt.rect(ctx,'stone',x-8,y-17,16,24);if(state.collectionFlash>0){ctx.fillStyle='#e5f9e888';ctx.beginPath();ctx.arc(x,y-4,3,0,Math.PI*2);ctx.fill();}}
    if(n>36){ctx.strokeStyle='#d7efde';ctx.lineWidth=2;const rings=Math.min(6,Math.floor(Math.log2(n/36+1)));for(let i=0;i<rings;i++){ctx.beginPath();ctx.arc(g.x,g.y-g.h*.22,10+i*4,Math.PI,Math.PI*2);ctx.stroke();}}
    ctx.strokeStyle='#e9f4db66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(g.x+g.w*.26,g.y-g.h*.35);ctx.lineTo(g.x+g.w*.35,g.y-g.h*.03);ctx.moveTo(g.x+g.w*.15,g.y-g.h*.35);ctx.lineTo(g.x+g.w*.21,g.y-g.h*.17);ctx.stroke();
    ctx.fillStyle='#bcd1bd';ctx.fillRect(g.x-g.w*.59,g.y+g.h*.53,g.w*1.18,8);ctx.strokeStyle='#d1e6ce';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.x,g.y+g.h*.49,7,Math.PI,0);ctx.stroke();}
  function drawToy(v){
    const name=v.id==='comet-ball'?'ball':v.id;
    if(window.ByteWorldArt.ready&&['ball','pinwheel','rattle','ring-toy','frog-toy'].includes(name)&&v.id!=='ball'){ctx.save();ctx.translate(v.x,v.y);ctx.rotate(v.angle||0);if(name==='pinwheel'){ctx.strokeStyle='#9b805e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,29);ctx.stroke();ctx.rotate(v.wheel||0);window.ByteWorldArt.item(ctx,name,v.r*2.2,v.r*2.2);}else{if(name==='frog-toy')ctx.scale(1+(v.pressed||0)*.22,1-(v.pressed||0)*.3);window.ByteWorldArt.item(ctx,name,v.r*3,v.r*1.875);}ctx.restore();return true;}
    const texture=textures.get(v.id);if(!texture)return false;ctx.save();ctx.translate(v.x,v.y);ctx.rotate(v.angle||0);
    if(v.id==='pinwheel'){ctx.strokeStyle='#9b805e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,29);ctx.stroke();ctx.rotate(v.wheel||0);ctx.drawImage(wheelTexture,-v.r*1.1,-v.r*1.1,v.r*2.2,v.r*2.2);}
    else{if(v.id==='frog-toy')ctx.scale(1+(v.pressed||0)*.22,1-(v.pressed||0)*.3);ctx.drawImage(texture,-v.r*1.5,-v.r*.94,v.r*3,v.r*1.875);}ctx.restore();return true;}
  function drawEffects(){for(const e of state.effects){if(e.room!==home.room||obby.hasLaunched)continue;ctx.globalAlpha=1-e.age/.6;ctx.fillStyle=e.color;ctx.fillRect(e.x-1,e.y-1,3,3);}ctx.globalAlpha=1;}
  window.addEventListener('pagehide',save);
  return Object.assign(state,{chest,wardrobe,cabinet,ownedToys,storedTrophies,loose,acquired,takeOut,putAway,withdraw,deposit,historyChanged,hitFixture,onGrab,onMove,onRelease,answerAt,canAnswer,cancel,opportunity,start,bedtime,bedArrive,update,drawFixtures,drawToy,drawEffects,save,drawer});
};
