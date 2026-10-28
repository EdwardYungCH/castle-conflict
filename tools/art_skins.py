"""v3.6 unit skins: every original unit gets its own look in each expansion realm - headgear, crests,
mounts, beasts, balloon envelopes and materials redrawn in that realm's style - while the team colours
(player blue / enemy red) stay exactly as they are, so you always know whose unit it is.
HUD icon sheets are rebuilt by lifting each unit off its stone tablet, applying the same transform and
putting it back in the same place (so icons stay centred like the originals)."""
import os, sys, json, re
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pix import *
from art_parts import straw_hat, halo, blit, opaque, O
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
ENTRIES = json.load(open(os.path.join(os.path.dirname(__file__), 'base_entries.json')))
REALMS = ['north', 'east', 'under', 'sky']

# ---------------------------------------------------------------- colour sets of the original sheets
OUT = O[:3]
BLUE_SET = [(88, 218, 255), (88, 164, 255), (62, 118, 164), (47, 91, 133)]
RED_SET = [(255, 150, 123), (217, 122, 84), (195, 102, 70), (164, 88, 62), (133, 75, 55)]
HAIRC = {(140, 105, 8), (225, 181, 45), (178, 110, 44)}
SKINC = {(195, 136, 70), (255, 166, 88)}
PLUME = {(12, 178, 134), (20, 255, 192)}
HORSE = {(141, 105, 71), (172, 136, 70), (203, 162, 70)}
GREEN = {(126, 164, 50), (120, 225, 56)}
ARMOUR = [(188, 188, 188), (172, 172, 180), (144, 136, 160), (128, 128, 128), (108, 103, 132), (88, 88, 88)]
METAL = {   # armour greys per realm (light -> dark)
 'north': [(225, 235, 245), (200, 215, 232), (165, 180, 205), (145, 160, 185), (115, 130, 160), (85, 98, 128)],
 'east': [(120, 104, 108), (96, 80, 88), (74, 60, 70), (66, 54, 62), (52, 42, 52), (38, 30, 40)],
 'under': [(160, 150, 140), (138, 128, 120), (112, 102, 96), (98, 90, 86), (78, 70, 68), (56, 50, 50)],
 'sky': [(255, 252, 240), (245, 240, 225), (228, 215, 180), (214, 200, 160), (200, 170, 100), (170, 135, 70)]}
FUR1, FUR2, FUR3 = (150, 100, 56, 255), (110, 70, 40, 255), (190, 150, 100, 255)
BONE1, BONE2 = (245, 238, 214, 255), (196, 182, 150, 255)
STEEL1, STEEL2, STEEL3 = (200, 206, 220, 255), (150, 156, 176, 255), (110, 116, 136, 255)
BEARD1, BEARD2 = (226, 128, 44, 255), (186, 92, 30, 255)
GOLD1, GOLD2 = (255, 214, 92, 255), (214, 160, 40, 255)
LACQ1, LACQ2 = (60, 52, 62, 255), (36, 30, 40, 255)
REDL = (210, 50, 50, 255)
LAMP = (255, 240, 140, 255)
WHITE1, WHITE2 = (255, 255, 255, 255), (214, 224, 238, 255)
ICE1, ICE2, ICE3 = (215, 240, 255, 255), (160, 205, 240, 255), (110, 160, 210, 255)
JADE1, JADE2, JADE3 = (140, 205, 150, 255), (90, 160, 110, 255), (55, 110, 75, 255)
OBS1, OBS2, OBS3, EMBER = (92, 80, 96, 255), (64, 54, 70, 255), (42, 34, 48, 255), (255, 140, 40, 255)
MARB1, MARB2, MARB3 = (250, 250, 252, 255), (220, 222, 232, 255), (180, 184, 200, 255)

def team_of(sheet_side):
    return BLUE_SET if sheet_side == 'blue' else RED_SET

def team_cols(side):
    T = team_of(side); return (T[1] + (255,), T[2] + (255,)) if side == 'blue' else (T[1] + (255,), T[2] + (255,))

# ---------------------------------------------------------------- small helpers
def pixels(f, test, y0=0, y1=None, x0=0, x1=None):
    p = f.load(); W, H = f.size; y1 = H - 1 if y1 is None else min(H - 1, y1); x1 = W - 1 if x1 is None else min(W - 1, x1)
    return [(x, y) for y in range(max(0, y0), y1 + 1) for x in range(max(0, x0), x1 + 1) if p[x, y][3] and test(p[x, y][:3])]

def bbox(pts):
    return min(x for x, _ in pts), max(x for x, _ in pts), min(y for _, y in pts), max(y for _, y in pts)

def clear(f, pts):
    for x, y in pts: f.putpixel((x, y), (0, 0, 0, 0))

def components(pts):
    pts = set(pts); out = []
    while pts:
        st = [pts.pop()]; comp = [st[0]]
        while st:
            x, y = st.pop()
            for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if q in pts: pts.remove(q); st.append(q); comp.append(q)
        out.append(comp)
    return out

def tidy_outline(f):
    """Remove outline pixels that no longer border any coloured pixel (left behind after clearing)."""
    p = f.load(); W, H = f.size; kill = []
    for y in range(H):
        for x in range(W):
            if p[x, y][3] and p[x, y][:3] == OUT:
                if not any(0 <= x + dx < W and 0 <= y + dy < H and p[x + dx, y + dy][3] and p[x + dx, y + dy][:3] != OUT
                           for dx in (-1, 0, 1) for dy in (-1, 0, 1)): kill.append((x, y))
    clear(f, kill)

def remap(f, mapping, region=None):
    p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            if region and not region(x, y): continue
            c = p[x, y]
            if c[3] and c[:3] in mapping: p[x, y] = tuple(mapping[c[:3]][:3]) + (c[3],)

def metal(realm):
    return dict(zip(ARMOUR, METAL[realm]))

def P(x, y, c, f):
    W, H = f.size
    if 0 <= x < W and 0 <= y < H: f.putpixel((x, y), c)

def stamp(f, rows, pal, x, y):
    """Draw a pixel template at x,y with a 1-px outline; outline pixels never cover existing colour."""
    t = from_rows(rows, pal); W, H = t.size
    pad = Image.new('RGBA', (W + 2, H + 2), (0, 0, 0, 0)); pad.alpha_composite(t, (1, 1)); outline(pad)
    pp = pad.load(); fp = f.load(); FW, FH = f.size
    for j in range(H + 2):
        for i in range(W + 2):
            c = pp[i, j]; X, Y = x - 1 + i, y - 1 + j
            if not c[3] or not (0 <= X < FW and 0 <= Y < FH): continue
            if c[:3] == OUT and fp[X, Y][3] and fp[X, Y][:3] != OUT: continue
            fp[X, Y] = c

def dome(w, h, chars):
    """Rounded cap: rows of width w, the first rows inset; chars(x, y) -> palette key."""
    rows = []
    for y in range(h):
        inset = 2 if y == 0 and w > 5 else 1 if y <= 1 else 0
        rows.append(''.join('.' if x < inset or x >= w - inset else chars(x, y) for x in range(w)))
    return rows

# ---------------------------------------------------------------- headgear templates: (rows, palette, x offset of the head's left edge)
def hg_fur_hat(w, team):
    rows = dome(w, 3, lambda x, y: 'F' if (x + y) % 2 else 'f') + ['T' * w, 'FF' + '.' * (w - 2), 'FF' + '.' * (w - 2)]
    return rows, {'F': FUR1, 'f': FUR3, 'T': team[0]}, 0, 2

def hg_horned(w, team):
    """Steel cap with two big bone horns curving out and up."""
    helm = dome(w, 3, lambda x, y: 'S' if y < 2 else 's') + ['r' * w]
    side = [('B..', '..B'), ('B..', '..B'), ('bB.', '.Bb'), ('.bb', 'bb.'), ('...', '...')]
    rows = [side[0][0] + '.' * w + side[0][1]] + [side[y + 1][0] + helm[y] + side[y + 1][1] for y in range(4)]
    return rows, {'B': BONE1, 'b': BONE2, 'S': STEEL1, 's': STEEL2, 'r': STEEL3}, 3, 0

def hg_kasa(w, team):
    W = w + 4; rows = []
    for y in range(4):
        n = min(W, 2 + y * 4); pad = (W - n) // 2
        rows.append('.' * pad + ('S' if y < 3 else 's') * n + '.' * (W - n - pad))
    rows[3] = 's' + 'T' * (W - 2) + 's'
    return rows, {'S': (236, 206, 110, 255), 's': (196, 160, 72, 255), 'T': team[0]}, 2, 0

def hg_jingasa(w, team):
    W = w + 2; rows = []
    for y in range(3):
        n = min(W, 2 + y * 4); pad = (W - n) // 2
        rows.append('.' * pad + 'L' * n + '.' * (W - n - pad))
    rows.append('l' * W); m = W // 2; rows[1] = rows[1][:m] + 'G' + rows[1][m + 1:]
    return rows, {'L': LACQ1, 'l': LACQ2, 'G': GOLD1}, 1, 0

def hg_leather_cap(w, team):
    """Leather cap with brass goggles pushed up (the yellow lamp helmet belongs to the Miner unit)."""
    rows = dome(w, 3, lambda x, y: 'L' if (x + y) % 3 else 'l') + ['.' + 'gGg' + 'L' * (w - 5) + '.']
    return rows, {'L': (128, 88, 52, 255), 'l': (100, 66, 38, 255), 'G': (170, 220, 230, 255), 'g': GOLD2}, 0, 0

def hg_dwarf_helm(w, team):
    rows = dome(w, 3, lambda x, y: 'S' if y < 2 else 's') + ['T' * w]
    rows = [r + '.' for r in rows] + ['.' * (w - 2) + 'S.' + '.']
    return rows, {'S': STEEL1, 's': STEEL2, 'T': team[0]}, 0, 1

def hg_winged_cap(w, team):
    core = dome(w, 3, lambda x, y: 'T' if y < 2 else 't') + ['G' * w]
    wl = ['W.', 'WW', '.W', '..']; wr = ['.W', 'WW', 'W.', '..']
    return [wl[y] + core[y] + wr[y] for y in range(4)], {'W': WHITE1, 'T': team[0], 't': team[1], 'G': GOLD1}, 2, 0

def hg_winged_helm(w, team):
    core = dome(w, 3, lambda x, y: 'S' if y < 2 else 's') + ['G' * w]
    wl = ['W.', 'WW', '.W', '..']; wr = ['.W', 'WW', 'W.', '..']
    return [wl[y] + core[y] + wr[y] for y in range(4)], {'W': WHITE1, 'S': (245, 245, 252, 255), 's': (210, 214, 228, 255), 'G': GOLD1}, 2, 0

def hg_hood(w, team):
    rows = dome(w, 4, lambda x, y: 'T' if y < 3 else 't')
    return rows, {'T': team[0], 't': team[1]}, 0, 0

HEADGEAR = {
 ('north', 'worker'): hg_fur_hat, ('north', 'soldier'): hg_horned,
 ('east', 'worker'): hg_kasa, ('east', 'soldier'): hg_jingasa,
 ('under', 'worker'): hg_leather_cap, ('under', 'soldier'): hg_dwarf_helm,
 ('sky', 'worker'): hg_winged_cap, ('sky', 'soldier'): hg_winged_helm}

def put_headgear(f, fn, hx0, hx1, face_top, team):
    """Headgear over the head (hx0..hx1), its main body ending on the row above the face; extra rows (flaps) hang below."""
    w = hx1 - hx0 + 3
    rows, pal, dx, below = fn(w, team)
    stamp(f, rows, pal, hx0 - 1 - dx, face_top - (len(rows) - below))

def draw_beard(f, x0, x1, face_top, rows=3):
    """Dwarf beard over the lower front of the face (units face right)."""
    mid = (x0 + x1) // 2 + 1; w = x1 - mid + 2
    t = ['B' * w, 'b' * w, '.' + 'B' * (w - 1)][:rows] + (['..' + 'b' * (w - 3)] if rows > 3 else [])
    stamp(f, [''.join(('B' if ch in 'Bb' and (i + j) % 3 else 'b') if ch != '.' else '.' for i, ch in enumerate(r)) for j, r in enumerate(t)], {'B': BEARD1, 'b': BEARD2}, mid, face_top + 3)

def fur_collar(f, x0, x1, y):
    for yy in (y, y + 1):
        for x in range(x0 - 1, x1 + 2):
            if 0 <= x < f.width and 0 <= yy < f.height and opaque(f.getpixel((x, yy))): P(x, yy, FUR1 if (x + yy) % 2 else FUR3, f)

# ---------------------------------------------------------------- humans with a cap or hair on top
HEAD_SET = {   # unit -> (colours that make the cap/hair, number of cap rows from the top, kind)
 'WoodCutter': ('team+hair', 4, 'worker'), 'AdvancedWoodCutter': ('team+hair', 5, 'worker'), 'Engineer': ('green', 4, 'worker'),
 'Thief': ('thief', 4, 'worker'), 'Archer': ('hair', 3, 'soldier'), 'WeakSoldier': ('hair', 3, 'soldier'), 'Cavalry': ('hair', 3, 'soldier')}

def head_cols(spec, side):
    X = {(172, 172, 180), (108, 103, 132)} if side == 'red' else set(); T = set(team_of(side)) | X
    return {'team+hair': T | HAIRC, 'green': GREEN, 'thief': {(88, 88, 88), (108, 103, 132), (144, 136, 160)} | T, 'hair': HAIRC | X}[spec]

def capped(f, name, realm, side):
    spec, cap_rows, kind = HEAD_SET[name]; cols = head_cols(spec, side)
    W, H = f.size
    xmin = 30 if name == 'Cavalry' and W == 64 else 0
    top_pts = pixels(f, lambda c: c in cols, 0, int(H * .6), xmin)
    if not top_pts: return f
    T = min(y for _, y in top_pts)
    head = pixels(f, lambda c: c in cols or c in SKINC, T, T + 5, xmin)
    hx0, hx1, _, _ = bbox(head)
    if name == 'Cavalry': hx1 = min(hx1, hx0 + 8)
    face_top = T + cap_rows
    # clear the old cap (everything above the face inside the head columns, plus the outline above it)
    clear(f, pixels(f, lambda c: True, 0, face_top - 1, hx0 - 1, hx1 + 1))
    put_headgear(f, HEADGEAR[(realm, kind)], hx0, hx1, face_top, team_cols(side))
    if realm == 'under': draw_beard(f, hx0, hx1, face_top)
    if realm == 'north' and kind == 'worker': fur_collar(f, hx0, hx1, face_top + 6)
    tidy_outline(f)
    return f

# ---------------------------------------------------------------- helmeted soldiers with a green plume
def plumed(f, realm, side):
    plume_cols = PLUME | ({(216, 16, 16), (255, 128, 20)} if side == 'red' else set())
    pl = pixels(f, lambda c: c in plume_cols)
    remap(f, metal(realm))
    if not pl: return f
    clear(f, pl); tidy_outline(f)
    mset = set(m[:3] for m in METAL[realm]); mpts = set(pixels(f, lambda c: c in mset)); comps = [c for c in components(mpts) if len(c) >= 6]
    for plume in components(pl):
        if len(plume) < 3: continue
        px0, px1, py0, py1 = bbox(plume)
        best = min(comps, key=lambda comp: min(abs(x - (px0 + px1) / 2) + abs(y - py1) for x, y in comp), default=None)
        if best is None: continue
        ht = min(y for _, y in best); top = [(x, y) for x, y in best if y <= ht + 2]
        hx0, hx1 = min(x for x, _ in top), max(x for x, _ in top)
        crest(f, realm, hx0, hx1, ht)
    return f

def crest(f, realm, hx0, hx1, ht):
    cx = (hx0 + hx1) // 2
    if realm == 'north':
        stamp(f, ['B......B', 'B......B', 'b......b', '.b....b.'], {'B': BONE1, 'b': BONE2}, cx - 3, ht - 3)
    elif realm == 'east':
        stamp(f, ['.G.', 'RRR', 'RrR', 'r.r'], {'G': GOLD1, 'R': REDL, 'r': (150, 30, 34, 255)}, cx - 1, ht - 4)
    elif realm == 'under':
        stamp(f, ['S', 'S', 's'], {'S': STEEL1, 's': STEEL2}, cx, ht - 3)
        for x in range(hx0, hx1 + 1):
            if opaque(f.getpixel((x, ht + 3))): P(x, ht + 3, GOLD2, f)
    elif realm == 'sky':
        stamp(f, ['W......W', 'WW....WW', '.W....W.'], {'W': WHITE1}, cx - 3, ht - 2)
        stamp(f, ['G'], {'G': GOLD1}, cx, ht - 2)

# ---------------------------------------------------------------- casters with a tall hat (wizards, witch, priest)
def hatted(f, name, realm, side):
    W, H = f.size
    face = pixels(f, lambda c: c in SKINC, 0, H - 1, 2, 12)
    if not face: return f
    face_top = min(y for _, y in face)
    fx0, fx1, _, _ = bbox(pixels(f, lambda c: c in SKINC, face_top, face_top + 3, 2, 12))
    hat_cols = set(team_of(side)) | {(84, 87, 195), (178, 44, 12), (252, 252, 252)}
    hat = pixels(f, lambda c: c in hat_cols, 0, face_top - 1, 0, 13)
    if not hat: return f
    hx0, hx1, ht, hb = bbox(hat)
    team = team_cols(side)
    if realm == 'north':
        # fur brim and a white pompom on the tip
        for x, y in pixels(f, lambda c: c != OUT, hb - 2, hb, hx0, hx1): P(x, y, FUR1 if (x + y) % 2 else FUR3, f)
        tip = min(hat, key=lambda q: q[1]); stamp(f, ['WW', 'WW'], {'W': WHITE1}, tip[0] - 1, tip[1] - 2)
        for x, y in pixels(f, lambda c: c == (188, 188, 188)): P(x, y, WHITE1, f)
    elif realm == 'east':
        # tall hat replaced by a black court eboshi with a team cord (the straw hat belongs to the Crane Caster)
        clear(f, pixels(f, lambda c: True, 0, hb, hx0 - 1, hx1 + 1)); tidy_outline(f)
        w = fx1 - fx0 + 3
        rows = ['.' * (w - 3) + 'LL.', '.' * (w - 4) + 'LLL.', '..' + 'L' * (w - 4) + '..', '.' + 'L' * (w - 2) + '.', '.' + 'L' * (w - 2) + '.', 'T' * w]
        stamp(f, rows, {'L': LACQ1, 'T': team[0]}, fx0 - 1, face_top - len(rows))
        for x, y in pixels(f, lambda c: c == (188, 188, 188)): P(x, y, (60, 56, 62, 255), f)
    elif realm == 'under':
        # short team-coloured hood with a lamp, big orange beard
        clear(f, pixels(f, lambda c: True, 0, hb, hx0 - 1, hx1 + 1)); tidy_outline(f)
        rows, pal, _, _ = hg_hood(fx1 - fx0 + 4, team); gw = len(rows[0])
        stamp(f, rows, pal, (fx0 + fx1) // 2 - gw // 2, face_top - len(rows))
        P((fx0 + fx1) // 2 + 2, face_top - 2, LAMP, f)
        for x, y in pixels(f, lambda c: c == (188, 188, 188)): P(x, y, BEARD1, f)
        draw_beard(f, fx0, fx1, face_top, 4)
    elif realm == 'sky':
        # the hat stays, with a gold band, a gold star on top and a halo; small wings at the brim
        for x, y in pixels(f, lambda c: c != OUT, hb - 1, hb - 1, hx0, hx1): P(x, y, GOLD1, f)
        tip = min(hat, key=lambda q: q[1]); stamp(f, ['.G.', 'GGG', '.G.'], {'G': GOLD1}, tip[0] - 2, tip[1] - 4)
        for (x, d) in ((hx0 - 1, -1), (hx1 + 1, 1)):
            for i in range(3): P(x + d * i, hb - 1 - i, WHITE1, f); P(x + d * i, hb - i, WHITE2, f)
    tidy_outline(f)
    return f

def petard(f, realm, side):
    W, H = f.size
    sk = pixels(f, lambda c: c in SKINC, int(H * .3), H - 1)
    if not sk: return f
    ft = min(y for _, y in sk); fx0, fx1, _, _ = bbox([q for q in sk if q[1] <= ft + 3])
    if realm == 'north': fur_collar(f, fx0, fx1, ft + 6)
    elif realm == 'east':
        for x in range(fx0, fx1 + 1): P(x, ft + 1, REDL, f)
        stamp(f, ['RR', '.R'], {'R': REDL}, fx0 - 2, ft + 1)
    elif realm == 'under': draw_beard(f, fx0, fx1, ft, 3)
    elif realm == 'sky': stamp(f, ['W..', 'WW.', '.WW'], {'W': WHITE1}, fx0 - 4, ft + 4)
    return f

def necro(f, realm, side):
    hood = pixels(f, lambda c: c in {(88, 88, 88), (144, 136, 160)}, 0, 10)
    if not hood: return f
    x0, x1, t, b = bbox(hood)
    if realm == 'north':
        remap(f, {(88, 88, 88): (120, 140, 170), (144, 136, 160): ICE1}, lambda x, y: y <= b)
        for x in range(x0, x1 + 1): P(x, t - 1, WHITE1, f)
    elif realm == 'east':
        stamp(f, ['R...R', 'R...R'], {'R': REDL}, x0, t - 3)
    elif realm == 'under':
        stamp(f, ['B.B.B', 'BBBBB'], {'B': BONE1}, x0, t - 3)
    elif realm == 'sky':
        for (x, d) in ((x0 - 1, -1), (x1 + 1, 1)):
            for i in range(3): P(x + d * i, t + 3 - i, (40, 36, 48, 255), f); P(x + d * i, t + 4 - i, (70, 64, 80, 255), f)
    tidy_outline(f)
    return f

# ---------------------------------------------------------------- mounts, beasts, golems, machines
def hue_map(f, hmin, hmax, smin, fn, region=None):
    p = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            if region and not region(x, y): continue
            r, g, b, a = p[x, y]
            if not a or (r, g, b) == OUT: continue
            h, s, v = hsv(r, g, b)
            if hmin <= h <= hmax and s >= smin: p[x, y] = fn(h, s, v, a)

def wing(f, x, y, up=True, w=12):
    for k in range(3):
        L = w - 3 * k; yy = y + (k * 2 if up else -k * 2)
        for i in range(L): P(x + i, yy - (i // 4 if up else -(i // 4)), WHITE1 if k % 2 == 0 else WHITE2, f)
    for i in range(w + 1): P(x + i, y - 1 - (i // 4 if up else -(i // 4)), O, f)

def horse(f, realm, side, name):
    if name == 'Cavalry':
        if realm == 'north': remap(f, {(141, 105, 71): (170, 178, 190), (172, 136, 70): (215, 220, 228), (203, 162, 70): (245, 246, 250)})   # shaggy white horse
        elif realm == 'east': remap(f, {(141, 105, 71): LACQ2, (172, 136, 70): LACQ1, (203, 162, 70): (90, 80, 92)})                   # black war horse
        elif realm == 'under': remap(f, {(141, 105, 71): (70, 48, 34), (172, 136, 70): (98, 68, 46), (203, 162, 70): (126, 92, 62)})   # cave boar
        elif realm == 'sky': remap(f, {(141, 105, 71): MARB3, (172, 136, 70): MARB2, (203, 162, 70): MARB1})                          # pegasus
        f = capped(f, 'Cavalry', realm, side)
    else:
        f = plumed(f, realm, side)
    def on(x, y, c):
        if 0 <= x < f.width and 0 <= y < f.height and opaque(f.getpixel((x, y))): P(x, y, c, f)
    hc = set(m[:3] for m in METAL[realm]) if name == 'HeavyCavalry' else None
    horse_px = pixels(f, lambda c: c != OUT, 24, f.height - 1, 0, 34)
    if not horse_px: return f
    hx0, hx1, hy0, hy1 = bbox(horse_px)
    if realm == 'east':
        for x in range(hx0 + 6, hx1, 4): on(x, hy0 + 3, GOLD1)                          # gold studs along the back
    elif realm == 'under':
        stamp(f, ['B', 'B'], {'B': BONE1}, 60, 27)                                         # boar tusk at the snout
    elif realm == 'sky':
        stamp(f, ['......WW', '....WWWw', '..WWWww.', 'WWWww...', 'Www.....'], {'W': WHITE1, 'w': WHITE2}, 26, 16)   # pegasus wing
    elif realm == 'north':
        for x in range(hx0 + 2, hx1, 2): on(x, hy0, WHITE1)                               # snow on the back
    tidy_outline(f)
    return f

def dog(f, realm, side):
    team = team_cols(side)
    if realm == 'north':      # sled husky: slate back, white belly, team harness
        hue_map(f, .02, .13, .3, lambda h, s, v, a: (250, 250, 252, 255) if v > .9 else (96, 104, 120, 255))
        for x, y in pixels(f, lambda c: c in set(team_of(side))): P(x, y, team[0], f)
        body = pixels(f, lambda c: c == (96, 104, 120))
        if body:
            x0, x1, t, b = bbox(body)
            for y in range(t, b + 1):
                if opaque(f.getpixel(((x0 + x1) // 2, y))): P((x0 + x1) // 2, y, team[0], f)
    elif realm == 'east':     # shiba: orange back, cream belly
        hue_map(f, .02, .13, .3, lambda h, s, v, a: from_hsv(.07, .7, .9, a) if v < .9 else from_hsv(.1, .15, .98, a))
    elif realm == 'under':    # cave salamander: dark green with orange spots
        hue_map(f, .02, .13, .3, lambda h, s, v, a: (232, 120, 40, 255) if v > .9 else (64, 96, 72, 255))
    elif realm == 'sky':
        hue_map(f, .02, .13, .3, lambda h, s, v, a: from_hsv(.6, .05, min(1, .75 + v * .25), a))
        body = pixels(f, lambda c: c != OUT)
        if body:
            x0, x1, t, b = bbox(body); stamp(f, ['...WW', '.WWw.', 'WWw..'], {'W': WHITE1, 'w': WHITE2}, x0 + 8, max(0, t - 1))
    return f

def golem(f, realm):
    mats = {'north': ((150, 146, 140, 255), (112, 108, 104, 255), (80, 76, 74, 255)), 'east': (JADE1, JADE2, JADE3), 'under': ((200, 150, 230, 255), (150, 100, 190, 255), (100, 64, 140, 255)), 'sky': ((240, 196, 100, 255), (200, 150, 60, 255), (150, 104, 40, 255))}[realm]
    remap(f, {(172, 172, 180): mats[0], (188, 188, 188): mats[0], (144, 136, 160): mats[1], (128, 128, 128): mats[1], (108, 103, 132): mats[2], (88, 88, 88): mats[2]})
    W, H = f.size; body = pixels(f, lambda c: c != OUT)
    if not body: return f
    x0, x1, t, b = bbox(body); cx = (x0 + x1) // 2
    if realm == 'north':      # snow on the head and shoulders
        for x, y in pixels(f, lambda c: c != OUT):
            if y < t + 9 and (y == 0 or not opaque(f.getpixel((x, y - 1)))): P(x, y, WHITE1, f); P(x, y + 1, WHITE2, f) if (x % 2) else None
    elif realm == 'east':     # gold sash
        for x in range(cx - 2, cx + 3): P(x, t + 12, GOLD1, f)
    elif realm == 'under':    # crystal spikes on the back
        stamp(f, ['C.', 'CC', 'Cc'], {'C': (230, 200, 255, 255), 'c': (170, 120, 220, 255)}, x0, t + 2)
        stamp(f, ['.C', 'CC'], {'C': (230, 200, 255, 255)}, x0 + 3, t)
    elif realm == 'sky':      # clockwork: rivets and a gear on the chest
        for (dx, dy) in ((-3, 6), (3, 6), (-3, 14), (3, 14)): P(cx + dx, t + dy, (255, 240, 180, 255), f)
        stamp(f, ['.G.', 'GgG', '.G.'], {'G': (255, 230, 150, 255), 'g': (150, 104, 40, 255)}, cx - 1, t + 9)
    return f

def ram(f, realm, side):
    f = plumed(f, realm, side)
    log = [(x, y) for x in range(12, 28) for y in range(17, 24) if f.getpixel((x, y))[3] and f.getpixel((x, y))[:3] != OUT]
    if not log: return f
    lt = min(y for _, y in log)
    if realm == 'north':
        for x in range(13, 27): P(x, lt, WHITE1, f); P(x, lt - 1, O if x in (13, 26) else WHITE1, f) if x % 3 else None
    elif realm == 'east':
        for x in (15, 22): [P(x, y, GOLD1, f) for y in range(lt, lt + 7)]
    elif realm == 'under':
        for x in (14, 19, 24): [P(x, y, STEEL3, f) for y in range(lt, lt + 7)]
    elif realm == 'sky':
        for x in range(13, 27): P(x, lt, GOLD1, f)
    return f

def cannon(f, realm):
    mats = {'north': (ICE2, ICE3, (80, 110, 150, 255)), 'east': (GOLD1, GOLD2, (150, 100, 30, 255)), 'under': (STEEL2, STEEL3, (60, 64, 80, 255)), 'sky': (MARB1, MARB2, MARB3)}[realm]
    remap(f, {(128, 128, 128): mats[0], (108, 103, 132): mats[1], (88, 88, 88): mats[2], (144, 136, 160): mats[0]})
    return f

def envelope(f, realm, side):
    team = set(team_of(side)); p = f.load(); W, H = f.size
    cols = {}
    for y in range(int(H * .75)):
        for x in range(W):
            if p[x, y][3] and p[x, y][:3] in team: cols.setdefault(x, []).append(y)
    for x, ys in cols.items():
        y0 = min(ys)
        for y in ys:
            if realm == 'north' and (y <= y0 + 1 or (y <= y0 + 3 and (x * 7 + y) % 4 == 0)): p[x, y] = ICE1 if (x + y) % 2 else WHITE1
            elif realm == 'east' and x % 6 == 0: p[x, y] = LACQ2
            elif realm == 'east' and y == y0 + 2: p[x, y] = GOLD1
            elif realm == 'under' and x % 5 == 2 and y % 4 == 1: p[x, y] = (60, 60, 72, 255)
            elif realm == 'under' and y == y0: p[x, y] = GOLD2
            elif realm == 'sky' and y <= y0 + ((x // 3) % 3): p[x, y] = WHITE1
    remap(f, metal(realm), lambda x, y: y > H * .4)
    return f

# ---------------------------------------------------------------- unit list and dispatch
CAPPED = ['WoodCutter', 'AdvancedWoodCutter', 'Engineer', 'Thief', 'Archer', 'WeakSoldier']
PLUMED = ['StrongSoldier', 'Pikeman']
HATTED = ['FireWizard', 'IceWizard', 'CashWizard', 'Witch', 'Priest']
AIRSHIPS = ['SmallZeppelin', 'Bomber', 'PirateZeppelin', 'NapalmBomber', 'CannonCatcher', 'Planter', 'Duster', 'TreeTopHarvester', 'AirDrop']
UNITS = CAPPED + PLUMED + HATTED + ['Petard', 'Necromancer', 'Cavalry', 'HeavyCavalry', 'AttackDog', 'Golem', 'BatteringRam', 'Cannon'] + AIRSHIPS
SKIP = {'DusterDustAnimation', 'DusterDust', 'FireBallAnimation', 'FireBall', 'ArcherArrow', 'IceEffectAnimation', 'NecromancerEffectAnimation',
        'WitchCatWalkAnimation', 'CannonBall', 'BomberBomb', 'TreeTopHarvesterReturn', 'TreeTopHarvesterReturnAnimation'}

_SHEETS = {}
def sheet(side):
    if side not in _SHEETS: _SHEETS[side] = Image.open(os.path.join(A, 'spr_%s_alpha.png' % side)).convert('RGBA')
    return _SHEETS[side]

def faces_left(a, b):
    """True when frame b is a mirror image of frame a (the enemy sheet mirrors some units)."""
    from PIL import ImageOps
    m = ImageOps.mirror(a); W, H = a.size
    same = sum(1 for x in range(W) for y in range(H) if (a.getpixel((x, y))[3] > 0) == (b.getpixel((x, y))[3] > 0))
    mir = sum(1 for x in range(W) for y in range(H) if (m.getpixel((x, y))[3] > 0) == (b.getpixel((x, y))[3] > 0))
    return mir > same

_MIRROR = {}
def mirrored(name, side):
    if side == 'blue': return False
    if name not in _MIRROR:
        fr = frames_of(name)
        if not fr: _MIRROR[name] = False
        else:
            x, y, w, h = fr[0]; _MIRROR[name] = faces_left(sheet('blue').crop((x, y, x + w, y + h)), sheet('red').crop((x, y, x + w, y + h)))
    return _MIRROR[name]

def transform(name, f, realm, side, flip=None):
    from PIL import ImageOps
    if flip is None: flip = mirrored(name, side)
    if flip: return ImageOps.mirror(transform(name, ImageOps.mirror(f), realm, side, False))
    f = f.copy()
    if name in CAPPED: return capped(f, name, realm, side)
    if name in PLUMED: return plumed(f, realm, side)
    if name in HATTED: return hatted(f, name, realm, side)
    if name == 'Necromancer': return necro(f, realm, side)
    if name == 'Petard': return petard(f, realm, side)
    if name in ('Cavalry', 'HeavyCavalry'): return horse(f, realm, side, name)
    if name == 'AttackDog': return dog(f, realm, side)
    if name == 'Golem': return golem(f, realm)
    if name == 'BatteringRam': return ram(f, realm, side)
    if name == 'Cannon': return cannon(f, realm)
    if name in AIRSHIPS: return envelope(f, realm, side)
    return f

def frames_of(name):
    seen = set(); out = []
    for k, (x, y, w, h, n) in ENTRIES.items():
        if k in SKIP or not (k == name or (k.startswith(name) and k.endswith('Animation'))): continue
        if name == 'Cavalry' and k.startswith('CavalryAttack') is False and not k.startswith('Cavalry'): continue
        for i in range(n):
            r = (x + i * w, y, w, h)
            if r not in seen: seen.add(r); out.append(r)
    return out

def skin_sheet(src, realm, side):
    out = src.copy(); done = set()
    for name in UNITS:
        for (x, y, w, h) in frames_of(name):
            if (x, y) in done: continue
            done.add((x, y))
            nf = transform(name, src.crop((x, y, x + w, y + h)), realm, side)
            out.paste(nf, (x, y))
    return out

# ---------------------------------------------------------------- HUD icons
def hud_rects():
    src = open(os.path.join(os.path.dirname(__file__), '..', 'src', 'engine.js')).read()
    rects = {}; used = set()
    for line in src.split('\n'):
        mm = re.match(r"\s*(\w+):\{id:(\d+),", line)
        if not mm or int(mm.group(2)) >= 36 or 'internal:true' in line: continue
        sp = re.search(r"sprite:'(\w+)'", line); hd = re.search(r"hud:\[(\d+),(\d+)\]", line)
        if not sp or not hd: continue
        spr = 'IceWizard' if mm.group(1) == 'ice' else sp.group(1); r = (int(hd.group(1)), int(hd.group(2)))
        if spr in UNITS and r not in used and spr not in rects: rects[spr] = r; used.add(r)
    return rects

BLUE_HUD = Image.open(os.path.join(A, 'sprites_hud_alpha.png')).convert('RGBA')
def skin_hud(sheet, realm, side):
    out = sheet.copy()
    blank = [sheet.crop((432, 240 + oy, 480, 288 + oy)) for oy in (0, 96)]
    for spr, (hx, hy) in hud_rects().items():
        for sel, oy in enumerate((0, 96)):
            icon = sheet.crop((hx, hy + oy, hx + 48, hy + oy + 48)); bp = blank[sel].load(); ip = icon.load()
            layer = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); lp = layer.load()
            for y in range(4, 44):
                for x in range(4, 44):
                    if ip[x, y] != bp[x, y]: lp[x, y] = ip[x, y]
            flip = False
            if side == 'red':
                bl = BLUE_HUD.crop((hx, hy + oy, hx + 48, hy + oy + 48)); bb = BLUE_HUD.crop((432, 240 + oy, 480, 288 + oy))
                bla = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
                for y in range(4, 44):
                    for x in range(4, 44):
                        if bl.getpixel((x, y)) != bb.getpixel((x, y)): bla.putpixel((x, y), bl.getpixel((x, y)))
                flip = faces_left(bla, layer)
            layer = transform(spr, layer, realm, side, flip)
            base = blank[sel].copy(); base.alpha_composite(layer, (0, 0)); out.paste(base, (hx, hy + oy))
    return out

# ---------------------------------------------------------------- build
EXP_SHEETS = ['spr_north_blue_alpha.png', 'spr_north_red_alpha.png', 'spr_east_blue_alpha.png', 'spr_east_red_alpha.png',
              'spr_under_blue_alpha.png', 'spr_under_red_alpha.png', 'spr_sky_blue_alpha.png', 'spr_sky_red_alpha.png']
def build():
    n = 0
    for realm in REALMS:
        for side in ('blue', 'red'):
            src = Image.open(os.path.join(A, 'spr_%s_alpha.png' % side)).convert('RGBA')
            skin_sheet(src, realm, side).save(os.path.join(A, 'spr_skin_%s_%s_alpha.png' % (realm, side))); n += 1
        for sheet in EXP_SHEETS:      # other realms' units: armour in this realm's metal, team colours untouched
            if sheet.startswith('spr_%s_' % realm): continue
            im = Image.open(os.path.join(A, sheet)).convert('RGBA'); remap(im, metal(realm))
            im.save(os.path.join(A, sheet.replace('_alpha.png', '_%s_alpha.png' % realm))); n += 1
        for sheet, out, side in (('sprites_hud_alpha.png', 'sprites_hud_%s_alpha.png', 'blue'), ('sprites_redhud_big_alpha.png', 'sprites_redhud_%s_alpha.png', 'red')):
            skin_hud(Image.open(os.path.join(A, sheet)).convert('RGBA'), realm, side).save(os.path.join(A, out % realm)); n += 1
    print('skins ok', n)

if __name__ == '__main__': build()
