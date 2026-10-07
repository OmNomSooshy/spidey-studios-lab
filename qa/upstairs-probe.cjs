const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const out = process.env.BYTE_QA_OUTPUT || '/tmp/byte-sunburn-upstairs';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BYTE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4191/')+'?probe');await page.waitForSelector('#arrival.ready');
 async function holdSimulation(){await page.evaluate(()=>{const q=__byteProbe;q.paused=true;q.life.welcomed=true;q.autonomy.choice='qa';});}await holdSimulation();
 const cdp=await context.newCDPSession(page);
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]});}
 async function tap(x,y){await touch('touchStart',x,y);await touch('touchEnd');}
 async function step(seconds){return page.evaluate(seconds=>{const q=__byteProbe,trace=[],dt=1/120;
  for(let i=0;i<seconds/dt;i++){q.home.update(dt);q.update(dt,performance.now());q.updateLife(dt);q.updateAutonomy(dt);q.updateButtonWeb(dt);q.updateObby(dt);q.updateButtonPhysics(dt);q.containRoomBody();if(i%12===0)trace.push({room:q.home.room,travel:!!q.home.travel,cameraY:q.home.cameraY,obbyCamera:q.obby.cameraY,launched:q.obby.hasLaunched,y:q.byte.y});}
  q.draw(performance.now());return trace;
 },seconds);}
 async function snap(name){await page.screenshot({path:path.join(out,'upstairs-'+name+'.png'),scale:'css'});}
 async function state(){return page.evaluate(()=>{const q=__byteProbe;return{room:q.home.room,cameraY:q.home.cameraY,travel:!!q.home.travel,launched:q.obby.hasLaunched,scale:q.life.scale,phase:q.obby.phase,platform:q.obby.platforms[0],body:{x:q.byte.x,y:q.byte.y},half:q.halfH()}});}
 await tap(370,630);await step(3);assert.equal((await state()).room,2);await snap('ladder');
 await tap(250,400);const ascent=await step(4);let s=await state();assert.equal(s.room,3);assert.equal(s.cameraY,-844);assert(!s.launched);assert.equal(s.phase,'waiting');
 assert(ascent.some(v=>v.travel&&v.cameraY<0&&v.cameraY>-844));await snap('loft');
 await step(4);assert(!(await state()).launched);checks.push('actual ladder touch enters a separate loft; visit and idle never auto-launch');
 const hidden=await page.evaluate(()=>['#gravity-toggle','#room-port'].every(id=>{const r=document.querySelector(id).getBoundingClientRect();return r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth}));assert(hidden);checks.push('downstairs gravity control and sensory aperture stay downstairs');
 await page.evaluate(()=>__byteProbe.home.save());await page.reload();await page.waitForSelector('#arrival.ready');await holdSimulation();await step(1);assert.equal((await state()).room,3);assert(!(await state()).launched);checks.push('loft persists across reload at room scale with a usable waiting platform');
 await tap(250,810);const descent=await step(3);assert.equal((await state()).room,2);assert(descent.some(v=>v.travel&&v.cameraY<0&&v.cameraY>-844));checks.push('floor hatch returns downstairs without playing the obby');
 let ball=await page.evaluate(()=>({x:__byteProbe.home.things[0].x,y:__byteProbe.home.things[0].y}));
 await touch('touchStart',ball.x,ball.y);await touch('touchMove',250,400);await page.waitForTimeout(180);await touch('touchEnd');await step(4);
 assert.equal((await state()).room,3);assert.equal(await page.evaluate(()=>__byteProbe.home.things[0].room),3);assert(!(await state()).launched);await snap('toy-upstairs');checks.push('physical ball can accompany Byte upstairs without activating the obby');
 ball=await page.evaluate(()=>({x:__byteProbe.home.things[0].x,y:__byteProbe.home.things[0].y}));await touch('touchStart',ball.x,ball.y);await touch('touchMove',250,810);await page.waitForTimeout(180);await touch('touchEnd');await step(4);
 assert.equal((await state()).room,2);assert.equal(await page.evaluate(()=>__byteProbe.home.things[0].room),2);checks.push('the same belonging comes back down the ladder');
 await tap(250,400);let approach=await step(4);for(let i=0;i<8&&(await state()).room!==3;i++)approach.push(...await step(1));s=await state();assert.equal(s.room,3,JSON.stringify({s,approach}));assert(!s.travel);await step(1);s=await state();
 // Freeze just the random horizontal platform layout to make repeated physics checks reproducible.
 // Entry, bounces, tilt, ropes, scrolling and return continue through the real handlers/solvers.
 await page.evaluate(()=>{Math.random=()=>.5});
 await touch('touchStart',s.body.x,s.body.y-20);await touch('touchMove',s.platform.x+s.platform.w*.5,s.platform.y-s.half-20);await page.waitForTimeout(180);await touch('touchEnd');
 const climb=await step(5);s=await state();fs.writeFileSync(path.join(out,'climb-trace.json'),JSON.stringify({s,climb},null,2));await snap('climb-debug');assert(s.launched);assert(s.scale<.8);assert(climb.some(v=>v.obbyCamera < -844));await snap('outside');checks.push('actual player placement starts automatic bouncing; camera climbs completely outside the loft');
 await touch('touchStart',80,120);await page.waitForTimeout(110);await step(.25);assert(await page.evaluate(()=>__byteProbe.obby.web.active));
 const vx=await page.evaluate(()=>__byteProbe.byte.vx);await touch('touchEnd');assert(!await page.evaluate(()=>__byteProbe.obby.web.active));assert.equal(await page.evaluate(()=>__byteProbe.byte.vx),vx);checks.push('outdoor held web stays physical and release retains velocity');
 // A controlled missed route exercises physical falling and home-scale recovery without forcing return state.
 await page.evaluate(()=>{const q=__byteProbe;q.obby.platforms=[];q.obby.phase='fall';q.byte.vy=Math.max(300,q.byte.vy);});for(let i=0;i<120&&(await state()).launched;i++)await step(.1);await step(.7);
 s=await state();assert.equal(s.room,3);assert(!s.launched);assert(s.scale>.98);assert.equal(s.cameraY,-844);await snap('back-in-loft');checks.push('a missed descent returns to the loft, normal scale and its waiting spring');
 await tap(250,810);await step(6);assert.equal((await state()).room,2);await snap('back-downstairs');checks.push('after returning from outdoors the ladder still leads downstairs');
 assert(!errors.length);fs.writeFileSync(path.join(out,'upstairs-results.json'),JSON.stringify({checks,errors},null,2));console.log('PASS',checks);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
