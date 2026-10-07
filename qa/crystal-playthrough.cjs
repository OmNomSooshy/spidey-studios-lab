const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-crystal-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BYTE_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox',...(process.env.BYTE_QA_SOFTWARE?['--disable-gpu']:[])]});
 const context=await browser.newContext({...devices['iPhone 13'],...(process.env.BYTE_QA_ANDROID?{userAgent:devices['Pixel 7'].userAgent}:{}),viewport:{width:390,height:844},...(!process.env.BYTE_QA_NOCAPTURE?{recordVideo:{dir:out,size:{width:390,height:844}}}:{}),permissions:['accelerometer','gyroscope']});
 await context.addInitScript(()=>{Math.random=()=>.5});
 const page=await context.newPage(),errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);
 if(process.env.BYTE_QA_CPU)await cdp.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.BYTE_QA_CPU)});
 for(const type of ['accelerometer','linear-acceleration','gyroscope']){
  await cdp.send('Emulation.setSensorOverrideEnabled',{enabled:true,type,metadata:{available:true,maximumFrequency:60,minimumFrequency:1}});
  await cdp.send('Emulation.setSensorOverrideReadings',{type,reading:{xyz:{x:0,y:type==='accelerometer'?9.81:0,z:0}}});
 }
 await page.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4191/')+'?probe');await page.waitForSelector('#arrival.ready');
 // No simulation stepping or body/phase writes: normal RAF plus actual touch and browser virtual sensors own the route.
 await page.evaluate(()=>{__byteProbe.life.welcomed=true;__byteProbe.autonomy.choice='qa';window.trustedMotion=0;addEventListener('devicemotion',e=>{if(e.isTrusted)trustedMotion++});window.touchDelays=[];for(const type of ['pointerdown','pointerup'])addEventListener(type,e=>touchDelays.push(performance.now()-e.timeStamp),{capture:true});window.longTasks=[];new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(e.duration)}).observe({type:'longtask'});window.flightFrames=[];function track(t){const q=__byteProbe;if(q.obby.hasLaunched)flightFrames.push({t,age:q.obby.launchAge,y:q.byte.y,x:q.byte.x,cam:q.obby.cameraY,seeded:q.obby.seeded,phase:q.obby.phase});requestAnimationFrame(track)}requestAnimationFrame(track)});
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]});}
 async function tap(x,y){await touch('touchStart',x,y);await touch('touchEnd');}
 async function snap(name){const s=await page.evaluate(()=>{const q=__byteProbe;return{room:q.home.room,phase:q.obby.phase,age:q.obby.launchAge,x:q.byte.x,y:q.byte.y,cam:q.obby.cameraY,web:q.obby.web.active,found:q.home.found}});samples.push({name,...s});if(!process.env.BYTE_QA_NOCAPTURE)await page.screenshot({path:path.join(out,'live-'+name+'.png'),scale:'css'});}
 await tap(370,630);await page.waitForFunction(()=>__byteProbe.home.room===2&&!__byteProbe.home.travel);
 await tap(250,400);await page.waitForFunction(()=>__byteProbe.home.room===3&&!__byteProbe.home.travel);await page.waitForFunction(()=>__byteProbe.obby.phase==='waiting');await snap('loft');
 const s=await page.evaluate(()=>{const q=__byteProbe,p=q.obby.platforms[0];return{x:q.byte.x,y:q.byte.y,px:p.x+p.w*.5,py:p.y-q.halfH()-22}});
 await touch('touchStart',s.x,s.y-20);for(let i=1;i<=8;i++){await touch('touchMove',s.x+(s.px-s.x)*i/8,s.y-20+(s.py-(s.y-20))*i/8);await page.waitForTimeout(20)}await page.waitForTimeout(180);await touch('touchEnd');
 await page.waitForFunction(()=>__byteProbe.obby.hasLaunched);await page.waitForTimeout(130);await snap('roof');
 await page.waitForFunction(()=>__byteProbe.obby.launchAge>.65);await snap('clear-sky');
 await page.waitForFunction(()=>__byteProbe.obby.seeded&&__byteProbe.obby.launchAge>1.6);await snap('crystal');
 await touch('touchStart',305,170);await page.waitForTimeout(650);assert(await page.evaluate(()=>__byteProbe.obby.web.active));await snap('swing');await touch('touchEnd');
 await cdp.send('Emulation.setSensorOverrideReadings',{type:'accelerometer',reading:{xyz:{x:-7,y:7,z:0}}});
 await page.waitForFunction(()=>__byteProbe.earth.x>1000);await snap('tilt');
 await page.waitForFunction(()=>!__byteProbe.obby.hasLaunched,undefined,{timeout:18000});
 await cdp.send('Emulation.setSensorOverrideReadings',{type:'accelerometer',reading:{xyz:{x:0,y:9.81,z:0}}});
 assert.equal(await page.evaluate(()=>__byteProbe.home.room),3);await page.waitForTimeout(850);await snap('return');
 await tap(250,810);await page.waitForFunction(()=>__byteProbe.home.room===2&&!__byteProbe.home.travel,undefined,{timeout:12000});await snap('downstairs');
 const frames=await page.evaluate(()=>({frames:flightFrames,motion:trustedMotion,touchDelays,longTasks,cache:__byteProbe.crystal.stats?.()}));assert(frames.motion>0);assert(frames.frames.some(v=>v.seeded));assert(samples.find(v=>v.name==='clear-sky').age<samples.find(v=>v.name==='crystal').age);assert(!errors.length);
 const exitStart=Date.now();await page.goto('about:blank');const exitMs=Date.now()-exitStart;
 fs.writeFileSync(path.join(out,'crystal-live-results.json'),JSON.stringify({samples,...frames,errors,exitMs,cpuRate:Number(process.env.BYTE_QA_CPU||1),software:!!process.env.BYTE_QA_SOFTWARE,androidChrome:!!process.env.BYTE_QA_ANDROID},null,2));
 const video=page.video();await context.close();if(video)await video.saveAs(path.join(out,'crystal-route.webm'));await browser.close();console.log('PASS normal-RAF loft launch, clear sky, crystal, real held rope, trusted tilt, missed return and ladder downstairs.',samples);
})().catch(e=>{console.error(e);process.exit(1)});
