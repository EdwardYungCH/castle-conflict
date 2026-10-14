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
const {EAST_MAP}=require("east-map");
const {UNDER_MAP}=require("under-map");

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

// ======================================================================
// Part 3 - the Eastern Realm (v2.3): 16 castles (ids 55-70), the Dojo upgrade (7), five new
//   units (ids 42-46, internal Paper Crane 47), the Eastern Castle appearance (skin 4) and two
//   hazards: element 5 = fog, element 6 = drawbridge.
CONTENT.units.push(
 {id:42,name:'Ninja',description:'Invisible until it strikes or steals',cost:25,techCost:11,internal:false,hud:[48,432]},
 {id:43,name:'Samurai',description:'Cuts through weaker units without stopping',cost:45,techCost:11,internal:false,hud:[96,432]},
 {id:44,name:'Trebuchet',description:'Hurls stones at the castle from afar',cost:65,techCost:15,internal:false,hud:[144,432]},
 {id:45,name:'Fan Dancer',description:'Blows enemy airships backwards',cost:40,techCost:11,internal:false,hud:[192,432]},
 {id:46,name:'Crane Caster',description:'Paper cranes that catch arrows and shots',cost:50,techCost:15,internal:false,hud:[240,432]},
 {id:47,name:'Paper Crane',description:'',cost:0,techCost:0,internal:true,hud:[240,432]});
CONTENT.upgrades.push({id:7,name:'Dojo',description:'Allows purchase of eastern units.',techCost:11});
CONTENT.shopPages.push({name:'Eastern Units',units:[42,43,45,46,44],upgrade:7,requires:7});
const EBG=n=>`bg_east_${n}.png`;
const EAST_CASTLES=[
 [55,'Shogun Hideo the Welcoming',240,30,6,1,1,'coast',[2,0,42,1,43],[7],[]],
 [56,'Shogun Kenji the Patient',250,25,6,1,2,'bamboo',[2,16,43,15,45,17],[7,3],[5]],
 [57,'Shogun Mariko the Tide',250,30,6,1,1,'sea',[2,0,42,6,46,13],[7,0],[6]],
 [58,'Shogun Daichi the Wall',260,20,11,1,1,'terrace',[2,16,43,44,11,14],[7,3],[6]],
 [59,'Shogun Ayame the Swift',250,20,11,1,2,'bamboo2',[2,21,42,4,45,15],[7],[5]],
 [60,'Shogun Goro the Lost',280,15,11,2,0,'river',[2,16,24,26,46,22],[7,4,2],[5,6]],
 [61,'Shogun Ryo the Hungry',280,30,11,2,1,'terrace2',[2,3,42,43,18,44],[7,2],[6]],
 [62,'Shogun Hana the Flower',290,25,11,2,1,'bamboo2',[2,16,45,13,46,12],[7,2],[5]],
 [63,'Shogun Kuro the Black',300,20,11,2,2,'volcano2',[2,16,43,38,7,5,30],[7,0,3],[5]],
 [64,'Shogun Tadashi the True',300,25,15,2,1,'plains',[2,16,44,24,26,27,42],[7,4],[6]],
 [65,'Shogun Rin the Red',310,30,15,2,1,'volcano',[2,16,43,40,33,19,5],[7,0,5],[5]],
 [66,'Shogun Jiro the Fire',310,20,15,2,2,'volcano',[2,16,38,46,42,32,6],[7,0,2],[5,6]],
 [67,'Shogun Yuki the Wise',330,35,15,2,1,'sunset',[2,16,46,12,13,18,38],[7,2,4],[6]],
 [68,'Shogun Sora the Falcon',330,25,15,2,2,'sea',[2,16,45,9,43,21,40,5],[7,3,0],[5]],
 [69,'Shogun Masaru the Stout',350,20,18,2,1,'terrace',[2,16,38,10,11,44,17,7],[7,3,0,2],[5,6]],
 [70,'Takeda the Unseen',420,30,18,2,1,'volcano2',[2,16,43,42,46,45,44,33],[7,0,2,3,4,5,6],[5,6]]];
const eastCastles=EAST_CASTLES.map(([id,name,health,gold,techReward,difficulty,treeGrowth,bg,units,upgrades,elements],i)=>({
  id,name,position:EAST_MAP.castles[id],health,gold,techReward,difficulty,treeGrowth,flipped:i%2===0,background:EBG(bg),skin:4,
  units,upgrades,allowsHeals:false,attackGround:true,attackAir:true,elements,...(id===70?{aiFrequency:.55,alwaysFog:true}:{})}));
CONTENT.maps.push({id:3,name:'Eastern Realm',image:'Map4.png',castles:eastCastles,connections:EAST_MAP.connections});
// The North's teaser ship now sails east.
CONTENT.maps[2].connections.find(c=>c.from===54&&c.to===1000).to=3;
CONTENT.version='1.85+east';
ATLASES.EastPlayer=clone('CastlePlayer','spr_east_castles_alpha.png');
ATLASES.EastEnemy=clone('CastleEnemy','spr_east_castles_alpha.png');
ATLASES.WorldMapEast=clone('WorldMap','east_mapcastles_alpha.png');
function eastEntries(texture){
  const e={
   Ninja:anim('Ninja',0,0,16,24),NinjaWalkAnimation:anim('NinjaWalk',0,0,16,24,4),NinjaCarryAnimation:anim('NinjaCarry',64,0,16,24,4),
   Samurai:anim('Samurai',0,24,16,32),SamuraiWalkAnimation:anim('SamuraiWalk',0,24,16,32,4),SamuraiAttackAnimation:anim('SamuraiAttack',64,24,16,32,3,{Looping:false,RevertWhenOver:true}),
   FanDancer:anim('FanDancer',0,56,16,40),FanDancerWalkAnimation:anim('FanDancerWalk',0,56,16,40,4),FanDancerBlessAnimation:anim('FanDancerBless',64,56,16,40,1),
   FanDancerReturnAnimation:anim('FanDancerReturn',80,56,16,40,4),FanDancerPrayAnimation:anim('FanDancerPray',144,56,16,40,1),
   CraneCaster:anim('CraneCaster',0,96,16,36),CraneCasterWalkAnimation:anim('CraneCasterWalk',0,96,16,36,4),CraneCasterAttackAnimation:anim('CraneCasterAttack',64,96,32,36,1),CraneCasterReturnAnimation:anim('CraneCasterReturn',96,96,16,36,4),
   PaperCrane:anim('PaperCrane',160,96,7,4),PaperCraneFlyAnimation:anim('PaperCraneFly',160,96,7,4,3),
   Trebuchet:anim('Trebuchet',0,136,48,32),TrebuchetWalkAnimation:anim('TrebuchetWalk',0,136,48,32,4)};
  for(const v of Object.values(e))v.texture=texture;return e;
}
for(const a of ['playerStandard','playerEgyptian'])Object.assign(ATLASES[a].entries,eastEntries('spr_east_blue_alpha.png'));
for(const a of ['computerMedieval','computerEgyptian'])Object.assign(ATLASES[a].entries,eastEntries('spr_east_red_alpha.png'));
Object.assign(UNIT_GEOMETRY,{ninja:[-8,-12,8,12],samurai:[-8,-16,8,16],trebuchet:[-24,-16,24,16],dancer:[-8,-16,8,16],caster:[-16,-18,0,18],crane:[-6,-4,6,4]});
const EAST_CASTLE_IDS=eastCastles.map(c=>c.id);

// ======================================================================
// Part 4 - the Underworld (v2.4): 16 castles (ids 71-86), the Forge upgrade (8), units 48-52
//   (internal Bat 54), the Dwarven Hold appearance (skin 5), element 7 = lava eruptions,
//   element 8 = the tunnel lane (miners, burrowers and dwarves live there).
CONTENT.units.push(
 {id:48,name:'Miner',description:'Digs ore in the tunnel (30 gold)',cost:10,techCost:6,internal:false,hud:[336,432]},
 {id:49,name:'Burrower',description:'Tunnels under the fight to bite the castle',cost:35,techCost:11,internal:false,hud:[384,432]},
 {id:50,name:'Lava Golem',description:'Leaves a pool of lava when it dies',cost:75,techCost:18,internal:false,hud:[432,432]},
 {id:51,name:'Bat Swarm',description:'Three fast bats that harass airships',cost:30,techCost:11,internal:false,hud:[0,576]},
 {id:52,name:'Dwarf Engineer',description:'Seals the tunnel, or breaks an enemy seal',cost:40,techCost:15,internal:false,hud:[48,576]},
 {id:54,name:'Bat',description:'',cost:0,techCost:0,internal:true,hud:[0,576]});
CONTENT.upgrades.push({id:8,name:'Forge',description:'Allows purchase of underworld units.',techCost:11});
CONTENT.shopPages.push({name:'Underworld Units',units:[48,49,51,52,50],upgrade:8,requires:8});
const UBG=n=>`bg_under_${n}.png`;
const UNDER_CASTLES=[
 [71,'Thane Borin the Gatekeeper',250,30,6,1,1,'cavern',[2,0,48,49,1],[8],[8]],
 [72,'Thane Dagna the Deep',260,25,6,1,2,'fungus',[2,16,48,49,17,15],[8,3],[8,7]],
 [73,'Thane Grim the Miner',260,30,6,1,1,'cavern2',[2,0,48,52,49,13],[8,2],[8]],
 [74,'Thane Hilda the Hammer',270,20,11,1,1,'lavariver',[2,16,48,49,11,14],[8,3],[8,7]],
 [75,'Thane Orik the Swift',260,15,11,1,2,'crystal',[2,21,48,51,4,15],[8,0],[8]],
 [76,'Thane Vesna the Lost',290,15,11,2,0,'deep',[2,16,24,26,49,22],[8,4,2],[8,7]],
 [77,'Thane Bram the Greedy',290,30,11,2,1,'cavern',[2,3,48,49,18,52],[8,2],[8]],
 [78,'Thane Ulla the Burning',300,25,11,2,1,'lavalake',[2,16,50,13,12,33],[8,2,0],[7]],
 [79,'Thane Kell the Black',310,20,11,2,2,'shore',[2,16,48,49,7,5,30],[8,0,3],[8,7]],
 [80,'Thane Runa the Watcher',310,25,15,2,1,'crystal',[2,16,49,52,24,26,51],[8,4,0],[8]],
 [81,'Thane Fenn the Red',320,30,15,2,1,'lavariver',[2,16,50,36,33,19,5],[8,0,5],[8,7]],
 [82,'Thane Mira the Wise',320,20,15,2,2,'forge',[2,16,48,52,39,12,13],[8,2],[8,7]],
 [83,'Thane Gorm the Stout',340,35,15,2,1,'cavern2',[2,16,38,10,11,49,17],[8,3,2],[8]],
 [84,'Thane Sif the Swarm',340,25,15,2,2,'fungus',[2,16,51,9,43,21,49,5],[8,3,0,7],[8,7]],
 [85,'Thane Hakon the Old',360,30,18,2,1,'abyss',[2,16,50,10,44,49,52,7],[8,3,0,2,7],[8,7]],
 [86,'Durgan the Deep',450,30,18,2,1,'forge',[2,16,50,49,52,51,38,43],[8,0,2,3,4,5,6,7],[8,7]]];
const underCastles=UNDER_CASTLES.map(([id,name,health,gold,techReward,difficulty,treeGrowth,bg,units,upgrades,elements],i)=>({
  id,name,position:UNDER_MAP.castles[id],health,gold,techReward,difficulty,treeGrowth,flipped:i%2===1,background:UBG(bg),skin:5,
  units,upgrades,allowsHeals:false,attackGround:true,attackAir:true,elements,...(id===86?{aiFrequency:.5}:{})}));
CONTENT.maps.push({id:4,name:'Underworld',image:'Map5.png',castles:underCastles,connections:UNDER_MAP.connections});
CONTENT.maps[3].connections.find(c=>c.from===70&&c.to===1000).to=4;
CONTENT.version='1.85+under';
ATLASES.UnderPlayer=clone('CastlePlayer','spr_under_castles_alpha.png');
ATLASES.UnderEnemy=clone('CastleEnemy','spr_under_castles_alpha.png');
ATLASES.WorldMapUnder=clone('WorldMap','under_mapcastles_alpha.png');
function underEntries(texture){
  const e={
   Miner:anim('Miner',0,0,16,24),MinerWalkAnimation:anim('MinerWalk',0,0,16,24,4),MinerCarryAnimation:anim('MinerCarry',64,0,16,24,4),
   Burrower:anim('Burrower',0,24,32,16),BurrowerWalkAnimation:anim('BurrowerWalk',0,24,32,16,5),BurrowerAttackAnimation:anim('BurrowerAttack',160,24,32,16,3,{Looping:false,RevertWhenOver:true}),
   LavaGolem:anim('LavaGolem',0,40,24,32),LavaGolemWalkAnimation:anim('LavaGolemWalk',0,40,24,32,4),LavaGolemAttackAnimation:anim('LavaGolemAttack',96,40,24,32,4,{Looping:false,RevertWhenOver:true}),
   Dwarf:anim('Dwarf',0,72,16,24),DwarfWalkAnimation:anim('DwarfWalk',0,72,16,24,4),DwarfReturnAnimation:anim('DwarfReturn',0,72,16,24,4),
   Bat:anim('Bat',64,72,24,10),BatFlyAnimation:anim('BatFly',64,72,24,10,2)};
  for(const v of Object.values(e))v.texture=texture;return e;
}
for(const a of ['playerStandard','playerEgyptian'])Object.assign(ATLASES[a].entries,underEntries('spr_under_blue_alpha.png'));
for(const a of ['computerMedieval','computerEgyptian'])Object.assign(ATLASES[a].entries,underEntries('spr_under_red_alpha.png'));
Object.assign(UNIT_GEOMETRY,{miner:[-8,-12,8,12],burrower:[-16,-8,16,8],lavaGolem:[-12,-16,12,16],bat:[-12,-5,12,5],dwarf:[-8,-12,8,12]});
const UNDER_CASTLE_IDS=underCastles.map(c=>c.id);
Object.assign(exports,{CONTENT,NORTH_CASTLE_IDS,EAST_CASTLE_IDS,UNDER_CASTLE_IDS});
