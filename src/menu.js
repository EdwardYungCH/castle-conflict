// Front-end scenes: loading, main menu, quick play, settings, campaign files, credits, loading-battle, quick-play results, local multiplayer.
const C=require("core");
const {Node,Scene,Menu,Button,TextItem,Label,Img,Sprite,ColorLayer,DrawNode,Director,Audio,sfx,sprite,text,textWidth,BTN,CON,btn,helpBanner,fadeLayer,Store,FadeIn,FadeOut,Seq,Delay,Call}=C;
const D=require("data");
const X=require("extras");
const {UNITS,UNIT_KEYS,QUICK_ARMY}=require("engine");
const {yesNo,message}=require("dialogs");
const {UI,StoneBtn,TabletBtn}=require("ui");
const S=()=>require("scenes");
const fl=Math.floor;
// FauxGameLayout: grass-scene castles (+ towers)
function fauxLayout(towers=true){
  const n=new Node();n.add(new Sprite('spr_castles_alpha.png',[0,80,96,112],48,231));n.add(new Sprite('spr_castles_alpha.png',[96,80,96,112],432,231));
  if(towers){n.add(new Sprite('spr_castles_alpha.png',[288,0,48,96],24,143));n.add(new Sprite('spr_castles_alpha.png',[336,0,48,96],456,143));}
  n.setOpacity=v=>{for(const c of n.children)c.opacity=v;};return n;
}
const unitIcon=(id,img,x,y,scale=1)=>{const u=D.unitInfo(id);return new Button(img,[u.hud[0],u.hud[1],48,48],[u.hud[0],u.hud[1]+96,48,48],x,y,null,{immediate:true,scale});};
// ---------------- Loading ----------------
class LoadingScene extends Scene{
  constructor(){super();this.add(new Img('Loading.png'));this.add(new Sprite('sprites_title_alpha.png',[0,0,224,96],240,56),1);this.time=0;this.ready=false;}
  tick(dt){this.time+=dt;
    if(this.ready&&this.time>=2&&!this.faded&&(Audio.unlocked||!Audio.ctx)){this.faded=true;const g=new Img('bg_grass.png');g.opacity=0;g.run(FadeIn(1));this.add(g,0);const f=fauxLayout(true);for(const c of f.children){c.opacity=0;c.run(FadeIn(1));}this.add(f,0);this.after(1,()=>Director.replace(new MenuScene(true)));}
  }
  drawSelf(ctx){}
  draw(ctx){super.draw(ctx);if(this.ready&&this.time>=2&&!this.faded&&!Audio.unlocked&&Math.floor(this.time*2)%2===0)text(ctx,'tiny','Touch to start',240,300);if(C.DEBUG)text(ctx,'tiny',C.DEBUG,240,314,{alpha:.7});}
  touchBegan(){Audio.unlock();}
}
// ---------------- Main menu ----------------
class MenuScene extends Scene{
  constructor(fade=false){
    super();this.add(new Img('bg_grass.png'),0);
    const L=new Node();this.layer=L;this.add(L,1);
    this.logo=L.add(new Sprite('sprites_title_alpha.png',[0,0,224,96],240,56),0);L.add(fauxLayout(true),2);
    const active=()=>this.active;
    if(UI.modern){this.buildModern(L,active,fade);return;}
    this.main=new Menu([
      btn('campaign',240,128,()=>{if(!active())return;sfx('select.wav');this.hideMenu();L.add(new SelectCampaignLayer(this),5);}),
      btn('quickPlay',240,181,()=>{if(!active())return;sfx('select.wav');this.hideMenu();L.add(new QuickPlayLayer(this),0);}),
      btn('multi',240,234,()=>{if(!active())return;sfx('select.wav');Director.replace(new MPSelectScene());}),
      btn('aboutUs',240,287,()=>{if(!active())return;sfx('select.wav');this.hideMenu();this.logo.visible=false;L.add(new CreditsLayer(this),5);}),
      new Button(BTN,[768,384,48,48],[768,432,48,48],40,288,()=>{if(!active())return;sfx('select.wav');Director.replace(new PreviewScene());}),
      new Button(CON,[0,208,48,48],null,40,236,()=>{if(!active())return;sfx('select.wav');Director.replace(new X.RecordsScene());},{scale:.75}),
      new Button(BTN,[816,384,48,48],[816,432,48,48],440,288,()=>{if(!active())return;sfx('select.wav');Director.replace(new SurveyScene());}),
      new TabletBtn('New UI',130,290,()=>{if(!active())return;sfx('select.wav');UI.set(true);Director.replace(new MenuScene());},{w:80})]);
    L.add(this.main,5);this.active=!fade;
    if(fade){for(const c of this.main.children){c.opacity=0;c.run(FadeIn(.5));}this.after(.5,()=>{this.active=true;});}
  }
  // v3.0 one-page menu: continue the last campaign, the modes with their records, settings and the classic switch.
  buildModern(L,active,fade){
    const last=Store.get('lastCampaign',null),st=last&&D.CampaignState.exists(last)?D.CampaignState.load(last):null,started=st&&st.ownsCastle(0);
    const realm=st?require("campaign").REALM_INFO[st.currentMap]?.[0]??'':'';
    const q=D.GameScore.load(),stats=X.Stats.load(),ach=X.ACHIEVEMENTS.filter(a=>a[2](stats)).length;
    this.card=L.add(new DrawNode(ctx=>{UI.panel(ctx,40,104,400,62);
      if(started){text(ctx,'white',`Campaign ${st.campaignId}`,56,124,{align:'left'});text(ctx,'tiny',`${realm} - ${st.numCastlesOwned()}/${st.totalCastles()}`,56,146,{align:'left'});}
      else{text(ctx,'white','Campaign',56,124,{align:'left'});text(ctx,'tiny','Conquer the six realms',56,146,{align:'left'});}}),3);
    const go=f=>()=>{if(!active())return;sfx('select.wav');f();};
    const files=()=>{this.hideMenu();L.add(new SelectCampaignLayer(this),5);};
    const cont=()=>{if(!started){files();return;}Director.replace(new (S().WorldMapScene)(st));};
    const quick=()=>{if(Store.get('quicksave')){this.hideMenu();const o=new Node();o.add(new OverwriteLayer(o));o.add(new Menu([btn('back',240,265,()=>{sfx('select.wav');this.returnFromLayer(o);})]));L.add(o,5);}else startQuick();};
    this.main=new Menu([
      new TabletBtn('Files',318,135,go(files),{w:72}),btn(started?'play':'newGame',392,135,go(cont)),
      new TabletBtn('Quick Play',72,200,go(quick),{sub:q.best?`streak ${q.best}`:'1 player'}),
      new TabletBtn('Endless',180,200,go(()=>Director.replace(new CampaignLoadingScene(X.endlessParams(),{mimicHome:true,towers:true}))),{sub:stats.endlessBest?`wave ${stats.endlessBest}`:'waves'}),
      new TabletBtn('Multiplayer',288,200,go(()=>Director.replace(new MPSelectScene())),{sub:'2 players'}),
      new TabletBtn('Records',396,200,go(()=>Director.replace(new X.RecordsScene())),{sub:`${ach}/${X.ACHIEVEMENTS.length} awards`}),
      btn('custom',120,266,go(()=>Director.push(new SettingsScene()))),btn('aboutUs',240,266,go(()=>{this.hideMenu();this.logo.visible=false;L.add(new CreditsLayer(this),5);})),
      new TabletBtn('Classic UI',360,266,go(()=>{UI.set(false);Director.replace(new MenuScene());}),{w:96}),
      new Button(BTN,[768,384,48,48],[768,432,48,48],40,296,go(()=>Director.replace(new PreviewScene())),{scale:.75}),
      new Button(BTN,[816,384,48,48],[816,432,48,48],440,296,go(()=>Director.replace(new SurveyScene())),{scale:.75})]);
    L.add(this.main,5);this.active=!fade;
    if(fade){for(const c of this.main.children){c.opacity=0;c.run(FadeIn(.5));}this.after(.5,()=>{this.active=true;});}
  }
  enter(){Audio.playMusic('castleconflict.mp3',false);}
  exit(){Audio.stopMusic();}
  draw(ctx){super.draw(ctx);if(C.DEBUG&&(this.dbgT=(this.dbgT||0)+1/60)<10)text(ctx,'tiny',C.DEBUG,240,314,{alpha:.7});}
  hideMenu(){this.main.remove();if(this.card)this.card.visible=false;}
  returnFromLayer(layer){layer.remove();this.layer.add(this.main,5);this.logo.visible=true;if(this.card)this.card.visible=true;}
}
// ---------------- Quick play ----------------
function startQuick(){Director.replace(new CampaignLoadingScene(D.quickParams(),{mimicHome:true,towers:true}));}
class QuickPlayLayer extends Node{
  constructor(owner){super();this.owner=owner;
    this.menu=this.add(new Menu([
      btn('play',240,120,()=>{sfx('select.wav');if(Store.get('quicksave')){this.menu.remove();this.add(new OverwriteLayer(this));}else startQuick();}),
      btn('custom',240,168,()=>{sfx('select.wav');Director.push(new SettingsScene());}),
      X.textBtn('Endless',240,216,()=>{sfx('select.wav');Director.replace(new CampaignLoadingScene(X.endlessParams(),{mimicHome:true,towers:true}));}),
      btn('mainMenu',240,264,()=>{sfx('select.wav');owner.returnFromLayer(this);})]));}
}
class OverwriteLayer extends Node{
  constructor(){super();this.add(helpBanner(155));this.add(new Label('white','A saved game was found.',240,145));
    if(D.GameScore.load().numConsecutiveWins>0)this.add(new Label('tiny','(Starting a new game will erase your streak)',240,165));
    this.add(new Menu([btn('newGame',190,210,()=>{Store.del('quicksave');D.GameScore.clearStreak();sfx('select.wav');startQuick();}),
      btn('continue_',290,210,()=>{sfx('select.wav');const s=Store.get('quicksave');Store.del('quicksave');const P={...D.quickParams(),...s.params};Director.replace(new (require("battle").BattleScene)(P,{restore:s.snapshot}));})]));}
}
// ---------------- Settings ----------------
class SettingsScene extends Scene{
  constructor(){super();this.add(new Img('bg_grass.png'));this.add(fauxLayout(true));this.s=D.Settings.load();
    const m=new Menu();this.add(m,1);const s=this.s;const groups={};
    const opt=(group,value,x,y,col,row,disabledCol=0)=>{const b=new Button(BTN,[col,row,80,32],[col,row,80,32],x,y,()=>{sfx('select.wav');s[group]=value;refresh();},{disabled:[disabledCol,row,80,32]});(groups[group]=groups[group]||[]).push([b,value]);m.add(b);};
    const label=(str,y)=>m.add(new TextItem('white',str,240,y));
    opt('treeGrowthRate',0,140,227,80,288);opt('treeGrowthRate',2,340,227,80,352);opt('treeGrowthRate',1,240,227,80,224);label('Tree Growth Rate',202);
    opt('gameLength',2,140,107,80,192);opt('gameLength',1,240,107,80,224);opt('gameLength',0,340,107,80,256);label('Game Length',82);
    opt('difficulty',0,140,167,80,384);opt('difficulty',1,240,167,80,320);opt('difficulty',2,340,167,80,416);label('Difficulty',142);label('Health Pickup',22);
    opt('allowHeals',false,140,52,144,480,64);opt('allowHeals',true,340,52,144,448,64);
    m.add(btn('back',190,282,()=>{sfx('select.wav');D.Settings.save(s);Director.pop();}));
    m.add(btn('play',290,282,()=>{sfx('select.wav');D.Settings.save(s);Director.pop();Director.replace(new CampaignLoadingScene(D.quickParams(s),{mimicHome:true,towers:true}));}));
    const refresh=()=>{for(const [g,list] of Object.entries(groups))for(const [b,v] of list)b.enabled=s[g]!==v;};refresh();
  }
}
// ---------------- Campaign file select ----------------
class SelectCampaignLayer extends Node{
  constructor(owner){super();this.owner=owner;this.active=true;
    const start=tag=>{if(!this.active)return;sfx('select.wav');const st=D.CampaignState.exists(tag)?D.CampaignState.load(tag):new D.CampaignState(tag);this.add(new CampaignInfoLayer(st,this));this.setMenu(false);this.active=false;};
    this.menu=this.add(new Menu([0,1,2].map(i=>new Button(BTN,[480,48*i,96,48],[576,48*i,96,48],240,[128,181,234][i],()=>start(i+1))).concat([btn('mainMenu',240,287,()=>{sfx('select.wav');owner.returnFromLayer(this);})])));
  }
  setMenu(b){for(const c of this.menu.children){c.enabled=b;c.opacity=b?255:0;}}
  reactivate(){this.active=true;this.setMenu(true);}
}
class CampaignInfoLayer extends Node{
  constructor(state,owner){super();this.state=state;this.owner=owner;this.active=true;const started=state.ownsCastle(0);
    this.add(helpBanner(155));
    if(started){this.add(new Label('white','Campaign '+state.campaignId,240,125));this.add(new Label('tiny','Tech Points: '+state.techPoints,20,145,'left'));this.add(new Label('tiny',`Castles Conquered: ${state.numCastlesOwned()}/${state.totalCastles()}`,460,145,'right'));}
    else this.add(new Label('white','New Game',240,125));
    const n=state.units.length,x0=fl(240-18*(n-1)),img=D.SKINS[state.playerSkin].left.buttons;
    state.units.forEach((id,k)=>{const b=unitIcon(id,img,x0+36*k,175,.75);this.add(b);});
    const play=()=>{if(!this.active)return;sfx('select.wav');if(!state.ownsCastle(0)){state.save();Director.replace(new CampaignLoadingScene(D.campaignParams(state,0),{mimicHome:true,towers:false}));}else Director.replace(new (S().WorldMapScene)(state));};
    const cancel=()=>{if(!this.active)return;sfx('select.wav');this.remove();owner.reactivate();};
    const items=started?[btn('back',120,220,cancel),btn('del',240,220,()=>{if(!this.active)return;sfx('select.wav');owner.add(new DeleteConfirmLayer(state,this,owner));this.visible=false;this.active=false;}),btn('play',360,220,play)]:[btn('back',160,220,cancel),btn('play',320,220,play)];
    this.menu=this.add(new Menu(items));
  }
  reactivate(){this.active=true;this.visible=true;}
}
class DeleteConfirmLayer extends Node{
  constructor(state,info,select){super();this.add(helpBanner(155));this.add(new Label('white','Really Delete?',240,160));
    this.add(new Menu([btn('no',160,220,()=>{sfx('select.wav');this.remove();info.reactivate();}),btn('yes',320,220,()=>{D.CampaignState.remove(state.campaignId);sfx('select.wav');this.remove();info.remove();select.reactivate();})]));}
}
// ---------------- Credits ----------------
class CreditsLayer extends Node{
  constructor(owner){super();this.owner=owner;this.active=true;const bg=new ColorLayer(0,0,0,0);this.bg=bg;this.add(bg,-1);
    this.walk={tevin:80,josiah:400,t:0,waving:false,wt:0};
    this.add(new DrawNode(ctx=>{const W=this.walk,Y=x=>320-(54+30*Math.sin(-3.14159*(x-80)/304));
      const fr=(col,row,n,dt,t)=>[col+16*(Math.floor(t/dt)%n),row,16,24];
      if(!W.waving){sprite(ctx,'spr_castles_alpha.png',fr(384,88,4,.15,W.t),W.tevin,Y(W.tevin));sprite(ctx,'spr_castles_alpha.png',fr(384,64,4,.15,W.t),W.josiah,Y(W.josiah));}
      else{sprite(ctx,'spr_castles_alpha.png',fr(448,88,2,.25,W.wt),W.tevin,Y(W.tevin));sprite(ctx,'spr_castles_alpha.png',fr(448,64,2,.35,W.wt),W.josiah,Y(W.josiah));}}),0);
    for(const [f,s,y] of [['white','Stephen Gazzard',40],['tiny','Designer / Programmer / Levels',60],['white','Josiah Tobin',90],['tiny','Graphics / Audio / Design',110],['white','Our Other Game:',140]])this.add(new Label(f,s,240,y),1);
    this.add(new Menu([new Button('spr_castles_alpha.png',[384,0,112,64],null,240,180,()=>{if(!this.active)return;this.active=false;this.add(new AALayer(this),5);}),btn('mainMenu',240,290,()=>{sfx('select.wav');owner.returnFromLayer(this);})]),2);
  }
  tick(dt){if(this.bg.opacity<=128)this.bg.opacity=Math.trunc(this.bg.opacity+dt*512);const W=this.walk;W.t+=dt;if(!W.waving){W.tevin+=40*dt;W.josiah-=40*dt;if(W.tevin>=160)W.waving=true;}else W.wt+=dt;}
  reactivate(){this.active=true;}
}
class AALayer extends Node{constructor(owner){super();this.add(helpBanner(155));this.add(new Label('white','View in App Store?',240,145));
  this.add(new Menu([btn('yes',290,210,()=>{sfx('select.wav');try{window.open('http://itunes.apple.com/ca/app/ant-attack/id335925156?mt=8','_blank');}catch{}}),btn('no',190,210,()=>{sfx('select.wav');owner.reactivate();this.remove();})]));}}
// ---------------- Preview / Survey (offline versions) ----------------
class PreviewScene extends Scene{constructor(){super();this.add(new Img('pyramid_blueprints.png'));this.add(new Label('tiny','Preview the next update!',240,12));this.add(new Menu([btn('back',425,295,()=>{sfx('select.wav');Director.replace(new MenuScene());})]),2);}}
const SURVEY=[['Multiplayer','Have you played multiplayer?',[['Multiplayer','Do you think multiplayer is fun?'],['Multiplayer','Do you think multiplayer is stable?'],['Multiplayer','Is multiplayer customisable enough?']]],['Campaign','Have you played campaign?',[['Campaign','Do you think campaign is fun?'],['Campaign','Would you like more campaign levels?']]]];
class SurveyScene extends Scene{
  constructor(){super();this.add(new Img('shopbg.png'));this.queue=[];
    yesNo(this,'Take the Survey?','Your answers will help determine future updates',()=>{this.queue=SURVEY.map(q=>({q,top:true}));this.next();},()=>Director.replace(new MenuScene()));}
  next(){const item=this.queue.shift();if(!item){message(this,'Thank you for your time!','',()=>Director.replace(new MenuScene()));return;}
    const [h,q,f]=item.top?item.q:[item.q[0],item.q[1],[]];
    yesNo(this,h,q,()=>{if(item.top)this.queue.unshift(...f.map(x=>({q:x,top:false})));this.next();},()=>this.next());}
}
// ---------------- Loading battle ----------------
class CampaignLoadingScene extends Scene{
  constructor(params,{mimicHome=false,towers=false}={}){
    super();this.params=params;
    if(mimicHome){this.add(new Img('bg_grass.png'));this.add(fauxLayout(towers),1);const bn=helpBanner(155),lb=new Label('white','Loading Battle...',240,155);this.add(bn,2);this.add(lb,2);
      this.after(.9,()=>{bn.run(FadeOut(.75));lb.run(FadeOut(.75));this.after(.75,()=>this.go());});}
    else{this.add(new Img('campaignLoading.png'));this.after(.9,()=>this.go());}
  }
  go(){Director.replace(new (require("battle").BattleScene)(this.params));}
}
// ---------------- Quick-play results ----------------
function bannerLayer(parent,victory,player,enemy,dy=-10,labels=['VICTORY','DEFEATED']){
  const L=new Node();
  L.add(new Sprite('sprites_banners_alpha.png',[160,0,160,320],104,170+dy));L.add(new Sprite('sprites_banners_alpha.png',[1,0,160,320],376,170+dy));
  const v=[0,32,160,32],d=[0,0,160,32];
  L.add(new Sprite('sprites_winlose_alpha.png',victory?v:d,104,50+dy));L.add(new Sprite('sprites_winlose_alpha.png',victory?d:v,376,50+dy));
  const m=new Menu();
  for(const [x,sc] of [[104,player.score],[376,enemy.score]]){
    const lines=['Trees Harvested:',sc.treesHarvested,'Gold Stolen:',sc.goldStolen,'Gold Spent:',sc.numGoldSpent,'Units Bought:',sc.numUnitsBought,'Units Lost:',sc.numUnitsDied,'Enemies Killed:',sc.numUnitsKilled];
    lines.forEach((s,i)=>m.add(new TextItem('tiny',String(s),x,85+16*i+dy)));
  }
  L.add(m,1);parent.add(L,1);return L;
}
class GameOverScene extends Scene{
  constructor({victory,player,enemy,difficulty}){
    super();const score=D.GameScore.update(victory,difficulty);X.Stats.battle(player.score,victory,{flawless:victory&&player.hp===player.maxHp,airOnly:victory&&player.airOnly,unicorn:player.unicorn});
    if(difficulty===2&&victory&&player.hp>0){const st=D.Settings.load();st.hasTrophy=true;D.Settings.save(st);score.hasTrophy=true;D.GameScore.save(score);}
    this.add(new Img('bg_results.png'));this.player=player;this.difficulty=difficulty;
    this.add(new Menu([btn('continue_',240,160,()=>{sfx('select.wav');if(this.player&&this.player.hp>0){const h=this.player.hp/this.player.maxHp;this.player=null;this.add(new GoodJobLayer(difficulty,h),1);}else Director.replace(new MenuScene());})]),0);
    bannerLayer(this,victory,player,enemy,-10);
  }
}
class GoodJobLayer extends Node{
  constructor(d,h){super();this.add(helpBanner(160));
    const title=(d<=1?h>.7:h>.95)?"They didn't stand a chance!":h<.25?'That was close!':'Well done!';
    const sub=d===0?'Would you like to play again on medium difficulty?':d===1?'Would you like to play again on hard difficulty?':h>.95?'A performance like that deserves a trophy!':'But not quite good enough to earn a prize...';
    const m=new Menu([new TextItem('white',title,240,140,()=>{}),new TextItem('tiny',sub,240,170)]);
    const menu=()=>{sfx('select.wav');Director.replace(new MenuScene());};
    if(d<=1){m.add(btn('yes',165,205,()=>{sfx('select.wav');const st=D.Settings.load();st.difficulty=Math.min(2,st.difficulty+1);D.Settings.save(st);Director.replace(new (require("battle").BattleScene)(D.quickParams(st)));}));m.add(btn('no',315,205,menu));}
    else m.add(btn('continue_',240,205,menu));
    if(d===2){const cup=new Sprite(CON,[0,208,48,48],430,180,{rotation:25});if(h<.95)cup.opacity=50;this.add(cup,2);}
    this.add(m,1);
  }
}
// ---------------- Local multiplayer (same device) ----------------
const DEFAULT_UNIT_LIST=[2,3,0,1,4,6,7,5];
class MPSelectScene extends Scene{
  constructor(step=0,armies=[]){super();this.step=step;this.armies=armies;this.add(new Img('shopbg.png'));
    this.add(new Label('white','Select unit set:',240,20));this.add(new Label('tiny',step===0?'Player 1 (blue castle, top buttons)':'Player 2 (red castle, bottom buttons)',240,44));
    const m=new Menu();this.add(m,1);this.menu=m;
    m.add(btn('defaultUnits',240,80,()=>{sfx('select.wav');this.preview({units:DEFAULT_UNIT_LIST,skin:0,health:120,upgrades:[0]});}));
    const files=[1,2,3].filter(k=>D.CampaignState.exists(k));
    if(files.length){this.add(new Label('tiny','(Campaign Units)',240,155));files.forEach((k,i)=>m.add(new Button(BTN,[480,48*(k-1),96,48],[576,48*(k-1),96,48],240-50*(files.length+1)+100*(i+1),185,()=>{sfx('select.wav');const st=D.CampaignState.load(k);this.preview({units:st.units,skin:st.playerSkin,health:st.startHealth,upgrades:st.upgrades});})));}
    m.add(btn('mainMenu',240,287,()=>{sfx('select.wav');Director.replace(new MenuScene());}));
  }
  preview(a){
    const L=new Node();L.add(fadeLayer());L.add(helpBanner(155));L.add(new Label('white','Use these units?',240,125));
    const side=this.step,img=D.SKINS[a.skin??0][side===0?'left':'right'].buttons,n=a.units.length,x0=fl(240-18*(n-1));
    a.units.forEach((id,k)=>L.add(unitIcon(id,img,x0+36*k,160,.75)));
    const army={units:a.units.map(id=>UNIT_KEYS[id]).filter(Boolean),skin:a.skin,health:a.health,upgrades:a.upgrades};
    L.add(new Menu([btn('yes',180,215,()=>{sfx('select.wav');if(this.step===0)Director.replace(new MPSelectScene(1,[army]));else Director.replace(new MPLevelScene([...this.armies,army]));}),btn('no',300,215,()=>{sfx('select.wav');L.remove();})]));
    this.add(L,5);
  }
}
class MPLevelScene extends Scene{
  constructor(armies){super();this.armies=armies;this.level=Store.get('mpLevel',21)||0;this.heals=Store.get('mpHeals',true);
    this.bg=this.add(new Img(D.MP_LEVELS[this.level].bg));this.add(helpBanner(155),1);this.name=this.add(new Label('white',D.MP_LEVELS[this.level].name,240,135),2);
    this.add(new Label('tiny','Select level',240,160),2);
    const healBtn=()=>this.heals?[624,480,80,32]:[544,480,80,32];
    const m=new Menu([new Button(BTN,[576,384,48,48],[576,432,48,48],60,155,()=>this.change(-1)),new Button(BTN,[624,384,48,48],[624,432,48,48],420,155,()=>this.change(1)),
      btn('start',320,230,()=>{sfx('select.wav');Store.set('mpLevel',this.level);Store.set('mpHeals',this.heals);Director.replace(new CampaignLoadingScene(D.mpParams(this.level,this.armies,{heals:this.heals}),{}));}),
      btn('mainMenu',160,230,()=>{sfx('select.wav');Director.replace(new MenuScene());})]);
    this.healItem=new Button(BTN,healBtn(),healBtn(),240,185,()=>{sfx('select.wav');this.heals=!this.heals;this.healItem.normal=this.healItem.sel=healBtn();});m.add(this.healItem);
    this.add(m,3);
  }
  change(d){sfx('select.wav');this.level=(this.level+d+D.MP_LEVELS.length)%D.MP_LEVELS.length;const L=D.MP_LEVELS[this.level];this.bg.img=L.bg;this.name.str=L.name;}
}
class MPResultScene extends Scene{
  constructor(P,battle){super();this.add(new Img('bg_results.png'));const v=battle.sides[1].hp<=0;
    bannerLayer(this,v,battle.sides[0],battle.sides[1],-10);
    this.add(new Menu([btn('continue_',240,160,()=>{sfx('select.wav');Director.replace(new MenuScene());}),btn('replay',240,213,()=>{sfx('select.wav');Director.replace(new (require("battle").BattleScene)(P));})]),2);
  }
}
Object.assign(exports,{LoadingScene,MenuScene,SettingsScene,CampaignLoadingScene,GameOverScene,MPSelectScene,MPLevelScene,MPResultScene,fauxLayout,unitIcon,bannerLayer});
