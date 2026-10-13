// Fan expansion on top of the original 1.85 content (content-v1.85.js stays untouched).
//
// Part 1 - finish what 1.85 left half-done:
//   - Temple (4) is now a real shop upgrade that the Temple Units page sells and requires
//     (1.85 sold Magic Engine on that page and Temple units required it).
//   - Solar (5) costs 0 tech points and is granted as soon as it becomes available; the second
//     Air Units page shows it, while its units still need the Tower (as in 1.85).
//   - (Temple skin unlock fix lives in campaign.js / data.js.)
//
// Part 2 - the Northern Realm: a third map reached by the ship that said "Nothing here yet...",
//   16 castles (ids 39-54), the Longhouse upgrade (6), five new units (ids 36-40, plus the
//   internal Wolf 41), the Northern Fortress appearance (skin 3) and two hazards:
//   element 3 = blizzard, element 4 = thin ice.
const {CONTENT}=require("content-v1.85");
const {ATLASES}=require("atlases");
const {UNIT_GEOMETRY}=require("unit-geometry");
const {NORTH_MAP}=require("north-map");

// ---------- Part 1 ----------
const page=(name,req)=>CONTENT.shopPages.find(p=>p.name===name&&p.requires===req);
Object.assign(page('Temple Units',4),{upgrade:4});
Object.assign(page('Air Units',5),{upgrade:5,unitReq:0});

// ---------- Part 2: units, upgrade, shop ----------
const NORTH_UNITS=[
 {id:36,name:'Berserker',description:'Gets faster and stronger with every kill',cost:40,techCost:11,internal:false,hud:[144,384]},
 {id:37,name:'Wolf Pack',description:'Three fast wolves',cost:35,techCost:6,internal:false,hud:[192,384]},
 {id:38,name:'Frost Giant',description:'Slow, huge and hard to kill',cost:70,techCost:18,internal:false,hud:[240,384]},
 {id:39,name:'Rune Priest',description:'Freezes enemy ground units',cost:45,techCost:15,internal:false,hud:[288,384]},
 {id:40,name:'Dragon Longship',description:'Drops three soldiers when wrecked',cost:60,techCost:15,internal:false,hud:[336,384]},
 {id:41,name:'Wolf',description:'',cost:0,techCost:0,internal:true,hud:[192,384]}];
CONTENT.units.push(...NORTH_UNITS);
CONTENT.upgrades.push({id:6,name:'Longhouse',description:'Allows purchase of northern units.',techCost:11});
CONTENT.shopPages.push({name:'Norse Units',units:[37,36,40,39,38],upgrade:6,requires:6});

// ---------- Part 2: the map ----------
const BG=n=>`bg_north_${n}.png`;
// id, name, health, gold, techReward, difficulty, treeGrowth, background, units, upgrades, elements
const NORTH_CASTLES=[
 [39,'Jarl Ulf the Greeter',240,30,6,1,1,'hills',[2,0,36,21,37],[6],[]],
 [40,'Jarl Bjorn the Bear',250,25,6,1,2,'forest',[2,16,36,1,17,15],[6,3],[3]],
 [41,'Jarl Sigrid the Cold',250,30,6,1,1,'fjord',[2,0,37,13,39,6],[6,0],[3]],
 [42,'Jarl Ragnar the Hairy',260,20,11,1,1,'coast',[2,16,36,40,11,14],[6,3],[4]],
 [43,'Jarl Astrid the Swift',260,35,11,1,2,'plains',[2,21,37,4,10,28],[6],[4]],
 [44,'Jarl Leif the Lost',280,15,11,2,0,'aurora_forest',[2,16,24,26,39,22],[6,4,2],[3]],
 [45,'Jarl Gunnar the Hungry',270,20,11,2,1,'hills2',[2,3,36,37,18,40],[6,2],[4]],
 [46,'Jarl Freya the Frozen',290,25,11,2,1,'river',[2,16,38,13,39,12],[6,2],[3,4]],
 [47,'Jarl Halfdan the Black',300,20,11,2,2,'mountains',[2,16,36,38,7,5,30],[6,0,3],[3]],
 [48,'Jarl Ivar the Boneless',300,25,15,2,1,'fjord2',[2,16,40,24,26,27,37],[6,4],[4]],
 [49,'Jarl Erik the Red',310,30,15,2,1,'aurora',[2,16,36,40,33,19,5],[6,0,5],[3]],
 [50,'Jarl Harald Fairhair',310,20,15,2,2,'aurora_sea',[2,16,38,39,37,32,6],[6,0,2],[3,4]],
 [51,'Jarl Thyra the Wise',330,35,15,2,1,'aurora_peaks',[2,16,39,12,13,18,38],[6,2,4],[3]],
 [52,'Jarl Skadi the Huntress',330,25,15,2,2,'forest',[2,16,37,9,36,21,40,5],[6,3,0],[4]],
 [53,'Jarl Olaf the Stout',350,30,18,2,1,'hills',[2,16,38,10,11,40,17,7],[6,3,0,2],[3,4]],
 [54,'Hrimthur the Frost King',400,30,18,2,1,'aurora_peaks',[2,16,38,36,39,37,40,33],[6,0,2,3,4,5],[3,4]]];
const castles=NORTH_CASTLES.map(([id,name,health,gold,techReward,difficulty,treeGrowth,bg,units,upgrades,elements],i)=>({
  id,name,position:NORTH_MAP.castles[id],health,gold,techReward,difficulty,treeGrowth,flipped:i%2===1,background:BG(bg),skin:3,
  units,upgrades,allowsHeals:false,attackGround:true,attackAir:true,elements,...(id===54?{aiFrequency:.6}:{})}));
CONTENT.maps.push({id:2,name:'Northern Realm',image:'Map3.png',castles,connections:NORTH_MAP.connections});
// Egypt's last ship ("Nothing here yet...") now sails north.
const egyptLink=CONTENT.maps[1].connections.find(c=>c.from===38&&c.to===1000);egyptLink.to=2;
// The original's own start link (Egypt castle 20 <-> homeland ship) gets the same explicit flag.
CONTENT.maps[1].connections.find(c=>c.from===20&&c.to===0).start=true;
CONTENT.version='1.85+north';

// ---------- atlases ----------
const clone=(src,texture)=>({texture,entries:JSON.parse(JSON.stringify(ATLASES[src].entries))});
ATLASES.NorthPlayer=clone('CastlePlayer','spr_north_castles_alpha.png');
ATLASES.NorthEnemy=clone('CastleEnemy','spr_north_castles_alpha.png');
ATLASES.WorldMapNorth=clone('WorldMap','north_mapcastles_alpha.png');
ATLASES.NorthScenery=clone('Scenery','spr_north_atmos_alpha.png');
const anim=(Name,X,Y,Width,Height,Frames,extra={})=>({type:Frames?'Animation':'Sprite',X,Y,Width,Height,...(Frames?{Frames,Looping:true,RevertWhenOver:false}:{}),Name,...extra});
function unitEntries(texture){
  const e={
   Berserker:anim('Berserker',0,0,16,24),BerserkerWalkAnimation:anim('BerserkerWalk',0,0,16,24,4),BerserkerAttackAnimation:anim('BerserkerAttack',64,0,16,24,3,{Looping:false,RevertWhenOver:true}),
   Wolf:anim('Wolf',0,24,32,16),WolfWalkAnimation:anim('WolfWalk',0,24,32,16,5),WolfAttackAnimation:anim('WolfAttack',160,24,32,16,3,{Looping:false,RevertWhenOver:true}),
   FrostGiant:anim('FrostGiant',0,40,24,32),FrostGiantWalkAnimation:anim('FrostGiantWalk',0,40,24,32,4),FrostGiantAttackAnimation:anim('FrostGiantAttack',96,40,24,32,4,{Looping:false,RevertWhenOver:true}),
   RunePriest:anim('RunePriest',0,72,16,40),RunePriestWalkAnimation:anim('RunePriestWalk',0,72,16,40,4),RunePriestBlessAnimation:anim('RunePriestBless',64,72,16,40,1),
   RunePriestReturnAnimation:anim('RunePriestReturn',80,72,16,40,4),RunePriestPrayAnimation:anim('RunePriestPray',144,72,16,40,1),
   Longship:anim('Longship',0,112,48,32),LongshipWalkAnimation:anim('LongshipWalk',0,112,48,32,4)};
  for(const v of Object.values(e))v.texture=texture;return e;
}
for(const a of ['playerStandard','playerEgyptian'])Object.assign(ATLASES[a].entries,unitEntries('spr_north_blue_alpha.png'));
for(const a of ['computerMedieval','computerEgyptian'])Object.assign(ATLASES[a].entries,unitEntries('spr_north_red_alpha.png'));
// collision boxes (friendly=false orientation, like the native table)
Object.assign(UNIT_GEOMETRY,{berserker:[-8,-12,8,12],wolf:[-16,-8,16,8],giant:[-12,-16,12,16],rune:[-8,-16,8,16],longship:[-24,-16,24,16]});

const NORTH_CASTLE_IDS=castles.map(c=>c.id);
Object.assign(exports,{CONTENT,NORTH_CASTLE_IDS});
