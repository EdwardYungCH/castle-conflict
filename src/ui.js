// v3.0 "new interface": the classic/modern switch, stone panels and icon buttons built from the original
// tablet art, the big red price font, persistent volume, mechanic intro cards. Everything stays 480x320 pixel art.
const C=require("core");
const {Store,Button,BTN,CON,IMG,text,textWidth,blit,sprite,Menu,Node,Label,FONTS,Audio,sfx,btn,fadeLayer,Director}=C;
FONTS.red={img:'sprites_font_bigred_alpha.png',w:16,h:20};
const TAB=[864,0,96,48],TAB_SEL=[288,432,96,48];   // blank stone tablet: normal / pressed
const UI={
  get modern(){return Store.get('ui','classic')==='modern';},
  set(m){Store.set('ui',m?'modern':'classic');},
  // Panel of any size in the look of the original dialog banner (help_banner.png): gold trim top and bottom,
  // purple diamond pattern tiled inside, a dark edge at the sides. Stone tablets sit on it like in the original dialogs.
  panel(ctx,x,y,w,h,{alpha=1}={}){
    const im=IMG['help_banner.png'];if(!im)return;x=Math.floor(x);y=Math.floor(y);w=Math.floor(w);h=Math.floor(h);
    const CAP=10,FOOT=10,bodyH=96-CAP-FOOT;ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    for(let yy=y+CAP;yy<y+h-FOOT;yy+=bodyH)for(let xx=x;xx<x+w;xx+=480)ctx.drawImage(im,0,CAP,480,bodyH,xx,yy,480,bodyH);
    for(let xx=x;xx<x+w;xx+=480){ctx.drawImage(im,0,0,480,CAP,xx,y,480,CAP);ctx.drawImage(im,0,96-FOOT,480,FOOT,xx,y+h-FOOT,480,FOOT);}
    ctx.fillStyle='#2b1430';ctx.fillRect(x,y,2,h);ctx.fillRect(x+w-2,y,2,h);ctx.fillStyle='#d8a53a';ctx.fillRect(x+2,y+CAP,1,h-CAP-FOOT);ctx.fillRect(x+w-3,y+CAP,1,h-CAP-FOOT);
    ctx.restore();
  },
  // persistent volumes
  loadVolume(){const v=Store.get('volume',null);if(v){Audio.volume.sfx=v.sfx;Audio.volume.music=v.music;}},
  setVolume(k,v){Audio.volume[k]=Math.max(0,Math.min(1,v));Store.set('volume',{...Audio.volume});if(k==='music'&&Audio.musicName&&Audio.musicLoop){const n=Audio.musicName;Audio.playMusic(n,true);}},
  vibrate(ms=15){try{if(navigator.vibrate)navigator.vibrate(ms);}catch{}},
};
// Square stone button (48x48) made of the tablet's two rounded ends; label = bitmap text or a sprite rect on another sheet.
class StoneBtn extends Button{
  constructor(x,y,cb,{label=null,font='white',icon=null,iconImg=CON,size=48,scale=1,longPress=null}={}){
    super(BTN,[864,0,size,48],[288,432,size,48],x,y,cb,{scale});this.label=label;this.font=font;this.icon=icon;this.iconImg=iconImg;this.size=size;this.longPress=longPress;
  }
  drawSelf(ctx){const [sx,sy]=this.selected||!this.enabled?TAB_SEL:TAB,half=this.size/2,x=Math.floor(this.x-half),y=Math.floor(this.y-24);
    ctx.save();ctx.globalAlpha*=this.opacity/255;
    blit(ctx,BTN,sx,sy,half,48,x,y);blit(ctx,BTN,sx+96-half,sy,half,48,x+half,y);
    if(this.icon)sprite(ctx,this.iconImg,this.icon,this.x,this.y);
    if(this.label!==null)text(ctx,this.font,this.label,this.x,this.y+1,{scale:this.labelScale??1});
    this.drawExtra?.(ctx);ctx.restore();}
}
// Tablet button (96x48) with a text label (like extras.textBtn) but optionally a small sub-label.
class TabletBtn extends Button{
  constructor(label,x,y,cb,{sub=null,w=96,longPress=null}={}){super(BTN,[864,0,96,48],[288,432,96,48],x,y,cb);this.label=label;this.sub=sub;this.w2=w;this.longPress=longPress;}
  get w(){return this.w2;}
  drawSelf(ctx){ctx.save();ctx.globalAlpha*=this.opacity/255;const [sx,sy]=this.selected||!this.enabled?TAB_SEL:TAB,w=this.w2,x=Math.floor(this.x-w/2),y=Math.floor(this.y-24);
    blit(ctx,BTN,sx,sy,24,48,x,y);blit(ctx,BTN,sx+72,sy,24,48,x+w-24,y);for(let xx=x+24;xx<x+w-24;xx+=48)blit(ctx,BTN,sx+24,sy,Math.min(48,x+w-24-xx),48,xx,y);
    const lines=Array.isArray(this.label)?this.label:[this.label];
    if(this.sub){text(ctx,'tiny',lines[0],this.x,this.y-6);text(ctx,'tiny',this.sub,this.x,this.y+8,{alpha:.75});}
    else lines.forEach((s,i)=>text(ctx,'tiny',s,this.x,this.y+1+(i-(lines.length-1)/2)*12));
    this.drawExtra?.(ctx);ctx.restore();}
}
// Horizontal slider (0..1) driven by the scene's touch handlers (menus only know about buttons).
class Slider{
  constructor(x,y,w,value,onChange){this.x=x;this.y=y;this.w=w;this.value=value;this.onChange=onChange;}
  hit(px,py){return px>=this.x-12&&px<=this.x+this.w+12&&py>=this.y-14&&py<=this.y+14;}
  set(px){this.value=Math.max(0,Math.min(1,(px-this.x)/this.w));this.onChange?.(this.value);}
  draw(ctx){ctx.save();ctx.fillStyle='#1d1a22';ctx.fillRect(this.x,this.y-3,this.w,6);ctx.fillStyle='#5aa7ff';ctx.fillRect(this.x,this.y-3,Math.round(this.w*this.value),6);
    ctx.fillStyle='#e9e4d8';ctx.fillRect(this.x+Math.round(this.w*this.value)-4,this.y-7,8,14);ctx.fillStyle='#2a2630';ctx.fillRect(this.x+Math.round(this.w*this.value)-4,this.y-7,8,1);ctx.restore();}
}
// ---- mechanic intro cards (shown once per element in the new interface) ----
const ELEMENT_INFO={
  1:['Tall Trees',['Tall palm trees grow at the sides of the field.','Only flying woodcutters can harvest them.']],
  2:['Antlion',['An antlion lurks in the sand in the middle.','Now and then it swallows a ground unit whole.']],
  3:['Blizzard',['Every so often a blizzard blows for 6 seconds.','Ground units move at half speed in it.']],
  4:['Thin Ice',['The middle of the field is thin ice.','Heavy units (cavalry, rams, golems) may fall through.']],
  5:['Fog',['Fog rolls over part of the field.','Units inside it cannot be seen.']],
  6:['Drawbridge',['A bridge spans the canal. Rams, giants and','longships break it; then sampans can sail across.']],
  7:['Lava',['The ground glows red for a second, then erupts.','Ground units nearby die. Flyers are safe.']],
  8:['Tunnel',['A tunnel runs under the field. Tunnel units','ignore the surface; miners dig ore and mushrooms.']],
  9:['Island Gaps',['The island is broken. Slow ground units stop at','the edge; fast ones fall. Bridge builders fix it.']],
  10:['Wind',['Gusts of wind push every airship sideways.','Heavy battleships barely move.']],
  13:['Air Lanes',['Airships can fly the high lane: slower, pushed more by','wind, but out of reach of flak and lightning.']],
  12:['Lava Tide',['Now and then lava floods the whole tunnel.','Only the stretch behind your own dwarf seal stays dry.']],
  11:['Bamboo',['The trees here are bamboo: worth less gold,','but they grow back 3 seconds after being cut.']]};
const ELEMENT_ICON={1:[CON,[192,176,16,16]],2:[CON,[176,176,16,16]],3:['spr_north_fx_alpha.png',[96,0,16,16]],4:['spr_north_fx_alpha.png',[112,0,16,16]],5:['spr_east_fx_alpha.png',[80,0,16,16]],6:['spr_east_fx_alpha.png',[96,0,16,16]],7:['spr_under_fx_alpha.png',[80,0,16,16]],8:['spr_under_fx_alpha.png',[56,4,16,16]],9:['spr_sky_fx_alpha.png',[88,0,16,16]],10:['spr_sky_fx_alpha.png',[104,0,16,16]],11:['spr_east_fx_alpha.png',[80,16,16,16]],12:['spr_under_fx_alpha.png',[128,48,16,16]],13:['spr_sky_fx_alpha.png',[144,0,16,16]]};
function unseenElements(elements){const seen=Store.get('seenElements',[]);return elements.filter(e=>ELEMENT_INFO[e]&&!seen.includes(e));}
function markSeen(e){const seen=Store.get('seenElements',[]);if(!seen.includes(e)){seen.push(e);Store.set('seenElements',seen);}}
// Shows the cards one after another, then calls done.
function introCards(parent,elements,done){
  const list=unseenElements(elements);if(!list.length){done();return;}
  const show=i=>{if(i>=list.length){done();return;}const e=list[i],[name,lines]=ELEMENT_INFO[e],[img,rect]=ELEMENT_ICON[e];
    const L=new Node();L.add(fadeLayer(),0);L.add(new C.DrawNode(ctx=>{UI.panel(ctx,36,96,408,130);sprite(ctx,img,rect,66,122,{scale:2});}),1);
    L.add(new Label('tiny','New hazard',240,108),2);L.add(new Label('white',name,240,126),2);lines.forEach((s,k)=>L.add(new Label('tiny',s,240,152+14*k),2));
    L.add(new Menu([btn('continue_',240,200,()=>{sfx('select.wav');markSeen(e);L.remove();show(i+1);})]),2);parent.add(L,100);};
  show(0);
}
Object.assign(exports,{UI,StoneBtn,TabletBtn,Slider,introCards,ELEMENT_INFO,ELEMENT_ICON,TAB,TAB_SEL});
