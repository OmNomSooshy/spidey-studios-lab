const {chromium,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.BYTE_QA_OUTPUT||'/tmp/byte-crystal-performance';fs.mkdirSync(out,{recursive:true});
const baseline=process.env.BYTE_QA_BASELINE;
const source=fs.readFileSync(baseline||path.join(__dirname,'../crystal.js'),'utf8');
const variants=(process.env.BYTE_QA_VARIANTS||'').split(',').filter(Boolean);
if(!variants.length)variants.push(...(baseline?['full','no-refraction','no-gradients','no-fractures','no-crystal','no-sky','no-outdoor']:['full','no-crystal','no-sky','no-outdoor']));
const rates=(process.env.BYTE_QA_RATES||'1,6').split(',').map(Number);
const duration=Number(process.env.BYTE_QA_PERF_MS||2500);
const percentile=(values,p)=>{values.sort((a,b)=>a-b);return values[Math.min(values.length-1,Math.floor(values.length*p))]};
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(process.env.BYTE_QA_SOFTWARE?['--disable-gpu']:[])]});const results=[];
 for(const rate of rates)for(const variant of variants){
  const c=await b.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  let art=source;
  if(variant==='no-refraction')art=art.replace('if (light > .78)','if (false)');
  if(variant==='no-gradients')art=art.replace(/const tint = ctx.createLinearGradient[\s\S]*?ctx.fillStyle = tint; ctx.fill\(\);/,"ctx.fillStyle='rgba(100,180,195,.28)';ctx.fill();");
  if(variant==='no-fractures')art=art.replace('if (light > .68)','if (false)');
  if(['no-crystal','no-sky','no-outdoor'].includes(variant))art+=`\n{const create=window.createCrystalSky;window.createCrystalSky=api=>{const crystal=create(api);${variant!=='no-sky'?'crystal.draw=()=>{};':''}${variant!=='no-crystal'?'crystal.drawSky=()=>{};crystal.opening=()=>{};':''}return crystal}}`;
  await p.route('**/crystal.js',r=>r.fulfill({contentType:'application/javascript',body:art}));
  if(baseline){const game=fs.readFileSync(path.join(path.dirname(baseline),'baseline-game.js'),'utf8');await p.route('**/game.js',r=>r.fulfill({contentType:'application/javascript',body:game}));}
  await p.goto((process.env.BYTE_QA_URL||'http://127.0.0.1:4191/')+'?probe');await p.waitForSelector('#arrival.ready');
  const cdp=await c.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await p.evaluate(()=>{const q=__byteProbe;q.paused=true;q.life.welcomed=true;q.autonomy.choice='qa';q.home.room=3;q.home.cameraX=q.world.w*2;q.home.cameraY=-q.world.h;q.life.scale=.7;Object.assign(q.obby,{active:true,hasLaunched:true,seeded:true,crystalBase:-3000,cameraY:-4200,phase:'climb',highestPlatformY:-6000});q.obby.platforms=Array.from({length:5},(_,i)=>({x:60+(i%2)*140,y:-3500-i*180,w:100,h:18,crystal:true}));Object.assign(q.byte,{x:190,y:-3900,mode:'air',angle:0,spin:0,squash:0,stretch:0});document.body.classList.add('obby-away');window.perfFrames=[];window.perfStart=performance.now();function track(t){q.obby.cameraY=-4200-(t-perfStart)*.5;q.byte.y=q.obby.cameraY+320;perfFrames.push(t);requestAnimationFrame(track)}requestAnimationFrame(track)});
  await p.waitForTimeout(duration);
  const sample=await p.evaluate(()=>{const q=__byteProbe,v=perfFrames,intervals=v.slice(1).map((t,i)=>t-v[i]);return{intervals,frames:v.length,elapsed:v.at(-1)-v[0],dpr:q.world.dpr,cache:q.crystal.stats?.()}});
  // Drain the final bitmap each time: measure completed raster work, not just queued canvas commands.
  const raster=await p.evaluate(()=>{const q=__byteProbe,canvases=[...document.querySelectorAll('canvas')].filter(c=>c.getClientRects().length).map(c=>c.getContext('2d')),v=[];for(let i=0;i<24;i++){q.obby.cameraY-=8;q.byte.y=q.obby.cameraY+320;const t=performance.now();q.draw(t);for(const ctx of canvases)ctx.getImageData(0,0,1,1);v.push(performance.now()-t)}return v});
  const s={variant,rate,software:!!process.env.BYTE_QA_SOFTWARE,dpr:sample.dpr,fps:1000*(sample.frames-1)/sample.elapsed,medianFrameMs:percentile([...sample.intervals],.5),p95FrameMs:percentile([...sample.intervals],.95),medianRasterMs:percentile([...raster],.5),p95RasterMs:percentile([...raster],.95),cache:sample.cache,errors};assert(!errors.length);results.push(s);console.log(JSON.stringify(s));await c.close();
 }
 fs.writeFileSync(path.join(out,(baseline?'before':'after')+(process.env.BYTE_QA_SOFTWARE?'-software':'')+'.json'),JSON.stringify(results,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
