"""Underworld art: dwarven castle skin, map icons, unit sprites, fx sheet, HUD icons."""
import os, sys, math, random
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pix import *
from art_north import frames, BLUE, RED, O, team_colour, unit_icon
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
LAVA1, LAVA2, LAVA3 = (255, 214, 90, 255), (240, 120, 40, 255), (150, 50, 25, 255)
ROCK1, ROCK2, ROCK3 = (96, 90, 100, 255), (66, 60, 72, 255), (44, 40, 50, 255)
BEARD = (214, 120, 40, 255)

def dwarf_castle(im):
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if s < 0.28: return from_hsv(0.68, 0.12, 0.2 + v * 0.45, a)               # stone -> dark basalt
        if 0.5 < h < 0.7 and s > 0.3: return from_hsv(0.6, 0.1, 0.2 + v * 0.3, a)  # blue roofs -> iron
        if h < 0.12 and s > 0.4 and v > 0.5: return from_hsv(0.08, 0.9, 0.5 + v * 0.5, a)  # orange roof -> forge glow
        return None
    out = recolor(im, fn); p = out.load()
    for y in range(out.height):      # doorways and dark openings glow orange
        for x in range(out.width):
            r, g, b, a = p[x, y]
            if a and (r, g, b) == O[:3]:
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < out.width and 0 <= y + dy < out.height and p[x + dx, y + dy][:3] == O[:3])
                if n == 4 and 100 < y < 190: p[x, y] = LAVA2
    return out

def castle_skin():
    src = Image.open(os.path.join(A, 'spr_castles_alpha.png')).convert('RGBA')
    dwarf_castle(src).save(os.path.join(A, 'spr_under_castles_alpha.png'))

def map_icons():
    src = Image.open(os.path.join(A, 'mapcastles_alpha.png')).convert('RGBA')
    def fn(r, g, b, a):
        h, s, v = hsv(r, g, b)
        if (r, g, b) == O[:3] or s < .15: return None
        return from_hsv(h, s, v * 0.75, a)
    out = recolor(src, fn)
    # the "boat" frames (368,0) 64x64 x4 become a torch-lit cave mouth
    for k in range(4):
        tile = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        disc(tile, 32, 40, 22, ROCK2); disc(tile, 32, 40, 17, ROCK3); disc(tile, 32, 42, 11, (20, 16, 20, 255))
        rect(tile, 0, 46, 63, 63, (0, 0, 0, 0))
        for x in range(10, 54): put(tile, x, 46, ROCK1)
        fl = 1 if k % 2 else 0
        for tx in (16, 48):
            rect(tile, tx, 30, tx + 1, 40, (120, 80, 40, 255)); disc(tile, tx + .5, 27 - fl, 2.5, LAVA2); put(tile, tx, 25 - fl, LAVA1)
        outline(tile)
        out.paste(tile, (368, 64 * k))
    out.save(os.path.join(A, 'under_mapcastles_alpha.png'))

def miner_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < .3 and y < 8: p[x, y] = (200, 170, 60, 255)                        # cap -> yellow helmet
            elif .02 < h < .12 and s > .4 and y > 12 and v > .5: p[x, y] = (120, 90, 200, 255)  # log -> ore crystal
    top = min((y for y in range(H) for x in range(W) if p[x, y][3]), default=0)
    for x in range(W - 1, -1, -1):
        if p[x, top + 2][3] and p[x, top + 2][:3] != O[:3]: put(f, x + 1, top + 2, LAVA1); break
    return f

def burrower_frame(f):
    def fn(r, g, b, a):
        h, s, v = hsv(r, g, b)
        if (r, g, b) == O[:3]: return None
        if s > .35 and h < .15: return from_hsv(0.06, 0.35, 0.25 + v * 0.35, a)   # tan -> dark mole fur
        if 0.5 < h < 0.7: return (230, 120, 140, 255)                              # collar -> pink nose/claws
        return None
    return recolor(f, fn)

def lava_golem_frame(f):
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if s < 0.3:
            if v > 0.72: return LAVA2 if v < 0.85 else LAVA1                       # highlights -> glowing cracks
            return from_hsv(0.05, 0.3, 0.12 + v * 0.3, a)                          # body -> cooled basalt
        if 0.5 < h < 0.7: return LAVA3
        return None
    return recolor(f, fn)

def dwarf_frame(f):
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if ((0.5 < h < 0.7) or (0.18 < h < 0.46)) and s > .3: p[x, y] = ROCK2 if v < .6 else ROCK1   # overalls -> leather/iron
            elif s < .3 and y < 7: p[x, y] = (110, 80, 50, 255)                     # helmet -> leather cap
    for y in range(6, 12):                                                           # big orange beard on the front
        for x in range(W // 2 - 1, min(W, W // 2 + 5)):
            if p[x, y][3] and p[x, y][:3] != O[:3] and hsv(*p[x, y][:3])[1] > .3: p[x, y] = BEARD
    return f

BAT = [from_rows(['OO....OO....', 'OWWO.OWWO...', '.OWWOWWO....', '..OWBWO.....', '...OBO......'], {'O': O, 'W': (90, 70, 100, 255), 'B': (60, 40, 70, 255)}),
       from_rows(['............', '............', 'OOOOOBOOOOO.', '.OWWWBWWWO..', '...OOBOO....'], {'O': O, 'W': (90, 70, 100, 255), 'B': (60, 40, 70, 255)})]

def unit_sheet(src):
    out = Image.new('RGBA', (256, 128), (0, 0, 0, 0))
    def row(fs, x, y):
        for i, fr in enumerate(fs): out.alpha_composite(fr, (x + i * fr.width, y))
    row([miner_frame(f) for f in frames(src, 0, 0, 16, 24, 4)], 0, 0)            # Miner walk (0,0)
    row([miner_frame(f) for f in frames(src, 0, 48, 16, 24, 4)], 64, 0)          # Miner carry (64,0)
    row([burrower_frame(f) for f in frames(src, 160, 352, 32, 16, 5)], 0, 24)     # Burrower walk (0,24)
    row([burrower_frame(f) for f in frames(src, 160, 368, 32, 16, 3)], 160, 24)   # Burrower attack (160,24)
    row([lava_golem_frame(f) for f in frames(src, 176, 224, 24, 32, 4)], 0, 40)   # Lava golem walk (0,40)
    row([lava_golem_frame(f) for f in frames(src, 272, 224, 24, 32, 4)], 96, 40)  # attack (96,40)
    ex = 64 if src is BLUE else 64; ey = 48 if src is BLUE else 0
    row([dwarf_frame(f) for f in frames(src, ex, ey, 16, 24, 4)], 0, 72)          # Dwarf walk (0,72)
    row([b.resize((24, 10), Image.NEAREST) for b in BAT], 64, 72)                  # Bat 2 frames 24x10 at (64,72)
    return out

def units():
    unit_sheet(BLUE).save(os.path.join(A, 'spr_under_blue_alpha.png'))
    unit_sheet(RED).save(os.path.join(A, 'spr_under_red_alpha.png'))

# ---------------------------------------------------------------- fx
def ore():
    return outline(from_rows(['.......P........', '......PLP.......', '.....PLLPP......', '....PLLPPPP.....', '..P.PLLPPPP.P...', '.PLPPLPPPPPLP...', '.PLLPPPPPPLLLP..', 'PPPPPPPPPPPPPP..'],
                             {'P': (120, 90, 200, 255), 'L': (200, 180, 255, 255)}))

def lava_column(k):
    im = Image.new('RGBA', (24, 40), (0, 0, 0, 0)); r = random.Random(k)
    for y in range(40):
        w = 4 + int(7 * (y / 40)) + (2 if (y + k * 3) % 7 < 2 else 0)
        for x in range(12 - w, 12 + w): put(im, x, y, LAVA1 if abs(x - 12) < w * .4 else LAVA2)
    for _ in range(10): put(im, r.randint(2, 21), r.randint(0, 14), LAVA2)
    return outline(im, LAVA3)

def lava_pool():
    im = Image.new('RGBA', (36, 8), (0, 0, 0, 0))
    for y in range(8):
        for x in range(36):
            if ((x - 18) / 18) ** 2 + ((y - 4) / 4) ** 2 <= 1: put(im, x, y, LAVA2 if (x + y) % 5 else LAVA1)
    return outline(im, LAVA3)

def seal():
    im = Image.new('RGBA', (10, 22), (0, 0, 0, 0))
    for y in range(22): rect(im, 1, y, 8, y, (120, 80, 40, 255) if (y // 3) % 2 else (90, 60, 30, 255))
    rect(im, 1, 0, 8, 0, (160, 110, 60, 255)); rect(im, 4, 0, 5, 21, (70, 45, 22, 255))
    return outline(im)

def anvil():
    im = Image.new('RGBA', (22, 16), (0, 0, 0, 0))
    rect(im, 2, 3, 19, 6, ROCK1); rect(im, 0, 4, 3, 5, ROCK1); rect(im, 7, 7, 14, 11, ROCK2); rect(im, 5, 12, 16, 14, ROCK2); rect(im, 2, 3, 19, 3, (150, 150, 165, 255))
    put(im, 9, 1, LAVA1); put(im, 11, 0, LAVA2); put(im, 13, 1, LAVA1)
    return outline(im)

def tunnel_mouth():
    im = Image.new('RGBA', (24, 28), (0, 0, 0, 0))
    disc(im, 12, 16, 11, ROCK1); disc(im, 12, 17, 8, (22, 16, 22, 255)); rect(im, 0, 20, 23, 27, (0, 0, 0, 0))
    for x in range(1, 23): put(im, x, 20, ROCK2)
    return outline(im)

def fx_sheet():
    out = Image.new('RGBA', (160, 64), (0, 0, 0, 0))
    out.alpha_composite(ore(), (0, 0)); out.alpha_composite(seal(), (16, 0)); out.alpha_composite(anvil(), (32, 0)); out.alpha_composite(tunnel_mouth(), (56, 0))
    for k in range(3): out.alpha_composite(lava_column(k), (80 + 24 * k, 0))
    out.alpha_composite(lava_pool(), (0, 48))
    out.save(os.path.join(A, 'spr_under_fx_alpha.png'))

def register_icons():
    import art_hud as H, art_upgrades as U
    def fg(h, sel, side):
        ic = U.icon_base(h, sel); ic.alpha_composite(anvil(), (22, 22)); return ic
    H.register((6, 1), fg)
    S = lambda side: Image.open(os.path.join(A, 'spr_under_blue_alpha.png' if side == 0 else 'spr_under_red_alpha.png')).convert('RGBA')
    H.register((7, 1), lambda h, sel, side: unit_icon(h, sel, S(side), (0, 0, 16, 20), 2, (0, 2)))      # miner
    H.register((8, 1), lambda h, sel, side: unit_icon(h, sel, S(side), (0, 24, 32, 16), 1, (0, 4)))     # burrower
    H.register((9, 1), lambda h, sel, side: unit_icon(h, sel, S(side), (0, 40, 24, 22), 2, (0, 4)))     # lava golem
    def bats(h, sel, side):
        oy = 96 if sel else 0; base = h.crop((432, 240 + oy, 480, 288 + oy)).copy(); sh = S(side)
        for i, (x, y) in enumerate(((8, 10), (22, 20), (12, 30))): base.alpha_composite(sh.crop((64 + 24 * (i % 2), 72, 88 + 24 * (i % 2), 82)), (x, y))
        return base
    H.register((0, 2), bats)                                                                             # bat swarm
    H.register((1, 2), lambda h, sel, side: unit_icon(h, sel, S(side), (0, 72, 16, 20), 2, (0, 2)))     # dwarf


def scenery():
    """Trees -> glowing cave fungus (magenta caps, pale stems)."""
    src = Image.open(os.path.join(A, 'spr_atmos_alpha.png')).convert('RGBA')
    def fn(r, g, b, a):
        h, s, v = hsv(r, g, b)
        if (r, g, b) == O[:3]: return None
        if 0.15 < h < 0.45 and s > .25: return from_hsv(0.85, 0.55, 0.45 + v * 0.5, a)
        if h < 0.12 and s > .3: return from_hsv(0.1, 0.15, 0.6 + v * 0.3, a)
        return None
    recolor(src, fn).save(os.path.join(A, 'spr_under_atmos_alpha.png'))

def build():
    castle_skin(); map_icons(); units(); fx_sheet(); scenery()

if __name__ == '__main__':
    build(); print('under ok')
