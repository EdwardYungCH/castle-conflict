# Castle Conflict 1.85 – Battle screen presentation spec (HUD, scenery, castle visuals, overlays)

Source: `/home/claude/re/ann.txt` (method addresses given as `@addr`), VFP literals decoded with llvm-objdump `--mattr=+vfp2`; checked against video frames `frames/sheet0*.png`.
Conventions: cocos coords origin bottom-left; **canvas** = top-left, `cy = 320 - y`. Sprites are centre-anchored (0.5,0.5) unless noted. "TL" = canvas top-left of the sprite rect. Text labels are `MenuItemAtlasFont`/LabelAtlas: centre-anchored, glyph advance = itemWidth, char index = `code - 33` (start char `'!'`), 20 glyphs per texture row; space (code 32) is an off-texture cell, so it draws as a blank advance.
Fonts: `sprites_font_alpha.png` (white with purple shadow) 16×20; `sprites_font_bigblue_alpha.png` 16×20; `tinyfont_white_alpha.png`/`tinyfont_red_alpha.png` 8×10. Width of an n-char label = 16n or 8n.
Ticks: Director default 60 fps. `GameScene update:` (sim + HUD) runs every **0.032 s**; passive gold `awardGold:` every 1.0 s; per-frame `schedule:` nodes (clouds, shake) use the real frame dt.

---------------------------------------------------------------------------------------------------
## 0. Game modes and who builds the scene
- `GameMode` (CocosNode) owns `GameScene` at z=1 (`initWithBattleParams:` @18e90; `initWithLayer:` is used when restoring a saved game).
- `BattleParams.gameMode`: **0 = Quick Play** (`[BattleParams init]` @80a00), **1 = Campaign** (`CampaignInfoLayer play:`, `WorldMapData ccTouchesEnded`), **2 = Multiplayer** (`MultiplayMatchUtil`).
- Quick Play defaults (`BattleParams init`): background **`bg_grass.png`**, scenery = the "hill" set (see §6), scenery skin `"Scenery"`, foreground skin `"EgyptianForeground"`, and **both castles get upgrade 0 (Tower)**.
- Campaign medieval castles: background and scenery set per castle (table §6.4), scenery skin "Scenery". Egypt campaign (`EgyptMapLoader`) uses scenery skin "EgyptianScenery", `levelSceneryInfo.skin = 1`, and **no** scenery items (no birds, sparkles or clouds).
- `castle.flipped` (content.json) is read **only** by `MapCastle` (the world-map icon). The battle background is never mirrored. The only battle mirroring is `reverseRedAndBlue` (@1bbf8), which applies to the multiplayer client only: castle, unit, scenery and foreground layers get scaleX=-1 and the two health-bar borders swap positions. The background is not part of those layers.

## 1. Scene graph / z-order (GameScene children, back → front)
| z | node | contents |
|---|---|---|
| -4 | `Sprite` background | bg file at (240,160) |
| -3 | `sceneryLayer` → scenery AtlasSpriteManager (z -3) | inside it: RandomBirds and WaterSparkle at z -4; LeafyTree trees and HealPickup at z 0 (addChild:) |
| -2 | `PreGameHintLayer` (only when shown) | banner and texts |
| -1 | `Cloud` sprites (two per cloud row) | forest/dry clouds |
| 0 | `castleLayer` → player castle atlas, then enemy castle atlas | Castle z0, Tower/Dock/Seige z1, Magic z2, CastleDebris |
| 0 | `buttonLayer` (added later with plain addChild:, so z0 **after** castleLayer) | unit buttons + cost labels |
| 2 | `ultimateSheet` (sprites_ultimate.png; only if the trophy is owned) | Pink Unicorn easter egg |
| 2 | `unitLayer` → **player unit atlas (z2), then enemy unit atlas (z2)** | units, cannon, projectiles, explosions, death anims, whistles, badges |
| 3 | `foregroundLayer` → foreground atlas (z3) | tall-tree tops z -3, tall-tree trunks z 3, Antlion z 0 |
| 5 | `hudSheet` (sprites_conhud_alpha) | health-bar borders, then fills |
| 5 | HUD `Menu` | gold labels, tree icons, QUIT/pause/help, trophy |
| 5 | `FloatingText` items | "+N" texts |
| 6 | `ShouldQuitLayer` | quit dialog |

**Unit draw order (important):** the original does **not** y-sort units. Each side's unit atlas draws its sprites in insertion (spawn) order. The **whole enemy atlas draws over the whole player atlas**, because both are at z2 and the enemy atlas is added second (@1d1a0, @1d2b0). Units, cannon (z2), death animations (z2) and castle explosions (z2) all live in their side's unit atlas.

## 2. Castles and attachments (`Castle initWithSkin:upgrades:position:friendly:` @613c, `addUpgrade:` @5b94, `PlayerState initWithRoot…` @79c0)
Castle atlas by side and skin (`PlayerSkin` XML):
- Player (Left): skin 0 MedievalSkin → `CastlePlayer`; skin 1 EgyptianSkin → `PyramidPlayer`; skin 2 EgyptianTempleSkin → `TemplePlayer`.
- Enemy (Right): → `CastleEnemy` / `PyramidEnemy` / `TempleEnemy`.

The `Castle` sprite is 96×192. Its position is `x = w/2` (player) or `480 - w/2` (enemy), `y = 33 + h/2` → **(48,129)** and **(432,129)**. On canvas the centre is (48,191) with TL (0,95), or TL (384,95) for the enemy. **The castle bottom is at canvas y=287.**
Initial health is 100, overwritten by settings or campaign data.

Upgrades (enum 0 Tower, 1 Dock, 2 Magic, 3 Seige; ids 4 Temple and 5 Solar have **no visual**). Each one is added to the castle-skin atlas:
| upgrade | entry (CastlePlayer rect) | z | player position (cocos → canvas TL) | enemy position |
|---|---|---|---|---|
| Tower | `Tower` 48×96 (288,0); enemy (336,0) | 1 | left-aligned with castle, top-aligned: (24,177) → TL (0,95) | right-aligned: (456,177) → TL (432,95) |
| Dock | `Dock` 48×48 (192,64); enemy (240,64) | 1 | outside the castle's inner edge: x = 48+48+24 = **120**, y = 129-55 = **74** → TL (96,222) | x = **360**, y 74 → TL (336,222) |
| Seige | `Seige` 96×96 (384,256); enemy (384,352) | 1 | centred x, bottom-aligned: (48,81) → TL (0,191) | (432,81) → TL (384,191) |
| Magic | `Magic` 96×96, anim `MagicAnimation` 4 frames horizontal from (0,256) (enemy (0,352)), **0.1 s/frame, looping** | 2 | same as Seige | same |
Temple skin has no Dock entry.

**Cannon** (`PlayerState addCannon` @7958; created when the army contains unit 5): sprite `Cannon` 32×32 in the side's **unit** atlas (playerStandard/computerMedieval (128,352)), z2. Positions: player **(52,148)** → canvas centre (52,172), TL (36,156); enemy **(432,145)** → centre (432,175), TL (416,159). Fire: `CannonFire` animation 5 frames at **0.05 s/frame**, RevertWhenOver, so 0.25 s in total. CannonBall spawns at (cannon.x+8, cannon.y+8) in cocos coords for both sides. `fireCannon:` costs 45 and requires gold > 44.

**Destroyed castle** (`beginGameOverSequence` @1ab90, `spawnCastleDeathExplosion:` @1df10, `changeCastleToDebris:` @1dc0c). Let t0 be the 0.032 s tick in which `checkEndCondition` finds castle health ≤ 0. The loser is the player side first if both are at 0.
- t0: `gameOver=YES`. All of the loser's units are removed instantly, with no death animations. The HUD `Menu` is removed (gold labels, tree icons, QUIT, pause, help and trophy disappear). Health bars and unit buttons stay; button opacity freezes.
- From t0+0.1 s, every 0.1 s: a `CastleExplosion` (SinglePlayAnimation `ExplosionDefault`, 48×48, 5 frames at **0.1 s**, removed when done) is placed in the **loser's unit atlas** at z2, at `(int)(castle.x + rand%60 - 30, castle.y + rand%60 - 30)`. Explosions 1–8 play `explosion.wav`. Explosion 9 (t0+0.9 s) plays `explosionbig.wav` and stops the timer. That makes 9 explosions in total.
- t0+1.0 s: `CastleDebris` 96×64 ((192,112), enemy (288,112)) is added to the loser's castle atlas at (castle.x, castle.y - 96 + 32) = **(48,65)** or **(432,65)**, i.e. canvas TL (0,223)/(384,223) with its bottom at 287. The castle, all upgrades and the cannon are removed. (Guess: the timer repeats every 1.0 s and is never unscheduled, so it fires again at t0+2.0, which has no visible effect.)
- t0+2.0 s: `goToGameoverState:` replaces the scene (GameOverScene for quick play, CampaignResultScreen for campaign, MultiplayResultsScene for multiplayer).

## 3. HUD (`GameScene loadHud` @1ff10, `updateHudForPlayer:withLabel:withImage:` @1f8a0)
### 3.1 Health bars (`PlayerState init` @79c0, sprites_conhud_alpha.png)
- Border: player rect (0,0,96,16), enemy (0,16,96,16). Positions: player **(58,233)** = (10+48), canvas TL **(10,79)**; enemy **(423,233)** = (375+48), TL **(375,79)**. Both are in hudSheet at z5.
- Fill: a **1-pixel texture column** scaled horizontally. Player rect (96,0,1,16) is blue; enemy rect (97,0,1,16) is red. The column is coloured only in rows 2–13. It is drawn over the border (added after it). Width `w = 90 * lastHealth / maxCastleHealth` (scaleX).
  - Player (and not flipped): centre x = border.x - 48 + w/2 + 1. **The left edge is fixed at canvas x=11 and the bar grows to the right.**
  - Enemy: centre x = border.x + 48 - w/2 - 3. **The right edge is fixed at canvas x=468 and the bar grows to the left.**
  - y = 233 (TL y 79, height 16).
  - `lastHealth` starts at -1 (snaps to the real value) and is otherwise moved **±1 HP per update tick (0.032 s)** towards the real castle health. This gives a 31.25 HP/s animated drain or refill.
### 3.2 Gold counter and tree icon
The HUD Menu is positioned at **(48,280)** and items are relative to it. Absolute positions:
- Gold labels: `MenuItemAtlasFont` "%d" in `sprites_font_alpha.png` 16×20 (white). Player centre **(148,231)**, enemy **(333,231)**. Canvas: centre y 89, TL = (cx - 8n, 79).
- Tree icon (MenuItemAtlasImage, conhud, 16×16): when `levelSceneryInfo.skin==0` (all medieval and Quick Play) use the **pine (96,16,16,16)**. When skin 1 (Egypt) use the palm (112,0,16,16).
  - It is re-placed every update tick so it hugs the label: `icon.x = label.x - label.w/2 - 8`, `icon.y = label.y`. For n digits: player icon centre x = 140 - 8n (TL x = 132 - 8n); enemy centre x = 325 - 8n. Canvas TL y is 81.
- The label text is refreshed every tick while not game over.
### 3.3 Buttons (all `MenuItemAtlasImage` from sprites_conhud_alpha.png, 48×48 cells, activate on **touch-up**)
| button | normal rect | selected (pressed) rect | position (cocos) | canvas TL | action |
|---|---|---|---|---|---|
| QUIT | (192,32,48,48) | (192,80,48,48) | (428,25) | (404,271) | `askQuit:` |
| pause | (0,32,48,48) "‖"; while paused (48,32,48,48) "▶" | (0,80) / (48,80) | (85,25) | (61,271) | `pause:` toggles |
| help ? | (144,32,48,48) | (144,80,48,48) | (35,25) | (11,271) | `help:` |
| trophy (Quick Play only, if `settings.hasTrophy`) | (48,208,24,24) | – | (240,231) | (228,77) | `createGod:`; every 3rd tap spawns the Ultimate Pink Unicorn |
Pause and help exist only for gameMode 0 or 1 (no pause or help in multiplayer). Multiplayer also adds a `connectionStatus` item at (240,231) (rect (128,0,32,32)), not covered further here.
### 3.4 Unit buttons (`ButtonLayer` @739d4, `addButtonToArray:withPrice:withTag:` @73cec, `Defaults getButtonForUnit:fromAtlas:` @7240c)
- Texture: Quick Play uses `sprites_hud_alpha.png`. Campaign uses the player skin's `Left/ButtonFile` (`sprites_hud_alpha.png` for medieval, `sprites_egypt_bluehud_big_alpha.png` for Egyptian or Temple). A multiplayer client uses `Right/ButtonFile` (`sprites_redhud_big_alpha` / `sprites_egypt_redhud_big_alpha`). All sheets share one layout.
- Buttons: Quick Play has the fixed army **[2,3,0,1,4,6,7,5]** (Wood Cutter, Thief, Foot Soldier, Heavy Soldier, Cavalry, Zeppelin, Bomber, Cannon) **plus the double-gold button**. Campaign has the army from `startData.units` in order, with no double gold. The design limit is 8 units (NSLog "Invalid number of units. Expect zaniness." if more).
- Position of the k-th button added (k = 0…): **x = 48*(k+1), y = 292**. Canvas centre (48k+48, 28), TL **(48k+24, 4)**, size 48×48. The Menu is at (0,0) and ButtonLayer is at z0 (see §1). `UNIT_BUTTONS_CENTERED_X 72` is not used by ButtonLayer.
- Rects: normal = `content.json units[].hud` (x,y,48,48). **Pressed ("selected") = (x, y+96, 48, 48)** (darker grey background), shown while the finger is on the button. There is **no disabled rect**.
- **Opacity** (`ButtonLayer updateButtonOpacity` @73854): `price <= gold ? 255 : 100` (FADED_OPACITY). It is applied to the button images only; **the cost label stays fully opaque**. It is recomputed on buy, on passive gold (`awardGold:`), on wood or steal delivery, and at `startGame:`. It is skipped once gameOver is set. **There is no spawn-cooldown visual.** `UNIT_WAIT_TIME 0.3` is never loaded by ButtonLayer or PlayerState; the only 0.3 literal nearby is the hard-difficulty AI period.
- Cost label: `MenuItemAtlasFont` "%d" in **`sprites_font_bigblue_alpha.png` 16×20 (advance 16)**, a child of the button at z5, local position (24,-10). Absolute (48(k+1), 258) → canvas centre y **62**, TL (cx - 8n, 52).
- **Double gold** (`addDoubleIncomeButton` @73c20, Quick Play only): a non-immediate MenuItemAtlasImage with normal (144,48,48,48) (pine "×2") and pressed (144,144,48,48). Price **150**, tag -1, added after the 8 units, so it is k=8 at **x=432** (TL (408,4)). Its label reads "150".
  - `doubleIncome:` runs only if buyingAllowed, `doublePlayerIncome` succeeds (gold ≥ 150, then gold -= 150 and doubleIncome = YES) and the director is not paused. It then plays `buy.wav` and calls `setIsEnabled:NO` (the button keeps drawing its normal rect, with opacity from price vs gold, and ignores touches).
  - Doubled income means wood deliveries are worth 2×treeValue (seen in `moveUnits` @1ed54). The state is saved as `kHomePlayerDoubleGold`.
- Touch: unit buttons are `MenuItemAtlasImageImmediate` (`selected` calls `activate` at once; `activate` itself is empty). They **fire on touch-down**, and **again whenever the finger slides onto another button** (Menu `ccTouchMoved` → `selected`).
  - `buyUnit:` does nothing before `startGame:` (buyingAllowed) or while paused.
  - On success it plays **`buy.wav`**. A failed buy plays **no sound**. Unit 5 (cannon) goes through `createUnit` → `fireCannon:`.

## 4. Text effects
**FloatingText** (`GameScene showGoldMessage:atPosition:` @172f8; `FloatingText` @20d08 / @20bbc), z5:
- Amount > 0: "+%d" in `tinyfont_white_alpha.png` 8×10. Amount ≤ 0: "%d" in **`tinyfont_red_alpha.png`** (e.g. "-15" when a thief steals from you).
- Position = the unit's position at the event (x mirrored when flipped), truncated to int.
- Every 0.016 s: realY += 15·dt (**rises 15 px/s**), drawn at the int position. life += dt; opacity = (1-life)·255; removed at life ≥ 1.0 s.
- Triggers (inside `moveUnits:` @1e794):
  - Wood delivered: +treeValue, doubled with double gold, plus `yay.wav`.
  - Thief returns home: +stolenValue.
  - Thief steals at the enemy castle: -stolen (red) on the victim's side, plus `buy.wav`.
  - The castle hit sound `castlehit.wav` is on another path.

**PreGameHintLayer** (@15c1c), added at z -2:
- Shown if (Quick Play and difficulty == 0/easy) or (Campaign and the player does not yet own castle 0, i.e. the first campaign battle). In that case `startGame:` is at **3.0 s** and `newGameSetup:` is at 5.0 s (initial trees ±120 px from the castles, plus free woodcutters in easy Quick Play). Otherwise `startGame:` is at **0.5 s** (not multiplayer).
- Elements:

| element | content and font | cocos position | canvas |
|---|---|---|---|
| backDrop | `help_banner.png` 480×96 | (240,165) | TL (0,107) |
| header | "You are the blue castle", whiteText (16×20) | (240,195) | centre y 125, TL (56,115) |
| textLabel2 | "Gather trees for resources.", tinyWhite 8×10 | (240,175) | y 145 |
| textLabel | "Touch the buttons above to build units!", tinyWhite | (240,155) | y 165 |
| textLabel3 | "Destroy the red castle!", tinyWhite | (240,135) | y 185 |

- Note the on-screen order from top to bottom: header, Gather, Touch, Destroy.
- All elements start at opacity 0 and get `FadeIn` 0.75 s. At 5.0 s, `startFading:` schedules `fadeOut:` every 0.016 s, which subtracts dt·255 from each element's opacity (≈1 s). The layer is removed when dt·255 > the current opacity.
- Because the layer sits at z -2, castles (z0) and clouds (z -1) draw over the banner.
- `TutorialLayer` (fade layer + help_banner at (240,160)) is the base class for the shop, unit and map tutorials and is **not used in battle**.

## 5. Pause / help / quit
- `pause:` (only if `activeHud`): plays `select.wav`, then toggles.
  - `pause` swaps the pause button rects to ▶ (48,32)/(48,80) and calls `Director pause`: the scheduler stops, actions freeze, and drawing drops to 4 fps.
  - **No overlay or dimming is drawn.**
  - `unpause` restores (0,32)/(0,80) and resumes. `pauseLocked` blocks both while the quit dialog is open.
- `help:` (only if activeHud): plays `select.wav`, then `pushScene:` **HelpScreen**. HelpScreen is `help.png` at (240,160) z0, plus a HelpLayer z2 with a "Back" button (sprites_buttons_alpha normal (96,48,96,48), pressed (288,48,96,48)) at **(425,25)**, canvas TL (377,271). Back plays "select" and calls `popScene`. The battle is frozen while it is pushed.
- `askQuit:` (only if activeHud): plays `select.wav` and adds `ShouldQuitLayer` at z6. In modes 0 and 1 it also calls `pause` + `lockPause`. It sets activeHud=NO. The dialog (@212b8) contains:
  - `Defaults fadeLayer`: a full-screen ColorLayer, black, opacity **100**.
  - `help_banner.png` at (240,130), canvas TL (0,142).
  - "Really Quit?" in sprites_font_alpha 16×20 at (240,150) (canvas y 170).
  - The save message in tinyWhite at (240,120) (canvas y 200):
    - mode 0: "(Your game will be saved)"
    - mode 1: "(You will be taken to the map)" if numCastlesOwned > 0, else "(You will be taken to the menu)"
    - mode 2: "Really forfeit?"
  - **YES** (sprites_buttons (96,96,96,48) / (288,96,96,48)) at (165,85), TL (117,211), calls `quit:`.
  - **NO** ((96,144,96,48) / (288,144,96,48)) at (315,85), TL (267,211), calls `game:`. `cancelQuit` unlocks, unpauses and sets activeHud=YES.
  - Both buttons play `select.wav`.
- `MessageLayer` (fade layer + banner (240,165) + white header (240,190) + tiny message (240,160) + Back at (240,120)) is **not used in battle** (map and results only).

## 6. Scenery
### 6.1 Clouds (`SceneryLoader addScenery:` types 4/5 @9d190, `Cloud` @9f514)
- A `Sprite` from file, added to GameScene at **z -1**. Each type creates two copies: one at x=240, one at x=-240, at the same y.
  - **Type 5** (forestclouds1 / dryclouds1, 480×80): y = 320 - h/2 = 280, canvas TL y **0**, speed **15 px/s**.
  - **Type 4** (forestclouds2 / dryclouds2, 480×64): y = 240 - h/2 = 208, canvas TL y **80**, speed **8 px/s**.
- Per frame: realX += speed·dt (moving right). If realX > 480 + w/2 (=720), then realX -= 960. The drawn x is `(int)realX`, truncated toward 0.
### 6.2 RandomBirds (@12e74 / @12fac), in the scenery atlas at z -4
- Static frame `birdRight` (or `birdDarkRight` when dark) 16×16. **Initial position (0,0)**, so an 8×8 fragment (11 opaque pixels) is visible at the bottom-left corner of the screen until the first flight (a faithful quirk).
- First `beginAnimation:` after `rand%20 + 8` s (8–27 s, integer). Each flight:
  - Plays `birdies.wav`.
  - 50/50 direction: `rand&1 == 0` → flies left from x=512 to x=-32 with `birdLeft`/`birdDarkLeft`; otherwise flies right from x=-32 to x=512 with `birdRight`/`birdDarkRight`. Animation is 3 frames at **0.1 s**, looping.
  - y = `rand%120 + 180` (cocos 180–299 → canvas 21–140).
  - `MoveTo` duration **15 s** (≈36.3 px/s).
  - Next flight after `544/30 + 8 + rand%20` = 26.13–45.13 s.
### 6.3 WaterSparkle (@12d34 / @12c70), in the scenery atlas at z -4
- 16×16 sprite `sparkle` (192,0), which is **blank** between flashes.
- First flash after `rand%3 + 2` s (2–4 s), then every `rand%3 + 3` s (3–5 s).
- Each flash runs `sparkleAnimation`: 6 frames from (96,0), **0.1 s/frame**, RevertWhenOver, so it returns to the blank frame.
- Atlas is Scenery (`spr_atmos_alpha`) or EgyptianScenery.
### 6.4 Scenery sets (`PreDefineScenery init` @9f81c) and which battles use them (`CastleDataLoader loadAllCastleData`)
Items:
- B = birds
- DB = dark birds
- S(x,y) = sparkle
- C1 = type 5 cloud `forestclouds1.png`; C2 = type 4 cloud `forestclouds2.png`
- D1 = type 5 `dryclouds1.png`; D2 = type 4 `dryclouds2.png`
- surf = `surf.wav` played as **looping background music** (type 3)

| set | items | used by (medieval castle id: bg) |
|---|---|---|
| hill | B, S(235,180), S(345,110), S(245,40) | **Quick Play** (bg_grass), 0, 6, 9 (bg_grass) |
| bird | B | 1 (grass2), 4, 14 (plains), 7 (river), 11, 13 (mountains) |
| forest | B, C2, C1 | 2, 5 (forest1) |
| forestBeach | S(271,132), B, surf | 3 (beachforest) |
| water | B, S(174,**750**; off-screen), S(260,144), S(333,60), C1, C2, surf | 8 (water2), 16 (water3) |
| sunsetWater | DB, S(174,750), S(260,144), S(333,60), surf | 17 (watersunset) |
| dry | D1, D2 | 10, 12 (dry) |
| darkBird | DB | 15 (forestsunset), 18 (mountainsunset), 19 (sunset) |

Sparkle canvas centres: (235,140), (345,210), (245,280), (271,188), (260,176), (333,260). `bg_water_land.png` and `bg_water1.png` are **never referenced** by the binary.
### 6.5 Trees, heal pickup, game objects
- **LeafyTree** (@8274): scenery atlas, so it is behind castles, units and clouds. Starts as the static frame `tree` (80,16). `treeGrow` runs 15 frames, 5 per row, at **0.2 s/frame** (3 s total), with no loop and no revert, so it ends on (208,112) = `treeGrown`. Harvestable after 0.8 s.
  - Position x, y = groundY(x) + 24 (bottom on the ground).
- **Ground line** (`getYForX:forObject:` @1c92c): y_centre = 42 + 30·sin(-π·(x - 80)/(E - 80)) + h/2, where E = enemy `groundUnitStart.x` = 480 - enemyCastleWidth = **384**. On canvas the object bottom is `278 + 30·sin(π(x-80)/304)`.
- **HealPickup** (@13d40, `addHealPickup` @1e184): `healthPack` (48,0,16,16) from Scenery or EgyptianScenery, in the scenery atlas at **(240, groundY(240)+8)**. It is rolled once per second with a 1/90 chance while none exists (`randomlyGenerateHealPickup:`), only if heals are allowed.
- **Antlion** (`createAntlion` @1ba0c): EgyptianForeground `Antlion` 96×48 at **(240,24)**, canvas TL (192,272). It is in the foreground atlas, so it draws **above units**. Idle is `AntlionIdle`, 8 frames at 4 per row, 0.1 s, looping. Attack is `AntlionAttack`, 4 frames at 0.1 s, reverting; it plays `wurm.wav` on kill.
- **TallTree** (`TallTree initWithX:withSkin:` @c2b2c): b = 24 - rand%20 (5–24).
  - Three `TallTreeTrunk` pieces (32×48) at y = b, b+48, b+96 (centres), added at z3.
  - The top (`TallTreeTop` 96×80) at y = b+144, z -3, so the trunks draw over the top's lower 16 px.
  - All are in the foreground atlas, **above units**. x = 240 ± distance.
### 6.6 Effects attached to units (scope overlap)
- **StatusBadge** (@b8ed8 / @b8ff8): created by `Unit addBadge:` in the unit atlas.
  - x = target.x + xOffset, where xOffset = 20·(number of existing badges), **negated for the player side**.
  - y = target.y + target.h/2 + badge.h/2 + **6**, i.e. the badge centre is 14 px above the unit's top edge for a 16-px badge.
  - Updated every 0.016 s. Animation (e.g. `SandWormBadge`) at 0.25 s/frame.
- **Whistle** (@13244): SinglePlayAnimation `Whistle` (16×24, 2 frames) at 0.15 s, then removed. It is spawned every **1.0 s** while a WoodCutter, Thief, AdvancedWoodCutter or PolymorphWizard carries something, at (unit.x ± unit.w/2, unit.y) (+ for the player side).
- **Unit death** (`Unit createDefaultDeathProjectile` @484c): `UnitDeathExplosion` = SinglePlayAnimation `DeathSmall` (16×24, 3 frames) or `DeathLarge` (zeppelins, bombers, witch, petard smoke), **0.15 s/frame**, at the unit position in the unit atlas at z2. Note the player DeathLarge is 32×32 at (128,448); the computer one is 64×48 at (304,0).
- **PrettyDeath**: unicorn only (rect (0,48,48,48), 5 frames at 0.1 s in ultimateSheet).
- **ShakeEffect** (@c271c / @c27c4): shakes the **whole GameScene, including the HUD**.
  - Each frame while timeLeft > 0: position = initialPos + (rand%(2m+1) - m, rand%(2m+1) - m), with m = (int)magnitude. Afterwards it restores initialPos. Re-triggering only resets the duration and magnitude.
  - Callers:

| caller | magnitude | duration |
|---|---|---|
| SandWorm `emerge:` | 1 | 0.5 s |
| SandWormPriest `startShake:` (+2.0 s after stop) | 0.5 → int **0** (invisible) | 2.5 s |
| SandWormPriest `secondShake:` (+4.5 s) | 1 | 2.5 s |
| SandWormPriest `summonSandWormAnim:` (+7 s) | 3 | 0.25 s |

## 7. Save game in progress (`GameScene(SaveLoad)`)
- Written by `save:` (@b194), an NSKeyedArchiver of the GameScene under **`kSaveKey`**, to `FilePaths dataFilePath`. Two triggers:
  - Choosing **YES** in the quit dialog in **Quick Play** (`quit` @16740: replace with MenuScene, then `save:`).
  - **`applicationWillTerminate:`** whenever `GameScene.sharedScene` exists, in any mode. `sharedScene` is set in init and cleared in dealloc.
- In Campaign, quit goes to the shop, map or menu with no save. In multiplayer, quit goes to the menu and deletes the campaign temp file.
- Keys:
  - Per side: `kHomePlayer*` / `kAwayPlayer*` = Health, MaxHealth, Gold, Units (array of `unitSaveData`: `kUnitX`, `kUnitType`, `kUnitCarryingTree`, `kStolenValue`), Projectiles (`kProjectileType/X/Y/XVelocity/YVelocity`), DoubleGold, Score (`kGoldSpent`, `kUnitsBought`, `kUnitsKilled`, `kUnitsDied`, `kTreesHarvested`, `kGoldStolen`).
  - Scene: `kTrees` (tree x positions), `kChanceOfTree`, `kTreeRatio`, `kMaxTrees`, `kAiFrequency`, `kAllowHeals`, `kHasHeal`, `kDifficulty`.
- Restore: main menu "Continue" → `OverwriteLayer continueGame:` (analytics beacon "ContinueGame"). It decodes, wraps in `GameMode initWithLayer:`, deletes the file and calls replaceScene.
  - `initWithCoder:` builds a default Quick Play scene (bg_grass, hill scenery) and restores the values.
  - If DoubleGold was saved it **disables the double-gold button** again. It re-adds the heal pickup at (240, ground) if `kHasHeal` is set.
  - It removes any hint layer, unschedules `newGameSetup:`, and schedules `startGame:` at 0.5 s.

## 8. Sounds (battle presentation)
| sound | when it plays |
|---|---|
| `buy.wav` | successful unit buy, cannon fire, double gold, thief steal |
| `yay.wav` | wood delivered (and the heal path @1f1ec) |
| `select.wav` | pause, help, quit, YES/NO |
| `birdies.wav` | each bird flight |
| `surf.wav` | looping background music (forestBeach, water, sunsetWater) |
| `explosion.wav` ×8 + `explosionbig.wav` | castle death |
| `wurm.wav` | sand worm emerges, antlion kill |
- **No error sound in battle.** `no2.wav` is only used in UnitSwap and multiplayer.

---------------------------------------------------------------------------------------------------
## 9. Discrepancies vs the existing port (`renderer.mjs` drawBattle, `engine.mjs`, campaign module)
1. **Background mirroring**: the campaign module sets `b.backgroundFlipped = c.flipped` and the renderer mirrors the bg. The original never mirrors the battle background; `flipped` only affects the map icon. Remove it.
2. **Quick-play background** in the original is `bg_grass.png` with the hill scenery set. The port defaults to `river`.
3. **Missing scenery entirely**: clouds (z -1, 8 and 15 px/s), birds plus `birdies.wav`, water sparkles, surf loop, and the bird-at-(0,0) quirk (§6).
4. **Castle y off by 1**: the renderer anchors the castle bottom at 288; the original bottom is **287** (centre y 129). The same applies to debris (bottom 287).
5. **Castle upgrades not drawn** (Tower, Dock, Seige, animated Magic; §2). Quick Play castles both have **Tower**.
6. **Castle death**: the renderer swaps to `CastleDebris` immediately when hp ≤ 0. The original runs 9 explosions at 0.1 s intervals (random ±30 px around the castle centre, with sounds), shows debris at +1.0 s, keeps the castle until then, and changes scene at +2.0 s. It also hides the HUD Menu and removes the loser's units instantly at t0.
7. **Unit draw order**: the renderer y-sorts all units. The original has no y-sort: player-side sprites in spawn order, then **all enemy-side sprites on top** (§1).
8. **Foreground objects**: the renderer draws the antlion and tall trees *before* units. In the original they are in the foreground layer (z3) **above units**. Within it, trunks (z3) are over tree tops (z -3).
9. **Leafy trees and heal pack layering**: in the original they are in the scenery layer, behind castles, clouds and units. The renderer draws trees after the castles and cannon.
10. **Unit button disabled look**: the renderer uses the hud rect +96 (the *pressed* image) whenever `!canSpawn`, which includes the engine's 0.3 s cooldown and unit cap. The original uses **opacity 100/255 when price > gold, else 255** and shows +96 only while touched. No cooldown visual exists, and the 0.3 s player spawn cooldown itself appears absent from 1.85 (only the engine uses UNIT_WAIT_TIME). Flag for the engine owner.
11. **Cost labels**: the renderer `bitmap()` uses a 12-px advance. The original LabelAtlas advance is **16 px**, centred at the button x, TL y 52 (y matches).
12. **Double-gold button missing** (Quick Play: 9th button at x=432, price 150, pine ×2 icon, disables after purchase; the engine needs `doubleIncome`).
13. **Health bars**:
    - Border TL is (10,79)/(375,79), not (8,80)/(376,80).
    - The fill must be the texture column (96 or 97, 0, 1, 16) stretched to `90·lastHealth/max` px, not a CSS gradient of 88×9 at y 83.
    - Player fill starts at x=11. **Enemy fill is right-anchored at x=468 and grows leftwards**; the renderer fills enemy left-to-right.
    - The fill should be drawn after (over) the border.
    - Displayed health must tween ±1 HP per 0.032 s.
14. **Wood counter**:
    - The renderer uses icon rect (112,0) (the Egyptian palm) for medieval battles; it should be **(96,16)** pine, with the palm only for Egypt (`levelSceneryInfo.skin==1`).
    - Digits should be sprites_font_alpha at full 16×20 size, **centred** at (148,89)/(333,89) canvas, not scale 0.8, 12-px advance, left-aligned at 142/318.
    - The icon must sit at `label.x - 8n - 8` (centre), canvas TL y 81, instead of the fixed x 124/300.
15. **Bottom buttons**: the renderer draws 24×24 or 48×24 crops at (22,284), (70,284), (402,284). The originals are 48×48 cells with TLs (11,271), (61,271), (404,271), so the pause glyph is 3 px left and QUIT is 2 px left or 1 px low in the port. Pressed variants are y+48 (32 → 80).
16. **Pause**: the original draws no overlay or dim (it freezes at 4 fps and swaps the icon to ▶). The port shows a DOM "paused" overlay.
17. **Help**: the original pushes a full-screen `help.png` with a Back button. The port scrolls to a guide.
18. **QUIT**: the original shows the ShouldQuitLayer dialog (fade 100, banner, "Really Quit?", context message, YES/NO) and pauses. The port quits immediately, and the Quick Play save-on-quit plus Continue feature is missing.
19. **Pre-game hints** (PreGameHintLayer, start delay 3.0 s instead of 0.5 s, `newGameSetup` at 5 s) are not implemented.
20. **Floating text** "+N" or red "-N" (rising 15 px/s, 1 s fade) is not implemented. The renderer instead draws invented coloured particle dots (`battle.particles`), which do not exist in the original.
21. **Unit death animation**: the original uses DeathSmall or DeathLarge at 0.15 s/frame; the renderer has none (only particles).
22. **Badges**: the renderer uses `ground-28` and a TieBadge offset of +8. The original badge centre is unit top + 14 px (`y + h/2 + 8 + 6`), and the k-th badge is offset ∓20·k px (toward the side's own castle).
23. **Screen shake**: the engine emits `shake` events, but nothing renders them. The original jitters the whole scene (HUD included) by ±m px, with the magnitudes and durations in §6.6. The first priest shake is a no-op.
24. **Cannon fire**: the renderer stops the fire animation at 0.2 s, which drops frame 5. The original plays 5 frames × 0.05 s = 0.25 s, then reverts.
25. **Touch semantics**: the port uses `click` (touch-up). The original buys on **touch-down and on sliding onto a button**, while QUIT, pause, help and double gold act on touch-up.
26. **Sounds**:
    - The port plays `select.wav` ('spawn') on a buy; the original plays **buy.wav**.
    - The port plays `no2.wav` and shows a toast on a failed buy; the original is silent.
    - Missing in the port: `yay.wav` on wood delivery, `birdies.wav`, the `surf.wav` loop, and the explosion sequence.
27. **Ground curve (flag for the engine)**: `ground()` uses a denominator of 320. The binary divides by (enemy groundUnitStart.x - 80) = 384 - 80 = **304** (enemy groundUnitStart = 480 - castleWidth). Verify before changing; it shifts every unit and tree y by up to about 3 px.
28. **Player castle skin**: the port always uses `CastlePlayer`. The original uses the player's chosen skin (`PyramidPlayer` or `TemplePlayer`) and the matching button texture (`sprites_egypt_bluehud_big_alpha.png`).
29. **Unit buttons layer**: in the original they are at z0, so units and foreground could overdraw them. The port always draws the HUD last. This is a negligible visual difference.

Not relevant to battle presentation: `CrackDetector` (only a SignerIdentity check at launch), `FauxGameLayout`/`FauxPlayerCastle` (menu and shop previews), and `MessageLayer`/`TutorialLayer`.
