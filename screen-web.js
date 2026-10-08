/* One personal prank. Elastic strand distances and screen attachments are interrogable,
   not an overlay's dismissal state. A detached mesh falls under its own gravity. */
window.createByteScreenWeb=function(api){
  const {world,byte,life,home,web,obby}=api,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const state={phase:'waiting',elapsed:0,idle:0,proud:0,nodes:[],links:[],hand:null,shots:0,peeled:0,nextAt:18,clock:0,broken:0};
  // Silk is a composited physical layer. Resting strands need no repaint; the
  // constraint solver remains live even when the rasterized result is reused.
  const glass=document.createElement('canvas');glass.id='screen-web-silk';glass.width=glass.height=0;glass.setAttribute('aria-hidden','true');api.ctx.canvas.after(glass);const ctx=glass.getContext('2d');
  let rendered=[],renderedPhase='',renderedHand=false,paintCount=0;
  function surface(){const dpr=Math.min(devicePixelRatio||1,1.25),w=Math.round(world.w*dpr),h=Math.round(world.h*dpr);if(glass.width!==w||glass.height!==h){glass.width=w;glass.height=h;ctx.setTransform(dpr,0,0,dpr,0,0);rendered=[];renderedPhase='';}glass.style.display='block';}
  function eligible(){return !document.querySelector('dialog[open]')&&!api.busy()&&life.phase==='awake'&&!life.pointer.active&&!byte.grabbed&&!web.active&&!obby.hasLaunched&&!home.travel&&!home.journey&&!home.activity&&!home.hand&&!home.carried;}
  function start(){if(state.phase!=='waiting'||!eligible())return false;state.phase='scheming';state.elapsed=0;state.idle=0;if(!api.garden?.active)byte.mode='scheming';api.voice('notice',.4);return true;}
  function cancel(){if(['scheming','shot'].includes(state.phase)){state.phase='waiting';state.elapsed=0;state.nextAt=state.clock+70;if(byte.mode==='scheming')byte.mode='idle';}}
  function mesh(){state.nodes=[];state.links=[];state.broken=0;const cols=7,rows=5,left=world.w*.16,top=world.h*.26,w=world.w*.68,h=Math.min(world.h*.3,230);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const px=left+x*w/(cols-1),py=top+y*h/(rows-1);const attached=(y===0||y===rows-1)&&(x===0||x===3||x===6)||x===0&&y===2||x===6&&y===2;
      state.nodes.push({x:px,y:py,px,py,ax:px,ay:py,attached,threshold:33+(x+y)%3*12});}
    const edge=(i,j)=>{const a=state.nodes[i],b=state.nodes[j];state.links.push({a:i,b:j,length:Math.hypot(a.x-b.x,a.y-b.y)});};
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*cols+x;if(x<cols-1)edge(i,i+1);if(y<rows-1)edge(i,i+cols);if(x<cols-1&&y<rows-1)edge(i,i+cols+1);}
    state.phase='attached';state.shots++;state.elapsed=0;api.voice('web',.8);api.tactile(.5);if(byte.mode==='scheming')byte.mode='idle';}
  function begin(x,y,id){if(state.phase!=='attached')return false;let nearest=-1,best=55;
    for(let i=0;i<state.nodes.length;i++){const n=state.nodes[i],d=Math.hypot(n.x-x,n.y-y);if(d<best){best=d;nearest=i;}}
    if(nearest<0)return false;state.hand={id,node:nearest,x,y,dx:state.nodes[nearest].x-x,dy:state.nodes[nearest].y-y,travel:0,lastX:x,lastY:y};api.tactile(.2);return true;}
  function move(x,y,id){const h=state.hand;if(!h||h.id!==id)return false;h.travel+=Math.hypot(x-h.lastX,y-h.lastY);h.x=x;h.y=y;h.lastX=x;h.lastY=y;return true;}
  function end(id){if(!state.hand||state.hand.id!==id)return false;state.hand=null;return true;}
  function update(dt){state.clock+=dt;state.proud=Math.max(0,state.proud-dt);
    if(state.phase==='waiting'){if(eligible()){state.idle+=dt;if(state.clock>state.nextAt&&state.idle>9)start();}else state.idle=0;return;}
    if(state.phase==='scheming'||state.phase==='shot'){if(!eligible()){cancel();return;}state.elapsed+=dt;if(state.phase==='scheming'&&state.elapsed>1.5){state.phase='shot';state.elapsed=0;api.voice('web',.7);}else if(state.phase==='shot'&&state.elapsed>.32)mesh();return;}
    const held=state.hand,free=!state.nodes.some(n=>n.attached);state.elapsed+=dt;
    for(let i=0;i<state.nodes.length;i++){const n=state.nodes[i];if(held?.node===i){n.px=n.x;n.py=n.y;n.x=held.x+held.dx;n.y=held.y+held.dy;continue;}const vx=(n.x-n.px)*.96,vy=(n.y-n.py)*.96;n.px=n.x;n.py=n.y;if(!n.attached){n.x+=vx;n.y+=vy+(free?800:32)*dt*dt;}}
    for(let pass=0;pass<7;pass++){
      for(const l of state.links){const a=state.nodes[l.a],b=state.nodes[l.b],dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.01,Math.sqrt(dx*dx+dy*dy)),error=(d-l.length)/d*.42;const ah=held?.node===l.a,bh=held?.node===l.b;
        if(!ah){a.x+=dx*error;a.y+=dy*error;}if(!bh){b.x-=dx*error;b.y-=dy*error;}}
      for(let i=0;i<state.nodes.length;i++){const n=state.nodes[i];if(n.attached){const tension=Math.hypot(n.x-n.ax,n.y-n.ay);if(held&&tension>n.threshold){n.attached=false;state.broken++;api.tactile(.27);api.voice('tap',.2);}else if(held?.node!==i){n.x=n.ax;n.y=n.ay;}}
        if(held?.node===i){n.x=held.x+held.dx;n.y=held.y+held.dy;}}
    }
    if(!state.nodes.some(n=>n.attached)&&state.peeled<state.shots){state.peeled=state.shots;state.proud=3.8;api.voice('crime',.7);}
    if(!held&&state.nodes.every(n=>n.y>world.h+30)){state.phase='waiting';state.nodes=[];state.links=[];state.nextAt=state.clock+240;state.idle=0;}
  }
  function draw(){if(!['shot','attached'].includes(state.phase)){if(glass.width){glass.width=glass.height=0;glass.style.display='none';rendered=[];renderedPhase='';}return;}surface();
    const changed=state.phase==='shot'||state.phase!==renderedPhase||!!state.hand!==renderedHand||state.nodes.some((n,i)=>!rendered[i]||Math.abs(n.x-rendered[i].x)>.25||Math.abs(n.y-rendered[i].y)>.25||n.attached!==rendered[i].attached);
    if(!changed)return;ctx.clearRect(0,0,world.w,world.h);rendered=state.nodes.map(n=>({x:n.x,y:n.y,attached:n.attached}));renderedPhase=state.phase;renderedHand=!!state.hand;paintCount++;
    if(state.phase==='shot'){const a=api.garden?.active?api.garden.spoolPoint():api.spoolPosition();ctx.strokeStyle='#fffae9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);const f=clamp(state.elapsed/.3,0,1);ctx.lineTo(a.x+(world.w*.5-a.x)*f,a.y+(world.h*.39-a.y)*f);ctx.stroke();}
    if(state.phase!=='attached')return;ctx.save();ctx.lineCap='round';
    for(const style of [['#50696a77',4],['#fff9e8',2]]){ctx.strokeStyle=style[0];ctx.lineWidth=style[1];ctx.beginPath();for(const l of state.links){const a=state.nodes[l.a],b=state.nodes[l.b];ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();}
    for(const n of state.nodes)if(n.attached){ctx.fillStyle='#fffaf0';ctx.strokeStyle='#789292';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(n.ax,n.ay,6,4,.3,0,7);ctx.fill();ctx.stroke();}
    if(state.hand){const n=state.nodes[state.hand.node];ctx.strokeStyle='#f0bb73';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,10,0,7);ctx.stroke();}ctx.restore();}
  function resize(sx,sy){for(const n of state.nodes)for(const k of ['x','px','ax','y','py','ay'])n[k]*=['x','px','ax'].includes(k)?sx:sy;for(const l of state.links){const a=state.nodes[l.a],b=state.nodes[l.b];l.length=Math.hypot(a.ax-b.ax,a.ay-b.ay);}state.hand=null;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){state.hand=null;cancel();}});
  return Object.assign(state,{start,cancel,begin,move,end,update,draw,resize,paintStats:()=>({paints:paintCount,bytes:glass.width*glass.height*4})});
};
