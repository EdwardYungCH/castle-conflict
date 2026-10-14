"""Expansion world maps (960x640) in the 3-tone parchment style of Map1/Map2, plus the castle
positions and path points used by src/expansion.js (written to src/<realm>-map.js)."""
import os, sys, math, random, json
from PIL import Image, ImageDraw
import numpy as np
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
W, H = 960, 640

def noisy(points, amp=10, step=6, seed=1):
    r = random.Random(seed); out = []; ph = [r.uniform(0, 6) for _ in range(3)]
    for i in range(len(points)):
        (x0, y0), (x1, y1) = points[i], points[(i + 1) % len(points)]
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        for k in range(n):
            t = k / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            j = amp * (0.6 * math.sin(x * 0.031 + ph[0]) + 0.3 * math.sin(y * 0.057 + ph[1]) + 0.2 * math.sin((x + y) * 0.11 + ph[2]))
            nx, ny = -(y1 - y0), (x1 - x0); L = math.hypot(nx, ny) or 1
            out.append((x + nx / L * j, y + ny / L * j))
    return out

def mask(poly):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(poly, fill=255); return np.array(m) > 0

def edge(m, width=2):
    e = np.zeros_like(m)
    for dx in range(-width, width + 1):
        for dy in range(-width, width + 1):
            if abs(dx) + abs(dy) <= width: e |= np.roll(np.roll(~m, dy, 0), dx, 1)
    return m & e

# ---- glyphs ----
def tree(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); h = int(22 * s)
    for w, yy in [(4, 0), (7, 5), (9, 10), (10, 15)]:
        w = int(w * s); top = y - h + int(yy * s)
        d.polygon([(x, top), (x - w, top + int(8 * s)), (x + w, top + int(8 * s))], fill=DARK)
    d.rectangle([x - 1, y - int(4 * s), x + 1, y], fill=DARK)

def mountain(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); w, h = int(22 * s), int(26 * s)
    d.line([(x - w, y), (x - w // 3, y - h), (x, y - h // 2), (x + w // 3, y - h - 6 * s), (x + w, y)], fill=DARK, width=2)
    d.line([(x - w // 3, y - h), (x - w // 3 + 4, y - h + 8)], fill=DARK, width=1)

def snowflake(img, x, y, DARK):
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (2, 2), (-2, -2), (2, -2), (-2, 2)): img.putpixel((x + dx, y + dy), DARK)

def wave(img, x, y, DARK):
    ImageDraw.Draw(img).arc([x - 6, y - 4, x + 6, y + 4], 20, 160, fill=DARK, width=1)

def bamboo(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); h = int(26 * s)
    for k, dx in enumerate((-4, 1, 5)):
        hh = h - 4 * (k % 2); d.line([(x + dx, y), (x + dx, y - hh)], fill=DARK, width=1)
        for yy in range(y - hh + 4, y, 6): d.line([(x + dx - 1, yy), (x + dx + 1, yy)], fill=DARK, width=1)
        d.line([(x + dx, y - hh + 3), (x + dx + 5, y - hh - 1)], fill=DARK, width=1)

def pagoda(img, x, y, s, DARK):
    d = ImageDraw.Draw(img)
    for k in range(3):
        w = int((14 - 3 * k) * s); yy = y - int(8 * k * s)
        d.line([(x - w, yy), (x - w + 3, yy - 3), (x + w - 3, yy - 3), (x + w, yy)], fill=DARK, width=1)
        d.line([(x - w + 4, yy - 3), (x - w + 4, yy - int(6 * s))], fill=DARK); d.line([(x + w - 4, yy - 3), (x + w - 4, yy - int(6 * s))], fill=DARK)
    d.line([(x, y - int(24 * s)), (x, y - int(29 * s))], fill=DARK, width=1)

def volcano(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); w, h = int(26 * s), int(24 * s)
    d.line([(x - w, y), (x - 5, y - h), (x + 5, y - h), (x + w, y)], fill=DARK, width=2)
    d.line([(x - 5, y - h), (x - 2, y - h + 4), (x + 2, y - h + 4), (x + 5, y - h)], fill=DARK, width=1)
    for k in range(3): d.arc([x - 4 + 3 * k, y - h - 10 - 5 * k, x + 4 + 3 * k, y - h - 4 - 5 * k], 180, 360, fill=DARK, width=1)

def terrace(img, x, y, s, DARK):
    d = ImageDraw.Draw(img)
    for k in range(3): d.arc([x - int(18 * s), y - 6 - 5 * k, x + int(18 * s), y + 6 - 5 * k], 200, 340, fill=DARK, width=1)

def stalagmite(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); h = int(20 * s)
    d.polygon([(x - int(5 * s), y), (x, y - h), (x + int(5 * s), y)], fill=DARK)
    d.polygon([(x + int(6 * s), y), (x + int(9 * s), y - int(10 * s)), (x + int(12 * s), y)], fill=DARK)

def crystal(img, x, y, s, DARK):
    d = ImageDraw.Draw(img)
    for dx, h in ((-5, 12), (0, 18), (6, 10)):
        d.polygon([(x + dx - 3, y), (x + dx, y - int(h * s)), (x + dx + 3, y)], outline=DARK)

def mushroom(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); r = int(7 * s)
    d.arc([x - r, y - 2 * r, x + r, y], 180, 360, fill=DARK, width=2); d.line([(x, y - r), (x, y)], fill=DARK, width=2)

def cloud(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); r = int(7 * s)
    for dx, rr in ((-r, r - 2), (0, r), (r, r - 3)): d.ellipse([x + dx - rr, y - rr, x + dx + rr, y + rr], outline=DARK)
    d.line([(x - 2 * r, y + 2), (x + 2 * r, y + 2)], fill=DARK, width=1)

def spire(img, x, y, s, DARK):
    d = ImageDraw.Draw(img); h = int(24 * s)
    d.line([(x - 3, y), (x - 3, y - h), (x, y - h - 6), (x + 3, y - h), (x + 3, y)], fill=DARK, width=1)
    d.line([(x - 6, y), (x + 6, y)], fill=DARK, width=2)

GLYPHS = {'cloud': cloud, 'spire': spire, 'stalagmite': stalagmite, 'crystal': crystal, 'mushroom': mushroom, 'tree': tree, 'mountain': mountain, 'snowflake': lambda i, x, y, s, D: snowflake(i, x, y, D), 'bamboo': bamboo, 'pagoda': pagoda, 'volcano': volcano, 'terrace': terrace}

# ---- realms ----
NORTH = dict(
    name='NORTH', file='Map3.png', js='north-map.js', colors=((203, 214, 222), (164, 181, 196), (105, 124, 142)),
    sea=[([(-40, 470), (60, 455), (150, 520), (230, 545), (275, 600), (300, 700), (-40, 700)], 1),
         ([(1000, 285), (880, 290), (780, 305), (690, 300), (610, 320), (600, 345), (700, 355), (800, 362), (900, 372), (1000, 380)], 2),
         ([(1000, -40), (1000, 95), (950, 80), (905, 55), (880, -40)], 3)],
    lake=([(345, 300), (380, 262), (450, 255), (520, 270), (540, 305), (500, 340), (420, 345), (360, 330)], 4), ice_cracks=True,
    castles=[(39, 150, 440), (40, 95, 330), (41, 265, 420), (42, 215, 255), (43, 340, 165), (44, 95, 150), (45, 300, 345), (46, 505, 410),
             (47, 470, 205), (48, 660, 455), (49, 640, 230), (50, 820, 465), (51, 735, 135), (52, 880, 230), (53, 570, 85), (54, 845, 95)],
    links=[(39, 40), (39, 41), (40, 42), (41, 45), (42, 44), (42, 43), (45, 46), (43, 47), (45, 47), (46, 48), (47, 49), (48, 50), (49, 51), (50, 52), (51, 53), (52, 54), (53, 54), (49, 52)],
    scenery=[('mountain', 600, lambda x, y: y < 230, 0.55, 52, (.7, 1.1)), ('tree', 900, None, lambda x, y: 0.5 if x < 300 else 0.28 if y > 420 else 0.08, 18, (.55, .75)), ('snowflake', 70, None, 1, 22, (1, 1))],
    start=(39, 1, [(118, 468), (100, 492)]), exit=(54, 1000, [(878, 72), (898, 58)]))

EAST = dict(
    name='EAST', file='Map4.png', js='east-map.js', colors=((205, 212, 170), (165, 176, 128), (96, 110, 72)),
    sea=[([(-40, -40), (120, -40), (95, 60), (130, 150), (90, 240), (120, 330), (70, 420), (110, 520), (60, 620), (90, 700), (-40, 700)], 11),   # west coast (arrival)
         ([(1000, 380), (900, 395), (820, 440), (790, 520), (830, 600), (900, 660), (1000, 700)], 12)],                                           # south-east bay
    lake=([(430, 395), (490, 375), (560, 390), (585, 430), (545, 470), (470, 475), (420, 440)], 13), ice_cracks=False,
    castles=[(55, 165, 500), (56, 215, 365), (57, 300, 560), (58, 350, 440), (59, 240, 230), (60, 400, 300), (61, 480, 185), (62, 520, 530),
             (63, 640, 450), (64, 600, 300), (65, 390, 95), (66, 700, 160), (67, 760, 330), (68, 860, 480), (69, 560, 60), (70, 870, 90)],
    links=[(55, 56), (55, 57), (56, 58), (57, 58), (56, 59), (58, 60), (59, 60), (59, 65), (60, 61), (58, 62), (62, 63), (61, 64), (63, 64), (61, 66), (65, 69), (64, 67), (66, 67), (63, 68), (67, 68), (66, 70), (69, 70), (68, 70)],
    scenery=[('volcano', 200, lambda x, y: y < 150 and x > 620, 0.5, 60, (.8, 1.1)), ('mountain', 300, lambda x, y: y < 180, 0.4, 50, (.6, .9)),
             ('bamboo', 700, None, lambda x, y: 0.45 if x < 330 else 0.12, 24, (.6, .9)), ('terrace', 300, lambda x, y: 230 < y < 520 and 330 < x < 800, 0.35, 34, (.8, 1.1)),
             ('pagoda', 160, None, 0.18, 44, (.8, 1.0))],
    start=(55, 2, [(118, 520), (92, 545)]), exit=(70, 1000, [(905, 60), (930, 40)]))

def build(R):
    BASE, MID, DARK = R['colors']; rnd = random.Random(7); LAVA = R.get('lava')
    img = Image.new('RGB', (W, H), BASE); d = ImageDraw.Draw(img)
    for x in range(47, W, 96): d.rectangle([x, 0, x + 1, H], fill=MID)
    for y in range(39, H, 80): d.rectangle([0, y, W, y + 1], fill=MID)
    for x in range(47, W, 96):
        for y in range(39, H, 80): d.rectangle([x - 1, y - 1, x + 2, y + 2], fill=MID)
    px = np.array(img)
    water = np.zeros((H, W), bool)
    for poly, seed in R['sea']: water |= mask(noisy(poly, 9, seed=seed))
    lake = mask(noisy(R['lake'][0], 6, seed=R['lake'][1])) if not R.get('islands') else np.zeros((H, W), bool)
    if R.get('islands'): water = ~islands_mask(R)
    px[water] = LAVA if LAVA else MID; px[edge(water)] = DARK
    if R['ice_cracks']: px[lake] = BASE; px[edge(lake, 1)] = DARK
    else: px[lake] = MID; px[edge(lake, 1)] = DARK
    img = Image.fromarray(px); d = ImageDraw.Draw(img)
    if R['ice_cracks']:
        r = random.Random(3)
        for _ in range(9):
            x, y = r.randint(370, 520), r.randint(270, 335)
            if not lake[y, x]: continue
            pts = [(x, y)]
            for _ in range(3): x += r.randint(-9, 9); y += r.randint(-5, 5); pts.append((x, y))
            if all(0 <= p[1] < H and 0 <= p[0] < W and lake[int(p[1]), int(p[0])] for p in pts): d.line(pts, fill=MID, width=1)
    for _ in range(0 if R.get('islands') else 160):
        x, y = rnd.randint(10, W - 10), rnd.randint(10, H - 10)
        if (water | lake)[y - 6:y + 7, x - 9:x + 10].all(): wave(img, x, y, DARK)
    POS = {i: (x, y) for i, x, y in R['castles']}; paths = {(a, b): path_points(POS, a, b) for a, b in R['links']}
    keep_out = [(c[1], c[2]) for c in R['castles']]
    def free(x, y, r):
        if R.get('islands'):
            if kind == 'cloud':
                if not water[max(0, y - 14):y + 14, max(0, x - 22):x + 22].all(): return False
            elif water[max(0, y - 30):y + 8, max(0, x - 14):x + 14].any(): return False
        elif (water | lake)[max(0, y - 30):y + 8, max(0, x - 14):x + 14].any(): return False
        if any(math.hypot(x - px_, y - py) < 16 for pts in paths.values() for px_, py in pts): return False
        return all(math.hypot(x - a, y - b) > r for a, b in keep_out)
    for kind, tries, where, dens, rad, sc in R['scenery']:
        for _ in range(tries):
            x, y = rnd.randint(10, W - 10), rnd.randint(40, H - 10)
            if where and not where(x, y): continue
            p = dens(x, y) if callable(dens) else dens
            if rnd.random() < p and free(x, y, rad): GLYPHS[kind](img, x, y, rnd.uniform(*sc), DARK); keep_out.append((x, y - 6))
    img.save(os.path.join(A, R['file']))
    return POS, paths

def path_points(POS, a, b, gap=30, step=22):
    (x0, y0), (x1, y1) = POS[a], POS[b]; L = math.hypot(x1 - x0, y1 - y0); n = int((L - 2 * gap) / step); pts = []
    for k in range(n + 1):
        t = (gap + k * (L - 2 * gap) / max(n, 1)) / L
        x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
        bend = 10 * math.sin(math.pi * t) * (1 if (a + b) % 2 else -1)
        nx, ny = -(y1 - y0) / L, (x1 - x0) / L
        pts.append((round(x + nx * bend), round(y + ny * bend)))
    return pts

def data(R):
    POS = {i: (x, y) for i, x, y in R['castles']}; paths = {(a, b): path_points(POS, a, b) for a, b in R['links']}
    tomap = lambda p: [float(p[0]), float(H - p[1])]
    castles = {i: tomap((x, y)) for i, x, y in R['castles']}
    conns = [{'from': a, 'to': b, 'points': [tomap(p) for p in paths[(a, b)]], 'mapLink': False} for a, b in R['links']]
    s = R['start']; conns.insert(0, {'from': s[0], 'to': s[1], 'points': [tomap(p) for p in s[2]], 'mapLink': True, 'start': True})
    e = R['exit']
    if e: conns.append({'from': e[0], 'to': e[1], 'points': [tomap(p) for p in e[2]], 'mapLink': True})
    return {'castles': castles, 'connections': conns}

def write_js(R):
    p = os.path.join(os.path.dirname(__file__), '..', 'src', R['js'])
    open(p, 'w').write('// Generated by tools/art_map.py: castle positions and path dots (map coords, y up).\n'
                       'const %s_MAP=' % R['name'] + json.dumps(data(R), separators=(',', ':')) + ';\nObject.assign(exports,{%s_MAP});\n' % R['name'])

UNDER = dict(
    name='UNDER', file='Map5.png', js='under-map.js', colors=((118, 104, 96), (92, 80, 74), (52, 44, 42)), lava=(214, 96, 40),
    sea=[([(-40, 520), (80, 505), (170, 540), (260, 530), (330, 560), (420, 548), (500, 580), (560, 610), (600, 700), (-40, 700)], 21),   # lava river (south)
         ([(560, -40), (600, 40), (650, 70), (720, 60), (790, 90), (840, 80), (900, 110), (1000, 100), (1000, -40)], 22)],                  # lava lake (north-east)
    lake=([(300, 250), (360, 225), (430, 240), (450, 285), (400, 315), (330, 310), (290, 285)], 23), ice_cracks=False,
    castles=[(71, 120, 420), (72, 90, 290), (73, 230, 440), (74, 210, 330), (75, 150, 160), (76, 330, 165), (77, 300, 395), (78, 470, 450),
             (79, 520, 320), (80, 500, 130), (81, 660, 430), (82, 650, 240), (83, 810, 470), (84, 780, 290), (85, 700, 110), (86, 890, 140)],
    links=[(71, 72), (71, 73), (72, 74), (72, 75), (73, 77), (74, 77), (74, 76), (75, 76), (76, 80), (77, 78), (77, 79), (78, 81), (79, 82), (80, 82), (81, 83), (82, 84), (80, 85), (84, 86), (85, 86), (83, 84)],
    scenery=[('stalagmite', 500, None, 0.3, 40, (.7, 1.2)), ('crystal', 250, None, 0.25, 40, (.8, 1.2)), ('mushroom', 300, lambda x, y: y > 300, 0.3, 30, (.7, 1.0))],
    start=(71, 3, [(100, 455), (80, 480)]), exit=(86, 1000, [(915, 110), (935, 90)]))

SKY = dict(
    name='SKY', file='Map6.png', js='sky-map.js', colors=((170, 200, 232), (206, 224, 244), (84, 104, 150)), islands=True,
    # open sky (painted MID = pale) between the islands; the islands keep the BASE colour
    sea=[([(-40, -40), (1000, -40), (1000, 700), (-40, 700)], 31)],
    lake=([(0, 0), (1, 0), (1, 1)], 32), ice_cracks=False,
    castles=[(87, 110, 470), (88, 230, 540), (89, 260, 380), (90, 120, 300), (91, 390, 470), (92, 400, 290), (93, 280, 190), (94, 520, 380),
             (95, 560, 540), (96, 540, 210), (97, 430, 100), (98, 690, 450), (99, 700, 290), (100, 650, 120), (101, 840, 380), (102, 850, 160)],
    links=[(87, 88), (87, 90), (88, 89), (89, 90), (88, 91), (89, 92), (90, 93), (91, 94), (92, 94), (92, 93), (93, 97), (94, 95), (94, 96), (96, 97), (95, 98), (96, 99), (98, 99), (97, 100), (99, 101), (100, 102), (101, 102), (99, 100)],
    scenery=[('cloud', 400, None, 0.35, 40, (.8, 1.3)), ('spire', 120, None, 0.2, 40, (.7, 1.0))],
    start=(87, 4, [(84, 492), (66, 512)]), exit=None)

def islands_mask(R):
    """One blob of land around every castle plus a strip along each link."""
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m); r = random.Random(5)
    for i, x, y in R['castles']:
        for _ in range(5):
            rx, ry = r.randint(36, 56), r.randint(24, 38); dx, dy = r.randint(-16, 16), r.randint(-10, 10)
            d.ellipse([x + dx - rx, y + dy - ry, x + dx + rx, y + dy + ry], fill=255)
    POS = {i: (x, y) for i, x, y in R['castles']}
    for a, b in R['links']: d.line([POS[a], POS[b]], fill=255, width=16)
    return np.array(m) > 0

def build_all():
    for R in (NORTH, EAST, UNDER, SKY): build(R); write_js(R)

if __name__ == '__main__':
    build_all(); print('maps ok')
