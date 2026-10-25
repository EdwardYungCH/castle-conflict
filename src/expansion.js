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
const {SKY_MAP}=require("sky-map");

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
 {id:47,name:'Paper Crane',description:'',cost:0,techCost:0,internal:true,hud:[240,432]},
 // v3.2: the canal, bamboo and five more eastern units
 {id:60,name:'Ashigaru',description:'Cheap pikeman: stops cavalry and samurai',cost:15,techCost:6,internal:false,hud:[384,576]},
 {id:61,name:'Yumi Archer',description:'Fire arrows burn light units and bamboo',cost:45,techCost:15,internal:false,hud:[432,576]},
 {id:62,name:'Tea Merchant',description:'Trades at the market for 40 gold',cost:20,techCost:8,internal:false,hud:[0,624]},
 {id:63,name:'Lantern Bearer',description:'Lights the fog and reveals ninjas',cost:30,techCost:11,internal:false,hud:[48,624]},
 {id:64,name:'Sampan',description:'Carries 2 soldiers past a broken bridge',cost:40,techCost:15,internal:false,hud:[96,624]});
CONTENT.upgrades.push({id:7,name:'Dojo',description:'Allows purchase of eastern units.',techCost:11});
CONTENT.shopPages.push({name:'Eastern Units',units:[42,43,45,46,44],upgrade:7,requires:7});
CONTENT.shopPages.push({name:'Eastern Units II',units:[62,60,61,63,64],upgrade:1000,unitReq:7,requires:7});
const EBG=n=>`bg_east_${n}.png`;
const EAST_CASTLES=[
 [55,'Shogun Hideo the Welcoming',240,30,6,1,1,'coast',[2,0,42,1,43],[7],[]],
 [56,'Shogun Kenji the Patient',250,25,6,1,2,'bamboo',[2,16,43,15,45,17],[7,3],[5]],
 [57,'Shogun Mariko the Tide',250,30,6,1,1,'sea',[2,0,42,6,46,13],[7,0],[6]],
 [58,'Shogun Daichi the Wall',260,20,11,1,1,'terrace',[2,16,43,44,11,14],[7,3],[6]],
 [59,'Shogun Ayame the Swift',250,20,11,1,2,'bamboo2',[2,21,42,4,45,15],[7],[5]],
 [60,'Shogun Goro the Lost',280,15,11,2,0,'river',[2,16,24,26,46,22,64],[7,4,2],[5,6]],
 [61,'Shogun Ryo the Hungry',280,30,11,2,1,'terrace2',[2,3,42,43,18,44,60],[7,2],[6]],
 [62,'Shogun Hana the Flower',290,25,11,2,1,'bamboo2',[62,16,45,13,46,12,61],[7,2],[5]],
 [63,'Shogun Kuro the Black',300,20,11,2,2,'volcano2',[2,16,43,38,7,5,30,60],[7,0,3],[5]],
 [64,'Shogun Tadashi the True',300,25,15,2,1,'plains',[2,16,44,24,26,27,42,64],[7,4],[6]],
 [65,'Shogun Rin the Red',310,30,15,2,1,'volcano',[2,16,43,40,33,19,5,61],[7,0,5],[5]],
 [66,'Shogun Jiro the Fire',310,20,15,2,2,'volcano',[2,16,38,46,42,32,6,63],[7,0,2],[5,6]],
 [67,'Shogun Yuki the Wise',330,35,15,2,1,'sunset',[62,16,46,12,13,18,38,61],[7,2,4],[6]],
 [68,'Shogun Sora the Falcon',330,25,15,2,2,'sea',[2,16,45,9,43,21,40,60],[7,3,0],[5]],
 [69,'Shogun Masaru the Stout',350,20,18,2,1,'terrace',[2,16,38,10,11,44,60,64],[7,3,0,2],[5,6]],
 [70,'Takeda the Unseen',420,30,18,2,1,'volcano2',[2,16,43,42,46,45,61,64],[7,0,2,3,4,5,6],[5,6]]];
const eastCastles=EAST_CASTLES.map(([id,name,health,gold,techReward,difficulty,treeGrowth,bg,units,upgrades,elements],i)=>({
  id,name,position:EAST_MAP.castles[id],health,gold,techReward,difficulty,treeGrowth,flipped:i%2===0,background:EBG(bg),skin:4,
  units,upgrades,allowsHeals:false,attackGround:true,attackAir:true,elements:[...elements,11],...(id===70?{aiFrequency:.55,alwaysFog:true}:{})}));
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
   Trebuchet:anim('Trebuchet',0,136,48,32),TrebuchetWalkAnimation:anim('TrebuchetWalk',0,136,48,32,4),
   Ashigaru:anim('Ashigaru',0,168,16,52),AshigaruWalkAnimation:anim('AshigaruWalk',0,168,16,52,4),AshigaruDefendAnimation:anim('AshigaruDefend',64,168,48,32,1),
   Yumi:anim('Yumi',112,168,16,24),YumiWalkAnimation:anim('YumiWalk',112,168,16,24,4),YumiAttackAnimation:anim('YumiAttack',176,168,16,24,3,{Looping:false,RevertWhenOver:true}),
   Sampan:anim('Sampan',224,168,32,16),SampanWalkAnimation:anim('SampanWalk',224,168,32,16,2),FireArrow:anim('FireArrow',288,168,16,8),
   Merchant:anim('Merchant',0,220,16,24),MerchantWalkAnimation:anim('MerchantWalk',0,220,16,24,4),MerchantCarryAnimation:anim('MerchantCarry',64,220,16,24,4),
   Lantern:anim('Lantern',128,220,16,40),LanternWalkAnimation:anim('LanternWalk',128,220,16,40,4),LanternBlessAnimation:anim('LanternBless',192,220,16,40,1),
   LanternReturnAnimation:anim('LanternReturn',208,220,16,40,4),LanternPrayAnimation:anim('LanternPray',272,220,16,40,1)};
  for(const v of Object.values(e))v.texture=texture;return e;
}
for(const a of ['playerStandard','playerEgyptian'])Object.assign(ATLASES[a].entries,eastEntries('spr_east_blue_alpha.png'));
for(const a of ['computerMedieval','computerEgyptian'])Object.assign(ATLASES[a].entries,eastEntries('spr_east_red_alpha.png'));
Object.assign(UNIT_GEOMETRY,{ninja:[-8,-12,8,12],samurai:[-8,-16,8,16],trebuchet:[-24,-16,24,16],dancer:[-8,-16,8,16],caster:[-16,-18,0,18],crane:[-6,-4,6,4],ashigaru:[-8,-26,8,26],yumi:[-8,-12,8,12],merchant:[-8,-12,8,12],lantern:[-8,-20,8,20],sampan:[-16,-8,16,8]});
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
 {id:54,name:'Bat',description:'',cost:0,techCost:0,internal:true,hud:[0,576]},
 // v3.3: lava tide, mushrooms and four more underworld units
 {id:65,name:'Mole Rider',description:'Fast tunnel cavalry that bites the castle',cost:45,techCost:11,internal:false,hud:[144,624]},
 {id:66,name:'Drill Cart',description:'Slow tunnel siege; drills through seals',cost:65,techCost:15,internal:false,hud:[192,624]},
 {id:67,name:'Crossbow Dwarf',description:'Shoots bolts at airships and bats',cost:45,techCost:11,internal:false,hud:[240,624]},
 {id:68,name:'Cave Shaman',description:'Conjures an ore vein in the tunnel',cost:40,techCost:11,internal:false,hud:[288,624]});
CONTENT.upgrades.push({id:8,name:'Forge',description:'Allows purchase of underworld units.',techCost:11});
CONTENT.shopPages.push({name:'Underworld Units',units:[48,49,51,52,50],upgrade:8,requires:8});
CONTENT.shopPages.push({name:'Underworld Units II',units:[68,65,67,66],upgrade:1000,unitReq:8,requires:8});
const UBG=n=>`bg_under_${n}.png`;
const UNDER_CASTLES=[
 [71,'Thane Borin the Gatekeeper',250,30,6,1,1,'cavern',[2,0,48,49,1],[8],[8]],
 [72,'Thane Dagna the Deep',260,25,6,1,2,'fungus',[2,16,48,49,17,15],[8,3],[8,7]],
 [73,'Thane Grim the Miner',260,30,6,1,1,'cavern2',[2,0,48,52,49,13],[8,2],[8]],
 [74,'Thane Hilda the Hammer',270,20,11,1,1,'lavariver',[2,16,48,49,11,14],[8,3],[8,7]],
 [75,'Thane Orik the Swift',260,15,11,1,2,'crystal',[2,21,48,51,4,15],[8,0],[8]],
 [76,'Thane Vesna the Lost',290,15,11,2,0,'deep',[2,16,24,26,49,22,65],[8,4,2],[8,7,12]],
 [77,'Thane Bram the Greedy',290,30,11,2,1,'cavern',[2,3,48,49,18,52,67],[8,2],[8,12]],
 [78,'Thane Ulla the Burning',300,25,11,2,1,'lavalake',[2,16,50,13,12,33],[8,2,0],[7]],
 [79,'Thane Kell the Black',310,20,11,2,2,'shore',[2,16,48,49,7,5,65,66],[8,0,3],[8,7,12]],
 [80,'Thane Runa the Watcher',310,25,15,2,1,'crystal',[2,16,49,52,24,26,51,67],[8,4,0],[8,12]],
 [81,'Thane Fenn the Red',320,30,15,2,1,'lavariver',[2,16,50,36,33,19,65],[8,0,5],[8,7,12]],
 [82,'Thane Mira the Wise',320,20,15,2,2,'forge',[2,16,48,52,39,12,68,67],[8,2],[8,7,12]],
 [83,'Thane Gorm the Stout',340,35,15,2,1,'cavern2',[2,16,38,10,11,49,66],[8,3,2],[8,12]],
 [84,'Thane Sif the Swarm',340,25,15,2,2,'fungus',[2,16,51,9,43,21,65,67],[8,3,0,7],[8,7,12]],
 [85,'Thane Hakon the Old',360,30,18,2,1,'abyss',[2,16,50,10,44,66,52,68],[8,3,0,2,7],[8,7,12]],
 [86,'Durgan the Deep',450,30,18,2,1,'forge',[2,16,50,65,52,51,66,67],[8,0,2,3,4,5,6,7],[8,7,12]]];
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
   MoleRider:anim('MoleRider',0,96,32,16),MoleRiderWalkAnimation:anim('MoleRiderWalk',0,96,32,16,5),MoleRiderAttackAnimation:anim('MoleRiderAttack',160,96,32,16,3,{Looping:false,RevertWhenOver:true}),
   DrillCart:anim('DrillCart',0,112,32,16),DrillCartWalkAnimation:anim('DrillCartWalk',0,112,32,16,3),DrillCartAttackAnimation:anim('DrillCartAttack',0,112,32,16,3),Bolt:anim('Bolt',96,112,16,8),
   Crossbow:anim('Crossbow',0,128,16,24),CrossbowWalkAnimation:anim('CrossbowWalk',0,128,16,24,4),CrossbowAttackAnimation:anim('CrossbowAttack',64,128,16,24,3,{Looping:false,RevertWhenOver:true}),
   Shaman:anim('Shaman',0,152,16,40),ShamanWalkAnimation:anim('ShamanWalk',0,152,16,40,4),ShamanBlessAnimation:anim('ShamanBless',64,152,16,40,1),ShamanReturnAnimation:anim('ShamanReturn',80,152,16,40,4),ShamanPrayAnimation:anim('ShamanPray',144,152,16,40,1),
   Dwarf:anim('Dwarf',0,72,16,24),DwarfWalkAnimation:anim('DwarfWalk',0,72,16,24,4),DwarfReturnAnimation:anim('DwarfReturn',0,72,16,24,4),
   Bat:anim('Bat',64,72,24,10),BatFlyAnimation:anim('BatFly',64,72,24,10,2)};
  for(const v of Object.values(e))v.texture=texture;return e;
}
for(const a of ['playerStandard','playerEgyptian'])Object.assign(ATLASES[a].entries,underEntries('spr_under_blue_alpha.png'));
for(const a of ['computerMedieval','computerEgyptian'])Object.assign(ATLASES[a].entries,underEntries('spr_under_red_alpha.png'));
Object.assign(UNIT_GEOMETRY,{miner:[-8,-12,8,12],burrower:[-16,-8,16,8],lavaGolem:[-12,-16,12,16],bat:[-12,-5,12,5],dwarf:[-8,-12,8,12],moleRider:[-16,-8,16,8],drillCart:[-16,-8,16,8],crossbow:[-8,-12,8,12],shaman:[-8,-20,8,20]});
const UNDER_CASTLE_IDS=underCastles.map(c=>c.id);

// ======================================================================
// Part 5 - the Sky Realm (v2.5, the final chapter): 16 castles (ids 87-102), the Observatory
//   upgrade (9), units 55-59, the Sky Spire appearance (skin 6), element 9 = gaps between the
//   floating islands (ground units fall unless a cloud bridge is built), element 10 = gusts of wind
//   that push every airship sideways. Seraphiel the Last (102) fields units from all six realms.
CONTENT.units.push(
 {id:55,name:'Cloud Bridge Builder',description:'Builds a cloud bridge over a gap (20 sec)',cost:20,techCost:6,internal:false,hud:[144,576]},
 {id:56,name:'Griffin Rider',description:'Flies, and dives on weak ground units below',cost:55,techCost:15,internal:false,hud:[192,576]},
 {id:57,name:'Thundercloud Mage',description:'Calls lightning down on the strongest enemy',cost:50,techCost:15,internal:false,hud:[240,576]},
 {id:58,name:'Angel Guard',description:'Hovers over gaps and returns once from death',cost:45,techCost:11,internal:false,hud:[288,576]},
 {id:59,name:'Sky Battleship',description:'Heavy bomber with a flak turret',cost:90,techCost:20,internal:false,hud:[336,576]},
 // v3.4: air lanes, drifting clouds and four more sky units
 {id:69,name:'Cloud Shepherd',description:'Flies high and shears clouds for 20 gold',cost:15,techCost:6,internal:false,hud:[336,624]},
 {id:70,name:'Sky Lancer',description:'Spears low airships passing overhead',cost:35,techCost:11,internal:false,hud:[384,624]},
 {id:71,name:'Stone Guardian',description:'Slow tank; climbs out of island gaps',cost:60,techCost:15,internal:false,hud:[432,624]},
 {id:72,name:'Harpist',description:'Nearby allies may return once from death',cost:40,techCost:15,internal:false,hud:[0,768]});
CONTENT.upgrades.push({id:9,name:'Observatory',description:'Allows purchase of sky units.',techCost:11});
CONTENT.shopPages.push({name:'Sky Units',units:[55,58,57,56,59],upgrade:9,requires:9});
CONTENT.shopPages.push({name:'Sky Units II',units:[69,70,72,71],upgrade:1000,unitReq:9,requires:9});
const SBG=n=>`bg_sky_${n}.png`;
const SKY_CASTLES=[
 [87,'Archon Lior the Gate',260,45,6,1,1,'meadow',[2,0,55,58,1],[9],[9]],
 [88,'Archon Nessa the Breeze',270,25,6,1,2,'forest',[2,16,55,58,17,15],[9,3],[10]],
 [89,'Archon Tavi the Bridge',270,45,6,1,1,'meadow2',[2,0,55,56,58,13],[9,0],[9]],
 [90,'Archon Ilan the Wall',250,15,11,1,1,'plains',[2,16,55,58,11,1],[9,3],[9,10]],
 [91,'Archon Ziva the Swift',250,10,11,1,2,'river',[2,21,55,56,4,15],[9,0],[10]],
 [92,'Archon Oren the Lost',300,30,11,2,0,'storm',[2,16,24,26,57,55,10,69],[9,4,2],[9,10]],
 [93,'Archon Dafna the Greedy',280,30,11,2,1,'meadow',[2,3,55,58,18,42],[9,2,7],[9]],
 [94,'Archon Eitan the Thunder',330,45,11,2,1,'peaks',[2,16,57,13,12,33,70,10],[9,2,0],[10]],
 [95,'Archon Mira the Black',290,12,11,2,2,'dusk',[2,16,55,58,0,5,69],[9,0,3],[9,10]],
 [96,'Archon Gil the Watcher',320,25,15,2,1,'peaks',[2,16,56,59,24,26,55,71],[9,4,0],[9]],
 [97,'Archon Rafi the Red',330,30,15,2,1,'dawn',[2,16,57,36,33,19,70],[9,0,5],[10]],
 [98,'Archon Tamar the Wise',330,20,15,2,2,'forest',[2,16,55,58,39,12,72,69],[9,2,6],[9,10]],
 [99,'Archon Boaz the Stout',320,20,15,2,1,'meadow2',[2,16,38,58,55,71],[9,3,2,8],[9]],
 [100,'Archon Shira the Storm',350,25,15,2,2,'storm',[2,16,56,9,43,21,70,69],[9,3,0,7],[9,10]],
 [101,'Archon Amos the Old',350,20,18,2,1,'night',[2,16,59,44,58,55,71,72],[9,3,0,2,7],[9,10]],
 [102,'Seraphiel the Last',600,35,25,2,1,'dawn',[2,43,38,50,58,59,70,72],[9,0,2,3,4,5,6,7,8],[9,10]]];
const skyCastles=SKY_CASTLES.map(([id,name,health,gold,techReward,difficulty,treeGrowth,bg,units,upgrades,elements],i)=>({
  id,name,position:SKY_MAP.castles[id],health,gold,techReward,difficulty,treeGrowth,flipped:i%2===0,background:SBG(bg),skin:6,
  units,upgrades,allowsHeals:false,attackGround:true,attackAir:true,elements:[...elements,13],...(id===102?{aiFrequency:.45}:{})}));
CONTENT.maps.push({id:5,name:'Sky Realm',image:'Map6.png',castles:skyCastles,connections:SKY_MAP.connections});
CONTENT.maps[4].connections.find(c=>c.from===86&&c.to===1000).to=5;
CONTENT.version='1.85+sky';
ATLASES.SkyPlayer=clone('CastlePlayer','spr_sky_castles_alpha.png');
ATLASES.SkyEnemy=clone('CastleEnemy','spr_sky_castles_alpha.png');
ATLASES.WorldMapSky=clone('WorldMap','sky_mapcastles_alpha.png');
function skyEntries(texture){
  const e={
   Bridger:anim('Bridger',0,0,16,24),BridgerWalkAnimation:anim('BridgerWalk',0,0,16,24,4),BridgerCarryAnimation:anim('BridgerCarry',64,0,16,24,4),
   Griffin:anim('Griffin',0,24,64,48),GriffinFlyAnimation:anim('GriffinFly',0,24,64,48,3),
   Thunder:anim('Thunder',0,72,16,36),ThunderWalkAnimation:anim('ThunderWalk',0,72,16,36,4),ThunderAttackAnimation:anim('ThunderAttack',64,72,32,36,1),ThunderReturnAnimation:anim('ThunderReturn',96,72,16,36,4),
   Angel:anim('Angel',0,108,24,32),AngelWalkAnimation:anim('AngelWalk',0,108,24,32,4),AngelAttackAnimation:anim('AngelAttack',96,108,24,32,3,{Looping:false,RevertWhenOver:true}),
   Battleship:anim('Battleship',0,140,64,48),BattleshipFlyAnimation:anim('BattleshipFly',0,140,64,48,2),
   Shepherd:anim('Shepherd',0,192,32,16),ShepherdFlyAnimation:anim('ShepherdFly',0,192,32,16,2),ShepherdWalkAnimation:anim('ShepherdWalk',0,192,32,16,2),ShepherdCarryAnimation:anim('ShepherdCarry',0,192,32,16,2),
   Lancer:anim('Lancer',64,192,16,52),LancerWalkAnimation:anim('LancerWalk',64,192,16,52,4),LancerAttackAnimation:anim('LancerAttack',64,192,16,52,4),
   Guardian:anim('Guardian',128,192,24,32),GuardianWalkAnimation:anim('GuardianWalk',128,192,24,32,4),GuardianAttackAnimation:anim('GuardianAttack',0,244,24,32,4,{Looping:false,RevertWhenOver:true}),
   Harpist:anim('Harpist',96,244,16,40),HarpistWalkAnimation:anim('HarpistWalk',96,244,16,40,4),HarpistBlessAnimation:anim('HarpistBless',160,244,16,40,1),HarpistReturnAnimation:anim('HarpistReturn',176,244,16,40,4),HarpistPrayAnimation:anim('HarpistPray',240,244,16,40,1)};
  for(const v of Object.values(e))v.texture=texture;
  e.BoltAnimation=anim('Bolt',0,56,24,120,3,{texture:'spr_sky_fx_alpha.png'});
  return e;
}
for(const a of ['playerStandard','playerEgyptian'])Object.assign(ATLASES[a].entries,skyEntries('spr_sky_blue_alpha.png'));
for(const a of ['computerMedieval','computerEgyptian'])Object.assign(ATLASES[a].entries,skyEntries('spr_sky_red_alpha.png'));
Object.assign(UNIT_GEOMETRY,{bridger:[-8,-12,8,12],griffin:[-24,-16,24,16],thunder:[-8,-18,8,18],angel:[-10,-16,10,16],battleship:[-32,-24,32,24],shepherd:[-16,-8,16,8],lancer:[-8,-26,8,26],guardian:[-12,-16,12,16],harpist:[-8,-20,8,20]});
const SKY_CASTLE_IDS=skyCastles.map(c=>c.id);
Object.assign(exports,{CONTENT,NORTH_CASTLE_IDS,EAST_CASTLE_IDS,UNDER_CASTLE_IDS,SKY_CASTLE_IDS});
