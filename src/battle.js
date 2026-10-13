// GameScene presentation: castles, scenery, units, HUD, hints, quit/pause/help, end sequence.
const C=require("core");
const {Node,Scene,Menu,Button,Label,Img,DrawNode,Director,Audio,sfx,sprite,drawEntry,text,textWidth,entry,CON,btn,Store}=C;
const {Battle,UNITS,ground,unitY,unitBounds,AIR_Y}=require("engine");
const {ATLASES}=require("atlases");
const D=require("data");
const {shouldQuit}=require("dialogs");
const R=n=>Math.floor(Math.random()*n);
const UPG_POS=[[[24,143],[456,143]],[[120,246],[360,246]],[[48,239],[432,239]],[[48,239],[432,239]]]; // Tower, Dock, Magic, Seige (canvas centres)
function drawCastle(ctx,atlas,side,upgrades,t,{debris=false,dx=0,dy=0}={}){
  const cx=(side===0?48:432)+dx,cy=191+dy;
  if(debris){drawEntry(ctx,atlas,'CastleDebris',cx,255+dy);return;}
  drawEntry(ctx,atlas,'Castle',cx,cy);
  // Expansion: Temple (obelisk) and Solar (sun disk) had no visual in 1.85.
  if(upgrades.includes(4))sprite(ctx,'spr_upgrades_alpha.png',[0,0,16,48],(side===0?104:376)+dx,262+dy,{flipX:side===1});
  if(upgrades.includes(6)){const x=(side===0?136:344)+dx,f=Math.floor(t*6)%3;sprite(ctx,'spr_north_fx_alpha.png',[(side===0?0:48)+16*f,0,16,48],x,Math.floor(ground(x))-24+dy,{flipX:side===1});}
  if(upgrades.includes(5))sprite(ctx,'spr_upgrades_alpha.png',[16+32*(Math.floor(t*4)%4),0,32,32],(side===0?76:404)+dx,124+dy+Math.round(Math.sin(t*2)),{flipX:side===1});
  for(const id of upgrades){if(id===0||id===1||id===3){const name=['Tower','Dock',null,'Seige'][id],[x,y]=UPG_POS[id][side];drawEntry(ctx,atlas,name,x+dx,y+dy);}}
  for(const id of upgrades)if(id===2){const [x,y]=UPG_POS[2][side];drawEntry(ctx,atlas,'MagicAnimation',x+dx,y+dy,t,{fps:10});}
}
function unitAnim(u,battle){
  const unit=UNITS[u.type],stem=unit.sprite,attack=u.state==='attack'||u.engageUntil>battle.time;let anim=stem;
  if(u.type==='treeCutter'&&u.carrying)anim='TreeTopHarvesterReturnAnimation';else if(u.type==='worm')anim='SandWorm'+u.phase+'Animation';else if(unit.role==='support'&&u.returning)anim=stem+'ReturnAnimation';else if(u.praying&&u.type!=='necro')anim=stem+(u.blessUntil>battle.time?'BlessAnimation':'PrayAnimation');else if(u.type==='witch'&&u.cat)anim='WitchCatWalkAnimation';else if(['fire','ice'].includes(u.type)&&u.returning)anim=stem+'ReturnAnimation';else if(u.type==='cash'&&u.carrying)anim='CashWizardReturnAnimation';else if(unit.flies)anim=stem+'FlyAnimation';else if(u.carrying)anim=stem+'CarryAnimation';else if(attack)anim=u.type==='pike'?'PikemanDefendAnimation':u.type==='ram'?stem+'WalkAnimation':stem+'AttackAnimation';else if(u.state==='walk'||u.state==='return')anim=stem+'WalkAnimation';
  return {anim,attack};
}
function drawUnit(ctx,atlas,u,battle,alpha=1){
  if(u.hidden)return;const unit=UNITS[u.type];
  if(u.type==='unicorn'){const f=Math.floor((battle.time-u.spawned)*10)%3;sprite(ctx,'sprites_ultimate.png',[f*64,0,64,48],u.x,unitY(u));return;}
  let {anim,attack}=unitAnim(u,battle);const E=ATLASES[atlas].entries;if(!E[anim])anim=unit.sprite;
  const hasReturn=(u.type==='engineer'||(u.type==='treeCutter'&&u.carrying)||u.returning||(u.type==='cash'&&u.carrying));
  const fwd=u.side===0?1:-1,flip=hasReturn?false:u.carrying?u.facing===fwd:u.facing!==fwd;
  const timer=u.type==='worm'?battle.time-u.phaseStarted:attack?battle.time-u.attackStarted:battle.time-u.spawned;
  const fps=u.carrying&&u.type==='thief'?4:attack?(unit.attackFps??(u.type==='pike'?1/.15:10)):(unit.walkFps??(u.type==='master'?10:1/.15));
  const def=E[anim];if(attack&&def?.RevertWhenOver&&timer>=(def.Frames??1)/fps)anim=unit.sprite;
  drawEntry(ctx,atlas,anim,u.x,unitY(u),timer,{flipX:flip,fps:unit.flies?10:fps,alpha:(u.ghost?200/255:1)*alpha});
  if(u.frozenUntil>battle.time){const [l,t,r,b]=unitBounds(u);ctx.save();ctx.globalAlpha=.45*alpha;ctx.fillStyle='#bfeaff';ctx.fillRect(l,t,r-l,b-t);ctx.globalAlpha=.9*alpha;ctx.fillStyle='#ffffff';ctx.fillRect(l+1,t+1,2,2);ctx.fillRect(r-4,t+4,2,2);ctx.restore();}
  const badges=u.badges||[];badges.forEach((b,k)=>{const h=E[unit.sprite]?.Height??24;drawEntry(ctx,atlas,b,u.x+(u.side===0?-1:1)*20*k,unitY(u)-h/2-14);});
}
function drawProjectile(ctx,atlas,sceneryAtlas,p,battle){
  if(p.type==='petard'){drawEntry(ctx,atlas,p.sprite,p.x,p.y);return;}
  if(p.scenery){drawEntry(ctx,sceneryAtlas,p.sprite,p.x,p.y,battle.time-p.born,{fps:20});return;}
  const angle=p.type==='wreck'?(p.rotateAngle??0)*Math.min(1,(battle.time-p.born)/p.rotateFor):['bomb','dust','abandoned','unitDrop','napalm','mummyFall'].includes(p.type)?0:(Math.atan2(p.vy,p.vx)+(p.side===1?Math.PI:0))*180/Math.PI;
  drawEntry(ctx,atlas,p.sprite,p.x,p.y,battle.time-p.born,{fps:p.animationFps??10,rotation:angle});
}
class HelpScene extends Scene{constructor(){super();this.add(new Img('help.png'));this.add(new Menu([btn('back',425,295,()=>{sfx('select.wav');Director.pop();})]),2);}}
class BattleScene extends Scene{
  constructor(params,{restore=null}={}){
    super();this.params=params;this.pausable=true;const P=params;
    const tg=D.TREE_GROWTH[P.treeGrowth]??D.TREE_GROWTH[1];
    const opts={ai:P.mode===2?[false,false]:[false,true],difficulty:P.difficulty,campaign:P.mode===1,campaignDifficulty:P.campaignDifficulty??0,globalDifficulty:P.globalDifficulty??0,
      rosters:[P.playerUnits,P.enemyUnits],cannons:P.cannons,hint:P.hint,easyQuick:P.easyQuick,aiFrequency:P.aiFrequency,mode:P.mode,
      config:{startWood:P.startGold,castleHealth:P.playerHealth,treeChance:tg.treeChance,maxTrees:tg.maxTrees,allowHeals:P.allowHeals,tallTrees:P.elements.includes(1),antlion:P.elements.includes(2),blizzard:P.elements.includes(3),thinIce:P.elements.includes(4)}};
    this.battle=restore?Battle.restore(restore,opts):new Battle(opts);const b=this.battle;
    if(!restore){b.sides[0].hp=b.sides[0].maxHp=P.playerHealth;b.sides[1].hp=b.sides[1].maxHp=P.enemyHealth;}
    this.skinL=D.SKINS[P.playerSkin].left;this.skinR=D.SKINS[P.mode===2?P.enemySkin:P.enemySkin].right;
    this.unitAtlas=[this.skinL.units,this.skinR.units];this.castleAtlas=[this.skinL.castle,this.skinR.castle];
    this.lastHealth=[-1,-1];this.hpAcc=0;this.floats=[];this.heard=0;this.gameOver=false;this.buyingAllowed=false;this.hudVisible=true;this.ultimateClicks=0;
    this.explosions=[];this.debris=[false,false];this.shakeT=0;this.shakeM=0;this.achieve=P.mode===1?{nonWood:false,nonAir:false,nonWitch:false,nonWorm:false,wood:false,air:false,witch:true,worm:true}:null;
    // scenery
    const S=D.SCENERY[P.scenery]||{};this.scn=S;this.clouds=(S.clouds||[]).map(f=>{const big=f.endsWith('1.png');return {img:f,y:big?40:112,speed:big?15:8,xs:[240,-240]};});
    this.birds=S.birds?{dark:S.birds==='dark',x:0,y:320,flying:null,next:R(20)+8}:null;
    this.sparkles=(S.sparkles||[]).map(([x,y])=>({x,y,next:R(3)+2,start:null}));
    this.sceneTime=0;
    // HUD menus (drawn manually in z order; visible=false keeps them touchable)
    this.buildButtons();this.buildHud();
    if(P.hint&&!restore)this.addHint();
    this.after(restore?.5:(P.hint?3:.5),()=>this.startGame());
    if(S.surf)Audio.playMusic('surf.wav',true);else Audio.stopMusic();
  }
  exit(){Audio.stopMusic();}
  buildButtons(){
    const P=this.params,b=this.battle;this.unitMenus=[];
    const mk=(side,types,img,place,doubleBtn)=>{
      const m=new Menu();m.visible=false;
      types.forEach((type,k)=>{const u=UNITS[type],[x,y]=place(k);const it=new Button(img,[u.hud[0],u.hud[1],48,48],[u.hud[0],u.hud[1]+96,48,48],x,y,()=>this.buy(side,type),{immediate:true});it.price=u.cost;it.side=side;it.labelY=place.labelY(y);m.add(it);});
      if(doubleBtn){const [x,y]=place(types.length);const it=new Button(img,[144,48,48,48],[144,144,48,48],x,y,()=>this.buyDouble(side));it.price=150;it.side=side;it.isDouble=true;it.labelY=place.labelY(y);m.add(it);}
      this.add(m);this.unitMenus.push(m);
    };
    const top=k=>[48*(k+1),28];top.labelY=y=>62;
    mk(0,b.rosters[0],this.skinL.buttons,top,P.doubleIncome);
    if(P.mode===2){const bot=k=>[480-48*(k+1),294];bot.labelY=y=>262;mk(1,b.rosters[1],this.skinR.buttons,bot,false);}
  }
  buildHud(){
    const P=this.params;const m=new Menu();m.visible=false;this.hud=m;
    const twoP=P.mode===2;
    this.quitBtn=new Button(CON,[192,32,48,48],[192,80,48,48],twoP?452:428,twoP?28:295,()=>this.askQuit());m.add(this.quitBtn);
    if(!twoP){this.pauseBtn=new Button(CON,[0,32,48,48],[0,80,48,48],85,295,()=>this.togglePause());m.add(this.pauseBtn);
      m.add(new Button(CON,[144,32,48,48],[144,80,48,48],35,295,()=>this.help()));}
    if(P.mode===0&&P.trophy)m.add(new Button(CON,[48,208,24,24],null,240,89,()=>this.createGod()));
    this.add(m);
  }
  addHint(){
    const L=new Node();this.hint=L;const els=[new C.Banner('help_banner.png',240,155),new Label('white','You are the blue castle',240,125),new Label('tiny','Gather trees for resources.',240,145),new Label('tiny','Touch the buttons above to build units!',240,165),new Label('tiny','Destroy the red castle!',240,185)];
    for(const e of els){e.opacity=0;e.run(C.FadeIn(.75));L.add(e);}
    L.visible=false;this.add(L,-2);
    this.after(5,()=>{const fade=this.schedule(dt=>{let done=false;for(const e of els){if(dt*255>e.opacity)done=true;e.opacity=Math.max(0,e.opacity-dt*255);}if(done){this.unschedule(fade);L.remove();this.hint=null;}},.016);});
  }
  startGame(){this.buyingAllowed=true;this.battle.start();}
  activeHud(){return this.hudVisible&&!this.gameOver&&!this.quitLayer;}
  buy(side,type){
    const b=this.battle;if(!this.buyingAllowed||Director.paused||this.gameOver)return;
    if(b.spawn(side,type)){sfx('buy.wav');}
  }
  buyDouble(side){if(!this.buyingAllowed||Director.paused)return;if(this.battle.buyDoubleIncome(side)){sfx('buy.wav');const it=this.unitMenus[side].children.find(c=>c.isDouble);if(it)it.enabled=false;}}
  createGod(){this.ultimateClicks++;if(this.ultimateClicks>2){this.ultimateClicks=0;if(this.battle.running)this.battle.createUnit(0,'unicorn');}}
  togglePause(){if(!this.activeHud()||this.pauseLocked)return;sfx('select.wav');this.setPaused(!Director.paused);}
  setPaused(p){Director.paused=p;if(this.pauseBtn){this.pauseBtn.normal=p?[48,32,48,48]:[0,32,48,48];this.pauseBtn.sel=p?[48,80,48,48]:[0,80,48,48];}}
  help(){if(!this.activeHud())return;sfx('select.wav');Director.push(new HelpScene());}
  resume(){Director.paused=this.pausedBefore??Director.paused;}
  askQuit(){
    if(!this.activeHud())return;sfx('select.wav');const P=this.params;
    const msg=P.mode===0?'(Your game will be saved)':P.mode===1?(P.state.numCastlesOwned()!==0?'(You will be taken to the map)':'(You will be taken to the menu)'):'Really forfeit?';
    if(P.mode!==2){this.setPaused(true);this.pauseLocked=true;}
    this.quitLayer=shouldQuit(this,msg,()=>this.quit(),()=>{this.pauseLocked=false;this.setPaused(false);this.quitLayer=null;},6);
  }
  quit(){
    this.pauseLocked=false;this.setPaused(false);const P=this.params;const S=require("scenes");
    if(P.mode===0){Store.set('quicksave',{snapshot:this.battle.snapshot(),params:{...P,state:undefined}});Director.replace(new S.MenuScene());}
    else if(P.mode===1){if(!P.state.ownsCastle(0)){D.CampaignState.remove(P.state.campaignId);Director.replace(new S.MenuScene());}else if(P.state.lastCastleBeat===1)Director.replace(new S.ShopScene(P.state,true));else Director.replace(new S.WorldMapScene(P.state));}
    else Director.replace(new S.MenuScene());
  }
  saveOnUnload(){if(this.params.mode===0&&!this.gameOver&&this.battle.started)Store.set('quicksave',{snapshot:this.battle.snapshot(),params:{...this.params,state:undefined}});}
  // ---- per-frame ----
  tick(dt){
    const b=this.battle;this.sceneTime+=dt;
    if(!this.gameOver)b.update(dt);
    this.hpAcc+=dt;while(this.hpAcc>=.032){this.hpAcc-=.032;for(const s of [0,1]){const hp=Math.max(0,b.sides[s].hp);if(this.lastHealth[s]<0)this.lastHealth[s]=hp;else if(this.lastHealth[s]<hp)this.lastHealth[s]++;else if(this.lastHealth[s]>hp)this.lastHealth[s]--;}}
    this.handleEvents();
    for(const f of this.floats){f.life+=dt;f.y-=15*dt;}this.floats=this.floats.filter(f=>f.life<1);
    for(const c of this.clouds)c.xs=c.xs.map(x=>{x+=c.speed*dt;return x>720?x-960:x;});
    if(this.birds){const B=this.birds;B.next-=dt;if(B.flying){B.flying.t+=dt;const p=Math.min(1,B.flying.t/15);B.x=B.flying.x0+(B.flying.x1-B.flying.x0)*p;if(p>=1)B.flying=null;}
      if(B.next<=0){sfx('birdies.wav');const left=R(2)===0;B.flying={x0:left?512:-32,x1:left?-32:512,left,t:0};B.y=320-(R(120)+180);B.x=B.flying.x0;B.next=544/30+8+R(20);}}
    for(const s of this.sparkles){s.next-=dt;if(s.next<=0){s.start=this.sceneTime;s.next=R(3)+3;}}
    if(this.shakeT>0){this.shakeT-=dt;const m=Math.trunc(this.shakeM);this.shake=this.shakeT>0&&m>0?[R(2*m+1)-m,R(2*m+1)-m]:null;}else this.shake=null;
    if(b.winner&&!this.gameOver)this.beginGameOver();
  }
  handleEvents(){
    const b=this.battle,played=new Set(),play=f=>{if(!played.has(f)){played.add(f);sfx(f);}};
    for(const e of b.events){if(e.seq<=this.heard)continue;
      switch(e.type){
        case 'chop':play('treechop.wav');break;case 'deposit':play('yay.wav');break;case 'heal':play('yay.wav');break;
        case 'steal':play('buy.wav');break;case 'castleHit':play('castlehit.wav');break;case 'fight':play('groundkill.wav');break;
        case 'explosion':play('explosion.wav');break;case 'explosionBig':play('explosionbig.wav');break;
        case 'cannon':if(this.params.mode!==2&&e.side===1)play('explosion.wav');else play('buy.wav');break;
        case 'blimp':play(e.unitType==='bomber'?'bomber.wav':e.unitType==='napalm'?'napalmjet.wav':'blimp.wav');break;
        case 'drop':play('bombsaway.wav');break;case 'treeLand':play('treestick.wav');break;case 'fuse':play('petardfuse.wav');break;
        case 'fireball':play('fireball.wav');break;case 'ice':play('ice.wav');break;case 'polymorph':play('polytree.wav');break;case 'witch':play('polymorph.wav');break;
        case 'bless':play('bless.wav');break;case 'blizzard':play('ice.wav');break;case 'iceFall':play('ice.wav');play('groundkill.wav');break;case 'crew':play('explosion.wav');break;case 'necro':play('necro.wav');break;case 'worm':play('wurm.wav');break;case 'wormDie':play('wurmdie.wav');break;
        case 'gold':this.floats.push({str:(e.amount>0?'+':'')+e.amount,font:e.amount>0?'tiny':'tinyRed',x:e.x,y:e.y,life:0});break;
        case 'shake':this.shakeT=e.duration;this.shakeM=e.magnitude;break;
        case 'unitHitEnemy':if(this.achieve&&e.side===0){const A=this.achieve;const wood=['wood','master'].includes(e.unitType);if(!wood){A.nonWood=true;A.wood=false;}else if(!A.nonWood)A.wood=true;if(!e.flies){A.nonAir=true;A.air=false;}else if(!A.nonAir)A.air=true;if(e.unitType!=='witch'){A.nonWitch=true;A.witch=false;}else if(!A.nonWitch)A.witch=true;if(e.castleStrength>0&&e.unitType!=='worm'){A.nonWorm=true;A.worm=false;}else if(!A.nonWorm)A.worm=true;}break;
      }
      this.heard=e.seq;}
  }
  beginGameOver(){
    const b=this.battle;this.gameOver=true;this.hudVisible=false;const loser=b.loser;this.loser=loser;
    b.units=b.units.filter(u=>u.side!==loser);if(this.quitLayer){this.quitLayer.remove();this.quitLayer=null;}
    this.hud.remove();let n=0;
    const t=this.schedule(()=>{n++;const cx=loser===0?48:432;this.explosions.push({x:Math.trunc(cx+R(60)-30),y:Math.trunc(191+R(60)-30),t:0});if(n>8){sfx('explosionbig.wav');this.unschedule(t);}else sfx('explosion.wav');},.1);
    this.after(1,()=>{this.debris[loser]=true;b.cannons[loser]=false;});
    this.after(2,()=>this.goToResults());
  }
  achievements(){
    if(!this.achieve)return [];const A=this.achieve,b=this.battle,you=b.sides[0];
    const list=[['Flawless Victory',1,you.hp===you.maxHp],['Filthy Rich',1,you.wood>99],['Clear Cut',1,b.trees.filter(t=>t.remaining>0).length===0],['Power to the People',2,A.wood],['Aerial Victory',1,A.air],['Witching Hour',1,A.witch],['Original Health',1,you.maxHp===80],['Arrakis Attack!',1,A.worm]];
    return list.filter(a=>a[2]).map(([name,tp])=>({name,tp}));
  }
  goToResults(){
    const S=require("scenes"),b=this.battle,P=this.params,victory=b.sides[1].hp<=0;
    if(P.mode===0)Director.replace(new S.GameOverScene({victory,player:b.sides[0],enemy:b.sides[1],difficulty:P.difficulty}));
    else if(P.mode===1)Director.replace(new S.CampaignResultScene(P,victory,this.achievements()));
    else Director.replace(new S.MPResultScene(P,b));
  }
  update(dt){super.update(dt);for(const e of this.explosions)e.t+=dt;}
  drawSnow(ctx,b){
    const t=this.sceneTime,storm=b.blizzardOn(),fade=storm?Math.min(1,(b.time-(b.blizzard.until-6))/.8,(b.blizzard.until-b.time)/.8):0;
    const n=(this.scn.snow?36:0)+Math.round(150*fade),VW=C.VIEW.w,VX=-C.VIEW.ext;ctx.save();ctx.fillStyle='#ffffff';
    for(let i=0;i<n;i++){const h=(i*2654435761)>>>0,sp=18+(h%23)+(i>=36?60*fade:0),wind=(i>=36?-90:-6)*(i>=36?fade:1);
      const x=VX+(((h%VW)+wind*t+Math.sin(t*1.3+i)*6)%VW+VW)%VW,y=((h>>>9)%320+sp*t)%320;ctx.globalAlpha=i%3?.85:.55;const sz=i%5===0?2:1;ctx.fillRect(Math.floor(x),Math.floor(y),sz,sz);}
    if(fade>0){ctx.globalAlpha=.22*fade;ctx.fillRect(VX,0,VW,320);}
    ctx.restore();
  }
  updateWhilePaused(){}
  // ---- drawing ----
  drawSelf(ctx){
    const P=this.params,b=this.battle,t=this.sceneTime,SA=P.sceneryAtlas;
    ctx.drawImage(C.IMG[P.background],0,0);
    // scenery layer: birds & sparkles (z-4), then trees & heal pickup
    if(this.birds){const B=this.birds,dark=B.dark;if(B.flying)drawEntry(ctx,SA,(dark?'birdDark':'bird')+(B.flying.left?'LeftAnimation':'RightAnimation'),B.x,B.y,B.flying.t,{fps:10});else drawEntry(ctx,SA,dark?'birdDarkRight':'birdRight',B.x,B.y);}
    for(const s of this.sparkles)if(s.start!==null&&t-s.start<.6)drawEntry(ctx,SA,'sparkleAnimation',s.x,s.y,t-s.start,{fps:10});
    if(b.thinIce){const I=b.thinIce,y=Math.floor(ground(240))-3;sprite(ctx,'spr_north_fx_alpha.png',[0,48,72,10],240,y);
      if(I.hole)sprite(ctx,'spr_north_fx_alpha.png',[72,48,36,10],I.hole.x,Math.floor(ground(I.hole.x))-3,{alpha:Math.min(1,(I.hole.until-b.time)/.4)});}
    for(const tr of b.trees){const age=tr.grown?9:b.time-tr.born;drawEntry(ctx,SA,age<3?'treeGrowAnimation':'treeGrown',Math.trunc(tr.x),Math.floor(ground(tr.x)),age,{fps:5,anchor:'bottom'});}
    if(b.healPickup)drawEntry(ctx,SA,'healthPack',b.healPickup.x,b.healPickup.y);
    for(const p of b.skillEffects)if(p.atlas==='scenery')drawEntry(ctx,SA,p.sprite,p.x,p.y,b.time-p.born,{fps:p.fps,anchor:'bottom'});
  }
  draw(ctx){
    if(!this.visible)return;const P=this.params,b=this.battle,t=this.sceneTime;
    this.drawSelf(ctx);
    if(this.hint)this.hint.visible=true,this.hint.draw(ctx),this.hint.visible=false;
    for(const c of this.clouds)for(const x of c.xs)sprite(ctx,c.img,[0,0,480,c.img.endsWith('1.png')?80:64],Math.trunc(x),c.y);
    // castles
    for(const s of [0,1]){const ups=s===0?P.playerUpgrades:P.enemyUpgrades;drawCastle(ctx,this.castleAtlas[s],s,ups,t,{debris:this.debris[s]});}
    // unit buttons (ButtonLayer, z0 above castles)
    for(const m of this.unitMenus)for(const it of m.children){
      const side=it.side,gold=b.sides[side].wood;if(!this.gameOver)it.opacity=it.price<=gold?255:100;
      const half=P.mode===2&&side===1;
      it.drawSelf(ctx);text(ctx,'blue',it.price,it.x,it.labelY);if(half){}
    }
    // unit layers: player atlas then enemy atlas (spawn order)
    for(const s of [0,1]){
      const atlas=this.unitAtlas[s],items=[];
      if(b.cannons[s])items.push({id:-1,draw:()=>{const fired=b.time-b.cannonFired[s];drawEntry(ctx,atlas,fired<.25?'CannonFireAnimation':'Cannon',s===0?52:432,s===0?172:175,fired,{fps:20});}});
      for(const u of b.units)if(u.side===s)items.push({id:u.id,draw:()=>drawUnit(ctx,atlas,u,b)});
      for(const u of b.attackEffects)if(u.side===s)items.push({id:u.id+.5,draw:()=>drawUnit(ctx,atlas,u,b)});
      for(const p of b.projectiles)if(p.side===s)items.push({id:p.id,draw:()=>drawProjectile(ctx,atlas,P.sceneryAtlas,p,b)});
      for(const p of b.skillEffects)if(p.side===s&&p.atlas!=='scenery'){const nap=p.sprite==='BurningNapalmAnimation'&&b.time-p.born>=.9;items.push({id:p.id,draw:()=>drawEntry(ctx,atlas,nap?'FadingNapalmAnimation':p.sprite,p.x,p.y,nap?b.time-p.born-.9:b.time-p.born,{fps:p.fps,anchor:p.anchor??'bottom'})});}
      for(const p of b.projectileEffects)if(p.side===s)items.push({id:p.id,draw:()=>drawEntry(ctx,atlas,'ExplosionDefaultAnimation',p.x,p.y,b.time-p.born,{fps:20})});
      items.sort((a,c)=>a.id-c.id).forEach(i=>i.draw());
      if(this.gameOver&&this.loser===s)for(const e of this.explosions)if(e.t<.5)drawEntry(ctx,atlas,'ExplosionDefaultAnimation',e.x,e.y,e.t,{fps:10});
    }
    // foreground (tall tree tops z-3, antlion z0, trunks z3)
    if(b.tallTrees.length||b.antlion){const FG='EgyptianForeground';
      for(const tt of b.tallTrees){const y=320-(tt.base+144);if(tt.ready)drawEntry(ctx,FG,'TallTreeTopGrowAnimation',tt.x,y,99,{fps:20});else if(tt.growAt!==null)drawEntry(ctx,FG,'TallTreeTopGrowAnimation',tt.x,y,b.time-tt.growAt,{fps:20});else drawEntry(ctx,FG,'TallTreeTopBareAnimation',tt.x,y);}
      if(b.antlion){const a=b.antlion;drawEntry(ctx,FG,a.attackStarted!==null?'AntlionAttackAnimation':'AntlionIdleAnimation',240,296,a.attackStarted!==null?b.time-a.attackStarted:b.time,{fps:10});}
      for(const tt of b.tallTrees)for(let i=0;i<3;i++)drawEntry(ctx,FG,'TallTreeTrunk',tt.x,320-(tt.base+48*i));}
    // snowfall (Northern Realm) and blizzard
    if(this.scn.snow||b.blizzard)this.drawSnow(ctx,b);
    // HUD: health bars
    for(const s of [0,1]){const bx=s===0?10:375;sprite(ctx,CON,[0,s*16,96,16],bx+48,87);
      const w=Math.max(0,Math.round(90*Math.max(0,this.lastHealth[s])/b.sides[s].maxHp));if(w>0){const left=s===0?11:468-w;C.blit(ctx,CON,96+s,0,1,16,left,79,w,16);}}
    if(this.hudVisible){
      const icon=P.egypt?[112,0,16,16]:[96,16,16,16];
      for(const s of [0,1]){const str=String(Math.floor(b.sides[s].wood)),lx=s===0?148:333;text(ctx,'white',str,lx,89);sprite(ctx,CON,icon,lx-textWidth('white',str)/2-8,89);}
      for(const it of this.hud.children)it.drawSelf(ctx);
    }
    for(const f of this.floats)text(ctx,f.font,f.str,Math.trunc(f.x),Math.trunc(f.y),{alpha:Math.max(0,1-f.life)});
    for(const c of this.sorted())if(c!==this.hint&&c.visible&&!(c instanceof Menu))c.draw(ctx);
  }
}
Object.assign(exports,{BattleScene,HelpScene,drawCastle,drawUnit});
