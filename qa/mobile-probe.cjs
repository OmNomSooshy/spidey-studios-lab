const {chromium, devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
const out=process.env.BYTE_QA_OUTPUT || require('node:path').join(require('node:os').tmpdir(),'byte-little-sun-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BYTE_CHROMIUM || '/usr/bin/chromium',args:['--no-sandbox']});
 const ctx=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:2});
 const page=await ctx.newPage(); const errors=[]; const failures=[]; const results=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failures.push(r.url()+':'+r.status())});
 const cdp=await ctx.newCDPSession(page);
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:5,radiusY:5,force:1}]});}
 async function advance(seconds){return page.evaluate(seconds=>{
  const p=__byteProbe,dt=1/120;for(let i=0;i<seconds/dt;i++){p.home.update(dt);p.update(dt,performance.now()+i*dt*1000);p.updateLife(dt);p.updateAutonomy(dt);p.updateButtonWeb(dt);p.updateObby(dt);p.updateButtonPhysics(dt)}p.draw(performance.now());
  return {x:p.byte.x,y:p.byte.y,vx:p.byte.vx,vy:p.byte.vy,mode:p.byte.mode,phase:p.life.phase};
 },seconds)}
 async function reset(){await page.evaluate(()=>{
 const p=__byteProbe;p.home.cancel();p.home.travel=p.home.journey=p.home.activity=null;p.home.room=1;p.home.cameraX=p.world.w;p.home.cameraY=0;p.paused=true;p.stopEarthGravity();p.finishObby();p.wakeByte();p.life.scale=1;p.life.welcomed=true;p.life.pet=0;p.life.curious=0;p.life.pendingFollow=false;p.life.phase='awake';p.life.pointer.active=false;p.life.nest.active=false;p.life.nest.fade=0;
 Object.assign(p.byte,{x:p.world.w*.45,y:p.floorY(),vx:0,vy:0,angle:0,spin:0,mode:'idle',grabbed:false,squash:0,stretch:0,wallSquish:0,grabSquishX:0,grabSquishY:0,targetX:null,targetY:null});p.web.active=false;p.web.planted=false;p.autonomy.choice='qa-hold';p.buttonWeb.phase='waiting';p.buttonWeb.idleTime=0;p.buttonBody.loose=false;p.buttonBody.stationary=false;
 const b=document.querySelector('#gravity-toggle');b.classList.remove('gravity-loose');b.style.left='';b.style.top='';b.style.right='';b.style.bottom='';
 });await advance(.02)}
 async function shot(name){await page.screenshot({path:`${out}/${name}.png`,scale:'css'})}
 async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS',name)}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message)}}
 await page.goto((process.env.BYTE_QA_URL || 'http://127.0.0.1:4173/')+'?probe');await page.waitForSelector('#arrival.ready');await shot('candidate-first');
 await reset();
 await check('gentle hold closes eyes without moving Byte',async()=>{
  const pos=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y-__byteProbe.bodyH()*.23}));
  await touch('touchStart',pos.x,pos.y);await advance(.85);await shot('candidate-pet');
  const s=await page.evaluate(()=>({grabbed:__byteProbe.byte.grabbed,pet:__byteProbe.life.pet,frame:__byteProbe.bodyGeometry().frame.src,y:__byteProbe.byte.y,floor:__byteProbe.floorY()}));
  assert(s.grabbed);assert(s.pet>.8);assert(s.frame.endsWith('/blink.png'));assert(Math.abs(s.y-s.floor)<5);
  await page.waitForTimeout(180);await touch('touchEnd');await advance(.1);
  assert(Math.abs(await page.evaluate(()=>__byteProbe.byte.vx))<5);
 });
 await reset();
 await check('finger hold and movement retain scuttle authority',async()=>{
  await touch('touchStart',320,650);await advance(.6);
  let x=await page.evaluate(()=>__byteProbe.byte.x);assert(x>280);
  await touch('touchMove',90,650);await advance(.8);
  x=await page.evaluate(()=>__byteProbe.byte.x);assert(x<140);await touch('touchEnd');await shot('candidate-follow');
 });
 await reset();
 await check('all four dragged boundaries contain and compress visible body',async()=>{
  for(const [x,y] of [[-70,600],[470,600],[190,-90],[190,940]]){
   await reset();const pos=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y-15}));
   await touch('touchStart',pos.x,pos.y);await touch('touchMove',x,y);await advance(.08);
   const s=await page.evaluate(()=>{const p=__byteProbe,e=p.bodyHalfExtents();return {x:p.byte.x,y:p.byte.y,ex:e.x,ey:e.y,w:p.world.w,h:p.world.h,sx:p.byte.grabSquishX,sy:p.byte.grabSquishY}});
   assert(s.x-s.ex>=-.1);assert(s.x+s.ex<=s.w+.1);assert(s.y-s.ey>=-.1);assert(s.y+s.ey<=s.h+.1);assert(Math.max(s.sx,s.sy)>.3);
   if(x<0)await shot('candidate-wall');await touch('touchEnd');
  }
 });
 await reset();
 await check('throw retains measured release momentum',async()=>{
  const pos=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y-15}));await touch('touchStart',pos.x,pos.y);
  for(let i=1;i<=5;i++){await touch('touchMove',pos.x+18*i,pos.y-28*i);await page.waitForTimeout(16)}
  await touch('touchEnd');const s=await page.evaluate(()=>({vx:__byteProbe.byte.vx,vy:__byteProbe.byte.vy,mode:__byteProbe.byte.mode}));
  assert(s.vx>150);assert(s.vy<-150);assert.equal(s.mode,'air');await advance(.15);await shot('candidate-throw');
 });
 await reset();
 await check('spool web plants, remains physical, and endpoint release preserves momentum',async()=>{
  let pos=await page.evaluate(()=>__byteProbe.spoolPosition());await touch('touchStart',pos.x,pos.y);
  await touch('touchMove',pos.x+20,pos.y-350);await advance(.12);await touch('touchEnd');await advance(.8);
  let s=await page.evaluate(()=>({active:__byteProbe.web.active,planted:__byteProbe.web.planted,len:__byteProbe.web.deployedLength,h:__byteProbe.bodyH(),anchor:{x:__byteProbe.web.anchorX,y:__byteProbe.web.anchorY},y:__byteProbe.byte.y}));
  assert(s.active&&s.planted);assert(Math.abs(s.len/s.h-1.2)<.01);assert(s.y<720);await shot('candidate-planted');
  await page.evaluate(()=>{__byteProbe.byte.vx=120;__byteProbe.byte.vy=-40});await touch('touchStart',s.anchor.x,s.anchor.y);
  const released=await page.evaluate(()=>({active:__byteProbe.web.active,vx:__byteProbe.byte.vx,vy:__byteProbe.byte.vy}));
  assert(!released.active);assert.equal(released.vx,120);assert.equal(released.vy,-40);await touch('touchEnd');
 });
 await reset();
 await check('slack player rope applies no push',async()=>{
  const s=await page.evaluate(()=>{const p=__byteProbe,sp=p.spoolPosition();Object.assign(p.web,{active:true,planted:true,anchorX:sp.x+10,anchorY:sp.y,length:200,deployedLength:200});p.byte.vx=85;p.byte.vy=-31;const x=p.byte.x,y=p.byte.y;p.solveWebTether();return {x:p.byte.x-x,y:p.byte.y-y,vx:p.byte.vx,vy:p.byte.vy}});
  assert.equal(s.x,0);assert.equal(s.y,0);assert.equal(s.vx,85);assert.equal(s.vy,-31);
 });
 await reset();
 await check('Byte makes a physical sleeping web and touch wakes him',async()=>{
  await page.evaluate(()=>{__byteProbe.home.room=0;__byteProbe.home.cameraX=0;__byteProbe.home.cameraY=0;__byteProbe.autonomy.choice='rest';__byteProbe.beginRest()});
  const trace=[];for(let i=0;i<12;i++){trace.push(await advance(.4));}
  console.log('resttrace',JSON.stringify(trace));
  const s=await page.evaluate(()=>({phase:__byteProbe.life.phase,active:__byteProbe.life.nest.active,y:__byteProbe.byte.y,floor:__byteProbe.floorY(),frame:__byteProbe.bodyGeometry().frame.src}));
  assert.equal(s.phase,'sleep');assert(s.active);assert(s.y<s.floor-30);assert(s.frame.endsWith('/blink.png'));await shot('candidate-sleep');
  await page.evaluate(()=>{__byteProbe.byte.vx=90});await touch('touchStart',330,680);
  const waking=await page.evaluate(()=>({active:__byteProbe.life.nest.active,phase:__byteProbe.life.phase,vx:__byteProbe.byte.vx}));
  assert(!waking.active);assert.equal(waking.phase,'awake');assert.equal(waking.vx,90);await touch('touchEnd');
 });
 await reset();
 await check('scheming pulls the gravity control down and activates Earth gravity without sensor consent',async()=>{
  await page.evaluate(()=>{__byteProbe.autonomy.choice='button'});await advance(5.05);
  const a=await page.evaluate(()=>({phase:__byteProbe.buttonWeb.phase,mode:__byteProbe.byte.mode,src:__byteProbe.bodyGeometry().frame.src}));
  assert.equal(a.phase,'scheming');assert.equal(a.mode,'scheming');assert(a.src.endsWith('/scheming.png'));await shot('candidate-scheming');
  await advance(2.5);let s=await page.evaluate(()=>({loose:__byteProbe.buttonBody.loose,y:__byteProbe.buttonBody.y,earth:__byteProbe.earth.enabled,label:document.querySelector('#gravity-label').textContent,phase:__byteProbe.buttonWeb.phase}));
  assert(s.loose);assert(s.earth);assert.match(s.label,/EARTH OWNS DOWN/);assert.equal(s.phase,'released');assert(s.y>100);await shot('candidate-crime');
 });
 await reset();
 await check('continuous Earth vector supports non-bottom scuttle and corners',async()=>{
  await page.evaluate(()=>{const p=__byteProbe;p.enableEarthGravity(true);p.earth.x=-1650;p.earth.y=0;p.byte.x=180;p.byte.y=450;p.byte.vx=p.byte.vy=0});await advance(4);
  let s=await page.evaluate(()=>{const p=__byteProbe;return {x:p.byte.x,y:p.byte.y,angle:p.byte.angle,edge:p.earth.support.edge,active:p.earth.support.active}});
  assert(s.active);assert.equal(s.edge,'left');assert(Math.abs(s.angle-Math.PI/2)<.12);console.log('left',s);await shot('candidate-earth-left');
  await touch('touchStart',80,250);await advance(.8);await touch('touchEnd');let y=await page.evaluate(()=>__byteProbe.byte.y);assert(y<s.y-90);
  const frames=[];
  for(const deg of [270,285,300,315,330,345,360,15,30,45,60,75,90,105,120,135,150,165,180]){
   await page.evaluate(deg=>{const p=__byteProbe,a=deg*Math.PI/180;p.earth.x=1650*Math.sin(a);p.earth.y=1650*Math.cos(a);p.byte.mode='air';p.byte.targetX=p.byte.targetY=null},deg);
   await advance(.7);frames.push(await page.evaluate(deg=>{const p=__byteProbe,e=p.bodyHalfExtents();return {deg,x:p.byte.x,y:p.byte.y,angle:p.byte.angle,edge:p.earth.support.edge,contained:p.byte.x-e.x>=-.2&&p.byte.x+e.x<=p.world.w+.2&&p.byte.y-e.y>=-.2&&p.byte.y+e.y<=p.world.h+.2}},deg));
  }
  console.log('earthframes',JSON.stringify(frames));assert(frames.every(f=>f.contained));assert(frames.every(f=>Number.isFinite(f.angle)));await shot('candidate-earth-top');
 });
 await reset();
 await check('first platform waits; player placement starts climb; web and fall return home',async()=>{
  await page.evaluate(()=>{__byteProbe.home.room=3;__byteProbe.home.cameraX=__byteProbe.world.w*2;__byteProbe.home.cameraY=-__byteProbe.world.h;__byteProbe.beginObby()});await advance(2);
  let s=await page.evaluate(()=>({phase:__byteProbe.obby.phase,launched:__byteProbe.obby.hasLaunched,p:__byteProbe.obby.platforms[0],byte:{x:__byteProbe.byte.x,y:__byteProbe.byte.y},half:__byteProbe.halfH()}));
  assert.equal(s.phase,'waiting');assert(!s.launched);await shot('candidate-platform');
  await touch('touchStart',s.byte.x,s.byte.y-15);await touch('touchMove',s.p.x+s.p.w/2,s.p.y-s.half-17);await page.waitForTimeout(180);await touch('touchEnd');await advance(.6);
  let climb=await page.evaluate(()=>({active:__byteProbe.obby.hasLaunched,scale:__byteProbe.life.scale,hidden:document.body.classList.contains('obby-away'),camera:__byteProbe.obby.cameraY,y:__byteProbe.byte.y}));
  console.log('climb',climb);assert(climb.active);assert(climb.scale<.8);assert(climb.hidden);await shot('candidate-climb');
  await advance(1.3);await touch('touchStart',80,150);await page.waitForTimeout(100);await advance(.8);
  assert(await page.evaluate(()=>__byteProbe.obby.web.active));await shot('candidate-climb-web');
  await page.evaluate(()=>{__byteProbe.byte.vx=145});await touch('touchEnd');assert(!await page.evaluate(()=>__byteProbe.obby.web.active));assert.equal(await page.evaluate(()=>__byteProbe.byte.vx),145);
  await page.evaluate(()=>{const p=__byteProbe;p.obby.platforms=[];p.obby.phase='fall';p.byte.vy=900;p.byte.vx=0;p.byte.mode='air'});await advance(8);
  let home=await page.evaluate(()=>({active:__byteProbe.obby.active,scale:__byteProbe.life.scale,hidden:document.body.classList.contains('obby-away'),y:__byteProbe.byte.y,floor:__byteProbe.floorY()}));
  console.log('home',home);assert(!await page.evaluate(()=>__byteProbe.obby.hasLaunched));assert(home.scale>.98);assert(!home.hidden);assert(home.y>home.floor-80);await shot('candidate-return');
 });
 console.log('PAGE_ERRORS',JSON.stringify(errors));console.log('FAILED_REQUESTS',JSON.stringify(failures));
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({results,errors,failures},null,2));await browser.close();
 if(results.some(x=>!x.pass)||errors.length||failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
