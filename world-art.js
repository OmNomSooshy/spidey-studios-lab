/* XIII presentation only. Baked geometry has no authority over bodies or hit regions. */
window.ByteWorldArt=(()=>{
 const images=new Map(),rooms=new Map(),food=new Map();let frames={},ready=false,bytes=0;
 const names=['bench','can','lantern','pot','mushroom','hoop','seed','ball','bed0','bed1','bed2','bed3','tree','house','wardrobe','chest','chest-open','cabinet','nook','mat','ladder','hatch','beam','window','round-window','shelf','pantry','table','tub','tap','shower','dish','sponge','towel','biscuit','broccoli','stone','spring','ledge','frog-toy','rattle','ring-toy','pinwheel','picture','wall','floor','tiles','passage','bed2-yellow','bed3-yellow','bed2-blue','bed3-blue','seed-yellow','seed-blue','jam-star','sour-moon','fizz-berry','honey-knot','pink-cloud','carrot-curl','cloud','ice-relief','terrain-xiv','play-meadow','play-structure','play-swing','play-seat','play-bounce'];
 function load(name){return new Promise((resolve,reject)=>{const img=new Image();img.onload=async()=>{try{const f=frames[name],r=f?.rect||[0,0,1,1];let bitmap;
   // Drop transparent framing once. Physical runtime dimensions never come from this crop.
   const sx=Math.max(0,Math.floor(r[0]*img.width)-3),sy=Math.max(0,Math.floor(r[1]*img.height)-3),sw=Math.min(img.width-sx,Math.ceil(r[2]*img.width)+6),sh=Math.min(img.height-sy,Math.ceil(r[3]*img.height)+6);
   if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(img,sx,sy,sw,sh);else{bitmap=document.createElement('canvas');bitmap.width=sw;bitmap.height=sh;bitmap.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,sw,sh);}
   images.set(name,bitmap);bytes+=sw*sh*4;img.src='';resolve();}catch(e){reject(e)}};img.onerror=()=>reject(new Error('World art failed: '+name));img.src='assets/world/'+name+'.webp';})}
 const promise=fetch('assets/world/frames.json').then(r=>{if(!r.ok)throw Error('Missing world frames');return r.json()}).then(f=>{frames=f;return Promise.all(names.map(load))}).then(()=>{ready=true;});
 function rect(p,name,x,y,w,h){const im=images.get(name);if(!im)return false;p.drawImage(im,x,y,w,h);return true;}
 const shade=document.createElement('canvas');shade.width=128;shade.height=48;const sp=shade.getContext('2d');sp.translate(64,24);sp.scale(1,.375);const sg=sp.createRadialGradient(0,0,1,0,0,60);sg.addColorStop(0,'#293c3e52');sg.addColorStop(1,'#293c3e00');sp.fillStyle=sg;sp.fillRect(-64,-64,128,128);
 function shadow(p,x,y,w,h=18,alpha=1){p.save();p.globalAlpha*=alpha;p.drawImage(shade,x-w*.5,y-h*.5,w,h);p.restore();}
 function base(p,room,w,h){
  p.fillStyle=['#687e7b','#e6e1cd','#c8d4b4','#d5c3a3','#e4e8dc','#e8d8ba'][room];p.fillRect(0,0,w,h);
  rect(p,room===4?'tiles':'wall',-6,-10,w+12,h-13);
  // Actual baked wood/ceramic panel relief, tinted once into the static room cache.
  p.globalCompositeOperation='multiply';p.fillStyle=['#79938e','#fff5dc','#e9f1d4','#eddfc0','#eef6ee','#ffe8c6'][room];p.fillRect(0,0,w,h);p.globalCompositeOperation='source-over';
  rect(p,'floor',-4,h-32,w+8,36);
  if(room!==4)rect(p,'beam',-10,11,w+20,17);
 }
 function room(p,index,w,h,bW,bH,floorY){const key=[index,w,h,bW,bH,floorY].join(':');let c=rooms.get(key);if(!c){c=document.createElement('canvas');c.width=Math.ceil(w*.75);c.height=Math.ceil(h*.75);const q=c.getContext('2d');q.scale(.75,.75);base(q,index,w,h);
   const floor=h-10,stairs=w*.64;
   if(index===0){const cx=w*.34,cy=floorY-bH*.34;shadow(q,cx,floor-15,w*.60,30);for(const x of [cx-w*.22,cx+w*.22])rect(q,'beam',x-5,cy+bH*.30,10,Math.max(10,floor-25-(cy+bH*.30)));rect(q,'nook',cx-w*.25,cy-bH*1.05,w*.5,bH*1.4);rect(q,'mat',cx-w*.21,floor-34,w*.42,27);}
   if(index===1){rect(q,'round-window',w*.5-63,0,126,128);shadow(q,w*.51,floor-22,w*.46,18);}
   if(index===2){rect(q,'hatch',stairs-82,-7,164,50);shadow(q,stairs,floor-22,90,20);rect(q,'ladder',stairs-35,39,70,floor-62);}
   if(index===3){q.fillStyle='#accbd0';q.fillRect(12,0,w*.56,48);rect(q,'beam',6,43,w*.58,10);q.save();q.translate(0,72);q.rotate(Math.atan2(h*.13-72,w*.73));rect(q,'beam',0,-9,Math.hypot(w*.73,h*.13-72),18);q.restore();q.save();q.translate(w*.73,h*.13);q.rotate(Math.atan2(50-h*.13,w*.27));rect(q,'beam',0,-9,Math.hypot(w*.27,50-h*.13),18);q.restore();rect(q,'window',w*.65-50,h*.29-58,100,120);rect(q,'shelf',w*.13,h*.40-7,w*.32,22);rect(q,'dish',w*.215,h*.40-11,w*.13,11);rect(q,'hatch',stairs-65,floor-34,130,45);}
   rooms.set(key,c);if(rooms.size>6){const oldest=rooms.keys().next().value;rooms.delete(oldest);}
  }p.drawImage(c,0,0,w,h);}
 function item(p,name,w,h){return rect(p,name,-w*.5,-h*.5,w,h)}
 function foodFrame(name,bites,portions=4){const key=name+':'+bites+':'+portions;if(food.has(key))return food.get(key);const im=images.get(name);if(!im)return null;const c=document.createElement('canvas');c.width=c.height=96;const p=c.getContext('2d');p.drawImage(im,3,3,90,90);p.globalCompositeOperation='destination-out';for(let i=0;i<portions-bites;i++){p.beginPath();p.arc(77,25+i*17,15,0,Math.PI*2);p.fill();}food.set(key,c);return c;}
 return{promise,rect,room,base,item,shadow,foodFrame,images,get ready(){return ready},stats:()=>({decodedBytes:bytes,assets:images.size,roomCacheBytes:[...rooms.values()].reduce((n,v)=>n+v.width*v.height*4,0),foodCacheBytes:food.size*96*96*4})};
})();
