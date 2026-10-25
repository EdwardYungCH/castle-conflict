// v2.2 additions: Endless mode, lifetime statistics and achievements, the Records screen.
const C=require("core");
const {Node,Scene,Menu,Button,TextItem,Label,Img,Sprite,Director,Audio,sfx,sprite,text,textWidth,CON,BTN,btn,helpBanner,Store}=C;
const D=require("data");
const {UNITS}=require("engine");
const {yesNo,message}=require("dialogs");

// ---------- text button on the blank stone tablet ----------
function textBtn(label,x,y,cb,o={}){
  const b=new Button(BTN,[864,0,96,48],[288,432,96,48],x,y,cb,o);const lines=Array.isArray(label)?label:[label];
  b.drawExtra=ctx=>{ctx.save();ctx.globalAlpha*=b.opacity/255;lines.forEach((s,i)=>text(ctx,'white',s,b.x,b.y+(i-(lines.length-1)/2)*18,{scale:.75}));ctx.restore();};return b;
}

// ---------- lifetime stats ----------
const Stats={
  load(){return {battles:0,wins:0,unitsBought:0,unitsKilled:0,unitsLost:0,trees:0,stolen:0,goldSpent:0,endlessBest:0,endlessRuns:0,flags:{},...(Store.get('stats',{})||{})};},
  save(s){Store.set('stats',s);},
  // called once per finished battle with the player's score
  battle(score,victory,extra={}){const s=this.load();s.battles++;if(victory)s.wins++;s.unitsBought+=score.numUnitsBought;s.unitsKilled+=score.numUnitsKilled;s.unitsLost+=score.numUnitsDied;s.trees+=score.treesHarvested;s.stolen+=score.goldStolen;s.goldSpent+=score.numGoldSpent;
    for(const [k,v] of Object.entries(extra))if(v)s.flags[k]=true;this.save(s);return s;},
  flag(k){const s=this.load();if(!s.flags[k]){s.flags[k]=true;this.save(s);}},
  endless(wave){const s=this.load();s.endlessRuns++;if(wave>s.endlessBest)s.endlessBest=wave;this.save(s);return s;}
};
const ACHIEVEMENTS=[
 ['First Blood','Win any battle',s=>s.wins>=1],
 ['Veteran','Win 50 battles',s=>s.wins>=50],
 ['On a Roll','Win 5 quick plays in a row',s=>D.GameScore.load().best>=5],
 ['Champion','Earn the quick play trophy',s=>D.GameScore.load().hasTrophy],
 ['Homeland Hero','Conquer the Medieval Realm',s=>!!s.flags.realm0],
 ['Pharaoh','Conquer the Egyptian Realm',s=>!!s.flags.realm1],
 ['Frost King','Conquer the Northern Realm',s=>!!s.flags.realm2],
 ['Shogun','Conquer the Eastern Realm',s=>!!s.flags.realm3],
 ['Deep Thane','Conquer the Underworld',s=>!!s.flags.realm4],
 ['Sky Lord','Conquer the Sky Realm',s=>!!s.flags.realm5],
 ['World Conqueror','Conquer all six realms',s=>!!s.flags.allRealms],
 ['Lumberjack','Harvest 1000 trees',s=>s.trees>=1000],
 ['Warlord','Kill 1000 enemy units',s=>s.unitsKilled>=1000],
 ['Pickpocket','Steal 500 gold',s=>s.stolen>=500],
 ['Untouchable','Win without taking damage',s=>!!s.flags.flawless],
 ['Air Superiority','Win using only flying units',s=>!!s.flags.airOnly],
 ['Pink Menace','Summon the pink unicorn',s=>!!s.flags.unicorn],
 ['Survivor','Endless mode: clear 5 waves',s=>s.endlessBest>=5],
 ['Last Stand','Endless mode: clear 10 waves',s=>s.endlessBest>=10],
 ['Immortal','Endless mode: clear 20 waves',s=>s.endlessBest>=20]];
const unlocked=s=>ACHIEVEMENTS.filter(a=>a[2](s));

// ---------- save backup / restore (all cc185-* keys as one code) ----------
const SAVE_KEYS=()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith('cc185-'));}catch{return [];}};
function exportCode(){const o={};for(const k of SAVE_KEYS())o[k]=localStorage.getItem(k);return 'CC1:'+btoa(unescape(encodeURIComponent(JSON.stringify(o))));}
function importCode(code){code=String(code||'').trim();if(!code.startsWith('CC1:'))throw new Error('bad');const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));let n=0;for(const [k,v] of Object.entries(o))if(k.startsWith('cc185-')&&typeof v==='string'){localStorage.setItem(k,v);n++;}return n;}
function backupDialog(scene){const code=exportCode();const done=()=>message(scene,'Backup copied','Paste it somewhere safe (Notes, a chat...)',null,20);
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(done,()=>{window.prompt('Copy this backup code:',code);});else window.prompt('Copy this backup code:',code);}
function restoreDialog(scene){const c=window.prompt('Paste your backup code:');if(!c)return;
  try{const n=importCode(c);message(scene,'Restored',`${n} entries loaded. Restarting...`,()=>location.reload(),20);setTimeout(()=>location.reload(),2500);}catch{message(scene,'Invalid code','That is not a Castle Conflict backup.',null,20);}}
// ---------- Records screen ----------
class RecordsScene extends Scene{
  constructor(){super();this.add(new Img('shopbg.png'));this.page=0;this.stats=Stats.load();this.body=null;
    this.add(new Label('white','Records',240,24));
    const am=new Menu();this.add(am,2);
    this.l=am.add(new Button(CON,[48,128,48,48],[48,128,48,48],40,160,()=>{sfx('select.wav');this.show(this.page-1);}));
    this.r=am.add(new Button(CON,[0,128,48,48],[0,128,48,48],440,160,()=>{sfx('select.wav');this.show(this.page+1);}));
    am.add(btn('back',240,290,()=>{sfx('select.wav');Director.replace(new (require("menu").MenuScene)());}));
    am.add(textBtn('Backup',120,290,()=>{sfx('select.wav');backupDialog(this);}));am.add(textBtn('Restore',360,290,()=>{sfx('select.wav');restoreDialog(this);}));
    this.show(0);
  }
  show(p){const last=Math.ceil(ACHIEVEMENTS.length/8);this.page=Math.max(0,Math.min(last,p));this.body?.remove();const B=new Node();this.body=B;this.add(B,1);const s=this.stats,q=D.GameScore.load();
    this.l.opacity=this.page>0?255:100;this.r.opacity=this.page<last?255:100;
    if(this.page===0){B.add(new Label('tiny','Statistics',240,50));
      const rows=[['Battles fought',s.battles],['Battles won',s.wins],['Quick play best streak',q.best],['Quick play wins / losses',`${q.numTotalWins} / ${q.numTotalLosses}`],['Endless best',s.endlessBest?`Wave ${s.endlessBest}`:'-'],['Endless runs',s.endlessRuns],['Units bought',s.unitsBought],['Enemies killed',s.unitsKilled],['Units lost',s.unitsLost],['Trees harvested',s.trees],['Gold stolen',s.stolen],['Gold spent',s.goldSpent]];
      rows.forEach(([k,v],i)=>{B.add(new Label('tiny',k,120,75+16*i,'left'));B.add(new Label('tiny',String(v),360,75+16*i,'right'));});
      if(q.hasTrophy)B.add(new Sprite(CON,[0,208,48,48],420,70));}
    else{const n=unlocked(s).length;B.add(new Label('tiny',`Achievements ${n}/${ACHIEVEMENTS.length}`,240,50));
      ACHIEVEMENTS.slice((this.page-1)*8,this.page*8).forEach(([name,desc,fn],i)=>{const ok=fn(s),y=75+26*i;
        const mark=new Sprite(BTN,[54,198,18,18],100,y+4);if(!ok)mark.opacity=45;B.add(mark);
        const t=B.add(new Label('tiny',name,120,y,'left'));const d=B.add(new Label('tiny',desc,120,y+11,'left'));if(!ok){t.opacity=110;d.opacity=110;}});}
  }
}

// ---------- Endless mode ----------
const WAVE_POOL=['wood','soldier','strong','dog','thief','cavalry','zeppelin','archer','pike','petard','heavy','bomber','golem','ice','fire','ram','master','mummy','necro','cannon','grappler','wolves','berserker','huntress','trapper','napalm','giant','longship','rune','wormPriest','ninja','samurai','dancer','caster','trebuchet','ashigaru','yumi','merchant','bats','lavaGolem','moleRider','crossbow','angel','thunder','griffin','battleship','lancer','guardian'];
const BGS=[['bg_grass.png','bg_forest1.png','bg_plains.png','bg_river.png','bg_mountains.png','bg_water2.png','bg_sunset.png'],
 ['bg_egypt_desert1.png','bg_egypt_nile2.png','bg_egypt_grass1.png','bg_egypt_desert4.png','bg_egypt_sunset1.png','bg_egypt_night1.png'],
 ['bg_north_hills.png','bg_north_forest.png','bg_north_fjord.png','bg_north_mountains.png','bg_north_aurora.png','bg_north_aurora_peaks.png'],
 ['bg_east_bamboo.png','bg_east_terrace.png','bg_east_coast.png','bg_east_volcano.png','bg_east_bamboo2.png','bg_east_sunset.png'],
 ['bg_under_cavern.png','bg_under_fungus.png','bg_under_lavariver.png','bg_under_crystal.png','bg_under_forge.png','bg_under_abyss.png'],
 ['bg_sky_meadow.png','bg_sky_forest.png','bg_sky_peaks.png','bg_sky_dawn.png','bg_sky_storm.png','bg_sky_night.png']];
function waveDef(w){
  const n=Math.min(WAVE_POOL.length,3+Math.floor((w-1)*1.5));let pool=WAVE_POOL.slice(0,n);
  const roster=['wood',...pool.filter(t=>t!=='wood').slice(-7)];
  const realm=w<=6?0:w<=12?1:w<=18?2:w<=24?3:w<=30?4:5;
  return {roster,hp:Math.min(400,60+25*w),gold:15+5*w,aiFrequency:Math.max(.45,2.6-.17*w),campaignDifficulty:w<4?0:w<9?1:2,realm,background:BGS[realm][(w-1)%BGS[realm].length],skin:[0,1,3,4,5,6][realm]};
}
function endlessParams(settings=D.Settings.load()){
  const wd=waveDef(1);
  return {mode:3,endless:true,wave:1,background:wd.background,scenery:'hill',sceneryAtlas:'Scenery',egypt:false,playerSkin:0,enemySkin:wd.skin,
    playerUnits:['wood','thief','soldier','strong','cavalry','zeppelin','bomber','cannon'],enemyUnits:wd.roster,playerUpgrades:[0],enemyUpgrades:[0],cannons:[true,true],
    playerHealth:120,enemyHealth:wd.hp,startGold:30,aiFrequency:wd.aiFrequency,difficulty:1,campaignDifficulty:wd.campaignDifficulty,treeGrowth:settings.treeGrowthRate,allowHeals:true,
    hint:false,easyQuick:false,doubleIncome:true,trophy:false,elements:[],globalDifficulty:1,campaign:true};
}
// Called by BattleScene when the enemy castle falls in endless mode. Returns the new wave definition.
function nextWave(scene){
  const b=scene.battle,P=scene.params,w=++P.wave,wd=waveDef(w);
  for(const u of b.units)if(u.side===1)u.alive=false;b.units=b.units.filter(u=>u.alive);b.projectiles=b.projectiles.filter(p=>p.side===0);
  const e=b.sides[1];e.hp=e.maxHp=wd.hp;e.wood=wd.gold;e.doubleIncome=w>8;b.rosters[1]=wd.roster;b.cannons[1]=wd.roster.includes('cannon');b.aiFrequency=wd.aiFrequency;b.campaignDifficulty=wd.campaignDifficulty;
  const me=b.sides[0];me.hp=Math.min(me.maxHp,me.hp+20);me.wood+=25+5*w;
  P.background=wd.background;P.enemySkin=wd.skin;P.enemyUnits=wd.roster;
  const sk=D.SKINS[wd.skin].right;scene.skinR=sk;scene.unitAtlas[1]=sk.units;scene.castleAtlas[1]=sk.castle;P.egypt=wd.realm===1;
  return wd;
}
class EndlessResultScene extends Scene{
  constructor(P,b){super();const w=P.wave-1,s=Stats.endless(w);Stats.battle(b.sides[0].score,false);
    this.add(new Img('bg_results.png'));for(const x of [160,320])this.add(new Sprite('sprites_banners_alpha.png',[160,0,160,320],x,160),0);
    this.add(new Label('white','Endless',240,40));this.add(new Label('white',`Waves cleared: ${w}`,240,100));
    this.add(new Label('tiny',w>=s.endlessBest&&w>0?'New record!':`Best: ${s.endlessBest}`,240,125));
    const sc=b.sides[0].score;[['Enemies killed',sc.numUnitsKilled],['Units bought',sc.numUnitsBought],['Trees harvested',sc.treesHarvested]].forEach(([k,v],i)=>this.add(new Label('tiny',`${k}: ${v}`,240,160+16*i)));
    this.add(new Menu([btn('replay',150,270,()=>{sfx('select.wav');Director.replace(new (require("menu").CampaignLoadingScene)(endlessParams(),{mimicHome:true,towers:true}));}),btn('mainMenu',330,270,()=>{sfx('select.wav');Director.replace(new (require("menu").MenuScene)());})]),1);
  }
}
// ---------- the ending (all six realms conquered) ----------
class FinalEndingScene extends Scene{
  constructor(st){super();Stats.flag('allRealms');const s=Stats.load();Audio.playMusic('ccwin.mp3',false);
    this.add(new Img('sky_victory_night.png'));for(const x of [160,320])this.add(new Sprite('sprites_banners_alpha.png',[160,0,160,320],x,160),0);
    const lines=[['white','The six realms are one',240,28]];
    const realms=D.CONTENT.maps.map(m=>[m.name,m.castles.filter(c=>st.ownsCastle(c.id)).length,m.castles.length]);
    realms.forEach(([name,n,t],i)=>{lines.push(['tiny',name,130,62+16*i,'left']);lines.push(['tiny',`${n} / ${t}`,350,62+16*i,'right']);});
    lines.push(['tiny',`Battles ${st.numBattles}  Victories ${st.numVictories}  Rank: ${D.RANKS(st.numBattles?st.numVictories/st.numBattles:0)}`,240,166]);
    lines.push(['tiny',`${s.unitsKilled} enemies slain, ${s.unitsBought} units raised`,240,182]);lines.push(['tiny',`${s.trees} trees felled, ${s.stolen} gold stolen`,240,196]);
    lines.push(['white','Thank you for playing!',240,220]);lines.push(['tiny','Castle Conflict - The End',240,240]);
    lines.forEach(([font,str,x,y,al],i)=>{const l=new Label(font,str,x,y,al);l.opacity=0;this.add(l,1);this.after(.6+i*.35,()=>{l.run(C.FadeIn(.5));if(i%2===0)sfx('select.wav');});});
    this.after(1+lines.length*.35,()=>this.add(new Menu([btn('map',150,285,()=>{sfx('select.wav');Audio.stopMusic();Director.replace(new (require("campaign").WorldMapScene)(st));}),btn('mainMenu',330,285,()=>{sfx('select.wav');Audio.stopMusic();Director.replace(new (require("menu").MenuScene)());})]),2));
  }
  exit(){Audio.stopMusic();}
}
Object.assign(exports,{textBtn,Stats,ACHIEVEMENTS,RecordsScene,exportCode,importCode,endlessParams,nextWave,waveDef,EndlessResultScene,FinalEndingScene});
