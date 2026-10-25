"""Northern Realm art: map castle icons, castle skin, victory screens, Longhouse upgrade,
new unit sprites and their HUD icons. Run tools/build_art.py to regenerate everything."""
import os, sys, math, random
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from pix import *
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
SNOW1, SNOW2 = rgba('#f8fbff'), rgba('#cfe0f2')

def snowcap(im, depth=2, regions=None, offset=1):
    """Snow on every upward-facing pixel (opaque with transparent above), inside the given rects."""
    a = np.array(im.convert('RGBA')); al = a[..., 3] > 0; H, W = al.shape
    top = al & ~np.vstack([np.zeros((1, W), bool), al[:-1]])
    if regions is not None:
        keep = np.zeros_like(top)
        for x, y, w, h in regions: keep[y:y + h, x:x + w] = True
        top &= keep
    out = a.copy()
    for d in range(offset + depth - 1, offset - 1, -1):
        sh = np.vstack([np.zeros((d, W), bool), top[:H - d]]) if d else top
        m = sh & al & (a[..., 3] > 200)
        out[m] = SNOW1 if d < offset + depth - 1 else SNOW2
    return Image.fromarray(out, 'RGBA')

def cool(im, amount=0.35):
    """Shift warm/neutral stone to a colder palette."""
    def f(r, g, b, a):
        h, s, v = hsv(r, g, b)
        if s < 0.28: return from_hsv(0.6, s * (1 - amount) + 0.12 * amount, v * 0.9, a)
        return None
    return recolor(im, f)

def map_icons():
    src = Image.open(os.path.join(A, 'mapcastles_alpha.png')).convert('RGBA')
    out = snowcap(src, depth=3, regions=[(0, 0, 320, 240), (0, 304, 320, 80), (0, 384, 320, 80)])
    out.save(os.path.join(A, 'north_mapcastles_alpha.png'))

def castle_skin():
    src = Image.open(os.path.join(A, 'spr_castles_alpha.png')).convert('RGBA')
    rects = [(0, 0, 192, 192), (192, 112, 192, 64), (288, 0, 96, 96), (192, 64, 96, 48), (384, 256, 96, 192)]
    out = snowcap(cool(src, 0.6), depth=4, regions=rects)
    out.save(os.path.join(A, 'spr_north_castles_alpha.png'))

if __name__ == '__main__':
    map_icons(); castle_skin(); print('north ok')

# ------------------------------------------------------------------ units
BLUE = Image.open(os.path.join(A, 'spr_blue_alpha.png')).convert('RGBA')
RED = Image.open(os.path.join(A, 'spr_red_alpha.png')).convert('RGBA')
O = (50, 54, 71, 255)
BONE1, BONE2 = (245, 238, 214, 255), (196, 182, 150, 255)
HELM1, HELM2, HELM3 = (172, 172, 180, 255), (144, 136, 160, 255), (108, 103, 132, 255)
BEARD1, BEARD2 = (230, 120, 40, 255), (180, 80, 30, 255)
HAIR = {(140, 105, 8), (225, 181, 45), (178, 110, 44)}
SKIN = {(195, 136, 70), (255, 166, 88)}

def frames(src, x, y, w, h, n):
    return [src.crop((x + i * w, y, x + (i + 1) * w, y + h)) for i in range(n)]

def berserker_frame(f):
    f = f.copy(); px = f.load(); W, H = f.size
    head = [(x, y) for y in range(0, 11) for x in range(W) if px[x, y][:3] in HAIR | SKIN]
    if not head: return f
    x0 = min(x for x, _ in head); x1 = max(x for x, _ in head)
    for y in range(0, 6):  # hair -> helmet
        for x in range(W):
            if px[x, y][:3] in HAIR: px[x, y] = HELM1 if y < 2 else HELM2 if y < 4 else HELM3
    top = min(y for x, y in head)
    # horns curving up at both sides of the helmet
    for (hx, d) in ((x0 - 1, -1), (x1 + 1, 1)):
        for (dx, dy, c) in ((0, 3, BONE2), (0, 2, BONE2), (d, 1, BONE1), (d, 0, BONE1)):
            X, Y = hx + dx, top + dy
            if 0 <= X < W and 0 <= Y < H: px[X, Y] = c
    # beard on the lower half of the face (front = right side)
    for y in range(6, 11):
        for x in range(W):
            if px[x, y][:3] in SKIN and x >= x0 + 4 and y >= 8: px[x, y] = BEARD1 if (x + y) % 3 else BEARD2
    return f

def wolf_frame(f):
    def fn(r, g, b, a):
        h, s, v = hsv(r, g, b)
        if 0.02 < h < 0.13 and s > 0.35:  # tan fur -> grey/white wolf
            return from_hsv(0.6, 0.08, min(1, 0.45 + v * 0.55), a)
        return None
    return recolor(f, fn)

def giant_frame(f):
    def fn(r, g, b, a):
        if (r, g, b) == O[:3]: return None
        h, s, v = hsv(r, g, b)
        if s < 0.3:  # stone -> ice
            return from_hsv(0.55, 0.25 + (1 - v) * 0.35, min(1, v * 1.15 + 0.12), a)
        return None
    return recolor(f, fn)

def rune_frame(f):
    px = f.copy().load
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if y >= 11 and s < 0.2:  # white/grey robe -> fur & wool
                p[x, y] = from_hsv(0.08, 0.22, 0.28 + 0.45 * v, a)
    return f

DRAGON = from_rows([
    '...OOO....',
    '..OGGGO...',
    '.OGGOGGO..',
    '.OGGGGGGOO',
    '..OGGGGGGO',
    '...OGGOOO.',
    '...OGGO...',
    '..OGGO....',
    '..OGGO....',
    '.OGGO.....',
    '.OGGO.....',
], {'O': O, 'G': (214, 160, 60, 255)})
TAIL = from_rows([
    '.OOO.',
    'OGGGO',
    'OGO..',
    'OGO..',
    '.OGO.',
    '.OGO.',
], {'O': O, 'G': (214, 160, 60, 255)})
HULL1, HULL2, HULL3 = (150, 92, 50, 255), (120, 70, 38, 255), (92, 52, 30, 255)

def longship_frame(f, team):
    """Battering ram -> longship carried by the crew: hull over the log, shields, dragon prow."""
    f = f.copy(); p = f.load(); W, H = f.size
    y0, y1 = 20, 27  # rows of the log in every ram frame (same in the blue and red sheets)
    # hull: slightly deeper than the log, tapered ends
    for y in range(y0 - 1, min(H, y1 + 2)):
        inset = max(0, (y - y1)) * 3
        for x in range(1 + inset, W - 1 - inset):
            c = HULL1 if y < y0 + 2 else HULL2 if y < y1 else HULL3
            if y in (y0 - 1, y1 + 1) or x in (1 + inset, W - 2 - inset): c = O
            p[x, y] = c
    for x in range(4, W - 10, 6):  # round shields in team colour
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1), (-1, 0), (2, 1), (0, -1), (1, 2)):
            X, Y = x + dx, y0 + 1 + dy
            if 0 <= X < W: p[X, Y] = team if (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)) else O
    f.alpha_composite(DRAGON, (W - 10, max(0, y0 - 10)))
    f.alpha_composite(TAIL, (0, max(0, y0 - 5)))
    return f

def team_colour(sheet):
    return (88, 164, 255, 255) if sheet is BLUE else (217, 122, 84, 255)  # foot soldier tunic

def unit_sheet(src):
    team = team_colour(src)
    out = Image.new('RGBA', (256, 144), (0, 0, 0, 0))
    def row(fs, x, y): 
        for i, fr in enumerate(fs): out.alpha_composite(fr, (x + i * fr.width, y))
    row([berserker_frame(f) for f in frames(src, 0, 0, 16, 24, 4)], 0, 0)       # woodcutter body (bare chest)
    row([berserker_frame(f) for f in frames(src, 0, 0, 16, 24, 3)], 64, 0)
    row([wolf_frame(f) for f in frames(src, 160, 352, 32, 16, 5)], 0, 24)
    row([wolf_frame(f) for f in frames(src, 160, 368, 32, 16, 3)], 160, 24)
    row([giant_frame(f) for f in frames(src, 176, 224, 24, 32, 4)], 0, 40)
    row([giant_frame(f) for f in frames(src, 272, 224, 24, 32, 4)], 96, 40)
    row([rune_frame(f) for f in frames(src, 128, 128, 16, 40, 4)], 0, 72)
    row([rune_frame(f) for f in frames(src, 192, 128, 16, 40, 1)], 64, 72)
    row([rune_frame(f) for f in frames(src, 208, 128, 16, 40, 4)], 80, 72)
    row([rune_frame(f) for f in frames(src, 272, 128, 16, 40, 1)], 144, 72)
    row([longship_frame(f, team) for f in frames(src, 0, 416, 48, 32, 4)], 0, 112)
    return out

def units():
    unit_sheet(BLUE).save(os.path.join(A, 'spr_north_blue_alpha.png'))
    unit_sheet(RED).save(os.path.join(A, 'spr_north_red_alpha.png'))

# ------------------------------------------------------------------ effects / small sprites
RAVEN = ['.....', '..XX.', 'XXXXX', '.XXX.', '.X.X.']
def banner(team, frame):
    im = Image.new('RGBA', (16, 48), (0, 0, 0, 0))
    rect(im, 2, 4, 3, 47, (110, 70, 40, 255)); rect(im, 2, 4, 2, 47, (150, 100, 60, 255))
    rect(im, 1, 1, 4, 3, (255, 210, 60, 255))
    for x in range(4, 15):
        wob = round(math.sin(x * 0.7 + frame * 2.1) * 1.2)
        for y in range(6 + wob, 16 + wob):
            put(im, x, y, team if (y - wob) not in (6, 15) else tuple(int(c * 0.7) for c in team[:3]) + (255,))
        if x == 14: put(im, x, 16 + wob, team)
    for j, row in enumerate(RAVEN):
        for i, ch in enumerate(row):
            if ch == 'X': put(im, 7 + i, 8 + j + round(math.sin((7 + i) * 0.7 + frame * 2.1) * 1.2), (30, 30, 40, 255))
    return outline(im)

def snow_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); c = 7
    for k in range(-5, 6): put(im, c + k, c, SNOW1); put(im, c, c + k, SNOW1)
    for k in range(-3, 4): put(im, c + k, c + k, SNOW2); put(im, c + k, c - k, SNOW2)
    for (x, y) in ((c - 5, c - 1), (c - 5, c + 1), (c + 5, c - 1), (c + 5, c + 1), (c - 1, c - 5), (c + 1, c - 5), (c - 1, c + 5), (c + 1, c + 5)): put(im, x, y, SNOW1)
    return outline(im)

def ice_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    disc(im, 7.5, 9, 6.5, (170, 220, 245, 255)); disc(im, 6.5, 8, 3, (230, 248, 255, 255))
    for (x, y) in ((4, 7), (5, 8), (6, 9), (7, 9), (8, 10), (9, 9), (10, 11), (8, 7), (9, 6)): put(im, x, y, (60, 110, 150, 255))
    return outline(im)

def ice_patch(w=72, h=10):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2 <= 1:
                put(im, x, y, (196, 232, 250, 255) if y < h / 2 else (150, 205, 235, 255))
    r = random.Random(5)
    for _ in range(6):
        x, y = r.randint(10, w - 10), r.randint(2, h - 3)
        for k in range(r.randint(3, 6)): put(im, x + k, y + (k % 2), (240, 252, 255, 255))
    return im

def ice_hole(w=36, h=10):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            d = ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2
            if d <= 1: put(im, x, y, (240, 252, 255, 255) if d > 0.7 else (24, 60, 96, 255) if y > 3 else (40, 90, 130, 255))
    return im

def fx_sheet():
    out = Image.new('RGBA', (160, 64), (0, 0, 0, 0))
    blue, red = team_colour(BLUE), team_colour(RED)
    for f in range(3):
        out.alpha_composite(banner(blue, f), (16 * f, 0)); out.alpha_composite(banner(red, f), (48 + 16 * f, 0))
    out.alpha_composite(snow_icon(), (96, 0)); out.alpha_composite(ice_icon(), (112, 0))
    out.alpha_composite(ice_patch(), (0, 48)); out.alpha_composite(ice_hole(), (72, 48))
    out.save(os.path.join(A, 'spr_north_fx_alpha.png'))

# ------------------------------------------------------------------ HUD icons
def interior_mask(hud):
    """Transparent interior of the empty 48x48 frame (flood fill from the centre)."""
    e = hud.crop((432, 240, 480, 288)); a = np.array(e)[..., 3] == 0
    m = np.zeros_like(a); st = [(24, 24)]
    while st:
        x, y = st.pop()
        if 0 <= x < 48 and 0 <= y < 48 and a[y, x] and not m[y, x]:
            m[y, x] = True; st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return Image.fromarray((m * 255).astype(np.uint8), 'L')

def unit_icon(hud, sel, sheet, rect, scale, offset=(0, 0)):
    oy = 96 if sel else 0
    base = hud.crop((432, 240 + oy, 480, 288 + oy)).copy()
    x, y, w, h = rect; fr = sheet.crop((x, y, x + w, y + h))
    if scale != 1: fr = fr.resize((w * scale, h * scale), Image.NEAREST)
    layer = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    layer.alpha_composite(fr, (24 - fr.width // 2 + offset[0], 24 - fr.height // 2 + offset[1]))
    clipped = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); clipped.paste(layer, (0, 0), Image.composite(layer, clipped, interior_mask(hud)).split()[3])
    base.alpha_composite(clipped)
    return base

def body_icon(hud, sel, sheet, rect, dy=0):
    """Full-body icon like the originals: the whole frame at 1:1, shrunk (nearest) only if it does not fit 40x40."""
    x, y, w, h = rect; fr = sheet.crop((x, y, x + w, y + h))
    if w > 40 or h > 40:
        k = min(40 / w, 40 / h); fr = fr.resize((max(1, round(w * k)), max(1, round(h * k))), Image.NEAREST)
    oy = 96 if sel else 0; base = hud.crop((432, 240 + oy, 480, 288 + oy)).copy()
    base.alpha_composite(fr, (24 - fr.width // 2, 24 - fr.height // 2 + dy)); return base

def pack_icon(hud, sel, sheet):
    oy = 96 if sel else 0
    base = hud.crop((432, 240 + oy, 480, 288 + oy)).copy(); layer = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    for i, (x, y) in enumerate(((10, 8), (2, 18), (12, 28))):
        layer.alpha_composite(sheet.crop((32 * i, 24, 32 * i + 32, 40)), (x, y))
    clipped = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); clipped.paste(layer, (0, 0), Image.composite(layer, clipped, interior_mask(hud)).split()[3])
    base.alpha_composite(clipped); return base

def longhouse():
    W_, H_ = 20, 14; im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0))
    for y in range(0, 6):  # roof
        for x in range(1 + (5 - y) // 2 * 0, W_ - 1):
            if abs(x - W_ / 2) <= 4 + y * 1.2: put(im, x, y, SNOW1 if y < 2 else SNOW2 if y < 3 else (120, 74, 40, 255))
    rect(im, 2, 6, W_ - 3, H_ - 1, (150, 96, 54, 255)); rect(im, 2, 6, W_ - 3, 6, (110, 66, 36, 255))
    for x in range(4, W_ - 3, 3): rect(im, x, 7, x, H_ - 1, (128, 80, 44, 255))
    rect(im, W_ // 2 - 1, H_ - 5, W_ // 2 + 1, H_ - 1, (60, 40, 30, 255))
    return outline(im)

def register_icons():
    import art_hud as H, art_upgrades as U
    def lh(h, sel, side):
        ic = U.icon_base(h, sel); ic.alpha_composite(longhouse(), (23, 22)); return ic
    H.register((2, 0), lh)
    S = lambda side: Image.open(os.path.join(A, 'spr_north_blue_alpha.png' if side == 0 else 'spr_north_red_alpha.png')).convert('RGBA')
    H.register((3, 0), lambda h, sel, side: body_icon(h, sel, S(side), (0, 0, 16, 24)))       # berserker
    H.register((4, 0), lambda h, sel, side: pack_icon(h, sel, S(side)))                        # wolves
    H.register((5, 0), lambda h, sel, side: body_icon(h, sel, S(side), (0, 40, 24, 32)))      # frost giant
    H.register((6, 0), lambda h, sel, side: body_icon(h, sel, S(side), (0, 72, 16, 40)))      # rune priest
    H.register((7, 0), lambda h, sel, side: body_icon(h, sel, S(side), (0, 112, 48, 32)))     # longship

if __name__ != '__main__':
    pass

def scenery():
    src = Image.open(os.path.join(A, 'spr_atmos_alpha.png')).convert('RGBA')
    snowcap(src, depth=2, regions=[(80, 16, 160, 144)]).save(os.path.join(A, 'spr_north_atmos_alpha.png'))

# ------------------------------------------------------------------ v3.1 redesign (distinct silhouettes)
from art_parts import *
RED_HAIR, RED_HAIR2 = (222, 60, 40, 255), (170, 40, 30, 255)
FUR1, FUR2 = (150, 100, 56, 255), (110, 70, 40, 255)
PAINT = (60, 140, 230, 255)
def berserker_frame(f):
    """Woodcutter body (bare chest): red crest of hair instead of the cap, fur kilt, blue war paint."""
    f = f.copy(); px = f.load(); W, H = f.size
    for y in range(0, 5):
        for x in range(W):
            p = px[x, y]
            if opaque(p) and hsv(*p[:3])[0] > 0.5: px[x, y] = RED_HAIR if y < 3 else RED_HAIR2       # blue cap -> red hair
    for y in range(18, H):
        for x in range(W):
            p = px[x, y]
            if opaque(p) and hsv(*p[:3])[0] > 0.5: px[x, y] = FUR1 if (x + y) % 2 else FUR2            # shorts -> fur kilt
    for (x, y) in ((4, 12), (5, 13), (6, 14), (7, 12), (8, 13)):                                        # war paint
        if is_skin(px[x, y]): px[x, y] = PAINT
    return f
SLATE1, SLATE2, RUNE = (96, 104, 136, 255), (62, 68, 96, 255), (120, 240, 255, 255)
def rune_frame(f):
    """Priest body: the tall hat becomes a slate hood, white beard, slate robe with glowing runes."""
    f = f.copy(); px = f.load(); W, H = f.size
    fb = face_box(f)
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1)                                                   # drop the hat
        w = x1 - x0 + 5
        hd = outline(from_rows(['..' + '#' * (w - 4) + '..', '.' + '#' * (w - 2) + '.', '#' * w, '#' * w, '#' * w, '#' * w, '#' * w], {'#': SLATE1})); blit(f, hd, x0 - 2, top - 6)   # pointed hood
        for y in range(top - 1, bot + 3):                                         # hood draped at the back and over the brow
            put(f, x0 - 1, y, SLATE2); put(f, x0 - 2, y, O); put(f, x0, y, SLATE2) if y < top + 1 else None
        for x in range(x0, x1 + 2): put(f, x, top - 1, SLATE2)
        for y in range(bot - 1, bot + 2):                                         # white beard on the front
            for x in range(x0 + 3, x1 + 1):
                if is_skin(px[x, y]): px[x, y] = BONE1
    grey_range(f, 0.2, lambda x, y, p: SLATE1 if hsv(*p[:3])[2] > 0.7 else SLATE2, ymin=(fb[3] + 2) if fb else 26)
    for (x, y) in ((5, 29), (8, 32), (4, 35), (7, 37)): 
        if 0 <= x < W and 0 <= y < H and opaque(px[x, y]): px[x, y] = RUNE
    return f
