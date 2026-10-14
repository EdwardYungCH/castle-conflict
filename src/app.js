// Bootstrap: canvas sizing, input, main loop, asset decoding.
const C=require("core");
const {Director,Touch,Audio,IMG}=C;
const S=require("scenes");
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
let scale=1;
// Logical width follows the screen: 480 on 3:2, up to 720 (2.25:1) on wide phones; the world stays 480 wide, centred.
function resize(){
  const wrap=document.getElementById('stage');const W=wrap.clientWidth,H=wrap.clientHeight;
  const LW=Math.max(480,Math.min(720,Math.floor(W/H*320/2)*2));C.VIEW.ext=(LW-480)/2;
  let w=W,h=W*320/LW;if(h>H){h=H;w=H*LW/320;}
  canvas.style.width=Math.floor(w)+'px';canvas.style.height=Math.floor(h)+'px';
  const dpr=window.devicePixelRatio||1;scale=Math.max(1,Math.round(h*dpr/320));canvas.width=LW*scale;canvas.height=320*scale;
}
window.addEventListener('resize',resize);resize();
function toLogical(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*C.VIEW.w-C.VIEW.ext,(e.clientY-r.top)/r.height*320];}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();Audio.unlock();try{canvas.setPointerCapture(e.pointerId);}catch{}const [x,y]=toLogical(e);Touch.began(e.pointerId,x,y);});
canvas.addEventListener('pointermove',e=>{const [x,y]=toLogical(e);Touch.moved(e.pointerId,x,y);});
canvas.addEventListener('pointerup',e=>{const [x,y]=toLogical(e);Touch.ended(e.pointerId,x,y);});
canvas.addEventListener('pointercancel',e=>{Touch.claims.delete(e.pointerId);});
for(const ev of ['contextmenu','selectstart','dblclick'])canvas.addEventListener(ev,e=>e.preventDefault());
// iOS Safari ignores user-scalable=no: block page pinch-zoom and double-tap zoom so the game's own pinch (world map) works
for(const ev of ['touchstart','touchmove','touchend'])canvas.addEventListener(ev,e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('gesturechange',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();const [x,y]=toLogical(e);Director.scene?.wheel?.(e.deltaY,x,y);},{passive:false});
// Keyboard: 1-9 = player 1 unit buttons, Q..O = player 2 (local multiplayer), Space = pause, Esc = quit dialog
const P2KEYS='qwertyuio';
document.addEventListener('keydown',e=>{
  Audio.unlock();const sc=Director.scene;if(!(sc instanceof S.BattleScene))return;
  const k=e.key.toLowerCase();
  if(/^[1-9]$/.test(k)){const it=sc.unitMenus[0]?.children[Number(k)-1];if(it){e.preventDefault();it.cb?.(it);}}
  else if(P2KEYS.includes(k)&&sc.unitMenus[1]){const it=sc.unitMenus[1].children[P2KEYS.indexOf(k)];if(it){e.preventDefault();it.cb?.(it);}}
  else if(e.code==='Space'){e.preventDefault();sc.togglePause();}
  else if(e.key==='Escape'){sc.askQuit();}
});
document.addEventListener('visibilitychange',()=>{
  const sc=Director.scene;
  if(document.hidden){if(sc instanceof S.BattleScene&&sc.params.mode!==2&&!Director.paused&&!sc.gameOver)sc.setPaused(true);try{Audio.ctx?.suspend();}catch{}}
  else{try{Audio.ctx?.resume();}catch{}}
});
window.addEventListener('pagehide',()=>{const sc=Director.scene;if(sc instanceof S.BattleScene)sc.saveOnUnload();});
document.getElementById('sound').onclick=()=>{Audio.unlock();Audio.setMuted(!Audio.muted);document.getElementById('sound').textContent=Audio.muted?'🔇':'🔊';};
document.getElementById('sound').textContent=(()=>{try{return localStorage.getItem('cc-muted')==='1'?'🔇':'🔊';}catch{return '🔊';}})();
document.getElementById('fs').onclick=async()=>{const el=document.getElementById('stage');try{if(document.fullscreenElement)await document.exitFullscreen();else await (el.requestFullscreen?.()||el.webkitRequestFullscreen?.());}catch{}setTimeout(resize,200);};
document.addEventListener('fullscreenchange',()=>setTimeout(resize,100));
let last=performance.now();
function frame(ts){const dt=Math.min(.1,Math.max(0,(ts-last)/1000));last=ts;Director.update(dt);ctx.setTransform(scale,0,0,scale,C.VIEW.ext*scale,0);Director.draw(ctx);requestAnimationFrame(frame);}
const loading=new S.LoadingScene();
(async()=>{
  // Images needed by the loading screen first
  const load=f=>new Promise(res=>{if(IMG[f])return res();const im=new Image();im.onload=()=>{IMG[f]=im;res();};im.onerror=()=>{console.warn('image',f);res();};im.src=ASSETS[f];});
  await Promise.all(['Loading.png','sprites_title_alpha.png','tinyfont_white_alpha.png'].map(load));
  Director.replace(loading);requestAnimationFrame(frame);
  await Promise.all(Object.keys(ASSETS).filter(k=>k.endsWith('.png')).map(load));
  await Audio.init(ASSETS);require("ui").UI.loadVolume();
  loading.ready=true;
  window.__cc={Director,S,C,D:require("data"),E:require("engine"),X:require("extras")};
})();
