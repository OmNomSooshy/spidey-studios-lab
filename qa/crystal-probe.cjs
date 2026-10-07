const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-crystal-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BYTE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[],checks=[],trace=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4191/')+'?probe');await page.waitForSelector('#arrival.ready');
 await page.evaluate(()=>{const q=__byteProbe;q.paused=true;q.life.welcomed=true;q.autonomy.choice='qa';Math.random=()=>.5});
 const cdp=await context.newCDPSession(page);
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]});}
 async function tap(x,y){await touch('touchStart',x,y);await touch('touchEnd');}
 async function step(seconds){return page.evaluate(seconds=>{const q=__byteProbe,dt=1/120,rows=[];
  for(let i=0;i<seconds/dt;i++){const vy=q.byte.vy;q.home.update(dt);q.update(dt,performance.now());q.updateLife(dt);q.updateAutonomy(dt);q.updateButtonWeb(dt);q.updateObby(dt);q.updateButtonPhysics(dt);q.containRoomBody();
   if(i%6===0||vy>0&&q.byte.vy<-800)rows.push({age:q.obby.launchAge,phase:q.obby.phase,seeded:q.obby.seeded,cam:q.obby.cameraY,x:q.byte.x,y:q.byte.y,vy:q.byte.vy,launch:q.obby.hasLaunched,platforms:q.obby.platforms.filter(p=>!p.launch).length,roof:q.crystal.project(q.world.w*.72,-q.world.h*.14).y,crystalEdge:q.crystal.project(q.world.w*.16,q.crystal.edgeAt(q.world.w*.16)).y,scale:q.crystal.view().scale,bounce:vy>0&&q.byte.vy<-800});
   for(const k of ['x','y','vx','vy','angle','spin'])if(!Number.isFinite(q.byte[k]))throw Error('nonfinite '+k);
  }q.draw(performance.now());return rows;
 },seconds);}
 async function snap(name){await page.screenshot({path:path.join(out,name+'.png'),scale:'css'});}
 async function state(){return page.evaluate(()=>{const q=__byteProbe;return{room:q.home.room,launched:q.obby.hasLaunched,phase:q.obby.phase,age:q.obby.launchAge,base:q.obby.crystalBase,cam:q.obby.cameraY,byte:{x:q.byte.x,y:q.byte.y,vy:q.byte.vy},platform:q.obby.platforms[0],half:q.halfH(),seeded:q.obby.seeded}});}
 await tap(370,630);await step(3);await tap(250,400);await step(4);let s=await state();assert.equal(s.room,3);assert(!s.launched);await snap('00-loft');checks.push('separate loft stays a normal room before actual platform contact');
 await touch('touchStart',s.byte.x,s.byte.y-20);await touch('touchMove',s.platform.x+s.platform.w*.5,s.platform.y-s.half-20);await page.waitForTimeout(180);await touch('touchEnd');
 for(let i=0;i<20&&!(await state()).launched;i++)await step(.025);s=await state();assert(s.launched&&s.phase==='launch');assert(s.byte.vy<-3000);assert(!s.seeded);checks.push('physical placement supplies one decisive launch with no ordinary ledges');
 const shots=[.15,.35,.55,.85,1.05,1.3,1.7,2.3,3.1];
 for(const target of shots){const current=(await state()).age;trace.push(...await step(Math.max(0,target-current)));await snap('flight-'+target.toFixed(2));}
 fs.writeFileSync(path.join(out,'launch-trace.json'),JSON.stringify(trace,null,2));
 const pure=trace.filter(r=>r.roof>844&&r.crystalEdge<0);assert(pure.length>6);assert(pure.every(r=>r.platforms===0));assert(pure.at(-1).age-pure[0].age>.45);checks.push('more than a readable half-second of actual clear sky separates house and crystal, with no ledges');
 assert(trace.some(r=>r.phase==='climb'&&r.bounce));assert(trace.filter(r=>r.bounce&&r.phase==='climb').every(r=>r.vy===-930));checks.push('first crystal ledge catches the launch and preserves ordinary bounce force');
 s=await state();assert(s.launched&&s.seeded);await snap('crystal-climb');
 await touch('touchStart',310,180);await page.waitForTimeout(110);await step(.24);assert(await page.evaluate(()=>__byteProbe.obby.web.active));
 const anchor=await page.evaluate(()=>{const q=__byteProbe;return{x:q.obby.web.anchorX,y:q.obby.web.anchorY,length:q.obby.web.length,vx:q.byte.vx,vy:q.byte.vy,material:q.crystal.contains(q.obby.web.anchorX,q.obby.web.anchorY)}});assert(anchor.material);await snap('web-contact');
 await touch('touchMove',80,240);const fixed=await page.evaluate(()=>({x:__byteProbe.obby.web.anchorX,y:__byteProbe.obby.web.anchorY}));assert.equal(fixed.x,anchor.x);assert.equal(fixed.y,anchor.y);checks.push('arbitrary screen placement attaches to material; held anchor stays fixed in world space');
 const momentum=await page.evaluate(()=>({vx:__byteProbe.byte.vx,vy:__byteProbe.byte.vy,spin:__byteProbe.byte.spin}));await touch('touchEnd');assert.deepEqual(await page.evaluate(()=>({vx:__byteProbe.byte.vx,vy:__byteProbe.byte.vy,spin:__byteProbe.byte.spin})),momentum);checks.push('release retains both linear momentum and swing spin');
 const slack=await page.evaluate(()=>{const q=__byteProbe,sp=q.spoolPosition();Object.assign(q.obby.web,{active:true,born:performance.now()-200,anchorX:sp.x+5,anchorY:sp.y-5,length:200});q.byte.vx=92;q.byte.vy=-43;const b={x:q.byte.x,y:q.byte.y};q.solveObbyWeb();q.obby.web.active=false;return{x:q.byte.x-b.x,y:q.byte.y-b.y,vx:q.byte.vx,vy:q.byte.vy}});assert.deepEqual(slack,{x:0,y:0,vx:92,vy:-43});checks.push('slack crystal rope still never pushes');
 // Material depth is a geometry invariant, alongside the screenshots: a known facet follows full camera travel.
 const parallax=await page.evaluate(()=>{const q=__byteProbe,old=q.obby.cameraY,a=q.crystal.project(100,q.obby.crystalBase-1000);q.obby.cameraY-=150;const b=q.crystal.project(100,q.obby.crystalBase-1000);q.obby.cameraY=old;return b.y-a.y});assert.equal(parallax,150);checks.push('near crystal features move with world/camera, independently of 12% distant-sky travel');
 // A controlled missed route still falls through actual gravity and the existing home-return solver.
 await page.evaluate(()=>{const q=__byteProbe;q.obby.platforms=q.obby.platforms.filter(p=>p.launch);q.obby.phase='fall';q.byte.vy=900;q.byte.vx=0;});await step(8);s=await state();assert.equal(s.room,3);assert(!s.launched);assert(await page.evaluate(()=>__byteProbe.life.scale>.98));await snap('return-loft');checks.push('missed route returns to room-scale loft rather than auto-bouncing on the launcher');
 // The next contact is another strong launch, not a stale ordinary platform.
 s=await state();await touch('touchStart',s.byte.x,s.byte.y-20);await touch('touchMove',s.platform.x+s.platform.w*.5,s.platform.y-s.half-20);await page.waitForTimeout(180);await touch('touchEnd');await step(.15);assert.equal((await state()).phase,'launch');assert(!(await state()).seeded);checks.push('return resets the route and permits another clean launch');
 await touch('touchStart',200,200);assert(await page.evaluate(()=>__byteProbe.obby.web.pending&&!__byteProbe.obby.web.active));await touch('touchEnd');assert(!await page.evaluate(()=>__byteProbe.obby.web.pending));checks.push('a released pre-surface hold cannot leave a fake empty-sky anchor');
 await touch('touchStart',200,180);assert(await page.evaluate(()=>__byteProbe.obby.web.pending));await step(1.6);assert(await page.evaluate(()=>__byteProbe.obby.web.active&&__byteProbe.crystal.contains(__byteProbe.obby.web.anchorX,__byteProbe.obby.web.anchorY)));await touch('touchEnd');checks.push('holding through clear sky can attach when the physical surface arrives');
 await page.evaluate(()=>{const q=__byteProbe;q.obby.web.active=false;q.obby.phase='climb';q.obby.cameraY=q.obby.crystalBase-1500;q.byte.y=q.obby.crystalBase-1300;q.byte.vy=-300;q.home.update(.01);q.draw(performance.now())});
 assert(await page.evaluate(()=>__byteProbe.home.found));await snap('fragment');checks.push('expedition fragment is discovered above the structure, preserving the existing physical possession');
 const render=await page.evaluate(()=>{const q=__byteProbe,start=performance.now();for(let i=0;i<120;i++)q.draw(start+i*16.7);return(performance.now()-start)/120});
 assert(!errors.length);fs.writeFileSync(path.join(out,'crystal-results.json'),JSON.stringify({checks,errors,renderMs:render,pureSkySeconds:pure.at(-1).age-pure[0].age},null,2));console.log('PASS',checks,'render ms',render);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
