const {chromium,devices}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-acting-performance';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});try{const results=[];
 for(const source of ['sunburn-v','sunburn-vi'])for(const phase of ['awake','sleep']){
  const c=await b.newContext({...devices['Pixel 7'],viewport:{width:390,height:844},deviceScaleFactor:2});await c.addInitScript(()=>Math.random=()=>.5);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const cd=await c.newCDPSession(p);await cd.send('Emulation.setCPUThrottlingRate',{rate:6});
  await p.goto((source==='sunburn-v'?(process.env.BYTE_QA_BASELINE||'http://127.0.0.1:4193/'):(process.env.BYTE_QA_URL||'http://127.0.0.1:4194/'))+'?probe');await p.waitForSelector('#arrival.ready');
  const frame=await p.evaluate(phase=>{const q=__byteProbe;q.paused=true;q.home.cancel();q.home.room=0;q.home.cameraX=q.home.cameraY=0;q.life.phase=phase;q.life.elapsed=5;q.life.welcomed=true;q.life.curious=q.life.pet=q.life.reactionBlink=q.life.waking=0;Object.assign(q.byte,{x:134,y:phase==='sleep'?656:q.floorY(),vx:0,vy:0,spin:0,angle:phase==='sleep'?2.4:0,mode:phase==='sleep'?'air':'idle',facing:-1,frame:0,squash:0,stretch:0,wallSquish:0,grabSquishX:0,grabSquishY:0});Object.assign(q.life.nest,{active:phase==='sleep',x:162,y:522,length:155,fade:0});q.draw(performance.now());return q.bodyGeometry().frame.src},phase);
  assert(frame.endsWith(phase==='awake'?'/idle.png':source==='sunburn-v'?'/blink.png':'/asleep.png'));await p.waitForTimeout(700);
  // Frozen matching physical scenes, ordinary product RAF rendering, read-only frame timing.
  const sample=await p.evaluate(()=>new Promise(resolve=>{const ts=[];function record(t){ts.push(t);if(t-ts[0]<3000)requestAnimationFrame(record);else resolve(ts)}requestAnimationFrame(record)}));
  const raster=await p.evaluate(()=>{const q=__byteProbe,ctx=document.querySelector('#scene').getContext('2d'),v=[];for(let i=0;i<15;i++){const start=performance.now();q.draw(performance.now());ctx.getImageData(0,0,1,1);v.push(performance.now()-start)}return v});
  const intervals=sample.slice(1).map((t,i)=>t-sample[i]),pct=(v,f)=>[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor(v.length*f))];const result={source,phase,frame,cpuRate:6,software:true,dpr:2,fps:1000*(sample.length-1)/(sample.at(-1)-sample[0]),p95FrameMs:pct(intervals,.95),medianCompletedRasterMs:pct(raster,.5),p95CompletedRasterMs:pct(raster,.95),errors};results.push(result);console.log(JSON.stringify(result));assert.deepEqual(errors,[]);await c.close();
 }
 fs.writeFileSync(path.join(out,'acting-performance.json'),JSON.stringify(results,null,2));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
