# Castle Conflict 1.85: campaign world map and campaign meta-progression spec

Sources: `ann.txt` (method addresses are given as `@addr`), `content.json`, `atlases.json`, video frame `f_3.png`, and `f_5.5.png`.
A render of the map according to this spec was pixel-aligned against `f_3.png`. That frame's viewport is image px (358,43), so `pos = (-358,-277)`. Castle centres, dot centres and the sprite variants all matched (castle 7 is non-flipped and matches `CastleEnemy2`; castle 8 is flipped and matches `CastleEnemy1`).

Coordinate conventions used below:
- **screen cocos** is (x,y) with the origin at bottom-left of the 480×320 screen. **canvas** is (x, 320−y).
- **map-space** is cocos coordinates inside the 960×640 map layer, with the origin at the map's bottom-left. This is what content.json `position` and `points` use.
- **image px** is (mx, 640−my), the top-left pixel coordinates in Map1.png/Map2.png.
- Sprites and menu items are anchored at the centre unless noted.

---------------------------------------------------------------------------------------------------
## 0. Scene graph and z-order

```
WorldMapScene (Scene; ivars: data=CampaignState, active(BOOL), tempSprite)
 ├─ tempSprite "travelloader.png" (240,160)                     -- only for the first 0.5 s
 ├─ WorldMapData (Layer)            z0   -- map, castles, boats, dots, touch handling
 │    ├─ Sprite MapN.png  (scale 1, position (480,320) => occupies map-space 0..960 × 0..640)
 │    └─ AtlasSpriteManager of mapSkin ("WorldMap" / "WorldMapEgypt")   (added after the map, so drawn on top)
 │          z0  ExplosionDefault anim (castle-conquered)          [addChild: => z0]
 │          z1  MapCastle sprites, fake castle, MapLink (boat)    [addChild:z:1]
 │          z2  castle upgrade overlays (Tower/Seige/MagicEngine) [addSprite:z:2.0]
 │          z10 path dots PathBlue/PathRed                        [addSprite:z:10.0]
 │          z101 tutorial Arrow                                   [addSprite:z:101.0]
 ├─ WorldMapControls (Layer)         z1
 │    ├─ Menu (pos 0,0) z2: QUIT, VS, [$], [units], [skin]
 │    └─ ShouldQuitLayer z10 (when QUIT pressed)
 ├─ YesNoLayer / MessageLayer       z5   (boat dialogs, added to scene = WorldMapData.parent)
 ├─ CastleInfoLayer                 z10
 └─ Tutorial layers                 z100 (CampaignWelcome / ShopReturn / UnitReturn / AppearanceScreenTutorial / NewMapTutorial)
```
`WorldMapScene.active` gates all map touches and all control buttons. It is set YES at load. Every popup sets it NO, and closing the popup calls `reactivate`, which sets it YES again.

## 1. WorldMapScene lifecycle  (`-[WorldMapScene initWithState:] @798e4`, `loadData: @78818`)
1. `init` adds the Sprite `travelloader.png` at (240,160) (canvas centre (240,160)). It is a 480×320 globe image with "Traveling..." text, and it covers the whole screen. Then `schedule:loadData: interval:0.5`.
2. `loadData:` fires after 0.5 s:
   - Create `WorldMapData initWithState:withOwner:scene` and add it at z0.
   - Create `WorldMapControls initWithState:withOwner:scene` and add it at z1.
   - Set `active=YES`, unschedule, remove the travelloader texture, and remove the sprite.
   - The original swaps everything in one frame, with no fade.
3. Every way into the map creates a new WorldMapScene with `Director replaceScene:` and no transition, so the 0.5 s travel screen is always shown. The callers are:
   - CampaignInfoLayer Play (an existing campaign).
   - CampaignResultLayer `done:`.
   - GameScene `quit`.
   - The Shop, UnitChange and SelectSkin `cancel:`.
   - CampaignVictoryScreen `map:`.
   - Boat travel.

`travelloader.png` is NOT in /home/claude/assets. It is at `/home/claude/ipa/Payload/MC.app/travelloader.png` (a normal 480×320 palette PNG, not CgBI-crushed, so it can be read directly).

## 2. WorldMapData init  (`@7a990`)
In this order:
1. `loader = [MapSelector dataForMap: state.currentMap]`. Map 0 gives CastleDataLoader, map 1 gives EgyptMapLoader. The loader is a cached singleton.
2. `map = Sprite(loader.mapFileName)`, which is "Map1.png" or "Map2.png". Add it, then `setScale:1`. `mapSize = contentSize*scale = 960×640`, and `map.position = mapSize/2 = (480,320)`.
3. Get the skin from `PreLoadedGraphics getMapGraphics: loader.mapSkin` ("WorldMap" uses mapcastles_alpha.png; "WorldMapEgypt" uses egypt_mapcastles_alpha.png). Add its atlasSpriteManager.
4. `loadCastleData`: `addCastle:` for every castle, then `addLink:` for every link, then `addConnection:` for every connection. All of them use loader order.
5. Set the layer position:
   - If `state.lastMapScale == 0`, which is true for a brand-new campaign: `setPosition:(0,-1000)`.
   - Otherwise: `setPosition: state.lastMapPos` and `setScale: state.lastMapScale`.
   - Then run `fixPosition`.
6. If `currentMap == 1 && !state.hasSetEgyptSkin`: run `[state setEgyptSkin]` and `schedule loadSkinTutorial: 1.0s`. See §9.
7. `switch(state.lastCastleBeat)`:
   - 0: `schedule loadGameTutorial: 2.0s` (CampaignWelcomeLayer).
   - 1: `loadShopTutorial: 1.6s` (ShopReturnLayer).
   - 19: `loadBoatTutorial: 0.8s` (NewMapTutorialLayer).
8. If `state.inactiveUnits.count > 0 && !state.hasSeenUnitScreen`: schedule `loadUnitTutorial:` for the next frame (UnitReturnLayer), and set `hasSeenUnitScreen = YES` immediately. Controls are built after this, so the units button appears on this same visit.
9. `state.lastCastleBeat = 1000`, which means "none". This value is not saved here. It reaches disk on the next `save` (QUIT, boat travel, battle result).

All tutorials are one-shots tied to the first map visit after the relevant event. Two tutorials can stack: for example the unit tutorial plus another one. Each is added at z100 and each `finished:` calls `reactivate`.

## 3. Viewport, scrolling and zoom
- The layer has contentSize 480×320 and anchor (0.5,0.5), so it scales around screen point (240,160). Mapping: `screen = pos + (1−s)·(240,160) + map·s`.
- In practice `s` is always 1, because pinch zoom is **not implemented**. The `pinching`/`lastDist` ivars are set but never used to scale. `lastMapScale` is saved as `self.scale`, which is 1 after any touch, or 0 before the first touch of a new campaign. A port can treat the scale as 1.
- `fixPosition @778f0` with s=1 clamps `pos.x` to [−480, 0] and `pos.y` to [−320, 0].
  - General form: `x ∈ [480 − 960s − (1−s)240, −(1−s)240]` and `y ∈ [320 − 640s − (1−s)160, −(1−s)160]`. If the range ends cross, the max side wins: x is clamped to `min` first, then to `max`.
- Canvas drawing with s=1 uses `vx = −pos.x` (0..480) and `vy = 320 + pos.y` (0..320):
  - Draw the map image at canvas (−vx, −vy).
  - Draw a map-space point (mx,my) at canvas `(mx − vx, (640 − my) − vy)`.
- Initial position:
  - A new campaign starts at (0,−1000), which clamps to (0,−320). That is vx=0, vy=0, the TOP-LEFT of the map. Castle 0 at map (64,566) is at canvas (64,74).
  - After that, the last saved `lastMapPos` is used.
  - The map does **not** auto-centre on a selected castle.
- Drag (`ccTouchesBegan @78a20`, `Moved @7a49c`, `Ended @79a00`). All of these return early unless `scene.active`.
  - Began: `dragging = (touches.count==1)` and `pinching = (count==2)`. If dragging, set `lastPos = touchGL` and `dragDistance = 0`. If pinching, set `lastDist = 0`.
  - Moved (only while `dragging`):
    - If `count==2`, cancel the drag: set dragging=0 and pinching=1.
    - Otherwise: `d = touch − lastPos`; `pos += d` (float); `dragDistance += |int(d.x)| + |int(d.y)|` (truncated per event); `lastPos = touch`; `fixPosition`.
  - Ended:
    - If `dragging && dragDistance >= 10`, it is a drag, not a tap: skip the tap handling.
    - If `pinching`, skip the tap handling.
    - Otherwise run the tap test (§5).
    - Unless a castle was tapped, which returns early, save `state.lastMapPos = pos` and `state.lastMapScale = scale`, and clear the dragging and pinching flags.
  - There is no inertia and no edge bounce. The map follows the finger 1:1.
- Map-space tap point: `m = touch/scale − (pos + (1−s)(240,160))`, which is `touch − pos` at s=1.

## 4. Map objects

### 4.1 Castles  (`addCastle: @78d0c`, `MapCastle initWithSkin:withState:withData: @89ba0`)
- **State**:
  - 0 = owned (`ownsCastle`).
  - 1 = attackable (`pathExistsToCastle`).
  - 2 = inactive (anything else).
- **Prefix**: 0 is "CastleOwned" (blue), 1 is "CastleEnemy" (red), 2 is "CastleInactive" (yellow/sand).
- **Variant digit**: `flipped ? 1 : 2`. "1" and "2" are two hand-drawn orientations of the same castle (they are not exact mirrors and not animation frames). Name = `prefix + digit`, for example "CastleEnemy2". The sprite is 80×80, anchored at the centre, at `castle.position` (content.json). Most of the castle body sits up and right of centre, with the shadow at the bottom-left.
- `Castle*Selected1/2` exist in the atlas but **no code uses them**. There is no selected highlight.
- In the Egypt map the same names use egypt_mapcastles_alpha.png (pyramids, plus temple frames for castles 25,26,27,35,36, which have a temple skin).
- Hit box: `setCollision: min=−size/2, max=+size/2`, which gives the 80×80 box [x−40, x+40]×[y−40, y+40] (inclusive) in map-space (`PhysicalObject pointWithin: @9edc`).
- Added to the atlas manager at z1, in loader order. Later castles draw on top.
- **Upgrade overlays**: one per entry of `castle.startData.upgrades` (content.json `upgrades`), in that order. Each uses `addSprite:<name><variant> z:2`, also 80×80 at the castle position. `MapCastle setPosition:` moves the overlays with the castle.

  | upgrade id | name | overlay |
  |-|-|-|
  | 0 | Tower | `Tower%d` (static) |
  | 1 | Docks | none |
  | 2 | Magic Engine | `MagicEngine%d`, animated with `MagicEngine%dAnimation` (2 frames, 0.15 s each, looping) |
  | 3 | Battlements | `Seige%d` (static) |
  | 4 | Temple | `MagicEngine%d`, animated as for id 2 |
  | 5 | Solar | `Tower%d` (static) |

  Overlays are drawn on every castle, whether owned, enemy or inactive. Duplicate entries are drawn twice in the same place.
- **Castle conquered effect** (`addCastleExplosion: @7904c`, `explodeCastle: @78edc`): done in `addCastle` if `castleId == state.lastCastleBeat`.
  1. A *fake* `MapCastle(state=1)` (red "CastleEnemy%d" plus its own overlays) is added at the same position at z1, above the real owned castle.
  2. After **1.0 s**: a SinglePlayAnimation "ExplosionDefault" (5 frames of 48×48 at atlas (0,464) step 48, **0.05 s/frame**, plays once and removes itself) is added at the castle position with plain `addChild:` (z0). Then `explosion.wav` plays and the fake castle and its overlays are removed.
  3. The blue castle is revealed. Because the explosion is at z0, it is drawn *under* the z1 castle sprite, as in the original. In a port, draw it below the castle sprites (GUESS that this is intended. It is faithful to the code).
  - `f_3.png` shows this moment: castle 8 still shows the red fake while the 9→8 path is already blue.

### 4.2 Connections and path dots  (`addConnection: @77a38`, `MapConnection addPathNodesToSkin:owned:animate:reverse: @8a220`)
Each connection has `castleId1` (content `from`), `castleId2` (content `to`), `points` (map-space dot centres), `linksToAnotherMap` (content `mapLink`; then castleId2 = the target map index or 1000), and `startPosition`. `startPosition` is true only for the Egypt connection 20→0. It is not in content.json; add it.

```
own1 = ownsCastle(c1)
own2 = linksToAnotherMap ? (startPosition || pathExistsToLink(c2)) : ownsCastle(c2)
if (own1 && own2)  draw(owned=YES /*blue*/, animate=NO, reverse=NO)
if (own1 || own2) and (own1 != own2 || linksToAnotherMap):
    animate = (c1 == lastCastleBeat || c2 == lastCastleBeat)
    draw(owned=linksToAnotherMap /*map links always blue, others red*/, animate, reverse=own2)
```
The resulting colours:
- Both ends owned: blue.
- Exactly one end owned: red. The red path grows outward from the owned end.
- Neither end owned: no dots at all.
- Map links: blue once reachable. Links are drawn twice when both ends qualify, once static and once possibly animated on top.

`draw`:
- If `!animate`: for each point, `addSprite:(owned?"PathBlue":"PathRed") z:10` at that point. This is the static last frame, a 16×16 cell with a 10 px dot.
- If `animate`: the points are iterated from first to last, or from last to first if `reverse`. A Sequence is built: `Delay(0.2) → CreateDotsAction(p0) → Delay(0.2) → CreateDotsAction(p1) → …`, run on the skin's atlas manager.
  - Dot k therefore appears at **t = 0.2·(k+1) s** after the map loads (after the travelloader).
  - `CreateDotsAction startWithTarget: @91614` adds the sprite at z10 and runs `Path{Blue|Red}Animation`: 7 frames of 16×16 at atlas x=0..96 step 16 (y=240 red, y=256 blue), **0.05 s/frame**, not looping, ending on the last frame. The dot diameters per frame are 4, 8, 10, 14, 16, 14, 10 px, which gives a "pop".
  - Several animated connections run concurrently.
- The dot spacing is exactly the authored `points`. There is no interpolation.

### 4.3 Reachability
- `pathExistsToCastle(id) @79664`: true if any connection satisfies one of these:
  - a link with `startPosition` and `castleId1==id`;
  - a non-link with `castleId2==id` and owns(castleId1);
  - a non-link with `castleId1==id` and owns(castleId2).
- `pathExistsToLink(target) @79460`: true if any link connection has `castleId2==target` and (`startPosition` or owns(castleId1)).
- Castle 0 is never "reachable". It becomes owned by winning the forced first battle (§11).

### 4.4 Boats / map links  (`addLink: @78bc4`, `MapLink initWithSkin:available:withData: @c1cc4`)
`MapLinkData(point, targetMap, newCameraPoint)`. The 'available' argument is ignored. The boat is always drawn and always animated.

| map | point (map-space) | image px | target | newCameraPoint | dialog |
|-|-|-|-|-|-|
| 0 Medieval | (518,46) | (518,594) | 1 (Egypt) | (80,555) | "Travel to Egypt?" when owns(19) |
| 1 Egypt | (80,555) | (80,85) | 0 (Homeland) | (528,46) | always allowed (start-position link) |
| 1 Egypt | (903,165) | (903,475) | 1000 | (528,46) | "Nothing here yet..." |

The sprite is "Boat", 64×64 at atlas (368,0), anchored at the centre, z1. It runs `BoatAnimation`: 4 frames stacked vertically (y = 0, 64, 128, 192), **0.1 s/frame**, looping. Its hit box is ±32 (64×64).

### 4.5 Arrow
`addArrowAt:(screenPt) @7a8a4` converts the point to map-space (`pt − pos`) and adds "Arrow" at z101. It runs `ArrowAnimation`: 8 frames of 32×32 at atlas (0,272) step 32, 0.1 s/frame, looping. The arrow points right. It is used only by the tutorials (§9).

## 5. Tapping  (`ccTouchesEnded @79a00`; taps only when the drag distance is < 10)
1. **Castles**, in array order:
   - Stop at the first castle where `pointWithin(m)` **and** (`ownsCastle(id)` or `pathExistsToCastle(id)`). Tapping an inactive castle does nothing (no sound).
   - On a hit:
     - Play `select.wav`.
     - Build `BattleParams(state, castle.data, GameSettings.loadSettings, gameMode=1, loader.scenerySkin, loader.foregroundSkin)`.
     - Add `CastleInfoLayer` (§6) to the scene at z10 and set `scene.active=NO`.
     - Return. The map position is not saved on this path.
2. **Boats**, if no castle consumed the tap: play `select.wav`, then:
   - `targetMap == 1000`: YesNoLayer with header "Nothing here yet..." and message "Would you be interested in playing more campaigns?". Yes calls `wantMoreMaps:` and No calls `dontWantMoreMaps:`. Both only log an analytics beacon ("WantMoreCampaign"/"DontWantMoreCampaign") and `reactivate`. Added at z5 with `active=NO`.
   - Else if `pathExistsToLink(target)`: YesNoLayer with header `"Travel to %@?"` (`Defaults getNameForCampaign:` gives 0 = "The Homeland", 1 = "Egypt") and message from `getDescriptionForCampaign:` (0 = "A land of conflicting castles", 1 = "The land of desert and fertility"). Yes calls `selectCampaignMap:` and No calls `reactivate`. `userData` = the link. Added at z5 with `active=NO`.
   - Else: MessageLayer with header "Fight your way to this ship!", message "Travel to new lands!" and selector `reactivate`, at z5. The code does *not* set active=NO here (the modal layer swallows touches anyway).
3. `selectCampaignMap: @7a6b8`:
   - `state.currentMap = target`.
   - `state.lastMapPos = (240 − cam.x, 160 − cam.y)`, using the link's `newCameraPoint`.
   - `state.save`, release the skin, and `replaceScene: [WorldMapScene initWithState:]`. The travelloader screen appears, then the new map with fixPosition clamping.
   - Results: the Egypt arrival clamps to (0,−320), the top-left of Map2. The Homeland return clamps to (−288,0), showing map x 288..768 and y 0..320 with the boat at canvas (230,274).

## 6. CastleInfoLayer (castle popup)  (`initWithBattleParams:owner: @7af64`)
All children use screen coordinates.

| element | cocos (x,y) | canvas | details |
|-|-|-|-|
| `help_banner.png` (480×96 purple banner with gold fringe; a plain image, not from sprites_banners) | (240,165) | (240,155); spans canvas y 107..203 | z0 |
| Title | (240,195) | (240,125) | whiteText (sprites_font_alpha.png, 16×20 cells, MenuItemAtlasFont, centred). The text is the castle name, or **"You own this castle"** if owned |
| Leaf icon | (174,175) | (174,145) | MenuItemAtlasImage from `sprites_conhud_alpha.png` rect (96,16,16,16). Not in a Menu, so it is inert |
| Tree word | x = 180 + w/2, y=175 | left edge 180, canvas y 145 | tinyWhiteText (tinyfont_white_alpha.png, 8×10 cells). `descriptionForTreeGrowth`: 0 "Sparse", 1 "Average", 2 "Fertile", else " " |
| Sword icon | (270,175) | (270,145) | conhud rect (112,16,16,16) |
| Difficulty word | x = 240 + w/2 + 50 | left edge 290, canvas y 145 | tinyWhite. 0 "Novice", 1 "Experienced", 2 "Veteran", 3 "Warlord", else "" |
| Gameplay-element icons | x = 154 − 20·i, y=175 | canvas y 145 | For each `levelElements` entry. Element 1: conhud (192,176,16,16). Element 2: AnimatedAntlionBadge, toggling every 0.5 s between conhud (176,176,16,16) and (160,176,16,16). Other values: none. z5. These sit left of the leaf only when the castle has elements (Egypt castles 28–37) |
| Enemy unit icons | x = (int)(240 − 18·(N−1)) + 36·i, y=145 | canvas y 175 | For each id in `castle.startData.units` (all N, including the Wood Cutter), in order. Each is `Defaults getButtonForUnit:id fromAtlas: castle.startData.playerSkin.right.buttonTexture`, the 48×48 HUD button (content.json `hud` offset), scaled **0.75** (36 px). Atlases: medieval castles use `sprites_redhud_big_alpha.png`; Egyptian/temple castles use `sprites_egypt_redhud_big_alpha.png`. Inert (nil target) |
| Menu (240,160) | | | Items below |
| — ATTACK!/Replay | (+80,−60) → (320,100) | (320,220) | `sprites_buttons_alpha.png`. Not owned: normal (192,384,96,48) "ATTACK!" and selected (288,384,96,48). Owned: normal (384,192,96,48) **"Replay"** and selected (384,240,96,48). Calls `play:` |
| — Back | (−80,−60) → (160,100) | (160,220) | normal (96,48,96,48) and selected (288,48,96,48). Calls `cancel:` |

- There is no background dimming (no fadeLayer). The map stays visible above and below the banner.
- Example: 7 units → x = 132..348, which matches `f_5.5.png`.
- `play:`: `select.wav`, then `replaceScene: CampaignLoadingLevelScene(battleParams, mimicHome:NO, withTower:NO)` (§10). Owned castles can be replayed for half the tech (§11).
- `cancel:`: `select.wav`, then `owner.reactivate` (scene.active=YES) and remove the layer.
- Unreachable castles never open the popup.

## 7. Shared dialogs used on the map
**YesNoLayer** (`@b2448`):
- `Defaults.fadeLayer` (ColorLayer black, alpha 100/255, full screen).
- `bannerSprite` = help_banner.png at (240,165).
- Header whiteText at (240,190), canvas y 130, if not empty.
- Message tinyWhite at (240,160), canvas y 160, if not empty.
- The Menu is at (240,0).
- YES is at (−60,120), which is screen (180,120) and canvas (180,200): normal (96,96,96,48) and selected (288,96,96,48).
- NO is at (+60,120), which is screen (300,120) and canvas (300,200): normal (96,144,96,48) and selected (288,144,96,48).
- Each button plays `select.wav`, calls `target performSelector`, and removes the layer.

**MessageLayer** (`@c40a8`):
- Same fade, banner, header and message.
- One button, normal (96,48,96,48) "Back" and selected (288,48,96,48).
- The menu is at (240,0) with the item at (0,120), which is screen (240,120) (GUESS by analogy; the setPosition was not decoded).
- `back:` runs `select.wav`, then the selector, then removes the layer.

## 8. WorldMapControls  (`initWithState:withOwner: @7ba24`)
The Menu is at (0,0), z2. Every action checks `scene.active` first, then plays `select.wav`.

| button | condition | atlas / normal / selected (48×48) | cocos | canvas | action |
|-|-|-|-|-|-|
| QUIT | always | conhud (192,32) / (192,80) | (52,25) | (52,295) | `askQuit:` |
| VS (multiplayer) | always | conhud (144,128) / (192,128) | (428,280) | (428,40) | `askMultiplay:` (see the note below) |
| $ shop | `ownsCastle(1)` | mapcastles (320,48) / (320,144) | (444,36) | (444,284) | `replaceScene: ShopScene initWithState:` |
| Barracks (unit swap) | `hasSeenUnitScreen` | mapcastles (320,0) / (320,96) | (384,36) | (384,284) | `replaceScene: UnitChangeScene initWithState:` |
| Appearance | `hasSetEgyptSkin` | mapcastles (320,192) / (320,240) | (444,96) | (444,224) | `replaceScene: SelectSkinScene initWithState:` |

- The mapcastles rects come from `mapcastles_alpha.png`, the medieval atlas, even on the Egypt map.
- `askQuit:` adds `ShouldQuitLayer initWithOwner:self saveMessage:"(You will be taken to the menu)"` to the controls at z10 and sets `scene.active=NO`. The layer contains:
  - fadeLayer;
  - help_banner at (240,130);
  - "Really Quit?" whiteText at (240,150);
  - the save message, tinyWhite at (240,120);
  - YES (96,96)/(288,96) at (165,85), canvas (165,235), which calls `quit`;
  - NO (96,144)/(288,144) at (315,85), canvas (315,235), which calls `cancelQuit` (active=YES).
- `quit @7816c`: `state.save`, end the "PlayCampaign" beacon, then `replaceScene: MenuScene` (main menu).
- `askMultiplay:` opens a YesNoLayer with "Multiplayer" / "Go to multiplayer lobby with your army?". Yes goes to `MultiplayLobbyScene initWithCampaignState:`.
  - NOTE: the VS button is in the 1.85 binary, but the gameplay video (an older build) shows no VS button. Hide it if multiplayer is not ported.

## 9. Tutorial layers
All of them subclass TutorialLayer (`init @8fb9c`): `fadeLayer` z0 (black α100) plus help_banner.png at **(240,160)** z1 (canvas y 112..208). Texts are added at z2. Every tutorial has one "Continue" button: sprites_buttons normal (0,48,96,48) and selected (192,48,96,48), in a Menu at (240,160) with the item at (0,−60), which is screen (240,100) and canvas (240,220). `finished:` removes the layer (and the arrow, if any) and calls the owner's `reactivate`.

| layer | trigger (§2) | line 1 (whiteText) | line 2 | arrow (screen cocos → canvas) | sound on Continue |
|-|-|-|-|-|-|
| CampaignWelcomeLayer | lastCastleBeat==0 (first map visit after winning castle 0), at +2.0 s | "Welcome to campaign mode!" (240,190) | tinyWhite "Touch a castle on the map to attack it." (240,160) and tinyWhite "Conquer all red castles to win!" (240,140) | — | select.wav |
| ShopReturnLayer | lastCastleBeat==1, +1.6 s (after the forced shop visit) | "Touch this button anytime" (240,175) | **whiteText** "to return to the shop." (240,145) | (402,36) → (402,284), pointing at $ | none |
| UnitReturnLayer | inactiveUnits nonempty and the unit screen not yet seen, next frame | "Touch this button anytime" (240,175) | whiteText "to return to the barracks." (240,145) | (352,36) → (352,284), pointing at the Barracks button | select.wav |
| AppearanceScreenTutorialLayer | first entry to Egypt, +1.0 s | "New appearance unlocked!" (240,175) | tinyWhite "Touch here to change your appearance" (240,145) | (402,96) → (402,224), pointing at the Appearance button | none |
| NewMapTutorialLayer | lastCastleBeat==19, +0.8 s | "New map available!" (240,175) | tinyWhite "Touch the ship to travel" (240,145) | — | none |

Canvas y values: 190→130, 175→145, 160→160, 145→175, 140→180.

## 10. CampaignLoadingLevelScene  (`@c6734`, layer `@c693c`, `load: @c6284`)
- From the map (mimicHome NO): the bg is `campaignLoading.png` at (240,160). This full screen shows a sword in a map with "Gather thy wits, general!". No extra text is drawn.
- From a new campaign (mimicHome YES): the bg is `bg_grass.png` plus `FauxGameLayout initWithTowers:` (z1, a fake battle layout). The layer adds `bannerSprite` (help_banner at (240,165)) with whiteText "Loading Battle..." at banner-local (240,48), which is screen (240,165).
- `load:` runs every 0.1 s:
  - Steps 0–8 preload textures: player unit skin, enemy castle skin, enemy button texture, scenery and foreground skins.
  - The last step creates `GameMode initWithBattleParams:`.
  - With a banner: run FadeOut 0.75 s on the banner and the text, then call `goToGameScene` after 0.75 s. Without one: call it immediately (`replaceScene`).
- The total is about 0.9 s from the map.

## 11. CampaignState  (all of its logic)
Fields and save keys (NSKeyedArchiver under "kCampaignKey" in `FilePaths campaignFileForId:`):

| field | key | type / meaning |
|-|-|-|
| inactiveUnits | kInactiveUnitsKey | NSMutableArray<int>, units beyond the 8 active slots |
| ownedCastles | kOwnedCastlesKey | 39 BOOLs, indexed by castle id 0..38 |
| techPoints | kTechPointsKey | int |
| lastCastleBeat | kLastCastleKey | int; 1000 = none |
| hasSeenUnitScreen | kHasSeenUnitScreenKey | BOOL |
| campaignId | kCampaignIdKey | slot number ("Campaign %d") |
| version | kVersionKey | 1. Version 0 saves migrate upgradesAvailable to [0,2] |
| startData | kStartDataKey | PlayerStartData: units (active list, max 8), upgrades (owned building ids), startHealth, playerSkin |
| lastMapPos | kMapPosXKey / kMapPosYKey | layer position (floats) |
| lastMapScale | kMapScaleKey | float; 0 means "never set" |
| numBattles | kBattlesKey | int |
| numVictories | kVictoriesKey | int |
| currentMap | kCurrentMapKey | 0 Medieval, 1 Egypt |
| upgradesAvailable | kUpgradesAvailableKey | buildings that may be bought in the shop |
| hasSetEgyptSkin | kHasSeenEgyptKey | BOOL |
| unlockedSkins | kUnlockedSkinsKey | ints: 0 Medieval, 1 Egyptian Pyramid, 2 Egyptian Temple |

**New campaign** (`initWithId: @74e54`):
- `startData.units = [2 Wood Cutter, 0 Foot Soldier, 1 Heavy Soldier]` and `startData.startHealth = 80`.
- `playerSkin = "MedievalSkin"`.
- `upgrades=[]`.
- `techPoints = 0` and `lastCastleBeat = 1000`.
- `hasSeenUnitScreen = NO`.
- All 39 castles unowned.
- `inactiveUnits=[]`, `lastMapScale=0`, `currentMap=0`.
- **`upgradesAvailable=[3]`**: Battlements are available from the start.
- `unlockedSkins=[0]`.

Methods:
- `ownsCastle(i)` = `ownedCastles[i]`. `winCastle(i)` sets it to YES. `numCastlesOwned` counts the YES entries.
- `addUnit(u)`: if `startData.units.count >= 8`, append to inactiveUnits and return NO. Otherwise append to units and return YES.
- `hasUnit(u)`: u is in units or in inactiveUnits.
- `hasUpgrade(u)`: u is in startData.upgrades (bought).
- `hasUpgradeAvailable(u)` and `canPurchaseUpgrade(u)` are identical: u is in upgradesAvailable.
- `hasSkin(n)`: n is in unlockedSkins.
- `setEgyptSkin`:
  - Add 1 to unlockedSkins.
  - Set `startData.playerSkin` to the Egyptian (pyramid) skin. The player is switched automatically on first arrival.
  - Set `hasSetEgyptSkin=YES`.
- `ownAllCastlesAfterWinning(id)`: returns true when every castle of the current realm except `id` is owned. Map 0 covers castles 0..19 and map 1 covers 20..38.
- `conqueredAllRealms`: castles 0..**37** are owned (the loop stops before 38; this is the original's quirk).
- The player's castle health is `startData.startHealth`: 80 at the start, +30 for each "castle health" shop purchase (purchaseId 100, `ShopLayer buyUpgradeWithId:`).
- Persistence calls `save` in these places:
  - QUIT;
  - boat travel;
  - the end of every CampaignResultLayer;
  - shop/unit purchases (see shop.md).
- `lastMapPos` and `lastMapScale` are updated on every non-castle tap or drag end, and by boat travel.

## 12. Flow, and win/loss state changes  (CampaignResultLayer `initWithBattleParams:victory:achievements: @812e8`; its UI is in results.md)
- **Start of a campaign** (CampaignInfoLayer Play, `@75f20`):
  - If `!ownsCastle(0)`: build BattleParams(state, castle 0 of CastleDataLoader, settings, gameMode 1, "Scenery", "EgyptianForeground") and go to `CampaignLoadingLevelScene(mimicHome:YES, withTower:NO)`. The forced first battle is against "Lord First the Level", and GameScene shows its PreGameHintLayer while castle 0 is unowned.
  - Otherwise go to WorldMapScene.
- After every battle: `numBattles++`.
- **Win**:
  - `numVictories++`.
  - `goToGameOverScreen = !ownsCastle(id) && ownAllCastlesAfterWinning(id)`, which means the realm has just been completed.
  - `tp = castle.techPointValue` (content `techReward`) plus the achievement tech (see results.md). If the castle was **already owned** (a Replay): `tp /= 2` (integer). Then `techPoints += tp`.
  - If not previously owned:
    - `winCastle(id)` and `lastCastleBeat = id`.
    - Skin: if `id ∈ {25,27,35,36}` (mask 0xc05) and `!hasSkin(1)`, add skin 2 and show "New appearance unlocked!"/"It can be selected in the appearance screen". `hasSkin` checks exact membership, and skin 1 is always granted on the first Egypt visit (§2), so in practice this never fires. Keep the code as written.
    - For each `u` in `castle.startData.upgrades` with `!hasUpgradeAvailable(u)`: add it to upgradesAvailable and show MessageLayer **"New units unlocked!"** / "They can be bought from the shop". The skin message is suppressed if both apply.
    - Units are *not* granted directly. They are bought in the shop with tech points (shop pages are gated by `upgrade`/`requires`).
- **Loss**: no state change besides `numBattles`. If `numCastlesOwned==0` (the first battle was lost), the results screen drops one of its buttons (see results.md).
- **Result `done:`**:
  - `goToGameOverScreen` → `CampaignVictoryScreen` ("You have conquered the realm!"). Its `map:` returns to the WorldMapScene.
  - Else `lastCastleBeat==1` → `ShopScene initWithState:showTutorial:YES`, whose cancel returns to the map, which then shows the ShopReturnLayer.
  - Else → WorldMapScene, which shows the explosion and dot animations for `lastCastleBeat` and any tutorial.
- **GameScene quit** in campaign mode:
  - If `!ownsCastle(0)`: go to MenuScene and **delete the campaign file**.
  - Otherwise go to Shop if lastCastleBeat==1, else to the WorldMap.
- **Realm links**:
  - Medieval → Egypt needs castle 19 owned. The boat at (518,46) is visible from the start, but tapping it before then shows "Fight your way to this ship!".
  - Egypt start: castle 20 is attackable at once through the start-position link. Egypt → Homeland is always allowed.
  - The Egypt boat at (903,165) leads to "Nothing here yet...".

## 13. What CampaignState and the castle feed into the battle
`BattleParams` is a plain container: campaignState, castleData (MapCastleData), settings, gameMode (1 = campaign), scenerySkin, foregroundSkin. `GameScene loadCampaign @1b22c` and `initWithBattleParams: @1cbd8` read these values:

| source | effect |
|-|-|
| `castle.treeGrowthRate` | 0 Sparse: chanceOfTree 170, treeRatio 1, maxTrees 5. 1 Average: 130, 1, 10. 2 Fertile: 90, 1, 12 |
| `castle.enemyDifficulty` | aiFrequency: 0 → 3.0 s, 1 → 2.0 s, 2 → 0.75 s, 3 → left at its default (unused by any castle) |
| `castle.startGold` (content `gold`) | `startGold`, given to **both** players (`setGold`) |
| `castle.startData.startHealth` (content `health`) | enemy castle max HP and current HP |
| `campaignState.startData.startHealth` | player castle max HP and current HP (80 + 30·n) |
| `castle.allowsHeals` | schedules `randomlyGenerateHealPickup:` every 1 s (false for all castles) |
| `castle.startData.units` | enemy unit roster (enemyUnitInfo) |
| `castle.startData.upgrades` | enemy buildings, also drawn as map overlays |
| `castle.startData.playerSkin` | enemy skin: MedievalSkin (castles 0–19), EgyptianSkin, or EgyptianTempleSkin (25, 26, 27, 35, 36) |
| `castle.levelElements` | `loadGameElements` (1 and 2 = Egypt gameplay elements, see the battle specs) |
| `castle.levelSceneryInfo.backgroundImage` (content `background`) | battle background |
| `campaignState.startData` (units, upgrades, playerSkin) | the player's army and HUD |

`attackGround`/`attackAir`/`attackNaval` are set by the loaders but never read.

## 14. CampaignInfoLayer (campaign-slot screen, not the map)  (`initWithCampaignState:owner: @76970`)
Shown by `SelectCampaignLayer startGame:` when a slot is tapped. The slot loads the file if it exists, otherwise it creates `CampaignState initWithId:tag`.
- help_banner.png at (240,165).
- If `ownsCastle(0)`, meaning the campaign has started:
  - whiteText "Campaign %d" (campaignId) at (240,195), canvas 125.
  - tinyWhite "Tech Points: %d" left-aligned at x=20 (x = 20 + w/2, y=175, canvas 145).
  - tinyWhite "Castles Conquered: %d/%d" (numCastlesOwned / (hasSetEgyptSkin ? 39 : 20)) right-aligned to x=460, y=175.
- Otherwise: whiteText "New Game" at (240,195).
- The player's units `startData.units` use the same layout as §6 (x = 240 − 18(N−1) + 36i, y=145, scale 0.75), from `playerSkin.left.buttonTexture` (blue HUD).
- The Menu is at (240,160):
  - Play!: normal (192,192,96,48), selected (288,192,96,48).
  - Back: normal (96,48), selected (288,48).
  - If started, Delete: normal (384,384,96,48), selected (384,432,96,48).
- Positions when started: Play at (+120,−60) → (360,100), Delete at (0,−60) → (240,100), Back at (−120,−60) → (120,100).
- Positions otherwise: Play at (+80,−60) → (320,100), Back at (−80,−60) → (160,100).
- Play behaviour is in §12. Delete opens a DeleteConfirmLayer (not covered here).

## 15. Data tables
### 15.1 Castles
`var` is the sprite digit (1 = flipped). Map-space is cocos; image px is (x, 640−y). Medieval uses Map1/WorldMap; Egypt uses Map2/WorldMapEgypt.

| id | name | map pos | image px | var | overlays (in order) | tree | diff | gold | tech | hp | units | elements |
|-|-|-|-|-|-|-|-|-|-|-|-|-|
|0|Lord First the Level|(64,566)|(64,74)|2|-|Average|Novice|50|2|40|2 0 1|-|
|1|Lord Robin the Weak|(141,461)|(141,179)|1|-|Average|Novice|50|4|45|2 0 1 21|-|
|2|Lord Humberside the Rich|(144,336)|(144,304)|2|-|Fertile|Novice|40|6|50|2 0 1 3 4|-|
|3|Lord Ironhelm the Guarded|(225,200)|(225,440)|2|Seige2|Average|Novice|40|6|55|2 0 1 14 11|-|
|4|Lord Breton the Shrewd|(359,311)|(359,329)|1|-|Fertile|Novice|35|6|70|2 0 16 4 9|-|
|5|Lady Soren the Strong|(360,425)|(360,215)|1|Seige1|Average|Novice|40|6|70|2 0 21 10 14 15|-|
|6|Lady Aria the Winged|(251,524)|(251,116)|2|Tower2|Sparse|Novice|25|6|80|2 0 1 9 3 6 20|-|
|7|Lord Bradford the Brave|(541,435)|(541,205)|2|Tower2|Average|Experienced|30|11|120|2 21 16 1 20 6 19|-|
|8|Lady Yonge the Wise|(726,487)|(726,153)|1|Seige1|Sparse|Experienced|25|11|100|2 3 0 10 14 15 11|-|
|9|Lady Hezlet the Trickster|(523,583)|(523,57)|2|MagicEngine2|Average|Experienced|30|11|90|2 0 3 16 17 22|-|
|10|Lady Gaskell the Proud|(688,362)|(688,278)|2|Tower2|Fertile|Experienced|40|11|130|2 0 4 16 9 20 7 6|-|
|11|Lord Ashton the Clever|(855,330)|(855,310)|2|MagicEngine2|Fertile|Experienced|45|11|110|2 0 16 17 22 13 18|-|
|12|Lord Fleming the Strange|(583,271)|(583,369)|1|MagicEngine1|Average|Experienced|50|11|150|2 0 16 12 17 13 22|-|
|13|Lady Vier the Fierce|(488,213)|(488,427)|1|Seige1,Tower1|Average|Veteran|50|15|190|2 21 5 6 23 14 11 15|-|
|14|Lord Bafford the Large|(747,270)|(747,370)|1|Seige1,MagicEngine1|Sparse|Experienced|35|11|170|2 16 3 21 17 10 13 14|-|
|15|Lord Corto the Mad|(873,177)|(873,463)|1|MagicEngine1,Tower1|Sparse|Veteran|45|15|210|2 0 16 22 12 6 23 17|-|
|16|Lord Owyn the Mystical|(425,124)|(425,516)|2|Seige2,MagicEngine2|Average|Veteran|50|15|230|2 14 21 17 3 18 11 12|-|
|17|Lord Kelton the Strong|(602,122)|(602,518)|1|MagicEngine1,Tower1|Sparse|Veteran|25|15|270|2 16 3 20 7 12 17 13|-|
|18|Lord Thray the Angry|(777,77)|(777,563)|2|Seige2,Tower2|Fertile|Veteran|40|15|250|2 16 9 20 7 14 11 10|-|
|19|Lord Halford the Great|(628,46)|(628,594)|2|Seige2,MagicEngine2,Tower2|Average|Veteran|40|18|300|2 16 9 10 19 17 7 12|-|
|20|Qa'a the Fearful|(170,508)|(170,132)|1|MagicEngine1|Average|Experienced|25|6|140|2 1 24 28|-|
|21|Reneb the Sly|(91,408)|(91,232)|1|Seige1,MagicEngine1,MagicEngine1|Average|Experienced|5|6|160|2 24 27 13 18 5 10|-|
|22|Den the Imperious|(198,323)|(198,317)|1|MagicEngine1,Tower1|Average|Experienced|50|6|170|2 0 28 26 6 4 7|-|
|23|Sekhemkhet the Third|(259,438)|(259,202)|1|MagicEngine1,MagicEngine1|Fertile|Experienced|15|6|150|2 3 0 26 24 12 13|-|
|24|Snefru the Able|(324,376)|(324,264)|1|MagicEngine1,Tower1,Tower1,MagicEngine1|Average|Experienced|80|6|220|2 16 0 24 26 34 32 29|-|
|25|Shalek the Fake (temple)|(64,250)|(64,390)|2|MagicEngine2,Tower2|Sparse|Experienced|5|11|190|2 21 0 28 24 20 6 19|-|
|26|Heqamaatra the Foreign (temple)|(167,168)|(167,472)|2|Seige2,MagicEngine2|Sparse|Veteran|50|11|200|2 16 3 21 0 24 4 11|-|
|27|Osochor the Glutton (temple)|(290,212)|(290,428)|2|MagicEngine2,Seige2|Sparse|Experienced|50|11|210|2 3 0 26 14 33 11 5|-|
|28|Senmet the Wise|(417,423)|(417,217)|1|Tower1,Tower1,MagicEngine1|Fertile|Experienced|20|11|240|2 16 21 24 31 6 19 29|1|
|29|Hatshepsut the Loyal|(452,308)|(452,332)|1|Tower1,MagicEngine1,Tower1,Seige1|Average|Experienced|30|11|250|2 16 21 26 31 7 14 15|1|
|30|Tut the young|(408,202)|(408,438)|1|Tower1,Tower1,MagicEngine1,Seige1|Average|Experienced|5|11|270|2 16 21 4 17 31 33 5|1|
|31|Thothmes the Snake|(418,107)|(418,533)|1|Tower1,MagicEngine1,Tower1,Seige1|Average|Veteran|30|15|290|2 0 3 6 30 31 14 29|1|
|32|Neferu the Beloved|(692,478)|(692,162)|1|Tower1,MagicEngine1,Tower1,MagicEngine1|Average|Experienced|30|11|260|2 24 31 6 30 32 33|1,2|
|33|Qar the Ancient|(718,367)|(718,273)|1|Tower1,MagicEngine1,Tower1,MagicEngine1|Fertile|Veteran|15|15|280|2 22 27 28 31 6 33 19|1,2|
|34|Sehabre the Sharp Blade|(733,271)|(733,369)|1|Tower1,MagicEngine1,Tower1,MagicEngine1|Fertile|Veteran|15|15|300|2 27 5 31 30 7 6 19|1,2|
|35|Khaba the Deranged (temple)|(870,467)|(870,173)|2|MagicEngine2,Tower2,Tower2,MagicEngine2,Seige2|Average|Veteran|25|15|300|2 28 24 5 30 27 6 7|2|
|36|Tepia the Short (temple)|(854,344)|(854,296)|2|MagicEngine2,Tower2,MagicEngine2,Seige2|Sparse|Veteran|5|18|325|2 27 19 22 13 6 12 15|2|
|37|Nehesi the Fortuitous|(722,176)|(722,464)|1|Tower1,MagicEngine1,Tower1,MagicEngine1|Average|Veteran|30|18|325|2 28 5 29 22 31 30 6|1|
|38|Horus the Divine|(905,250)|(905,390)|1|Tower1,MagicEngine1,Tower1,MagicEngine1|Sparse|Veteran|5|18|350|2 27 5 14 13 21 26 0|-|

Upgrade ids in content.json map to the overlays like this: 0 and 5 → Tower, 2 and 4 → MagicEngine, 3 → Seige, 1 → none. Upgrade id 1 is listed above as "-" when it is the only one.

### 15.2 Connections
Use content.json `maps[].connections` exactly: `from`=castleId1, `to`=castleId2, `points`=dot centres in map-space, `mapLink`=linksToAnotherMap. Add `startPosition: true` to Egypt `{from:20,to:0,mapLink:true}`, and false for all others.

### 15.3 Atlas rects used (WorldMap and WorldMapEgypt share the same layout; see atlases.json)
- Castles: 80×80. Rows by state: y=0 Enemy, y=80 Owned, y=160 Inactive. Columns: x=0 variant 1, x=80 variant 2 (x=160/240 are the unused Selected variants).
- Dots: PathRed y=240 and PathBlue y=256, 16×16, anim frames x 0..96 (static = x 96).
- Arrow: (0,272) 32×32, 8 frames.
- Tower1 (0,304), Tower2 (80,304), Seige1 (160,304), Seige2 (240,304), MagicEngine1 (0,384)+(80,384), MagicEngine2 (160,384)+(240,384).
- ExplosionDefault (0,464) 48×48 ×5.
- Boat (368,0) 64×64 ×4 vertical.
- Map buttons: column x=320 of **mapcastles_alpha.png** (48×48):
  - y=0 / y=96: units swap, normal / selected;
  - y=48 / y=144: $, normal / selected;
  - y=192 / y=240: appearance, normal / selected.

## 16. Uncertain points and guesses
- **Explosion z0, drawn under the castles**: this is literal from the code (`addChild:` inside the atlas manager). Under cocos2d 0.8 rules it is mostly hidden by the revealed blue castle. Keep it.
- The **MessageLayer button y=120** is inferred from YesNoLayer, which uses the same code shape. Its setPosition was not fully decoded.
- **Font start char**: `MenuItemAtlasFont` for white and tiny text uses `startCharMap = 33` ('!'), cell 16×20 / 8×10. Spaces fall outside the map, so they draw as blank cells. The font spec is owned by the fonts/HUD agent.
- **VS button**: present in 1.85 but absent in the video. It is a product decision.
- **Temple skin (2) unlock never happens in practice**, because of `hasSkin:1`. Faithful porting means it stays unreachable unless the port deliberately "fixes" it (results.md calls this a GUESS that hasSkin is 1-based; disassembly of `hasSkin: @75328` shows a direct `intValue == n` comparison).
