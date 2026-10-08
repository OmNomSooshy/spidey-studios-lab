/* IX: presentation of existing life. No decision, force, need, or interaction authority. */
window.createByteLifeDetails=function(api){
 const {ctx,world,byte,life,home,bathroom,kitchen,economy,obby,earth,web}=api;
 let remembered;try{remembered=JSON.parse(localStorage.getItem('byte-little-moments-v1'))}catch(_){}
 const state={recent:remembered?.recent||{kind:'food',id:'biscuit'},age:0,dream:null,dreamAge:0,proud:0,proudUntil:0,fresh:0,footprints:[],lastFootX:null,lastRoom:home.room,width:0,height:0};
 const previous={bites:kitchen.bites,rejected:kitchen.rejected,washed:bathroom.washed,clean:bathroom.patches.every(p=>p.dirt<.08),shake:bathroom.shake,invitations:home.possessions.invitations,answered:home.possessions.answered,trophies:economy.trophies,gear:JSON.stringify(economy.gear)};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const cloud=document.createElement('canvas');cloud.width=256;cloud.height=160;const ink=cloud.getContext('2d');
 ink.fillStyle='#fff8e8';ink.strokeStyle='#baad8c';ink.lineWidth=3;ink.beginPath();ink.moveTo(38,131);ink.bezierCurveTo(4,136,1,96,26,85);ink.bezierCurveTo(5,59,39,34,65,44);ink.bezierCurveTo(61,7,113,-1,131,27);ink.bezierCurveTo(150,1,192,14,192,42);ink.bezierCurveTo(235,26,260,63,239,88);ink.bezierCurveTo(270,127,220,155,192,139);ink.bezierCurveTo(163,161,114,153,96,143);ink.bezierCurveTo(72,159,46,153,38,131);ink.closePath();ink.fill();ink.stroke();
 const little=document.createElement('canvas');little.width=little.height=80;const p=little.getContext('2d');p.fillStyle='#d9a75b';p.strokeStyle='#b07c45';p.lineWidth=3;p.beginPath();p.arc(40,40,29,0,Math.PI*2);p.fill();p.stroke();p.fillStyle='#b96655';p.beginPath();p.arc(40,40,10,0,Math.PI*2);p.fill();for(let i=0;i<8;i++){p.fillStyle='#efcb87';p.beginPath();p.arc(40+Math.sin(i*Math.PI/4)*20,40+Math.cos(i*Math.PI/4)*20,2,0,Math.PI*2);p.fill();}
 const drawings=new Map();
 function note(kind,id){state.recent={kind,id};try{localStorage.setItem('byte-little-moments-v1',JSON.stringify({recent:state.recent}))}catch(_){} }
 function selectDream(){const r=state.recent;const choices=[r];const owned=economy.catalogue.filter(v=>v.category==='toy'&&economy.owned.includes(v.id));if(owned.length)choices.push({kind:'toy',id:owned[(home.possessions.turn||0)%owned.length].id});if(economy.trophies||home.found)choices.push({kind:'crystal',id:'crystal-fragment'});if(bathroom.washed)choices.push({kind:'care',id:'bath-sponge'});return choices[Math.floor(state.dreamAge/8)%choices.length]||r;}
 function boast(duration){state.proud=duration;state.proudUntil=state.age+8;}
 function update(dt){
  if(state.width!==world.w||state.height!==world.h){state.footprints=[];state.lastFootX=null;state.width=world.w;state.height=world.h;}
  const modal=!!document.querySelector('dialog[open]');state.age+=dt;state.proud=state.age>state.proudUntil?0:Math.max(0,state.proud-(modal||byte.mode!=='idle'?0:dt));state.fresh=Math.max(0,state.fresh-(modal?0:dt));
  if(kitchen.rejected!==previous.rejected){note('food','broccoli');previous.rejected=kitchen.rejected;}
  if(kitchen.bites!==previous.bites){note('food',kitchen.lastFood||'biscuit');previous.bites=kitchen.bites;}
  const clean=bathroom.patches.every(p=>p.dirt<.08);if(clean&&!previous.clean){note('care','bath-sponge');state.fresh=3.2;}previous.washed=bathroom.washed;previous.clean=clean;
  if(previous.shake>0&&bathroom.shake<=0&&clean)state.fresh=1.8;previous.shake=bathroom.shake;
  if(home.possessions.invitations!==previous.invitations){const a=home.possessions.act;note('toy',a?.item?.id||'ball');if(home.possessions.answered>0)boast(.9);previous.invitations=home.possessions.invitations;}
  if(economy.trophies!==previous.trophies){note('crystal','crystal-fragment');boast(3);previous.trophies=economy.trophies;}
  const gear=JSON.stringify(economy.gear);if(gear!==previous.gear){boast(2);previous.gear=gear;}
  if(byte.grabbed||web.active||home.travel||obby.hasLaunched||life.phase!=='awake'){state.proud=state.fresh=0;}
  if(life.phase==='sleep'&&!byte.grabbed&&!home.travel&&!obby.hasLaunched){state.dreamAge+=dt;state.dream=state.dreamAge>1.5?selectDream():null;}else{state.dreamAge=0;state.dream=null;}
  for(const f of state.footprints)f.age+=dt;state.footprints=state.footprints.filter(f=>f.age<24);
  if(home.room!==state.lastRoom){state.lastRoom=home.room;state.lastFootX=null;}
  if(!earth.enabled&&!obby.hasLaunched&&!home.travel&&bathroom.wet>.2&&byte.mode==='scuttle'&&Math.abs(byte.y-api.floorY())<12){if(state.lastFootX===null||Math.abs(byte.x-state.lastFootX)>26){state.lastFootX=byte.x;state.footprints.push({x:byte.x,y:world.h-24,room:home.room,age:0,wet:bathroom.wet});if(state.footprints.length>16)state.footprints.shift();}}
 }
 function texture(id){if(id==='ball')id='comet-ball';if(id==='biscuit')return little;if(id==='broccoli')return kitchen.dreamFood(id);return economy.catalogue.find(v=>v.id===id)?.texture||drawings.get(id);}
 for(const id of ['bath-sponge','crystal-fragment']){const img=new Image();img.src='assets/cosmetics/'+id+'.svg';img.onload=()=>{const c=document.createElement('canvas');c.width=128;c.height=80;c.getContext('2d').drawImage(img,0,0,128,80);drawings.set(id,c);};}
 function icon(id,x,y,size){const t=texture(id);if(!t)return;const ratio=t.width/t.height;ctx.drawImage(t,x-size*.5,y-size/ratio*.5,size,size/ratio);}
 function drawDream(t){if(!state.dream||life.phase!=='sleep')return;const w=Math.min(128,world.w*.34),h=w*.625,x=clamp(byte.x+api.bodyW()*.40,w*.5+8,world.w-w*.5-8),y=clamp(byte.y-api.bodyH()*.63-h*.5,60,world.h-h-20),a=Math.min(1,(state.dreamAge-1.5)*1.5);
  ctx.save();ctx.translate(home.offset(),home.offsetY());ctx.globalAlpha=a*.94;ctx.fillStyle='#fff8e8';ctx.strokeStyle='#baad8c';ctx.lineWidth=1;for(const [r,k]of [[3,.17],[5,.39]]){ctx.beginPath();ctx.arc(byte.x+(x-byte.x)*k,byte.y-api.bodyH()*.28+(y-byte.y+api.bodyH()*.28)*k,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.translate(x,y+Math.sin(t*.0018)*2);ctx.drawImage(cloud,-w/2,-h/2,w,h);const d=state.dream,u=state.dreamAge;
  if(d.kind==='toy'){icon(d.id,-w*.12,Math.sin(u*2)*h*.11,w*.58);if(economy.gear.head)icon(economy.gear.head,w*.22,-h*.17,w*.38);}
  else if(d.kind==='care'){icon('bath-sponge',0,8,w*.56);ctx.strokeStyle='#91bcb6';for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(Math.sin(i*2.4+u*.3)*w*.28,-h*.12+Math.cos(i*3.3+u*.5)*h*.20,3+i,0,Math.PI*2);ctx.stroke();}}
  else if(d.kind==='crystal'){for(let i=0;i<3;i++)icon('crystal-fragment',(i-1)*w*.22,Math.sin(u+i)*3,w*.43);ctx.strokeStyle='#7aa9a7';ctx.beginPath();ctx.moveTo(-w*.3,h*.28);ctx.lineTo(0,h*.08);ctx.lineTo(w*.29,h*.28);ctx.stroke();}
  else{icon(d.id,d.id==='broccoli'?-w*.12:0,Math.sin(u*1.2)*2,w*.63);if(d.id==='broccoli'){icon('biscuit',w*.26,h*.14,w*.25);}if(d.id==='sour-moon'){icon('biscuit',w*.28,h*.18,w*.24);}else if(d.id==='fizz-berry'){ctx.strokeStyle='#bd9bbc';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc((i-1)*w*.23,-h*.23+Math.sin(u+i)*2,3,0,Math.PI*2);ctx.stroke();}}}
  ctx.restore();
 }
 function foreground(t){if(obby.hasLaunched)return;for(const f of state.footprints){if(Math.abs(home.offset(f.room))>world.w)continue;ctx.save();ctx.translate(home.offset(f.room)+f.x,home.offsetY(f.room)+f.y);ctx.globalAlpha=Math.min(.25,f.wet*.2)*(1-f.age/24);ctx.fillStyle='#679b9c';for(const dx of [-7,7]){ctx.beginPath();ctx.ellipse(dx,0,3,6,dx>0?.3:-.3,0,Math.PI*2);ctx.fill();}ctx.restore();}drawDream(t);}
 function paintDecor(p,room){const w=world.w,h=world.h;p.save();p.lineCap='round';
  if(window.ByteWorldArt?.ready){const a=window.ByteWorldArt;if(room===2||room===3){const x=room===2?w*.20:w*.23,y=room===2?h*.20:h*.26,ww=Math.min(102,w*.27);p.translate(x,y);p.rotate(room===2?-.07:.04);a.rect(p,'picture',-ww*.5,-38,ww,76);}if(room===4||room===5){const x=room===4?w*.83:w*.46,y=room===4?h*.46:h*.68,ww=Math.min(48,w*.14);a.rect(p,'towel',x-ww/2,y+3,ww,room===4?70:56);}p.restore();return;}
  if(room===0){p.strokeStyle='#d5bd7b66';p.lineWidth=1.3;const x=w*.34,y=api.floorY()-api.roomH()*1.12;p.beginPath();p.arc(x-24,y-42,10,.7,5.1);p.stroke();for(let i=0;i<5;i++){p.fillStyle='#d5cfab80';p.beginPath();p.arc(x+Math.sin(i*2.5)*w*.14,y-12-i*8,1.2,0,Math.PI*2);p.fill();}}
  if(room===2||room===3){const x=room===2?w*.20:w*.23,y=room===2?h*.20:h*.26,ww=Math.min(102,w*.27),hh=76;p.translate(x,y);p.rotate(room===2?-.07:.04);p.fillStyle=room===2?'#d8d8ba':'#e3d8b7';p.strokeStyle='#a79977';p.lineWidth=1;p.fillRect(-ww*.5,-hh*.5,ww,hh);p.strokeRect(-ww*.5,-hh*.5,ww,hh);p.fillStyle='#a88b58';p.fillRect(-8,-hh*.5-3,16,6);p.strokeStyle=room===2?'#738b78':'#7aadae';p.lineWidth=2;p.beginPath();if(room===2){p.arc(-ww*.12,5,16,0,Math.PI*2);p.moveTo(-ww*.12-15,0);p.quadraticCurveTo(0,-22,ww*.21,9);p.moveTo(-ww*.12-14,13);p.quadraticCurveTo(2,-7,ww*.2,11);}else{p.moveTo(-24,22);p.lineTo(-19,-5);p.lineTo(-5,-27);p.lineTo(5,-3);p.lineTo(20,-18);p.lineTo(26,22);p.closePath();p.moveTo(-5,-27);p.lineTo(-3,22);p.lineTo(20,-18);}p.stroke();}
  if(room===4||room===5){const x=room===4?w*.83:w*.46,y=room===4?h*.46:h*.68,ww=Math.min(48,w*.14),hh=room===4?70:56;p.strokeStyle='#aa936c';p.lineWidth=2;p.beginPath();p.arc(x,y-4,6,Math.PI,0);p.lineTo(x+6,y+4);p.stroke();p.fillStyle=room===4?'#a7bcb2':'#c9b4a0';p.beginPath();p.roundRect(x-ww/2,y+3,ww,hh,4);p.fill();p.strokeStyle=room===4?'#d5e4d4':'#e4d1b0';p.lineWidth=2;p.beginPath();p.moveTo(x-ww/2+4,y+hh-6);p.lineTo(x+ww/2-4,y+hh-6);p.stroke();p.lineWidth=1;p.setLineDash([2,3]);p.beginPath();p.moveTo(x-ww/2+7,y+10);p.lineTo(x-ww/2+7,y+hh-10);p.stroke();}
  p.restore();
 }
 // Decorations are tiny cached layers. World geometry and transition/storage footprints stay untouched.
 const decor=new Map();
 function roomDecoration(room){
  if(room!==0&&room!==2&&room!==3)return;
  const key=room+':'+world.w+':'+world.h;let v=decor.get(key);
  if(!v){
   const full=document.createElement('canvas');full.width=Math.ceil(world.w*.5);full.height=Math.ceil(world.h*.5);
   const p=full.getContext('2d');p.scale(.5,.5);paintDecor(p,room);
   // Crop once: a tiny drawing must not blend an entire phone-sized transparent bitmap every frame.
   const pixels=p.getImageData(0,0,full.width,full.height).data;let x0=full.width,y0=full.height,x1=-1,y1=-1;
   for(let y=0;y<full.height;y++)for(let x=0;x<full.width;x++)if(pixels[(y*full.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
   if(x1<0)return;
   x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(full.width-1,x1+2);y1=Math.min(full.height-1,y1+2);
   const canvas=document.createElement('canvas');canvas.width=x1-x0+1;canvas.height=y1-y0+1;
   canvas.getContext('2d').drawImage(full,x0,y0,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
   const sx=world.w/full.width,sy=world.h/full.height;v={canvas,x:x0*sx,y:y0*sy,w:canvas.width*sx,h:canvas.height*sy};
   decor.set(key,v);if(decor.size>3)decor.delete(decor.keys().next().value);
  }
  ctx.drawImage(v.canvas,v.x,v.y,v.w,v.h);
 }

 return Object.assign(state,{update,foreground,paintDecor,roomDecoration,note,selectDream,decor});
};
