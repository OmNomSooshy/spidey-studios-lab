const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-bath-read';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const c=await b.newContext({...devices['Pixel 7'],viewport:{width:390,height:844},deviceScaleFactor:2}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4192/')+'?probe');await p.waitForSelector('#arrival.ready');
 // Normal RAF owns water/body simulation. Suppress only competing autonomous opportunities.
 await p.evaluate(()=>{__byteProbe.life.welcomed=true;__byteProbe.autonomy.choice='qa'});
 const cd=await c.newCDPSession(p);async function touch(type,x,y){await cd.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x,y,radiusX:5,radiusY:5,force:1}]})}
 async function tap(x,y){await touch('touchStart',x,y);await touch('touchEnd')}
 async function sample(name){const v=await p.evaluate(()=>{const q=__byteProbe;return{fill:q.bathroom.fill,surface:q.bathroom.geometry().surface,draining:q.bathroom.draining,drain:q.bathroom.drainGeometry(),body:{x:q.byte.x,y:q.byte.y,vy:q.byte.vy},wet:q.bathroom.wet}});await p.screenshot({path:path.join(out,'read-'+name+'.png'),scale:'css'});return{name,...v}}
 await tap(25,630);await p.waitForFunction(()=>__byteProbe.home.room===0&&!__byteProbe.home.travel);
 const nook=await p.evaluate(()=>({inside:__byteProbe.home.portal(39,730),edge:__byteProbe.home.portal(25,630)}));assert.equal(nook.inside,null);assert.equal(nook.edge,4);
 await p.screenshot({path:path.join(out,'read-nook.png'),scale:'css'});
 await tap(25,630);await p.waitForFunction(()=>__byteProbe.home.room===4&&!__byteProbe.home.travel);
 const g=await p.evaluate(()=>__byteProbe.bathroom.geometry()),body=await p.evaluate(()=>({x:__byteProbe.byte.x,y:__byteProbe.byte.y}));
 await touch('touchStart',body.x,body.y-25);assert(await p.evaluate(()=>__byteProbe.byte.grabbed));await touch('touchMove',180,625);await p.waitForTimeout(200);await touch('touchEnd');await p.waitForTimeout(600);
 const samples=[await sample('empty')];await tap(g.tapX-12,g.tapY-24);
 for(const [name,level]of [['low',.3],['half',.6],['full',.98]]){await p.waitForFunction(level=>__byteProbe.bathroom.fill>=level,level);samples.push(await sample(name))}
 assert(samples.every((s,i)=>!i||s.surface<samples[i-1].surface));assert(samples[3].wet>.5);
 await tap(g.tapX-12,g.tapY-24);const d=await p.evaluate(()=>__byteProbe.bathroom.drainGeometry());await tap(d.x,d.plugY);
 assert(await p.evaluate(()=>__byteProbe.bathroom.draining));samples.push(await sample('open-plug'));
 assert.equal(samples[4].drain.plugY,samples[3].drain.plugY-42);
 await p.waitForFunction(()=>__byteProbe.bathroom.fill<.45);samples.push(await sample('draining'));
 await p.waitForFunction(()=>__byteProbe.bathroom.fill===0);samples.push(await sample('drained'));
 assert(samples[5].surface>samples[4].surface&&samples[6].surface>samples[5].surface);
 // Rim chain handle retains its original operation; front remains drawn while crossing rooms.
 await tap(g.tapX-12,g.tapY-24);await p.waitForFunction(()=>__byteProbe.bathroom.fill>.25);await tap(g.tapX-12,g.tapY-24);await tap(d.handleX,d.handleY);assert(await p.evaluate(()=>__byteProbe.bathroom.draining));
 await tap(370,630);await p.waitForFunction(()=>__byteProbe.home.travel&&Math.abs(__byteProbe.home.offset(4))>80);await p.screenshot({path:path.join(out,'read-passage.png'),scale:'css'});
 await p.waitForFunction(()=>__byteProbe.home.room===0&&!__byteProbe.home.travel);
 const layouts=[];for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await p.setViewportSize(size);await p.waitForTimeout(150);const r=await p.evaluate(()=>{const q=__byteProbe,g=bytePassageBounds(q.world.w,q.world.h,q.bodyH());return{...g,nookLeft:q.world.w*.09,inside:q.home.portal(q.world.w*.10,q.world.h-50)}});assert(r.width+2<r.nookLeft&&r.hitWidth<r.nookLeft);assert.equal(r.inside,null);layouts.push({size,...r})}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'bath-read-results.json'),JSON.stringify({samples,nook,layouts,errors,normalRAF:true,actualTouch:true},null,2));console.log('PASS actual fill/drain waterline, linked stopper and rim controls, wet body, transition, compact passage/nook separation');await c.close();
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
