/* Sunburn VII: one expedition ledger and two expressive hats. Never a physics controller. */
window.createByteEconomy = function(api) {
  const {ctx,world,byte,obby,life}=api,key='byte-sunburn-crystals-v1';
  let saved;try{saved=JSON.parse(localStorage.getItem(key))}catch(_){}
  const integer=v=>Number.isSafeInteger(v)&&v>=0?v:0;
  const catalogue=[{id:'cloud-cap',name:'Cloud cap',price:5,description:'A little piece of the sky.',src:'assets/cosmetics/cloud-cap.svg'},
    {id:'plum-beanie',name:'Plum beanie',price:8,description:'For very serious loafing.',src:'assets/cosmetics/plum-beanie.svg'}];
  const state={balance:integer(saved?.balance),owned:catalogue.filter(v=>saved?.owned?.includes(v.id)).map(v=>v.id),equipped:null,
    runs:integer(saved?.runs),trophies:integer(saved?.trophies),active:false,collected:0,seed:0,pickups:[],sparks:[],rng:1,lastX:0,lastY:0};
  if(state.owned.includes(saved?.equipped))state.equipped=saved.equipped;
  // Reload returns the creature home. Earned money was already banked; pending fragments survive too.
  if(saved?.active)state.trophies+=Math.floor(integer(saved.collected)/5);
  const wallet=document.querySelector('#crystal-wallet'),balance=document.querySelector('#crystal-balance'),dots=document.querySelector('#run-crystals');
  const shop=document.querySelector('#crystal-shop'),list=document.querySelector('#shop-items'),shopBalance=document.querySelector('#shop-balance');
  const status=document.querySelector('#shop-status'),preview=document.querySelector('#wardrobe-preview'),ink=preview.getContext('2d');
  const idle=new Image();idle.src='assets/hq/idle.png';idle.onload=drawPreview;
  for(const item of catalogue){item.image=new Image();item.image.src=item.src;item.image.onload=()=>{item.texture=document.createElement('canvas');item.texture.width=256;item.texture.height=160;item.texture.getContext('2d').drawImage(item.image,0,0,256,160);drawPreview();};}
  let showing=state.equipped||catalogue[0].id,toastTimer=0;
  const gemTexture=document.createElement('canvas');gemTexture.width=56;gemTexture.height=76;const gemInk=gemTexture.getContext('2d');gemInk.setTransform(2,0,0,2,28,32);gem(gemInk,0,0,13);
  function save(){try{localStorage.setItem(key,JSON.stringify({balance:state.balance,owned:state.owned,equipped:state.equipped,runs:state.runs,trophies:state.trophies,active:state.active,collected:state.collected,seed:state.seed}))}catch(_){} }
  function sync(){wallet.disabled=state.active;balance.textContent=shopBalance.textContent=String(state.balance);wallet.setAttribute('aria-label',`${state.balance} crystals. Open Byte's wardrobe`);dots.hidden=!state.active;
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
  function drawHat(p,w,h,frame,id=state.equipped){const item=catalogue.find(v=>v.id===id);if(!item?.texture)return;
    const name=frame?.src?.split('/').pop()||'idle.png';const asleep=name==='asleep.png',side=name.startsWith('scuttle-');
    // Same body reference frame as the sprites; folding is presentation, never collision geometry.
    const headY={'asleep.png':-.245,'drowsy.png':-.365,'scheming.png':-.285,'refusal.png':-.365,'satisfied.png':-.375};
    const x=(side?.075:.015)*w,y=(headY[name]??-.405)*h;
    const width=w*(asleep?.52:.57);p.drawImage(item.texture,x-width*.5,y,width,width*.625);}
  function drawPreview(){ink.clearRect(0,0,240,250);if(!idle.complete||!idle.naturalWidth)return;ink.save();ink.translate(120,131);ink.drawImage(idle,-91,-112,182,224);drawHat(ink,182,224,idle,showing);ink.restore();}
  function renderShop(){sync();list.replaceChildren();for(const item of catalogue){const owned=state.owned.includes(item.id),card=document.createElement('article');card.className='shop-item';card.dataset.item=item.id;
      const see=document.createElement('button');see.className='item-preview';see.type='button';see.setAttribute('aria-label',`Preview ${item.name}`);const image=document.createElement('img');image.src=item.src;image.alt='';see.append(image);see.onclick=()=>{showing=item.id;renderShop()};card.classList.toggle('selected',showing===item.id);
      const title=document.createElement('h3');title.textContent=item.name;const desc=document.createElement('p');desc.textContent=item.description;
      const action=document.createElement('button');action.className='item-action';action.type='button';action.dataset.action=owned?'equip':'buy';action.disabled=!owned&&state.balance<item.price;
      action.textContent=owned?(state.equipped===item.id?'Take off':'Wear it'):`${item.price} ◇ · Buy`;
      action.onclick=()=>{showing=item.id;if(!owned){if(state.balance<item.price||state.owned.includes(item.id))return;state.balance-=item.price;state.owned.push(item.id);status.textContent=`${item.name} is yours.`;}
        else{state.equipped=state.equipped===item.id?null:item.id;status.textContent=state.equipped?'Looking good.':'Back to bare tufts.';}save();renderShop();};
      const ownership=document.createElement('span');ownership.className='item-ownership';ownership.textContent=owned?'YOURS':' ';card.append(see,title,desc,ownership,action);list.append(card);}
    drawPreview();}
  wallet.addEventListener('click',()=>{if(obby.hasLaunched||api.home().travel)return;renderShop();status.textContent='';shop.showModal();});
  document.querySelector('#shop-close').addEventListener('click',()=>shop.close());shop.addEventListener('click',e=>{if(e.target===shop)shop.close()});
  window.addEventListener('pagehide',save);save();sync();
  return Object.assign(state,{begin,platform,finish,random,update,draw,drawHat,save,catalogue});
};
