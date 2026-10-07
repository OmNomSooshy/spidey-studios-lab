/* The renewable expedition ledger and stocked, layered wardrobe. Never a physics controller. */
window.createByteEconomy = function(api) {
  const {ctx,world,byte,obby,life}=api,key='byte-sunburn-crystals-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(key))}catch(_){}
  const integer=v=>Number.isSafeInteger(v)&&v>=0?v:0;
  const catalogue=window.byteTreasures;
  const state={balance:integer(saved?.balance),owned:catalogue.filter(v=>saved?.owned?.includes(v.id)).map(v=>v.id),equipped:null,
    runs:integer(saved?.runs),trophies:integer(saved?.trophies),active:false,collected:0,seed:0,pickups:[],sparks:[],rng:1,lastX:0,lastY:0};
  state.gear={...saved?.gear};
  if(state.owned.includes(saved?.equipped)){state.equipped=saved.equipped;if(!state.gear.head)state.gear.head=saved.equipped;}
  for(const cat of Object.keys(state.gear))if(!catalogue.some(v=>v.id===state.gear[cat]&&v.category===cat&&state.owned.includes(v.id)))delete state.gear[cat];
  state.equipped=state.gear.head||null;
  // Reload returns the creature home. Earned money was already banked; pending fragments survive too.
  if(saved?.active)state.trophies+=Math.floor(integer(saved.collected)/5);
  const wallet=document.querySelector('#crystal-wallet'),balance=document.querySelector('#crystal-balance'),dots=document.querySelector('#run-crystals');
  const shop=document.querySelector('#crystal-shop'),list=document.querySelector('#shop-items'),shopBalance=document.querySelector('#shop-balance');
  const status=document.querySelector('#shop-status'),preview=document.querySelector('#wardrobe-preview'),ink=preview.getContext('2d');
  const idle=new Image();idle.src='assets/hq/idle.png';idle.onload=drawPreview;
  for(const item of catalogue){item.image=new Image();item.image.src=item.src;item.image.onload=()=>{item.texture=document.createElement('canvas');item.texture.width=256;item.texture.height=160;item.texture.getContext('2d').drawImage(item.image,0,0,256,160);bodyCache.clear();drawPreview();};}
  let showing=state.equipped||catalogue[0].id,toastTimer=0,view='shop',category='head';
  const tabs=document.querySelector('#treasure-tabs'),title=document.querySelector('#shop-title'),eyebrow=document.querySelector('.shop-eyebrow');
  const topCache=new Map(),bodyCache=new Map();
  const gemTexture=document.createElement('canvas');gemTexture.width=56;gemTexture.height=76;const gemInk=gemTexture.getContext('2d');gemInk.setTransform(2,0,0,2,28,32);gem(gemInk,0,0,13);
  function save(){try{localStorage.setItem(key,JSON.stringify({balance:state.balance,owned:state.owned,equipped:state.gear.head||null,gear:state.gear,runs:state.runs,trophies:state.trophies,active:state.active,collected:state.collected,seed:state.seed}))}catch(_){} }
  function sync(){wallet.disabled=state.active;balance.textContent=shopBalance.textContent=String(state.balance);wallet.setAttribute('aria-label',`${state.balance} crystals. Open Little Treasures`);dots.hidden=!state.active;
    dots.textContent=Array.from({length:5},(_,i)=>i<state.collected%5?'●':'○').join('');}
  function flash(message){wallet.classList.remove('earned');void wallet.offsetWidth;wallet.classList.add('earned');wallet.dataset.receipt=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>wallet.classList.remove('earned'),950);}
  function random(){let x=state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng/4294967296;}
  function begin(){if(state.active)finish();state.runs++;const entropy=new Uint32Array(1);crypto.getRandomValues(entropy);state.seed=(entropy[0]^Math.imul(state.runs,2654435761))>>>0||1;state.rng=state.seed;
    state.active=true;state.collected=0;state.pickups=[];state.sparks=[];state.lastX=byte.x;state.lastY=byte.y;save();sync();}
  function platform(p){if(!state.active)return;const x=p.x+p.w*(.3+random()*.4),y=p.y-api.bodyH()*.55;
    state.pickups.push({x,y,r:13,id:state.pickups.length,phase:random()*Math.PI*2});}
  function finish(){if(!state.active)return;const n=Math.floor(state.collected/5);state.trophies+=n;state.active=false;state.pickups=[];state.sparks=[];save();sync();api.home()?.ensureTrophies();if(n)flash(n===1?'Fragment home':'Fragments home');}
  function update(dt){
    for(const s of state.sparks){s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;}state.sparks=state.sparks.filter(s=>s.age<.5);
    if(!state.active||!obby.hasLaunched)return;
    const dx=byte.x-state.lastX,dy=byte.y-state.lastY,l2=dx*dx+dy*dy;
    if(obby.seeded&&!byte.grabbed){const reach=api.bodyW()*.23+13;
      for(const p of state.pickups){if(p.taken)continue;const u=l2?Math.max(0,Math.min(1,((p.x-state.lastX)*dx+(p.y-state.lastY)*dy)/l2)):0;
        if(Math.hypot(p.x-(state.lastX+u*dx),p.y-(state.lastY+u*dy))>reach)continue;
        p.taken=true;state.collected++;state.balance++;save();sync();flash(state.collected%5===0?'+1 · fragment earned':'+1');api.voice('pet',.25);api.tactile(.18);
        for(let i=0;i<5&&state.sparks.length<30;i++)state.sparks.push({x:p.x,y:p.y,vx:Math.sin(i*2.4)*65,vy:Math.cos(i*2.4)*65,age:0});
      }
    }
    state.lastX=byte.x;state.lastY=byte.y;
    state.pickups=state.pickups.filter(p=>p.y<obby.cameraY+world.h*1.8);
  }
  function gem(p,x,y,r){p.save();p.translate(x,y);p.fillStyle='#3c839599';p.beginPath();p.ellipse(0,r+3,r*.65,3,0,0,Math.PI*2);p.fill();
    p.fillStyle='#a7e5e6';p.strokeStyle='#468995';p.lineWidth=1.3;p.beginPath();p.moveTo(0,-r);p.lineTo(r*.7,-r*.3);p.lineTo(r*.55,r*.45);p.lineTo(0,r);p.lineTo(-r*.65,r*.35);p.lineTo(-r*.7,-r*.3);p.closePath();p.fill();p.stroke();
    p.fillStyle='#ecfff4';p.beginPath();p.moveTo(0,-r);p.lineTo(-r*.7,-r*.3);p.lineTo(0,r*.1);p.closePath();p.fill();
    p.strokeStyle='#d8faf0';p.beginPath();p.moveTo(0,-r);p.lineTo(0,r*.1);p.lineTo(r*.7,-r*.3);p.moveTo(0,r*.1);p.lineTo(0,r);p.stroke();p.restore();}
  function draw(t){if(!state.active)return;for(const p of state.pickups){const y=p.y-obby.cameraY;if(p.taken||y< -30||y>world.h+30)continue;
    const glint=(Math.sin(t*.003+p.phase)+1)*.5;ctx.drawImage(gemTexture,p.x-14,y-16,28,38);if(glint>.88){ctx.strokeStyle='#effff4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x+11,y-13);ctx.lineTo(p.x+19,y-13);ctx.moveTo(p.x+15,y-17);ctx.lineTo(p.x+15,y-9);ctx.stroke();}}
    for(const s of state.sparks){ctx.globalAlpha=1-s.age/.5;ctx.fillStyle='#e9fff1';ctx.fillRect(s.x-1,s.y-obby.cameraY-1,2,2);}ctx.globalAlpha=1;}
  function nameOf(frame){return frame?.src?.split('/').pop()||'idle.png';}
  function headFrame(frame,w,h){const n=nameOf(frame),side=n.startsWith('scuttle-'),low=n==='asleep.png';
    return {x:(side?.075:.015)*w,hatY:({'asleep.png':-.245,'drowsy.png':-.365,'scheming.png':-.285,'rummaging.png':-.30,'refusal.png':-.365,'satisfied.png':-.375}[n]??-.405)*h,
      eyeY:({'asleep.png':.065,'scheming.png':.075,'rummaging.png':.06,'drowsy.png':.005,'refusal.png':-.015,'satisfied.png':-.03}[n]??-.04)*h,side,low};}
  function topTexture(item,frame){if(!frame?.naturalWidth)return null;const key=item.id+nameOf(frame);if(topCache.has(key))return topCache.get(key);
    const c=document.createElement('canvas');c.width=128;c.height=158;const p=c.getContext('2d',{willReadFrequently:true});p.drawImage(frame,0,0,128,158);
    const pixels=p.getImageData(0,0,128,158),rgb=item.color.match(/\w\w/g).map(v=>parseInt(v,16));
    for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,r=d[i],g=d[i+1],b=d[i+2],x=(i/4)%128,y=Math.floor(i/4/128);
      if(b>r*1.45&&b>g*1.15&&b>45&&d[i+3]){const light=Math.min(1.25,Math.max(.26,(r+g+b)/285));let accent=false;
        if(item.pattern==='stripe')accent=y%12<4;
        if(item.pattern==='stars')accent=((x%27-13)**2+(y%25-12)**2)<5;
        if(item.pattern==='patch')accent=(x<62&&y>102&&y<119)||(x>75&&y>111&&y<129);
        if(item.pattern==='diamond')accent=Math.abs((x%24)-12)+Math.abs((y%26)-13)>17;
        if(item.pattern==='bee')accent=y%20<8;
        if(item.pattern==='pocket')accent=x>51&&x<76&&y>109&&y<126;
        if(item.pattern==='bones')accent=y>108&&y<124&&Math.abs(Math.abs(x-64)-Math.abs(y-116)*2)<2;
        if(item.pattern==='buttons')accent=(x-64)**2+((y-105)%12)**2<7;
        const col=accent?(item.pattern==='bee'?[48,55,45]:[230,224,190]):rgb;for(let k=0;k<3;k++)d[i+k]=Math.min(255,col[k]*light);
      }else d[i+3]=0;
    }p.putImageData(pixels,0,0);topCache.set(key,c);if(topCache.size>32)topCache.delete(topCache.keys().next().value);return c;}
  const eyeCenters={'idle.png':[[76,124],[134,127]],'curious.png':[[80,133],[136,116]],'drowsy.png':[[80,153],[128,162]],'waking.png':[[77,140],[127,146]],'refusal.png':[[64,143],[130,154]],'expectant.png':[[72,133],[130,138]],'scheming.png':[[82,183],[138,192]],'rummaging.png':[[75,180],[125,181]],'scuttle-0.png':[[134,144],[177,142]],'scuttle-1.png':[[119,143],[161,141]],'scuttle-2.png':[[130,141],[172,138]],'scuttle-3.png':[[138,144],[178,141]]};
  function contactTexture(item,frame){if(!frame?.naturalWidth)return null;const key=item.id+nameOf(frame);if(topCache.has(key))return topCache.get(key);
    const c=document.createElement('canvas');c.width=128;c.height=158;const p=c.getContext('2d',{willReadFrequently:true});p.drawImage(frame,0,0,128,158);const pixels=p.getImageData(0,0,128,158),rgb=item.color.match(/\w\w/g).map(v=>parseInt(v,16));
    const eyes=eyeCenters[nameOf(frame)]||[];
    for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,r=d[i],g=d[i+1],b=d[i+2],x=(i/4)%128*214/128,y=Math.floor(i/4/128)*264/158;
      if(eyes.some(([ex,ey])=>Math.hypot(x-ex,y-ey)<21)&&r>g*1.12&&g>b*1.6&&r>75&&g>25&&d[i+3]){const light=Math.min(1.3,Math.max(.23,(r+g+b)/310));for(let k=0;k<3;k++)d[i+k]=Math.min(255,rgb[k]*light);}else d[i+3]=0;
    }p.putImageData(pixels,0,0);topCache.set(key,c);if(topCache.size>32)topCache.delete(topCache.keys().next().value);return c;}
  function drawWearables(p,w,h,frame,gear=state.gear,bodyLayers=true){const hf=headFrame(frame,w,h),top=catalogue.find(v=>v.id===gear.top);if(top&&bodyLayers){const texture=topTexture(top,frame);if(texture)p.drawImage(texture,-w/2,-h/2,w,h);}
    const contacts=catalogue.find(v=>v.id===gear.contacts);if(contacts&&bodyLayers){const texture=contactTexture(contacts,frame);if(texture)p.drawImage(texture,-w/2,-h/2,w,h);}
    for(const cat of ['accessory','head','eyes']){const item=catalogue.find(v=>v.id===gear[cat]);if(!item?.texture)continue;
      let x=hf.x,y=hf.hatY,width=w*(hf.low?.52:.57),height=width*.625;
      if(cat==='eyes'){const eyes=eyeCenters[nameOf(frame)];if(!eyes)continue;const [[lx,ly],[rx,ry]]=eyes;const ex=((lx+rx)*.5/214-.5)*w,ey=((ly+ry)*.5/264-.5)*h,dx=(rx-lx)/214*w,dy=(ry-ly)/264*h;const width=Math.hypot(dx,dy)*128/60;
        p.save();p.translate(ex,ey);p.rotate(Math.atan2(dy,dx));p.drawImage(item.texture,-width/2,-width*43/128,width,width*.625);p.restore();continue;}
      if(cat==='accessory'){width=w*.46;height=width*.625;x=w*.02;y=h*.055;if(hf.low)y=h*.17;}
      p.drawImage(item.texture,x-width*.5,y,width,height);
    }
  }
  function drawHat(p,w,h,frame,id){if(id!==undefined)drawWearables(p,w,h,frame,{head:id});else drawWearables(p,w,h,frame,state.gear,false);}
  function bodyPresentation(frame){if(!Object.values(state.gear).some(Boolean))return frame;const key=nameOf(frame)+':'+['head','eyes','contacts','top','accessory'].map(cat=>state.gear[cat]||'').join(':');if(bodyCache.has(key))return bodyCache.get(key);
    const c=document.createElement('canvas');c.width=214;c.height=264;const p=c.getContext('2d');p.drawImage(frame,0,0,214,264);p.save();p.translate(107,132);drawWearables(p,214,264,frame);p.restore();
    bodyCache.set(key,c);if(bodyCache.size>16)bodyCache.delete(bodyCache.keys().next().value);return c;}
  function drawPreview(){ink.clearRect(0,0,240,250);if(!idle.complete||!idle.naturalWidth)return;ink.save();ink.translate(120,131);ink.drawImage(idle,-91,-112,182,224);
    const gear={...state.gear},item=catalogue.find(v=>v.id===showing);if(item&&item.category!=='toy')gear[item.category]=item.id;
    drawWearables(ink,182,224,idle,gear);ink.restore();if(item?.category==='toy'&&item.texture)ink.drawImage(item.texture,155,172,75,47);}
  function equip(id){const item=catalogue.find(v=>v.id===id);if(!item||item.category==='toy'||!state.owned.includes(id))return false;
    if(state.gear[item.category]===id)delete state.gear[item.category];else state.gear[item.category]=id;state.equipped=state.gear.head||null;save();return true;}
  function renderShop(){sync();title.textContent=view==='wardrobe'?'Byte’s wardrobe':'Little treasures';eyebrow.textContent=view==='wardrobe'?'BESIDE THE NOOK':'SMALL THINGS. BIG PERSONALITY.';
    tabs.replaceChildren();const names={head:'Headwear',eyes:'Eyewear',contacts:'Eyes',top:'Clothes',accessory:'Extras',toy:'Toys'};
    for(const [cat,label]of Object.entries(names)){if(view==='wardrobe'&&cat==='toy')continue;const b=document.createElement('button');b.type='button';b.textContent=label;b.classList.toggle('selected',cat===category);b.onclick=()=>{category=cat;renderShop()};tabs.append(b);}
    if(catalogue.find(v=>v.id===showing)?.category!==category)showing=state.gear[category]||catalogue.find(v=>v.category===category&&(view!=='wardrobe'||state.owned.includes(v.id)))?.id;
    list.replaceChildren();for(const item of catalogue.filter(v=>v.category===category&&(view!=='wardrobe'||state.owned.includes(v.id)))){const owned=state.owned.includes(item.id),card=document.createElement('article');card.className='shop-item';card.dataset.item=item.id;
      const see=document.createElement('button');see.className='item-preview';see.type='button';see.setAttribute('aria-label',`Preview ${item.name}`);const image=document.createElement('img');image.src=item.src;image.alt='';see.append(image);see.onclick=()=>{showing=item.id;renderShop()};card.classList.toggle('selected',showing===item.id);
      const title=document.createElement('h3');title.textContent=item.name;const desc=document.createElement('p');desc.textContent=item.description;
      const action=document.createElement('button');action.className='item-action';action.type='button';action.dataset.action=view==='wardrobe'?'equip':'buy';action.disabled=view==='shop'&&(owned||state.balance<item.price);
      action.textContent=view==='wardrobe'?(state.gear[item.category]===item.id?'Take off':'Wear it'):owned?(item.category==='toy'?'In your trunk':'In your wardrobe'):`${item.price} ◇ · Buy`;
      action.onclick=()=>{showing=item.id;if(view==='shop'){if(state.balance<item.price||state.owned.includes(item.id))return;state.balance-=item.price;state.owned.push(item.id);status.textContent=`${item.name} is yours.`;api.home()?.possessions?.acquired(item);}
        else{equip(item.id);status.textContent=state.gear[item.category]?'Looking good.':'A little less dressed.';}save();renderShop();};
      const ownership=document.createElement('span');ownership.className='item-ownership';ownership.textContent=owned?'YOURS':' ';card.append(see,title,desc,ownership,action);list.append(card);}
    if(!list.children.length){const p=document.createElement('p');p.className='empty-collection';p.textContent='Your next little treasure has a place here.';list.append(p);}drawPreview();}
  function openWardrobe(){view='wardrobe';category='head';renderShop();status.textContent='';shop.showModal();}
  wallet.addEventListener('click',()=>{if(obby.hasLaunched||api.home().travel)return;view='shop';renderShop();status.textContent='';shop.showModal();});
  let backdropPress=false;shop.addEventListener('pointerdown',e=>{backdropPress=e.target===shop});
  document.querySelector('#shop-close').addEventListener('click',()=>shop.close());shop.addEventListener('click',e=>{if(e.target===shop&&backdropPress)shop.close();backdropPress=false});
  window.addEventListener('pagehide',save);save();sync();
  return Object.assign(state,{begin,platform,finish,random,update,draw,drawHat,drawWearables,bodyPresentation,bodyCache,openWardrobe,equip,save,catalogue,topCache});
};
