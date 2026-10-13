// Campaign scenes: world map, castle popup, tutorials, shop, barracks, appearance, results, realm victory.
const C=require("core");
const {Node,Scene,Menu,Button,TextItem,Label,Img,Sprite,DrawNode,Director,Audio,sfx,sprite,drawEntry,text,textWidth,BTN,CON,btn,helpBanner,fadeLayer,FadeIn,MoveTo,Seq,Call,Delay}=C;
const D=require("data");
const {UNITS,UNIT_KEYS}=require("engine");
const {yesNo,message,shouldQuit,tutorial}=require("dialogs");
const {drawCastle}=require("battle");
const M=()=>require("menu");
const fl=Math.floor;
const hudRect=(id,img)=>{const u=D.unitInfo(id);return [u.hud[0],u.hud[1],48,48];};
const UPG_RECT={0:[432,0],1:[432,48],2:[432,192],3:[384,240],4:[0,384],5:[48,384],6:[96,384],100:[48,240]}; // 4-6: expansion icons (HUD rows 384+)
const BOATS=[[{x:518,y:46,target:1,cam:[80,555]}],[{x:80,y:555,target:0,cam:[528,46],start:true},{x:903,y:165,target:2,cam:[72,112]}],
  [{x:72,y:112,target:1,cam:[903,165],start:true},{x:925,y:592,target:1000,cam:[72,112]}]]; // [2]: Northern Realm (expansion)
const MAP_ATLAS=['WorldMap','WorldMapEgypt','WorldMapNorth'];
const REALM_INFO={0:['The Homeland','A land of conflicting castles'],1:['Egypt','The land of desert and fertility'],2:['The North','A frozen land of jarls and giants']};
// ======================= World map =======================
class WorldMapScene extends Scene{
  constructor(state){super();this.state=state;this.active=false;this.loading=this.add(new Img('travelloader.png'),50);this.after(.5,()=>this.load());}
  load(){
    const st=this.state;this.loading.remove();this.map=st.currentMap;this.atlas=MAP_ATLAS[this.map];this.t=0;
    this.realm=D.CONTENT.maps[this.map];this.castles=this.realm.castles;
    if(st.lastMapScale===0)this.pos={x:0,y:-1000};else this.pos={...st.lastMapPos};this.fix();
    this.fx=[];this.dots=[];this.fake=null;this.arrow=null;
    const lcb=st.lastCastleBeat;
    if(this.castles.some(c=>c.id===lcb)){const c=D.castleById(lcb);this.fake=c;this.after(1,()=>{this.fake=null;this.fx.push({name:'ExplosionDefaultAnimation',x:c.position[0],y:c.position[1],t:0,fps:20});sfx('explosion.wav');});}
    // path dots
    for(const c of st.connections()){if(!this.castles.some(k=>k.id===c.from))continue;
      const own1=st.ownsCastle(c.from),own2=c.mapLink?(c.startPosition||st.pathExistsToLink(c.to)):st.ownsCastle(c.to);
      if(own1&&own2)for(const p of c.points)this.dots.push({x:p[0],y:p[1],blue:true,at:-1});
      if((own1||own2)&&(own1!==own2||c.mapLink)){const anim=c.from===lcb||c.to===lcb,pts=own2?[...c.points].reverse():c.points;
        pts.forEach((p,k)=>this.dots.push({x:p[0],y:p[1],blue:!!c.mapLink,at:anim?.2*(k+1):-1}));}
    }
    // controls
    const ctl=new Menu();this.controls=ctl;const guard=f=>()=>{if(!this.active)return;sfx('select.wav');f();};
    ctl.add(new Button(CON,[192,32,48,48],[192,80,48,48],52,295,guard(()=>{this.active=false;shouldQuit(this,'(You will be taken to the menu)',()=>{st.save();Director.replace(new (M().MenuScene)());},()=>{this.active=true;},10);})));
    ctl.add(new Button(CON,[144,128,48,48],[192,128,48,48],428,40,guard(()=>{this.active=false;yesNo(this,'Multiplayer','Go to multiplayer lobby with your army?',()=>{st.save();Director.replace(new (M().MPSelectScene)());},()=>{this.active=true;});})));
    if(st.ownsCastle(1))ctl.add(new Button('mapcastles_alpha.png',[320,48,48,48],[320,144,48,48],444,284,guard(()=>{st.save();Director.replace(new ShopScene(st,false));})));
    if(st.inactiveUnits.length>0&&!st.hasSeenUnitScreen){st.hasSeenUnitScreen=true;this.after(.016,()=>this.tut('unit'));}
    if(st.hasSeenUnitScreen)ctl.add(new Button('mapcastles_alpha.png',[320,0,48,48],[320,96,48,48],384,284,guard(()=>{st.save();Director.replace(new UnitChangeScene(st,false));})));
    if(this.map===1&&!st.hasSetEgyptSkin){st.setEgyptSkin();this.after(1,()=>this.tut('skin'));}
    if(this.map===2&&!st.hasSetNorthSkin){st.setNorthSkin();this.after(1,()=>this.tut('skin'));}
    if(st.hasSetEgyptSkin)ctl.add(new Button('mapcastles_alpha.png',[320,192,48,48],[320,240,48,48],444,224,guard(()=>{st.save();Director.replace(new SkinSelectScene(st));})));
    this.add(ctl,2);
    if(lcb===0)this.after(2,()=>this.tut('welcome'));else if(lcb===1)this.after(1.6,()=>this.tut('shop'));else if(lcb===19||lcb===38)this.after(.8,()=>this.tut('newmap'));
    st.lastCastleBeat=1000;this.active=true;this.loaded=true;
  }
  tut(kind){
    this.active=false;const done=()=>{this.arrow=null;this.active=true;};
    if(kind==='welcome')tutorial(this,[['white','Welcome to campaign mode!',130],['tiny','Touch a castle on the map to attack it.',160],['tiny','Conquer all red castles to win!',180]],done);
    else if(kind==='shop'){this.arrow=[402,284];tutorial(this,[['white','Touch this button anytime',145],['white','to return to the shop.',175]],done,{sound:false});}
    else if(kind==='unit'){this.arrow=[352,284];tutorial(this,[['white','Touch this button anytime',145],['white','to return to the barracks.',175]],done);}
    else if(kind==='skin'){this.arrow=[402,224];tutorial(this,[['white','New appearance unlocked!',145],['tiny','Touch here to change your appearance',175]],done,{sound:false});}
    else if(kind==='newmap')tutorial(this,[['white','New map available!',145],['tiny','Touch the ship to travel',175]],done,{sound:false});
  }
  reactivate(){this.active=true;}
  fix(){const e=C.VIEW.ext;this.pos.x=Math.max(-(480-e),Math.min(-e,this.pos.x));this.pos.y=Math.max(-320,Math.min(0,this.pos.y));}
  get vx(){return -this.pos.x;}get vy(){return 320+this.pos.y;}
  toCanvas(mx,my){return [mx-this.vx,640-my-this.vy];}
  touchBegan(x,y,id){if(!this.active||!this.loaded)return;this.drag={x,y,dist:0,id};}
  touchMoved(x,y,id){const d=this.drag;if(!d||d.id!==id||!this.active)return;const dx=x-d.x,dy=y-d.y;this.pos.x+=dx;this.pos.y-=dy;d.dist+=Math.abs(Math.trunc(dx))+Math.abs(Math.trunc(dy));d.x=x;d.y=y;this.fix();}
  touchEnded(x,y,id){
    const d=this.drag;this.drag=null;if(!d||!this.active)return;const st=this.state;
    if(d.dist<10){
      const mx=x+this.vx,my=640-(y+this.vy);
      for(const c of this.castles){const [cx,cy]=c.position;if(mx>=cx-40&&mx<=cx+40&&my>=cy-40&&my<=cy+40&&(st.ownsCastle(c.id)||st.pathExistsToCastle(c.id))){sfx('select.wav');this.active=false;this.add(new CastleInfoLayer(st,c,this),10);return;}}
      for(const b of BOATS[this.map]){if(Math.abs(mx-b.x)<=32&&Math.abs(my-b.y)<=32){sfx('select.wav');
        if(b.target===1000){this.active=false;yesNo(this,'Nothing here yet...','Would you be interested in playing more campaigns?',()=>this.reactivate(),()=>this.reactivate());}
        else if(st.pathExistsToLink(b.target)){this.active=false;const [name,blurb]=REALM_INFO[b.target];yesNo(this,`Travel to ${name}?`,blurb,()=>{st.currentMap=b.target;st.lastMapPos={x:240-b.cam[0],y:160-b.cam[1]};st.lastMapScale=1;st.save();Director.replace(new WorldMapScene(st));},()=>this.reactivate());}
        else message(this,'Fight your way to this ship!','Travel to new lands!',()=>this.reactivate());
        break;}}
    }
    st.lastMapPos={...this.pos};st.lastMapScale=1;
  }
  tick(dt){if(this.loaded){this.t+=dt;for(const f of this.fx)f.t+=dt;this.fx=this.fx.filter(f=>f.t<.25);}}
  drawSelf(ctx){
    if(!this.loaded)return;const A=this.atlas,st=this.state,t=this.t;this.wideBackground=false;
    ctx.drawImage(C.IMG[this.realm.image],-this.vx,-this.vy);
    for(const f of this.fx){const [x,y]=this.toCanvas(f.x,f.y);drawEntry(ctx,A,f.name,x,y,f.t,{fps:f.fps});}
    const castleName=c=>(st.ownsCastle(c.id)?'CastleOwned':st.pathExistsToCastle(c.id)?'CastleEnemy':'CastleInactive')+(c.flipped?1:2);
    const ovl=[];
    for(const c of this.castles){const [x,y]=this.toCanvas(...c.position);if(x<-60-C.VIEW.ext||x>540+C.VIEW.ext||y<-60||y>380)continue;drawEntry(ctx,A,castleName(c),x,y);ovl.push([c,x,y]);}
    if(this.fake){const c=this.fake,[x,y]=this.toCanvas(...c.position);drawEntry(ctx,A,'CastleEnemy'+(c.flipped?1:2),x,y);ovl.push([c,x,y]);}
    for(const b of BOATS[this.map]){const [x,y]=this.toCanvas(b.x,b.y);drawEntry(ctx,A,'BoatAnimation',x,y,t,{fps:10});}
    for(const [c,x,y] of ovl){const v=c.flipped?1:2;for(const u of c.upgrades){if(u===0||u===5)drawEntry(ctx,A,'Tower'+v,x,y);else if(u===3)drawEntry(ctx,A,'Seige'+v,x,y);else if(u===2||u===4)drawEntry(ctx,A,`MagicEngine${v}Animation`,x,y,t,{fps:1/.15});}}
    for(const d of this.dots){if(d.at>=0&&t<d.at)continue;const [x,y]=this.toCanvas(d.x,d.y);const name=d.blue?'PathBlue':'PathRed';if(d.at>=0&&t-d.at<.35)drawEntry(ctx,A,name+'Animation',x,y,t-d.at,{fps:20});else drawEntry(ctx,A,name,x,y);}
    if(this.arrow)drawEntry(ctx,A,'ArrowAnimation',this.arrow[0],this.arrow[1],t,{fps:10});
  }
  draw(ctx){if(!this.visible)return;this.drawSelf(ctx);for(const c of this.sorted())c.draw(ctx);}
}
class CastleInfoLayer extends Node{
  constructor(state,c,owner){super();const owned=state.ownsCastle(c.id);this.t=0;
    this.add(helpBanner(155));this.add(new Label('white',owned?'You own this castle':c.name,240,125));
    this.add(new Sprite(CON,[96,16,16,16],174,145));this.add(new Label('tiny',['Sparse','Average','Fertile'][c.treeGrowth]??' ',180,145,'left'));
    this.add(new Sprite(CON,[112,16,16,16],270,145));this.add(new Label('tiny',['Novice','Experienced','Veteran','Warlord'][c.difficulty]??'',290,145,'left'));
    c.elements.forEach((e,i)=>{if(e===3||e===4)this.add(new Sprite('spr_north_fx_alpha.png',[e===3?96:112,0,16,16],154-20*i,145),5);else if(e===1)this.add(new Sprite(CON,[192,176,16,16],154-20*i,145),5);else if(e===2){const s=new Sprite(CON,[176,176,16,16],154-20*i,145);s.tick=dt=>{s.tt=(s.tt||0)+dt;s.rect=Math.floor(s.tt/.5)%2?[160,176,16,16]:[176,176,16,16];};this.add(s,5);}});
    const img=D.SKINS[D.castleSkin(c)].right.buttons,n=c.units.length,x0=fl(240-18*(n-1));
    c.units.forEach((id,i)=>this.add(M().unitIcon(id,img,x0+36*i,175,.75)));
    this.add(new Menu([owned?new Button(BTN,[384,192,96,48],[384,240,96,48],320,220,()=>go()):btn('attack',320,220,()=>go()),btn('back',160,220,()=>{sfx('select.wav');owner.reactivate();this.remove();})]));
    const go=()=>{sfx('select.wav');Director.replace(new (M().CampaignLoadingScene)(D.campaignParams(state,c.id),{mimicHome:false}));};
  }
}
// ======================= Shop =======================
const SHOP_PAGES=D.CONTENT.shopPages;
function fauxCastle(state,dy,{fadeCannon=false}={}){
  const skin=D.SKINS[state.playerSkin].left;const n=new DrawNode((ctx,node)=>{node.t=(node.t||0);
    drawCastle(ctx,skin.castle,0,state.upgrades.filter(u=>u!==5),node.t,{dy}); // the sun would cover the heart's price label
    if(state.hasUnit(5)){ctx.save();ctx.globalAlpha=Math.min(1,node.cannonAlpha??1);drawEntry(ctx,skin.units,'Cannon',52,172+dy);ctx.restore();}});
  n.tick=dt=>{n.t=(n.t||0)+dt;if(n.cannonAlpha<1)n.cannonAlpha+=dt/.1;};return n;
}
class ShopScene extends Scene{
  constructor(state,showTutorial=false){super();this.state=state;this.active=true;this.add(new Img('shopbg.png'));
    const img=D.SKINS[state.playerSkin].left.buttons;this.img=img;
    this.castle=this.add(fauxCastle(state,33),0);
    this.techLabel=this.add(new Label('white','0',10,70,'left'));
    this.backMenu=this.add(new Menu([this.back=btn('back',240,280,()=>this.cancel())]));
    this.armyMenu=this.add(new Menu());this.refreshArmy();
    const am=new Menu();this.add(am);
    this.left=am.add(new Button(CON,[48,128,48,48],[48,128,48,48],90,170,()=>{if(!this.active||this.cur<=0)return;sfx('select.wav');this.loadPage(this.cur-1);}));
    this.right=am.add(new Button(CON,[0,128,48,48],[0,128,48,48],390,170,()=>{if(!this.active||this.cur>=this.pages.length-1)return;sfx('select.wav');this.loadPage(this.cur+1);}));
    this.heart=am.add(new Button(img,[48,240,48,48],[48,336,48,48],60,120,b=>this.tap(b),{immediate:true,extra:{kind:'upgrade',id:100}}));
    this.heart.drawExtra=ctx=>text(ctx,'tiny',this.healthPrice(),60,149);
    this.pages=SHOP_PAGES.filter(p=>p.requires===1000||state.upgradesAvailable.includes(p.requires));
    this.cur=-1;this.loadPage(0);this.updateTech();
    if(showTutorial){this.back.opacity=100;this.active=false;tutorial(this,[['white','Welcome to the shop!',130],['tiny','Buy new units and upgrades to bring into battle.',150],['tiny','Touch a unit or an upgrade to see more info.',170],['tiny','Use the arrows to see all the units you can buy!',190]],()=>this.reactivate(),{z:10});}
  }
  healthPrice(){return 4*(Math.trunc((this.state.startHealth-80)/30)+1);}
  refreshArmy(){this.armyMenu.removeAll();for(let i=0;i<8;i++){const id=this.state.units[i];this.armyMenu.add(new Button(this.img,id!==undefined?hudRect(id):[432,240,48,48],id!==undefined?[...hudRect(id).slice(0,1),hudRect(id)[1]+96,48,48]:[432,336,48,48],72+48*i,28,null,{immediate:true}));}}
  loadPage(i){
    this.pageMenu?.remove();this.cur=i;const p=this.pages[i],m=new Menu();this.pageMenu=m;
    m.add(new TextItem('white',p.name,240,120));
    if(p.upgrade!==1000){const r=UPG_RECT[p.upgrade];const b=new Button(this.img,[r[0],r[1],48,48],[r[0],r[1]+96,48,48],240,160,b=>this.tap(b),{immediate:true,extra:{kind:'upgrade',id:p.upgrade}});b.drawExtra=ctx=>text(ctx,'tiny',D.upgradeInfo(p.upgrade).techCost,240,189);m.add(b);}
    p.units.forEach((id,k)=>{const r=hudRect(id);const b=new Button(this.img,r,[r[0],r[1]+96,48,48],140+50*k,220,b=>this.tap(b),{immediate:true,extra:{kind:'unit',id,req:p.unitReq??p.upgrade}});const u=D.unitInfo(id);b.drawExtra=ctx=>text(ctx,'tiny',u.techCost,b.x,249);m.add(b);});
    this.add(m);this.left.opacity=i>0?255:100;this.right.opacity=i<this.pages.length-1?255:100;this.updateButtons();
  }
  updateTech(){this.techLabel.str=`${this.state.techPoints} Tech Points`;}
  canBuyUnit(b){const st=this.state,u=D.unitInfo(b.id);return !st.hasUnit(b.id)&&(b.req===1000||st.hasUpgrade(b.req))&&u.techCost<=st.techPoints;}
  updateButtons(){const st=this.state;
    for(const b of this.pageMenu.children){if(b.kind==='unit')b.opacity=this.canBuyUnit(b)?255:100;else if(b.kind==='upgrade')b.opacity=!st.hasUpgrade(b.id)&&D.upgradeInfo(b.id).techCost<=st.techPoints?255:100;}
    this.heart.opacity=st.techPoints>=this.healthPrice()?255:100;}
  deactivate(){this.active=false;this.back.enabled=false;this.back.opacity=100;}
  reactivate(){this.active=true;this.back.enabled=true;this.back.opacity=255;}
  tap(b){
    if(!this.active)return;sfx('select.wav');const st=this.state;let msg=null,name,desc,cost,gold=null;
    if(b.kind==='unit'){const u=D.unitInfo(b.id);name=u.name;desc=u.description;cost=u.techCost;gold=u.cost;
      if(st.hasUnit(b.id))msg='Already Owned';else if(b.req!==1000&&!st.hasUpgrade(b.req))msg=`Need ${D.upgradeInfo(b.req).name} to purchase`;else if(cost>st.techPoints)msg='Not enough tech points';}
    else{const u=D.upgradeInfo(b.id);name=u.name;desc=u.description;cost=b.id===100?this.healthPrice():u.techCost;
      if(b.id!==100&&st.hasUpgrade(b.id))msg='Already Owned';else if(cost>st.techPoints)msg='Not enough tech points';}
    const L=new Node();L.add(helpBanner(155));L.add(new Label('white',name,240,130));L.add(new Label('tiny',desc,240,160));
    L.add(new Sprite(this.img,b.kind==='unit'?hudRect(b.id):[...UPG_RECT[b.id],48,48],50,150));
    if(b.kind==='unit')L.add(new Label('tiny',`(${cost} tech points, ${gold} gold to summon)`,240,145));
    const no=()=>{sfx('select.wav');this.reactivate();L.remove();};
    if(!msg){L.add(new Label('white','Buy?',240,185));L.add(new Menu([btn('yes',340,210,()=>{L.remove();b.kind==='unit'?this.buyUnit(b):this.buyUpgrade(b,cost);}),btn('no',140,210,no)]),1);}
    else{L.add(new Label('white',msg,240,185));L.add(new Menu([btn('back',240,220,no)]),1);}
    this.add(L,1);this.deactivate();
  }
  flyIcon(rect,x,y,tx,ty,then){const s=new Sprite(this.img,rect,x,y);this.add(s,2);s.run(new Seq(new MoveTo(.1,tx,ty),new Call(()=>then?.(s))));return s;}
  buyUpgrade(b,cost){const st=this.state;sfx('buy.wav');if(b.id===100)st.startHealth+=30;else st.upgrades.push(b.id);st.techPoints-=cost;
    this.flyIcon([...UPG_RECT[b.id],48,48],b.x,b.y,48,191,s=>{sfx('castleupg.wav');s.remove();this.reactivate();});this.updateTech();this.updateButtons();st.save();}
  buyUnit(b){const st=this.state,u=D.unitInfo(b.id);sfx('buy.wav');st.techPoints-=u.techCost;this.updateTech();const active=st.addUnit(b.id);
    this.flyIcon(hudRect(b.id),b.x,b.y,active?48*st.units.length+24:512,28,s=>{if(active){s.remove();this.refreshArmy();}else s.remove();});
    if(b.id===5){this.castle.cannonAlpha=0;}this.reactivate();this.updateButtons();st.save();}
  cancel(){if(!this.active)return;sfx('select.wav');const st=this.state;st.save();if(st.inactiveUnits.length>0&&!st.hasSeenUnitScreen)Director.replace(new UnitChangeScene(st,true));else Director.replace(new WorldMapScene(st));}
}
// ======================= Barracks =======================
class UnitChangeScene extends Scene{
  constructor(state,showTutorial=false){super();this.state=state;this.active=true;this.add(new Img('shopbg.png'));this.img=D.SKINS[state.playerSkin].left.buttons;
    this.menu=this.add(new Menu());this.activeB=[];this.inactiveB=[];
    state.units.forEach((id,i)=>this.activeB.push(this.mk(id,true,...this.aPos(i))));state.inactiveUnits.forEach((id,j)=>this.inactiveB.push(this.mk(id,false,...this.iPos(j))));
    this.add(new Menu([btn('back',240,285,()=>{sfx('select.wav');state.save();Director.replace(new WorldMapScene(state));})]));
    if(showTutorial){this.active=false;tutorial(this,[['white','Welcome to the Barracks!',130],['tiny','You can only bring 8 units into battle.',150],['tiny','Come here to change your unit selection!',170],['tiny','Touch a unit to swap it!',190]],()=>{this.active=true;});}
  }
  aPos(i){return [72+48*i,28];}iPos(j){return [48+48*(j%9),88+48*Math.floor(j/9)];}
  mk(id,act,x,y){const r=hudRect(id);const b=new Button(this.img,r,[r[0],r[1]+96,48,48],x,y,b=>this.swap(b),{immediate:true,extra:{id,isActive:act}});this.menu.add(b);return b;}
  swap(b){
    if(!this.active)return;const st=this.state;
    if(b.isActive){const others=st.units.filter((u,i)=>this.activeB[i]!==b);
      if((b.id===2||b.id===16)&&!others.some(u=>u===2||u===16)){sfx('no2.wav');this.active=false;const L=new Node();L.add(helpBanner(160),1);L.add(new Label('white','Cannot remove unit',240,140),2);L.add(new Label('tiny','Must have at least one woodcutter unit',240,165),2);L.add(new Menu([btn('continue_',240,205,()=>{L.remove();this.active=true;})]),2);this.add(L,5);return;}
      sfx('swap.wav');const i=this.activeB.indexOf(b);this.activeB.splice(i,1);st.units.splice(i,1);st.inactiveUnits.push(b.id);b.isActive=false;b.run(new MoveTo(.1,...this.iPos(this.inactiveB.length)));this.inactiveB.push(b);
      this.activeB.forEach((x,k)=>x.run(new MoveTo(.1,...this.aPos(k))));}
    else{if(st.units.length>=8){sfx('no2.wav');return;}
      sfx('swap.wav');const j=this.inactiveB.indexOf(b);this.inactiveB.splice(j,1);st.inactiveUnits.splice(j,1);st.units.push(b.id);b.isActive=true;b.run(new MoveTo(.1,...this.aPos(this.activeB.length)));this.activeB.push(b);
      this.inactiveB.forEach((x,k)=>x.run(new MoveTo(.1,...this.iPos(k))));}
    st.save();
  }
}
// ======================= Appearance =======================
class SkinSelectScene extends Scene{
  constructor(state){super();this.state=state;this.add(new Img('shopbg.png'));this.add(new Label('white','Select your appearance!',240,40));
    this.idx=Math.max(0,state.unlockedSkins.indexOf(state.playerSkin));this.nameL=this.add(new Label('tiny',' ',240,70));
    this.preview=this.add(new DrawNode(ctx=>{const sk=D.SKINS[this.state.playerSkin].left;drawCastle(ctx,sk.castle,0,state.upgrades,this.t||0);if(state.hasUnit(5))drawEntry(ctx,sk.units,'Cannon',52,172);
      state.units.forEach((id,i)=>{const t=UNIT_KEYS[id];if(!t)return;drawEntry(ctx,sk.units,UNITS[t].sprite,140+80*(i%4),135+85*Math.floor(i/4));});}),1);
    const m=new Menu();this.add(m,2);
    this.l=m.add(new Button(CON,[48,128,48,48],[48,128,48,48],90,70,()=>{this.idx--;this.load();}));this.r=m.add(new Button(CON,[0,128,48,48],[0,128,48,48],390,70,()=>{this.idx++;this.load();}));
    m.add(btn('finished',240,280,()=>{sfx('select.wav');state.save();Director.replace(new WorldMapScene(state));}));this.load();
  }
  tick(dt){this.t=(this.t||0)+dt;}
  load(){const st=this.state;this.idx=Math.max(0,Math.min(st.unlockedSkins.length-1,this.idx));
    this.l.enabled=this.idx>0;this.l.opacity=this.idx>0?255:100;this.r.enabled=this.idx<st.unlockedSkins.length-1;this.r.opacity=this.r.enabled?255:100;
    const L=new Node();L.add(helpBanner(155));L.add(new Label('white','Loading Appearance...',240,155));this.add(L,5);
    this.after(.05,()=>{st.playerSkin=st.unlockedSkins[this.idx];this.nameL.str=D.SKINS[st.playerSkin].name;st.save();L.remove();});}
}
// ======================= Campaign result =======================
class CampaignResultScene extends Scene{
  constructor(P,victory,achievements){
    super();const st=P.state,c=D.castleById(P.castleId);this.P=P;this.state=st;this.active=true;
    this.add(new Img(c.background));
    st.numBattles++;let newUnits=false,newSkin=false,tp=0;
    if(victory){st.numVictories++;const already=st.ownsCastle(c.id);st.currentMap=c.id>=39?2:c.id>=20?1:0;
      this.goToGameOver=!already&&st.ownAllCastlesAfterWinning(c.id);
      tp=c.techReward+achievements.reduce((a,x)=>a+x.tp,0);if(already)tp=Math.trunc(tp/2);st.techPoints+=tp;
      if(!already){st.winCastle(c.id);st.lastCastleBeat=c.id;for(const u of c.upgrades)if(!st.hasUpgradeAvailable(u)){st.upgradesAvailable.push(u);newUnits=true;if(D.upgradeInfo(u).techCost===0&&!st.hasUpgrade(u))st.upgrades.push(u);}
        if([25,27,35,36].includes(c.id)&&!st.hasSkin(2)){st.unlockedSkins.push(2);newSkin=true;}}}// v1.85 checked hasSkin(1), so the Temple skin never unlocked
    st.save();
    this.add(helpBanner(160),0);const m=new Menu();
    const cont=btn('continue_',240,233,()=>this.done()),rep=btn('replay',240,286,()=>this.retry());
    if(!victory){this.add(new Label('white','You Lose',240,160),1);m.add(cont);m.add(rep);if(st.numCastlesOwned()===0)cont.remove();}
    else{rep.y=233;cont.y=286;m.add(cont);m.add(rep);if(this.goToGameOver){rep.visible=false;rep.enabled=false;}
      this.add(new Sprite('sprites_banners_alpha.png',[160,0,160,320],240,160),-1);
      this.add(new Label('white','Awards:',240,20),1);
      if(achievements.length)achievements.forEach((a,i)=>this.add(new Label('tiny',a.name,240,50+15*i),1));else this.add(new Label('tiny','None',240,50),1);
      this.add(new Label('white','You win!',240,140),1);this.add(new Label('white',`You earned ${tp} tech points!`,240,170),1);
      if(newUnits){this.active=false;message(this,'New units unlocked!','They can be bought from the shop',()=>{this.active=true;});}
      else if(newSkin){this.active=false;message(this,'New appearance unlocked!','It can be selected in the appearance screen',()=>{this.active=true;});}
    }
    this.add(m,1);
  }
  retry(){if(!this.active)return;sfx('select.wav');Director.replace(new (require("battle").BattleScene)(D.campaignParams(this.state,this.P.castleId)));}
  done(){if(!this.active)return;sfx('select.wav');const st=this.state;
    if(this.goToGameOver)Director.replace(new CampaignVictoryScene(st));else if(st.lastCastleBeat===1)Director.replace(new ShopScene(st,true));else Director.replace(new WorldMapScene(st));}
}
class CampaignVictoryScene extends Scene{
  constructor(st){super();Audio.playMusic('ccwin.mp3',false);const pre=['','egypt_','north_'][st.currentMap]??'';require("extras").Stats.flag('realm'+st.currentMap);
    this.add(new Img(pre+'victory.png'));const night=this.add(new Img(pre+'victory_night.png'));night.opacity=0;night.run(new Seq(new Delay(3.25),FadeIn(1)));
    const l1=this.add(new Label('white','You have conquered the realm!',240,20));l1.opacity=0;l1.run(new Seq(new Delay(5),FadeIn(1)));
    if(!st.conqueredAllRealms()){const l2=this.add(new Label('white',"But there's more realms left!",240,40));l2.opacity=0;l2.run(new Seq(new Delay(5),FadeIn(1)));}
    this.after(8,()=>{sfx('explosionbig.wav');this.add(new Label('white',`Victories: ${st.numVictories} / Battles: ${st.numBattles}`,20,80,'left'));});
    this.after(9,()=>{sfx('explosionbig.wav');this.add(new Label('white','Rank: '+D.RANKS(st.numBattles?st.numVictories/st.numBattles:0),20,110,'left'));});
    this.after(10,()=>{sfx('explosionbig.wav');this.add(new Menu([btn('map',310,285,()=>{sfx('select.wav');Audio.stopMusic();Director.replace(new WorldMapScene(st));})]));});
  }
  exit(){Audio.stopMusic();}
}
Object.assign(exports,{WorldMapScene,ShopScene,UnitChangeScene,SkinSelectScene,CampaignResultScene,CampaignVictoryScene});
