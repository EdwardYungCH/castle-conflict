// Persistent game data: settings, quick-play score, campaign files, skins and battle parameters.
const {CONTENT}=require("content-v1.85");
const {Store}=require("core");
const {UNIT_KEYS,QUICK_ARMY}=require("engine");
const CASTLES=CONTENT.maps.flatMap(m=>m.castles);
const castleById=id=>CASTLES.find(c=>c.id===id);
const TEMPLE_CASTLES=[25,26,27,35,36];
const castleSkin=c=>c.skin===0?0:TEMPLE_CASTLES.includes(c.id)?2:1;
const unitInfo=id=>CONTENT.units.find(u=>u.id===id);
const upgradeInfo=id=>id===100?{id:100,name:'Health Boost',description:'Increases max castle health',techCost:4}:CONTENT.upgrades.find(u=>u.id===id);
// PlayerSkin XMLs: Left = player, Right = opponent.
const SKINS=[
 {name:'Medieval',file:'MedievalSkin',left:{units:'playerStandard',castle:'CastlePlayer',buttons:'sprites_hud_alpha.png'},right:{units:'computerMedieval',castle:'CastleEnemy',buttons:'sprites_redhud_big_alpha.png'}},
 {name:'Egyptian Pyramid',file:'EgyptianSkin',left:{units:'playerEgyptian',castle:'PyramidPlayer',buttons:'sprites_egypt_bluehud_big_alpha.png'},right:{units:'computerEgyptian',castle:'PyramidEnemy',buttons:'sprites_egypt_redhud_big_alpha.png'}},
 {name:'Egyptian Temple',file:'EgyptianTempleSkin',left:{units:'playerEgyptian',castle:'TemplePlayer',buttons:'sprites_egypt_bluehud_big_alpha.png'},right:{units:'computerEgyptian',castle:'TempleEnemy',buttons:'sprites_egypt_redhud_big_alpha.png'}}];
// PreDefineScenery sets (canvas coordinates for sparkles: y = 320 - cocos y)
const SCENERY={
 hill:{birds:'light',sparkles:[[235,140],[345,210],[245,280]]},
 bird:{birds:'light'},
 forest:{birds:'light',clouds:['forestclouds2.png','forestclouds1.png']},
 forestBeach:{birds:'light',sparkles:[[271,188]],surf:true},
 water:{birds:'light',sparkles:[[174,-430],[260,176],[333,260]],clouds:['forestclouds1.png','forestclouds2.png'],surf:true},
 sunsetWater:{birds:'dark',sparkles:[[174,-430],[260,176],[333,260]],surf:true},
 dry:{clouds:['dryclouds1.png','dryclouds2.png']},
 darkBird:{birds:'dark'},none:{}};
const CASTLE_SCENERY={0:'hill',6:'hill',9:'hill',1:'bird',4:'bird',14:'bird',7:'bird',11:'bird',13:'bird',2:'forest',5:'forest',3:'forestBeach',8:'water',16:'water',17:'sunsetWater',10:'dry',12:'dry',15:'darkBird',18:'darkBird',19:'darkBird'};
const BG_SCENERY={'bg_grass.png':'hill','bg_grass2.png':'bird','bg_plains.png':'bird','bg_river.png':'bird','bg_mountains.png':'bird','bg_forest1.png':'forest','bg_beachforest.png':'forestBeach','bg_water2.png':'water','bg_water3.png':'water','bg_watersunset.png':'sunsetWater','bg_dry.png':'dry','bg_forestsunset.png':'darkBird','bg_mountainsunset.png':'darkBird','bg_sunset.png':'darkBird'};
const MP_LEVELS=[['bg_egypt_desert1.png','Wastelands',0,1,[]],['bg_egypt_nile2.png','Fury Bend',2,1,[2,1]],['bg_egypt_grass1.png','Valley of the Dead',2,1,[]],['bg_egypt_desert3.png','Sandy Expanse',0,1,[]],['bg_egypt_nile1.png','Antlions Hunger',1,1,[2,1]],['bg_egypt_grass2.png',"King's Row",1,1,[]],['bg_egypt_desert4.png','The Three Fingers',1,1,[2]],['bg_egypt_nile3.png','Bounteous Nile',2,1,[1]],['bg_egypt_desert5.png','Glimmering Hope',1,1,[]],['bg_egypt_grass4.png','Flourishing Green',2,1,[]],['bg_egypt_nile4.png','Retreat',1,1,[1]],['bg_egypt_sunset1.png','Fading Hope',0,1,[2]],['bg_egypt_sunset2.png','Retiring Day',1,1,[1,2]],['bg_egypt_night1.png','Desert Dream',1,1,[]],['bg_beachforest.png','Trifalgor Forest',2,0,[]],['bg_dry.png','The Drylands',0,0,[]],['bg_grass2.png','Grassy Plains',1,0,[]],['bg_water2.png','Distant Home',1,0,[]],['bg_mountains.png','Sky Mountain',1,0,[]],['bg_plains.png','Barren Plains',0,0,[]],['bg_forest1.png','The Endless Wood',2,0,[]],['bg_river.png','Flowstream',1,0,[]],['bg_sunset.png','The Aftermath',1,0,[]],['bg_mountainsunset.png','The Distance',0,0,[]],['bg_forestsunset.png',"Hero's Retreat",2,0,[]],['bg_watersunset.png','Peace',1,0,[]]].map(([bg,name,trees,egypt,elements])=>({bg,name,trees,egypt:!!egypt,elements}));
const TREE_GROWTH=[{treeChance:170,maxTrees:5},{treeChance:130,maxTrees:10},{treeChance:90,maxTrees:12}];
// ---------- GameSettings ----------
const DEFAULT_SETTINGS={difficulty:0,gameLength:1,treeGrowthRate:1,allowHeals:true,hasTrophy:false};
const Settings={load(){return {...DEFAULT_SETTINGS,...(Store.get('settings',{})||{})};},save(s){Store.set('settings',s);}};
// ---------- GameScore (quick play streak) ----------
const GameScore={load(){return {hasTrophy:false,numConsecutiveWins:0,numTotalWins:0,numTotalLosses:0,best:0,numHardWins:0,numMediumWins:0,numEasyWins:0,...(Store.get('score',{})||{})};},
  save(s){Store.set('score',s);},
  update(victory,difficulty){const s=this.load();if(victory){s.numConsecutiveWins++;s.best=Math.max(s.best,s.numConsecutiveWins);s.numTotalWins++;s[['numEasyWins','numMediumWins','numHardWins'][difficulty]]++;}else{s.numConsecutiveWins=0;s.numTotalLosses++;}this.save(s);return s;},
  clearStreak(){const s=this.load();s.numConsecutiveWins=0;this.save(s);}};
// ---------- CampaignState ----------
class CampaignState{
  constructor(id,d={}){
    this.campaignId=id;this.version=1;this.ownedCastles=Array.from({length:39},(_,i)=>!!d.ownedCastles?.[i]);
    this.techPoints=d.techPoints??0;this.lastCastleBeat=d.lastCastleBeat??1000;this.hasSeenUnitScreen=!!d.hasSeenUnitScreen;
    this.units=Array.isArray(d.units)?[...d.units]:[2,0,1];this.inactiveUnits=Array.isArray(d.inactiveUnits)?[...d.inactiveUnits]:[];
    this.upgrades=Array.isArray(d.upgrades)?[...d.upgrades]:[];this.startHealth=d.startHealth??80;this.playerSkin=d.playerSkin??0;
    this.lastMapPos=d.lastMapPos??{x:0,y:0};this.lastMapScale=d.lastMapScale??0;this.numBattles=d.numBattles??0;this.numVictories=d.numVictories??0;
    this.currentMap=d.currentMap??0;this.upgradesAvailable=Array.isArray(d.upgradesAvailable)?[...d.upgradesAvailable]:[3];
    this.hasSetEgyptSkin=!!d.hasSetEgyptSkin;this.unlockedSkins=Array.isArray(d.unlockedSkins)?[...d.unlockedSkins]:[0];
  }
  static exists(id){return !!Store.get('campaign'+id);}
  static load(id){const d=Store.get('campaign'+id);return new CampaignState(id,d||{});}
  static remove(id){Store.del('campaign'+id);}
  save(){return Store.set('campaign'+this.campaignId,this);}
  ownsCastle(i){return !!this.ownedCastles[i];}
  winCastle(i){this.ownedCastles[i]=true;}
  numCastlesOwned(){return this.ownedCastles.filter(Boolean).length;}
  addUnit(u){if(this.units.length>=8){this.inactiveUnits.push(u);return false;}this.units.push(u);return true;}
  hasUnit(u){return this.units.includes(u)||this.inactiveUnits.includes(u);}
  hasUpgrade(u){return this.upgrades.includes(u);}
  hasUpgradeAvailable(u){return this.upgradesAvailable.includes(u);}
  hasSkin(n){return this.unlockedSkins.includes(n);}
  setEgyptSkin(){if(!this.unlockedSkins.includes(1))this.unlockedSkins.push(1);this.playerSkin=1;this.hasSetEgyptSkin=true;}
  ownAllCastlesAfterWinning(id){const [a,b]=this.currentMap===0?[0,19]:[20,38];for(let i=a;i<=b;i++)if(i!==id&&!this.ownedCastles[i])return false;return true;}
  conqueredAllRealms(){for(let i=0;i<38;i++)if(!this.ownedCastles[i])return false;return true;}
  connections(){return CONTENT.maps.flatMap(m=>m.connections.map(c=>({...c,startPosition:c.from===20&&c.to===0&&c.mapLink})));}
  pathExistsToCastle(id){return this.connections().some(c=>(c.mapLink&&c.startPosition&&c.from===id)||(!c.mapLink&&((c.to===id&&this.ownsCastle(c.from))||(c.from===id&&this.ownsCastle(c.to)))));}
  pathExistsToLink(target){return this.connections().some(c=>c.mapLink&&c.to===target&&(c.startPosition||this.ownsCastle(c.from)));}
}
// ---------- BattleParams ----------
function quickParams(settings=Settings.load()){
  return {mode:0,background:'bg_grass.png',scenery:'hill',sceneryAtlas:'Scenery',egypt:false,playerSkin:0,enemySkin:0,
    playerUnits:[...QUICK_ARMY],enemyUnits:[...QUICK_ARMY],playerUpgrades:[0],enemyUpgrades:[0],cannons:[true,true],
    playerHealth:[250,120,80][settings.gameLength],enemyHealth:[250,120,80][settings.gameLength],startGold:[40,25,5][settings.difficulty],
    aiFrequency:[4,1.5,.3][settings.difficulty],difficulty:settings.difficulty,treeGrowth:settings.treeGrowthRate,allowHeals:settings.allowHeals,
    hint:settings.difficulty===0,easyQuick:settings.difficulty===0,doubleIncome:true,trophy:settings.hasTrophy,elements:[],globalDifficulty:settings.difficulty};
}
function campaignParams(state,castleId,settings=Settings.load()){
  const c=castleById(castleId),egypt=c.skin!==0,eSkin=castleSkin(c);
  const pu=state.units.map(id=>UNIT_KEYS[id]).filter(Boolean),eu=c.units.map(id=>UNIT_KEYS[id]).filter(Boolean);
  return {mode:1,castleId,state,background:c.background,scenery:egypt?'none':(CASTLE_SCENERY[castleId]||'bird'),sceneryAtlas:egypt?'EgyptianScenery':'Scenery',egypt,
    playerSkin:state.playerSkin,enemySkin:eSkin,playerUnits:pu,enemyUnits:eu,playerUpgrades:[...state.upgrades],enemyUpgrades:[...c.upgrades],cannons:[pu.includes('cannon'),eu.includes('cannon')],
    playerHealth:state.startHealth,enemyHealth:c.health,startGold:c.gold,aiFrequency:[3,2,.75][c.difficulty]??.75,difficulty:c.difficulty,campaignDifficulty:c.difficulty,
    treeGrowth:c.treeGrowth,allowHeals:c.allowsHeals,hint:!state.ownsCastle(0),easyQuick:false,doubleIncome:false,trophy:false,elements:c.elements,globalDifficulty:settings.difficulty};
}
function mpParams(level,armies,settings){
  const L=MP_LEVELS[level],skin=L.egypt?1:0;
  return {mode:2,background:L.bg,scenery:L.egypt?'none':(BG_SCENERY[L.bg]||'bird'),sceneryAtlas:L.egypt?'EgyptianScenery':'Scenery',egypt:L.egypt,levelName:L.name,
    playerSkin:armies[0].skin??skin,enemySkin:armies[1].skin??skin,playerUnits:armies[0].units,enemyUnits:armies[1].units,playerUpgrades:armies[0].upgrades??[0],enemyUpgrades:armies[1].upgrades??[0],
    cannons:[armies[0].units.includes('cannon'),armies[1].units.includes('cannon')],playerHealth:armies[0].health??120,enemyHealth:armies[1].health??120,startGold:25,aiFrequency:1.5,difficulty:1,
    treeGrowth:L.trees,allowHeals:settings.heals,hint:false,easyQuick:false,doubleIncome:false,trophy:false,elements:L.elements,globalDifficulty:1,twoPlayer:true};
}
const RANKS=p=>p>=1?'Legend':p>=.85?'Emperor':p>=.7?'King':p>=.5?'Duke':p>.25?'Knight':'Squire';
Object.assign(exports,{CASTLES,castleById,castleSkin,unitInfo,upgradeInfo,SKINS,SCENERY,CASTLE_SCENERY,MP_LEVELS,TREE_GROWTH,Settings,GameScore,CampaignState,quickParams,campaignParams,mpParams,RANKS,CONTENT,TEMPLE_CASTLES});
