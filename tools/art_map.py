"""Northern Realm world map (Map3.png, 960x640) in the 3-tone parchment style of Map1/Map2,
plus the castle positions and path points used by src/expansion.js (printed as JSON)."""
import os, sys, math, random, json
from PIL import Image, ImageDraw
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
BASE, MID, DARK = (203, 214, 222), (164, 181, 196), (105, 124, 142)
W, H = 960, 640
rnd = random.Random(7)

def noisy(points, amp=10, step=6, seed=1):
    """Densify a closed polygon and jitter it with smooth noise."""
    r = random.Random(seed); out = []
    ph = [r.uniform(0, 6) for _ in range(3)]
    for i in range(len(points)):
        (x0, y0), (x1, y1) = points[i], points[(i + 1) % len(points)]
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        for k in range(n):
            t = k / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            j = amp * (0.6 * math.sin(x * 0.031 + ph[0]) + 0.3 * math.sin(y * 0.057 + ph[1]) + 0.2 * math.sin((x + y) * 0.11 + ph[2]))
            nx, ny = -(y1 - y0), (x1 - x0); L = math.hypot(nx, ny) or 1
            out.append((x + nx / L * j, y + ny / L * j))
    return out

SEA = [  # (polygon, seed)
    ([(-40, 470), (60, 455), (150, 520), (230, 545), (275, 600), (300, 700), (-40, 700)], 1),     # south-west bay (arrival)
    ([(1000, 285), (880, 290), (780, 305), (690, 300), (610, 320), (600, 345), (700, 355), (800, 362), (900, 372), (1000, 380)], 2),  # the fjord
    ([(1000, -40), (1000, 95), (950, 80), (905, 55), (880, -40)], 3),                               # north-east sea (teaser boat)
]
LAKE = ([(345, 300), (380, 262), (450, 255), (520, 270), (540, 305), (500, 340), (420, 345), (360, 330)], 4)

def mask(poly):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(poly, fill=255); return np.array(m) > 0

def edge(m, width=2):
    e = np.zeros_like(m)
    for dx in range(-width, width + 1):
        for dy in range(-width, width + 1):
            if abs(dx) + abs(dy) <= width: e |= np.roll(np.roll(~m, dy, 0), dx, 1)
    return m & e

def tree(img, x, y, s=1.0):
    d = ImageDraw.Draw(img); h = int(22 * s)
    for k, (w, yy) in enumerate([(4, 0), (7, 5), (9, 10), (10, 15)]):
        w = int(w * s); top = y - h + int(yy * s)
        d.polygon([(x, top), (x - w, top + int(8 * s)), (x + w, top + int(8 * s))], fill=DARK)
    d.rectangle([x - 1, y - int(4 * s), x + 1, y], fill=DARK)

def mountain(img, x, y, s=1.0):
    d = ImageDraw.Draw(img); w, h = int(22 * s), int(26 * s)
    d.line([(x - w, y), (x - w // 3, y - h), (x, y - h // 2), (x + w // 3, y - h - 6 * s), (x + w, y)], fill=DARK, width=2)
    d.line([(x - w // 3, y - h), (x - w // 3 + 4, y - h + 8)], fill=DARK, width=1)  # snow line hint

def snowflake(img, x, y):
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (2, 2), (-2, -2), (2, -2), (-2, 2)): img.putpixel((x + dx, y + dy), DARK)

def wave(img, x, y):
    d = ImageDraw.Draw(img); d.arc([x - 6, y - 4, x + 6, y + 4], 20, 160, fill=DARK, width=1)

def build():
    img = Image.new('RGB', (W, H), BASE); d = ImageDraw.Draw(img)
    for x in range(47, W, 96): d.rectangle([x, 0, x + 1, H], fill=MID)
    for y in range(39, H, 80): d.rectangle([0, y, W, y + 1], fill=MID)
    for x in range(47, W, 96):
        for y in range(39, H, 80): d.rectangle([x - 1, y - 1, x + 2, y + 2], fill=MID)
    px = np.array(img)
    water = np.zeros((H, W), bool)
    for poly, seed in SEA: water |= mask(noisy(poly, 9, seed=seed))
    lake = mask(noisy(LAKE[0], 6, seed=LAKE[1]))
    px[water] = MID; px[edge(water)] = DARK
    px[lake] = BASE; px[edge(lake, 1)] = DARK
    img = Image.fromarray(px)
    # ice cracks on the lake
    d = ImageDraw.Draw(img); r = random.Random(3)
    for _ in range(9):
        x, y = r.randint(370, 520), r.randint(270, 335)
        if not lake[y, x]: continue
        pts = [(x, y)]
        for _ in range(3): x += r.randint(-9, 9); y += r.randint(-5, 5); pts.append((x, y))
        if all(0 <= p[1] < H and 0 <= p[0] < W and lake[int(p[1]), int(p[0])] for p in pts): d.line(pts, fill=MID, width=1)
    # waves
    for _ in range(140):
        x, y = rnd.randint(10, W - 10), rnd.randint(10, H - 10)
        if water[y - 6:y + 7, x - 9:x + 10].all(): wave(img, x, y)
    # scenery
    keep_out = [(c[0], c[1]) for c in CASTLES_IMG]
    def free(x, y, r=46):
        if water[max(0, y - 30):y + 8, max(0, x - 14):x + 14].any() or lake[max(0, y - 30):y + 8, max(0, x - 14):x + 14].any(): return False
        return all(math.hypot(x - a, y - b) > r for a, b in keep_out) and not near_path(x, y)
    for _ in range(600):  # mountains in the north
        x, y = rnd.randint(30, 930), rnd.randint(40, 230)
        if rnd.random() < 0.55 and free(x, y, 52): mountain(img, x, y, rnd.uniform(.7, 1.1)); keep_out.append((x, y - 6))
    for _ in range(900):  # forests in the west and south-east
        x, y = rnd.randint(10, 950), rnd.randint(30, 630)
        dens = 0.5 if x < 300 else 0.28 if y > 420 else 0.08
        if rnd.random() < dens and free(x, y, 18): tree(img, x, y, rnd.uniform(.55, .75)); keep_out.append((x, y - 4))
    for _ in range(70):
        x, y = rnd.randint(10, 950), rnd.randint(10, 630)
        if free(x, y, 22): snowflake(img, x, y)
    img.save(os.path.join(A, 'Map3.png'))

# ---- castles (image coords, y down) and links ----
CASTLES_IMG = [  # id, x, y
    (39, 150, 440), (40, 95, 330), (41, 265, 420), (42, 215, 255), (43, 340, 165), (44, 95, 150),
    (45, 300, 345), (46, 505, 410), (47, 470, 205), (48, 660, 455), (49, 640, 230), (50, 820, 465),
    (51, 735, 135), (52, 880, 230), (53, 570, 85), (54, 845, 95)]
LINKS = [(39, 40), (39, 41), (40, 42), (41, 45), (42, 44), (42, 43), (45, 46), (43, 47), (45, 47), (46, 48),
         (47, 49), (48, 50), (49, 51), (50, 52), (51, 53), (52, 54), (53, 54), (49, 52)]
POS = {i: (x, y) for i, x, y in CASTLES_IMG}

def path_points(a, b, gap=30, step=22):
    (x0, y0), (x1, y1) = POS[a], POS[b]; L = math.hypot(x1 - x0, y1 - y0); n = int((L - 2 * gap) / step)
    pts = []
    for k in range(n + 1):
        t = (gap + k * (L - 2 * gap) / max(n, 1)) / L
        x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
        bend = 10 * math.sin(math.pi * t) * (1 if (a + b) % 2 else -1)
        nx, ny = -(y1 - y0) / L, (x1 - x0) / L
        pts.append((round(x + nx * bend), round(y + ny * bend)))
    return pts

PATHS = {(a, b): path_points(a, b) for a, b in LINKS}
def near_path(x, y):
    return any(math.hypot(x - px, y - py) < 16 for pts in PATHS.values() for px, py in pts)

def data():
    tomap = lambda p: [float(p[0]), float(H - p[1])]
    castles = {i: tomap((x, y)) for i, x, y in CASTLES_IMG}
    conns = [{'from': a, 'to': b, 'points': [tomap(p) for p in PATHS[(a, b)]], 'mapLink': False} for a, b in LINKS]
    conns.insert(0, {'from': 39, 'to': 1, 'points': [tomap((118, 468)), tomap((100, 492))], 'mapLink': True, 'start': True})
    conns.append({'from': 54, 'to': 1000, 'points': [tomap((878, 72)), tomap((898, 58))], 'mapLink': True})
    return {'castles': castles, 'connections': conns}

if __name__ == '__main__':
    build(); write_js()
    print('map ok')

def write_js():
    p = os.path.join(os.path.dirname(__file__), '..', 'src', 'north-map.js')
    open(p, 'w').write('// Generated by tools/art_map.py: Northern Realm castle positions and path dots (map coords, y up).\n'
                       'const NORTH_MAP=' + json.dumps(data(), separators=(',', ':')) + ';\nObject.assign(exports,{NORTH_MAP});\n')
