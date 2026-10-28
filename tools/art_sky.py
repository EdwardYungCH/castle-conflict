"""Sky Realm art: marble spire castle skin, balloon map icons, unit sprites, fx sheet, HUD icons."""
import os, sys, math, random
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pix import *
from art_north import frames, BLUE, RED, O, team_colour, unit_icon
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
MARBLE1, MARBLE2, MARBLE3 = (250, 248, 240, 255), (214, 214, 226, 255), (160, 162, 184, 255)
GOLD1, GOLD2 = (255, 226, 110, 255), (214, 160, 40, 255)
SKY1, SKY2 = (150, 200, 240, 255), (90, 140, 210, 255)
CLOUD1, CLOUD2 = (255, 255, 255, 255), (214, 224, 238, 255)
STORM1, STORM2 = (96, 100, 124, 255), (60, 62, 84, 255)
BOLT = (255, 250, 150, 255)

def spire_castle(im):
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if s < 0.28: return from_hsv(0.62, 0.06, 0.6 + v * 0.4, a)                  # stone -> white marble
        if 0.5 < h < 0.7 and s > 0.3: return from_hsv(0.58, 0.55, 0.55 + v * 0.45, a)  # blue roofs -> sky blue
        if h < 0.12 and s > 0.4 and v > 0.5: return from_hsv(0.12, 0.8, 0.6 + v * 0.4, a)  # orange roof -> gold
        return None
    return recolor(im, fn)

def castle_skin():
    src = Image.open(os.path.join(A, 'spr_castles_alpha.png')).convert('RGBA')
    spire_castle(src).save(os.path.join(A, 'spr_sky_castles_alpha.png'))

def balloon(k):
    tile = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); bob = (0, 1, 2, 1)[k]
    disc(tile, 32, 22 + bob, 17, GOLD2); disc(tile, 31, 21 + bob, 14, (230, 80, 70, 255))
    for x in range(14, 50):
        if (x // 5) % 2: rect(tile, x, 6 + bob, x, 38 + bob, (250, 240, 200, 255))
    disc(tile, 32, 22 + bob, 17, None) if False else None
    p = tile.load()
    for y in range(64):               # trim the stripes back to the circle
        for x in range(64):
            if p[x, y][3] and (x - 32) ** 2 + (y - 22 - bob) ** 2 > 17 * 17: p[x, y] = (0, 0, 0, 0)
    rect(tile, 24, 39 + bob, 40, 41 + bob, GOLD2)
    for x in (26, 38): rect(tile, x, 42 + bob, x, 52 + bob, (120, 80, 40, 255))
    rect(tile, 23, 52 + bob, 41, 60 + bob, (150, 100, 50, 255)); rect(tile, 23, 52 + bob, 41, 53 + bob, (190, 140, 70, 255))
    return outline(tile)

def map_icons():
    src = Image.open(os.path.join(A, 'mapcastles_alpha.png')).convert('RGBA')
    def fn(r, g, b, a):
        h, s, v = hsv(r, g, b)
        if (r, g, b) == O[:3]: return None
        if s < .15: return from_hsv(0.62, 0.05, min(1, 0.55 + v * 0.5), a)
        return None
    out = recolor(src, fn)
    for k in range(4): out.paste(balloon(k), (368, 64 * k))
    out.save(os.path.join(A, 'sky_mapcastles_alpha.png'))

# ---------------------------------------------------------------- units
def bridger_frame(f, carry=False):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < .3 and y < 8: p[x, y] = SKY1 if v > .6 else SKY2                      # cap -> blue hood
            elif .02 < h < .12 and s > .4 and y > 12 and v > .5: p[x, y] = CLOUD1 if (x + y) % 3 else CLOUD2   # log -> cloud puff
    return f

def griffin_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if .05 < h < .16 and s > .3: p[x, y] = from_hsv(0.1, 0.45, 0.55 + v * 0.45)   # horse -> tawny griffin
            elif s < .3 and v > .5 and y > 12: p[x, y] = from_hsv(0.0, 0.0, 0.85 + v * .15)  # harness -> white
    # eagle head: white feathers on the front of the head
    for y in range(14, 22):
        for x in range(W - 18, W - 4):
            if p[x, y][3] and p[x, y][:3] != O[:3] and hsv(*p[x, y][:3])[1] > .3: p[x, y] = CLOUD1
    return f

def wings(w=28, h=18, up=True, c1=CLOUD1, c2=CLOUD2):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for k in range(4):
        y0 = (2 + k * 3) if up else (h - 6 - k * 3); L = w - 4 * k
        for x in range(0, L): put(im, x, y0 + (x // 7 if up else -(x // 7)), c1 if k % 2 == 0 else c2)
    return outline(im)

def griffin_sheet_frame(f, i):
    out = Image.new('RGBA', (64, 48), (0, 0, 0, 0))
    wg = wings(26, 16, up=i % 2 == 0); out.alpha_composite(wg, (4, 6 if i % 2 == 0 else 14))
    out.alpha_composite(griffin_frame(f), (0, 0))
    return out

def thunder_frame(f):
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if 0.5 < h < 0.75 and s > 0.3: return STORM1 if v > .5 else STORM2        # blue robe -> storm grey
        if h < 0.15 and s > 0.4 and v > 0.5: return BOLT                           # staff tip / flame -> lightning
        return None
    return recolor(f, fn)

def angel_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.5 < h < 0.75 and s > 0.3: continue                                    # tunic keeps the team colour
            elif s < .3 and v > .55: p[x, y] = GOLD1 if v > .75 else GOLD2            # armour -> gold
    out = Image.new('RGBA', (24, H), (0, 0, 0, 0))
    wg = wings(14, 12, True); out.alpha_composite(wg, (0, 9)); out.alpha_composite(f, (8, 0))
    for x in range(10, 20): put(out, x, 0, GOLD1)                                      # halo
    return out

def battleship_frame(f):
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if s < 0.3 and v > .45: return from_hsv(0.62, 0.05, 0.75 + v * 0.25, a)     # envelope -> white
        if 0.5 < h < 0.75 and s > 0.3: return GOLD2 if v < .6 else GOLD1              # rigging -> gold
        if s < 0.3: return from_hsv(0.08, 0.5, 0.25 + v * 0.3, a)                     # gondola -> wood
        return None
    out = recolor(f, fn)
    rect(out, 6, 40, 20, 43, (120, 80, 40, 255)); rect(out, 8, 38, 10, 40, STORM2)     # turret
    return out

def unit_sheet(src):
    out = Image.new('RGBA', (256, 192), (0, 0, 0, 0))
    def row(fs, x, y):
        for i, fr in enumerate(fs): out.alpha_composite(fr, (x + i * fr.width, y))
    row([bridger_frame(f) for f in frames(src, 0, 0, 16, 24, 4)], 0, 0)                 # Bridger walk (0,0)
    row([bridger_frame(f, True) for f in frames(src, 0, 48, 16, 24, 4)], 64, 0)         # Bridger carry/build (64,0)
    row([griffin_sheet_frame(f, i) for i, f in enumerate(frames(src, 0, 256, 64, 48, 3))], 0, 24)   # Griffin 64x48 x3 (0,24)
    row([thunder_frame(f) for f in frames(src, 128, 168, 16, 36, 4)], 0, 72)            # Thunder walk (0,72)
    row([thunder_frame(f) for f in frames(src, 192, 168, 32, 36, 1)], 64, 72)           # attack (64,72)
    row([thunder_frame(f) for f in frames(src, 224, 168, 16, 36, 4)], 96, 72)           # return (96,72)
    row([angel_frame(f) for f in frames(src, 0, 192, 16, 32, 4)], 0, 108)               # Angel walk 24x32 (0,108)
    row([angel_frame(f) for f in frames(src, 0, 224, 16, 32, 3)], 96, 108)              # attack (96,108)
    row([battleship_frame(f) for f in frames(src, 0, 368, 64, 48, 2)], 0, 140)          # Battleship 64x48 x2 (0,140)
    return out

def units():
    unit_sheet(BLUE).save(os.path.join(A, 'spr_sky_blue_alpha.png'))
    unit_sheet(RED).save(os.path.join(A, 'spr_sky_red_alpha.png'))

# ---------------------------------------------------------------- fx
def gap_frame(w=40, h=56):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        d = 3 + (y // 9) % 2
        for x in range(0, d): put(im, x, y, (120, 92, 60, 255) if x < d - 1 else (80, 60, 40, 255))
        for x in range(w - d, w): put(im, x, y, (120, 92, 60, 255) if x > w - d else (80, 60, 40, 255))
    for x in range(0, 5): put(im, x, 0, (96, 170, 70, 255)); put(im, w - 1 - x, 0, (96, 170, 70, 255))
    r = random.Random(4)
    for _ in range(8):   # wisps of cloud drifting in the gap
        x, y = r.randint(6, w - 12), r.randint(20, h - 4)
        for k in range(r.randint(3, 6)): put(im, x + k, y, CLOUD2)
    return im

def cloud_bridge(w=44, h=12):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for cx in range(5, w - 4, 7): disc(im, cx, 6, 5, CLOUD1); disc(im, cx + 3, 8, 3, CLOUD2)
    rect(im, 2, 3, w - 3, 4, CLOUD1)
    return outline(im, (160, 170, 200, 255))

def gap_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    rect(im, 0, 6, 4, 15, (120, 92, 60, 255)); rect(im, 11, 6, 15, 15, (120, 92, 60, 255))
    rect(im, 0, 5, 4, 5, (96, 170, 70, 255)); rect(im, 11, 5, 15, 5, (96, 170, 70, 255))
    for x in range(5, 11): put(im, x, 12, CLOUD2)
    return outline(im)

def wind_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, L in ((4, 10), (8, 13), (12, 8)):
        for x in range(1, 1 + L): put(im, x, y, CLOUD1)
        put(im, L, y - 1, CLOUD2)
    return outline(im)

def observatory():
    im = Image.new('RGBA', (22, 18), (0, 0, 0, 0))
    rect(im, 4, 8, 17, 17, MARBLE2); rect(im, 4, 8, 17, 8, MARBLE1); rect(im, 15, 8, 17, 17, MARBLE3)
    disc(im, 10.5, 8, 7, SKY2); disc(im, 9.5, 7, 5, SKY1); rect(im, 0, 9, 21, 17, (0, 0, 0, 0)) if False else None
    rect(im, 4, 9, 17, 17, MARBLE2); rect(im, 15, 9, 17, 17, MARBLE3); rect(im, 9, 13, 12, 17, STORM2)
    for k in range(5): put(im, 12 + k, 5 - k, GOLD2)                                     # telescope
    put(im, 17, 0, GOLD1)
    return outline(im)

def bolt(k):
    im = Image.new('RGBA', (24, 120), (0, 0, 0, 0)); r = random.Random(k); x = 12
    for y in range(0, 120):
        if y % 9 == 0:
            nx = max(4, min(19, x + r.randint(-5, 5)))
            for hx in range(min(x, nx), max(x, nx) + 1): put(im, hx, y, BOLT)
            x = nx
        for dx in range(-1, 2): put(im, x + dx, y, BOLT if dx == 0 else (255, 255, 255, 180))
    return im

def fx_sheet():
    out = Image.new('RGBA', (160, 176), (0, 0, 0, 0))
    out.alpha_composite(gap_frame(), (0, 0)); out.alpha_composite(cloud_bridge(), (40, 0))
    out.alpha_composite(gap_icon(), (88, 0)); out.alpha_composite(wind_icon(), (104, 0)); out.alpha_composite(observatory(), (120, 0))
    for k in range(3): out.alpha_composite(bolt(k), (24 * k, 56))
    out.save(os.path.join(A, 'spr_sky_fx_alpha.png'))

def register_icons():
    import art_hud as H, art_upgrades as U
    def ob(h, sel, side):
        ic = U.icon_base(h, sel); ic.alpha_composite(observatory(), (22, 20)); return ic
    H.register((2, 2), ob)
    S = lambda side: Image.open(os.path.join(A, 'spr_sky_blue_alpha.png' if side == 0 else 'spr_sky_red_alpha.png')).convert('RGBA')
    from art_north import body_icon
    H.register((3, 2), lambda h, sel, side: body_icon(h, sel, S(side), (64, 0, 16, 24)))      # bridger (carrying cloud planks)
    H.register((4, 2), lambda h, sel, side: body_icon(h, sel, S(side), (0, 24, 64, 48)))      # griffin
    H.register((5, 2), lambda h, sel, side: body_icon(h, sel, S(side), (0, 72, 16, 36)))      # thunder mage
    H.register((6, 2), lambda h, sel, side: body_icon(h, sel, S(side), (0, 108, 24, 32)))     # angel
    H.register((7, 2), lambda h, sel, side: body_icon(h, sel, S(side), (0, 140, 64, 48)))     # battleship

def build():
    castle_skin(); map_icons(); units(); fx_sheet()

if __name__ == '__main__':
    build(); print('sky ok')

# ------------------------------------------------------------------ v3.1 redesign
from art_parts import *
HAT_W = (240, 244, 250, 255)
def bridger_frame(f, carry=False):
    """Woodcutter body: white hard hat, sky-blue shirt, cloud planks instead of the log."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if y < 5 and 0.5 < h < 0.7: p[x, y] = HAT_W if y < 3 else (200, 206, 216, 255)         # hard hat
            elif 10 < y < 19 and (r, g, b) in SKIN and 2 < x < 10: p[x, y] = SKY1 if v > 0.6 else SKY2   # shirt
            elif .02 < h < .12 and s > .4 and y > 12 and v > .5: p[x, y] = CLOUD1 if (x + y) % 3 else CLOUD2
    return f
def thunder_frame(f):
    """Wizard with a storm-grey hat (lightning bolt on it) over a team-coloured robe."""
    f = f.copy(); p = f.load(); W, H = f.size
    skin = [y for y in range(H) for x in range(W) if p[x, y][3] and p[x, y][:3] in ((195, 136, 70), (255, 166, 88))]
    face_top = min(skin) if skin else 16
    for y in range(face_top):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s > 0.3 and (0.5 < h < 0.75 or h < 0.1): p[x, y] = STORM1 if v > .6 else STORM2
    blit(f, lightning(), 6, 6)
    return f

# ------------------------------------------------------------------ v3.4: air lanes, drifting clouds, four more units
STONE1, STONE2, MOSS, RUNE = (200, 205, 215, 255), (130, 138, 155, 255), (90, 160, 90, 255), (120, 220, 255, 255)
def shepherd_frame(f):
    """Small zeppelin turned into a white cloud-raft; a shepherd with a crook stands on the gondola."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if y < 10: p[x, y] = CLOUD1 if (x + y) % 3 else CLOUD2                     # envelope -> cloud
    man = outline(from_rows(['.S.', 'SSS', '.B.', '.B.'], {'S': (236, 150, 80, 255), 'B': SKY2}))
    blit(f, man, W // 2 + 2, 6)
    for y in range(4, 12): put(f, W // 2 + 6, y, (120, 80, 40, 255))
    put(f, W // 2 + 5, 4, (120, 80, 40, 255)); put(f, W // 2 + 7, 4, (120, 80, 40, 255))
    return f

def lancer_frame(f):
    """Pikeman in sky blue with a winged silver helmet; the pike becomes a long gold-tipped lance."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.3 < h < 0.48 and s > 0.4: p[x, y] = CLOUD1                                 # plume -> white wing
            elif 0.08 < h < 0.16 and s > .5 and v > .7 and y < 30: p[x, y] = GOLD1 if y < 6 else (190, 190, 200, 255)   # shaft -> silver, tip gold
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = SKY1 if v > .6 else SKY2
    return f

def guardian_frame(f):
    """Golem in pale stone with moss on the shoulders and glowing blue runes on the chest."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < .35: p[x, y] = STONE1 if v > .6 else STONE2
            elif 0.5 < h < 0.75 and s > 0.3: pass                                     # team colour stays
            elif .02 < h < .14 and s > .4: p[x, y] = STONE1 if v > .6 else STONE2
    for (x, y) in ((4, 8), (5, 7), (18, 8), (17, 7), (6, 8), (16, 8)):
        if 0 <= x < W and p[x, y][3] and p[x, y][:3] != O[:3]: p[x, y] = MOSS
    for (x, y) in ((11, 14), (12, 15), (11, 16), (10, 15)):
        if 0 <= x < W and 0 <= y < H and p[x, y][3] and p[x, y][:3] != O[:3]: p[x, y] = RUNE
    return f

def harpist_frame(f):
    """Priest body: no mitre, long golden hair, white-and-gold gown, a small harp held in front."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.25 and y >= 10: p[x, y] = CLOUD1 if v > 0.7 else (220, 205, 160, 255)
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = GOLD2
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1, 0, W - 1)
        hair = outline(from_rows(['.' + '#' * (x1 - x0 + 1) + '.', '#' * (x1 - x0 + 3)], {'#': GOLD1})); blit(f, hair, x0 - 1, top - 2)
        for y in range(top, min(H, bot + 9)): put(f, x0 - 1, y, GOLD1 if y % 2 else GOLD2); put(f, x0 - 2, y, O)
    harp = outline(from_rows(['G..', 'GG.', 'G.G', 'GGG'], {'G': GOLD2})); blit(f, harp, W - 4, 21)
    for y in range(22, 25): put(f, W - 2, y, (250, 250, 250, 255))
    return f

def cloud_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for cx, cy, r in ((5, 9, 4), (9, 7, 5), (12, 10, 3)): disc(im, cx, cy, r, CLOUD1)
    rect(im, 2, 3, 6, 3, SKY2); rect(im, 9, 2, 14, 2, SKY2)      # two lane lines
    return outline(im)

def unit_sheet_v34(src, out):
    big = Image.new('RGBA', (256, 284), (0, 0, 0, 0)); big.alpha_composite(out, (0, 0))
    def row(fs, x, y):
        for i, fr in enumerate(fs): big.alpha_composite(fr, (x + i * fr.width, y))
    row([shepherd_frame(f) for f in frames(src, 0, 352, 32, 16, 2)], 0, 192)       # Shepherd (0,192) 32x16 x2
    row([lancer_frame(f) for f in frames(src, 64, 204, 16, 52, 4)], 64, 192)       # Lancer walk (64,192) 16x52 x4
    row([guardian_frame(f) for f in frames(src, 176, 224, 24, 32, 4)], 128, 192)   # Guardian walk (128,192) 24x32 x4
    row([guardian_frame(f) for f in frames(src, 272, 224, 24, 32, 4)], 0, 244)     # attack (0,244)
    row([harpist_frame(f) for f in frames(src, 128, 128, 16, 40, 4)], 96, 244)     # Harpist walk (96,244) 16x40
    row([harpist_frame(f) for f in frames(src, 192, 128, 16, 40, 1)], 160, 244)    # bless (160,244)
    row([harpist_frame(f) for f in frames(src, 208, 128, 16, 40, 4)], 176, 244)    # return (176,244)
    row([harpist_frame(f) for f in frames(src, 272, 128, 16, 40, 1)], 240, 244)    # pray (240,244)
    return big

def units():
    unit_sheet_v34(BLUE, unit_sheet(BLUE)).save(os.path.join(A, 'spr_sky_blue_alpha.png'))
    unit_sheet_v34(RED, unit_sheet(RED)).save(os.path.join(A, 'spr_sky_red_alpha.png'))

def fx_sheet():
    out = Image.new('RGBA', (160, 176), (0, 0, 0, 0))
    out.alpha_composite(gap_frame(), (0, 0)); out.alpha_composite(cloud_bridge(), (40, 0))
    out.alpha_composite(gap_icon(), (88, 0)); out.alpha_composite(wind_icon(), (104, 0)); out.alpha_composite(observatory(), (120, 0))
    out.alpha_composite(cloud_icon(), (144, 0))
    for k in range(3): out.alpha_composite(bolt(k), (24 * k, 56))
    out.save(os.path.join(A, 'spr_sky_fx_alpha.png'))

_register_icons_v31 = register_icons
def register_icons():
    _register_icons_v31()
    import art_hud as H
    from art_north import body_icon
    S = lambda side: Image.open(os.path.join(A, 'spr_sky_blue_alpha.png' if side == 0 else 'spr_sky_red_alpha.png')).convert('RGBA')
    H.register((7, 3), lambda h, sel, side: body_icon(h, sel, S(side), (0, 192, 32, 16)))     # shepherd
    H.register((8, 3), lambda h, sel, side: body_icon(h, sel, S(side), (64, 192, 16, 52)))    # lancer
    H.register((9, 3), lambda h, sel, side: body_icon(h, sel, S(side), (128, 192, 24, 32)))   # guardian
    H.register((0, 4), lambda h, sel, side: body_icon(h, sel, S(side), (160, 244, 16, 40)))   # harpist

# ------------------------------------------------------------------ v3.6: the Sky Lancer no longer looks like a Sky-skin pikeman
PENNANT = (90, 140, 210, 255)     # mapped to the team colour by art_team
def lancer_v36(f):
    """Lancer: bare head with a gold circlet (no winged helmet - that is the Sky skin's pikeman), a team
    pennant under the lance tip and a round gold shield on the back."""
    f = lancer_frame(f).copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            if p[x, y][3] and p[x, y][:3] == CLOUD1[:3]: p[x, y] = (0, 0, 0, 0)    # the plume-wing goes
    shaft = [(x, y) for y in range(H) for x in range(W) if p[x, y][3] and p[x, y][:3] in ((190, 190, 200), GOLD1[:3])]
    if shaft:
        sx = min(x for x, _ in shaft); ty = min(y for _, y in shaft)
        for y in range(ty + 4, ty + 8):
            for x in range(sx + 1, sx + 1 + (ty + 8 - y)): put(f, x, y, PENNANT)
    for (dx, dy) in ((0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (3, 1), (-1, 2), (0, 2), (1, 2), (2, 2), (3, 2), (0, 3), (1, 3), (2, 3)):
        put(f, dx, 34 + dy, GOLD1 if (dx, dy) != (1, 1) else GOLD2)
    return outline(f)

_unit_sheet_v34 = unit_sheet_v34
def unit_sheet_v34(src, out):
    big = _unit_sheet_v34(src, out)
    for i, fr in enumerate(frames(src, 64, 204, 16, 52, 4)):
        big.paste(Image.new('RGBA', (16, 52), (0, 0, 0, 0)), (64 + 16 * i, 192)); big.alpha_composite(lancer_v36(fr), (64 + 16 * i, 192))
    return big
