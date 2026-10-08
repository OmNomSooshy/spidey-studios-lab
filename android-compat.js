/* Android adapter only: real platform data and lifecycle; game controllers stay authoritative. */
(() => {
  const native = window.LittleBobNative;
  if (!native) return;
  let hidden = false, nativeMotionAt = -Infinity;
  const pointers = new Map(), contexts = new Set(), resumeAudio = new Set();
  const hiddenGetter = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')?.get;
  const visibilityGetter = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')?.get;
  Object.defineProperty(document, 'hidden', {get: () => hidden || (hiddenGetter?.call(document) ?? false)});
  Object.defineProperty(document, 'visibilityState', {get: () => hidden ? 'hidden' : (visibilityGetter?.call(document) ?? 'visible')});
  addEventListener('pointerdown', e => pointers.set(e.pointerId, e.target), true);
  for (const kind of ['pointerup','pointercancel']) addEventListener(kind, e => pointers.delete(e.pointerId), true);
  for (const name of ['AudioContext','webkitAudioContext']) {
    const Original = window[name];
    if (Original) window[name] = class extends Original {constructor(...args) {super(...args);contexts.add(this);}};
  }
  addEventListener('devicemotion', e => {
    if (!e.littleBobNative && Number.isFinite(e.accelerationIncludingGravity?.x)) nativeMotionAt = performance.now();
  }, {passive:true});
  if (native.motionAvailable()) {
    window.DeviceMotionEvent ||= Event;
    if (!DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission = () => Promise.resolve('granted');
  }
  const battery = new EventTarget(); Object.assign(battery, {charging:false,level:1,chargingTime:Infinity,dischargingTime:Infinity});
  // Android WebView may omit Battery Status; values come from the real battery broadcast.
  if (!navigator.getBattery) navigator.getBattery = async () => battery;
  window.LittleBobLifecycle = {
    motion(sample) {
      if (hidden || performance.now()-nativeMotionAt<1000) return; // Never duplicate native WebView sensor events.
      const event = new Event('devicemotion');
      for (const [key,value] of Object.entries({...sample,littleBobNative:true})) Object.defineProperty(event,key,{value});
      dispatchEvent(event);
    },
    battery(sample) {
      const charging = battery.charging!==sample.charging, level=battery.level!==sample.level;
      Object.assign(battery,sample);if(charging)battery.dispatchEvent(new Event('chargingchange'));if(level)battery.dispatchEvent(new Event('levelchange'));
    },
    pause() {
      if(hidden)return;
      for(const [pointerId,target] of [...pointers])target.dispatchEvent(new PointerEvent('pointercancel',{pointerId,bubbles:true}));
      pointers.clear();hidden=true;
      document.dispatchEvent(new Event('visibilitychange')); // Existing save, XI, camera/mic and hand cleanup handlers.
      for(const context of contexts)if(context.state==='running'){resumeAudio.add(context);void context.suspend().catch(()=>{});}
    },
    resume() {
      if(!hidden)return;hidden=false;document.dispatchEvent(new Event('visibilitychange'));
      for(const context of resumeAudio)if(context.state==='suspended')void context.resume().catch(()=>{});resumeAudio.clear();
    },
    back() {
      const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return true;}
      if(window.ByteRoom?.state.open||window.ByteRoom?.state.pending){window.ByteRoom.close();return true;}
      return false;
    },
    importSave(raw) {
      const data=JSON.parse(raw),keys=['byte-sunburn-home-v1','byte-sunburn-care-v1','byte-sunburn-crystals-v1','byte-sunburn-kitchen-v1','byte-sunburn-possessions-v1','byte-little-moments-v1','byte-backyard-xii-v1','byte-little-sun-sound','byte-was-here-v1'];
      if(data.format!=='little-bob-save-v1'||!data.values||typeof data.values!=='object')throw Error('Not a Little Bob save file');
      for(const key of keys)if(key in data.values){const value=data.values[key];if(typeof value!=='string'||value.length>500000)throw Error('Invalid save value');if(key!=='byte-little-sun-sound')JSON.parse(value);}
      // Import exact known keys, without renaming them. Never import a live-viewer lease or an old absence proof.
      for(const key of keys)if(key in data.values){let value=data.values[key];if(key==='byte-was-here-v1'){const state=JSON.parse(value);state.pending=null;value=JSON.stringify(state);}localStorage.setItem(key,value);}
      native.importFinished();location.reload();return true;
    }
  };
  native.ready();
})();
