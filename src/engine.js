// Castle Conflict 1.85 battle simulation (canvas coordinates: x right, y down, 480x320).
// Values audited against the v1.85 binary (see specs/engine_audit.md).
const {nativeTimer,fireNativeTimer}=require("native-timer");
const {ATLASES}=require("atlases");
const {UNIT_GEOMETRY}=require("unit-geometry");
const {airAttackScore,airDefenseScore,stopResourcesScore}=require("ai-scores");

// GameScene getYForX:forObject: bottom = 42 + 30*sin(-pi*(x-80)/(384-80)) (cocos) -> canvas below.
const ground=x=>278+30*Math.sin(3.14159*(x-80)/304);
const AIR_Y=130; // cocos 190
const GROUND_START=[80,384],AIR_START=[40,424];
// Underworld tunnel: a second lane below the ground (canvas y 290..314) between the two castle cellars.
const TUNNEL_Y=302,TUNNEL_START=[126,354],TUNNEL_BOXES=[[110,290,124,314],[356,290,370,314]];
const CASTLE_BOXES=[[[0,191,72,287],[0,95,48,191]],[[408,191,480,287],[440,95,480,191]]];
const layerOf=t=>UNITS[t].flies?'air':UNITS[t].tunnel?'tunnel':'ground';
const spriteHeight=type=>UNITS[type].frameHeight??ATLASES.playerStandard.entries[UNITS[type].sprite]?.Height??16;
const unitY=u=>UNITS[u.type].flies?(u.craneY??AIR_Y):UNITS[u.type].tunnel?TUNNEL_Y:ground(Math.trunc(u.x))-spriteHeight(u.type)/2;
function unitBounds(u){
  const [w,h]=UNITS[u.type].collision??[8,12];let box=UNIT_GEOMETRY[u.type]??[-w,-h,w,h];
  if(u.type==='worm')box=[-(u.hitWidth??24),-50,u.hitWidth??24,30];
  let [left,bottom,right,top]=box;if(u.side===0)[left,right]=[-right,-left];
  const x=Math.trunc(u.x),y=unitY(u);return [x+left,y-top,x+right,y-bottom];
}
const overlaps=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
const touchesCastle=(u,side)=>UNITS[u.type].tunnel?overlaps(unitBounds(u),TUNNEL_BOXES[side]):CASTLE_BOXES[side].some(b=>overlaps(unitBounds(u),b));
const treeBox=t=>[t.x-16,ground(t.x)-48,t.x+16,ground(t.x)];
const projectileGroundY=p=>ground(p.x)-(p.scenery?48:ATLASES.playerStandard.entries[p.sprite]?.Height??16)/2;
const CONFIG=Object.freeze({width:480,height:320,tick:.032,startWood:25,castleHealth:120,treeChance:130,maxTrees:10,treeReadySeconds:.8,maxUnits:200});
// cs = castle strength (castle hit = trunc(hp - cs*10), cs 0 => 1 damage)
const UNITS=Object.freeze({
  wood:{id:2,name:'Wood Cutter',cost:5,speed:35,cs:0,strength:0,role:'worker',yield:25,sprite:'WoodCutter',hud:[0,0]},
  soldier:{id:0,name:'Foot Soldier',cost:25,speed:50,cs:1,strength:1,role:'fighter',sprite:'WeakSoldier',hud:[48,0]},
  strong:{id:1,name:'Heavy Soldier',cost:40,speed:30,cs:2,strength:2,role:'fighter',sprite:'StrongSoldier',hud:[96,0]},
  master:{id:16,name:'Master Wood Cutter',cost:15,speed:50,cs:0,strength:0,role:'worker',yield:35,sprite:'AdvancedWoodCutter',hud:[192,48]},
  pike:{id:15,name:'Pikeman',cost:30,speed:50,cs:0,strength:.5,mountedStrength:4,role:'fighter',sprite:'Pikeman',hud:[336,0]},
  cavalry:{id:4,name:'Cavalry',cost:50,speed:120,cs:3,strength:3,mounted:true,role:'fighter',sprite:'Cavalry',hud:[192,0]},
  thief:{id:3,name:'Thief',cost:20,speed:65,cs:0,strength:0,role:'thief',sprite:'Thief',hud:[144,0],walkFps:10},
  dog:{id:21,name:'Attack Dog',cost:20,speed:110,cs:0,strength:.25,role:'fighter',sprite:'AttackDog',hud:[96,192],attackDuration:.45,attackFps:1/.15},
  heavy:{id:10,name:'Heavy Cavalry',cost:55,speed:80,cs:4,strength:4,mounted:true,role:'fighter',sprite:'HeavyCavalry',hud:[384,0]},
  golem:{id:17,projectileResistance:1,name:'Clay Golem',cost:45,speed:30,cs:1,strength:4,role:'fighter',sprite:'Golem',hud:[336,48],attackFps:5},
  zeppelin:{id:6,name:'Zeppelin',cost:20,speed:35,cs:1.25,strength:1.25,flies:true,role:'air',sprite:'SmallZeppelin',hud:[48,48],collision:[16,8],height:16,deathPower:.5},
  bomber:{id:7,name:'Bomber',cost:60,speed:25,cs:3,strength:3,flies:true,role:'air',sprite:'Bomber',hud:[96,48],collision:[32,24],height:48,deathPower:1,dropInterval:1},
  planter:{id:20,name:'Planter Balloon',cost:30,speed:20,cs:0,strength:0,flies:true,role:'air',sprite:'Planter',hud:[48,192],collision:[24,20],height:80,deathPower:.5,dropInterval:4},
  pirate:{id:19,name:'Flying pirates',cost:40,speed:50,cs:1.25,strength:9,flies:true,role:'air',sprite:'PirateZeppelin',hud:[0,240],collision:[16,8],height:32,deathPower:.5},
  duster:{id:23,name:'Chemical Balloon',cost:15,speed:50,cs:0,strength:0,flies:true,role:'air',sprite:'Duster',hud:[144,192],collision:[24,20],height:80,deathPower:.5,dropInterval:.3},
  grappler:{id:30,name:'Grappler',cost:35,speed:60,cs:2,strength:2,flies:true,role:'air',sprite:'CannonCatcher',hud:[192,192],collision:[40,16],height:36,deathPower:1},
  fire:{id:12,name:'Fire Wizard',cost:60,speed:40,cs:0,strength:0,role:'mage',sprite:'FireWizard',hud:[288,0],attackFps:1/.016},
  ice:{id:13,name:'Ice Wizard',cost:15,speed:40,cs:0,strength:0,role:'mage',sprite:'IceWizard',hud:[288,48],attackFps:1/.016},
  cash:{id:18,name:'Polymorph Wizard',cost:45,speed:50,cs:0,strength:15,role:'fighter',sprite:'CashWizard',hud:[0,192]},
  witch:{id:22,name:'The LopiWitch',cost:25,speed:40,cs:2,strength:0,role:'fighter',sprite:'Witch',hud:[96,240]},
  soldierDrop:{id:32,name:'Soldier Dropship',cost:55,speed:25,cs:0,strength:0,flies:true,role:'air',sprite:'AirDrop',hud:[192,240],collision:[32,24],height:80,deathPower:1,dropInterval:3.7,dropUnit:'strong'},
  woodDrop:{id:34,name:'Woodcutter Dropship',cost:20,speed:30,cs:0,strength:0,flies:true,role:'air',sprite:'AirDrop',hud:[240,192],collision:[32,24],height:80,deathPower:1,dropInterval:3.2,dropUnit:'wood'},
  napalm:{id:33,name:'Fire Bomber',cost:70,speed:35,cs:4,strength:4,flies:true,role:'air',sprite:'NapalmBomber',hud:[336,240],collision:[32,24],height:48,deathPower:1,dropInterval:.15},
  mummy:{id:24,name:'Undead Soldier',cost:45,speed:30,cs:2,strength:2,role:'fighter',sprite:'Mummy',hud:[240,240],attackFps:10},
  mummyBody:{id:25,name:'Crawling Mummy',cost:0,speed:25,cs:1,strength:1,role:'fighter',sprite:'MummyBody',hud:[288,192],internal:true,attackFps:10},
  necro:{id:26,name:'Necromancer',cost:50,speed:30,cs:0,strength:0,role:'support',sprite:'Necromancer',hud:[288,192],attackFps:1/.016},
  wind:{id:28,name:'Wind of God',cost:30,speed:40,cs:0,strength:0,role:'support',sprite:'Priest',hud:[288,240]},
  sword:{id:27,name:'Sword of God',cost:35,speed:40,cs:0,strength:0,role:'support',sprite:'Priest',hud:[336,192]},
  wormPriest:{id:29,name:'Sand Wurm Priest',cost:60,speed:30,cs:0,strength:0,role:'support',sprite:'Priest',hud:[144,240]},
  worm:{id:35,name:'Sand Wurm',cost:0,speed:0,cs:8,strength:8,projectileResistance:100,role:'worm',sprite:'SandWorm',hud:[144,240],internal:true,walkFps:10},
  treeCutter:{id:31,name:'Tree Cutter',cost:15,speed:25,cs:0,strength:0,flies:true,role:'airWorker',sprite:'TreeTopHarvester',hud:[384,192],collision:[24,56],height:112,deathPower:0,yield:50},
  engineer:{id:8,name:'Engineer',cost:0,speed:35,cs:0,strength:0,role:'healer',sprite:'Engineer',hud:[0,0],internal:true},
  cannon:{id:5,name:'Cannon',cost:45,speed:0,cs:0,strength:0,role:'cannon',sprite:'Cannon',hud:[0,48]},
  archer:{id:9,name:'Archer',cost:50,speed:40,cs:0,strength:0,role:'archer',sprite:'Archer',hud:[240,48],attackFps:10},
  ram:{id:11,name:'Battering Ram',cost:55,speed:80,cs:2,strength:3,mountedStrength:2,role:'fighter',sprite:'BatteringRam',hud:[384,48],walkFps:10},
  petard:{id:14,name:'Petard',cost:30,speed:60,cs:0,strength:.1,role:'fighter',sprite:'Petard',hud:[240,0],walkFps:10},
  // Northern Realm (fan expansion)
  berserker:{id:36,name:'Berserker',cost:40,speed:55,cs:2,strength:2.5,role:'fighter',sprite:'Berserker',hud:[144,384],rage:true},
  wolves:{id:37,name:'Wolf Pack',cost:35,speed:120,cs:0,strength:0,role:'pack',sprite:'Wolf',hud:[192,384],pack:3},
  wolf:{id:41,name:'Wolf',cost:0,speed:120,cs:.5,strength:.75,role:'fighter',sprite:'Wolf',hud:[192,384],internal:true,attackDuration:.45,attackFps:1/.15},
  giant:{id:38,name:'Frost Giant',cost:70,speed:18,cs:4,strength:6,projectileResistance:1,role:'fighter',sprite:'FrostGiant',hud:[240,384],attackFps:5,iceWalker:true},
  rune:{id:39,name:'Rune Priest',cost:45,speed:40,cs:0,strength:0,role:'support',sprite:'RunePriest',hud:[288,384]},
  longship:{id:40,name:'Dragon Longship',cost:60,speed:45,cs:2,strength:3,role:'fighter',sprite:'Longship',hud:[336,384],walkFps:10,crew:'soldier',iceWalker:true},
  // Eastern Realm (fan expansion)
  ninja:{id:42,name:'Ninja',cost:25,speed:65,cs:0,strength:1,role:'thief',sprite:'Ninja',hud:[48,432],walkFps:10,stealth:true,steal:20},
  samurai:{id:43,name:'Samurai',cost:45,speed:45,cs:2,strength:3,role:'fighter',sprite:'Samurai',hud:[96,432],cleave:true},
  trebuchet:{id:44,name:'Trebuchet',cost:65,speed:30,cs:0,strength:0,role:'siege',sprite:'Trebuchet',hud:[144,432],walkFps:10,fireEvery:3,firingX:[150,330]},
  dancer:{id:45,name:'Fan Dancer',cost:40,speed:40,cs:0,strength:0,role:'support',sprite:'FanDancer',hud:[192,432]},
  caster:{id:46,name:'Crane Caster',cost:50,speed:40,cs:0,strength:0,role:'mage',sprite:'CraneCaster',hud:[240,432],attackFps:1/.016},
  crane:{id:47,name:'Paper Crane',cost:0,speed:28,cs:0,strength:0,flies:true,role:'air',sprite:'PaperCrane',hud:[240,432],internal:true,collision:[6,4],height:8,deathPower:0,catcher:true},
  // Underworld (fan expansion)
  miner:{id:48,name:'Miner',cost:10,speed:35,cs:0,strength:0,role:'worker',yield:30,sprite:'Miner',hud:[336,432],tunnel:true},
  burrower:{id:49,name:'Burrower',cost:35,speed:40,cs:2,strength:1.5,role:'fighter',sprite:'Burrower',hud:[384,432],tunnel:true,attackDuration:.45,attackFps:1/.15},
  lavaGolem:{id:50,name:'Lava Golem',cost:75,speed:25,cs:3,strength:5,projectileResistance:1,role:'fighter',sprite:'LavaGolem',hud:[432,432],attackFps:5,lavaWalker:true},
  bats:{id:51,name:'Bat Swarm',cost:30,speed:110,cs:0,strength:0,role:'pack',sprite:'Bat',hud:[0,576],pack:3,packType:'bat'},
  bat:{id:54,name:'Bat',cost:0,speed:110,cs:.25,strength:.5,flies:true,role:'air',sprite:'Bat',hud:[0,576],internal:true,collision:[10,4],height:10,deathPower:0},
  dwarf:{id:52,name:'Dwarf Engineer',cost:40,speed:35,cs:0,strength:0,role:'sapper',sprite:'Dwarf',hud:[48,576],tunnel:true},
  unicorn:{id:100000,name:'Ultimate Pink Unicorn',cost:0,speed:140,cs:300,strength:300,mountedStrength:300,projectileResistance:100,role:'fighter',sprite:'Unicorn',hud:[0,0],internal:true,frameHeight:48,collision:[32,24]}
});
const UNIT_KEYS={};for(const [type,u] of Object.entries(UNITS))if(!u.internal||['mummyBody','worm','engineer','wolf','crane','bat'].includes(type))UNIT_KEYS[u.id]=type;
const TYPE_ID=type=>UNITS[type]?.id;
const QUICK_ARMY=['wood','thief','soldier','strong','cavalry','zeppelin','bomber','cannon'];
const DEFAULT_ROSTER=['wood','soldier','strong'];
// UnitInfoManager loadUnitInfo (campaign AI data): castleAttack, unmounted, mounted, speed, cost, flags
const INFO={};
for(const [id,ca,un,mo,sp,co,f] of [
 [0,1,1,1,50,25,''],[1,2,2,2,30,40,''],[2,0,0,0,35,5,'wood:25'],[3,0,0,0,65,20,'steals'],[4,3,3,3,120,50,'mounted'],
 [5,2,10,10,300,45,'flying proj'],[6,1.25,1.25,1.25,35,20,'flying'],[7,3,3,3,25,60,'flying proj'],[9,0,0,0,40,50,'proj t:3'],
 [10,4,4,4,80,55,'mounted'],[11,4,3,2,25,55,''],[12,3,0,0,40,60,'proj t:1.5 util'],[13,0,0,0,40,15,'util per:5'],
 [14,4,15,15,60,30,'once suicide'],[15,.5,0,4,50,30,''],[16,0,0,0,50,15,'wood:35'],[17,1,4,4,30,45,''],[18,0,15,15,50,45,'once'],
 [19,1.25,9,9,50,40,'flying once'],[20,0,0,0,20,30,'flying proj util off:20'],[21,.25,.25,.25,140,20,''],[22,2,0,0,40,25,''],
 [23,0,0,0,50,15,'flying proj util off:20'],[24,2,2,2,30,45,'off:15'],[25,1,1,1,25,0,''],[26,0,0,0,30,50,'util off:40'],
 [27,0,0,0,40,35,'util off:45'],[28,0,0,0,40,30,'util off:40'],[29,0,0,0,30,60,'proj t:7 util off:200'],[30,2,2,2,60,35,'flying'],
 [31,0,0,0,25,15,'flying wood:50'],[32,2,0,0,25,55,'flying util off:40'],[33,4,4,4,35,70,'flying t:4'],[34,0,0,0,30,20,'flying util off:30'],[35,8,8,8,0,60,''],
 [36,2,2.5,2.5,55,40,''],[37,1.5,.75,.75,120,35,'off:10'],[38,4,6,6,18,70,''],[39,0,0,0,40,45,'util off:35'],[40,4,3,3,45,60,'off:15'],[41,.5,.75,.75,120,0,''],
 [42,0,1,1,65,25,'steals off:10'],[43,2,3,3,45,45,''],[44,2,0,0,30,65,'proj t:4 util off:30'],[45,0,0,0,40,40,'util off:35'],[46,0,0,0,40,50,'util off:40'],[47,0,0,0,28,0,'flying'],
 [48,0,0,0,35,10,'tunnel wood:30'],[49,2,1.5,1.5,40,35,'tunnel'],[50,3,5,5,25,75,''],[51,.75,.5,.5,110,30,'flying off:5'],[52,0,0,0,35,40,'tunnel util off:20'],[54,.25,.5,.5,110,0,'flying']]){
  const flag=k=>{const m=f.split(' ').find(s=>s.startsWith(k));return m?(m.includes(':')?Number(m.split(':')[1]):true):false;};
  INFO[id]={id,castleAttack:ca,unmounted:un,mounted:mo,speed:sp,cost:co,mountedUnit:!!flag('mounted'),flying:!!flag('flying'),tunnel:!!flag('tunnel'),collectsWood:!!flag('wood'),carryingValue:flag('wood')||0,steals:!!flag('steals'),launchesProjectile:!!flag('proj'),timeUntilProjectile:flag('t')||0,utilityUnit:!!flag('util'),utilityPerUnit:flag('per')||0,utilityOffset:flag('off')||0,alwaysWinsOnce:!!flag('once'),suicideBomber:!!flag('suicide')};
}
const unitStrength=u=>u.type==='cash'&&u.carrying?0:UNITS[u.type].strength+(u.rage||0)*.5;
const mountedStrengthOf=u=>u.type==='cash'&&u.carrying?0:(UNITS[u.type].mountedStrength??UNITS[u.type].strength)+(u.rage||0)*.5;
const castleStrength=u=>u.type==='ram'?2+(u.ramSpeed-40)/10:UNITS[u.type].cs;
function resolveCombat(a,b,tieScores=[0,0]){
  const power=(t,o)=>UNITS[t].mountedStrength!==undefined&&UNITS[o].mounted?UNITS[t].mountedStrength:UNITS[t].strength;
  const d=Math.sign(power(a,b)-power(b,a));return d||Math.sign(tieScores[0]-tieScores[1]);
}
const newScore=()=>({treesHarvested:0,goldStolen:0,numGoldSpent:0,numUnitsBought:0,numUnitsDied:0,numUnitsKilled:0});
class Battle{
  constructor({seed=(Date.now()>>>0),ai=[false,true],difficulty=1,config={},rosters=[QUICK_ARMY,QUICK_ARMY],campaign=false,mode=0,hint=false,easyQuick=false,cannons=null,globalDifficulty=0,aiFrequency=null,campaignDifficulty=0}={}){
    this.cfg={...CONFIG,...config};this.mode=mode;this.campaign=campaign;this.seed=seed>>>0||1;
    this.rosters=rosters.map(l=>[...new Set(l)].filter(t=>UNITS[t]).slice(0,8));
    this.ai=Array.isArray(ai)?ai:[false,!!ai];this.difficulty=difficulty;this.easy=difficulty===0;this.globalDifficulty=globalDifficulty;this.campaignDifficulty=campaignDifficulty;
    this.time=0;this.running=false;this.started=false;this.winner=null;this.units=[];this.attackEffects=[];this.projectiles=[];this.projectileEffects=[];this.skillEffects=[];this.cannonFired=[-Infinity,-Infinity];this.events=[];this.nextEventId=1;this.nextId=1;
    this.cannons=cannons??this.rosters.map(r=>r.includes('cannon'));
    this.sides=[0,1].map(()=>({wood:this.cfg.startWood,hp:this.cfg.castleHealth,maxHp:this.cfg.castleHealth,tieScore:0,doubleIncome:false,score:newScore()}));
    this.trees=[];this.treeId=1;this.healPickup=null;this.healTimer=0;this.woodTimer=0;this.tickAcc=0;
    this.antlion=this.cfg.antlion?{x:240,y:296,canKill:true,queued:[],killAt:null,idleAt:null,attackStarted:null}:null;
    this.tallTrees=[];if(this.cfg.tallTrees){const d=48+this.randInt(25);this.tallTrees=[240-d,240+d].map(x=>({x,base:24-this.randInt(20),ready:false,growAt:null}));}
    this.setupAt=hint?2:null;this.easyQuick=easyQuick;
    // Northern hazards: blizzard (element 3) and thin ice (element 4)
    this.blizzard=this.cfg.blizzard?{next:12+this.randInt(8),until:-1}:null;
    this.thinIce=this.cfg.thinIce?{x0:204,x1:276,hole:null}:null;
    // Eastern hazards: fog (element 5) and the drawbridge (element 6)
    this.fog=this.cfg.fog?{next:this.cfg.alwaysFog?0:10+this.randInt(8),until:this.cfg.alwaysFog?Infinity:-1,x0:150,x1:330}:null;
    this.bridge=this.cfg.bridge?{x0:204,x1:276,hp:3,broken:false,rebuildAt:null}:null;
    // Underworld: tunnel lane with ore veins and seals (element 8), lava eruptions (element 7)
    this.tunnel=this.cfg.tunnel?{ores:[],oreId:1,seals:[null,null],nextOre:4}:null;
    this.lava=this.cfg.lava?{next:12+this.randInt(10),warnX:null,warnAt:null,eruptAt:null,pools:[]}:null;
    this.aiFrequency=aiFrequency??([4,1.5,.3][difficulty]??1.5);this.aiTimer=[0,0];
  }
  random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
  randInt(n){return n>0?Math.floor(this.random()*n):0;}
  emit(type,data={}){const e={type,time:this.time,seq:this.nextEventId++,...data};this.events.push(e);if(this.events.length>300)this.events.shift();}
  canAfford(side,type){return this.sides[side].wood>=UNITS[type].cost;}
  canSpawn(side,type){return this.running&&!this.winner&&!!UNITS[type]&&this.rosters[side].includes(type)&&(!UNITS[type].tunnel||!!this.tunnel)&&(type==='cannon'?this.sides[side].wood>44:this.canAfford(side,type))&&this.units.length<this.cfg.maxUnits;}
  // PlayerState createUnit:affectsState: (no cooldown in 1.85)
  spawn(side,type,{ai=false}={}){
    if(!this.running||this.winner||!UNITS[type])return false;
    if(!ai&&!this.rosters[side].includes(type))return false;
    if(UNITS[type].tunnel&&!this.tunnel)return false;
    const s=this.sides[side];
    if(type==='cannon'){if(s.wood<=44||!this.cannons[side])return false;s.wood-=45;if(ai)s.score.numGoldSpent+=45;this.cannonFired[side]=this.time;this.addProjectile('cannonball',side,side===0?60:440,side===0?164:167,(side===0?1:-1)*300,-82);this.emit('cannon',{side});return true;}
    if(s.wood<UNITS[type].cost||this.units.length>=this.cfg.maxUnits)return false;
    s.wood-=UNITS[type].cost;s.score.numUnitsBought++;s.score.numGoldSpent+=UNITS[type].cost;
    if(UNITS[type].pack){const dir=side===0?1:-1,pt=UNITS[type].packType??'wolf';for(let k=0;k<UNITS[type].pack;k++){const c=this.createUnit(side,pt,{x:(UNITS[pt].flies?AIR_START[side]:GROUND_START[side])-dir*14*k});if(pt==='bat')c.craneY=AIR_Y-10+12*k;}this.emit('spawn',{side,unitType:type});return true;}
    this.createUnit(side,type);this.emit('spawn',{side,unitType:type});return true;
  }
  buyDoubleIncome(side){const s=this.sides[side];if(!this.running||s.doubleIncome||s.wood<=149)return false;s.wood-=150;s.doubleIncome=true;this.emit('doubleIncome',{side});return true;}
  createUnit(side,type,position={}){
    const def=UNITS[type],x=def.flies?AIR_START[side]:def.tunnel?TUNNEL_START[side]:GROUND_START[side];
    const u={id:this.nextId++,side,type,x,dropAt:def.dropInterval?this.time+def.dropInterval:null,soundAt:this.time+.2,alive:true,state:'walk',timer:0,carrying:0,engageUntil:0,facing:side===0?1:-1,spawned:this.time,speed:def.speed,fuseAt:this.time+.12,ramSpeed:type==='ram'?80:null,whistleAt:0,...position};
    u.speedBuffer=1;
    if(type==='fire'||type==='ice')u.spellAt=position.spellAt??(this.time+(type==='fire'?.5:.25)+this.random());
    if(type==='witch')u.catAt=this.time+1;
    if(type==='caster')u.spellAt=position.spellAt??(this.time+.6+this.random());
    if(def.stealth)u.stealth=true;
    if(def.role==='support'){u.stopAt=this.time+(type==='necro'?.25:type==='wormPriest'?1.3:type==='rune'||type==='dancer'?.6:.5);if(type==='necro'){u.soulsLeft=3;u.reviveList=[];}}
    if(type==='worm'){u.phase=position.phase??0;u.phaseAt=this.time;u.hidden=position.hidden??true;}
    this.units.push(u);
    for(const p of this.units)if(p!==u&&p.alive&&p.side===side&&p.praying&&p.type==='wind'){u.speedBuffer=Math.max(.25,Math.min(1.75,u.speedBuffer*1.25));u.badges=[...(u.badges||[]),'SpeedBadge'];p.blessUntil=this.time+.75;this.emit('bless',{side});}
    if(this.sides[side].tieScore>0&&def.strength>0)u.badges=[...(u.badges||[]),'TieBadge'];
    return u;
  }
  start(){if(!this.winner){this.running=true;this.started=true;}}
  pause(){this.running=false;}
  moveSpeed(u){let v=Math.trunc(u.speed*Math.max(.25,Math.min(1.75,u.speedBuffer??1)));if(this.blizzardOn()&&!UNITS[u.type].flies&&u.type!=='giant')v=Math.trunc(v*.5);
    if(this.bridge&&this.bridge.broken&&!UNITS[u.type].flies&&u.x>this.bridge.x0-8&&u.x<this.bridge.x1+8)v=Math.max(4,Math.trunc(v/3));return v;}
  fogOn(){return !!this.fog&&this.time<this.fog.until;}
  inFog(u){return this.fogOn()&&u.x>this.fog.x0&&u.x<this.fog.x1;}
  updateFog(){const f=this.fog;if(!f||f.until===Infinity)return;if(this.time+1e-9>=f.next){f.until=this.time+8;f.next=this.time+8+12+this.randInt(10);this.emit('fog');}}
  // A seal placed by side s at x blocks the other side's tunnel units; that side's dwarf can break it.
  sealBlocks(u){const T=this.tunnel;if(!T||!UNITS[u.type].tunnel||u.type==='dwarf')return false;const dir=u.side===0?1:-1,sl=T.seals[1-u.side];return !!sl&&((dir>0&&u.x+8>=sl.x&&u.x<sl.x)||(dir<0&&u.x-8<=sl.x&&u.x>sl.x));}
  sapper(u,dt){const T=this.tunnel,dir=u.side===0?1:-1;if(!T){u.alive=false;return;}
    if(u.returning){u.state='return';u.facing=-dir;u.x-=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,u.side))u.alive=false;return;}
    u.state='walk';u.facing=dir;const enemySeal=T.seals[1-u.side];
    if(enemySeal&&Math.abs(u.x-enemySeal.x)<=8){T.seals[1-u.side]=null;this.effect('ExplosionDefaultAnimation',u.side,u.x,TUNNEL_Y);this.emit('sealBroken',{side:u.side});u.returning=true;return;}
    const target=u.side===0?252:228;
    if((dir>0&&u.x>=target)||(dir<0&&u.x<=target)){if(!T.seals[u.side]){T.seals[u.side]={x:target,until:this.time+20};this.emit('seal',{side:u.side});}u.returning=true;return;}
    u.x+=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,1-u.side)){u.returning=true;}}
  updateTunnel(){const T=this.tunnel;if(!T)return;for(const s of [0,1])if(T.seals[s]&&this.time>=T.seals[s].until){T.seals[s]=null;this.emit('sealGone');}
    if(this.time+1e-9>=T.nextOre){T.nextOre=this.time+9+this.randInt(8);if(T.ores.filter(o=>o.remaining>0).length<3){const x=140+this.randInt(200);if(!T.ores.some(o=>o.remaining>0&&Math.abs(o.x-x)<24))T.ores.push({id:T.oreId++,x,remaining:1,born:this.time});}}
    T.ores=T.ores.filter(o=>o.remaining>0);}
  updateLava(){const L=this.lava;if(!L)return;
    L.pools=L.pools.filter(p=>p.until>this.time);
    if(L.eruptAt===null&&L.warnAt===null&&this.time+1e-9>=L.next){L.warnX=120+this.randInt(240);L.warnAt=this.time;L.eruptAt=this.time+1;this.emit('lavaWarn',{x:L.warnX});}
    if(L.eruptAt!==null&&this.time+1e-9>=L.eruptAt){const x=L.warnX;for(const u of this.units)if(u.alive&&!UNITS[u.type].flies&&!UNITS[u.type].tunnel&&!UNITS[u.type].lavaWalker&&!u.hidden&&Math.abs(u.x-x)<=22){this.kill(u,'natural');this.emit('lavaKill',{side:u.side,unitType:u.type});}
      L.eruptAt=null;L.warnAt=null;L.lastX=x;L.lastAt=this.time;L.next=this.time+14+this.randInt(12);this.emit('erupt',{x});this.emit('shake',{side:0,magnitude:2,duration:.4});}
    for(const p of L.pools)for(const u of this.units)if(u.alive&&u.side!==p.side&&!UNITS[u.type].flies&&!UNITS[u.type].tunnel&&!UNITS[u.type].lavaWalker&&!u.hidden&&Math.abs(u.x-p.x)<=16){this.kill(u,'natural');this.emit('lavaKill',{side:u.side,unitType:u.type});}}
  damageBridge(n=1){const b=this.bridge;if(!b||b.broken)return;b.hp-=n;this.emit('bridgeHit');if(b.hp<=0){b.broken=true;b.rebuildAt=this.time+15;this.emit('bridgeBreak');}}
  updateBridge(){const b=this.bridge;if(!b||!b.broken)return;if(this.time+1e-9>=b.rebuildAt){b.broken=false;b.hp=3;b.rebuildAt=null;this.emit('bridgeFixed');}}
  blizzardOn(){return !!this.blizzard&&this.time<this.blizzard.until;}
  updateBlizzard(){const z=this.blizzard;if(!z)return;if(this.time+1e-9>=z.next){z.until=this.time+6;z.next=this.time+6+14+this.randInt(9);this.emit('blizzard',{duration:6});}}
  // Thin ice: heavy ground units may break through when they first step on it; an open hole swallows anyone.
  updateThinIce(){
    const I=this.thinIce;if(!I)return;if(I.hole&&this.time>=I.hole.until)I.hole=null;
    const heavy=['cavalry','heavy','ram','golem','unicorn'];
    for(const u of this.units){if(!u.alive||UNITS[u.type].flies||u.hidden||UNITS[u.type].iceWalker||u.type==='worm')continue;
      const x=Math.trunc(u.x);
      if(I.hole&&Math.abs(x-I.hole.x)<=12){this.kill(u,'natural');this.emit('iceFall',{side:u.side,unitType:u.type});continue;}
      if(x<I.x0||x>I.x1||u.iceChecked)continue;u.iceChecked=true;
      if(heavy.includes(u.type)&&u.type!=='unicorn'&&this.random()<.35){I.hole={x:Math.max(I.x0+12,Math.min(I.x1-12,x)),opened:this.time,until:this.time+2.5};this.kill(u,'natural');this.emit('iceFall',{side:u.side,unitType:u.type});}}
  }
  kill(u,cause='combat'){
    if(!u.alive)return;u.alive=false;
    if(u.type==='sword'&&u.praying)this.sides[u.side].tieScore--;
    for(const n of this.units)if(n.alive&&n.type==='necro'&&n.praying&&n.side===u.side&&n.soulsLeft>0&&['combat','projectile'].includes(cause)&&!UNITS[u.type].flies&&!u.ghost&&u.type!=='mummy'){n.reviveList.push('mummy');n.soulsLeft--;this.effect('NecromancerEffectAnimation',n.side,n.x,ground(n.x),20);if(n.soulsLeft===0)n.returnAt=this.time+.5;}
    if(u.type==='mummy'&&cause!=='castle'){const p=this.addProjectile('mummyFall',u.side,u.x,ground(u.x)-8,(u.side===0?1:-1)*60,-25);p.ghost=u.ghost;}
    if(cause==='combat'||cause==='projectile'||cause==='natural'){const large=UNITS[u.type].flies||['witch','petard'].includes(u.type);if(!UNITS[u.type].flies)this.deathAnim(u,large);}
    if(u.type==='petard')this.explodePetard(u);
    if(u.type==='lavaGolem'&&this.lava&&cause!=='castle'){this.lava.pools.push({x:Math.trunc(u.x),side:u.side,until:this.time+5,born:this.time});this.emit('lavaPool',{side:u.side});}
    if(UNITS[u.type].crew&&['combat','projectile','castle'].includes(cause)){const dir=u.side===0?1:-1,back=cause==='castle'?24:0;for(let k=0;k<3;k++)this.createUnit(u.side,UNITS[u.type].crew,{x:u.x-dir*(back+12*k),attackStarted:this.time});this.effect('ExplosionDefaultAnimation',u.side,u.x,ground(u.x));this.emit('crew',{side:u.side});}
    if(UNITS[u.type].flies&&!u.suppressWreck)this.fallAirship(u);
    if(cause==='combat'||cause==='projectile')this.emit('unitDied',{side:u.side,unitType:u.type,flies:!!UNITS[u.type].flies});
  }
  deathAnim(u,large){this.skillEffects.push({id:this.nextId++,sprite:large?'DeathLargeAnimation':'DeathSmallAnimation',side:u.side,x:Math.trunc(u.x),y:unitY(u),anchor:'center',fps:1/.15,born:this.time,expires:this.time+.45,unitLayer:true});}
  addProjectile(type,side,x,y,vx,vy){
    const properties={mummyFall:{power:0,radius:8,halfWidth:16,halfHeight:8,ground:true,gravity:true,sprite:'MummyBodyWalkAnimation',harmless:true,animationFps:5},unitDrop:{power:0,radius:16,halfWidth:16,halfHeight:24,ground:true,gravity:true,sprite:'StrongSoldierDrop',harmless:true},napalm:{power:1,radius:8,ground:true,gravity:true,sprite:'FallingNapalmAnimation',effectsTrees:true},fireball:{power:2,radius:8,ground:true,gravity:true,singleUse:true,sprite:'FireBallAnimation',followsGround:true},abandoned:{power:0,radius:16,ground:false,gravity:false,sprite:'PirateZeppelin',harmless:true,life:2},dust:{power:0,radius:8,ground:true,gravity:true,sprite:'DusterDustAnimation',harmless:true,effectsTrees:true},bomb:{power:1,radius:8,ground:true,gravity:true,sprite:'BomberBomb'},skyTree:{power:0,radius:16,ground:true,gravity:true,sprite:'treeGrowAnimation',scenery:true,harmless:true},wreck:{power:.5,radius:16,ground:true,gravity:true,sprite:'SmallZeppelin'},cannonball:{power:2,radius:8,ground:false,gravity:true,sprite:'CannonBall'},stone:{power:2,radius:8,ground:true,gravity:true,sprite:'CannonBall',singleUse:true},arrow:{power:1,radius:8,ground:true,gravity:false,singleUse:true,sprite:'ArcherArrow'},petard:{power:4,radius:32,ground:true,gravity:true,friendly:true,sprite:'ExplosionDefault'}}[type];
    const p={id:this.nextId++,type,side,x,y,vx,vy,born:this.time,alive:true,hits:[],friendly:false,singleUse:false,...properties};this.projectiles.push(p);return p;
  }
  fallAirship(u){
    const def=UNITS[u.type],dir=u.side===0?1:-1,light=['planter','duster'].includes(u.type);
    const p=this.addProjectile('wreck',u.side,u.x,unitY(u),dir*(light?15:Math.trunc(u.speed*.5)),light?20:40);
    Object.assign(p,{sprite:def.sprite,power:def.deathPower,halfWidth:def.collision[0],halfHeight:def.collision[1],rotateFor:light?1.4:1,rotateAngle:dir*(light?30:90)});
    if(def.dropUnit){p.rotateFor=1.4;p.rotateAngle=dir*30;p.halfWidth=24;p.halfHeight=20;}
    if(u.type==='grappler'){p.halfWidth=16;p.halfHeight=40;if(u.caughtCannonball)Object.assign(p,{power:3,gravity:false,fallPerTick:4,rotateFor:10,sprite:'CannonCatcherFallAnimation',animationFps:1/.3});}
    this.emit('explosion',{side:u.side});
  }
  captureAirship(pirate,victim){pirate.capture={type:victim.type,x:victim.x,carrying:victim.carrying};pirate.suppressWreck=true;victim.suppressWreck=true;victim.alive=false;pirate.engageUntil=Infinity;this.emit('capture',{side:pirate.side,unitType:victim.type});}
  finishCapture(u){const p=this.addProjectile('abandoned',u.side,u.x,unitY(u),u.side===0?7:-14,0);p.halfWidth=16;p.halfHeight=8;const n=this.createUnit(u.side,u.capture.type,{x:u.capture.x,carrying:u.capture.carrying});u.alive=false;return n;}
  showGold(side,amount,x,y){this.emit('gold',{side,amount,x:Math.trunc(x),y:Math.trunc(y)});}
  deliver(u){
    const s=this.sides[u.side];
    if(u.type==='thief'){s.wood=Math.trunc(s.wood+u.carrying);s.score.goldStolen+=u.carrying;this.showGold(u.side,u.carrying,u.x,unitY(u));}
    else{const v=u.carrying*(s.doubleIncome?2:1);s.wood+=v;s.score.treesHarvested++;this.showGold(u.side,v,u.x,unitY(u));}
    this.emit('deposit',{side:u.side,amount:u.carrying});u.carrying=0;u.alive=false;
  }
  hitCastle(u){
    const enemy=1-u.side,s=this.sides[enemy],cs=castleStrength(u);
    this.emit('unitHitEnemy',{side:u.side,unitType:u.type,flies:!!UNITS[u.type].flies,castleStrength:cs});
    s.hp=Math.max(-9999,cs===0?s.hp-1:Math.trunc(s.hp-cs*10));
    this.emit('castleHit',{side:enemy});
    if(['soldier','strong','cavalry','heavy','dog','golem','ram','mummy','mummyBody','unicorn','berserker','wolf','giant','samurai','burrower','lavaGolem'].includes(u.type))this.attackEffects.push({...u,state:'attack',attackStarted:this.time,expires:this.time+(UNITS[u.type].attackDuration??.3)});
    this.kill(u,'castle');
  }
  // Ground pickupTrees units (woodcutters, archers): walk forward, take the first ready tree they overlap.
  worker(u,dt){
    const dir=u.side===0?1:-1;
    if(u.carrying){u.state='return';u.facing=-dir;u.x-=dir*this.moveSpeed(u)*.5*dt;if(touchesCastle(u,u.side))this.deliver(u);return;}
    u.state='walk';u.facing=dir;if(this.sealBlocks(u)){u.state='idle';return;}u.x+=dir*this.moveSpeed(u)*dt;
    if(touchesCastle(u,1-u.side)){this.hitCastle(u);return;}
    if(UNITS[u.type].tunnel){const ore=this.tunnel.ores.find(o=>o.remaining>0&&Math.abs(o.x-u.x)<=10);if(ore){ore.remaining=0;u.carrying=UNITS[u.type].yield;u.state='return';u.facing=-dir;u.whistleAt=this.time+1;this.emit('chop',{side:u.side});}return;}
    const box=unitBounds(u),tree=this.trees.find(t=>t.remaining>0&&this.time-t.born+1e-9>=this.cfg.treeReadySeconds&&overlaps(box,treeBox(t)));
    if(tree){tree.remaining=0;this.emit('chop',{side:u.side});
      if(u.type==='archer'){u.state='attack';u.attackStarted=this.time;u.engageUntil=this.time+.3;u.shootAt=this.time+.3;return;}
      u.carrying=UNITS[u.type].yield;u.state='return';u.facing=-dir;u.whistleAt=this.time+1;}
  }
  harvestTallTree(u,dt){
    const dir=u.side===0?1:-1;
    if(u.carrying){u.facing=-dir;u.state='return';u.x-=dir*this.moveSpeed(u)*.5*dt;if(touchesCastle(u,u.side))this.deliver(u);return;}
    const t=this.tallTrees.find(t=>t.ready&&Math.abs(t.x-u.x)<=32);
    if(t){t.ready=false;t.pickedAt=this.time;u.carrying=50;u.facing=-dir;u.state='return';this.emit('chop',{side:u.side});return;}
    this.fly(u,dt);
  }
  fly(u,dt){
    const def=UNITS[u.type],dir=u.side===0?1:-1;
    if(u.type==='crane'){u.x+=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,1-u.side))u.alive=false;return;}
    if(!['planter','duster','treeCutter','soldierDrop','woodDrop','bat'].includes(u.type)&&this.time>=u.soundAt){u.soundAt=this.time+.2;this.emit('blimp',{side:u.side,unitType:u.type});}
    if(u.dropAt!==null&&u.dropAt<=this.time+1e-9){
      u.dropAt+=def.dropInterval;
      if(def.dropUnit){const p=this.addProjectile('unitDrop',u.side,u.x,unitY(u)+def.height/2,0,30);p.spawnType=def.dropUnit;p.sprite=def.dropUnit==='strong'?'StrongSoldierDrop':'WoodCutterDrop';}
      else if(u.type==='napalm'){if(u.x>95&&u.x<385){this.addProjectile('napalm',u.side,u.x,unitY(u),0,30);this.emit('napalm',{side:u.side});}}
      else{this.addProjectile(u.type==='bomber'?'bomb':u.type==='duster'?'dust':'skyTree',u.side,u.x,unitY(u)+(u.type==='bomber'?40:0),0,u.type==='duster'?100:30);if(u.type!=='duster')this.emit('drop',{side:u.side});}
    }
    u.x+=dir*this.moveSpeed(u)*dt;
    if(touchesCastle(u,1-u.side))this.hitCastle(u);
  }
  effect(sprite,side,x,y,fps=10,atlas=null){this.skillEffects.push({id:this.nextId++,sprite,side,x,y,fps,atlas,born:this.time,expires:this.time+(sprite==='SickTreeAnimation'?.25:sprite==='IceEffectAnimation'?.6:.25)});}
  wizard(u,dt){
    const dir=u.side===0?1:-1;
    if(u.returning){u.state='return';u.facing=-dir;u.x-=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,u.side))u.alive=false;return;}
    if(u.spellAt&&this.time+1e-9>=u.spellAt){u.spellAt=null;u.state='attack';u.attackStarted=this.time;u.castTimer=nativeTimer(u.type==='fire'?.25:u.type==='caster'?.4:1);u.homeTimer=nativeTimer(u.type==='fire'?1.25:1.5);if(u.type==='ice'){this.effect('IceEffectAnimation',u.side,u.x+dir*5,unitY(u)+6,1/.15);this.emit('ice',{side:u.side,phase:'cast'});}return;}
    if(u.castTimer&&fireNativeTimer(u.castTimer,dt)){
      if(u.type==='fire'){const vy=this.randInt(15)*(this.random()<.5?-1:1);this.addProjectile('fireball',u.side,u.x+dir*12,unitY(u)-8,dir*120,vy);this.emit('fireball',{side:u.side});}
      else if(u.type==='caster'){for(let k=0;k<3;k++){const c=this.createUnit(u.side,'crane',{x:u.x+dir*(6+10*k)});c.craneY=AIR_Y+20+14*k;c.suppressWreck=true;}this.emit('cranes',{side:u.side});u.castTimer=null;}
      else{const enemies=this.units.filter(v=>v.alive&&v.side!==u.side);for(const v of enemies)if((v.speedBuffer??1)>.32){v.speedBuffer=.32;v.frozen=true;this.effect('IceEffectAnimation',u.side,v.x,unitY(v)+16,1/.15);}if(enemies.length)this.emit('ice',{side:u.side,phase:'frost'});u.castTimer=null;}
    }
    if(u.homeTimer&&fireNativeTimer(u.homeTimer,dt)){u.returning=true;u.state='return';u.facing=-dir;u.castTimer=null;u.homeTimer=null;return;}
    if(u.state!=='attack'){u.x+=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,1-u.side))this.hitCastle(u);}
  }
  updateWitch(u){
    if(u.catAt&&this.time+1e-9>=u.catAt){u.catAt=null;u.cat=true;u.speed=60;u.ignoresCombat=true;u.humanAt=this.time+Math.trunc(Math.abs(u.x-(u.side===0?400:80))/60);this.effect('ExplosionDefaultAnimation',u.side,u.x,ground(u.x));this.emit('witch',{side:u.side});}
    if(u.cat&&this.time+1e-9>=u.humanAt){u.cat=false;u.speed=40;u.ignoresCombat=false;this.effect('ExplosionDefaultAnimation',u.side,u.x,ground(u.x));this.emit('witch',{side:u.side});}
  }
  support(u,dt){
    const dir=u.side===0?1:-1;
    if(u.type==='necro'&&u.reviveList.length){for(const t of u.reviveList)this.createUnit(u.side,t,{x:u.x+dir*12,ghost:true});u.reviveList=[];this.emit('necro',{side:u.side});}
    if(u.stopAt&&this.time+1e-9>=u.stopAt){u.stopAt=null;u.praying=true;u.state=u.type==='necro'?'attack':'pray';u.attackStarted=this.time;
      if(u.type==='sword'){this.sides[u.side].tieScore++;for(const v of this.units)if(v.side===u.side&&UNITS[v.type].strength>0&&!(v.badges||[]).includes('TieBadge'))v.badges=[...(v.badges||[]),'TieBadge'];}
      if(u.type==='wormPriest'){u.ritualAt=this.time+7;u.shakeAt=this.time+2;u.secondShakeAt=this.time+4.5;}
      if(u.type==='dancer'){u.blessUntil=this.time+.6;u.returnAt=this.time+.9;const back=u.side===0?1:-1;let n=0;
        for(const v of this.units)if(v.alive&&v.side!==u.side&&UNITS[v.type].flies){v.x=Math.max(40,Math.min(440,v.x+back*100));n++;}
        this.emit('wind',{side:u.side,hit:n});}
      if(u.type==='rune'){u.blessUntil=this.time+.6;u.returnAt=this.time+.9;let n=0;
        for(const v of this.units)if(v.alive&&v.side!==u.side&&!UNITS[v.type].flies&&!v.hidden&&v.type!=='worm'){v.frozenUntil=this.time+3;n++;this.effect('IceEffectAnimation',u.side,v.x,unitY(v)+16,1/.15);}
        this.emit('ice',{side:u.side,phase:n?'frost':'cast'});}}
    if(u.type==='wormPriest'&&u.praying){
      if(u.shakeAt&&this.time+1e-9>=u.shakeAt){u.shakeAt=null;this.emit('shake',{side:u.side,magnitude:0,duration:2.5});}
      if(u.secondShakeAt&&this.time+1e-9>=u.secondShakeAt){u.secondShakeAt=null;this.emit('shake',{side:u.side,magnitude:1,duration:2.5});}
      if(u.ritualAt&&this.time+1e-9>=u.ritualAt){u.ritualAt=null;u.wormAt=this.time+.25;u.returnAt=this.time+.2;u.blessUntil=this.time+.2;this.emit('shake',{side:u.side,magnitude:3,duration:.25});}}
    if(u.type==='wormPriest'&&u.wormAt&&this.time+1e-9>=u.wormAt){u.wormAt=null;this.createUnit(u.side,'worm');}
    if(u.returnAt&&this.time+1e-9>=u.returnAt){u.returnAt=null;u.returning=true;u.praying=false;u.state='return';u.facing=-dir;}
    if(u.returning){u.x-=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,u.side))u.alive=false;}
    else if(!u.praying){u.x+=dir*this.moveSpeed(u)*dt;if(touchesCastle(u,1-u.side))this.hitCastle(u);}
  }
  updateHealing(){
    const p=this.healPickup;if(!p)return;
    for(const u of this.units)if(u.alive&&!UNITS[u.type].flies&&!UNITS[u.type].tunnel&&u.type!=='engineer'&&overlaps(unitBounds(u),[p.x-8,p.y-8,p.x+8,p.y+8])){this.createUnit(u.side,'engineer',{x:p.x,state:'return',facing:u.side===0?-1:1});this.healPickup=null;this.emit('healPickup',{side:u.side});break;}
  }
  engineer(u,dt){
    const dir=u.side===0?1:-1;u.state='return';u.x-=dir*this.moveSpeed(u)*dt;
    if(touchesCastle(u,u.side)){const s=this.sides[u.side],hp=s.hp;s.hp=Math.min(s.maxHp,s.hp+40);u.alive=false;this.emit('heal',{side:u.side,amount:s.hp-hp});}
  }
  updateAntlion(){
    const a=this.antlion;if(!a)return;
    if(a.killAt!==null&&this.time+1e-9>=a.killAt){for(const id of a.queued){const u=this.units.find(u=>u.id===id&&u.alive);if(u){this.kill(u,'natural');this.emit('antlionKill',{unitType:u.type,side:u.side});}}a.queued=[];a.killAt=null;a.canKill=false;this.emit('worm');}
    if(a.idleAt!==null&&this.time+1e-9>=a.idleAt){a.idleAt=null;a.canKill=true;a.attackStarted=null;}
    if(!a.canKill)return;
    for(const u of this.units)if(u.alive&&!UNITS[u.type].flies&&u.type!=='witch'&&!u.hidden&&overlaps(unitBounds(u),[a.x-24,a.y-16,a.x+24,a.y+16])){if(a.killAt===null){a.killAt=this.time+.3;a.idleAt=this.time+.4;a.attackStarted=this.time;}if(!a.queued.includes(u.id))a.queued.push(u.id);}
  }
  updateWorm(u){
    if(this.time+1e-9>=u.phaseAt){u.phase++;if(u.phase>3){u.alive=false;this.emit('wormDie');return;}u.x=u.side===0?[120,240,370][u.phase-1]:480-[120,240,370][u.phase-1];u.hidden=false;u.phaseStarted=this.time;u.hideAt=this.time+.8;u.phaseAt=this.time+1.3;this.emit('worm',{side:u.side});this.emit('shake',{side:u.side,magnitude:1,duration:.5});}
    if(u.hideAt&&this.time+1e-9>=u.hideAt){if(u.phase===3){u.alive=false;this.emit('wormDie');return;}u.hidden=true;}
    const e=this.time-u.phaseStarted;u.hitWidth=e<.3?24:e<.6?50:24;
  }
  power(u,v){return UNITS[v.type].mounted?mountedStrengthOf(u):unitStrength(u);}
  fireArrow(u){
    const dir=u.side===0?1:-1,x=u.x+dir*8,y=ground(u.x)-5;
    const target=this.units.filter(v=>v.alive&&v.side!==u.side&&!UNITS[v.type].flies&&(v.x-u.x)*dir>=0).sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0];
    const tx=target?.x??(u.side===0?432:48),ty=target?ground(target.x)-8:192,dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy)||1;
    this.addProjectile('arrow',u.side,x,y,dx/len*180,dy/len*180);u.state='walk';this.emit('arrow',{side:u.side});
  }
  explodePetard(u){this.addProjectile('petard',u.side,u.x,ground(u.x),u.facing*u.speed*.5,40);this.emit('explosion',{side:u.side});}
  removeProjectile(p){
    if(!p.alive)return;p.alive=false;
    if(p.type==='mummyFall'){this.createUnit(p.side,'mummyBody',{x:p.x,ghost:p.ghost});return;}
    if(p.type==='unitDrop'){if(p.x>=80&&p.x<=384)this.createUnit(p.side,p.spawnType,{x:p.x});this.emit('land',{side:p.side,unitType:p.spawnType});return;}
    if(p.type==='napalm'){for(const o of [-15,0,15,30])this.skillEffects.push({id:this.nextId++,sprite:'BurningNapalmAnimation',side:p.side,x:p.x+o,y:ground(p.x+o),fps:10,born:this.time,expires:this.time+1.2,unitLayer:true});return;}
    if(p.type==='skyTree'){this.trees.push({id:this.treeId++,x:Math.trunc(p.x),remaining:1,born:this.time-3,grown:true});this.emit('treeLand',{side:p.side});return;}
    if(!['arrow','dust'].includes(p.type)){this.projectileEffects.push({...p,id:this.nextId++,born:this.time,expires:this.time+.25});this.emit(['petard','wreck'].includes(p.type)?'explosionBig':'explosion',{side:p.side});}
  }
  updateProjectiles(dt){
    for(const p of [...this.projectiles]){
      if(!p.alive)continue;
      if((p.life&&this.time-p.born+1e-9>=p.life)||(p.type==='petard'&&this.time-p.born>=.1)){this.removeProjectile(p);continue;}
      if(p.fallPerTick)p.vy+=p.fallPerTick;
      const px=p.x;p.x+=p.vx*dt;p.y+=p.vy*dt+(p.gravity?40*dt*dt:0);if(p.gravity)p.vy+=80*dt;if(p.followsGround)p.y+=ground(p.x)-ground(px);
      for(const u of this.units){
        if(p.harmless||!u.alive||u.hidden||u.stealth||UNITS[u.type].tunnel||p.hits.includes(u.id)||(!p.friendly&&u.side===p.side))continue;
        if(UNITS[u.type].catcher&&u.side!==p.side){const pw=p.halfWidth??p.radius,ph=p.halfHeight??p.radius;if(overlaps([p.x-pw,p.y-ph,p.x+pw,p.y+ph],unitBounds(u))){p.alive=false;u.alive=false;this.effect('ExplosionDefaultAnimation',u.side,u.x,unitY(u));this.emit('craneCatch',{side:u.side});break;}continue;}
        if(p.ground===!!UNITS[u.type].flies)continue;
        if(u.side!==p.side&&p.power<=(UNITS[u.type].projectileResistance??0))continue;
        const pw=p.halfWidth??p.radius,ph=p.halfHeight??p.radius;if(!overlaps([p.x-pw,p.y-ph,p.x+pw,p.y+ph],unitBounds(u)))continue;
        p.hits.push(u.id);if(u.type==='grappler'&&p.type==='cannonball'){u.caughtCannonball=true;p.alive=false;}
        this.kill(u,'projectile');
        if(u.side===p.side)this.sides[u.side].score.numUnitsDied++;else{this.sides[p.side].score.numUnitsKilled++;this.sides[u.side].score.numUnitsDied++;}
        this.emit('projectileHit',{side:p.side,unitType:u.type});
        if(!p.alive)break;if(p.singleUse){this.removeProjectile(p);break;}
      }
      if(!p.alive)continue;
      if(p.effectsTrees)for(const t of this.trees)if(t.remaining>0&&Math.abs(p.x-t.x)<=p.radius+8&&p.y+p.radius>=ground(t.x)-48&&p.y-p.radius<=ground(t.x)){t.remaining=0;this.effect('SickTreeAnimation',p.side,t.x,ground(t.x),20,'scenery');this.emit('treePoison',{side:p.side,x:t.x});}
      if(p.harmless){if(p.type!=='abandoned'&&p.y>=projectileGroundY(p))this.removeProjectile(p);continue;}
      if(p.type==='skyTree'){if(p.y>=projectileGroundY(p))this.removeProjectile(p);continue;}
      const enemy=1-p.side,pw=p.halfWidth??p.radius,ph=p.halfHeight??p.radius;
      if(CASTLE_BOXES[enemy].some(b=>overlaps([p.x-pw,p.y-ph,p.x+pw,p.y+ph],b))){this.sides[enemy].hp=Math.trunc(this.sides[enemy].hp-p.power*10);this.emit('castleHit',{side:enemy});this.removeProjectile(p);continue;}
      if((p.type!=='petard'&&p.y>projectileGroundY(p))||p.x<-64||p.x>544){if(this.bridge&&p.power>=1&&p.x>this.bridge.x0-16&&p.x<this.bridge.x1+16&&p.y>projectileGroundY(p))this.damageBridge(p.power>=4?3:1);this.removeProjectile(p);}
    }
    this.projectiles=this.projectiles.filter(p=>p.alive);
  }
  // ---- Quick-play AI (GameScene doAi:) ----
  quickInputs(side){
    const me=side,op=1-side,opp=this.units.filter(u=>u.alive&&u.side===op),ours=this.units.filter(u=>u.alive&&u.side===me);
    const maxOf=l=>Math.trunc(Math.max(0,...l.map(unitStrength)));
    const oppGroundL=opp.filter(u=>!UNITS[u.type].flies&&unitStrength(u)>0),oppAirL=opp.filter(u=>UNITS[u.type].flies&&unitStrength(u)>0);
    const oppGround=maxOf(oppGroundL),oppAir=maxOf(oppAirL);
    const lastAbove=(l,p)=>{let v=0;for(const u of l)if(unitStrength(u)>p)v=Math.trunc(unitStrength(u));return v;};
    const ourG=ours.filter(u=>!UNITS[u.type].flies),ourA=ours.filter(u=>UNITS[u.type].flies);
    const weak=ourG.filter(u=>!(unitStrength(u)>oppGround)&&!u.carrying);
    return {oppGround,nOppGround:oppGroundL.length,oppAir,nOppAir:oppAirL.length,carriers:opp.filter(u=>!UNITS[u.type].flies&&unitStrength(u)<=0&&u.carrying).length,
      ourGround:lastAbove(ourG,oppGround),ourAir:lastAbove(ourA,oppAir),woodcutters:weak.filter(u=>UNITS[u.type].role==='worker').length,thieves:weak.filter(u=>u.type==='thief').length,
      shot:this.projectiles.some(p=>p.alive&&p.side===me&&p.type==='cannonball'),gold:this.sides[me].wood,hp:this.sides[me].hp,oppGold:this.sides[op].wood};
  }
  chance(p){return p>0&&this.random()*2<=p;}
  runQuickAI(side){
    const n=this.quickInputs(side),d=this.difficulty,easy=d===0;
    const gDef=(()=>{if(n.gold<=24||n.ourGround>n.oppGround||!n.nOppGround)return 0;let s=n.ourGround<n.oppGround?.333:.111;if(n.ourGround*10>n.hp)s*=3;return s*(1+n.nOppGround*.2);})();
    const aDef=airDefenseScore({gold:n.gold,hp:n.hp,opposingCount:n.nOppAir,opposingPower:n.oppAir,ourPower:n.ourAir,opponentShotCannon:n.shot});
    const pick=(()=>{if(n.oppGround>n.ourGround)return 0;const trees=this.trees.filter(t=>t.remaining>0).length;if(!trees&&!n.oppGround&&!n.woodcutters)return .75;if(n.woodcutters>trees)return 0;let h=(trees-n.woodcutters)*.2;if(n.gold<=59)h*=1.4;if(n.gold<=24)h*=2.2;return h;})();
    const stop=stopResourcesScore({gold:n.gold,opponentGold:n.oppGold,difficulty:d,carriers:n.carriers,thieves:n.thieves,ourGroundPower:n.ourGround,opposingGroundPower:n.oppGround});
    const aAtk=airAttackScore({gold:n.gold,difficulty:d,opposingCount:n.nOppAir,opposingPower:n.oppAir,ourPower:n.ourAir,opponentShotCannon:n.shot});
    const gAtk=(()=>{if(n.gold<=24)return 0;let a=n.nOppGround?.2:(n.ourGround?.3:.6);if(n.ourGround>n.oppGround)a*=1.5;if(n.carriers){a+=n.carriers*.1;if(!n.oppGround)a+=.3;}if(!easy&&n.gold>25&&n.gold<=49)a*=.15;return a;})();
    const sp=t=>this.spawn(side,t,{ai:true});
    const ground_=p=>{if(easy)return sp(p===3?'cavalry':p===2?'strong':'soldier');if(sp('cavalry'))return true;if(p>2)return false;if(sp('strong'))return true;if(p===2)return false;return sp('soldier');};
    const air=(p,def)=>{if(def)return p>=1.25?(this.cannons[side]&&sp('cannon')):sp('zeppelin');if(easy)return sp('zeppelin');return sp('bomber')||sp('zeppelin');};
    if(stop>aAtk&&stop>gAtk&&this.chance(stop)&&sp('thief'))return;
    let attack=true;
    if(gDef>0||aDef>0){
      if(gDef>=aDef&&this.chance(gDef)){if(ground_(n.oppGround))return;}
      else if(this.chance(aDef)&&air(n.oppAir,true))return;
    }
    if(attack&&(gAtk>0||aAtk>0)){
      if(this.randInt(3)===1){if(gAtk>=aAtk&&this.chance(gAtk)){if(ground_(n.oppGround))return;}else if(this.chance(aAtk)&&air(n.oppAir,false))return;}
      else{if(aAtk>=gAtk&&this.chance(aAtk)){if(air(n.oppAir,false))return;}else if(this.chance(gAtk)&&ground_(n.oppGround))return;}
    }
    if(this.chance(pick))sp('wood');
  }
  // ---- Campaign AI (GameScene doCampaignAi:) ----
  runCampaignAI(side){
    const roster=this.rosters[side],me=this.sides[side];
    const create=type=>this.spawn(side,type,{ai:true});
    if(this.campaignDifficulty===0){do{const t=roster[this.randInt(roster.length)];if(create(t))return;}while(this.randInt(3)===0);return;}
    const op=1-side,you=this.units.filter(u=>u.alive&&u.side===op&&!u.hidden&&!u.stealth&&!this.inFog(u)),gold=me.wood,hp=me.hp;
    const infoOf=u=>INFO[u.type==='ice'?12:TYPE_ID(u.type)]??INFO[0];
    let nothing=0;for(const u of you){const i=infoOf(u);nothing+=i.castleAttack*10*.5+(i.castleAttack>hp?100:0)+(i.steals?(gold>14?15:gold>5?40:15):0);}
    const tree=this.nearestTreeToAI(side),tall=this.tallTrees.find(t=>t.ready)??null,startG=GROUND_START[side],startA=AIR_START[side];
    const list=[];
    for(const type of roster){
      const info=INFO[TYPE_ID(type)];if(!info)continue;
      let util=info.utilityUnit,f=info.cost/-3,tWood=1000,wood=false;
      const ore=info.tunnel?(this.tunnel?.ores.find(o=>o.remaining>0)??null):null;
      if(info.collectsWood&&(info.tunnel?ore:(info.flying?tall:tree)&&tree)){tWood=Math.abs(startG-(info.tunnel?ore.x:tree.x))/info.speed;wood=true;}
      if(info.tunnel&&!this.tunnel)continue;
      const start=info.flying?startA:startG,layer=info.flying?'air':info.tunnel?'tunnel':'ground';
      const targets=you.filter(u=>layerOf(u.type)===layer).map(u=>{const ms=this.moveSpeed(u);return {u,t:Math.abs(u.x-start)/(info.speed+(u.returning?-ms:ms)||1)};}).filter(o=>o.t<=tWood).sort((a,b)=>a.t-b.t);
      let died=false;
      for(const {u,t} of targets){const r=this.simulateCombat(info,u,t,side);f+=r.value;if(r.value>0)util=true;if(r.dies){died=true;if(!util)f+=info.cost*-10;break;}}
      if(!died){
        if(info.steals)f+=15;
        if(info.castleAttack===0&&hp>1&&!(util||wood))f+=info.cost*-10;
        else{f+=info.castleAttack*(info.suicideBomber?3:35);if(!(hp>info.castleAttack*10))f+=info.castleAttack*50;}
        if(wood)f+=info.carryingValue;
      }
      const g=wood?gold:gold-5;
      const score=g<info.cost?f-5*(info.cost-g):f+info.utilityOffset+info.utilityPerUnit*you.length;
      list.push({type,info,score});
    }
    if(!list.length)return;
    list.sort((a,b)=>b.score-a.score);const best=list[0];
    if(best.score+nothing<0)return;
    if(gold<best.info.cost)return;
    create(best.type);
  }
  simulateCombat(info,u,t,side){
    const uInfo=INFO[u.type==='ice'?12:TYPE_ID(u.type)]??INFO[0],gold=this.sides[side].wood,hp=this.sides[side].hp;
    if(info.steals&&u.carrying)return {value:2*u.carrying,dies:false};
    const isMounted=!!UNITS[u.type].mounted,sA=isMounted?info.mounted:info.unmounted,sU=info.mountedUnit?mountedStrengthOf(u):unitStrength(u);
    const win=(sA>0&&sA>=sU)||info.alwaysWinsOnce||uInfo.suicideBomber,proj=info.launchesProjectile&&info.timeUntilProjectile<t;
    let value=0;
    if(win||proj){const kill=(gold>info.cost&&uInfo.castleAttack*10>=hp)?1000:0;value=kill+uInfo.castleAttack*15+(u.carrying?uInfo.carryingValue:0)+(uInfo.cost>info.cost?uInfo.cost-info.cost:5);}
    let dies=false;
    if(!(proj&&!uInfo.launchesProjectile)){
      if(uInfo.alwaysWinsOnce||uInfo.suicideBomber)dies=true;
      else{if(uInfo.launchesProjectile){const pd=uInfo.id===9?this.trees.length*.2:uInfo.id===12?.75:uInfo.id===7?.5:0;dies=this.random()>pd;}if(sU>0&&!(sA>sU))dies=true;}
    }
    if(info.suicideBomber)dies=true;
    return {value,dies};
  }
  nearestTreeToAI(side){
    const trees=this.trees.filter(t=>t.remaining>0);if(!trees.length)return null;
    const sorted=[...trees].sort((a,b)=>side===1?b.x-a.x:a.x-b.x);
    if(this.globalDifficulty<=1)return sorted[0];
    const dz=this.antlion?288:0,list=sorted.filter(t=>side===1?t.x>dz:true);
    for(const u of this.units)if(u.alive&&u.side===side&&UNITS[u.type].role==='worker'&&!u.carrying){const i=list.findIndex(t=>side===1?t.x<u.x:t.x>u.x);if(i>=0)list.splice(i,1);}
    return list[0]??null;
  }
  runAI(side){
    if(!this.running||this.winner!==null)return;
    if(this.sides[side].wood<=4)return;
    if(this.campaign)this.runCampaignAI(side);else this.runQuickAI(side);
  }
  growTrees(){
    let min=146,range=188;
    if(this.randInt(2)===0){
      const army=s=>this.units.filter(u=>u.alive&&u.side===s&&!['wind','sword'].includes(u.type)).reduce((a,u)=>a+UNITS[u.type].cost,0);
      const d=this.sides[0].wood-this.sides[1].wood+army(0)-army(1),a=Math.abs(d),b=.3+.7*Math.trunc((150-a)/Math.max(a,100));
      if(d>20){min=Math.trunc(min+range*(1-b));range=Math.trunc(b*range);}else if(d!==20)range=Math.trunc(range*b);
    }
    const x=min+this.randInt(range);
    if(this.antlion&&x>192&&x<288)return;
    if(this.thinIce&&x>this.thinIce.x0-16&&x<this.thinIce.x1+16)return;
    if(this.bridge&&x>this.bridge.x0-16&&x<this.bridge.x1+16)return;
    this.trees.push({id:this.treeId++,x,remaining:1,born:this.time});
  }
  tick(dt){
    this.time+=dt;
    this.skillEffects=this.skillEffects.filter(p=>p.expires>this.time);this.attackEffects=this.attackEffects.filter(u=>u.expires>this.time);this.projectileEffects=this.projectileEffects.filter(p=>p.expires>this.time);
    if(this.setupAt!==null&&this.time+1e-9>=this.setupAt){this.setupAt=null;for(const x of [168,312])this.trees.push({id:this.treeId++,x,remaining:1,born:this.time});if(this.easyQuick)for(const s of [0,1]){if(this.spawn(s,'wood',{ai:true}))this.sides[s].wood+=5;}}
    if(this.cfg.allowHeals){this.healTimer+=dt;while(this.healTimer+1e-9>=1){this.healTimer-=1;if(!this.healPickup&&this.random()<1/90){this.healPickup={x:240,y:ground(240)-8};this.emit('healSpawn');}}}
    this.updateBlizzard();this.updateFog();this.updateBridge();this.updateTunnel();this.updateLava();
    this.woodTimer+=dt;while(this.woodTimer+1e-9>=1){this.woodTimer-=1;for(const s of this.sides)s.wood++;this.emit('award');}
    for(const t of this.tallTrees)if(t.growAt!==null&&this.time+1e-9>=t.growAt+.55){t.ready=true;t.growAt=null;}
    const live=this.trees.filter(t=>t.remaining>0).length;
    if(live<this.cfg.maxTrees&&this.randInt(this.cfg.treeChance)===1)this.growTrees();
    else if(this.tallTrees.length&&this.randInt(4*this.cfg.treeChance)===1){const c=this.tallTrees.filter(t=>!t.ready&&t.growAt===null);if(c.length)c[this.randInt(c.length)].growAt=this.time;}
    for(const side of [0,1])if(this.ai[side]){this.aiTimer[side]+=dt;if(this.aiTimer[side]+1e-9>=this.aiFrequency){this.aiTimer[side]=0;this.runAI(side);}}
    for(const side of [0,1])for(const u of this.units){
      if(!u.alive||u.side!==side)continue;
      if(u.capture){this.finishCapture(u);continue;}
      if((u.carrying&&['wood','master','thief','cash','miner','ninja'].includes(u.type))&&this.time>=u.whistleAt){u.whistleAt=this.time+1;const dir=u.side===0?1:-1;this.skillEffects.push({id:this.nextId++,sprite:'WhistleAnimation',side:u.side,x:u.x+dir*8,y:unitY(u),anchor:'center',fps:1/.15,born:this.time,expires:this.time+.3,unitLayer:true});}
      if(u.type==='engineer'){this.engineer(u,dt);continue;}
      if(u.type==='treeCutter'){this.harvestTallTree(u,dt);continue;}
      if(UNITS[u.type].flies){this.fly(u,dt);continue;}
      if(u.frozenUntil>this.time)continue;
      if(UNITS[u.type].role==='sapper'){this.sapper(u,dt);continue;}
      if(UNITS[u.type].role==='support'){this.support(u,dt);continue;}
      if(u.type==='worm'){this.updateWorm(u);continue;}
      if(u.type==='witch')this.updateWitch(u);
      if(UNITS[u.type].role==='mage'){this.wizard(u,dt);continue;}
      if(UNITS[u.type].role==='siege'){const d=u.side===0?1:-1,fx=UNITS[u.type].firingX[u.side];
        if((d>0&&u.x<fx)||(d<0&&u.x>fx)){u.state='walk';u.facing=d;u.x+=d*this.moveSpeed(u)*dt;continue;}
        u.state='walk';u.facing=d;if(u.fireAt===undefined)u.fireAt=this.time+1;
        if(this.time+1e-9>=u.fireAt){u.fireAt=this.time+UNITS[u.type].fireEvery;const p=this.addProjectile('stone',u.side,u.x+d*10,unitY(u)-12,d*95,-118);p.halfWidth=6;p.halfHeight=6;this.emit('stone',{side:u.side});}
        continue;}
      if(u.type==='petard'&&this.time>=u.fuseAt){u.fuseAt=this.time+.12;this.emit('fuse',{side:u.side});}
      if(u.shootAt&&u.shootAt<=this.time+1e-9){this.fireArrow(u);u.shootAt=null;}
      if(u.type==='ram'&&u.engageUntil>this.time){u.x+=(u.side===0?1:-1)*u.recoilSpeed*dt;continue;}
      if(this.bridge&&!this.bridge.broken&&!u.bridgeHit&&['ram','giant','longship'].includes(u.type)&&u.x>this.bridge.x0&&u.x<this.bridge.x1){u.bridgeHit=true;this.damageBridge(1);}
      if(u.engageUntil>this.time)continue;
      if(['worker','archer'].includes(UNITS[u.type].role)){this.worker(u,dt);continue;}
      const dir=u.side===0?1:-1;
      if(u.carrying){u.state='return';u.facing=-dir;u.x-=dir*this.moveSpeed(u)*.5*dt;if(touchesCastle(u,u.side))this.deliver(u);continue;}
      u.state='walk';u.facing=dir;if(this.sealBlocks(u))continue;u.x+=dir*this.moveSpeed(u)*dt;
      if(touchesCastle(u,1-u.side)){
        const enemy=this.sides[1-u.side];
        if(UNITS[u.type].role==='thief'&&enemy.wood>0){const cap=UNITS[u.type].steal??15;const v=enemy.wood>cap-1?cap:enemy.wood;enemy.wood-=v;u.carrying=v;u.stealth=false;u.state='return';u.facing=-dir;u.whistleAt=this.time+1;this.emit('steal',{side:u.side,amount:v});this.showGold(1-u.side,-v,u.x,unitY(u));continue;}
        this.hitCastle(u);
      }
    }
    // Unit vs unit (checkUnitUnitCollision)
    const blue=this.units.filter(u=>u.alive&&u.side===0),red=this.units.filter(u=>u.alive&&u.side===1);
    for(const a of blue)for(const b of red){
      if(!a.alive||!b.alive||a.ignoresCombat||b.ignoresCombat||a.hidden||b.hidden||a.capture||b.capture||(a.stealth&&!(b.carrying&&!a.carrying))||(b.stealth&&!(a.carrying&&!b.carrying))||layerOf(a.type)!==layerOf(b.type)||!overlaps(unitBounds(a),unitBounds(b)))continue;
      let stolen=false;
      for(const [th,v] of [[a,b],[b,a]])if(UNITS[th.type].role==='thief'&&!th.carrying&&v.carrying&&v.type!=='cash'&&!v.stealth){th.carrying=v.carrying;th.stealth=false;th.state='return';th.facing=th.side===0?-1:1;th.whistleAt=this.time+1;this.kill(v);this.sides[th.side].score.numUnitsKilled++;this.sides[v.side].score.numUnitsDied++;this.emit('steal',{side:th.side,amount:th.carrying});stolen=true;break;}
      if(stolen)continue;
      const sA=this.power(a,b),sB=this.power(b,a);if(sA===0&&sB===0)continue;
      const aAtt=a.engageUntil>this.time,bAtt=b.engageUntil>this.time,tA=this.sides[0].tieScore,tB=this.sides[1].tieScore;
      const aDies=!bAtt&&(sA<sB||(sA===sB&&!(tA>tB))),bDies=!aAtt&&(sA>sB||(sA===sB&&!(tB>tA)));
      this.emit('fight',{a:a.type,b:b.type});
      const winner=aDies&&!bDies?b:bDies&&!aDies?a:null;
      if(winner&&winner.type==='pirate'&&(winner===a?b:a).type!=='pirate'&&!winner.capture){const loser=winner===a?b:a;this.captureAirship(winner,loser);this.sides[winner.side].score.numUnitsKilled++;this.sides[loser.side].score.numUnitsDied++;continue;}
      if(aDies){this.kill(a);this.sides[1].score.numUnitsKilled++;this.sides[0].score.numUnitsDied++;}
      if(bDies){this.kill(b);this.sides[0].score.numUnitsKilled++;this.sides[1].score.numUnitsDied++;}
      for(const [s,l] of [[b,a],[a,b]]){
        if(!(l===a?aDies:bDies)||!s.alive||(s===a?aAtt:bAtt))continue;
        if(s.type==='cash'&&!s.carrying){s.carrying=UNITS[l.type].cost;s.state='return';s.facing=s.side===0?-1:1;s.whistleAt=this.time+1;this.effect('ExplosionDefaultAnimation',s.side,l.x,ground(l.x));this.emit('polymorph',{side:s.side});}
        s.attackStarted=this.time;
        if(UNITS[s.type].rage&&(s.rage||0)<3){s.rage=(s.rage||0)+1;s.speedBuffer=Math.min(1.75,(s.speedBuffer??1)*1.2);if(!(s.badges||[]).includes('SpeedBadge'))s.badges=[...(s.badges||[]),'SpeedBadge'];}
        if(s.type==='worm')continue;
        if(s.type==='petard'){this.kill(s);continue;}
        if(s.type==='ram'){s.recoilSpeed=-Math.trunc(s.ramSpeed*.5);s.ramSpeed=Math.max(40,s.ramSpeed-10);s.speed=s.ramSpeed;}
        if(UNITS[s.type].flies)continue;
        if(UNITS[s.type].cleave){s.engageUntil=0;continue;}
        s.engageUntil=this.time+(s.type==='ram'?.15:s.type==='pike'?.22:(UNITS[s.type].attackDuration??.3));
      }
    }
    this.updateHealing();this.updateAntlion();this.updateThinIce();this.updateProjectiles(dt);
    this.units=this.units.filter(u=>u.alive);this.trees=this.trees.filter(t=>t.remaining>0);
    if(this.sides[0].hp<=0||this.sides[1].hp<=0){this.sides.forEach(s=>s.hp=Math.max(0,s.hp));this.winner=this.sides[1].hp<=0?'blue':'red';this.loser=this.winner==='blue'?1:0;this.running=false;this.emit('end',{winner:this.winner});}
  }
  update(dt){
    if(!this.running||this.winner!==null)return;
    this.tickAcc+=dt;while(this.tickAcc+1e-9>=this.cfg.tick&&this.running){this.tickAcc-=this.cfg.tick;this.tick(this.cfg.tick);}
  }
  // Save/restore an in-progress quick battle (GameScene SaveLoad).
  snapshot(){return JSON.parse(JSON.stringify({cfg:this.cfg,mode:this.mode,rosters:this.rosters,difficulty:this.difficulty,aiFrequency:this.aiFrequency,cannons:this.cannons,sides:this.sides,trees:this.trees.map(t=>({x:t.x,born:t.born-this.time})),healPickup:!!this.healPickup,
    units:this.units.filter(u=>u.alive&&!u.capture).map(u=>({type:u.type,side:u.side,x:u.x,carrying:u.carrying})),projectiles:this.projectiles.filter(p=>p.alive&&['cannonball','bomb','arrow','fireball','napalm'].includes(p.type)).map(p=>({type:p.type,side:p.side,x:p.x,y:p.y,vx:p.vx,vy:p.vy}))}));}
  static restore(d,opts={}){
    const b=new Battle({...opts,config:d.cfg,rosters:d.rosters,difficulty:d.difficulty,aiFrequency:d.aiFrequency,cannons:d.cannons,mode:d.mode});
    b.sides=d.sides.map(s=>({...s,score:{...newScore(),...s.score}}));
    for(const t of d.trees)b.trees.push({id:b.treeId++,x:t.x,remaining:1,born:Math.min(t.born,-1)});
    if(d.healPickup)b.healPickup={x:240,y:ground(240)-8};
    for(const u of d.units)b.createUnit(u.side,u.type,{x:u.x,carrying:u.carrying||0});
    for(const p of d.projectiles)b.addProjectile(p.type,p.side,p.x,p.y,p.vx,p.vy);
    return b;
  }
}
Object.assign(exports,{ground,AIR_Y,TUNNEL_Y,unitY,unitBounds,overlaps,projectileGroundY,CONFIG,UNITS,UNIT_KEYS,TYPE_ID,QUICK_ARMY,DEFAULT_ROSTER,INFO,resolveCombat,unitStrength,Battle,GROUND_START,AIR_START});
