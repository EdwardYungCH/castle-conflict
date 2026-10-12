# Castle Conflict 1.85 – engine.mjs audit against the ARM binary

Sources: `/home/claude/re/ann.txt` plus VFP-decoded `/home/claude/re/disv.txt` (merged for this audit). Method addresses are given as `@addr`, literal-pool floats are decoded, and cocos coordinates are y-up. **Canvas y = 320 − cocos y.**

The engine under audit is the `engine.mjs`, `ai-scores.mjs` and `campaign.mjs` modules in `/home/claude/src/read.html`.

Items are ordered by gameplay impact. Facts read directly from code are stated plainly. Anything inferred is marked **GUESS**.

---------------------------------------------------------------------------------------------------
## 0. Summary of required changes (highest impact first)

| # | Area | Original 1.85 | engine.mjs now | Change |
|---|---|---|---|---|
| 1 | Ground spawn x | blue **80**, red **384** (= 480 − castle width 96) | 76 / 404 | use 80 / 384 |
| 2 | Air spawn | blue (**40**,190), red (**424**,190) | 40 / 448 | red 424 |
| 3 | Where units hit the castle | AABB of the unit box vs castle boxes (see §3.1). Hit x depends on unit width; red travels 16 px less than blue | fixed centre x 402 / 78 for all units | box test |
| 4 | Ground curve denominator | `E − 80` with E = 384, so **304** | 320 | 304 |
| 5 | Spawn cooldown | **none**, for both the human and the AI | 0.3 s for both | remove |
| 6 | Initial trees | **none**. Exception: "hint" games add trees at x=168 and x=312 at t+2 s (plus a free woodcutter per side in Quick Play easy) | 4 ready trees at 125/170/310/355 | fix |
| 7 | New tree x | `146 + rand%188` with a catch-up bias; no spacing rule | 115..365, 16 px spacing | fix |
| 8 | Double income | 150 gold, deliveries ×2 (Quick Play human only) | missing | add |
| 9 | Castle damage | `hp = trunc(hp − cs·10)`; cs == 0 deals 1 | fractional (12.5); duster/cash/treeCutter/drop ships deal 0 | fix |
| 10 | Combat while attacking | an attacking unit **cannot kill** but **can be killed** | pair skipped entirely | fix |
| 11 | Quick-play AI unit set | fixed: wood, thief, weak, strong, cavalry, zeppelin, bomber, cannon (ignores armies) | uses `rosters[1]` (the human's quick army) | fix |
| 12 | Campaign AI | random pick (easy), or a fitness search (§7.3) | ad-hoc `runCampaignAI` | replace |
| 13 | Tick | `update:` at 0.032 s (≈ every 2nd frame) | 1/60 | 1/30 or 0.032 |
| 14 | Woodcutter tree pickup | picks the first ready tree its box overlaps while walking forward | seeks the nearest tree (3 px) and may walk back | fix |

---------------------------------------------------------------------------------------------------
## 1. Spawn positions (`PlayerState initWithRoot:isFriendly:withPlayerStartData:` @79c0, `UnitFactory createUnit:withInfoDictionary:ignoreAdd:` @71100)

### Original

**Friendly (left, blue)**, @7dd4..7df0:
- `setGroundUnitStart:(80, 54)`: literals 0x42a00000 = 80 and 0x42580000 = 54.
- `airUnitStart = (40, 190)`: 0x42200000 = 40 and 0x433e0000 = 190.

**Enemy (right, red)**, @7f10..8010. Here w = the `Castle` sourceRect width (96 for every skin; see atlases).
- Castle position: x = 480 − w/2 = **432**, y = 33 + h/2 = **129**.
- Health-bar border: x = 375 + borderW/2, y = 233.
- `setGroundUnitStart:(480 − w, 54)` = **(384, 54)**.
- `setAirUnitStart:(groundUnitStart.x + 40, 190)` = **(424, 190)**.

**Placement** (@713a0..713ec): each unit is created by `UnitFactory` and added to its side's unit atlas at z=2. It is then sent `setPosition:` with `airUnitStart` if `flies`, else `groundUnitStart`.
- `createUnit` sets no y offset. The y is overwritten every tick by `setY:[getYForX:forUnit:]` (@1f4f8).
- `Unit setPosition:` (@4ee0) stores the float `realPosition` and gives the sprite the **int-truncated** position.
- `collidesWith:` (@a008) uses that truncated `position`.

Canvas values:

| side | ground centre x | air centre |
|---|---|---|
| blue | 80 | (40, 130) |
| red | 384 | (424, 130) |

### Engine now
`createUnit`: `x=flies?(side===0?40:448):(side===0?76:404)`. `lastX` uses 76/404.

### Change
```js
const GROUND_START_X=[80,384], AIR_START_X=[40,424];          // cocos == canvas x
// createUnit:
const x=UNITS[type].flies?AIR_START_X[side]:GROUND_START_X[side];
... lastX:x, ...
```

---------------------------------------------------------------------------------------------------
## 2. Ground curve (`GameScene getYForX:forObject:` @1c92c, `getYForX:forUnit:` @174ec)

### Original
```
forUnit: if (unit.flies) return 190;            // literal 0x433e0000 @1753c
         else return getYForX:forObject:
forObject: S = you.groundUnitStart.x (80), E = enemy.groundUnitStart.x (384)
           y_centre = (you.groundUnitStart.y − 12) + 30·sin(−3.14159·(x − S)/(E − S)) + contentSize.h·0.5
                    = 42 + 30·sin(−3.14159·(x − 80)/304) + h/2
```
Constants: −3.14159 is a double @1ca44, 30.0 a double @1ca4c, 12.0 a float @1ca54 and 0.5 @1ca58.

`moveUnits` re-applies this every tick (@1f4f8..1f528) from the unit's current (truncated) x. `addTree:atX:` (@1d950) places trees at `(int)x, (int)getYForX` with the tree's own height.

- The unit **bottom** is at cocos `42 + 30·sin(−π(x−80)/304)`.
- **Canvas bottom = 278 + 30·sin(3.14159·(x − 80)/304).**
- Canvas centre = canvas bottom − h/2, where h is the sprite frame height.
- Air units: centre cocos y 190, so **canvas 130**.
- The curve is 0 at x=80 and at x=384 and lowest (canvas 308) at x=232. Outside [80,384] it rises again: at x=400 the bottom is canvas 273.

### Engine now
`ground=x=>278+30*Math.sin(3.14159*(x-80)/320)`.

### Change
```js
const ground=x=>278+30*Math.sin(3.14159*(x-80)/304);   // E-S = 384-80
```
`AIR_Y=130` is correct. The battle_hud spec §6.5 already has the 304 form.

---------------------------------------------------------------------------------------------------
## 3. Castle contact, walk speeds, castle damage, combat, ties

### 3.1 Castle collision boxes (`Castle initWithSkin:upgrades:position:friendly:` @613c)
The castle is a `MultiCollisionObject`. Its `collidesWith:` (@eb4c) tests each rectangle added with `addCollisionFrom:to:`, relative to the castle centre (48,129) or (432,129). All comparisons are inclusive.

| castle | rect A (low wall) cocos | rect B (tower) cocos | canvas [l,t,r,b] |
|---|---|---|---|
| blue (friendly) | (−48,−96)–(24,0) → x 0..72, y 33..129 | (−48,0)–(0,96) → x 0..48, y 129..225 | A [0,191,72,287], B [0,95,48,191] |
| red | (−24,−96)–(48,0) → x 408..480, y 33..129 | (8,0)–(48,96) → x 440..480, y 129..225 | A [408,191,480,287], B [440,95,480,191] |

The engine's projectile boxes `[[0,96,48,192],[0,192,72,288]]` / `[[440,96,480,192],[408,192,480,288]]` are 1 px low. Use the canvas values above.

### 3.2 Unit movement and castle contact (`GameScene moveUnits:attacking:withTime:` @1e794)
Each tick, for each unit of the player P being moved (dir = +1 if P is friendly, else −1; dt = the tick time):

1. **dead**: remove (`unitDied cause 3`).
2. **carryingTree**:
   - Move: `translateX: dir·moveSpeed·dt·(−0.5)` (half speed, home-bound).
   - If **own** castle `collidesWith:` the unit, deliver (§5), then `returnedHome`, `yay.wav`, remove.
3. **returning** (wizards, priests): move `−dir·moveSpeed·dt` at full speed. If it touches its own castle → `returnedHome` and remove.
4. **pickupTrees**:
   - Flying (TreeTopHarvester): the first tall tree with `canPick` that it collides with → `pick`.
   - Ground: the first tree in `trees` list order with `readyForHarvest` that it collides with → remove the tree, `setCarryingTree:YES`, `treechop.wav`.
   - In both cases, then **also walk** (falls to step 6).
5. **healsCastle** (Engineer): walks home at full speed and heals 40 on contact, capped at `maxCastleHealth`.
6. **Walk**: `translateX: dir·moveSpeed·dt`. If the **enemy** castle `collidesWith:` the unit:
   - **killsCarriers** (Thief) and enemy gold > 0 → steal (§5). The thief turns into a carrier and is not removed.
   - Otherwise, **castle hit**:
     - If friendly, `achievementManager unitHitEnemy:unit` (@1f3d8/@1f434).
     - `cs = castleStrength`. If cs == 0 then `health −= 1`, else `health = (int)((float)health + cs·(−10.0))` (literal −10 @1f824, `vcvt.s32` truncates).
     - Then `beginAttackAnimationAgainst:nil killSelf:YES`, `unitDied cause 1`, `castlehit.wav`.
7. For all units: `setY:(getYForX:forUnit: position.x)`. If a heal pickup exists, an engineer is flagged when a unit collides with it.

`moveSpeed` (@41dc) = `(int)(moveSpeed_ivar × moveSpeedBuffer)`, so it is truncated to an int. `setMoveSpeedBuffer:` clamps the buffer to [0.25, 1.75].

**Resulting contact x** (centre, ground units always overlap rect A vertically):
- **Blue unit vs red castle**: hits when `x + right ≥ 408`, where right = the friendly box's right half-width.
  - ±8 units: 400. Golem 396, dog 392, ram 384, cavalry/heavy 376.
- **Red unit vs blue castle**: hits when `x + left ≤ 72`.
  - ±8 units: 80. Golem 84, dog 88, ram 96, cavalry 104.
- **Air** (box always inside rect B's y range at y=190): blue hits when `x + hw ≥ 440`; red when `x − hw ≤ 48`. The engine's air end positions are already right.
- **Returning carriers** (own castle):
  - Blue: home when `x + left ≤ 72`, i.e. x ≤ 80 for ±8 (equal to the spawn x).
  - Red: home when `x + right ≥ 408`, i.e. **x ≥ 400**, which is 16 px *behind* its spawn at 384.
  - Air carriers: blue x ≤ 48 + hw (72 for TreeTopHarvester); red x ≥ 440 − hw (416).
- Net asymmetry: a blue ±8 walker travels 80→400 (320 px), a red one 384→80 (**304 px**).

### Engine now
- Ground: `end=u.side===0?402:78` with a 2 px tolerance, the same for every unit size.
- Workers and wizards go home to x=76/404. TreeTopHarvester goes home to 40/448.
- Speeds are not truncated.

### Change
```js
const CASTLE_BOXES=[[[0,191,72,287],[0,95,48,191]],[[408,191,480,287],[440,95,480,191]]]; // canvas l,t,r,b
const touchesCastle=(u,side)=>CASTLE_BOXES[side].some(b=>overlaps(unitBounds(u),b));
const moveSpeed=u=>Math.trunc(u.speed*Math.max(.25,Math.min(1.75,u.speedBuffer??1)));
// walking (fighters, workers without tree, wizards before cast, priests before stop, air):
u.x+=dir*moveSpeed(u)*dt; if(touchesCastle(u,1-u.side)) this.hitCastle(u);
// carrying:  u.x-=dir*moveSpeed(u)*.5*dt; if(touchesCastle(u,u.side)) deliver
// returning (wizard/priest/engineer): u.x-=dir*moveSpeed(u)*dt; if(touchesCastle(u,u.side)) remove/heal
hitCastle(u){ // replaces all inline hp-=damage code (fighters, worker 'no tree' path, fly(), thief w/o gold)
  const s=this.sides[1-u.side], cs=castleStrength(u);
  if(u.side===0) this.emit('unitHitEnemy',{unitType:u.type,flies:!!UNITS[u.type].flies,castleStrength:cs});
  s.hp = cs===0 ? s.hp-1 : Math.trunc(s.hp - cs*10);
  this.emit('castleHit',{side:1-u.side}); /* attack anim */ this.kill(u,'castle');
}
```
Remove the clamp `u.x=Math.min(402,Math.max(78,u.x))`.

`castleStrength(u)` is the per-class value in the table below. The ram's value is dynamic: `2 + (curSpeed − 40)/40·4` (`BatteringRam updateStrength` @8ad70).

### 3.3 Unit class init values (every `-[X initWithSkin:forPlayer:withInfoDict:]`)
`setAllStrength:v` sets unmounted = mounted = castle = v.

Box notation: (minx, miny, maxx, maxy) is the box relative to the centre for the non-friendly (red) unit. Blue mirrors x.

| unit (type) | @init | cost | speed | unmounted | mounted | castle cs | flies | box | engine mismatch |
|---|---|---|---|---|---|---|---|---|---|
| WeakSoldier 0 | 512c | 25 | 50 | 1 | 1 | 1 | | ±8,±12 | – |
| StrongSoldier 1 | 53b8 | 40 | 30 | 2 | 2 | 2 | | ±8,±16 | – |
| WoodCutter 2 | 5548 | 5 | 35 | 0 | 0 | 0 | | ±8,±12; treeValue 25 | – |
| Thief 3 | abdc | 20 | 65 | 0 | 0 | 0 | | ±8,±12; killsCarriers | – |
| Cavalry 4 | b074 | 50 | 120 | 3 | 3 | 3 | | ±32,±24, isMounted | – |
| SmallZeppelin 6 | d270 | 20 | 35 | 1.25 | 1.25 | **1.25** | ✓ | ±16,±8 | damage 12.5 → trunc rule (−13) |
| Bomber 7 | d6dc | 60 | 25 | 3 | 3 | 3 | ✓ | ±32,±24; dropBomb 1.0 s | – |
| Engineer 8 | 13e34 | 0 | 35 | 0 | 0 | 0 | | ±8,±12; healsCastle | – |
| Archer 9 | 8e248 | 50 | 40 | 0 | 0 | 0 | | ±8,±12; pickupTrees | – |
| HeavyCavalry 10 | 82814 | 55 | 80 | 4 | 4 | 4 | | ±32,±24, mounted | – |
| BatteringRam 11 | 8afa0 | 55 | 80 (curSpeed 80) | 3 | 2 | 2+(v−40)/10 | | ±24,±16 | – |
| FireWizard 12 | 8be00 | 60 | 40 | 0 | 0 | 0 | | (−16,−18,0,18) | castle 1 if it ever arrives |
| IceWizard **12** (sic) | 8cb08 | 15 | 40 | 0 | 0 | 0 | | (−16,−18,0,18) | unitType is set to 12 (40−28) – quirk (§7.3) |
| Petard 14 | 8b234 | 30 | 60 | 0.1 | 0.1 | 0 | | ±8,±16 | – |
| Pikeman 15 | 82e08 | 30 | 50 | 0.5 | 4 | 0 | | (−16,−12,0,12) | – |
| AdvancedWoodCutter 16 | 8237c | 15 | 50 | 0 | 0 | 0 | | ±8,±12; treeValue 35 | – |
| Golem 17 | 8ac28 | 45 | 30 | 4 | 4 | 1 | | ±12,±16; projRes 1 | – |
| PolymorphWizard 18 | 8cec8 | 45 | 50 | 15 | 15 | 0 | | ±8,±18 | engine damage 0 → **1**; delivery is a *tree* (§5) |
| PirateZeppelin 19 | 8d758 | 40 | 50 | 9 | 9 | **1.25** | ✓ | ±16,±8 | 12.5 → trunc rule |
| TreePlanter 20 | 8ee04 | 30 | 20 | 0 | 0 | 0 | ✓ | ±24,±20; dropTree 4 s | – |
| AttackDog 21 | 90f00 | 20 | 110 | 0.25 | 0.25 | 0 | | ±16,±8 | – |
| Witch 22 | 91420 | 25 | 40 | 0 | 0 | 2 | | ±8,±18; cat at 1 s | – |
| Duster 23 | 9199c | 15 | 50 | 0 | 0 | 0 | ✓ | ±24,±20; dust 0.3 s | engine damage 0 → **1** |
| Mummy 24 | b74b8 | 45 | 30 | 2 | 2 | 2 | | ±8,±16 | – |
| CrawlingMummy 25 | b7770 | 0 | 25 | 1 | 1 | 1 | | ±16,±16 | – |
| Necromancer 26 | b7eb8 | 50 | 30 | 0 | 0 | 0 | | ±8,±12 | – |
| TiePriest 27 | (inherits SpeedPriest init) | 35 | 40 | 0 | 0 | 0 | | ±8,±16 | **GUESS**: unitType stays 28 (no override of init) |
| SpeedPriest 28 | b8b24 | 30 | 40 | 0 | 0 | 0 | | ±8,±16; ignoreInTreeCalc | – |
| SandWormPriest 29 | c2380 | 60 | 30 | 0 | 0 | 0 | | ±8,±16; stop at 1.3 s | – |
| CannonCatcher 30 | b9440 | 35 | 60 | 2 | 2 | 2 | ✓ | ±40,±16 | – |
| TreeTopHarvester 31 | c2d60 | 15 | 25 | 0 | 0 | 0 | ✓ | ±24,±56; treeValue 50 | engine damage 0 → **1**; home x 72/416 |
| StrongSoldierDropShip 32 | c3de4 (base UnitDropShip c36d4) | 55 | 25 | 0 | 0 | 0 | ✓ | ±32,±24; drop every 3.7 s | engine damage 0 → **1** |
| NapalmBomber 33 | b9d60 | 70 | 35 | 4 | 4 | 4 | ✓ | ±32,±24; napalm 0.15 s | – |
| WoodCutterDropShip 34 | c3eb8 | 20 | 30 | 0 | 0 | 0 | ✓ | ±32,±24; drop every 3.2 s | engine damage 0 → **1** |
| SandWorm 35 | c1970 | – | – | 8 | 8 | 8 | | min (−48,−50); projRes 100 | engine `collision:[50,48]` (x/y swapped, unused) |
| Cannon 5 | ddb4 | 45 | – | – | – | – | | ±16 | – |

- Costs match `Defaults getCostForUnit:` (@714c8) and the engine.
- All speeds, strengths, mounted flags, flying flags and collision boxes in the engine's `UNITS` / `UNIT_GEOMETRY` match.
- The engine's `damage` field is wrong only where marked.
- Engine change: replace `damage` with `castleStrength` (= damage/10) and use `hitCastle` from §3.2.

### 3.4 Unit-vs-unit combat (`GameScene checkUnitUnitCollision` @192a4)
For every pair (A = your unit, B = enemy unit) where neither has `ignoresCombat` and `A collidesWith: B`. There is **no flies check**; air and ground boxes never overlap anyway.

1. **Thief steal**:
   - Condition: A.killsCarriers && !A.carryingTree && B.carryingTree && (B.treeValue > 0 || B.stolenValue > 0).
   - B dies (`unitDied cause 0`, once).
   - A becomes a carrier with `stolenValue = B.killsCarriers ? B.stolenValue : (float)B.treeValue`.
   - Score: you.numUnitsKilled += 1 and enemy.numUnitsDied += 1.
   - The same applies with roles swapped (B thief). Evaluation then **continues** to step 2; both strengths are 0, so the pair is skipped.
2. **Strengths**: `sA = B.isMounted ? A.mountedStrength : A.unmountedStrength`, `sB = A.isMounted ? B.mountedStrength : B.unmountedStrength`. If both are 0, skip.
3. **A dies** if `!B.attacking` and (`sA < sB`, or `sA == sB` and **not** `you.tieScore > enemy.tieScore`). Then:
   - B starts its attack animation (`beginAttackAnimationAgainst:A`, sets `attacking`, speed 0 for 0.3 s; pikeman, ram, etc. have their own durations).
   - Score: enemy.numUnitsKilled += 1 and you.numUnitsDied += 1.
4. **B dies** if `!A.attacking` and (`sA > sB`, or `sA == sB` and not `enemy.tieScore > you.tieScore`). Same effects mirrored.

Consequences:
- On a tie both die, unless one side has strictly more tie priests.
- **A unit that is already attacking cannot kill, but can still be killed.**
- Units killed this tick stay in the lists until the end of the method, so they can still fight others in the same tick.

Engine now (`update` combat loop):
- `a.engageUntil>this.time||b.engageUntil>this.time → continue` makes an attacking unit invulnerable. That is wrong.
- The both-zero check uses raw `UNITS[].strength` instead of the effective power (e.g. pikeman vs witch).
- Kills/deaths are not tracked per the Score rules.

Change:
```js
const sA=power(a,b), sB=power(b,a);                 // existing mounted logic + cash carrying=0
if(sA===0&&sB===0) continue;
const aAtt=a.engageUntil>this.time, bAtt=b.engageUntil>this.time;
const tA=this.sides[0].tieScore, tB=this.sides[1].tieScore;
const aDies=!bAtt&&(sA<sB||(sA===sB&&!(tA>tB)));
const bDies=!aAtt&&(sA>sB||(sA===sB&&!(tB>tA)));
if(aDies){this.kill(a);score[1].numUnitsKilled++;score[0].numUnitsDied++; if(!bAtt) startAttack(b);}
if(bDies){this.kill(b);score[0].numUnitsKilled++;score[1].numUnitsDied++; if(!aAtt) startAttack(a);}
```
The pirate-capture and polymorph special cases stay as they are (they live in the unit classes' `beginAttackAnimationAgainst:` and are outside the scope of this audit).

---------------------------------------------------------------------------------------------------
## 4. Spawn cooldown
### Original
- `PlayerState createUnit:affectsState:suppressPacket:` (@6fa8):
  - Type 5 → `fireCannon:`.
  - Otherwise, if affectsState: return nil when `cost > gold`. Else numUnitsBought += 1, numGoldSpent += cost, gold −= cost, and the factory creates the unit.
  - **No time check.**
- `ButtonLayer buyUnit:` (@73648) checks only `buyingAllowed` (set in `startGame:`) and `Director isPaused`.
- AI paths (`createNew*` @16f74.., `doCampaignAi createUnit:`) check `paused` and `gameStarted`.
- `UNIT_WAIT_TIME` (0.3) is **never used** in 1.85. The AI is rate-limited only by its `doAi:` interval.
- The cannon has no cooldown either: `Cannon fire` @de5c just restarts the 0.25 s animation.

### Change
- Remove `cooldown` from `canSpawn`, `spawn`, `runAI` and `update`.
- Set `CONFIG.spawnCooldown:0` or drop it.
- `maxUnits:100` is a port addition. The original has no cap; `MAX_UNITS 8` is the button count. Keep it only as a safety limit.

---------------------------------------------------------------------------------------------------
## 5. Income, deliveries, thief, double income
### Original
- **Passive**: `awardGold:` (@17588) is scheduled at 1.0 s in `startGame:` and gives +1 to **both** players. It is not doubled. The engine is correct.
- **Delivery** (moveUnits @1ec58..1edf0), when a carrier touches its own castle:
  - **Thief** (`killsCarriers`): `gold = (int)(gold + stolenValue)`, `score.goldStolen += stolenValue`, shows "+N". Not doubled. `treesHarvested` is unchanged.
  - **Everything else**: `v = treeValue × (doubleIncome ? 2 : 1)`, `gold += v`, `score.treesHarvested += 1`, shows "+v".
    - treeValue is 25 (WoodCutter), 35 (AdvancedWoodCutter) or 50 (TreeTopHarvester).
    - **PolymorphWizard** sets `treeValue = cost of the polymorphed unit` and `carryingTree` (@8cd70), so it is doubled and counts as a tree harvested.
- **Thief at the enemy castle** (@1f27c), only if enemy.gold > 0:
  - `buy.wav`, becomes a carrier.
  - If enemy.gold > 14: stolenValue = 15 and enemy.gold −= 15.
  - Else: stolenValue = enemy.gold and enemy.gold = 0.
  - Shows "−N". It then returns at half speed.
  - If enemy.gold == 0, it takes the normal castle-hit path: cs = 0, so 1 damage, and the thief dies.
  - If the carrying thief is killed, the stolen gold is lost.
- **Double income**:
  - `ButtonLayer doubleIncome:` (@7355c) calls `PlayerState doublePlayerIncome` (@64cc): `if gold > 149 { gold −= 150; doubleIncome = YES }`.
  - Then `buy.wav` and the button is disabled.
  - Quirk: the purchase happens *before* the `isPaused` test, so tapping it while paused takes the gold but leaves the button enabled.
  - The button is Quick Play only (`loadHud` @200c8). It is not counted in numGoldSpent. The AI never buys it: `doublePlayerIncome` has no other caller except save/load.

### Engine now
`worker()` deposits `u.carrying` without doubling. There is no double income. `cash` deposits go to `collected` without doubling.

### Change
```js
buyDoubleIncome(side){const s=this.sides[side];if(!this.running||s.doubleIncome||s.wood<=149)return false;s.wood-=150;s.doubleIncome=true;this.emit('doubleIncome',{side});return true;}
// deposit:
if(u.type==='thief'){s.wood=Math.trunc(s.wood+u.carrying);s.score.goldStolen+=u.carrying;}
else{const v=u.carrying*(s.doubleIncome?2:1);s.wood+=v;s.score.treesHarvested++;}
```
Apply the same to `harvestTallTree` (TreeTopHarvester, 50) and to `cash` (PolymorphWizard).

---------------------------------------------------------------------------------------------------
## 6. Tick, trees, setup
### 6.1 Tick
- `startGame:` (@17c54) schedules:
  - `update:` every **0.032 s**
  - `awardGold:` every 1.0 s
  - `doAi:` every aiFrequency (Quick Play and Campaign)
  - `updateTrees:` every 0.032 s
- **GUESS** (cocos2d 0.8 Timer semantics): the selector fires on the first frame where accumulated time ≥ 0.032 and receives the accumulated dt. At 60 fps that is every 2nd frame with dt = 1/30.
- `update:` order (@1796c):
  1. moveUnits(you vs enemy)
  2. moveUnits(enemy vs you)
  3. moveProjectiles ×2
  4. checkUnitElementCollision
  5. checkUnitUnitCollision
  6. checkUnitProjectileCollision(you→enemy), then (enemy→you)
  7. HUD
  8. checkEndCondition
- Change: `CONFIG.tick:1/30` (or 0.032), and keep this order. Optionally collide with `Math.trunc(x)`.

### 6.2 Tree growth (`updateTrees:` @1c81c, `growTrees` @1bf30, `createNewTree:` @16cdc, `addTree:atX:` @1d950)
Settings come from `loadSettings` @18490 and `loadCampaign` @1b22c:

| setting | chanceOfTree | treeRatio (int) | maxTrees |
|---|---|---|---|
| low (0) | 170 | 1 | 5 |
| normal (1) | 130 | 1 | 10 |
| high (2) | 90 | 1 | 12 |

The `TREE_RATIO_*` floats of constants.h are **not used**.

`updateTrees:` every 0.032 s:
```
n = trees.count; r = (int)(chanceOfTree * pow(treeRatio, n))   // = chanceOfTree
if (n < maxTrees && arc4random() % r == 1) growTrees();
else if (tallTrees && arc4random() % (4*r) == 1) growTallTrees();
```

`growTrees`:
```
minX  = (int)(you.castle.x + you.castle.width/2 + 50)          = 146
range = (int)(enemy.castle.x - enemy.castle.width/2 - 50 - minX) = 188
if (arc4random() & 1) == 0:                                      // 50 %: catch-up bias
    d = you.gold - enemy.gold + Σcost(you units) - Σcost(enemy units)   // units with ignoreInTreeCalculation (SpeedPriest/TiePriest) excluded
    if d > 20:      f = (150-d)/max(d,100) (int division)  ; b = 0.3+0.7f   // f is 1 for d<=50, 0 for d>50
                    minX = (int)(minX + range*(1-b)); range = (int)(b*range)     // poorer = enemy: trees near the right
    else if d != 20: a=|d|; f=(150-a)/max(a,100); b=0.3+0.7f; range=(int)(range*b) // trees near the left
x = minX + arc4random() % range
if treeDeadZoneMin < x < treeDeadZoneMax: no tree            // antlion: (240-48, 240+48) = (192,288); default 1000/0 = none
createNewTree(x)
```
- Net effect: when |gold+army difference| > 50, new trees appear only in the 30 % of the field nearest the poorer side. Otherwise x is uniform in [146, 334).
- **There is no minimum spacing.** Trees can overlap.
- A new LeafyTree has a 32×48 collision box (−16..16, −24..24).
- It becomes harvestable after **0.8 s** (`schedule makeReady: 0.8` @8274; MIN_TREE_LIFE is correct).

Change:
```js
// replace the tree block in update():
if(this.trees.length<this.cfg.maxTrees&&this.randInt(this.cfg.treeChance)===1){
  let min=146,range=188;
  if(this.randInt(2)===0){const d=this.sides[0].wood-this.sides[1].wood+armyValue(0)-armyValue(1);
    const a=Math.abs(d),b=.3+.7*Math.trunc((150-a)/Math.max(a,100));
    if(d>20){min=Math.trunc(min+range*(1-b));range=Math.trunc(b*range);}else if(d!==20)range=Math.trunc(range*b);}
  const x=min+this.randInt(range);
  if(!(this.antlion&&x>192&&x<288))this.trees.push({id:this.treeId++,x,remaining:1,born:this.time});
} else if(this.tallTrees.length&&this.randInt(4*this.cfg.treeChance)===1) growTallTree();
```
Here `randInt(n)=Math.floor(this.random()*n)`, and `armyValue` sums `UNITS[t].cost` excluding wind/sword priests. Remove the 16 px spacing test.

- **Tall trees** (`createTallTrees` @1c644): distance = `arc4random() % 25 + 48`, so **48..72**. The engine uses 48..147: change to `48+this.randInt(25)`.
- **Heal pickup**: 1/90 per second at (240, ground) (@1c588). The engine is correct.

### 6.3 Initial trees and `newGameSetup:` (@1b824; scheduling @1cd38..1ce4c)
- **Hint path** = (Quick Play && settings.difficulty == 0) **or** (Campaign && !campaignState.ownsCastle:0).
  - `PreGameHintLayer` is shown.
  - `startGame:` runs at **3.0 s** and `newGameSetup:` at **5.0 s**, i.e. 2.0 s after the game starts.
- **Otherwise**: `startGame:` runs at 0.5 s and `newGameSetup` never runs.
- `newGameSetup:` does the following:
  - `createNewTree(you.castle.x + 120)` = **168**, and `createNewTree(enemy.castle.x − 120)` = **312**. These are normal growing trees (0.8 s to ready).
  - Only in Quick Play easy: `createNewWoodcutter` for you and for the enemy, then each gets +5 gold (a net free unit, but numUnitsBought +1 and numGoldSpent +5 are still counted).
- No other trees exist at the start.

Engine change:
```js
this.trees=[];                       // constructor
this.setupAt=hint?2.0:null;          // hint = quick&&difficulty===0 || campaign&&!owns(0)
// in update():
if(this.setupAt!==null&&this.time>=this.setupAt){this.setupAt=null;
  for(const x of [168,312])this.trees.push({id:this.treeId++,x,remaining:1,born:this.time});
  if(!this.campaign&&this.difficulty===0)for(const s of [0,1]){this.purchase(s,'wood');this.sides[s].wood+=5;}}
```

### 6.4 Woodcutter tree pickup (moveUnits @1eee0..1f138)
- A ground `pickupTrees` unit always walks toward the enemy castle.
- Each tick it takes the **first ready tree in list order whose box overlaps its own box**: |dx| ≤ 8 + 16 = 24 for ±8 cutters, as long as the vertical boxes overlap.
- It never turns back toward a tree behind it.
- With no tree, it reaches the enemy castle and deals 1 damage (cs = 0).
- The archer's own tree behaviour lives in `Archer` and is outside this audit.

Engine: `chooseTree` (nearest, −3 px tolerance) plus walk-to-centre. Replace with an overlap test against `[t.x-16, ground(t.x)-48, t.x+16, ground(t.x)]`, in tree array order, after moving.

---------------------------------------------------------------------------------------------------
## 7. AI
### 7.1 Common gate (`doAi:` @f894)
- `doAi:` returns immediately if `gameOver` or **enemy.gold ≤ 4**. It then dispatches to `doCampaignAi:` when gameMode == 1.
- aiFrequency:
  - Quick Play (difficulty easy / medium / hard): 4.0 / 1.5 / 0.3 s, start gold 40 / 25 / 5.
  - Campaign (castle `enemyDifficulty`): 3.0 / 2.0 / 0.75 s.
  - The engine values are correct.
- Engine: add `if(this.sides[1].wood<=4)return;` at the top of `runAI`, and remove the cooldown test.

### 7.2 Quick-play AI (`doAi:` @f928..101d8)
Inputs:
- **Player (you) units**:
  - `oppGround` = (int) max unmountedStrength of non-flying units with strength > 0. `nOppGround` = their count.
  - `oppAir` = (int) max over flying units with strength > 0. `nOppAir` = their count.
  - `carriers` = count of player non-flying units with strength ≤ 0 that are `carryingTree`.
- **AI units**:
  - `ourGround` = (int) strength of the *last* AI ground unit whose strength **>** (float)oppGround, else 0.
  - `ourAir` = the same for flying units vs oppAir.
  - Among AI ground units *not* exceeding oppGround and not carrying: `woodcutters` (pickupTrees) and `thieves` (killsCarriers).
- `shot` = the **AI's own** `projectiles` contains a projectileType-0 (cannonball) projectile. It feeds both the air-defence and the air-attack scores.

Calls (the formulas in ai-scores.mjs match the binary):
- `gDef = calculateNeedForGroundDefense(ourGround, oppGround, nOppGround)`
- `aDef = calculateNeedForAirDefense(ourAir, oppAir, nOppAir, shot)`
- `pick = calculateNeedToPickupTree(woodcutters, oppGround, ourGround)`
- `stop = calculateNeedToStopResources(carriers, thieves, nOppGround, ourGround, oppGround)`
- `aAtk = calculateNeedToAttackAgainstAirUnits(nOppAir, oppAir, ourAir, shot)`
- `gAtk = calculateNeedToAttackAgainGroundUnits(nOppGround, oppGround, ourGround, carriers)`

`getChance(p)` = `arc4random()·2⁻³¹ ≤ p` (the engine's `random()*2<=p` is correct).

Decision:
```
if stop>aAtk && stop>gAtk && chance(stop) && createNewThief → return
if gDef>0 || aDef>0:
   if gDef>=aDef && chance(gDef): if createGroundUnit(oppGround) return; else goto ATTACK
   else if chance(aDef) && createAirUnit(oppAir, defensive=YES) return
ATTACK: if gAtk>0 || aAtk>0:
   if rand()%3==1: (gAtk>=aAtk && chance(gAtk)) ? ground : (chance(aAtk) ? air(NO) : -)
   else:           (aAtk>=gAtk && chance(aAtk)) ? air(NO)  : (chance(gAtk) ? ground : -)
   if the chosen create succeeded → return
if chance(pick) createNewWoodcutter          // WoodCutter only; never AdvancedWoodCutter
```
- `createGroundUnit(p)` (@eea4):
  - Easy: p == 3 → Cavalry, p == 2 → Strong, else Weak. **No fallback.**
  - Otherwise: try Cavalry; if p > 2 stop; try Strong; if p == 2 stop; try Weak.
- `createAirUnit(p, def)` (@efdc):
  - Defensive: `(float)p ≥ 1.25` → `GameScene fireCannon:` (needs gold > 44, costs 45, numGoldSpent += 45, explosion.wav). Otherwise SmallZeppelin.
  - Offensive: easy → SmallZeppelin. Otherwise try Bomber, then SmallZeppelin.
- All `createNew*` helpers call `createUnit:` directly, so the **AI ignores any army**. Its unit set is always {WoodCutter, Thief, WeakSoldier, StrongSoldier, Cavalry, SmallZeppelin, Bomber, Cannon}.
- Both quick-play castles get a cannon (`loadSettings` → `addCannon` for you and enemy @1887c).
- The AI **never** buys double income.

Engine fixes:
- In quick play, set `rosters[1]=['wood','thief','soldier','strong','cavalry','zeppelin','bomber','cannon']` regardless of the human's quick army. Alternatively, let AI calls bypass the roster check.
- `aiGroundUnit`, easy branch: remove `||this.customGroundUnit(...)`.
- Also remove the custom fallbacks in `quickAirUnit` and `runAI` (`this.spawn(1,'master')`).
- `quickNeeds`:
  - `ourPower`/`supportPower` must use the "last AI unit stronger than the player's max, else 0" rule.
  - `opponentShotCannon` for **both** scores = `this.projectiles.some(p=>p.alive&&p.side===1&&p.type==='cannonball')`.

### 7.3 Campaign AI (`doCampaignAi:` @9af4c)
Inputs:
- `enemyUnitInfo` = `UnitInfoManager getInfoForUnitNumber:` for each id in the castle's `startData.units`, in order (`loadCampaign` @1b5fc).
- `UnitInfo` table (`UnitInfoManager loadUnitInfo` @9743c). Fields: id: castleAttack / unmountedAttack / mountedAttack / speed / cost, then flags.

| id | castleAtk / unmnt / mnt | speed | cost | flags |
|---|---|---|---|---|
| 0 | 1 / 1 / 1 | 50 | 25 | |
| 1 | 2 / 2 / 2 | 30 | 40 | |
| 2 | 0 / 0 / 0 | 35 | 5 | collectsWood, carryingValue 25 |
| 3 | 0 / 0 / 0 | 65 | 20 | steals |
| 4 | 3 / 3 / 3 | 120 | 50 | mounted |
| 5 (cannon) | 2 / 10 / 10 | 300 | 45 | flying, launchesProjectile |
| 6 | 1.25 / 1.25 / 1.25 | 35 | 20 | flying |
| 7 | 3 / 3 / 3 | 25 | 60 | flying, launchesProjectile |
| 9 | 0 / 0 / 0 | 40 | 50 | timeUntilProjectile 3 |
| 10 | 4 / 4 / 4 | 80 | 55 | mounted |
| 11 | 4 / 3 / 2 | 25 | 55 | |
| 12 | 3 / 0 / 0 | 40 | 60 | launchesProjectile, timeUntilProjectile 1.5, utilityUnit |
| 13 | 0 / 0 / 0 | 40 | 15 | utilityUnit, utilityPerUnit 5, singleton |
| 14 | 4 / 15 / 15 | 60 | 30 | alwaysWinsOnce, suicideBomber |
| 15 | 0.5 / 0 / 4 | 50 | 30 | singleton |
| 16 | 0 / 0 / 0 | 50 | 15 | collectsWood, carryingValue 35 |
| 17 | 1 / 4 / 4 | 30 | 45 | |
| 18 | 0 / 15 / 15 | 50 | 45 | alwaysWinsOnce |
| 19 | 1.25 / 9 / 9 | 50 | 40 | flying, alwaysWinsOnce |
| 20 | 0 / 0 / 0 | 20 | 30 | flying, launchesProjectile, utilityUnit, utilityOffset 20 |
| 21 | 0.25 / 0.25 / 0.25 | 140 | 20 | |
| 22 | 2 / 0 / 0 | 40 | 25 | |
| 23 | 0 / 0 / 0 | 50 | 15 | flying, launchesProjectile, utilityUnit, utilityOffset 20 |
| 24 | 2 / 2 / 2 | 30 | 45 | utilityOffset 15 |
| 25 | 1 / 1 / 1 | 25 | 0 | |
| 26 | 0 / 0 / 0 | 30 | 50 | utilityUnit, utilityOffset 40, singleton |
| 27 | 0 / 0 / 0 | 40 | 35 | utilityUnit, utilityOffset 45, singleton |
| 28 | 0 / 0 / 0 | 40 | 30 | utilityUnit, utilityOffset 40 |
| 29 | 0 / 0 / 0 | 30 | 60 | timeUntilProjectile 7, utilityUnit, utilityOffset 200 |
| 30 | 2 / 2 / 2 | 60 | 35 | flying |
| 31 | 0 / 0 / 0 | 25 | 15 | flying, collectsWood |
| 32 | 2 / 0 / 0 | 25 | 55 | flying, utilityUnit, utilityOffset 40 |
| 33 | 4 / 4 / 4 | 35 | 70 | flying, timeUntilProjectile 4 |
| 34 | 0 / 0 / 0 | 30 | 20 | flying, utilityUnit, utilityOffset 30 |

Two decoding notes on this table:
- Entries 0, 1, 4, 9, 15 and 24–29 each contain two setter calls whose selector the decoder did not resolve. They are probably `setCarryingValue:` and `setLaunchesProjectile:`/`setCollectsWood:`. **GUESS**: 0, except 9 and 29, which are probably launchesProjectile = 1.
- `singleton` is set but has **no effect**: the loop at @9b47c calls `unitType`/`unitId` and discards the result.

**Easy castles** (`enemyDifficulty == 0`, @9afc4):
```
repeat: u = units[arc4random() % count]; if ([enemy createUnit:u]) return;   // createUnit:5 = fireCannon
until arc4random() % 3 != 0
```

**Medium/hard castles**:
```
nothing = Σ over you.units u (info = getInfoForUnit(u.unitType)):              // calculateFitnessOfDoingNothing @9a03c
          info.castleAttack*10*0.5
        + (info.castleAttack > AIcastle.health ? 100 : 0)          // raw castleAttack, not ×10 (quirk)
        + (info.steals ? (AIgold>14 ? 15 : AIgold>5 ? 40 : 15) : 0)
tree  = calculateNearestTreeToAi; tall = calculateNearestTallTreeToAi; nYou = you.units.count
for info in enemyUnitInfo:
  util = info.utilityUnit; f = info.cost / -3
  if info.collectsWood && (info.flying ? tall : tree):
        tWood = |AI.groundUnitStart.x - tree.x| / info.speed;  wood = 1     // always uses the *ground* tree (quirk)
  else  tWood = 1000; wood = 0
  targets = [u in you.units with u.flies == info.flying]
            t(u) = |u.x - AIstart.x| / (info.speed + (u.returning ? -u.moveSpeed : u.moveSpeed))
                   (AIstart = airUnitStart if info.flying else groundUnitStart); keep t(u) <= tWood
  sort targets by t ascending
  died = false
  for (t,u) in targets:
      r = simulateCombatBetween(info, u, t, &dies); f += r; if r > 0: util = 1
      if dies: died = true; if !util: f += info.cost * -10; break
  if !died:
      if info.steals: f += 15
      if info.castleAttack == 0 && AIcastle.health > 1 && !(util || wood): f += info.cost * -10
      else:
          f += info.castleAttack * (info.suicideBomber ? 3 : 35)
          if !(AIcastle.health > info.castleAttack*10): f += info.castleAttack * 50   // AI's own castle (quirk, GUESS: meant player's)
      if wood: f += info.carryingValue
  gold = wood ? AIgold : AIgold - 5
  score = gold < info.cost ? f - 5*(info.cost - gold)
                           : f + info.utilityOffset + info.utilityPerUnit * nYou
  list.add(sort = -score, info)
sort list ascending; best = list[0]
if nothing < -bestScore → do nothing      // i.e. buy only if bestScore + nothing >= 0
if AIgold < best.cost → do nothing (save up)
[enemy createUnit: best.unitId]
```

`simulateCombatBetween(info, u, t, &dies)` (@9bdbc), where uInfo = getInfoForUnit(u.unitType):
```
if info.steals && u.carryingTree: return 2*u.treeValue
sA = u.isMounted ? info.mountedAttack : info.unmountedAttack
sU = info.mounted ? u.mountedStrength : u.unmountedStrength          // the live unit's real strengths
win  = (sA > 0 && sA >= sU) || info.alwaysWinsOnce || uInfo.suicideBomber
proj = info.launchesProjectile && info.timeUntilProjectile < t
if !(win || proj): value = 0
else:
   kill = (AIgold > info.cost && uInfo.castleAttack*10 >= AIcastle.health) ? 1000 : 0
   value = kill + uInfo.castleAttack*15 + (u.carryingTree ? uInfo.carryingValue : 0)
         + (uInfo.cost > info.cost ? uInfo.cost - info.cost : 5)
dies = false
if !(proj && !uInfo.launchesProjectile):
   if uInfo.alwaysWinsOnce || uInfo.suicideBomber: dies = true
   else:
      if uInfo.launchesProjectile: dies = arc4random()*2^-31 > projDeathProb(uInfo.unitId)
      if sU > 0 && !(sA > sU): dies = true
if info.suicideBomber: dies = true
return value
```
- `projDeathProb` (@99df4): archer (9) → `trees.count × 0.2`, fire wizard (12) → 0.75, bomber (7) → 0.5, else 0.
- Because the player's IceWizard reports unitType 12, it is valued as a FireWizard (castleAttack 3).

`calculateNearestTreeToAi` (@9a7e8):
- **Note: it reads the global Quick-Play `GameSettings.difficulty`.**
- If that setting is ≤ 1, it returns the tree with the largest x (any tree, ready or not).
- If it is 2, it does the following:
  1. Takes the trees with x > max(treeDeadZoneMax of game objects with collisionTag 2 (antlion), 0), sorted by x descending.
  2. For each AI ground pickupTrees unit not carrying, removes the first listed tree with tree.x < unit.x.
  3. Returns the first remaining tree, or nil.
- `calculateNearestTallTreeToAi` (@9a308) is the analogue for tall trees (**GUESS**, not traced in detail).

Engine change: replace `runCampaignAI` and `runAirAI` with a port of the pseudo-code above. Port the UnitInfo table into `campaign-ai.mjs` and keep `easy` → random pick.

---------------------------------------------------------------------------------------------------
## 8. Score counters (`Score`, one per PlayerState)

| counter | incremented at | rule |
|---|---|---|
| numUnitsBought | `createUnit:affectsState:` @7170 | +1 for every paid unit creation by human or AI: buttons, AI `createNew*`, campaign AI, newGameSetup woodcutters. Not cannon shots (type 5 branches earlier). **GUESS**: engineers count too, because `createNewEngineer` passes a non-zero affectsState byte (@16f3c) |
| numGoldSpent | @719c (+cost) and `GameScene fireCannon:` @16e54 (+45) | The AI cannon (GameScene fireCannon) counts. The **human cannon button** (`PlayerState fireCannon:` via `ButtonLayer fire:`) does **not**. Double income does not count |
| treesHarvested | moveUnits @1edec | +1 per non-thief carrier delivery (woodcutters, TreeTopHarvester, PolymorphWizard) |
| goldStolen | moveUnits @1ecf8 | += stolenValue per thief delivery |
| numUnitsKilled / numUnitsDied | `checkUnitUnitCollision` (§3.4, including thief steals) | killer owner +1 killed, victim owner +1 died |
| numUnitsKilled / numUnitsDied | `checkUnitProjectileCollision:againstPlayer:` @1a39c | projectile owner +1 killed, victim owner +1 died |
| numUnitsDied only | same, @1a54c | friendly-fire (`hurtsFriendly`) victims: only numUnitsDied on the own side |
| not counted | | castle-hit self-kills (cause 1), returns home (cause 3). **GUESS**: antlion kills too (checkUnitElementCollision has no Score call) |

Engine: replace `collected/stolen/kills` with `score:{treesHarvested,goldStolen,numGoldSpent,numUnitsBought,numUnitsDied,numUnitsKilled}` per side and increment as above. In particular, `spawn()` must add bought/spent for **both** sides, and the cannon must count only for the AI.

---------------------------------------------------------------------------------------------------
## 9. Castle hit, achievement hook
- Formula: `cs == 0 → health − 1`, else `health = (int)(health − cs·10)` (§3.2).
  - Truncation toward zero means 12.5 removes 13 while health stays positive.
  - The ram uses its live cs = 2 + (curSpeed − 40)/10.
- Achievements: `[achievementManager unitHitEnemy:unit]` is called **before** the damage, only when the moving player is `friendly` (the human). It is called for **every** unit that reaches the castle, including cs = 0 units: woodcutters, a thief with no gold to steal, a planter, etc.
- It is **not** called:
  - for a thief that successfully steals gold
  - for projectile damage
  - for AI units
- The manager is empty in Quick Play.
- Engine: emit `unitHitEnemy` in `hitCastle` for side 0, as in §3.2. The campaign UI evaluates the rules in results.md §6.

---------------------------------------------------------------------------------------------------
## 10. Smaller notes
- `Unit setPosition:` truncates the sprite position to int, and collisions use it. Movement keeps a float `realPosition`.
- Air units are re-pinned to y = 190 every tick.
- Ground-unit order in the lists equals spawn order. Collision checks iterate you × enemy in that order, so with several overlaps the first pair wins.
- Projectile castle damage (`power·10`) was not re-verified in this audit (**GUESS** that the engine's `p.power*10` is right).
