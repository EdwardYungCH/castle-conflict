# Castle Conflict 1.85 – Battle end, results screens, scoring, achievements, trophy/unicorn, quit dialog

Every value below comes from `/home/claude/re/ann.txt` (method @address is given). **GUESS** marks inference. VFP words that ann.txt left as `.long` were decoded one at a time with `llvm-mc`. Float literals were read from the Mach-O.

**Coordinates.** The notation is `cocos (x,y)` → `canvas (x, 320-y)`. Everything is **centre-anchored** (sprites, menu items, `MenuItemAtlasFont` labels). For a w×h item the canvas top-left is `(cx-w/2, cyCanvas-h/2)`. `Menu` defaults to position (240,160), and an item position is relative to its menu.

**Abbreviations:**
- **BTN** = `sprites_buttons_alpha.png`. Rects are (x,y,w,h) with the origin at the top-left of the texture. These are the buttons used here:

| Button | normal | selected (pressed) |
|---|---|---|
| Continue | (0,48,96,48) | (192,48,96,48) |
| Back | (96,48,96,48) | (288,48,96,48) |
| YES | (96,96,96,48) | (288,96,96,48) |
| NO | (96,144,96,48) | (288,144,96,48) |
| Replay | (384,192,96,48) | (384,240,96,48) |
| Map | (384,288,96,48) | (384,336,96,48) |

  These are `MenuItemAtlasImage`: the item shows the selected rect while the finger is down and fires on touch-up inside.
- **WHITE(s)**: `sprites_font_alpha.png` with 16×20 cells, 20 per row, first char `'!'`. Glyph index = code−33, col = idx%20, row = idx/20. A space is blank but still advances 16 px. The label is w = 16·len, h = 20 (`+[Defaults whiteTextWithString:]` @721b4).
- **TINY(s)**: `tinyfont_white_alpha.png` (160×50) with 8×10 cells, 20 per row and start `'!'`. The label is w = 8·len, h = 10 (@7212c).
- All text labels are `MenuItemAtlasFont`.
  - Some are placed in a `Menu` with a nil or no-op target; touching those does nothing. cocos2d 0.8 `MenuItemLabel` zooms to 1.2× while touched (**GUESS**, standard cocos 0.8 behaviour).
  - Others are added straight to a layer with `addChild:`. Those are plain labels.
- **help_banner.png** is 480×96: a purple strip with gold edges. **FADE** = `+[Defaults fadeLayer]`, a full-screen ColorLayer rgba(0,0,0,100/255).
- **Music:** `GameMode` `onExit`/`dealloc` calls `stopBgMusic` and `stopSounds` (@18c48), so every results screen is **silent**. The exceptions are `select.wav` on each button and `ccwin.mp3` on the campaign victory screen.

---

## 1. End-of-battle sequence (GameScene)

### 1.1 `checkEndCondition` @17790
It runs each update while `!gameOver`.
- **Trigger:** `you.castle.health <= 0` OR `enemy.castle.health <= 0`.
  - In multiplayer (`gameMode==2`) only your own death triggers it locally.
- **Loser:** `loser = (enemy.health <= 0) ? enemy : you`. If both castles fall in the same tick, **the enemy is the loser**, which counts as a player victory.
- **Calls:** `beginGameOverSequence`. In multiplayer it also sends packet TYPE 17.

### 1.2 `beginGameOverSequence` @1ab90
- **Immediately:**
  - `gameOver = YES`.
  - Every unit of the **loser** is removed (`removeObject:fromList:`).
  - The battle HUD menu (`Layer.menu`) is removed. Unit buttons, pause, quit and the trophy button all disappear.
- **Explosions:** `schedule spawnCastleDeathExplosion:` every 0.1 s (@1df10).
  - Each tick does `numCastleExplosions++` and spawns a `CastleExplosion` with the loser's skin.
  - It is added to the loser skin's `atlasSpriteManager` at z2.
  - Position: `(int)(castle.x + rand()%60 − 30)`, `(int)(castle.y + rand()%60 − 30)`.
  - Ticks 1–8 play `explosion.wav`. Tick 9 (count>8) plays `explosionbig.wav` and unschedules. This gives 9 explosions at t = 0.1 … 0.9 s.
- **Debris at t = 1.0 s:** `changeCastleToDebris:` @1dc0c.
  - Adds sprite `"CastleDebris"` from the loser's castle skin. The friendly loser uses `campaignState.startData.playerSkin.left.castleSkin`; the enemy loser uses `castleData.startData.playerSkin.right.castleSkin`.
  - Position: x = castle.x, y = `castle.y − castle.h/2 + debris.h/2`, so the debris is bottom-aligned with the castle.
  - The castle (`removeFromScene`) and the loser's cannon are removed.
  - **Note:** it is a scheduled selector and is never unscheduled. It is harmless only because the scene is replaced at t = 2 s.
- **Results at t = 2.0 s:** `goToGameoverState:` @16130.
  - **Achievements:** `achievementManager finalise:self` (§6).
  - **Branch on `params.gameMode`:**

| gameMode | next scene | arguments |
|---|---|---|
| 0 (quick play) | `GameOverScene initWithVictory:forPlayer:andEnemy:forDifficulty:forMaxHealth:` (§2) | victory = `enemy.castle.health <= 0`; player = you; enemy; difficulty = `params.settings.difficulty`; maxHealth = `you.maxCastleHealth` |
| 1 (campaign) | `CampaignResultScreen initWithBattleParams:victory:achievements:` (§4) | params, victory = `enemy.castle.health <= 0`, achievementManager |
| 2 (multiplayer) | `MultiplayResultsScene initWithBattleParams:withVictory:withGameScore:withEnemyScore:` | out of scope. Short version: castle background, `bannerSprite`, WHITE "You win!" or "You Lose!", Continue/Replay(rematch) |

  - The scene change is `Director replaceScene:` with no transition.

### 1.3 Score (per-player counters, class `Score`, in `PlayerState.score`)
| Field | Archive key | How it changes |
|---|---|---|
| treesHarvested | `kTreesHarvested` | +1 when a tree carrier returns home (moveUnits @1edec) |
| goldStolen | `kGoldStolen` | += `unit.stolenValue` when a thief returns home (@1ecf8) |
| numGoldSpent | `kGoldSpent` | += unit cost in `createUnit` (@719c), and +45 for each cannon shot (`fireCannon:` @16e54; it needs gold > 44) |
| numUnitsBought | `kUnitsBought` | +1 per created unit (@7170) |
| numUnitsDied ("Units Lost") | `kUnitsDied` | changed in `checkUnitUnitCollision` and `checkUnitProjectileCollision` (+1 on the victim owner) |
| numUnitsKilled ("Enemies Killed") | `kUnitsKilled` | same places (+1 on the killer owner) |

The victim/killer attribution in the last two rows is a **GUESS** from the variable names.

---

## 2. Quick-play results: GameOverScene / GameOverLayer / BannerLayer

### 2.1 Scene init @8728 (logic, no visuals)
1. `GameScore.sharedScore updateWithVictory:victory atDifficulty:difficulty` (§5).
2. **Trophy check:** if `difficulty == 2 && player.castle && (float)player.castle.health >= 0.95f`:
   - `GameScore.hasTrophy = YES`.
   - `GameSettings.hasTrophy = YES`, then `saveSettings` is called immediately.
   - Beacon "EarnedTrophy".
   - **Bug, to be replicated:** `health` is the raw integer, not health/max. Every hard win (castle health ≥ 1) therefore earns the trophy, even when the GoodJob screen shows a faded trophy and says "not quite good enough".
3. Add `bg_results.png` (480×320, pink hills) at (240,160) z0, canvas TL (0,0).
4. Add `GameOverLayer` z1.

### 2.2 GameOverLayer @9708
- **ivars:** retains `player`. Stores `curDifficulty` and `maxPlayerHealth`.
- **Menu:** one item, **Continue** (BTN Continue), action `titleScreen:`. `alignItemsVertically` leaves the single item at (0,0), so the menu sits at (240,160). Canvas TL (192,136). Added to the layer at z0.
- **BannerLayer:** `initWithVictory:forPlayer:andEnemy:`, added at z1 and **position (0,10)**. All BannerLayer coordinates below already include the +10.

### 2.3 BannerLayer @9960 and populateBanner @8bd4
- **Children:**
  - `AtlasSpriteManager(sprites_banners_alpha.png)` at z5.
  - `textMenu` (an empty Menu at (0,0)) at z6.
  - `AtlasSpriteManager(sprites_winlose_alpha.png)` at z5, added after textMenu.

| Element | Texture / rect | cocos centre (incl. +10) | canvas TL |
|---|---|---|---|
| Player banner (blue) | banners (160,0,160,320) | (104,160) [x = 24 + w/2] | (24,0) |
| Enemy banner (red) | banners **(1,0,160,320)** (the x offset of 1 is in the original) | (376,160) [x = 456 − w/2] | (296,0) |
| Player result | winlose: victory → "VICTORY!" (0,32,160,32); defeat → "DEFEATED..." (0,0,160,32) | (104,280) | (24,24) |
| Enemy result | the opposite rect | (376,280) | (296,24) |

- **Stat column** (`populateBanner:withData:`):
  - For each banner (player data on the blue banner, enemy data on the red one) there are 12 TINY items with nil target, in this order:
    `"Trees Harvested:"`, `"%d"`(treesHarvested), `"Gold Stolen:"`, `goldStolen`, `"Gold Spent:"`, `numGoldSpent`, `"Units Bought:"`, `numUnitsBought`, `"Units Lost:"`, `numUnitsDied`, `"Enemies Killed:"`, `numUnitsKilled`.
  - x = banner centre x (104 or 376), centred. Item i (0..11) is at cocos y = **245 − 16·i** (start = banner.y − 75 + h/2 = 235, plus the layer offset 10). Canvas centre y = 75 + 16·i, canvas TL y = **70 + 16·i**. Labels are on the even i, values on the odd i.
  - Example: "Trees Harvested:" is 128 px wide, so its TL is (40,70) on the blue banner and (312,70) on the red one.
- **Animation:** none. There are no count-ups, fades or sounds. Everything appears on the first frame.

### 2.4 Continue → `titleScreen:` @89d4
- Plays `select.wav`.
- **If `player.castle.health > 0` (you won):**
  - Release the player and set the ivar to nil.
  - Create `GoodJobLayer initWithDifficulty:curDifficulty health:(float)health/(float)maxPlayerHealth`.
  - `[parent addChild:z:1]` at **position (0,30)**.
  - The GameOverLayer, its banners and its Continue button are **not removed**. They stay drawn underneath.
  - Pressing the old Continue again where it is not covered sees a nil player → health 0 → MenuScene. The relative touch priority of the two menus is a **GUESS**; give the GoodJob menu priority.
- **Else (you lost):** `replaceScene MenuScene`.
- **Draw/edge case:** if both castles died, victory is YES (VICTORY banner, win counted) but health ≤ 0, so this goes straight to the menu.

### 2.5 GoodJobLayer @9134 (all positions include the +30 layer offset)
- **Background:** help_banner at local (240,130) → **(240,160)**, z0, canvas TL (0,112).
- **Message selection.** `h` = health ratio, `d` = difficulty (0 easy, 1 medium, 2 hard). The constants are the float literals **0.7 = MIN_GOODJOB_HEALTH, 0.95 = MIN_TROPHY_HEALTH, 0.25 = MAX_WEAK_HEALTH**.
  - **Title** (WHITE, target self, `nothing:`):
    - d ≤ 1: h > 0.7 → "They didn't stand a chance!"; h < 0.25 → "That was close!"; otherwise "Well done!".
    - d == 2: h > 0.95 → "They didn't stand a chance!"; h < 0.25 → "That was close!"; otherwise "Well done!".
  - **Subtitle** (TINY): d=0 → "Would you like to play again on medium difficulty?"; d=1 → "Would you like to play again on hard difficulty?"; d=2 → h > 0.95 ? "A performance like that deserves a trophy!" : "But not quite good enough to earn a prize...".
- **Menu** (default (240,160) + 30). Items, positions and canvas top-left corners:
  - Title: (0,−10) → (240,180). Canvas centre y 140, TL (240−8·len, 130). For example, "Well done!" has TL (160,130).
  - Subtitle: (0,−40) → (240,150). Canvas centre y 170, TL (240−4·len, 165). The medium question is 400 px wide, TL x 40.
  - d ≤ 1:
    - **YES** at (−75,−75) → (165,115), canvas TL (117,181), action `nextDifficulty:`.
    - **NO** at (75,−75) → (315,115), canvas TL (267,181), action `mainMenu:`.
  - d == 2: a single **Continue** (BTN Continue) at (0,−75) → (240,115), TL (192,181), action `mainMenu:`.
- **Trophy (hard only):**
  - `AtlasSpriteManager(sprites_conhud_alpha.png)` is added at z = d (2). The sprite is rect **(0,208,48,48)**, the big gold cup.
  - Position (430,110) → **(430,140)**, canvas centre (430,180). `rotation = 25°` (cocos rotation is clockwise).
  - If `h < 0.95`, `opacity = 50/255`. At exactly h == 0.95f the cup is opaque but the text says "not quite".
- **Actions:**
  - `nextDifficulty:` plays `select.wav` and sends Beacon "AdvancedDiff". It then sets `GameSettings.difficulty += 1`, calls `saveSettings`, and does `replaceScene [GameMode node]`.
    - **This immediately starts a new quick-play battle** with default BattleParams, which read the new difficulty.
  - `mainMenu:` plays `select.wav` and goes to `replaceScene MenuScene`.
  - `nothing:` is a no-op.
- **Difficulty progression:** an easy win offers medium, a medium win offers hard, and a hard win offers the trophy. A loss or a hard win returns to the menu. Difficulty never goes down automatically.

---

## 3. In-battle quit dialog: ShouldQuitLayer @212b8 (+ GameScene askQuit:/quit/cancelQuit)

### 3.1 `GameScene askQuit:` @16410 (QUIT HUD button, only while `activeHud`)
- Plays `select.wav`.
- **Save message by game mode:**

| gameMode | saveMessage | pause? |
|---|---|---|
| 0 | `"(Your game will be saved)"` | yes |
| 1 | `campaignState.numCastlesOwned != 0 ? "(You will be taken to the map)" : "(You will be taken to the menu)"` | yes |
| 2 | `"Really forfeit?"` (shown as the small second line; the title stays "Really Quit?") | **no** |
| other | `""` | yes |

- `ShouldQuitLayer initWithOwner:self saveMessage:` is added to GameScene at **z6**.
- If a pause is needed: `pause`, then `lockPause`.
- `activeHud = NO`.

### 3.2 Layout
The dialog has no offset; the Menu is at (240,160).

| Element | Detail | cocos centre | canvas TL |
|---|---|---|---|
| FADE | rgba(0,0,0,100/255), full screen | | (0,0) |
| help_banner | z0 | (240,130) | (0,142) |
| Title | WHITE "Really Quit?" (192×20), target self `nothing:` | (240,150) [(0,−10)] | (144,160) |
| Message | TINY saveMessage. Widths: "(Your game will be saved)" 200 → TL x 140; "…to the menu)" 248 → 116; "…to the map)" 240 → 120; "Really forfeit?" 120 → 180 | (240,120) [(0,−40)] | (240−4·len, 195) |
| YES | action `quit:` | (165,85) [(−75,−75)] | (117,211) |
| NO | action `game:` | (315,85) [(75,−75)] | (267,211) |

Menu item order is NO, YES, title, message.

### 3.3 Actions
- **`game:`** plays `select.wav`, then calls `delegate.cancelQuit` if the delegate responds. `cancelQuit` @16bb8 does `unlockPause`, `unpause` and `activeHud = YES`. The layer then removes itself.
- **`quit:`** plays `select.wav`, calls `delegate.quit` and removes the layer. `GameScene quit` @16740 does `unlockPause`, `unpause`, and then:

| gameMode | Result |
|---|---|
| 0 | `replaceScene MenuScene`, then `[self save:nil]`. The quick game is saved and resumable. |
| 2 | MenuScene, plus a network packet TYPE 14 (forfeit) |
| 1, and you do **not** own castle 0 | MenuScene, and the campaign save file `FilePaths campaignFileForId:campaignId` is **deleted** (campaign over) |
| 1, and you own castle 0 | `lastCastleBeat == 1` ? `ShopScene initWithState:showTutorial:1` : `WorldMapScene initWithState:` |

  - Quitting does not count as a battle (no `numBattles++`).
  - The level background texture is unloaded afterwards.
- The same layer is used by `WorldMapControls askQuit:` with "(You will be taken to the menu)".

---

## 4. Campaign results: CampaignResultScreen / CampaignResultLayer @812e8

### 4.1 Scene @81180
- **Background:** `castleData.levelSceneryInfo.backgroundImage` (the battle background, e.g. `bg_grass.png`) at (240,160) z0.
- Then the layer is added.

### 4.2 Layer init
**State changes (applied before anything is shown):**
- `numBattles++`. Retain params and achievements. `active = YES`.
- **On victory:**
  - `numVictories++`.
  - `alreadyOwned = campaignState.ownsCastle:castleId`.
  - `goToGameOverScreen = !alreadyOwned && campaignState.ownAllCastlesAfterWinning:castleId`.
  - **Tech points:** `tp = castleData.techPointValue` (content.json `techReward`) + Σ techPointValue of the achieved achievements. If `alreadyOwned`, then `tp = tp/2` (integer division, truncated). `campaignState.techPoints += tp`.
  - **If `!alreadyOwned`:**
    - `winCastle:castleId` and `setLastCastleBeat:castleId`.
    - **Unit unlock:** for each NSNumber `u` in `castleData.startData.upgrades` (content.json castle `upgrades`): if `!hasUpgradeAvailable:u`, add it to `upgradesAvailable` and set `newUnits = YES`.
    - **Skin unlock:** if castleId ∈ {25,27,35,36} (bitmask 0xc05 on id−25) **and** `!hasSkin:1`, then `unlockedSkins addObject:@2` and set `newSkin = YES`. Checking skin 1 but adding 2 is in the original; **GUESS:** hasSkin is 1-based.
  - Beacon `"WonCampaignLevel%d"`.
- **On defeat:** Beacon `"LostCampaignLevel%d"`.
- **Always last:** `campaignState save`.

**Visuals, common to both outcomes:**
- **Background strip:** help_banner at (240,160), z0, canvas TL (0,112).
- **Menu** at **(240,60)**, `alignItemsVertically` (5 px padding). Item order: Continue (`done:`), Replay (`retry:`).
  - Default slots: item 1 at local y +26.5 → cocos 86.5 (canvas centre 233.5, TL (192,209.5)); item 2 at local y −26.5 → cocos 33.5 (canvas centre 286.5, TL (192,262.5)).
  - Half pixels: round down for the port (**GUESS**; the original renders sub-pixel).

**Defeat:**
- WHITE "You Lose" at (240,160), canvas TL (176,150).
- Continue on top (86.5), Replay below (33.5).
- If `campaignState.numCastlesOwned == 0`, the **Continue item is removed**. Replay stays at 33.5 and is not re-aligned.

**Victory:**
- **Button order:** the Y positions are swapped. **Replay on top (86.5), Continue below (33.5).**
  - If `goToGameOverScreen`, Replay is `setVisible:NO` and `setIsEnabled:NO`.
- **Blue pennant:** `AtlasSpriteManager(sprites_banners_alpha.png)` at **z −1** (behind help_banner), rect (160,0,160,320), at (240,160). y = 320 − 0.5·320. Canvas TL (160,0).
- **Text** (all `addChild:` labels):
  - WHITE "Awards:" at (240,300), canvas TL (184,10).
  - Achieved achievements as TINY `name`, in manager order (§6), at (240, **270 − 15·i**). Canvas centre y 50 + 15·i, TL y 45 + 15·i.
  - If there are none: TINY "None" at (240,270), TL (224,45).
  - WHITE "You win!" at (240,180), canvas TL (176,130).
  - WHITE `"You earned %d tech points!"` at (240,150), canvas TL (240−8·len, 160). For tp = 2 the string is 25 chars, so the TL is (40,160).
- **Unlock popup** (only one can show):
  - If `newUnits`: MessageLayer("New units unlocked!", "They can be bought from the shop").
  - Else if `newSkin`: MessageLayer("New appearance unlocked!", "It can be selected in the appearance screen").
  - In both cases `active = NO` until it is dismissed. If both unlocks happen, the skin popup is never shown, but the skin is still unlocked.
- **Animation:** none.

### 4.3 MessageLayer @c40a8 (added on top with `addChild:`)
- FADE.
- `Defaults bannerSprite` = help_banner at (240,165), canvas TL (0,107).
- Header: WHITE at (240,190), canvas centre 130, TL y 120.
- Message: TINY at (240,160), TL y 155.
- **Back** button: Menu at (240,0), item at (0,120), so (240,120), canvas TL (192,176).
- `back:` plays `select.wav`, then `performSelector:reactivate:` on the result layer (which sets `active = YES`), then removes itself.

### 4.4 Actions (ignored while `!active`)
- **`retry:`** plays `select.wav`, then `replaceScene [[GameMode alloc] initWithBattleParams:same params]`. The same battle is replayed; the state changes are already saved.
- **`done:`** plays `select.wav`, then:
  - `goToGameOverScreen` → `CampaignVictoryScreen initWithCampaignState:` (§4.5).
  - else `campaignState.lastCastleBeat == 1` → `ShopScene initWithState:showTutorial:YES`.
  - else → `WorldMapScene initWithState:`.

### 4.5 CampaignVictoryScreen @9c948 (Scene)
- **On enter:** Beacon "BeatCampaign". `playBgMusic:"ccwin.mp3" withLooping:NO`.
- **Images:** day = `victory.png` and night = `victory_night.png` for `currentMap == 0`, or `egypt_victory.png` / `egypt_victory_night.png` for map 1. Both are 480×320 at (240,160).
- **Timeline** (t from scene init; FadeIn is linear opacity 0→255; each WHITE label is 29 chars = 464×20):

| t (s) | Event | Position | Sound |
|---|---|---|---|
| 0–3.25 | Day image shown | TL (0,0) | ccwin.mp3 starts at t=0 |
| 3.25–4.25 | Night image (opacity 0) fades in on top: `Sequence(DelayTime 3.25, FadeIn 1)` | same | |
| 5–6 | WHITE "You have conquered the realm!" (opacity 0), `Sequence(Delay 5, FadeIn 1)` | y = 320 − (10 + h/2) = **300**, canvas TL (8,10) | |
| 5–6 | Only if `!campaignState.conqueredAllRealms`: WHITE "But there's more realms left!" with the same fade (copied action) | y = 300 − (10 + 10) = **280**, canvas TL (8,30) | |
| 8 | `showStat1:` adds WHITE `"Victories: %d / Battles: %d"` (numVictories, numBattles) | **left-aligned at x = 20** (centre = 20 + w/2), y 240, canvas TL (20,70) | explosionbig.wav |
| 9 | `showStat2:` adds WHITE `"Rank: %@"` | left x = 20, y 210, canvas TL (20,100) | explosionbig.wav |
| 10 | `loadMenu:` adds **Map** button: Menu (310,35), item (0,0) | canvas TL (262,261) | explosionbig.wav |

- **Rank** comes from `+[Defaults getRankForWinPercentage:]` @71bec with p = (float)victories/battles: p ≥ 1.0 → "Legend"; ≥ 0.85 → "Emperor"; ≥ 0.7 → "King"; ≥ 0.5 → "Duke"; > 0.25 → "Knight"; else "Squire".
- **Map** plays `select.wav`, sends Beacon "KeepPlayingAfterVictory", then goes to `WorldMapScene initWithState:campaignState`. There is no main-menu option.

---

## 5. GameScore (quick-play career stats)
- **Storage:** singleton `+sharedScore` loads `FilePaths.scoreFilePath` (NSKeyedArchiver, root key `"kScoreKey"`). If the file is missing, everything starts at 0.
- **Saving:** `+save` is called **only** from `applicationWillTerminate:`. The web port should save on every update.

| ivar | Archive key |
|---|---|
| hasTrophy (BOOL) | `kHasTrophy` |
| numConsecutiveWins | `kNumConsecutiveWins` |
| numTotalWins | `kNumTotalWins` |
| numTotalLosses | `kNumTotalLosses` |
| bestConsectiveWins | **also** `kNumConsecutiveWins` (original bug, see below) |
| numHardWins | `kNumHardWins` |
| numMediumWins | `kNumMediumWins` |
| numEasyWins | `kNumEasyWins` |

- **The key bug:** encode writes best under the same key after current, and decode reads both from it. In practice, after a restart `numConsecutiveWins = bestConsectiveWins` (**probable**; it depends on NSKeyedArchiver overwriting duplicate keys).
- **`updateWithVictory:atDifficulty:`** @21630:
  - Win: `consecutive++`, `best = max(best, consecutive)`, `totalWins++`, and `{easy, medium, hard}Wins++` by difficulty.
  - Loss: `consecutive = 0`, `totalLosses++`.
- **`clearStreak`** sets consecutive to 0. It is called by `OverwriteLayer yes:`, i.e. "start new quick game" over an existing save.
- **Where it is shown:** only in `OverwriteLayer init` @9ef10. If `numConsecutiveWins > 0` it adds TINY "(Starting a new game will erase your streak)" at (240,155). The totals and per-difficulty wins are **never displayed**.
- **`hasTrophy`** is also mirrored in `GameSettings` (`kHasTrophy`, saved immediately). Battle code reads the **GameSettings** copy (§7).
- **Campaign:** `CampaignScore` is an empty class (no ivars or methods) and is unused. Campaign stats live in CampaignState (`numBattles`, `numVictories`, `techPoints`).

---

## 6. Achievements (campaign only)
- **Setup:** `GameScene loadCampaign` @1b3e8 adds the achievements to `achievementManager` in this **order, which is also the display order**: FlawlessVictory, Rich, ClearCut, WoodCutter, Aerial, WitchingHour, LowHealth, Arrakis. In quick play the manager exists but is empty.
- **Hook:** `AchievementManager unitHitEnemy:unit` is called from `moveUnits:attacking:withTime:` (@1f3ec/@1f448) **only for the player's (friendly) units that reach the enemy castle and deal castle damage**.
  - castleStrength == 0 → castle −1.
  - Otherwise castle health += castleStrength × (−10).
  - It is not called for projectile damage.
- **Finalise:** `finalise:scene` runs at t = 2 s (§1.2), win or lose.
- **Display:** `completeAchievements` returns the ones with `achieved == YES`. It is only used in the victory branch of §4.
- **Icons:** none. Achievements are text only (TINY name).

| Class | name (exact) | TP | Initial `achieved` | Rule |
|---|---|---|---|---|
| FlawlessVictoryAchievement | `Flawless Victory` | 1 | NO | finalise: `you.castle.health == you.maxCastleHealth` |
| RichAchievement | `Filthy Rich` | 1 | NO | finalise: `you.gold > 99` |
| ClearCutAchievement | `Clear Cut` | 1 | NO | finalise: `scene.treeCount == 0` (no trees left on the field) |
| WoodCutterAchievement | `Power to the People` | **2** | NO | per hit: unitType ∉ {2 Wood Cutter, 16 Master Wood Cutter} → `hitWithNonWoodcutter = YES`, achieved = NO; else if `!hitWithNonWoodcutter` → achieved = YES |
| AerialAchievement | `Aerial Victory` | 1 | NO | per hit: `!unit.flies` → `hitWithNonAerialUnit = YES`, achieved = NO; else if `!hitWithNonAerialUnit` → YES |
| WitchingHourAchievement | `Witching Hour` | 1 | **YES** | per hit: unitType ≠ 22 (LopiWitch) → `hitWithNonWitch = YES`, NO; else if `!hitWithNonWitch` → YES |
| LowHealthAchievement | `Original Health` | 1 | NO | finalise: `you.maxCastleHealth == 80`, i.e. no castle-health upgrade bought (**GUESS:** 80 is the base) |
| ArrakisAchievement | `Arrakis Attack!` | 1 | **YES** | per hit: `unit.castleStrength > 0 && unitType != 35` (sandworm) → `hitWithNonSandworm = YES`, NO; else if `!hitWithNonSandworm` → YES. Units with castleStrength 0 do not disqualify it. |

- **Quirk:** Witching Hour and Arrakis start as YES. A win where no friendly unit ever hit the castle (castle destroyed only by other means, if that is possible) awards both.
- **Tech points:** TP adds to the castle's `techReward` and is halved together with it on an already-owned castle (§4.2).

---

## 7. Trophy reward: UltimatePinkUnicornOfAwesome (quick-play easter egg)
- **Unlock:** the first hard-mode quick-play win sets `GameSettings.hasTrophy` (§2.1).
- **HUD button:** `GameScene loadHud` @2096c, when `params.gameMode == 0 && params.settings.hasTrophy`.
  - Adds `MenuItemAtlasImage(sprites_conhud_alpha.png, normal (48,208,24,24))` (the small cup, no selected rect) to the HUD menu at z5. Target self, `createGod:`.
  - Item position (192,−49). With the HUD menu at the default (240,160) that is **(432,111)**, canvas TL (420,197) (**GUESS:** assumes the HUD menu is not moved).
  - It also sets `GameScore.hasTrophy = YES`.
  - `GameplayGraphics ... loadUltimate:YES` loads `sprites_ultimate.png` as `ultimateSheet`.
- **`createGod:`** @166fc: `numUltimateClicks++`. When it exceeds 2 (the **3rd tap**), the counter resets to 0 and `createNewGod` runs. Each unicorn needs 3 taps. It costs nothing and has no limit.
- **`createNewGod`** @1da6c:
  - Allocates the unicorn on `ultimateSheet`.
  - Position: x = `you.groundUnitStart.x`, y = `getYForX:forUnit:`.
  - Added to `you.units` and to `ultimateSheet` at z2.
  - Beacon "Quentin".
- **Unicorn unit** @20f58 (subclass of Unit):

| Property | Value |
|---|---|
| Sprite | `sprites_ultimate.png` rect (0,0,64,48) |
| Walk animation | 3 frames, 64 px step, 0.1 s per frame, looping (row y=0: pink unicorn galloping right) |
| `setAllStrength:` | 300. This sets mounted, unmounted and castle strength. The value is passed as float bits 300.0, so castleStrength = 300 and one castle hit deals 3000 (instant win). |
| moveSpeed | 140 |
| pickupTrees | NO |
| unitType | 100000 |
| projectileResistance | 100.0 |
| Collision box | min (−32,−24), max (32,24) |

- **Death effect:** the unicorn overrides `beginAttackAnimationWithFriendly:killSelf:`. When killSelf is set, it spawns `PrettyDeath` (ultimate rect (0,48,48,48), 5 frames, 0.1 s; pink sparkle burst, row y=48) at its own position on `ultimateSheet` z2, then removes itself.
  - **Nothing in the binary sends that selector.** The engine calls `beginAttackAnimationAgainst:killSelf:`, which falls through to the base Unit version and returns NO. So in the original the sparkle is never shown (**faithful = never shown**). The unit is handled like a plain unit when it hits.

---

## 8. Strings and assets checklist
- **Sounds:** `select.wav` (every button), `explosion.wav` and `explosionbig.wav` (castle death and victory-screen stats), `ccwin.mp3` (campaign victory, no loop).
- **Images:**
  - `bg_results.png`, `help_banner.png`, `sprites_banners_alpha.png` (red 0..160, blue 160..320), `sprites_winlose_alpha.png` (DEFEATED... y0, VICTORY! y32).
  - `sprites_conhud_alpha.png` (big cup (0,208,48,48), small cup (48,208,24,24)), `sprites_buttons_alpha.png`, `sprites_ultimate.png`.
  - `victory*.png`, `egypt_victory*.png`, the fonts `sprites_font_alpha.png` and `tinyfont_white_alpha.png`.
  - `sprites_font_bigblue_alpha` and `tinyfont_red` are not used on these screens.
- **Unused or odd:** "Really forfeit?" is used only as the *message* line in multiplayer. "Original Health" is LowHealthAchievement's name.
