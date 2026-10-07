const {chromium,devices}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-economy-live';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(process.env.BYTE_QA_SOFTWARE?['--disable-gpu']:[])]});
 const c=await b.newContext({...devices['Pixel 7'],viewport:{width:390,height:844},permissions:['accelerometer','gyroscope'],...(process.env.BYTE_QA_VIDEO?{recordVideo:{dir:out,size:{width:390,height:844}}}:{})});
 const p=await c.newPage(),errors=[],failed=[],trace=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 const cd=await c.newCDPSession(p);if(process.env.BYTE_QA_CPU)await cd.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.BYTE_QA_CPU)});
 for(const type of ['accelerometer','linear-acceleration','gyroscope']){await cd.send('Emulation.setSensorOverrideEnabled',{enabled:true,type,metadata:{available:true,maximumFrequency:60,minimumFrequency:1}});await cd.send('Emulation.setSensorOverrideReadings',{type,reading:{xyz:{x:0,y:type==='accelerometer'?9.81:0,z:0}}});}
 await p.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4195/')+'?probe');await p.waitForSelector('#arrival.ready');
 // Only competing idle opportunities are suppressed. Product RAF, touch and trusted sensor readings own every launch, collection, bounce and return.
 async function quiet(){await p.evaluate(()=>{const q=__byteProbe;q.life.welcomed=true;q.autonomy.choice='qa';window.frames=[];window.trustedMotion=0;addEventListener('devicemotion',e=>{if(e.isTrusted)trustedMotion++});function watch(t){if(q.obby.hasLaunched)frames.push(t);requestAnimationFrame(watch)}requestAnimationFrame(watch)})}await quiet();
 async function touch(type,x,y){await cd.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]})}
 async function tap(x,y){await touch('touchStart',x,y);await touch('touchEnd')}
 async function tilt(acc){await cd.send('Emulation.setSensorOverrideReadings',{type:'accelerometer',reading:{xyz:{x:-acc/1188*9.81,y:9.81,z:0}}})}
 async function read(){return p.evaluate(()=>{const q=__byteProbe;return{x:q.byte.x,y:q.byte.y,vx:q.byte.vx,vy:q.byte.vy,half:q.halfH(),bodyW:q.bodyW(),bodyH:q.bodyH(),spool:q.spoolPosition(),w:q.world.w,room:q.home.room,launch:q.obby.hasLaunched,phase:q.obby.phase,age:q.obby.launchAge,camera:q.obby.cameraY,balance:q.economy.balance,collected:q.economy.collected,seed:q.economy.seed,trophies:q.economy.trophies,platforms:q.obby.platforms.map(v=>({x:v.x,y:v.y,w:v.w,launch:!!v.launch})),pickups:q.economy.pickups.map(v=>({x:v.x,y:v.y,taken:!!v.taken})),things:q.home.things.filter(v=>v.trophy).map(v=>({id:v.id,x:v.x,y:v.y,room:v.room})),equipped:q.economy.equipped,owned:q.economy.owned.slice()}})}
 async function snap(name){await p.screenshot({path:path.join(out,name+'.png'),scale:'css'})}
 await tap(370,630);await p.waitForFunction(()=>__byteProbe.home.room===2&&!__byteProbe.home.travel);await tap(250,400);await p.waitForFunction(()=>__byteProbe.home.room===3&&!__byteProbe.home.travel);await p.waitForFunction(()=>__byteProbe.obby.phase==='waiting');
 const runs=[],misses=[];
 async function expedition(number){await tilt(0);await p.evaluate(()=>{__byteProbe.autonomy.choice='qa'});await p.waitForFunction(()=>__byteProbe.obby.phase==='waiting');await p.waitForFunction(()=>Math.hypot(__byteProbe.byte.vx,__byteProbe.byte.vy)<80,undefined,{timeout:20000});let s=await read(),spring=s.platforms.find(v=>v.launch);const grabX=s.x-(s.spool.x-s.x)*.8,grabY=s.y-(s.spool.y-s.y)*.8,offsetX=grabX-s.x,offsetY=grabY-s.y;
   await touch('touchStart',grabX,grabY);assert(await p.evaluate(()=>__byteProbe.byte.grabbed),'actual finger missed moving Byte or hit an affordance');for(let i=1;i<=8;i++){await touch('touchMove',grabX+(spring.x+spring.w*.5+offsetX-grabX)*i/8,grabY+(spring.y-s.half-22+offsetY-grabY)*i/8);await p.waitForTimeout(25)}await p.waitForTimeout(180);await touch('touchEnd');await p.waitForFunction(()=>__byteProbe.obby.hasLaunched);
   let landingY=null,lastVy=-9999,bounces=0,fall=false,route=null,started=Date.now();
   while(Date.now()-started<45000){s=await read();if(!s.launch)break;
     const ledges=s.platforms.filter(v=>!v.launch).sort((a,b)=>b.y-a.y);if(ledges.length&&!route)route=ledges.map(v=>({x:v.x,w:v.w,relativeY:v.y-ledges[0].y}));
     if(lastVy>0&&s.vy<-850&&s.phase==='climb'){landingY=s.y+s.half;bounces++;}
     lastVy=s.vy;if(s.collected>=5&&!fall){fall=true;await snap('run-'+number+'-five-collected');}
     let target;
     if(fall){const below=ledges.filter(v=>v.y>=s.y+s.half-2).sort((a,b)=>a.y-b.y)[0];target=below&&below.x+below.w*.5>s.w*.5?50:s.w-50;}
     else if(s.phase==='launch')target=ledges[0]?ledges[0].x+ledges[0].w*.5:spring.x+spring.w*.5;
     else {const next=landingY===null?ledges.find(v=>v.y>s.y+s.half):ledges.find(v=>v.y<landingY-25);target=next?next.x+next.w*.5:s.x;}
     const acc=Math.max(-1188,Math.min(1188,(target-s.x)*32-s.vx*10));await tilt(acc);
     if(trace.length%5===0||s.collected>=5)trace.push({run:number,x:s.x,y:s.y,vx:s.vx,vy:s.vy,collected:s.collected,phase:s.phase,target,bounces});else trace.push({run:number,collected:s.collected});
     await p.waitForTimeout(35);
   }
   assert(!s.launch,'missed route did not return');await tilt(0);await p.waitForTimeout(1100);
   if(s.collected<5){misses.push({number,returned:s,route,sensors:await p.evaluate(()=>({trustedMotion,frames}))});console.log('OBSERVED legitimate miss: collected',s.collected,'banked balance',s.balance);return false;}
   assert.equal(s.room,3);assert(s.things.length>=number);await snap('run-'+number+'-fragment-home');runs.push({number,route,bounces,returned:s,sensors:await p.evaluate(()=>({trustedMotion,frames}))});console.log('PASS real run',number,'collected',s.collected,'bounces',bounces,'trophies',s.trophies);return true;
 }
 async function successful(number){for(let attempt=0;attempt<4;attempt++)if(await expedition(number))return;throw Error('controller missed four genuine expeditions')}
 await successful(1);let before=await read();await p.locator('#crystal-wallet').click();await p.waitForSelector('#crystal-shop[open]');await snap('shop-before-buy');
 await p.locator('[data-item="cloud-cap"] [data-action="buy"]').click();let bought=await read();assert.equal(bought.balance,before.balance-5);assert(bought.owned.includes('cloud-cap'));assert.equal(bought.equipped,null);assert.equal(bought.trophies,before.trophies);await snap('owned-not-equipped');
 await p.locator('[data-item="cloud-cap"] [data-action="equip"]').click();assert.equal((await read()).equipped,'cloud-cap');await p.locator('#shop-close').click();await snap('worn-in-loft');
 await p.reload();await p.waitForSelector('#arrival.ready');await quiet();let reload=await read();assert(reload.owned.includes('cloud-cap')&&reload.equipped==='cloud-cap');assert.equal(reload.balance,bought.balance);assert.equal(reload.things.length,bought.things.length);
 await p.waitForFunction(()=>__byteProbe.obby.phase==='waiting');await successful(2);assert.notEqual(runs[0].returned.seed,runs[1].returned.seed);assert.notDeepEqual(runs[0].route,runs[1].route);assert((await read()).balance>=bought.balance+5);assert((await read()).trophies>=2);
 await p.locator('#crystal-wallet').click();const walletBeforeRemove=(await read()).balance;await p.locator('[data-item="cloud-cap"] [data-action="equip"]').click();assert.equal((await read()).equipped,null);assert.equal((await read()).balance,walletBeforeRemove);await p.locator('#shop-close').click();await p.reload();await p.waitForSelector('#arrival.ready');await quiet();const final=await read();assert(final.owned.includes('cloud-cap')&&final.equipped===null&&final.trophies>=2&&final.things.length>=2);
 const perf=await p.evaluate(()=>({trustedMotion,frames}));assert(runs.every(v=>v.sensors.trustedMotion>0));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(out,'economy-live.json'),JSON.stringify({runs,misses,before,bought,reload,final,errors,failed,perf,trace,cpu:Number(process.env.BYTE_QA_CPU||1)},null,2));
 console.log('PASS two fresh tilt-played runs, physical pickup earning, fragments, purchase != equip, persistence, remove without repurchase.');await c.close();await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
