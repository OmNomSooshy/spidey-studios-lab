const{chromium,devices}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-kitchen-live';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(process.env.BYTE_QA_SOFTWARE?['--disable-gpu']:[])]});try{
 const c=await b.newContext({...devices['Pixel 7'],viewport:{width:390,height:844},deviceScaleFactor:2,...(!process.env.BYTE_QA_NOCAPTURE?{recordVideo:{dir:out,size:{width:390,height:844}}}:{})});
 const p=await c.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)requests.push(r.url())});const cd=await c.newCDPSession(p);
 if(process.env.BYTE_QA_CPU)await cd.send('Emulation.setCPUThrottlingRate',{rate:+process.env.BYTE_QA_CPU});
 await p.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4193/')+'?probe');await p.waitForSelector('#arrival.ready');
 // Read-only instrumentation. No autonomy overrides, body writes or simulation stepping drive this route.
 await p.evaluate(()=>{window.kitchenTrace=[];window.kitchenDelays=[];window.kitchenTasks=[];for(const type of ['pointerdown','pointerup'])addEventListener(type,e=>kitchenDelays.push(performance.now()-e.timeStamp),{capture:true});new PerformanceObserver(l=>kitchenTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask'});function track(t){const q=__byteProbe;if(q.home.room===5&&!q.home.travel)kitchenTrace.push({t,phase:q.kitchen.phase,mode:q.byte.mode,x:q.byte.x,y:q.byte.y,angle:q.byte.angle,web:q.web.active,planted:q.web.planted,food:q.web.food?.id,meals:q.kitchen.meals,biscuits:q.home.things.filter(v=>v.food&&!v.vegetable).map(v=>({id:v.id,x:v.x,y:v.y,bites:v.bites,shelf:v.onShelf})),frame:q.bodyGeometry().frame?.src});requestAnimationFrame(track)}requestAnimationFrame(track)});
 async function touch(type,x,y){await cd.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]})}
 async function tap(x,y){await touch('touchStart',x,y);await touch('touchEnd')}
 async function snap(n){if(!process.env.BYTE_QA_NOCAPTURE)await p.screenshot({path:path.join(out,'kitchen-live-'+n+'.png'),scale:'css'})}
 await tap(370,630);await p.waitForFunction(()=>__byteProbe.home.room===2&&!__byteProbe.home.travel);
 await tap(370,630);await p.waitForFunction(()=>__byteProbe.home.room===5&&!__byteProbe.home.travel);await snap('arrival');
 await p.waitForFunction(()=>__byteProbe.kitchen.phase==='scheming',undefined,{timeout:20000});await snap('scheming');
 await p.waitForFunction(()=>__byteProbe.web.food&&__byteProbe.web.progress===1);await snap('rope');
 await p.waitForFunction(()=>__byteProbe.home.things.some(v=>v.food&&!v.vegetable&&!v.onShelf&&v.bites===4&&v.y>500));await snap('stolen');
 await p.waitForFunction(()=>__byteProbe.kitchen.meals===1,undefined,{timeout:18000});await snap('eaten');
 const f=await p.evaluate(()=>{const v=__byteProbe.home.things.find(v=>v.food&&v.bites===4);return{id:v.id,x:v.x,y:v.y}});
 await touch('touchStart',f.x,f.y);assert.equal(await p.evaluate(()=>__byteProbe.home.hand?.item.id),f.id);
 const m=await p.evaluate(()=>__byteProbe.kitchen.mouth());for(let i=1;i<=8;i++){await touch('touchMove',f.x+(m.x-f.x)*i/8,f.y+(m.y-f.y)*i/8);await p.waitForTimeout(25)}
 await p.waitForFunction(id=>__byteProbe.home.things.find(v=>v.id===id).bites===3,f.id);await snap('offered-bite');
 await touch('touchMove',100,500);const after=await p.evaluate(id=>__byteProbe.home.things.find(v=>v.id===id).bites,f.id);await p.waitForTimeout(700);assert.equal(await p.evaluate(id=>__byteProbe.home.things.find(v=>v.id===id).bites,f.id),after);
 const m2=await p.evaluate(()=>__byteProbe.kitchen.mouth());await touch('touchMove',m2.x,m2.y);await p.waitForFunction(()=>__byteProbe.kitchen.meals===2);await touch('touchEnd');await snap('fed');
 const last=await p.evaluate(()=>{const v=__byteProbe.home.things.find(v=>v.food&&v.bites===4);return{id:v.id,x:v.x,y:v.y}});
 await touch('touchStart',last.x,last.y);await touch('touchMove',25,630);await p.waitForTimeout(180);await touch('touchEnd');await p.waitForFunction(()=>__byteProbe.home.room===2&&!__byteProbe.home.travel);
 assert.equal(await p.evaluate(id=>__byteProbe.home.things.find(v=>v.id===id).room,last.id),2);
 await tap(25,630);await p.waitForFunction(()=>__byteProbe.home.room===1&&!__byteProbe.home.travel);
 const result=await p.evaluate(()=>({trace:kitchenTrace,delays:kitchenDelays,longTasks:kitchenTasks,meals:__byteProbe.kitchen.meals,mud:__byteProbe.bathroom.patches.map(p=>({dirt:p.dirt,stains:p.stains})),things:__byteProbe.home.things.filter(v=>v.food).map(v=>({id:v.id,room:v.room,bites:v.bites}))}));
 const schemes=result.trace.filter(s=>s.phase==='scheming');assert(schemes.length>0&&schemes.every(s=>!s.web&&s.frame.endsWith('/scheming.png')));assert(schemes.at(-1).t-schemes[0].t>950);
 assert(result.trace.some(s=>s.food&&s.web&&!s.planted));assert(result.trace.some(s=>s.biscuits.some(v=>!v.shelf&&v.y>500&&v.bites===4)));
 await p.reload();await p.waitForSelector('#arrival.ready');assert.equal(await p.evaluate(()=>__byteProbe.kitchen.meals),2);assert.equal(await p.evaluate(()=>__byteProbe.home.things.filter(v=>v.food&&v.bites===0).length),2);
 const exit=Date.now();await p.goto('about:blank');result.exitMs=Date.now()-exit;result.errors=errors;result.requests=requests;result.cpuRate=+(process.env.BYTE_QA_CPU||1);result.software=!!process.env.BYTE_QA_SOFTWARE;assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 fs.writeFileSync(path.join(out,'kitchen-live-results'+(process.env.BYTE_QA_CPU?'-constrained':'')+'.json'),JSON.stringify(result,null,2));const video=p.video();await c.close();if(video)await video.saveAs(path.join(out,'kitchen-route.webm'));
 console.log('PASS normal RAF + actual Android touch: discover kitchen, natural scheme/physical theft/eat, offer/withdraw/feed, portable food, remembered bites/meals');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
