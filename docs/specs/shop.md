# Castle Conflict 1.85 – Campaign Shop / Barracks / Appearance spec

All positions are taken from the disassembly (`/home/claude/re/ann.txt`), unless marked **GUESS**.
Format: `cocos (x,y)` → `canvas (x,y)` with `y_canvas = 320 - y`. Every sprite, menu item and label is **centre-anchored** unless the text says otherwise.
For a centred item of size w×h, the canvas top-left is `(cx - w/2, cy_canvas - h/2)`.

Abbreviations:
- `BTN` = `sprites_buttons_alpha.png` (1024×512)
- `CON` = `sprites_conhud_alpha.png` (256×256)
- `HUD` = the skin's button file. For the Medieval skin it is `sprites_hud_alpha.png` (480×384). The Egyptian skins use `sprites_egypt_bluehud_big_alpha.png`, which has an identical layout. It is always read from `startData.playerSkin.left.buttonTexture`.
- `WHITE(s)`: the big font. It uses `sprites_font_alpha.png` (320×100) with 16×20 cells, 20 cells per row and first char `'!'` (33). Each character advances 16 px, and a space is a blank 16 px cell. A label is a `MenuItemAtlasFont`, centre-anchored, with width = 16·len and height 20. This is `+[Defaults whiteTextWithString:]` @721b4.
- `TINY(s)`: the small font. It uses `tinyfont_white_alpha.png` (160×50) with 8×10 cells, 20 cells per row, start `'!'` and an 8 px advance. The texture is only in the ipa (CgBI) and `/home/claude/view/tinyfont_white_alpha.png`, so it must be decoded. This is `+[Defaults tinyWhiteTextWithString:]` @7212c.
- `select.wav` is played on almost every tap. `buy.wav` (BUY), `castleupg.wav` (CASTLE_UPGRADE), `no2.wav` (NO_SOUND) and `swap.wav` (MOVE_UNIT) are the other sounds.

## 0. Common widgets

### MenuItemAtlasImage
- **Normal draw:** draws `normalRect`.
- **Touch held:** draws `selectedRect`.
- **Disabled draw:** draws the disabled image. Every item here is built without a disabled rect, so a disabled item falls back to `normalRect`.
- **Opacity:** `setOpacity` applies to all of its images.
- **Fired:** on touch-up inside the item.

### MenuItemAtlasImageImmediate
- This is the class returned by `Defaults getButtonForUnit/Upgrade:fromAtlas:target:selector:`.
- It **fires on touch-down**. Its `selected` method calls `activate` immediately, and `activate` itself is a no-op.
- It shows `selectedRect` while the finger is down.
- Every unit, upgrade and heart icon in this document is this class. The top-row army slots are also this class, with no target.

### Icon rects in HUD
These come from `+[Defaults getButtonForUnit:fromAtlas:…]` @7240c and `getButtonForUpgrade:` @721e0.
- **Unit `u`:** normal = `(hud.x, hud.y, 48, 48)` and selected = `(hud.x, hud.y+96, 48, 48)`. `hud` comes from `content.json`; case 21 was verified as (96,192) / (96,288).
  - The normal version is the frame plus the unit icon on a **transparent** background.
  - The selected version is the same with a **grey-filled** background.
- **kNoUnit (1000):** an empty frame. Normal = (432,240) and selected = (432,336).
- **Upgrades:**

| id | upgrade | normal rect | selected rect |
|---|---|---|---|
| 0 | Tower | (432,0) | (432,96) |
| 1 | Docks | (432,48) | (432,144) |
| 2 | Magic Engine | (432,192) | (432,288) |
| 3 | Battlements | (384,240) | (384,336) |
| 100 | Health heart | (48,240) | (48,336) |
| 4 | Temple | – | – |
| 5 | Solar | – | – |

  All rects are 48×48. Temple and Solar return **nil**, so they have no icon.

### BTN rects
All are 96×48. The selected/faded version sits at x+192.

| Button | normal | selected |
|---|---|---|
| Back | (96,48) | (288,48) |
| YES | (96,96) | (288,96) |
| NO | (96,144) | (288,144) |
| Continue | (0,48) | (192,48) |
| Finished | (672,0) | (672,48) |

### CON arrows
- Left `◁` = (48,128,48,48). Right `▷` = (0,128,48,48).
- The selected rect is the same as the normal rect.

### Purple banner
- The banner is **`help_banner.png` (480×96), drawn as-is.** There is no rotation, tint or scale.
- `sprites_banners_alpha.png` (red and blue vertical banners) is **not** used by any class in this scope. It is used only by BannerLayer and CampaignResultLayer.
- `+[Defaults bannerSprite]` = help_banner at cocos (240,165) → canvas centre (240,155), rect y 107..203.
- TutorialLayer and RemoveUnitWarningLayer put it at (240,160) → canvas centre (240,160), rect y 112..208.

### `Defaults fadeLayer`
- A full-screen ColorLayer, rgba(0,0,0,100/255).
- It is used only by TutorialLayer.
- It does not block touches. The underlying layer's own `active` flag does the gating.

### Faded state
"Faded" everywhere in this document means **opacity 100/255** applied to the whole icon. There is no grey tint. Child price labels are **not** faded, because opacity does not propagate in cocos 0.8.

## 1. Shop screen (ShopScene / ShopLayer)

ShopScene `initWithState:showTutorial:` @7d35c:
- Adds `shopbg.png` (480×320: blue diamond pattern with gold fringe top and bottom) at (240,160), z0.
- Then adds ShopLayer.
- If `showTutorial` is set, it calls `[layer showTutorial]`.

### 1.1 Layout

ShopLayer `initWithState:` @7f10c, `loadUnitButtons` @7e7b0, `loadShopPages` @7f4e0 and `addPage:` @7de84 build the screen in this order:

| element | asset / rect | cocos pos | canvas pos |
|---|---|---|---|
| Player castle (FauxPlayerCastle, see §1.6) | skin castleSkin | layer at (0,-33) | castle bottom-left at screen bottom-left |
| Tech label `"%d Tech Points"` (WHITE). Initial string `"0"`, then `updateTechLabel` | font | x = 10 + w/2, y = 250 | **left edge x=10**, centre y=70 |
| Back button. Menu at (240,40), item at (0,0). Target `cancel:` | BTN Back | (240,40) | (240,280) |
| Army row: 8 slots, Menu at (0,0) | HUD unit normal rect. Slot i shows `startData.units[i]`, or kNoUnit (empty frame) when i ≥ count | x = 72+48·i, y = 292 | x = 72..408, y = 28 |
| Arrow/heart Menu | – | (240, techLabel.y−50) = (240,200) | – |
| · left arrow (`previousPage:`) | CON (48,128) | item (−150,−50) → (90,150) | (90,170) |
| · right arrow (`nextPage:`) | CON (0,128) | item (150,−50) → (390,150) | (390,170) |
| · health heart (`buyUpgrade:`, purchaseId 100) | HUD (48,240) | item (−180,0) → (60,200) | (60,120) |
| · heart price label (TINY `"%d"`, child of the button) | – | button-local (24,−5) | (60,149) |
| Page Menu, one per page; only the current page is added | – | (240,200) | – |
| · page title (WHITE name) | – | item (0,0) → (240,200) | (240,120) |
| · upgrade building button (if the page has one; `buyUpgrade:`) | HUD upgrade rect | item (0,−40) → (240,160) | (240,160) |
| · its tech-price label (TINY) | – | local (24,−5) | (240,189) |
| · 5 unit buttons (`buyUnit:`) | HUD unit normal | item (−100+50i, −100) → (140+50i, 100) | x = 140,190,240,290,340, y = 220 |
| · unit tech-price labels (TINY) | – | local (24,−5) | y = 249 |

**Price labels.** `addPriceLabelToButton:withPrice:` @7e5d0 creates `TINY("%d")`. It adds the label as a **child** of the button at `(contentSize.w·0.5, −5)` in button-local space, where the origin is the bottom-left of the 48×48 box. On screen the label centre is therefore 29 px below the icon centre.

**Draw order (z0, insertion order).** Faux castle, tech label, Back menu, army row, arrow/heart menu, page menu, then flying purchase icons. ShouldBuyLayer is at z1. ShopTutorialLayer is at z10.

### 1.2 Pages

`loadShopPages` adds the pages in this fixed order with `addPage:name withUnits:[…] withUpgrade:U requires:R`.

| # | title (exact) | units (ids) | U (building icon shown; also every unit's `upgradeRequirement`) | R (page exists only if `state.canPurchaseUpgrade:R`) |
|---|---|---|---|---|
| 1 | Ground Units | 3,21,4,16,9 | 1000 (no icon, no requirement) | – (always) |
| 2 | Seige Units | 14,15,11,10,5 | 3 Battlements | 3 |
| 3 | Air Units | 23,6,19,20,7 | 0 Tower | 0 |
| 4 | Air Units | 31,30,32,34,33 | 0 Tower | 5 Solar |
| 5 | Magic Units | 17,22,13,18,12 | 2 Magic Engine | 2 |
| 6 | Temple Units | 24,28,26,27,29 | **2 Magic Engine** (sic) | 4 Temple |

Notes:
- Pages whose `requires` is not in `CampaignState.upgradesAvailable` are skipped entirely and leave no gap.
- The Temple page really shows the Magic Engine building, and its units say "Need Magic Engine to purchase".
- Temple (4) and Solar (5) can never be bought. They act only as page-unlock flags.
- Pages 3 and 4 each have their own Tower button. Both use purchaseId 0 and share the owned state.

**Navigation.**
- `curPage` starts at −1. `loadPage:0` runs at the end of `loadShopPages`.
- `loadPage:` removes the old page menu, adds the new one and calls `updateArrowState`.
- `updateArrowState` sets the left arrow's opacity to 255 if `curPage > 0`, otherwise 100. It sets the right arrow to 255 if `curPage < pages−1`, otherwise 100. The arrows are never disabled.
- `nextPage:` and `previousPage:` require `active`. They are bounds-checked and play `select.wav`.
- There is no paging animation. The page swaps instantly.

**Shop unit table.** Values come from the `Defaults` switch tables (`getCostForUnit` @714c8, `getTechCostForUnit` @715c8, `getNameForUnit`, `getDescriptionForUnit`). They are already extracted in `content.json`. The shop does **not** use UnitInfoManager; that class holds only battle stats.

| page | id: name | gold, tech |
|---|---|---|
| Ground | 3: Thief | 20g, 6 |
| | 21: Attack Dog | 20g, 6 |
| | 4: Cavalry | 50g, 11 |
| | 16: Master Wood Cutter | 15g, 11 |
| | 9: Archer | 50g, 15 |
| Seige | 14: Petard | 30g, 6 |
| | 15: Pikeman | 30g, 6 |
| | 11: Battering Ram | 55g, 11 |
| | 10: Heavy Cavalry | 55g, 11 |
| | 5: Cannon | 45g, 15 |
| Air | 23: Chemical Balloon | 15g, 6 |
| | 6: Zeppelin | 20g, 6 |
| | 19: Flying pirates | 40g, 11 |
| | 20: Planter Balloon | 30g, 11 |
| | 7: Bomber | 60g, 15 |
| Air2 | 31: Tree Cutter | 15g, 11 |
| | 30: Grappler | 35g, 11 |
| | 32: Soldier Dropship | 55g, 15 |
| | 34: Woodcutter Dropship | 20g, 15 |
| | 33: Fire Bomber | 70g, 18 |
| Magic | 17: Clay Golem | 45g, 6 |
| | 22: The LopiWitch | 25g, 6 |
| | 13: Ice Wizard | 15g, 11 |
| | 18: Polymorph Wizard | 45g, 11 |
| | 12: Fire Wizard | 60g, 15 |
| Temple | 24: Undead Soldier | 45g, 11 |
| | 28: Wind of God | 30g, 11 |
| | 26: Necromancer | 50g, 15 |
| | 27: Sword of God | 35g, 15 |
| | 29: Sand Wurm Priest | 60g, 18 |

**Upgrades.** `getTechCostForUpgrade` returns 11 for ids 0–4 and 0 otherwise.

| id | name | description |
|---|---|---|
| 0 | Tower | "Allows purchase of flying units." |
| 1 | Docks | "Allows purchase of naval units." |
| 2 | Magic Engine | "Allows purchase of magic units." |
| 3 | Battlements | "Allows purchase of strong seige units." |
| 4 | Temple | "Allows purchase of support units." |
| 5 | Solar | "Allows purchase of additional flying units" (no trailing full stop) |
| 100 | Health Boost | "Increases max castle health" |

Docks never appears in the shop.

### 1.3 Button states

`updateButtonStates` @7cd38 runs after page load, after every purchase and after a cancelled dialog's purchase.

**Unit button**
- Opacity is 255 if `canBuyUnit`, else 100.
- `canBuyUnit` = `!owned && (req==1000 || hasUpgrade(req)) && price ≤ techPoints`.
- `owned` = `state.hasUnit(id)`, true if the unit is in the active **or** inactive army.
- Owned, locked and unaffordable units therefore all look identical: the icon is faded and its label is not.

**Upgrade button**
- Opacity is 255 if `!owned && price ≤ techPoints`, else 100.
- `owned` = `hasUpgrade` (in `startData.upgrades`).

**Health heart**
- `price = 4 · ((startData.startHealth − 80) / 30 + 1)`, using integer division. This gives 4, 8, 12, … because the campaign start health is 80 (`CAMPAIGN_START_HEALTH`) and each boost adds 30.
- The label shows `price`.
- Opacity is 255 if `techPoints ≥ price`, else 100.
- There is **no cap**.

### 1.4 Tapping (buyUnit: @7c52c, buyUpgrade: @7c354)

Taps are ignored unless `active`. On a valid tap:
1. Play `select.wav`.
2. Compute `cantBuyMessage`:
   - **Unit:**
     - owned → `"Already Owned"`
     - else if `req≠1000 && !hasUpgrade(req)` → `"Need %@ to purchase"` with `getNameForUpgrade(req)`
     - else if `price > techPoints` → `"Not enough tech points"`
     - else nil.
   - **Upgrade or heart:**
     - owned → `"Already Owned"`
     - else if `price > techPoints` → `"Not enough tech points"`
     - else nil.
3. Add `ShouldBuyLayer` at z1.
4. Call `deactivate`. This sets `active=NO` and makes Back `setIsEnabled:NO` with opacity 100.

### 1.5 ShouldBuyLayer (purple dialog) @7e9e4

There is no fade layer behind it, so the shop stays visible. Its contents, in add order:

| element | cocos | canvas |
|---|---|---|
| `help_banner.png` (z0) | (240,165) | centre (240,155), rect 0,107 – 480,203 |
| WHITE(name), via `getNameForUnit` / `getNameForUpgrade` | (240,190) | (240,130) |
| TINY(description) | (240,160) | (240,160) |
| Icon (HUD normal rect, Immediate item with no target, added directly) | (50,170) | (50,150) |
| Units only: TINY(`"(%d tech points, %d gold to summon)"`) with techCost, gold cost | (240,175) | (240,145) |

Then one of two button sets:
- **`cantBuyMessage == nil`:**
  - WHITE(`"Buy?"`) at (240,135) → canvas (240,185).
  - Menu (z1, default position (240,160)) containing YES (BTN YES, `yes:`) at item (100,−50) → (340,110) → canvas (340,210), and NO (BTN NO, `no:`) at item (−100,−50) → (140,110) → canvas (140,210).
- **Otherwise:**
  - WHITE(message) at (240,135) → canvas (240,185).
  - A single **BTN Back** (target `no:`) at item (0,−60) → (240,100) → canvas (240,220).

Implementation notes:
- The video (an older build) shows `"(25 gold)"` instead of the cost format. Use the 1.85 format above.
- YES/NO overlap the shop's unit row at canvas y ≈ 210–220. While the dialog is up, route touches to it first. The shop's own handlers would return early anyway, because `active` is NO.

**`no:`**
- Play `select.wav`.
- Call `shopLayer.reactivate`, which sets `active=YES` and makes Back enabled with opacity 255.
- Remove the dialog.

**`yes:`**
- Calls `buyUnitFinal:` or `buyUpgradeWithId:` with the pressed button, then removes the dialog.

**`buyUpgradeWithId:` @7d4d4**
1. Play `buy.wav`.
2. If id == 100, set `startHealth += 30`. Otherwise set `owned=YES` and add the id to `startData.upgrades`.
3. Subtract the price from `techPoints`.
4. Create a new HUD icon (normal rect, no target) at the pressed button's screen position, which is button.pos + pageMenu.pos.
5. Run `MoveTo(0.1 s)` to the castle's position `(48,129)` in shop-layer coordinates (canvas (48,191)). This uses the castle node's local position and ignores the faux layer's −33 offset.
6. Schedule `upgradeCastle:` after 0.1 s. It plays `castleupg.wav`, calls `castle.addUpgrade(id)` (the sprite appears with no fade), removes the icon and calls `reactivate`.
7. Call `updateTechLabel`, then `updateButtonStates`, then `save`.

Note that `active` stays NO for that 0.1 s.

**`buyUnitFinal:` @7d9ec**
1. Play `buy.wav`.
2. Set `owned=YES`, subtract the price from `techPoints` and call `updateTechLabel`.
3. Set the pressed button's opacity to 100.
4. Call `state.addUnit(id)` (see §2.4).
5. Create a new HUD icon at the button's screen position and run `MoveTo(0.1)`:
   - If the unit joined the active army, move to `(48·count+24, 292)`, which is the new slot. It is added on top of the kNoUnit frame and stays there.
   - Otherwise move to `(512, 292)`, off-screen right, because the unit went to the inactive (barracks) list.
6. If id == 5 (Cannon), call `fauxCastle.addCannonWithFade:YES`.
7. Call `reactivate`, then `updateButtonStates`, then `save`.

### 1.6 FauxPlayerCastle (`initWithUpgrades:cannon:skin:unitSkin:` @8a7e8)

**Inputs**
- `upgrades` = `startData.upgrades`.
- `cannon` = `hasUnit(5)`.
- `skin` = `playerSkin.left.castleSkin`, a SpriteDefinitionLoader: `CastlePlayer`, `PyramidPlayer` or `TemplePlayer`. If it is nil, `CastlePlayer` is loaded.
- `unitSkin` = `playerSkin.left.unitSkin`.

**Castle**
- It is the **same `Castle` class as in battle**: `initWithSkin:upgrades:position:friendly:YES`.
- Position is `(srcRect.w·0.5, 33 + srcRect.h·0.5)`. The "Castle" entry is 96×192, so the position is (48,129).
- Draw it exactly as the battle player castle, including the Tower, Dock, Seige and Magic overlay sprites. Magic is an animation at 0.1 s per frame.
- `Castle.addUpgrade` only handles ids 0–3. Ids 4, 5 and 100 draw nothing.
- TemplePlayer has no `Dock` entry.

**Placement**
- In the shop, the FauxPlayerCastle layer is at (0,−33), so the castle sprite's bottom-left sits at screen (0,0).
- Canvas: x 0..96, y 128..320 for the 192-high base sprite.

**Cannon**
- If the player owns a Cannon unit: `Cannon initWithSkin:unitSkin forPlayer:0`, placed at layer-local (52,148). In the shop that is screen (52,115) → canvas (52,205).
- It is added to the unit-skin atlas manager at z1.
- With fade it starts at opacity 0 and runs `FadeIn 0.1 s`.

**FauxGameLayout** is a different class. It is the menu/settings/loading backdrop with `spr_castles_alpha` and is **not used** in shop, barracks or appearance.

### 1.7 Back (`cancel:` @7c0a0)

Requires `active`. Plays `select.wav`. Then:
- If `inactiveUnits.count > 0 && !hasSeenUnitScreen`, go to `UnitChangeScene initWithState:showTutorial:YES`.
- Otherwise go to `WorldMapScene`.

The scene is replaced with no transition.

### 1.8 ShopTutorialLayer (z10 in ShopLayer)

**When it appears**
- `CampaignResultLayer done:` opens `ShopScene showTutorial:YES` when `lastCastleBeat == 1` (kFirstShopCastle).
- `showTutorial` also sets Back's opacity to 100 and `active=NO`. Back is not disabled.

**TutorialLayer base**
- fadeLayer at z0.
- help_banner at (240,160), z1.

**Contents** (z2):

| element | cocos | canvas |
|---|---|---|
| WHITE "Welcome to the shop!" | (240,190) | (240,130) |
| TINY "Buy new units and upgrades to bring into battle." | (240,170) | (240,150) |
| TINY "Touch a unit or an upgrade to see more info." | (240,150) | (240,170) |
| TINY "Use the arrows to see all the units you can buy!" | (240,130) | (240,190) |
| BTN Continue, `finished:`, Menu (240,160) + (0,−60) | (240,100) | (240,220) |

**`finished:`** plays `select.wav`, removes the tutorial layer and calls `shop.reactivate`.

## 2. Barracks (UnitChangeScene / UnitSwapLayer)

### 2.1 Scene

`initWithState:showTutorial:` @7ff10:
- `shopbg.png` at (240,160), z0.
- `UnitSwapLayer initWithState:withRightSide:NO`. The left skin's buttonTexture is used for icons.
- Back: BTN Back (96,48)/(288,48), target `cancel:`, Menu at **(240,35)** → canvas (240,285).
- If `showTutorial` is set, call `[swapLayer showTutorial]`.

**`cancel:` @7fe10**
- Plays `select.wav`, calls `state.save` and goes to WorldMapScene.
- It has **no `active` check**, so Back works even while the tutorial is up.

The screen has no title text or labels. It shows only icons and Back.

### 2.2 Layout (`loadButtons` @ab184)

Every icon is a `getButtonForUnit` Immediate item (HUD normal rect) with target `swap:`. It fires on **touch-down**. Its user data is a `UnitChangeButtonInfo{unitId, isActive}`.
- **Active army** `startData.units[i]`: `getActiveUnitPositionForIndex` gives `(72+48i, 292)` → canvas `(72+48i, 28)`. This is the same row as the shop.
- **Inactive** `inactiveUnits[j]`: `getInactiveUnitPositionForIndex` uses `row=j/9` and `col=j%9` and gives `(48+48·col, 232−48·row)`.
  - Canvas y = 88, 136, 184, 232, …
  - Canvas x = 48 … 432.
- There are no empty-slot frames in the barracks.

### 2.3 Swapping (`swap:` @aa894)

Taps are ignored if `!active`.

**Tapped an active unit**
1. If its id is 2 (Woodcutter) or 16 (Master Wood Cutter) and no *other* active unit is 2 or 16:
   - Play `no2.wav` and set `active=NO`.
   - Add `RemoveUnitWarningLayer(description: "Must have at least one woodcutter unit")`.
   - Stop.
2. Otherwise:
   - Play `swap.wav`.
   - The button runs `MoveTo 0.1 s` to `inactivePos(inactiveButtons.count)`.
   - Set `isActive=NO`, remove the id from `units` and append it to `inactiveUnits`.
   - Remove the button from `activeButtons`. Each following active button k runs `MoveTo 0.1` to `activePos(k)`, which closes the gap.
   - Append the button to `inactiveButtons`.

**Tapped an inactive unit**
- If `units.count ≥ 8` (MAX_UNITS), play `no2.wav` and stop. No message appears.
- Otherwise:
  - Play `swap.wav`.
  - The button runs `MoveTo 0.1` to `activePos(activeButtons.count)`.
  - Set `isActive=YES`, remove the id from `inactiveUnits` and append it to `units`.
  - The remaining inactive buttons close the gap with `MoveTo 0.1` to `inactivePos(k)`.

New units are always appended at the end. Order is not otherwise preserved.

**RemoveUnitWarningLayer** (`initWithOwner:description:` @ab7dc) is a plain Layer with no fade:

| element | cocos | canvas |
|---|---|---|
| help_banner (z1) | (240,160) | (240,160) |
| WHITE "Cannot remove unit" (z2) | (240,180) | (240,140) |
| TINY description (z2) | (240,155) | (240,165) |
| BTN Continue (z2), `finished:`, Menu (240,160)+(0,−45) | (240,115) | (240,205) |

`finished:` removes the layer and calls `owner.reactivate` (`active=YES`). No sound is played.

### 2.4 The 8-unit rule

`CampaignState addUnit:` @74bfc:
- If `units.count ≥ 8`, append to `inactiveUnits` and return NO.
- Otherwise append to `units` and return YES.

`hasUnit` checks both lists.

### 2.5 UnitTutorialLayer

Added by `UnitSwapLayer showTutorial`, which uses `addChild` (z0, on top of the buttons). It also sets `active=NO`.

TutorialLayer base: fade layer plus help_banner at (240,160). Contents:

| element | cocos | canvas |
|---|---|---|
| WHITE "Welcome to the Barracks!" | (240,190) | (240,130) |
| TINY "You can only bring 8 units into battle." | (240,170) | (240,150) |
| TINY "Come here to change your unit selection!" | (240,150) | (240,170) |
| TINY "Touch a unit to swap it!" | (240,130) | (240,190) |
| BTN Continue | (240,100) | (240,220) |

`finished:` plays `select.wav`, removes the layer and calls `reactivate`.

## 3. Navigation shop ⇄ barracks ⇄ map, and the "return" tutorials

### WorldMapControls

Built in `initWithState:withOwner:` @7ba24. Its Menu is at z2 and position (0,0). The three buttons come from `mapcastles_alpha.png` (each scene uses that same file):

| button | normal | selected | cocos | canvas | shown when |
|---|---|---|---|---|---|
| Shop `$` (`shop:` → ShopScene) | (320,48) | (320,144) | (444,36) | (444,284) | `ownsCastle(1)` |
| Barracks (`changeUnits:` → UnitChangeScene, no tutorial) | (320,0) | (320,96) | (384,36) | (384,284) | `hasSeenUnitScreen` |
| Appearance (`changeSkin:` → SelectSkinScene) | (320,192) | (320,240) | (444,96) | (444,224) | `hasSetEgyptSkin` |

All rects are 48×48. Each handler plays `select.wav` and requires `owner.active`.

### Triggers in `WorldMapData initWithState:withOwner:`

| condition | action |
|---|---|
| `currentMap==1 (Egypt) && !hasSetEgyptSkin` | `state.setEgyptSkin` (§4.4), then schedule `loadSkinTutorial:` after 1.0 s, which shows AppearanceScreenTutorialLayer |
| `lastCastleBeat==0` | CampaignWelcomeLayer after 2.0 s (map scope) |
| `lastCastleBeat==1` | ShopReturnLayer after 1.6 s |
| `lastCastleBeat==19` | NewMapTutorialLayer after 0.8 s (map scope) |
| `inactiveUnits.count>0 && !hasSeenUnitScreen` | UnitReturnLayer on the next frame, and `setHasSeenUnitScreen:YES` |
| always | `setLastCastleBeat:1000` |

The map's `setActive:NO` stays in effect while a tutorial is up.

### Return / appearance tutorial layers

All three are TutorialLayers added to WorldMapData at z100: a fade layer plus the banner at (240,160). In each, the white lines are at cocos y 175 and 145 (canvas 145 and 175), and BTN Continue is at (240,100) → canvas (240,220).
- **ShopReturnLayer**
  - WHITE "Touch this button anytime" / WHITE "to return to the shop."
  - Arrow at (402,36) → canvas (402,284), pointing right at `$`.
  - `finished:` makes **no sound**.
- **UnitReturnLayer**
  - WHITE "Touch this button anytime" / WHITE "to return to the barracks."
  - Arrow at (352,36) → canvas (352,284).
  - `finished:` plays `select.wav`.
- **AppearanceScreenTutorialLayer**
  - WHITE "New appearance unlocked!" / **TINY** "Touch here to change your appearance".
  - Arrow at (402,96) → canvas (402,224).
  - No sound.

**The arrow.** It is created by `WorldMapData addArrowAt:`, not by the tutorial layer.
- Sprite "Arrow" from the map skin at z101. It is a 32×32 right-pointing purple arrow at (0,272) of `mapcastles_alpha.png` (`egypt_mapcastles` on the Egypt map).
- It loops through 8 frames at 0.1 s each, a colour pulse.
- Its position is converted to map-local coordinates (point − map.position).

`finished:` (all three) removes the arrow and the layer, then reactivates the map.

## 4. Appearance select (SelectSkinScene / SelectSkinLayer)

### 4.1 Skins

| idx | name (`getNameForSkin`) | file (`getFileNameForSkin`) | Left GameSkin (units) | Left CastleSkin | Left ButtonFile (HUD/shop icons) |
|---|---|---|---|---|---|
| 0 | Medieval | MedievalSkin.xml | playerStandard | CastlePlayer | sprites_hud_alpha.png |
| 1 | Egyptian Pyramid | EgyptianSkin.xml | playerEgyptian | PyramidPlayer | sprites_egypt_bluehud_big_alpha.png |
| 2 | Egyptian Temple | EgyptianTempleSkin.xml | playerEgyptian | TemplePlayer | sprites_egypt_bluehud_big_alpha.png |

- The `<Right>` side of each XML is the opponent version (`computerMedieval/CastleEnemy/sprites_redhud_big`, `computerEgyptian/PyramidEnemy` or `TempleEnemy/sprites_egypt_redhud_big`). It is used where the player's army is shown on the right, as in multiplayer.
- PlayerSkinLoader caches a `PlayerSkinInfo{left,right,filePath}` per file. PlayerSkin loads its unit and castle sprite definitions lazily.

**Effect in battle.** The chosen `startData.playerSkin.left` decides three things: the player's castle sprite set (CastleSkin), every player unit sprite (GameSkin), and the HUD unit-button texture (ButtonFile). The shop and barracks icons use the same ButtonFile.

### 4.2 Layout (`initWithState:` @c5b28, `loadCurrentSkin:` @c53e4)

| element | asset | cocos | canvas |
|---|---|---|---|
| background `shopbg.png` (scene, z0) | – | (240,160) | full screen |
| WHITE "Select your appearance!" | – | (240,280) | (240,40) |
| Menu at (240,0): left arrow (`previousPage:`) | CON (48,128) | item (−150,250) → (90,250) | (90,70) |
| right arrow (`nextPage:`) | CON (0,128) | (390,250) | (390,70) |
| back (`cancel:`) | **BTN "Finished"** (672,0)/(672,48) | item (0,40) → (240,40) | (240,280) |
| skin name: **TINY**, `titleFont`, via `getNameForSkin` | – | (240,250) | (240,70) |
| preview castle: FauxPlayerCastle with the current skin's castleSkin, startData.upgrades and cannon if `hasUnit(5)` | – | layer at **(0,0)** | castle centre (48,129) → canvas (48,191). Bottom edge at canvas y=287, i.e. 33 px higher than in the shop. |
| preview units: one per `startData.units`, created by `UnitFactory(createUnit:… ignoreAdd:YES)` in the skin's unit atlas (z1), then `cleanup` (frozen, no AI) | – | i-th created unit at `(140+80·(i%4), 185−85·(i/4))` | x = 140,220,300,380, y = 135 / 220 |

Unit `position` has the same meaning as a battle unit's position; see the battle spec for sprite anchoring.

**`updateArrows`**
- Left: enabled with opacity 255 if `curSkinIndex>0`, otherwise `setIsEnabled:NO` with opacity 100.
- Right: likewise, enabled if `curSkinIndex < unlockedSkins.count−1`.

**Paging**
- `nextPage:` / `previousPage:` change the index by ±1 and call `updateArrows` and then `loadCurrentSkin`. **No sound** is played.

**Loading** (`loadCurrentSkin` @c5160)
- A Layer at z2 containing `bannerSprite` (help_banner at (240,165)) and WHITE "Loading Appearance..." at the same (240,165) → canvas (240,155).
- After 0.05 s, `loadCurrentSkin:` runs. It:
  1. frees the previous skin;
  2. sets `skin = getSkin(fileName(unlockedSkins[curSkinIndex]))`;
  3. **immediately** sets `startData.playerSkin = skin` (browsing is choosing);
  4. updates the name;
  5. rebuilds the units and castle;
  6. removes the loading layer.

**Initial index.** `curSkinIndex` is the index in `unlockedSkins` whose file name equals the current `playerSkin.filePath`, or 0 if none matches.

**`cancel:`** plays `select.wav` and goes to WorldMapScene. There is no explicit save here; the port should save immediately.

### 4.3 Unlocking

**New campaign** (`initWithId:`): `unlockedSkins = [0]`, `playerSkin = MedievalSkin`, `upgradesAvailable = [3]`.

**Egypt skin** — `setEgyptSkin`:
- Adds 1 to `unlockedSkins` and **equips** EgyptianSkin.
- Sets `hasSetEgyptSkin=YES`.
- Runs on the first world-map load with `currentMap==1`, followed by AppearanceScreenTutorialLayer.
- After this the Appearance button exists.

**Temple skin** — in `CampaignResultLayer initWithBattleParams:victory:` @81e30, on victory:
- If `lastCastleBeat ∈ {25,27,35,36}` (bitmask 0xC05 over 25..36) **and `!hasSkin:1`**, add 2 to `unlockedSkins`.
- Then show MessageLayer "New appearance unlocked!" / "It can be selected in the appearance screen".
- **Binary bug.** The check passes literal **1**, not 2. Skin 1 is always owned by the time Egypt castles are fought, so in 1.85 the Temple skin is effectively never granted.
- **Recommendation:** implement `!hasSkin(2)` behind a `FAITHFUL_BUGS` flag.
- That screen shows "New units unlocked!" in preference, if both apply.

### 4.4 upgradesAvailable

- Starts as `[3]` (Battlements).
- On every campaign victory, each id in the **conquered castle's** `startData.upgrades` (`content.json` castles[].upgrades) that is not yet available is appended.
- If anything was added, MessageLayer shows "New units unlocked!" / "They can be bought from the shop".

So:
- The Air page appears after you beat a castle with 0.
- Magic needs 2.
- Air 2 needs 5 (Solar).
- Temple needs 4.

Buying the building (Tower, Battlements, Magic Engine) is then required before that page's units can be bought.
