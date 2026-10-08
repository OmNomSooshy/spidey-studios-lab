/* X: one unsolicited request for help, and the difference between tidying and a racket.
   Intent uses the existing home journey, physical sponge and shared room rope. */
window.createByteHousehold=function(api){
  const {world,byte,life,home,bathroom,earth,web,obby,autonomy}=api;
  const state={act:null,pose:null,huffy:0,events:bathroom.dirtEvents,pending:false,cooldown:0,requests:0,noisyWakes:0};
  const filth=()=>bathroom.patches.reduce((n,p)=>n+p.dirt,0)/bathroom.patches.length;
  function seek(x){const ex=api.extents().x,target=Math.max(ex+4,Math.min(world.w-ex-4,x));
    if(Math.abs(byte.x-target)<14){byte.targetX=byte.targetY=null;if(byte.mode==='scuttle')byte.mode='idle';return true;}
    if(byte.mode==='idle'||byte.mode==='scuttle'){byte.targetX=target;byte.targetY=api.floorY();byte.mode='scuttle';}return false;}
  function cancel(){const act=state.act;if(!act)return;if(web.food===act.item)api.releaseFoodWeb();if(home.carried===act.item)home.drop();
    if(home.journey?.reason.startsWith('care-'))home.journey=null;
    if(home.activity?.kind==='care')home.activity=null;
    if(byte.mode==='scheming'||byte.mode==='scuttle')byte.mode=earth.enabled?'air':'idle';
    byte.targetX=byte.targetY=null;state.act=null;state.pose=null;state.cooldown=90;autonomy.choice=null;autonomy.idleTime=0;home.save();}
  function opportunity(){return state.pending&&state.cooldown<=0&&filth()>.62&&!earth.enabled&&!obby.hasLaunched&&life.phase==='awake'&&!home.travel&&!home.journey&&!home.activity&&!home.hand&&!home.carried&&!web.active&&!byte.grabbed;}
  function start(){if(!opportunity())return false;const item=home.things.find(v=>v.id==='sponge');if(!item)return false;
    state.pending=false;state.act={phase:'sniff',elapsed:0,total:0,item};state.requests++;home.activity={kind:'care'};autonomy.choice=null;return true;}
  function arrive(reason){if(!state.act)return;home.activity={kind:'care'};state.act.phase=reason==='care-bath'?'offer-walk':'seek';state.act.elapsed=0;}
  function noise(v,power){if(v.room!==home.room||home.travel||!['sleep','settling'].includes(life.phase)||power<1)return false;
    api.wakeByte();state.huffy=2.8;state.noisyWakes++;life.gazeX=v.x;life.gazeY=v.y;life.curious=0;api.voice('sour',.45);return true;}
  function update(dt){state.huffy=Math.max(0,state.huffy-dt);state.cooldown=Math.max(0,state.cooldown-dt);state.pose=null;
    if(byte.grabbed||life.pointer.kind==='byte'&&life.pointer.active)state.huffy=0;
    if(bathroom.dirtEvents>state.events){state.events=bathroom.dirtEvents;if(filth()>.62)state.pending=true;}
    if(filth()<.3)state.pending=false;
    const act=state.act;if(!act)return;
    if(byte.grabbed||home.hand||earth.enabled||obby.hasLaunched||life.phase!=='awake'||web.active&&web.food!==act.item){cancel();return;}
    if(home.travel||home.journey)return;
    act.elapsed+=dt;act.total+=dt;if(act.total>70||filth()<.3){cancel();return;}
    home.activity={kind:'care'};const v=act.item;life.gazeX=v.x;life.gazeY=v.y;
    if(act.phase==='sniff'){state.pose='sniff';if(act.elapsed>1.8){act.phase='seek';act.elapsed=0;const room=v.stored?2:v.room;if(room!==home.room)home.request(room,'care-search');}return;}
    if(act.phase==='seek'){
      if(v.stored){if(seek(home.possessions.chest().x-api.bodyW()*.28)){act.phase='rummage';act.elapsed=0;}return;}
      const close=Math.abs(v.x-byte.x)<api.bodyW()*.58+v.r&&Math.abs(v.y-byte.y)<api.bodyH()*.7;
      if(close){home.carried=v;act.phase='carry';act.elapsed=0;return;}
      if(seek(v.x)){act.phase='cast';act.elapsed=0;byte.mode='scheming';}return;}
    if(act.phase==='rummage'){state.pose='rummaging';home.possessions.lid=1;if(act.elapsed>1.9){home.possessions.takeOut('sponge',true);home.carried=v;act.phase='carry';act.elapsed=0;}return;}
    if(act.phase==='cast'){if(act.elapsed>1.15){byte.mode='idle';api.castFoodWeb(v);act.phase='reel';act.elapsed=0;api.voice('web',.5);}return;}
    if(act.phase==='reel'){
      if(web.food!==v){cancel();return;}web.progress=Math.min(1,act.elapsed/.25);web.reel=web.progress===1?140:0;web.deployedLength=Math.max(18,web.deployedLength-web.reel*dt);
      if(Math.hypot(v.x-byte.x,v.y-byte.y)<api.bodyH()*.6){api.releaseFoodWeb();home.carried=v;act.phase='carry';act.elapsed=0;}return;}
    if(act.phase==='carry'){act.phase='offer-walk';act.elapsed=0;if(home.room!==4)home.request(4,'care-bath',v);return;}
    if(act.phase==='offer-walk'){if(seek(world.w*.35)){act.phase='offer';act.elapsed=0;api.voice('pet',.5);}return;}
    // It is still the real, grabbable sponge. No water is switched on and no washing is faked.
    if(act.phase==='offer'){state.pose='expectant';life.gazeX=world.w*.5;life.gazeY=byte.y-api.bodyH()*.4;
      if(act.elapsed>3&&act.elapsed<3+dt)api.voice('notice',.35);
      if(act.elapsed>16){home.drop();cancel();}}
  }
  return Object.assign(state,{update,cancel,opportunity,start,arrive,noise,filth});
};
