const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.BYTE_QA_OUTPUT || '/tmp/byte-sunburn-qa';
fs.mkdirSync(out, { recursive: true });
const url = (process.env.BYTE_QA_URL || 'http://127.0.0.1:4191/') + '?probe';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BYTE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const results = [], errors = [];
  async function open() {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.waitForSelector('#arrival.ready');
    await page.evaluate(() => { const q = __byteProbe; q.paused = true; q.life.welcomed = true; q.life.curious = 0; q.autonomy.choice = 'qa'; });
    const cdp = await context.newCDPSession(page);
    async function touch(type, x, y) { await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x, y, radiusX: 5, radiusY: 5, force: 1 }] }); }
    return { context, page, touch };
  }
  async function step(page, seconds) {
    return page.evaluate(seconds => {
      const q = __byteProbe, dt = 1 / 120, trace = [];
      for (let i = 0; i < seconds / dt; i++) {
        q.home.update(dt); q.update(dt, performance.now()); q.updateLife(dt); q.updateAutonomy(dt); q.updateButtonWeb(dt); q.updateObby(dt); q.updateButtonPhysics(dt);q.containRoomBody();
        for (const key of ['x', 'y', 'vx', 'vy', 'angle', 'spin']) if (!Number.isFinite(q.byte[key])) throw Error('nonfinite ' + key);
        if (i % 12 === 0) trace.push({ room: q.home.room, camera: q.home.cameraX, x: q.byte.x, y: q.byte.y, phase: q.life.phase, mode: q.byte.mode,
          travel: !!q.home.travel, ballY: q.home.things.find(v => v.id === 'ball')?.y, ballVy: q.home.things.find(v => v.id === 'ball')?.vy });
      }
      q.draw(performance.now()); return trace;
    }, seconds);
  }
  async function place(page, room, x = 150) {
    await page.evaluate(({room,x}) => { const q = __byteProbe; q.home.cancel(); q.home.travel=q.home.journey=q.home.activity=null; q.home.room=room; const pos=q.home.space(room);q.home.cameraX=pos.x;q.home.cameraY=pos.y;
      q.wakeByte(); q.stopEarthGravity(); q.finishObby(); q.life.pointer.active=false; q.autonomy.choice='qa';
      Object.assign(q.byte,{x,y:q.floorY(),vx:0,vy:0,angle:0,spin:0,mode:'idle',targetX:null,targetY:null,grabbed:false}); q.draw(performance.now()); }, {room,x});
  }
  async function check(name, fn) { try { await fn(); results.push({ name, pass: true }); console.log('PASS', name); } catch (e) { results.push({ name, pass: false, error: e.stack }); console.log('FAIL', name, e.stack); } }
  await check('actual finger invitations traverse both doors with continuous camera motion and keep the aperture in its own space', async () => {
    const { context, page, touch } = await open(); await page.screenshot({path:path.join(out,'hall.png'),scale:'css'});
    await touch('touchStart', 25, 630); await touch('touchEnd'); const left = await step(page, 3);
    assert.equal(await page.evaluate(()=>__byteProbe.home.room),0); assert(left.some(v=>v.travel&&v.camera>0&&v.camera<390));
    assert(await page.locator('#room-window').evaluate(el=>el.getBoundingClientRect().left>390));
    await page.screenshot({path:path.join(out,'nook.png'),scale:'css'});
    await touch('touchStart', 370, 630); await touch('touchEnd'); await step(page, 3); assert.equal(await page.evaluate(()=>__byteProbe.home.room),1);
    await touch('touchStart', 370, 630); await touch('touchEnd'); await step(page, 3); assert.equal(await page.evaluate(()=>__byteProbe.home.room),2);
    assert(await page.locator('#room-window').evaluate(el=>el.getBoundingClientRect().right<0));
    await page.screenshot({path:path.join(out,'play-space.png'),scale:'css'}); await context.close();
  });
  await check('a calm held Byte can be carried into a doorway without escaping ordinary outer-wall squish',async()=>{
    const {context,page,touch}=await open(); await place(page,1);
    await touch('touchStart',150,730);await touch('touchMove',25,520);await page.waitForTimeout(180);await touch('touchEnd');await step(page,2);
    assert.equal(await page.evaluate(()=>__byteProbe.home.room),0);
    const p=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y}));await touch('touchStart',p.x,p.y-15);await touch('touchMove',-80,620);await step(page,.15);
    const r=await page.evaluate(()=>{const q=__byteProbe,e=q.bodyHalfExtents();return{room:q.home.room,left:q.byte.x-e.x,squish:q.byte.grabSquishX}});
    assert.equal(r.room,0);assert(r.left>=-.2);assert(r.squish>.3);await touch('touchEnd');await context.close();
  });
  await check('a physical toy can be dragged to a passage, accompany Byte, settle elsewhere, and survive reload',async()=>{
    const {context,page,touch}=await open();await place(page,2);await step(page,1);
    const ball=await page.evaluate(()=>{const v=__byteProbe.home.things[0];return{x:v.x,y:v.y}});
    await touch('touchStart',ball.x,ball.y);assert(await page.evaluate(()=>!!__byteProbe.home.hand));await touch('touchMove',20,680);await page.waitForTimeout(180);await touch('touchEnd');await step(page,4);
    let r=await page.evaluate(()=>({room:__byteProbe.home.room,ball:__byteProbe.home.things[0]}));assert.equal(r.room,1);assert.equal(r.ball.room,1);
    await page.evaluate(()=>__byteProbe.home.save());await page.reload();await page.waitForSelector('#arrival.ready');r=await page.evaluate(()=>({room:__byteProbe.home.room,ball:__byteProbe.home.things[0]}));assert.equal(r.room,1);assert.equal(r.ball.room,1);
    await page.screenshot({path:path.join(out,'belonging-returned.png'),scale:'css'});await context.close();
  });
  await check('autonomous rest travels to the nook, makes a physical strand, and leaves a local memory after waking',async()=>{
    const {context,page}=await open();await page.evaluate(()=>{__byteProbe.beginRest()});const trace=await step(page,10);
    const r=await page.evaluate(()=>({room:__byteProbe.home.room,phase:__byteProbe.life.phase,nest:__byteProbe.life.nest.active,slept:__byteProbe.home.slept,y:__byteProbe.byte.y,floor:__byteProbe.floorY()}));
    assert(trace.some(v=>v.travel));assert.equal(r.room,0);assert.equal(r.phase,'sleep');assert(r.nest&&r.slept&&r.y<r.floor-25);
    await page.screenshot({path:path.join(out,'inhabited-nook.png'),scale:'css'});
    const wake=await page.evaluate(()=>{const q=__byteProbe;q.byte.vx=75;q.wakeByte();q.home.save();return{vx:q.byte.vx,active:q.life.nest.active,slept:q.home.slept}});assert.equal(wake.vx,75);assert(!wake.active&&wake.slept);await context.close();
  });
  await check('Human Fingers can invite rest by leaving Byte calmly on his actual mat',async()=>{
    const {context,page,touch}=await open();await place(page,0,220);
    const p=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y,mat:__byteProbe.world.w*.34}));
    await touch('touchStart',p.x,p.y-25);await touch('touchMove',p.mat,p.y-25);await page.waitForTimeout(180);await touch('touchEnd');
    await page.evaluate(()=>{__byteProbe.autonomy.choice=null});await step(page,8);
    const r=await page.evaluate(()=>({phase:__byteProbe.life.phase,nest:__byteProbe.life.nest.active,room:__byteProbe.home.room}));assert.equal(r.room,0);assert.equal(r.phase,'sleep');assert(r.nest);await context.close();
  });
  await check('Byte autonomously approaches and kicks a physical ball in the play space',async()=>{
    const{context,page}=await open();await place(page,2,100);await page.evaluate(()=>{__byteProbe.autonomy.choice='play'});const trace=await step(page,9);
    assert(trace.some(v=>v.ballVy<-250));assert(trace.some(v=>v.ballY<780));assert.equal(await page.evaluate(()=>__byteProbe.home.room),2);await context.close();
  });
  await check('the upstairs opportunity takes Byte to the loft, waits, and requires physical platform contact',async()=>{
    const{context,page,touch}=await open();await page.evaluate(()=>__byteProbe.beginObby());await step(page,8);
    let r=await page.evaluate(()=>({room:__byteProbe.home.room,phase:__byteProbe.obby.phase,launched:__byteProbe.obby.hasLaunched,p:__byteProbe.obby.platforms[0],byte:{x:__byteProbe.byte.x,y:__byteProbe.byte.y},half:__byteProbe.halfH()}));
    assert.equal(r.room,3);assert.equal(r.phase,'waiting');assert(!r.launched&&r.p);await page.screenshot({path:path.join(out,'loft-waiting.png'),scale:'css'});
    await touch('touchStart',r.byte.x,r.byte.y-20);await touch('touchMove',r.p.x+r.p.w*.5,r.p.y-r.half-20);await page.waitForTimeout(180);await touch('touchEnd');await step(page,.7);
    assert(await page.evaluate(()=>__byteProbe.obby.hasLaunched));await context.close();
  });
  await check('a waiting platform stays in its loft while Byte can leave, sleep elsewhere and return to it',async()=>{
    const {context,page,touch}=await open();await place(page,3);await page.evaluate(()=>__byteProbe.beginObby());await step(page,1);
    const platform=await page.evaluate(()=>({...__byteProbe.obby.platforms[0]}));
    await touch('touchStart',250,810);await touch('touchEnd');await step(page,4);assert.equal(await page.evaluate(()=>__byteProbe.home.room),2);
    await page.evaluate(()=>__byteProbe.beginRest());await step(page,9);assert.equal(await page.evaluate(()=>__byteProbe.life.phase),'sleep');
    await page.evaluate(()=>{__byteProbe.wakeByte();__byteProbe.home.request(3)});await step(page,9);
    const r=await page.evaluate(()=>({room:__byteProbe.home.room,active:__byteProbe.obby.active,launched:__byteProbe.obby.hasLaunched,p:__byteProbe.obby.platforms[0]}));
    assert.equal(r.room,3);assert(r.active&&!r.launched);assert.equal(r.p.x,platform.x);assert.equal(r.p.y,platform.y);await context.close();
  });
  await check('a found upstairs stone falls back into the home and Byte carries it to his nook',async()=>{
    const{context,page}=await open();await place(page,3);await page.evaluate(()=>{const q=__byteProbe;q.beginObby();q.obby.fallingPlatform=null;q.obby.active=true;q.obby.hasLaunched=true;q.obby.phase='fall';q.obby.platforms=[];q.obby.cameraY=-1400;q.byte.mode='air';q.byte.y=-q.world.h*1.4;q.byte.vy=500;});
    for (let i=0;i<150;i++) { await step(page,.2); if (await page.evaluate(()=>__byteProbe.home.stoneHome&&__byteProbe.home.room===0)) break; }
    const r=await page.evaluate(()=>({found:__byteProbe.home.found,home:__byteProbe.home.stoneHome,room:__byteProbe.home.room,stone:__byteProbe.home.things.find(v=>v.id==='stone'),obby:__byteProbe.obby.hasLaunched}));
    assert(r.found);assert(!r.obby);assert(r.home);assert.equal(r.room,0);assert.equal(r.stone.room,0);await page.screenshot({path:path.join(out,'treasure-home.png'),scale:'css'});await context.close();
  });
  await check('the repaired prank travels back to the aperture, schemes, dislodges its control and activates Earth mode',async()=>{
    const{context,page}=await open();await place(page,0);await page.evaluate(()=>{__byteProbe.autonomy.choice='button'});await step(page,13);
    const r=await page.evaluate(()=>({room:__byteProbe.home.room,loose:__byteProbe.buttonBody.loose,earth:__byteProbe.earth.enabled,phase:__byteProbe.buttonWeb.phase}));assert.equal(r.room,1);assert(r.loose&&r.earth);assert.equal(r.phase,'released');await context.close();
  });
  await check('a platform left waiting upstairs does not suppress the downstairs gravity prank',async()=>{
    const {context,page}=await open();await place(page,3);await page.evaluate(()=>__byteProbe.beginObby());await step(page,1);
    await page.evaluate(()=>__byteProbe.home.request(1));await step(page,4);await page.evaluate(()=>{__byteProbe.autonomy.choice='button'});await step(page,9);
    const r=await page.evaluate(()=>({platform:__byteProbe.obby.platforms.length,active:__byteProbe.obby.active,launched:__byteProbe.obby.hasLaunched,earth:__byteProbe.earth.enabled,loose:__byteProbe.buttonBody.loose}));
    assert(r.active&&!r.launched&&r.platform===1&&r.earth&&r.loose);await context.close();
  });
  await check('phone inertia and microphone pressure act on physical belongings as well as Byte',async()=>{
    const {context,page}=await open();
    const r=await page.evaluate(()=>{const q=__byteProbe,v=q.home.things[0],s=q.room.state;Object.assign(v,{x:250,y:400,vx:0,vy:0});
      Object.assign(s,{open:true,motion:true,mic:true,inertiaX:-510,inertiaY:0,turnA:0,lastMotion:performance.now(),breath:1,breathX:0,breathY:-1});q.home.update(.032);return {vx:v.vx,vy:v.vy,y:v.y}});
    assert(r.vx<-10&&r.vy<-30&&r.y<400);await context.close();
  });
  await check('a charging invitation travels to its visible warmth, while voice travel leaves phone forces active',async()=>{
    const {context,page}=await open();await place(page,0);
    const power=await page.evaluate(()=>{const q=__byteProbe;Object.assign(q.room.state,{open:true,battery:true,charging:true,chargeId:1});q.updateOutside(.032,performance.now());return q.home.journey?.target});assert.equal(power,1);
    await step(page,4);assert.equal(await page.evaluate(()=>__byteProbe.home.room),1);
    await place(page,0);
    const voice=await page.evaluate(()=>{const q=__byteProbe;Object.assign(q.room.state,{open:true,battery:false,charging:false,mic:true,listeningFor:2,level:.01,motion:true,inertiaX:-510,inertiaY:0,turnA:0,lastMotion:performance.now()});
      q.outside.powerInvite=false;q.outside.seekTime=3;q.updateOutside(.032,performance.now());return{target:q.home.journey?.target,vx:q.byte.vx}});
    assert.equal(voice.target,1);assert(voice.vx<-10);await context.close();
  });
  await check('Earth support remains coherent through carrying Byte into a neighboring space',async()=>{
    const{context,page,touch}=await open();await place(page,2);await page.evaluate(()=>{const q=__byteProbe;q.enableEarthGravity(true);q.earth.x=-1650;q.earth.y=0;q.byte.mode='air';q.byte.y=460});await step(page,3);
    const p=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y}));await touch('touchStart',p.x,p.y-15);await touch('touchMove',25,500);await page.waitForTimeout(180);await touch('touchEnd');await step(page,3);
    const r=await page.evaluate(()=>({room:__byteProbe.home.room,earth:__byteProbe.earth.enabled,edge:__byteProbe.earth.support.edge,angle:__byteProbe.byte.angle}));assert.equal(r.room,1);assert(r.earth);assert.equal(r.edge,'left');assert(Math.abs(r.angle-Math.PI*.5)<.1);await context.close();
  });
  await check('opening the real capture aperture then leaving its room keeps sensing live without moving the aperture into a HUD',async()=>{
    const{context,page}=await open();await page.locator('#room-window').tap();await page.waitForFunction(()=>ByteRoom.state.camera&&ByteRoom.state.mic);await page.evaluate(()=>__byteProbe.home.request(0));await step(page,4);
    const r=await page.evaluate(()=>({room:__byteProbe.home.room,camera:ByteRoom.state.camera,mic:ByteRoom.state.mic,live:document.querySelector('video').srcObject.getTracks().every(v=>v.readyState==='live'),right:document.querySelector('#room-window').getBoundingClientRect().left}));assert.equal(r.room,0);assert(r.camera&&r.mic&&r.live&&r.right>390);await context.close();
  });
  await check('grabbing Byte interrupts a carrying trip and leaves the belonging physical in the current space', async()=>{
    const {context,page,touch}=await open();await place(page,2,210);
    await page.evaluate(()=>{const q=__byteProbe;q.home.request(0,'visit',q.home.things[0]);q.home.update(.01)});
    const p=await page.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y}));await touch('touchStart',p.x,p.y-35);
    const r=await page.evaluate(()=>{const q=__byteProbe;return {grab:q.byte.grabbed,trip:q.home.journey,carried:q.home.carried,item:q.home.things[0].room}});
    assert(r.grab);assert(!r.trip&&!r.carried);assert.equal(r.item,2);await touch('touchEnd');await context.close();
  });
  await check('a planted player strand prevents departure and survives a doorway invitation',async()=>{
    const {context,page,touch}=await open();await place(page,1);
    await page.evaluate(()=>{const q=__byteProbe;Object.assign(q.web,{active:true,planted:true,anchorX:170,anchorY:400,deployedLength:q.bodyH()*1.2});q.byte.mode='air'});
    await touch('touchStart',25,650);await touch('touchEnd');await step(page,3);
    const r=await page.evaluate(()=>({room:__byteProbe.home.room,web:__byteProbe.web.active,planted:__byteProbe.web.planted,trip:__byteProbe.home.journey}));
    assert.equal(r.room,1);assert(r.web&&r.planted&&!r.trip);await context.close();
  });
  await check('quiet sensory attention yields to a doorway trip while physical breath still changes momentum',async()=>{
    const {context,page}=await open();await place(page,1);
    const r=await page.evaluate(()=>{const q=__byteProbe,s=q.room.state;Object.assign(s,{open:true,mic:true,listeningFor:2,level:.01});q.outside.seekTime=3;q.home.request(0);
      q.home.update(.01);const target=q.byte.targetX;q.byte.mode='idle';q.updateOutside(.016,performance.now());const after=q.byte.targetX;
      Object.assign(s,{breath:.8,breathX:0,breathY:-1});q.updateOutside(.032,performance.now());return {target,after,vy:q.byte.vy,trip:!!q.home.journey}});
    assert.equal(r.target,r.after);assert(r.trip&&r.vy<0);await context.close();
  });
  await check('Earth-grounded doorway travel uses an actual opening, and a ceiling does not become a sideways corridor',async()=>{
    const {context,page}=await open();await place(page,1);
    await page.evaluate(()=>{const q=__byteProbe;q.enableEarthGravity(true);q.earth.x=0;q.earth.y=-1650;q.byte.mode='air';q.byte.y=200});await step(page,3);
    assert.equal(await page.evaluate(()=>__byteProbe.home.request(0)),false);assert.equal(await page.evaluate(()=>__byteProbe.earth.support.edge),'top');
    await page.evaluate(()=>{const q=__byteProbe;q.earth.x=-1650;q.earth.y=0;q.byte.mode='air';q.byte.x=100;q.byte.y=300});await step(page,3);
    assert(await page.evaluate(()=>__byteProbe.home.request(0)));const trace=await step(page,4);assert(trace.some(v=>v.travel&&v.y>430));
    assert.equal(await page.evaluate(()=>__byteProbe.home.room),0);await context.close();
  });
  await check('backgrounding releases an interrupted object hand, and resizing during passage safely recontains Byte',async()=>{
    const {context,page,touch}=await open();await place(page,2);await step(page,1);
    const v=await page.evaluate(()=>({x:__byteProbe.home.things[0].x,y:__byteProbe.home.things[0].y}));await touch('touchStart',v.x,v.y);await touch('touchMove',260,600);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
    assert.equal(await page.evaluate(()=>__byteProbe.home.hand),null);await touch('touchEnd');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));__byteProbe.home.request(1)});
    for(let i=0;i<30;i++){await step(page,.1);if(await page.evaluate(()=>!!__byteProbe.home.travel))break;}
    assert(await page.evaluate(()=>!!__byteProbe.home.travel));await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);
    const r=await page.evaluate(()=>{const q=__byteProbe,e=q.bodyHalfExtents();return {travel:q.home.travel,left:q.byte.x-e.x,right:q.byte.x+e.x,w:q.world.w,finite:q.home.things.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y))}});
    assert(!r.travel&&r.left>=-.2&&r.right<=r.w+.2&&r.finite);await context.close();
  });
  assert(!errors.length,errors.join('\n'));fs.writeFileSync(path.join(out,'home-results.json'),JSON.stringify({results,errors},null,2));console.log('ERRORS',errors);await browser.close();if(results.some(v=>!v.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
