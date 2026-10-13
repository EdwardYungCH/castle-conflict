// Core: images, bitmap fonts, cocos-like node tree, menus/touch, director, audio, storage.
const {ATLASES}=require("atlases");
const IMG={};
let ORDER=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// ---------- drawing helpers ----------
function blit(ctx,img,sx,sy,sw,sh,dx,dy,dw=sw,dh=sh){const im=typeof img==='string'?IMG[img]:img;if(!im||sw<=0||sh<=0)return;ctx.drawImage(im,sx,sy,sw,sh,dx,dy,dw,dh);}
// Centre-anchored sprite draw (cocos default anchor). rect=[x,y,w,h]
function sprite(ctx,img,rect,cx,cy,{alpha=1,flipX=false,scale=1,rotation=0,anchorX=.5,anchorY=.5}={}){
  if(alpha<=0)return;const [sx,sy,w,h]=rect;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(Math.floor(cx),Math.floor(cy));
  if(rotation)ctx.rotate(rotation*Math.PI/180);if(scale!==1||flipX)ctx.scale(flipX?-scale:scale,scale);
  blit(ctx,img,sx,sy,w,h,-w*anchorX,-h*anchorY);ctx.restore();
}
function frameRect(def,t=0,fps=10){const n=def.Frames??1;let f=def.Looping?Math.floor(t*fps)%n:Math.min(n-1,Math.floor(t*fps));if(f<0)f=0;const per=def.FramesPerRow??n;return [def.X+(f%per)*def.Width,def.Y+Math.floor(f/per)*def.Height,def.Width,def.Height];}
function entry(atlas,name){return ATLASES[atlas]?.entries[name];}
// Draw atlas entry. anchor: 'center' (cocos) or 'bottom'.
function drawEntry(ctx,atlas,name,x,y,t=0,{fps=10,anchor='center',flipX=false,alpha=1,scale=1,rotation=0,frame=null}={}){
  const d=entry(atlas,name);if(!d)return false;let r=frameRect(d,t,fps);if(frame!==null){const per=d.FramesPerRow??(d.Frames??1);r=[d.X+(frame%per)*d.Width,d.Y+Math.floor(frame/per)*d.Height,d.Width,d.Height];}
  sprite(ctx,d.texture??ATLASES[atlas].texture,r,x,anchor==='bottom'?y-r[3]/2:y,{alpha,flipX,scale,rotation});return true;
}
const FONTS={white:{img:'sprites_font_alpha.png',w:16,h:20},blue:{img:'sprites_font_bigblue_alpha.png',w:16,h:20},tiny:{img:'tinyfont_white_alpha.png',w:8,h:10},tinyRed:{img:'tinyfont_red_alpha.png',w:8,h:10}};
const textWidth=(font,s)=>String(s).length*FONTS[font].w;
// Monospace LabelAtlas, start char '!', 20 glyphs per row. (x,y)=centre unless align left/right.
function text(ctx,font,str,x,y,{align='center',alpha=1,scale=1}={}){
  if(alpha<=0)return;const F=FONTS[font],s=String(str),w=s.length*F.w*scale;let left=align==='left'?x:align==='right'?x-w:x-w/2;
  const top=Math.floor(y-F.h*scale/2);left=Math.floor(left);ctx.save();ctx.globalAlpha*=alpha;
  for(let i=0;i<s.length;i++){const idx=s.charCodeAt(i)-33;if(idx<0||idx>=100)continue;blit(ctx,F.img,(idx%20)*F.w,Math.floor(idx/20)*F.h,F.w,F.h,left+i*F.w*scale,top,F.w*scale,F.h*scale);}
  ctx.restore();
}
// ---------- actions ----------
class Action{constructor(d=0){this.d=d;this.t=0;}start(n){this.n=n;this.t=0;}step(dt){this.t+=dt;this.update(this.d?clamp(this.t/this.d,0,1):1);return this.t>=this.d;}update(){}}
class Delay extends Action{}
class FadeTo extends Action{constructor(d,to,from=null){super(d);this.to=to;this.from=from;}start(n){super.start(n);this.a=this.from??n.opacity;if(this.from!==null)n.opacity=this.from;}update(p){this.n.opacity=this.a+(this.to-this.a)*p;}}
const FadeIn=d=>new FadeTo(d,255,0),FadeOut=d=>new FadeTo(d,0);
class MoveTo extends Action{constructor(d,x,y){super(d);this.x=x;this.y=y;}start(n){super.start(n);this.sx=n.x;this.sy=n.y;}update(p){this.n.x=this.sx+(this.x-this.sx)*p;this.n.y=this.sy+(this.y-this.sy)*p;}}
class ScaleTo extends Action{constructor(d,s){super(d);this.s=s;}start(n){super.start(n);this.a=n.scale??1;}update(p){this.n.scale=this.a+(this.s-this.a)*p;}}
class Call extends Action{constructor(fn){super(0);this.fn=fn;}update(){if(!this.done){this.done=true;this.fn(this.n);}}}
class Seq extends Action{constructor(...a){super(0);this.a=a;this.i=0;}start(n){this.n=n;this.i=0;this.a[0]?.start(n);}step(dt){while(this.i<this.a.length){if(!this.a[this.i].step(dt))return false;dt=0;this.i++;this.a[this.i]?.start(this.n);}return true;}}
// ---------- nodes ----------
class Node{
  constructor(x=0,y=0){this.x=x;this.y=y;this.children=[];this.z=0;this.visible=true;this.opacity=255;this.scale=1;this.parent=null;this.actions=[];this.timers=[];this.order=++ORDER;}
  add(c,z=0){c.z=z;c.parent=this;c.order=++ORDER;this.children.push(c);return c;}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}this.onRemove?.();}
  removeAll(){for(const c of [...this.children])c.remove();}
  run(a){a.start(this);this.actions.push(a);return a;}
  stopActions(){this.actions=[];}
  schedule(fn,interval=0,{repeat=true,delay=null}={}){const t={fn,interval,left:delay??interval,repeat,dead:false};this.timers.push(t);return t;}
  unschedule(t){if(t)t.dead=true;}
  after(sec,fn){return this.schedule(fn,sec,{repeat:false});}
  update(dt){
    for(const a of [...this.actions])if(a.step(dt))this.actions=this.actions.filter(b=>b!==a);
    for(const t of [...this.timers]){if(t.dead)continue;t.left-=dt;if(t.left<=1e-9){if(t.repeat){t.fn(t.interval-t.left+t.interval);t.left=t.interval;}else{t.dead=true;t.fn();}}}
    this.timers=this.timers.filter(t=>!t.dead);
    this.tick?.(dt);
    for(const c of [...this.children])if(c.parent===this)c.update(dt);
  }
  sorted(){return [...this.children].sort((a,b)=>a.z-b.z||a.order-b.order);}
  draw(ctx){if(!this.visible)return;const kids=this.sorted();for(const c of kids)if(c.z<0)c.draw(ctx);this.drawSelf?.(ctx);for(const c of kids)if(c.z>=0)c.draw(ctx);}
  get running(){let n=this;while(n.parent)n=n.parent;return n===Director.scene;}
}
class Sprite extends Node{constructor(img,rect,x,y,o={}){super(x,y);this.img=img;this.rect=rect;Object.assign(this,o);}
  drawSelf(ctx){const im=IMG[this.img];sprite(ctx,this.img,this.rect??[0,0,im?.width??0,im?.height??0],this.x,this.y,{alpha:this.opacity/255,flipX:this.flipX,scale:this.scale,rotation:this.rotation||0});}}
class Img extends Sprite{constructor(img,x=240,y=160,o){super(img,null,x,y,o);}}
class AtlasNode extends Node{constructor(atlas,name,x,y,o={}){super(x,y);this.atlas=atlas;this.name=name;this.t=0;this.fps=10;this.anchor='center';Object.assign(this,o);}
  tick(dt){this.t+=dt;}drawSelf(ctx){drawEntry(ctx,this.atlas,this.name,this.x,this.y,this.t,{fps:this.fps,anchor:this.anchor,alpha:this.opacity/255,flipX:this.flipX,scale:this.scale});}}
class Label extends Node{constructor(font,str,x,y,align='center'){super(x,y);this.font=font;this.str=String(str);this.align=align;}
  get w(){return textWidth(this.font,this.str);}
  drawSelf(ctx){text(ctx,this.font,this.str,this.x,this.y,{align:this.align,alpha:this.opacity/255,scale:this.scale});}}
class ColorLayer extends Node{constructor(r,g,b,a){super();this.color=[r,g,b];this.opacity=a;}drawSelf(ctx){ctx.fillStyle=`rgba(${this.color.join(',')},${this.opacity/255})`;ctx.fillRect(-VIEW.ext,0,VIEW.w,320);}}
class DrawNode extends Node{constructor(fn){super();this.fn=fn;}drawSelf(ctx){this.fn(ctx,this);}}
// ---------- menus ----------
const BTN='sprites_buttons_alpha.png',CON='sprites_conhud_alpha.png';
// MenuItemAtlasImage: normal/selected/disabled rects; centre-anchored; fires on touch-up (immediate: on touch-down/slide-in)
class Button extends Node{
  constructor(img,normal,selected,x,y,cb,o={}){super(x,y);this.img=img;this.normal=normal;this.sel=selected;this.dis=o.disabled??null;this.cb=cb;this.enabled=true;this.selected=false;this.immediate=!!o.immediate;this.scale=o.scale??1;Object.assign(this,o.extra||{});}
  get w(){return this.normal[2]*this.scale;}get h(){return this.normal[3]*this.scale;}
  hit(px,py){return px>=this.x-this.w/2&&px<=this.x+this.w/2&&py>=this.y-this.h/2&&py<=this.y+this.h/2;}
  drawSelf(ctx){let r=this.normal;if(!this.enabled)r=this.dis??this.normal;else if(this.selected&&this.sel)r=this.sel;sprite(ctx,this.img,r,this.x,this.y,{alpha:this.opacity/255,scale:this.scale});this.drawExtra?.(ctx);}
  select(){this.selected=true;if(this.immediate&&this.enabled)this.cb?.(this);}
  unselect(){this.selected=false;}
  activate(){if(this.enabled&&!this.immediate)this.cb?.(this);}
}
class TextItem extends Node{constructor(font,str,x,y,cb=null){super(x,y);this.font=font;this.str=String(str);this.cb=cb;this.enabled=true;}
  get w(){return textWidth(this.font,this.str)*this.scale;}get h(){return FONTS[this.font].h*this.scale;}
  hit(px,py){const w=textWidth(this.font,this.str),h=FONTS[this.font].h;return px>=this.x-w/2&&px<=this.x+w/2&&py>=this.y-h/2&&py<=this.y+h/2;}
  drawSelf(ctx){text(ctx,this.font,this.str,this.x,this.y,{alpha:this.opacity/255,scale:this.scale});}
  select(){this.stopActions();this.run(new ScaleTo(.1,1.2));}unselect(){this.stopActions();this.run(new ScaleTo(.1,1));}
  activate(){this.stopActions();this.scale=1;if(this.enabled)this.cb?.(this);}}
let MENU_SEQ=0;
class Menu extends Node{constructor(items=[]){super();this.seq=++MENU_SEQ;this.enabled=true;for(const i of items)this.add(i);}
  itemAt(px,py){for(const c of this.children)if(c.hit&&c.hit(px,py))return c;return null;}}
// ---------- director ----------
const Director={scene:null,stack:[],paused:false,ctx:null,
  replace(s){this.scene?.exit?.();this.stack.forEach(x=>x.exit?.());this.stack=[];this.scene=s;this.paused=false;Touch.reset();s.enter?.();},
  push(s){this.stack.push(this.scene);this.scene=s;Touch.reset();s.enter?.();},
  pop(){const s=this.scene;s.exit?.();this.scene=this.stack.pop();Touch.reset();this.scene?.resume?.();},
  update(dt){if(this.scene&&!(this.paused&&this.scene.pausable))this.scene.update(dt);else this.scene?.updateWhilePaused?.(dt);},
  draw(ctx){const ext=VIEW.ext;ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(-ext,0,480+2*ext,320);
    if(this.scene){ctx.save();if(this.scene.shake)ctx.translate(this.scene.shake[0],this.scene.shake[1]);if(ext>0)this.drawWings(ctx,ext);this.scene.draw(ctx);ctx.restore();}ctx.restore();}
  ,
  // Wide screens (e.g. iPhone 16 Pro Max): the 480x320 world stays as it is; the side strips continue the scene's background.
  drawWings(ctx,ext){const sc=this.scene;if(sc.wideBackground===false)return;const f=sc.params?.background??sc.children.find(c=>c instanceof Img)?.img;const im=IMG[f];if(!im)return;
    const w=Math.min(ext,im.width);ctx.save();ctx.scale(-1,1);ctx.drawImage(im,0,0,w,im.height,0,0,w,im.height);ctx.drawImage(im,im.width-w,0,w,im.height,-480-w-(ext-w),0,w,im.height);ctx.restore();
    if(ext>w){ctx.drawImage(im,0,0,1,im.height,-ext,0,ext-w,im.height);ctx.drawImage(im,im.width-1,0,1,im.height,480+w,0,ext-w,im.height);}}
};
// Visible logical area: x from -ext to 480+ext (ext=0 on 3:2 screens).
const VIEW={ext:0,get w(){return 480+2*this.ext;}};
class Scene extends Node{constructor(){super();}}
// ---------- touch ----------
function allMenus(root){const out=[];const walk=n=>{if(!n.visible&&n.blockWhenHidden===false)return;if(n instanceof Menu)out.push(n);for(const c of n.children)walk(c);};walk(root);return out.sort((a,b)=>b.seq-a.seq);}
const Touch={claims:new Map(),
  reset(){this.claims.clear();},
  began(id,x,y){const sc=Director.scene;if(!sc)return;
    for(const m of allMenus(sc)){if(!m.enabled)continue;const it=m.itemAt(x,y);if(it){this.claims.set(id,{menu:m,item:it});it.select();return;}}
    this.claims.set(id,{scene:true});sc.touchBegan?.(x,y,id);},
  moved(id,x,y){const c=this.claims.get(id);if(!c)return;if(c.scene){Director.scene?.touchMoved?.(x,y,id);return;}
    const it=c.menu.itemAt(x,y);if(it!==c.item){c.item?.unselect();c.item=it;it?.select();}},
  ended(id,x,y){const c=this.claims.get(id);this.claims.delete(id);if(!c)return;if(c.scene){Director.scene?.touchEnded?.(x,y,id);return;}
    if(c.item){c.item.unselect();if(c.menu.running||c.menu.parent)c.item.activate();}},
};
// ---------- audio ----------
const Audio_={ctx:null,buffers:{},music:null,musicName:null,muted:false,unlocked:false,pendingMusic:null,volume:{sfx:.55,music:.6},
  async init(ASSETS){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch{return;}
    try{this.muted=localStorage.getItem('cc-muted')==='1';}catch{}
    const files=Object.keys(ASSETS).filter(k=>/\.(wav|mp3)$/.test(k));
    await Promise.all(files.map(async f=>{try{const b64=ASSETS[f].split(',')[1],bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);this.buffers[f]=await new Promise((res,rej)=>this.ctx.decodeAudioData(arr.buffer,res,rej));}catch(e){console.warn('audio',f,e);}}));},
  unlock(){if(!this.ctx)return;if(this.ctx.state!=='running')this.ctx.resume().catch(()=>{});this.unlocked=true;},
  play(name,{loop=false,gain=null}={}){if(!this.ctx||this.muted||document.hidden)return null;const b=this.buffers[name.endsWith('.wav')||name.endsWith('.mp3')?name:name+'.wav'];if(!b)return null;const s=this.ctx.createBufferSource(),g=this.ctx.createGain();g.gain.value=gain??this.volume.sfx;s.buffer=b;s.loop=loop;s.connect(g).connect(this.ctx.destination);try{s.start();}catch{}return s;},
  playMusic(name,loop=false){this.stopMusic();this.musicName=name;this.musicLoop=loop;this.musicStarted=performance.now();if(this.muted)return;this.music=this.play(name,{loop,gain:this.volume.music});},
  stopMusic(){try{this.music?.stop();}catch{}this.music=null;this.musicName=null;},
  setMuted(m){this.muted=m;try{localStorage.setItem('cc-muted',m?'1':'0');}catch{}if(m){try{this.music?.stop();}catch{}this.music=null;}else if(this.musicName&&this.musicLoop){const n=this.musicName;this.playMusic(n,true);}}
};
const sfx=n=>Audio_.play(n);
// ---------- storage ----------
const Store={get(k,d=null){try{const v=localStorage.getItem('cc185-'+k);return v===null?d:JSON.parse(v);}catch{return d;}},set(k,v){try{localStorage.setItem('cc185-'+k,JSON.stringify(v));return true;}catch{return false;}},del(k){try{localStorage.removeItem('cc185-'+k);}catch{}}};
// Common widgets
// Full-width banner: on wide screens its edge columns are stretched into the side strips.
class Banner extends Img{drawSelf(ctx){super.drawSelf(ctx);const e=VIEW.ext,im=IMG[this.img];if(!e||!im||this.opacity<=0)return;const top=Math.floor(this.y-im.height/2);ctx.save();ctx.globalAlpha*=this.opacity/255;
  ctx.scale(-1,1);ctx.drawImage(im,0,0,e,im.height,0,top,e,im.height);ctx.drawImage(im,im.width-e,0,e,im.height,-480-e,top,e,im.height);ctx.restore();}}
const helpBanner=(y=155)=>new Banner('help_banner.png',240,y);
const fadeLayer=()=>new ColorLayer(0,0,0,100);
const BUTTONS={newGame:[0,0],mainMenu:[96,0],continue_:[0,48],back:[96,48],custom:[0,96],yes:[96,96],help:[0,144],no:[96,144],campaign:[384,0],quickPlay:[384,96],play:[192,192],start:[192,240],replay:[384,192],map:[384,288],attack:[192,384],del:[384,384],create:[480,384],finished:[672,0],lobby:[672,96],defaultUnits:[672,192],newPlayer:[192,288],accept:[192,336],aboutUs:[480,288],multi:[576,288],levelSelect:[672,288]};
// selected variants (pre-darkened) located at fixed offsets
const SEL={newGame:[192,0],mainMenu:[288,0],continue_:[192,48],back:[288,48],custom:[192,96],yes:[288,96],help:[192,144],no:[288,144],campaign:[384,48],quickPlay:[384,144],play:[288,192],start:[288,240],replay:[384,240],map:[384,336],attack:[288,384],del:[384,432],create:[480,432],finished:[672,48],lobby:[672,144],defaultUnits:[672,240],newPlayer:[288,288],accept:[288,336],aboutUs:[480,336],multi:[576,336],levelSelect:[672,336]};
const btn=(key,x,y,cb,o)=>new Button(BTN,[...BUTTONS[key],96,48],[...SEL[key],96,48],x,y,cb,o);
Object.assign(exports,{VIEW,Banner,IMG,blit,sprite,frameRect,entry,drawEntry,FONTS,text,textWidth,Action,Delay,FadeTo,FadeIn,FadeOut,MoveTo,ScaleTo,Call,Seq,Node,Sprite,Img,AtlasNode,Label,ColorLayer,DrawNode,Button,TextItem,Menu,Director,Scene,Touch,Audio:Audio_,sfx,Store,helpBanner,fadeLayer,btn,BTN,CON,clamp});
