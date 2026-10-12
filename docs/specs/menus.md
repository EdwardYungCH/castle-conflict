# Castle Conflict 1.85: front-end / menu screens spec

Source: annotated disassembly (`/home/claude/re/ann.txt`), re-disassembled with VFP decoding (`llvm-objdump --mattr=+vfp2`; the stock `ann.txt` shows VFP ops as `.long`, so float math there is invisible). Every number below comes from the binary unless it is marked **GUESS**. Addresses refer to method entry points (`@addr`).

Conventions:
* Cocos coords have their origin at the bottom-left of a 480x320 screen. Canvas coords use the top-left: `canvas_y = 320 - cocos_y`.
* "Centre" is the node position. All sprites and menu items in these screens use anchor (0.5,0.5); none calls setAnchorPoint or transformAnchor. Canvas top-left = (cx - w/2, 320 - cy - h/2).
* Texture rects are (x,y,w,h) with a top-left origin as stored in the PNG. All of them were checked against `/home/claude/assets` by cropping.
* "buttons" means `sprites_buttons_alpha.png` (1024x512).
* A `Menu` with no explicit setPosition sits at **(240,160)**: winSize/2, and the status bar is hidden (`UIStatusBarHidden=YES`). Menu children are positioned relative to the Menu's position.
* **No scene transitions are used anywhere in game code.** The Transition classes exist in the cocos library but nothing references them. Every scene change is an instant `replaceScene` / `pushScene` / `popScene`. "Fades" are FadeIn/FadeOut actions on nodes (listed per screen).
* Nearly every button handler first plays `select.wav` (via `[[AudioPlayer sharedPlayer] playSound:@"select.wav"]`) and only then acts.

---------------------------------------------------------------------
## 0. Shared widgets, fonts, input model

### 0.1 MenuItemAtlasImage (the only button class used by these screens)
`+itemFromAtlasImage:normalRectangle:selectedRectangle:[disabledRectangle:]target:selector:` (@605ac / @60954 / @609f0)
* Builds an AtlasSpriteManager on the texture and three AtlasSprites (normal, selected, disabled). A selected or disabled rect with w<=0 or h<=0 gives nil. The overload without a disabled rect passes an all-zero rect, and the overload without a selected rect passes zero too.
* contentSize = normal rect size. The anchor is the centre (`transformAnchor = size*0.5`, @608e4). The hit rect is `[pos - size/2, size]` (`-[MenuItemAtlasImage rect]` @60a9c). There is **no padding**.
* `draw` (@60654): if `!isEnabled` it draws the disabledImage (or the normal one if that is nil). Else if `selected` it draws the selectedImage (or normal if nil). Else it draws normal.
* **On press there is no scale, tint or darken.** It simply swaps to the "selected" rect. In sprites_buttons that rect is a pre-darkened, desaturated copy with grey-purple text (columns x=192/288/576, rows +48, etc.).
* Opacity defaults to 255 and `setOpacity` propagates to all three images.
* `MenuItemAtlasImageImmediate` (a subclass) fires its action on touch-down: `selected` calls `[super activate]` and `activate` does nothing. It is used only for unit icons, which have a nil target on these screens.

### 0.2 Text items (`MenuItemAtlasFont` = MenuItemLabel + LabelAtlas)
Helpers in `Defaults` (@72048..@721b4):

| helper | texture | glyph w x h | first char | grid |
|---|---|---|---|---|
| `whiteTextWithString:` | sprites_font_alpha.png (320x100) | 16 x 20 | 33 `'!'` | 20 cols x 5 rows (94 glyphs `!`..`~`) |
| `tinyWhiteTextWithString:` | tinyfont_white_alpha.png (160x50) | 8 x 10 | 33 | 20 x 5 |
| `tinyRedTextWithString:` | tinyfont_red_alpha.png | 8 x 10 | 33 | 20 x 5 |
| (ButtonLayer price labels) | sprites_font_bigblue_alpha.png (320x100) | 16 x 20 | 33 | 20 x 5 |

Glyph lookup is LabelAtlas `updateAtlasValues` @3c978: `idx = (unsigned char)(c - 33)`, `srcX = (idx % 20) * gw`, `srcY = (idx / 20) * gh`.
* A space (c=32) gives idx 255, which lands off the texture and draws **blank**. It still advances one cell.
* Rendering is strictly **monospaced**: glyph i sits at `left + i*gw` with no kerning. contentSize = (len*gw, gh).
* The text is **centred** on the item position: left edge = x - len*gw/2, top = y + gh/2 in cocos coords. Scale 1 and colour white (no tint) unless noted.
* MenuItemLabel state: disabledColor (126,126,126) (unused here).
* **Touch zoom:** when a label sits inside a `Menu` (target nil but enabled), touching it runs `ScaleTo 0.1s → 1.2`. Releasing or moving off runs `ScaleTo 0.1s → 1.0`. On activate it calls stopAllActions and sets scale 1 (@41ab8/@419e8/@4191c). This applies to the Settings section labels and the BannerLayer stats. Labels added directly to a Layer (most other screens) are inert.

### 0.3 Menu touch model (cocos `Menu` @3de24..)
* Each Menu is a targeted touch handler with the same priority (INT_MIN+1) and swallows touches.
* `TouchDispatcher addHandler:` inserts a new handler **before** existing handlers of equal priority. So the **most recently created menu gets the touch first**.
* touch-began: `itemForTouch` checks every child's rect and **ignores visible, enabled and opacity**. If any item contains the point, that item gets `selected` and the menu swallows the touch. Otherwise the touch passes to the next (older) menu.
* touch-moved: if a different item of the same menu is under the finger, it unselects the old one and selects the new one (nil is allowed).
* touch-ended: unselect, then `activate`. `MenuItem activate` only invokes the target if `isEnabled` (@40c50).
* Consequence: invisible or disabled menus still swallow taps on their items' rects. The handlers guard with an `active` flag, so these taps do nothing.

### 0.4 Banner / dim helpers
* `Defaults bannerSprite` (@71df8) = `help_banner.png` (480x96, opaque purple with gold fringe) centred at **(240,165)**, canvas top-left (0,107), spanning canvas y 107..203.
* `Defaults fadeLayer` (@71d84) = full-screen `ColorLayer` RGBA **(0,0,0,100)**.

### 0.5 MenuItemToggle / MenuItemAtlasSprite
These are plain cocos-library classes. **No game code instantiates them.** The only CLS references are inside their own methods. Implement nothing for them.

---------------------------------------------------------------------
## 1. Startup flow (MCAppDelegate @2dac)
1. The Director is set up with pixel format 5, landscape orientation 3 (home button right) and multitouch on.
2. `Default.png` (320x480 portrait) is drawn once straight to GL and swapped, then its texture is freed. Its content is exactly `Loading.png` rotated 90°; PIL `rotate(90)` (CCW) gives a pixel-identical image. **Web port: show Loading.png.**
3. `[Director runWithScene:[LoadingScene node]]`.
* `applicationWillResignActive` → `Director pause`. `applicationDidBecomeActive` → `resume`.
* `applicationWillTerminate` → if a `GameScene` is running, it calls `[GameScene save:]`, which writes `kSaveKey` to `FilePaths dataFilePath`. Then `[GameScore save]`. This is one source of the "saved game" used by Quick Play (§4.2).

## 2. LoadingScene (@14e10 init, @14fc8 beginLoading:, @14d8c leaveScene:)

| node | texture | centre (cocos) | canvas top-left | z |
|---|---|---|---|---|
| bg | Loading.png 480x320 | (240,160) | (0,0) | 0 |
| title | sprites_title_alpha.png 224x96 | (240, 312 - 96/2 = 264) | (128,8) | 1 |

The title overlays Loading.png's baked-in title pixel-exactly. This was checked: the best alignment is the canvas offset (128,8).

`beginLoading:` is scheduled **every frame**. Each call does `totalTime += dt`, then runs one step of a switch on `loadingPosition` (0..28), then `loadingPosition++`:
* 0: preload sprites_title_alpha.png
* 2: preload bg_grass.png
* 5: `PlayerSkinLoader getSkin:@"MedievalSkin"`
* 6: castleconflict.mp3
* 7..28: preload SFX in this order: explosionbig, explosion, buy, yay, birdies, blimp, bomber, castlehit, groundkill, select, treechop, swap, fireball, ice, castleupg, no2, petardfuse, polytree, polymorph, surf, treestick, bombsaway (.wav)
* 1, 3, 4: no-op
* ≥29: `done = YES`

When `done && totalTime >= 2.0`:
* unschedule beginLoading
* `schedule:leaveScene: interval:1.0`
* add `bg_grass.png` at (240,160) (`addChild:`, z0, drawn above Loading.png and below the title) with opacity 0, then `FadeIn 1.0s`
* add `FauxGameLayout` (castles + towers, §3.1) with opacity 0, then `FadeIn 1.0s`

So the loading screen shows for **≥2.0 s**, then cross-fades over 1.0 s into the menu background.

`leaveScene:` (fires 1.0 s later) → `[Director replaceScene:[[MenuScene alloc] initWithFade:YES]]`, with no transition. The new scene already looks identical: grass, castles and logo.

## 3. MenuScene / MenuLayer (main menu)
`MenuScene initWithFade:` @3a38. `MenuScene init`/`node` = `initWithFade:NO`. Only LoadingScene uses `YES`. Every other return to the menu (GameOver, GoodJob, quit, multiplayer/preview/survey back, world-map quit) uses `node`/`init`, i.e. NO.

Scene graph:
* scene z0: `bg_grass.png` at (240,160)
* scene z1: `MenuLayer`. In MenuLayer:
  * `menuLogo` = sprites_title_alpha.png at (240,264), `addChild:` z0 (canvas top-left (128,8))
  * `FauxGameLayout` z2
  * `mainMenu` (Menu) z5
* Music: `[[AudioPlayer sharedPlayer] playBgMusic:@"castleconflict.mp3" withLooping:NO]`. The file is 13.04 s and plays **once**. `MenuScene dealloc` calls `stopBgMusic`.

### 3.1 FauxGameLayout (`initWithTowers:YES`; @135c0)
An AtlasSpriteManager on `spr_castles_alpha.png` (z2 inside). The same layout is used by LoadingScene, MenuScene, SettingsScene and CampaignLoadingLevelScene(mimicHome). The towers are added after the castles, so they draw on top. No flipping.

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| castle1 (blue) | spr_castles_alpha.png | (0,80,96,112) | — | — | (48,89) | (0,175) | (w/2, 33+h/2) |
| castle2 (red) | spr_castles_alpha.png | (96,80,96,112) | — | — | (432,89) | (384,175) | (480-w/2, 33+h/2) |
| tower1 | spr_castles_alpha.png | (288,0,48,96) | — | — | (24,177) | (0,95) | castle top + h/2 - 16 |
| tower2 | spr_castles_alpha.png | (336,0,48,96) | — | — | (456,177) | (432,95) |  |
| (MenuLayer, not Faux) title logo | sprites_title_alpha.png | (0,0,224,96) | — | — | (240,264) | (128,8) | (240, 312 - h/2) |

### 3.2 Main menu Menu
`Menu menuWithItems:` order is **Campaign, Quick Play, Multi-Player, About us**. The Menu sits at **(240,112)**, then `alignItemsVertically` (padding 5, @3ff94):
* totalH = Σh + 5(n-1) = 4·48 + 15 = 207
* item_i.y = 207/2 - Σ(previous h + 5) - h_i/2 → local y +79.5, +26.5, -26.5, -79.5, x = 0

After that, two 48x48 items are `addChild`-ed to the same Menu with explicit local positions.

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| Campaign Mode → startCampaign: | buttons | (384,0,96,48) | (384,48,96,48) | — | (240,191.5) | (192,104.5) | menu child #1 |
| Quick Play → showQuickPlayMenu: | buttons | (384,96,96,48) | (384,144,96,48) | — | (240,138.5) | (192,157.5) | #2 |
| Multi-Player → multiPlay: | buttons | (576,288,96,48) | (576,336,96,48) | — | (240,85.5) | (192,210.5) | #3 |
| About us → credits: | buttons | (480,288,96,48) | (480,336,96,48) | — | (240,32.5) | (192,263.5) | #4 |
| Preview (pyramid i) → preview: | buttons | (768,384,48,48) | (768,432,48,48) | — | (40,32) | (16,264) | added to same Menu at local (-200,-80) |
| Survey (scroll) → survey: | buttons | (816,384,48,48) | (816,432,48,48) | — | (440,32) | (416,264) | local (200,-80) |

The y positions 191.5 etc. are half-pixel. The original uses GL_LINEAR, so these buttons are drawn at a .5 offset and look very slightly soft. For pixel-exact output, draw at y = 104.5 etc. with smoothing on, or floor to 104 (**choice, not determined**).

Fade-in (`initWithFade:YES` only): `mainMenu.opacity = 0` → `FadeIn 0.5s`, and `active = NO` until `schedule:activate: interval:0.5`. That timer sets `active=YES`; it is never unscheduled, which does no harm. With fade=NO the menu is opaque and active immediately (`active = !fade`).

Handlers. Each does nothing if `!active`, otherwise plays `select.wav` first:

| button | action |
|---|---|
| Campaign Mode | `hideMenu` (removeChild mainMenu (retained), flagSprite hidden; flagSprite is never assigned, so nil and a no-op), then add `SelectCampaignLayer initWithOwner:self` at **z5** (§6). The logo stays visible. |
| Quick Play | `hideMenu`, then `addChild:` `QuickPlayLayer initWithOwner:self` (z **0**) (§4). The logo stays. |
| Multi-Player | `replaceScene:[MultiplayFileSelectScene init]` (§10.3) |
| About us | `hideMenu` + `hideLogo` (logo invisible), then add `CreditsLayer initWithOwner:self` z5 (§7) |
| Preview (pyramid) | `replaceScene:[PreviewUpdateScene init]` (network content; out of scope) |
| Survey (scroll) | `replaceScene:[SurveyScene init]` (network survey; out of scope) |

`returnFromLayer:layer` (@31bc) re-adds mainMenu at z5 at its existing opacity, removes `layer` (cleanup), and sets the logo visible again. It is called by the QuickPlay "Main Menu", the SelectCampaign "Main Menu" and the Credits "Main Menu".

There is **no Help or Settings button on the main menu**. Settings is reachable only via Quick Play → Custom. Help is reachable only from the in-battle "?" button (`GameScene help:` pushes HelpScreen, §8).

## 4. Quick Play
### 4.1 QuickPlayLayer (@9f23c)
This is a child of MenuLayer at z0. The grass, castles and logo remain visible. The castles (z2) therefore draw **above** this layer and above its OverwriteLayer banner (see 4.2). The Menu is at (240,112) with alignItemsVertically and 3 items: totalH 154, local y +53, 0, -53.

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| Play! → play: | buttons | (192,192,96,48) | (288,192,96,48) | — | (240,165) | (192,131) |  |
| Custom → settings: | buttons | (0,96,96,48) | (192,96,96,48) | — | (240,112) | (192,184) |  |
| Main Menu → menu: | buttons | (96,0,96,48) | (288,0,96,48) | — | (240,59) | (192,237) |  |

* **Play!** (@9ecec): `select.wav`. If `dataFilePath` exists (a saved battle), it adds `OverwriteLayer` as a child of this layer and removes its own menu (retained), so no Main Menu is available any more. Otherwise it creates `BattleParams init` (§4.4), then `replaceScene:[[CampaignLoadingLevelScene alloc] initWithBattleParams:p mimicHome:YES withTower:YES]` (§4.5).
* **Custom** (@9ec5c): `select.wav`, then `[Director pushScene:[SettingsScene node]]` (§5). MenuScene stays alive underneath, so the music keeps playing.
* **Main Menu** (@9ebf4): `select.wav`, then `[owner returnFromLayer:self]`.
* This layer has no `active` guard.

### 4.2 OverwriteLayer: "A saved game was found." (@9ef10)

| node | details |
|---|---|
| help_banner.png | Sprite at (240,165) z0, canvas top-left (0,107) |
| "A saved game was found." | whiteText (23 chars, 368 px) at (240,175), canvas centre y 145, top-left (56,135) |
| "(Starting a new game will erase your streak)" | tinyWhite (44 chars, 352 px) at (240,155), canvas centre y 165, top-left (64,160). **Only if `[GameScore sharedScore].numConsecutiveWins > 0`** |
| Menu | default (240,160) |
| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| help_banner.png | help_banner.png | (0,0,480,96) | — | — | (240,165) | (0,107) | Sprite z0 |
| New Game → yes: | buttons | (0,0,96,48) | (192,0,96,48) | — | (190,110) | (142,186) | local (-50,-50) |
| Continue → continueGame: | buttons | (0,48,96,48) | (192,48,96,48) | — | (290,110) | (242,186) | local (50,-50) |

* **Continue** (@9e838): beacon "ContinueGame", `select.wav`. It unarchives `kSaveKey` from dataFilePath, builds `[[GameMode alloc] initWithLayer:saved]`, **deletes the save file**, and runs `replaceScene:` straight into the battle, with no loading scene.
* **New Game** (@9ea3c): deletes the save file, then `[GameScore sharedScore] clearStreak`, `select.wav` and beacon "NewGame". Then `BattleParams init` and `[[CampaignLoadingLevelScene alloc] initWithBattleParams:p mimicHome:YES]` → replaceScene.
  * **Binary bug:** `CampaignLoadingLevelScene` implements only `initWithBattleParams:mimicHome:withTower:` (objc.txt lists `initWithBattleParams:mimicHome:` only on `CampaignLoadingLevelLayer`). On the device this message should therefore raise "unrecognized selector" and crash, after the save and streak were already cleared.
  * **Web port:** treat it as `mimicHome:YES withTower:YES`, i.e. identical to a fresh Quick Play start. This is a deliberate deviation.
* The banner covers canvas y 107..203. The castles/towers of FauxGameLayout (canvas x 0..96 and 384..480, y 95..241) are drawn on top of it because of the z-order noted above. This follows from the z-orders and is not visually verified.
* Where the save comes from: `GameScene quit` with gameMode 0 (quick play) replaces to `MenuScene node` and then calls `[self save:]`, so "Quit" in a quick battle saves it. App termination during any GameScene also saves (§1). Only Continue and New Game delete the file. Settings → Play! ignores and keeps any existing save.

### 4.3 Quick play has no level select, no skin select and no unit choice
"Default units" (672,192), "Level select" (672,288), "Lobby", "Create" and FILE 4-6 belong to the **multiplayer** screens only (§10.3). In single-player Quick Play, Play! always starts the same fixed battle.

### 4.4 What `BattleParams init` (@80a00) builds (the quick-play battle)
* `CampaignState initWithId:-1` (@74e54) for the player:
  * start units **[2, 0, 1]** = Wood Cutter, Foot Soldier, Heavy Soldier
  * startHealth 80, skin MedievalSkin, techPoints 0, upgradesAvailable [3], unlockedSkins [0]
  * then `startData.upgrades += 0` (upgrade 0 = "Tower")
* Enemy `MapCastleData init` (@8042c):
  * startHealth 80, MedievalSkin, startGold 25, techPointValue 5, treeGrowthRate 1, attackGround/Air YES, naval NO, allowsHeals NO, flipped NO, castleId 0, no units listed
  * then `startData.upgrades += 0`
  * level scenery: SceneryInfo type 0 at (0,0), then type 2 at (235,180), (345,110), (245,40)
* `settings = [GameSettings loadSettings]`, gameMode 0, scenerySkin `@"Scenery"`, foreground `@"EgyptianForeground"`.
* It is **not random** and MultiplayerLevels.xml is not used.
* How GameSettings are applied (`-[GameScene loadSettings]` @18490), for reference:

| setting | value → effect |
|---|---|
| treeGrowthRate | 0 Low → chanceOfTree 170, treeRatio 1, maxTrees 5 · 1 Normal → 130/1/10 · 2 High → 90/1/12 |
| difficulty | 0 Easy → aiFrequency 4.0, startGold 40 · 1 Medium → 1.5, 25 · 2 Hard → 0.3, 5 |
| gameLength | 0 Long → both castles maxHealth 250 · 1 Normal → 120 · 2 Quick → 80 |
| allowHeals | copied to the GameScene |

Both castles then get `addCannon`.

### 4.5 CampaignLoadingLevelScene (between Play! and the battle) (@c6734, layer @c693c / load: @c6284)
* `mimicHome:YES` (quick play):
  * scene: `bg_grass.png` (240,160) + `FauxGameLayout initWithTowers:withTower` at z1
  * layer: bannerSprite (240,165) with child whiteText **"Loading Battle..."** at local (240, 96*0.5=48), i.e. screen (240,165), canvas centre y 155, top-left (104,145)
* `mimicHome:NO` (campaign): scene bg = `campaignLoading.png` (240,160), with no banner.
* `schedule:load: interval:0.1`. Steps 0..7 preload skins/textures. Step 8 builds `GameMode initWithBattleParams:`. If there is a banner, it runs `FadeOut 0.75s` on the banner and the text, then `schedule:goToGameScene: interval:0.75`; otherwise goToGameScene immediately. goToGameScene = `replaceScene:` with no transition.
* Total ≈ 0.9 s + 0.75 s.

## 5. SettingsScene / SettingsLayer (Quick Play → Custom) (@11414, @11594)
* Scene: `bg_grass.png` (240,160) z0, then `FauxGameLayout init` (towers) via `addChild:`, then `SettingsLayer node` at z1. There is no title logo.
* All items live in one Menu. It is created with the default position and then moved to `(pos.x, pos.y+8)` = **(240,168)**. Item positions below are local to the Menu. Menu child order: lowGrowth, quickGrowth, normalGrowth, "Tree Growth Rate", quickLength, normalLength, longLength, "Game Length", easy, medium, hard, "Difficulty", "Health Pickup", healOff, healOn, Back, Play!

Section labels (whiteText 16x20, MenuItemAtlasFont, target nil, so they zoom 1.2 on touch):

| text | local | cocos centre | canvas centre | width |
|---|---|---|---|---|
| Health Pickup | (0,130) | (240,298) | (240,22) | 208 |
| Game Length | (0,70) | (240,238) | (240,82) | 176 |
| Difficulty | (0,10) | (240,178) | (240,142) | 160 |
| Tree Growth Rate | (0,-50) | (240,118) | (240,202) | 256 |

Option buttons are 80x32 "checkbox" images:
* **normal = unchecked**, **disabled = checked**, selected = same as normal, so there is no press feedback.
* The currently chosen option is the **disabled** item, drawn as the checked image (x=0 column for most rows, x=64 for On/Off). The other options in its group are enabled.
* Tapping an enabled option plays `select.wav`, disables it, enables its siblings and sets the value.

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| Off → setHealOff: | buttons | (144,480,80,32) | (144,480,80,32) | (64,480,80,32) | (140,268) | (100,36) | local (-100,100) |
| On → setHealOn: | buttons | (144,448,80,32) | (144,448,80,32) | (64,448,80,32) | (340,268) | (300,36) | local (100,100) |
| Quick → setQuickLength: | buttons | (80,192,80,32) | (80,192,80,32) | (0,192,80,32) | (140,213) | (100,91) | local (-100,45) |
| Normal → setNormalLength: | buttons | (80,224,80,32) | (80,224,80,32) | (0,224,80,32) | (240,213) | (200,91) | local (0,45) |
| Long → setLongLength: | buttons | (80,256,80,32) | (80,256,80,32) | (0,256,80,32) | (340,213) | (300,91) | local (100,45) |
| Easy → setEasyDifficulty: | buttons | (80,384,80,32) | (80,384,80,32) | (0,384,80,32) | (140,153) | (100,151) | local (-100,-15) |
| Medium → setMediumDifficulty: | buttons | (80,320,80,32) | (80,320,80,32) | (0,320,80,32) | (240,153) | (200,151) | local (0,-15) |
| Hard → setHardDifficulty: | buttons | (80,416,80,32) | (80,416,80,32) | (0,416,80,32) | (340,153) | (300,151) | local (100,-15) |
| Low → setLowGrowth: | buttons | (80,288,80,32) | (80,288,80,32) | (0,288,80,32) | (140,93) | (100,211) | local (-100,-75) |
| Normal → setNormalGrowth: | buttons | (80,224,80,32) | (80,224,80,32) | (0,224,80,32) | (240,93) | (200,211) | local (0,-75) |
| High → setQuickGrowth: | buttons | (80,352,80,32) | (80,352,80,32) | (0,352,80,32) | (340,93) | (300,211) | local (100,-75) |
| Back → mainMenu: | buttons | (96,48,96,48) | (288,48,96,48) | — | (190,38) | (142,258) | local (-50,-130) |
| Play! → play: | buttons | (192,192,96,48) | (288,192,96,48) | — | (290,38) | (242,258) | local (50,-130) |

The visual layout was mock-composited and checked: rows don't overlap. Value mapping (setters @1094c..@110e4):

| group | button → stored value |
|---|---|
| Difficulty (`difficulty`) | Easy 0, Medium 1, Hard 2 |
| Game Length (`gameLength`) | **Long 0, Normal 1, Quick 2** |
| Tree Growth (`treeGrowthRate`) | Low 0, Normal 1, High 2 (the setter is called `setQuickGrowth:`) |
| Health Pickup (`allowHeals`) | On YES, Off NO |

Note the on-screen order: Off is on the **left**, On on the right.

Initial enabled states: each option is enabled iff the current value ≠ its value. healOn.enabled = !allowHeals and healOff.enabled = allowHeals.

**GameSettings** (@101ec..@1067c):
* Defaults when there is no file: difficulty **0 (Easy)**, gameLength **1 (Normal)**, treeGrowthRate **1 (Normal)**, allowHeals **YES**, hasTrophy NO.
* Persisted with NSKeyedArchiver: root key `kSettingsKey` in `FilePaths settingsFilePath`, fields `kTreeGrowthRate`, `kDifficultyLevel`, `kGameLength` (int32), `kAllowHeals`, `kHasTrophy` (bool). **Web:** store in localStorage as JSON.
* Saved only when leaving the screen, by Back or Play!

Buttons:
* **Back** (`mainMenu:` @11344): `select.wav`, `saveSettings`, then `popScene` back to the main menu with QuickPlayLayer still showing.
* **Play!** (`play:` @111ac): `select.wav`, `saveSettings`, then `popScene`, beacon "NewGame", `BattleParams init` → `CampaignLoadingLevelScene initWithBattleParams:mimicHome:YES withTower:YES` → `replaceScene`. It does **not** check for a saved game.
* `Defaults descriptionForTreeGrowth:` maps 0 "Sparse", 1 "Average", 2 "Fertile". These names are not shown on this screen but are used by the campaign map info.

## 6. Campaign file select
### 6.1 SelectCampaignLayer (@77260)
This is a child of MenuLayer at z5. The logo, grass and castles stay visible. The Menu is at (240,112) with alignItemsVertically, using the same geometry as the main menu. **Only 3 save slots**: FILE 1-3. The FILE 4-6 images in the atlas are unused.

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| FILE 1 (tag 1) → startGame: | buttons | (480,0,96,48) | (576,0,96,48) | — | (240,191.5) | (192,104.5) |  |
| FILE 2 (tag 2) → startGame: | buttons | (480,48,96,48) | (576,48,96,48) | — | (240,138.5) | (192,157.5) |  |
| FILE 3 (tag 3) → startGame: | buttons | (480,96,96,48) | (576,96,96,48) | — | (240,85.5) | (192,210.5) |  |
| Main Menu → cancel: | buttons | (96,0,96,48) | (288,0,96,48) | — | (240,32.5) | (192,263.5) |  |

The FILE buttons look the same whether or not the slot has data. Before tapping there is no per-slot text.

* `startGame:` (@762c4): needs `active`. `select.wav`, then `tag` = slot id.
  * If `FilePaths campaignFileForId:tag` exists, it unarchives `kCampaignKey` into a CampaignState.
  * Else it creates `[CampaignState initWithId:tag]` (fresh: units [2,0,1], 80 HP, owns nothing).
  * Then it adds `CampaignInfoLayer initWithCampaignState:owner:self` as a child, `setMenuEnabled:NO` and `active=NO`.
* `setMenuEnabled:b` (@7651c): every menu child gets `setIsEnabled:b` and `setOpacity: b?255:0`. The FILE buttons become **invisible** while the info panel is up.
* `reactivate`: `active=YES`, `setMenuEnabled:YES`.
* `cancel:` (Main Menu): `select.wav`, then `[owner returnFromLayer:self]`.

### 6.2 CampaignInfoLayer (per-slot panel) (@76970)
The layout matches the in-game castle-info banner in the video (frames sheet01: title y≈125, icons y≈175, buttons y≈220 canvas). That confirms the geometry.

| node | font | cocos pos | canvas | condition |
|---|---|---|---|---|
| help_banner.png | sprite z0 | (240,165) | top-left (0,107) | always |
| `"Campaign %d"` (id = slot 1..3) | white 16x20 | (240,195) centred | centre (240,125) | slot owns castle 0 (`ownsCastle:0`), i.e. an existing campaign |
| `"Tech Points: %d"` (`techPoints`) | tiny 8x10 | x = 20 + w/2 (**left-aligned at x=20**), y=175 | left edge x=20, centre y=145 | existing |
| `"Castles Conquered: %d/%d"` (`numCastlesOwned` / (`hasSetEgyptSkin` ? **39** : **20**)) | tiny | x = 480 - (20 + w/2) (**right-aligned at x=460**), y=175 | right edge 460, centre y 145 | existing |
| `"New Game"` | white | (240,195) | centre (240,125) | slot has no campaign |
| unit icons, one per `startData.units` | `Defaults getButtonForUnit:fromAtlas:skin.left.buttonTexture` (48x48 MenuItemAtlasImageImmediate, target nil), **scale 0.75** (→36 px) | x_k = int(240 - 18·(n-1)) + 36·k, y = 145 | centre y 175 | always (new: Wood Cutter, Foot Soldier, Heavy Soldier at x 204/240/276) |

* Unit icon source rect = the unit's `hud` offset in content.json, size 48x48. The selected rect is +96 in y; this was verified for one unit only (case @73138), and the general pattern is a **GUESS** for the others.
* The icons and labels are added directly to the layer, not to a Menu, so they are inert.
* No "Rank" / "Victories" text appears here. See §6.4.

Menu (default (240,160)):

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| help_banner.png | help_banner.png | (0,0,480,96) | — | — | (240,165) | (0,107) | Sprite z0 |
| Back → cancel: (existing) | buttons | (96,48,96,48) | (288,48,96,48) | — | (120,100) | (72,196) | local (-120,-60) |
| Delete → delete: (existing only) | buttons | (384,384,96,48) | (384,432,96,48) | — | (240,100) | (192,196) | local (0,-60) |
| Play! → play: (existing) | buttons | (192,192,96,48) | (288,192,96,48) | — | (360,100) | (312,196) | local (120,-60) |
| Back → cancel: (new) | buttons | (96,48,96,48) | (288,48,96,48) | — | (160,100) | (112,196) | local (-80,-60) |
| Play! → play: (new) | buttons | (192,192,96,48) | (288,192,96,48) | — | (320,100) | (272,196) | local (80,-60) |

* **Play!** (@75f20): needs `active`. beacon "PlayCampaign", `select.wav`.
  * **New campaign** (`!ownsCastle:0`): `BattleParams initWithCampaignState:state data:CastleDataLoader.castleData[0] settings:loadSettings gameMode:1 scenerySkin:@"Scenery" foregroundSkin:@"EgyptianForeground"` → `CampaignLoadingLevelScene initWithBattleParams:mimicHome:YES withTower:NO`. That shows the grass + castles (no towers) + "Loading Battle..." banner, then the battle for the home castle.
  * **Existing**: `replaceScene:[WorldMapScene initWithState:]` (campaign map, out of scope).
* **Back** (`cancel:` @75e78): needs active. `select.wav`, remove self from parent, then `[owner reactivate]`; the FILE buttons reappear.
* **Delete** (`delete:` @75d60): needs active. `select.wav`, then add `DeleteConfirmLayer initWithCampaignState:state owner:self selectCampaignLayer:owner` **to self.parent** (the SelectCampaignLayer), and set this layer `visible = NO` and `active = NO`.

### 6.3 DeleteConfirmLayer: "Really Delete?" (@76688)

| node | pos |
|---|---|
| help_banner.png | (240,165) |
| "Really Delete?" whiteText (224 px) | (240,160), canvas centre (240,160), top-left (128,150) |

Menu (default (240,160)):

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| NO → cancel: | buttons | (96,144,96,48) | (288,144,96,48) | — | (160,100) | (112,196) | local (-80,-60) |
| YES → delete: | buttons | (96,96,96,48) | (288,96,96,48) | — | (320,100) | (272,196) | local (80,-60) |

* **NO** (@75b7c): `select.wav`, remove self, then `[owner reactivate]`. CampaignInfoLayer's `reactivate` (@75b50) sets `active=YES` **and `visible=YES`**.
* **YES** (@75c0c): delete `campaignFileForId:state.campaignId`, `select.wav`, remove self, remove the CampaignInfoLayer, then `[selectCampaignLayer reactivate]`. This returns to FILE 1-3, and the slot now shows "New Game".
* The invisible CampaignInfo menu still has items at y=100. The confirm menu was created later, so it wins where they overlap; elsewhere the old menu swallows the tap with no effect (§0.3).

### 6.4 Rank (`+[Defaults getRankForWinPercentage:]` @71bec)
Ranks are used only on `CampaignVictoryScreen showStat2:` (realm-conquered screen), where p = numVictories / numBattles (float):

| p | rank |
|---|---|
| p ≥ 1.0 | Legend |
| ≥ 0.85 | Emperor |
| ≥ 0.70 | King |
| ≥ 0.50 | Duke |
| > 0.25 | Knight |
| else | Squire |

Note that the Knight test is a strict `>`. That screen shows `"Rank: %@"` in white text at y=210 and `"Victories: %d / Battles: %d"`; it belongs to the campaign spec.

`Defaults getNameForCampaign:` maps 0 "The Homeland" and 1 "Egypt".

## 7. Credits ("About us") (CreditsLayer @9e1f4, update: @9dd40, fadeIn: @9dbd0, getYForX: @9dcd4)
CreditsLayer is a child of MenuLayer at z5. The main menu and logo are hidden. The grass and castles remain but get darkened.

| node | font / tex | cocos pos | canvas centre | width |
|---|---|---|---|---|
| colorLayer | ColorLayer (0,0,0,0) at z -1 (full screen) | | | |
| "Stephen Gazzard" | white | (240,280) | (240,40) | 240 |
| "Designer / Programmer / Levels" | tiny white | (240,260) | (240,60) | 240 |
| "Josiah Tobin" | white | (240,230) | (240,90) | 192 |
| "Graphics / Audio / Design" | tiny white | (240,210) | (240,110) | 200 |
| "Our Other Game:" | white | (240,180) | (240,140) | 240 |

Menu at (0,0), so item positions are absolute:

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| Ant Attack logo → showAAInfo: | spr_castles_alpha.png | (384,0,112,64) | — | — | (240,140) | (184,148) | Menu at (0,0); no selected rect |
| Main Menu → mainMenu: | buttons | (96,0,96,48) | (288,0,96,48) | — | (240,30) | (192,266) |  |
| Tevin (TevinWalk anim) | spr_castles_alpha.png | (384,88,16,24) | — | — | (80,54) | (72,254) | start; moves |
| Josiah (JosiahWalk anim) | spr_castles_alpha.png | (384,64,16,24) | — | — | (400,54) | (392,254) | start; moves |

Draw order: colorLayer (z-1) < the credit-sprite AtlasSpriteManager (Credits.xml texture spr_castles_alpha.png) < labels < Menu.

* **Darkening** (`fadeIn:`, every frame): `opacity = (int)(opacity + dt*512)`, stopping once it is >128. At 60 fps it steps by 8 and ends at **136** (≈0.28 s). Black at alpha 136/255 covers bg_grass and the castles.
* **Walkers** (Credits.xml; frames are 16x24 laid out horizontally from (X,Y)):
  * Tevin: walk frames (384+16i, 88), i=0..3, delay 0.15, looping. Wave frames (448+16i, 88), i=0..1, delay **0.25**.
  * Josiah: walk (384+16i, 64) delay 0.15. Wave (448+16i, 64) delay **0.35**.
  * Quirk: Credits.xml's `<Sprite>` named "Josiah" is 112x72. It is replaced by the first walk frame immediately.
* Movement: `update:` runs every frame while `tevin.x < 160`:
  * `tevin.x += 40*dt`, `josiah.x -= 40*dt`
  * each y = `getYForX(x) = 54 + 30*sin(-3.14159*(x-80)/304)` (double maths), so they dip along the grass bowl
  * start positions (80,54) and (400,54); final ≈ (160, 31.9) and (320, 35.6) (cocos)
* When Tevin reaches x ≥ 160 (2.0 s): run the looping TevinWave/JosiahWave animations and unschedule update.
  * The walk animations are **not stopped**. Both Animate actions call setDisplayFrame each tick and the later one (the wave) wins. Effectively the characters stand and wave, one wave frame per 0.25 / 0.35 s.
* **Ant Attack logo** (`showAAInfo:`): needs active. It adds `ShouldLaunchAA initWithCreditLayer:self` as a child and sets `active=NO`. No sound is played.
* **Main Menu** (`mainMenu:`): `select.wav`, then `[owner returnFromLayer:self]`. It does **not** check `active`, so it works even while the App Store dialog is up.

### 7.1 ShouldLaunchAA: "View in App Store?" (@9df38)
* help_banner (240,165). "View in App Store?" whiteText at (240,175), canvas centre y 145, width 288. Menu default (240,160):

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| YES → yes: | buttons | (96,96,96,48) | (288,96,96,48) | — | (290,110) | (242,186) | local (50,-50) |
| NO → no: | buttons | (96,144,96,48) | (288,144,96,48) | — | (190,110) | (142,186) | local (-50,-50) |

* **YES**: `select.wav`, beacon "ViewAntAttack", then `openURL:` `http://itunes.apple.com/ca/app/ant-attack/id335925156?mt=8`. The dialog is not removed. **Web:** open the URL in a new tab and leave the dialog.
* **NO**: `select.wav`, beacon "HideAntAttack", `[owner reactivate]` (active=YES), then remove self.

## 8. Help (HelpScreen @14a74 / HelpLayer @14b9c)
Pushed only from the battle (`GameScene help:` → `select.wav`, then `pushScene:[HelpScreen node]`). It is **one static page**, with no paging.

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| help.png | help.png | (0,0,480,320) | — | — | (240,160) | (0,0) | Sprite z0 (scene) |
| Back → mainMenu: | buttons | (96,48,96,48) | (288,48,96,48) | — | (425,25) | (377,271) | local (185,-135) of Menu@(240,160) |

* Back (`mainMenu:`) → `+[AudioPlayer playSound:@"select"]`, then `popScene` back to the paused battle.
  * The class method `+playSound:` plays select.wav as an iOS System Sound, bypassing the SFX toggle.
* help_banner.png is **not** used by the help screen. It is the generic dialog banner (§0.4).

## 9. Generic dialogs
### 9.1 YesNoLayer `initWithHeader:withMessage:withTarget:withYesSelector:withNoSelector:` (@b2448)
Children in order:
* fadeLayer (0,0,0,100) full screen
* bannerSprite (240,165)
* header whiteText at (240,190), canvas centre y 130. Only if header is non-nil and non-empty.
* message tinyWhite at (240,160), canvas centre y 160. Only if non-empty. It is a single line with no wrapping.
* Menu at (240,0):

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| YES → touchYes: | buttons | (96,96,96,48) | (288,96,96,48) | — | (180,120) | (132,176) | Menu@(240,0), local (-60,120) |
| NO → touchNo: | buttons | (96,144,96,48) | (288,144,96,48) | — | (300,120) | (252,176) | local (60,120) |
| Back → back: (MessageLayer) | buttons | (96,48,96,48) | (288,48,96,48) | — | (240,120) | (192,176) | Menu@(240,0), local (0,120) |

Note that YES is on the **left** here. In OverwriteLayer and ShouldLaunchAA the positive button is on the right.
* YES/NO: `select.wav`, `[target performSelector:yes|no withObject:self]`, then remove self.
* `removeFadedBg` removes just the dim layer.
* Used by: world-map dialogs, multiplayer ask, survey.

### 9.2 MessageLayer `initWithHeader:withMessage:withTarget:withSelector:` (@c40a8)
Identical to YesNoLayer, but with a single **Back** button (96,48) / (288,48) at (240,120): canvas top-left (192,176). `back:` does `select.wav`, `performSelector:onClick withObject:self`, then remove.

## 10. Other listed classes
### 10.1 SelectSkinScene / SelectSkinLayer ("Select your appearance!") (@c52c4, @c5b28)
Entered from the world map's change-skin button (`WorldMapControls changeSkin:`), so it is campaign-side.
* Scene: `shopbg.png` (240,160) z0, then the layer.
* "Select your appearance!" whiteText at (240,280), canvas centre y 40, width 368.
* Skin name: tinyWhite label (`titleFont`, created with " ") at (240,250), canvas centre y 70. Its text is `getNameForSkin:` → 0 "Medieval", 1 "Egyptian Pyramid", 2 "Egyptian Temple".
* Menu at (240,0):

| item | texture | normal rect | selected rect | disabled rect | cocos centre (x,y) | canvas top-left | notes |
|---|---|---|---|---|---|---|---|
| Finished → cancel: | buttons | (672,0,96,48) | (672,48,96,48) | — | (240,40) | (192,256) | Menu@(240,0) local (0,40) |
| ◁ → previousPage: | sprites_conhud_alpha.png | (48,128,48,48) | (48,128,48,48) | — | (90,250) | (66,46) | local (-150,250) |
| ▷ → nextPage: | sprites_conhud_alpha.png | (0,128,48,48) | (0,128,48,48) | — | (390,250) | (366,46) | local (150,250) |

* `updateArrows`:
  * ◁ is enabled (opacity 255) iff `curSkinIndex > 0`, else disabled at opacity 100.
  * ▷ is enabled iff `curSkinIndex < unlockedSkins.count-1`, else disabled at opacity 100.
  * The arrows have no disabled rect, so a disabled arrow is the normal image at 100 alpha.
* Initial `curSkinIndex` = the index in `state.unlockedSkins` whose file name equals the current playerSkin path (default 0).
* next/prev: index ±1, `updateArrows`, `loadCurrentSkin`.
* `loadCurrentSkin`:
  * Shows a temporary layer at z2: bannerSprite plus "Loading Appearance..." whiteText at the banner position (240,165).
  * After 0.05 s (`loadCurrentSkin:`) it loads the skin (`getFileNameForSkin:` → MedievalSkin / EgyptianSkin / EgyptianTempleSkin) and sets `startData.playerSkin`.
  * It spawns one unit per start unit via `UnitFactory createUnit:` at `x = 140 + 80*(i%4)`, `y = 185 - 85*(i/4)`, so row 0 is at canvas centre y 135.
  * It adds a `FauxPlayerCastle initWithUpgrades:cannon:(hasUnit:5) skin:unitSkin:`. Its geometry belongs to the battle/castle spec.
  * Finally it removes the loading layer.
* **Finished** (`cancel:`): `select.wav`, then `replaceScene:[WorldMapScene initWithState:]`. The skin choice persists in the state.

### 10.2 BannerLayer (end-of-battle stats) / ButtonLayer (battle HUD)
These are battle UI and are summarised for completeness.
* **BannerLayer** `initWithVictory:forPlayer:andEnemy:` (@9960):
  * Banner manager `sprites_banners_alpha.png` at z5. Player banner rect (160,0,160,320) (blue) at **x = 24+80 = 104**, y=150. Enemy banner rect (**1**,0,160,320) (red; note the 1-px x offset) at **x = 456-80 = 376**, y=150. Canvas top-left: (24,10) and (296,10); they extend 10 px below the screen.
  * `sprites_winlose_alpha.png` (160x64): VICTORY! = (0,32,160,32), DEFEATED... = (0,0,160,32). On victory: VICTORY! over the left banner and DEFEATED... over the right, both at y=270 (canvas centre 50). On defeat it is swapped.
  * `populateBanner:withData:` builds 12 tinyWhite lines inside a Menu (`textMenu`, z6) centred on the banner x: "Trees Harvested:", value, "Gold Stolen:", value, "Gold Spent:", value, "Units Bought:", value, "Units Lost:", value, "Enemies Killed:", value.
  * Line y starts at `int(150 - 75 + 320/2) = 235` and drops 16 per line, down to 59. Canvas centres are 85..261.
  * Values are `%d` of the score fields treesHarvested, goldStolen, numGoldSpent, numUnitsBought, numUnitsDied, numUnitsKilled. The lines zoom 1.2 on touch (§0.2).
* **ButtonLayer** `initWithUnits:forPlayer:buttonAtlas:` (@739d4):
  * Menu at (0,0) z5. Button i (0-based in add order) is at **x = 48·(i+1), y = 292** (canvas centre y 28), built with `getButtonForUnit:fromAtlas:`. Expects ≤8 units.
  * The double-income button uses sprites_hud (144,48,48,48) / (144,144,48,48), costs **150** and has tag -1.
  * Price label: `"%d"` in **bigblue** font 16x20, child of the button at local (w/2, -10). That puts the screen centre 34 px below the button centre (canvas y≈62).
  * `updateButtonOpacity`: opacity **100 if price > gold**, else 255.
  * Buy plays `buy.wav` and is ignored while the Director is paused.

### 10.3 Multi-Player button → MultiplayFileSelectScene (local part only; @ad9dc/@ae058)
* `shopbg.png` (240,160). Its own layer and Menu at (0,0).
* "Select unit set:" whiteText at (240,300).
* **"Default units"** (672,192) / (672,240) at (240,240) → `selectQuickplay:`. This creates CampaignState(-1) with MedievalSkin, startHealth **120** and units = `Defaults defaultUnitList` = **[2,3,0,1,4,6,7,5]**, then shows the MultiplayUnitPreviewLayer.
* For each existing campaign file k∈1..3: a FILE k button (480,48(k-1)) / (576,48(k-1)). If at least one exists, it adds tinyWhite "(Campaign Units)" at (240,165) and places the n buttons at y=135, x = 240 - 50(n+1) + 100k.
  * Bug: the layout loop uses `getChildByTag:1..n`, so gaps in slot numbers misplace buttons.
* Main Menu (96,0) at (240,33) → `replaceScene:[MenuScene initWithFade:NO]`.
* Everything after this (lobby, Bluetooth/wifi, level select arrows (672,384)/(720,384)) is network play and out of scope.

## 11. Audio (AudioPlayer @a7d4..@aae0)

| call | implementation |
|---|---|
| `playBgMusic:withLooping:` | `CDAudioManager rewindBackgroundMusic` then `playBackgroundMusic:loop:`. If `playMusic==NO` it is paused straight away. |
| `stopBgMusic` | `CDAudioManager stopBackgroundMusic` |
| `playSound:` (instance) | `SimpleAudioEngine playEffect:` if `playSFX` |
| `+playSound:name` (class) | AudioServices system sound `name.wav`, which ignores the toggle |
| `loadSound:` | `preloadEffect:` |

* `playMusic` and `playSFX` are both YES and are never changed by game code.
* **No volume calls exist in game code.** `setVolume:` / `setBackgroundMusicVolume:` / `setMute:` appear only inside the CocosDenshion library. Use the defaults: music 1.0, effects 1.0.

| screen | music |
|---|---|
| LoadingScene | none (it only preloads) |
| MenuScene (and QuickPlay, Settings (pushed over it), SelectCampaign, Credits, Overwrite) | `castleconflict.mp3`, **once, no loop** (13.04 s). It restarts every time a MenuScene is created and stops when MenuScene deallocs, i.e. on replaceScene to the battle, map or multiplayer. |
| Help (pushed from battle) | the battle music keeps playing |
| SelectSkin / MultiplayFileSelect | inherits whatever is playing. GUESS: silence, because they are entered by replaceScene from scenes whose dealloc stops music (WorldMap is not checked). |
| battle | scenery music via `SceneryLoader addScenery:` (looping). Out of scope. |

SFX in menus:
* `select.wav` (0.178 s) on every button.
* `buy.wav` for HUD purchases.
* `explosionbig.wav` on the CampaignVictory stats.

## 12. Implementation checklist (web)
* Build one generic `AtlasButton{tex, normal, selected?, disabled?, x, y, enabled, opacity, onActivate}` and one `Menu{x,y,items}` that follow §0.1/§0.3. Hit-test menus newest-first; a touch-down inside any item rect claims the touch, even if the item is invisible or disabled.
* Text: `drawText(str, font, cx, cy)` with a monospace advance of 16 (or 8), centred. Skip glyphs with c<33 but still advance.
* State persisted in localStorage:
  * `settings` {difficulty:0, gameLength:1, treeGrowthRate:1, allowHeals:true, hasTrophy:false}
  * `campaign1..3`
  * `quickSave` (written on quick-battle Quit and on page unload while in a GameScene; deleted by Continue/New Game)
  * `streak` (numConsecutiveWins)
