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
    bb = fr.getbbox()                                   # centre the figure itself, not its frame
    if bb: fr = fr.crop(bb); w, h = fr.size
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
    H.register((3, 0), lambda h, sel, side: body_icon(h, sel, S(side), (0, 0, 24, 24)))       # berserker (24 px frames since v3.6)
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

# ------------------------------------------------------------------ v3.5: the frozen lake and five more units
ICE1, ICE2 = (200, 235, 255, 255), (120, 180, 230, 255)
def fisher_frame(f, rod=False, k=0):
    """Woodcutter in a fur hat and a thick coat; when fishing he holds a rod over the hole."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if y < 5 and 0.5 < h < 0.7: p[x, y] = FUR1 if (x + y) % 2 else FUR2                    # cap -> fur hat
            elif 10 < y < 19 and (r, g, b) in SKIN and 2 < x < 10: p[x, y] = (80, 110, 150, 255) if v > .8 else (60, 85, 120, 255)   # bare chest -> coat
            elif .02 < h < .12 and s > .4 and y > 12 and v > .5: p[x, y] = ICE2                  # log -> a fish (ice blue)
    if rod:
        for y in range(4 + k, 16): put(f, W - 2, y, (120, 80, 40, 255))
        for i in range(4): put(f, W - 2 + (i if i < 3 else 2), 3 + k - (i if i < 3 else 2), (120, 80, 40, 255))
        put(f, W - 1, 20, ICE1)
    return f

def owl_frame(k):
    """24x16 white owl, wings up / down."""
    im = Image.new('RGBA', (24, 16), (0, 0, 0, 0)); up = k % 2 == 0
    disc(im, 12, 9, 4, (245, 245, 250, 255)); disc(im, 12, 4, 3, (245, 245, 250, 255))
    put(im, 11, 3, (40, 40, 50, 255)); put(im, 13, 3, (40, 40, 50, 255)); put(im, 12, 5, (230, 170, 60, 255))
    for side in (-1, 1):
        for i in range(8):
            x = 12 + side * (4 + i); y = (4 - i // 2) if up else (9 + i // 2)
            put(im, x, y, (225, 228, 235, 255)); put(im, x, y + 1, (190, 196, 210, 255))
    for x in (10, 14): put(im, x, 13, (230, 170, 60, 255))
    return outline(im)

def huntress_frame(f):
    """Archer in a white fur hood and pale leathers; the arrow tips glow ice-blue."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if 0.5 < h < 0.7 and s > 0.3: p[x, y] = (210, 200, 180, 255) if v > .6 else (150, 135, 110, 255)   # tunic -> leathers
            elif y < 8 and hsv(r, g, b)[1] < .15 and v > .8 and x > W - 6: p[x, y] = ICE2             # arrow -> ice
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1, 0, W - 1)
        blit(f, hood(min(W, x1 - x0 + 5), (235, 235, 240, 255)), max(0, x0 - 2), top - 4)
        for y in range(top, bot + 1): put(f, x0 - 1, y, (235, 235, 240, 255)); put(f, x0 - 2, y, O)
    return f

def trapper_frame(f):
    """Engineer body in a fur hat and brown coat, a bear trap hanging from his hand."""
    f = f.copy(); p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if y < 5 and (0.5 < h < 0.7 or (0.2 < h < 0.45 and s > .3)): p[x, y] = FUR1 if (x + y) % 2 else FUR2
            elif 0.2 < h < 0.45 and s > .3: p[x, y] = (120, 85, 50, 255) if v > .5 else (85, 60, 35, 255)   # green -> brown coat
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = (85, 60, 35, 255)
    blit(f, bear_trap(), W - 7, 15)
    return f

def bear_trap():
    im = Image.new('RGBA', (12, 8), (0, 0, 0, 0))
    rect(im, 1, 5, 10, 6, (120, 125, 140, 255))
    for x in range(1, 11, 2): put(im, x, 4, (190, 196, 210, 255)); put(im, x, 3 if x % 4 == 1 else 4, (190, 196, 210, 255))
    put(im, 5, 2, (190, 196, 210, 255)); put(im, 6, 2, (190, 196, 210, 255))
    return outline(im)

def skald_frame(f):
    """Priest body as a norse bard: no mitre, blond braids, a dark blue cloak, a lyre held in front."""
    f = f.copy(); p = f.load(); W, H = f.size
    fb = face_box(f)
    for y in range(H):
        for x in range(W):
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == O[:3]: continue
            h, s, v = hsv(r, g, b)
            if s < 0.25 and y >= 10: p[x, y] = (60, 80, 130, 255) if v > 0.7 else (40, 55, 95, 255)
            elif 0.5 < h < 0.7 and s > 0.3: p[x, y] = FUR1
    if fb:
        x0, x1, top, bot = fb
        clear_above(f, top - 1, 0, W - 1)
        hair = outline(from_rows(['.' + '#' * (x1 - x0 + 1) + '.', '#' * (x1 - x0 + 3)], {'#': (225, 181, 45, 255)})); blit(f, hair, x0 - 1, top - 2)
        for y in range(top, min(H, bot + 8)): put(f, x0 - 1, y, (225, 181, 45, 255) if y % 3 else (178, 110, 44, 255)); put(f, x0 - 2, y, O)
    lyre = outline(from_rows(['G.G', 'G.G', 'GGG', '.G.'], {'G': (200, 150, 60, 255)})); blit(f, lyre, W - 4, 21)
    put(f, W - 3, 22, (250, 250, 250, 255)); put(f, W - 3, 23, (250, 250, 250, 255))
    return f

def ice_arrow():
    im = Image.new('RGBA', (16, 8), (0, 0, 0, 0))
    rect(im, 2, 3, 12, 3, (230, 230, 240, 255)); rect(im, 12, 2, 14, 4, ICE2); put(im, 15, 3, ICE1); rect(im, 2, 2, 3, 4, (120, 80, 40, 255))
    return im

def lake_icon():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    rect(im, 0, 6, 15, 13, ICE1); rect(im, 0, 13, 15, 14, ICE2)
    disc(im, 8, 9, 2, (30, 60, 90, 255)); put(im, 3, 7, (255, 255, 255, 255)); put(im, 12, 11, (255, 255, 255, 255))
    for x in (1, 14): rect(im, x, 1, x, 5, (60, 120, 60, 255)); put(im, x - 1 if x else 0, 2, (60, 120, 60, 255)); put(im, min(15, x + 1), 2, (60, 120, 60, 255))
    return outline(im)

def unit_sheet_v35(src, out):
    big = Image.new('RGBA', (256, 232), (0, 0, 0, 0)); big.alpha_composite(out, (0, 0))
    def row(fs, x, y):
        for i, fr in enumerate(fs): big.alpha_composite(fr, (x + i * fr.width, y))
    row([fisher_frame(f) for f in frames(src, 0, 0, 16, 24, 4)], 0, 144)                     # Fisher walk (0,144)
    row([fisher_frame(f) for f in frames(src, 0, 48, 16, 24, 4)], 64, 144)                   # carry (64,144)
    row([fisher_frame(f, True, k) for k, f in enumerate(frames(src, 0, 0, 16, 24, 2))], 128, 144)   # fishing (128,144) x2
    row([owl_frame(k) for k in range(2)], 160, 144)                                           # Owl (160,144) 24x16 x2
    big.alpha_composite(ice_arrow(), (208, 144))                                              # IceArrow (208,144)
    row([huntress_frame(f) for f in frames(src, 64, 72, 16, 24, 4)], 0, 168)                 # Huntress walk (0,168)
    row([huntress_frame(f) for f in frames(src, 64, 96, 16, 24, 3)], 64, 168)                # attack (64,168)
    row([trapper_frame(f) for f in frames(src, 64, 48, 16, 24, 4)], 112, 168)                # Trapper walk (112,168)
    big.alpha_composite(bear_trap(), (176, 168))                                              # BearTrap (176,168) 12x8
    row([skald_frame(f) for f in frames(src, 128, 128, 16, 40, 4)], 0, 192)                  # Skald walk (0,192)
    row([skald_frame(f) for f in frames(src, 192, 128, 16, 40, 1)], 64, 192)                 # bless
    row([skald_frame(f) for f in frames(src, 208, 128, 16, 40, 4)], 80, 192)                 # return
    row([skald_frame(f) for f in frames(src, 272, 128, 16, 40, 1)], 144, 192)                # pray
    return big

def units():
    unit_sheet_v35(BLUE, unit_sheet(BLUE)).save(os.path.join(A, 'spr_north_blue_alpha.png'))
    unit_sheet_v35(RED, unit_sheet(RED)).save(os.path.join(A, 'spr_north_red_alpha.png'))

_fx_sheet_v31 = fx_sheet
def fx_sheet():
    _fx_sheet_v31()
    im = Image.open(os.path.join(A, 'spr_north_fx_alpha.png')).convert('RGBA')
    out = Image.new('RGBA', (192, 64), (0, 0, 0, 0)); out.alpha_composite(im, (0, 0))
    out.alpha_composite(lake_icon(), (128, 0)); out.alpha_composite(bear_trap(), (176, 48))
    out.save(os.path.join(A, 'spr_north_fx_alpha.png'))

_register_icons_v31 = register_icons
def register_icons():
    _register_icons_v31()
    import art_hud as H
    S = lambda side: Image.open(os.path.join(A, 'spr_north_blue_alpha.png' if side == 0 else 'spr_north_red_alpha.png')).convert('RGBA')
    H.register((1, 4), lambda h, sel, side: body_icon(h, sel, S(side), (128, 144, 16, 24)))   # fisher with rod
    H.register((2, 4), lambda h, sel, side: body_icon(h, sel, S(side), (160, 144, 24, 16)))   # owl
    H.register((3, 4), lambda h, sel, side: body_icon(h, sel, S(side), (64, 168, 16, 24)))    # huntress
    H.register((4, 4), lambda h, sel, side: body_icon(h, sel, S(side), (112, 168, 16, 24)))   # trapper
    H.register((5, 4), lambda h, sel, side: body_icon(h, sel, S(side), (64, 192, 16, 40)))    # skald

# ------------------------------------------------------------------ v3.6: telling look-alikes apart
STEEL_A, STEEL_B, HAFT = (210, 216, 228, 255), (150, 156, 176, 255), (120, 80, 40, 255)
def skin_px(f):
    p = f.load(); W, H = f.size
    return [(x, y) for y in range(H) for x in range(W) if p[x, y][3] and p[x, y][:3] in ((195, 136, 70), (255, 166, 88))]

def axe_at(f, hx, hy, d, pose):
    """One hand axe gripped at (hx, hy); d = +1 blade forward, -1 blade backward.
    pose 'low': hanging down and out, 'high': raised over the head, 'chop': swung forward level."""
    if pose == 'low':
        handle = [(hx + d * i, hy + i) for i in range(1, 4)]; ex, ey = hx + d * 3, hy + 3
        blade = [(ex + d * 1, ey - 2), (ex + d * 2, ey - 2), (ex + d * 1, ey - 1), (ex + d * 2, ey - 1), (ex + d * 3, ey - 1),
                 (ex + d * 1, ey), (ex + d * 2, ey), (ex + d * 3, ey), (ex + d * 1, ey + 1), (ex + d * 2, ey + 1)]
    elif pose == 'high':
        handle = [(hx, hy - i) for i in range(1, 7)]; ex, ey = hx, hy - 6
        blade = [(ex + d * 1, ey - 1), (ex + d * 1, ey), (ex + d * 1, ey + 1), (ex + d * 2, ey - 2), (ex + d * 2, ey - 1),
                 (ex + d * 2, ey), (ex + d * 2, ey + 1), (ex + d * 2, ey + 2), (ex + d * 3, ey - 1), (ex + d * 3, ey + 1)]
    else:
        handle = [(hx + d * i, hy - 1) for i in range(1, 6)]; ex, ey = hx + d * 5, hy - 1
        blade = [(ex + d, ey - 1), (ex + d, ey), (ex + d, ey + 1), (ex + d * 2, ey - 2), (ex + d * 2, ey - 1),
                 (ex + d * 2, ey), (ex + d * 2, ey + 1), (ex + d * 2, ey + 2)]
    for (x, y) in handle: put(f, x, y, HAFT)
    for i, (x, y) in enumerate(blade): put(f, x, y, STEEL_A if i < 5 else STEEL_B)

def berserker_v36(f16, k, attack=False):
    """Bare-chested raider with a red crest of hair, a fur cape, a team-coloured kilt and an axe in each hand (24 px wide frame)."""
    g = berserker_frame(f16).copy(); p = g.load(); W, H = g.size
    for y in range(18, H):                                         # fur kilt -> team kilt
        for x in range(W):
            c = p[x, y]
            if c[3] and c[:3] in (FUR1[:3], FUR2[:3]): p[x, y] = (88, 164, 255, 255) if y < 21 else (62, 118, 164, 255)
    f = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); f.alpha_composite(g, (4, 0)); p = f.load()
    sk = [q for q in skin_px(f) if q[1] >= 11]
    fx, fy = max(sk, key=lambda q: (q[0], -q[1])) if sk else (15, 16)
    bx, by = min(sk, key=lambda q: (q[0], q[1])) if sk else (5, 14)
    for y in range(10, 14):                                        # fur cape over the back shoulder
        for x in range(bx - 1, bx + 3):
            if p[x, y][3] and p[x, y][:3] != O[:3]: p[x, y] = FUR1 if (x + y) % 2 else FUR2
    if attack:
        axe_at(f, fx, fy, 1, ('high', 'chop', 'low')[k % 3])
        axe_at(f, bx, by, -1, ('low', 'high', 'high')[k % 3])
    else:
        axe_at(f, fx, fy, 1, 'low'); axe_at(f, bx, by, -1, 'low')
    return outline(f)

KNIT, KNIT2 = (236, 236, 240, 255), (200, 60, 60, 255)
def fisher_v36(f, rod=False, k=0):
    """Ice fisher: knitted white cap with a red stripe and pompom (not the fur hat every northern worker wears), rod always in hand."""
    f = fisher_frame(f, rod, k); p = f.load(); W, H = f.size
    for y in range(0, 5):
        for x in range(W):
            if p[x, y][3] and p[x, y][:3] in (FUR1[:3], FUR2[:3]): p[x, y] = KNIT2 if y == 3 else KNIT
    top = min((y for y in range(H) for x in range(W) if p[x, y][3] and p[x, y][:3] == KNIT[:3]), default=0)
    xs = [x for x in range(W) if p[x, top][3] and p[x, top][:3] == KNIT[:3]]
    if xs: put(f, (min(xs) + max(xs)) // 2, max(0, top - 1), KNIT2); put(f, (min(xs) + max(xs)) // 2 + 1, max(0, top - 1), KNIT2)
    if not rod:                                                    # rod over the shoulder while walking
        for i in range(9): put(f, 3 + i, 14 - i, HAFT)
        put(f, 12, 4, (230, 230, 240, 255)); put(f, 12, 5, (230, 230, 240, 255))
    return outline(f)

WOLF1, WOLF2 = (150, 154, 166, 255), (104, 108, 122, 255)
def trapper_v36(f):
    """Trapper wears a whole wolf pelt: grey hood with ears and a snout over the brow (the fur cap is the northern workers' look)."""
    f = trapper_frame(f); p = f.load(); W, H = f.size
    for y in range(0, 6):
        for x in range(W):
            if p[x, y][3] and p[x, y][:3] in (FUR1[:3], FUR2[:3]): p[x, y] = WOLF1 if (x + y) % 2 else WOLF2
    cap = [(x, y) for y in range(0, 6) for x in range(W) if p[x, y][3] and p[x, y][:3] in (WOLF1[:3], WOLF2[:3])]
    if cap:
        x0 = min(x for x, _ in cap); x1 = max(x for x, _ in cap); t = min(y for _, y in cap)
        for (x, y) in ((x0, t - 1), (x0 + 1, t - 2), (x1 - 2, t - 1), (x1 - 1, t - 2)): put(f, x, y, WOLF2)   # ears
        put(f, x1 + 1, t + 2, WOLF1); put(f, x1 + 2, t + 2, WOLF2); put(f, x1 + 1, t + 1, (40, 40, 48, 255))  # snout and eye
        for y in range(t + 2, t + 9): put(f, x0 - 1, y, WOLF2 if y % 2 else WOLF1)                           # pelt down the back
    return outline(f)

_unit_sheet_v35 = unit_sheet_v35
def unit_sheet_v35(src, out):
    big = _unit_sheet_v35(src, out)
    def row(fs, x, y):
        for i, fr in enumerate(fs):
            big.paste(Image.new('RGBA', fr.size, (0, 0, 0, 0)), (x + i * fr.width, y)); big.alpha_composite(fr, (x + i * fr.width, y))
    big.paste(Image.new('RGBA', (176, 24), (0, 0, 0, 0)), (0, 0))
    row([berserker_v36(f, k) for k, f in enumerate(frames(src, 0, 0, 16, 24, 4))], 0, 0)          # Berserker walk, 24 px frames
    row([berserker_v36(f, k, True) for k, f in enumerate(frames(src, 0, 0, 16, 24, 3))], 96, 0)   # Berserker attack (96,0): axes swing
    row([fisher_v36(f) for f in frames(src, 0, 0, 16, 24, 4)], 0, 144)
    row([fisher_v36(f) for f in frames(src, 0, 48, 16, 24, 4)], 64, 144)
    row([fisher_v36(f, True, k) for k, f in enumerate(frames(src, 0, 0, 16, 24, 2))], 128, 144)
    row([trapper_v36(f) for f in frames(src, 64, 48, 16, 24, 4)], 112, 168)
    return big
