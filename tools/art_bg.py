"""Snow versions of the medieval battle backgrounds (Northern Realm)."""
import os, sys, colorsys, math, random
from PIL import Image
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
A = os.path.join(os.path.dirname(__file__), '..', 'assets')

def snowify(im, sky='day'):
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    rgb = a[..., :3]; out = rgb.copy()
    mx = rgb.max(-1); mn = rgb.min(-1); v = mx; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    H, W = v.shape; yy = np.repeat(np.arange(H)[:, None], W, 1)
    green = (h > 0.12) & (h < 0.47) & (s > 0.08)
    # snow: brightness kept as shading, cold tint
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    dark_pine = green & (lum < 0.36)
    sv = np.clip(0.30 + 0.85 * lum, 0, 1)
    snow = np.stack([sv * 0.88 + 0.04, sv * 0.94 + 0.03, np.minimum(1, sv * 1.0 + 0.06)], -1)
    pine = np.stack([0.16 + 0.5 * lum, 0.30 + 0.5 * lum, 0.32 + 0.55 * lum], -1)
    out = np.where(green[..., None], snow, out)
    out = np.where(dark_pine[..., None], pine, out)
    # water: colder and a bit darker
    water = (h > 0.5) & (h < 0.62) & (s > 0.35) & (yy > 60)
    wv = np.stack([0.25 + 0.45 * lum, 0.45 + 0.4 * lum, 0.62 + 0.3 * lum], -1)
    out = np.where(water[..., None], wv, out)
    # sky (top, light blue, low-mid saturation): paler, greyer
    # earth: darker, desaturated
    earth = (h < 0.14) & (s > 0.2) & (s < 0.75) & (yy > H * 0.6)
    ev = np.stack([0.3 + 0.55 * lum, 0.3 + 0.5 * lum, 0.33 + 0.5 * lum], -1)
    out = np.where(earth[..., None], ev, out)
    res = np.concatenate([np.clip(out, 0, 1), a[..., 3:]], -1)
    return Image.fromarray((res * 255).round().astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    fs = sys.argv[1:]
    W = Image.new('RGB', (1440, 320 * ((len(fs) + 2) // 3)))
    for i, f in enumerate(fs):
        W.paste(snowify(Image.open(os.path.join(A, f))).convert('RGB'), ((i % 3) * 480, (i // 3) * 320))
    W.resize((W.width * 3 // 4, W.height * 3 // 4)).save('/tmp/claude-0/sp/snow.png')

def aurora(im, seed=1):
    """Sunset scene -> polar night with aurora and stars; landscape shifted to cold blues."""
    rnd = random.Random(seed)
    a = np.asarray(snowify(im)).astype(np.float32) / 255
    rgb = a[..., :3]; H, W = rgb.shape[:2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1); mn = rgb.min(-1); d = np.maximum(mx - mn, 1e-6); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    yy = np.repeat(np.arange(H)[:, None], W, 1); xx = np.repeat(np.arange(W)[None, :], H, 0)
    warm = ((h < 0.17) | (h > 0.96)) & (s > 0.45) & (mx > 0.9)
    # the sky = warm pixels connected to the top rows (flood fill by rows)
    sky = np.zeros((H, W), bool); sky[0] = warm[0]
    for y in range(1, H): sky[y] = warm[y] & (sky[y - 1] | np.roll(sky[y - 1], 1) | np.roll(sky[y - 1], -1))
    t = yy / H
    night = np.stack([0.04 + 0.10 * t, 0.06 + 0.16 * t, 0.16 + 0.30 * t], -1)
    # aurora: a few wavy translucent green/teal ribbons
    au = np.zeros((H, W)); col = np.zeros((H, W, 3))
    for k in range(3):
        base = 40 + 30 * k + rnd.uniform(-8, 8); amp = rnd.uniform(10, 22); f = rnd.uniform(0.008, 0.02); ph = rnd.uniform(0, 6)
        cy = base + amp * np.sin(xx * f + ph) + 6 * np.sin(xx * f * 3.1 + ph * 2)
        band = np.exp(-((yy - cy) / (7 + 3 * k)) ** 2) * (0.55 - 0.12 * k)
        streak = 0.8 + 0.2 * np.sin(xx * 0.9 + k) * np.sin(xx * 0.13)  # vertical curtain streaks
        band = band * streak
        c = np.array([[0.25, 1.0, 0.55], [0.3, 0.95, 0.85], [0.6, 0.5, 1.0]][k])
        col += band[..., None] * c; au += band
    sky_rgb = np.clip(night + col * 0.8, 0, 1)
    # quantise the aurora a little so it stays pixel-art-ish
    sky_rgb = np.round(sky_rgb * 24) / 24
    stars = np.zeros((H, W), bool)
    for _ in range(90):
        x, y = rnd.randrange(W), rnd.randrange(int(H * 0.45))
        stars[y, x] = True
    sky_rgb = np.where((stars & (au < 0.2))[..., None], np.array([0.9, 0.95, 1.0]), sky_rgb)
    land = np.stack([0.12 + 0.55 * lum, 0.16 + 0.6 * lum, 0.30 + 0.7 * lum], -1)
    out = np.where(sky[..., None], sky_rgb, np.clip(land, 0, 1))
    res = np.concatenate([out, a[..., 3:]], -1)
    return Image.fromarray((res * 255).round().astype(np.uint8), 'RGBA')

NORTH_BG = {
    'bg_north_hills.png': ('bg_grass.png', 'snow'), 'bg_north_hills2.png': ('bg_grass2.png', 'snow'),
    'bg_north_forest.png': ('bg_forest1.png', 'snow'), 'bg_north_coast.png': ('bg_beachforest.png', 'snow'),
    'bg_north_mountains.png': ('bg_mountains.png', 'snow'), 'bg_north_fjord.png': ('bg_water2.png', 'snow'),
    'bg_north_fjord2.png': ('bg_water3.png', 'snow'), 'bg_north_river.png': ('bg_river.png', 'snow'),
    'bg_north_plains.png': ('bg_plains.png', 'snow'),
    'bg_north_aurora.png': ('bg_sunset.png', 'aurora'), 'bg_north_aurora_peaks.png': ('bg_mountainsunset.png', 'aurora'),
    'bg_north_aurora_forest.png': ('bg_forestsunset.png', 'aurora'), 'bg_north_aurora_sea.png': ('bg_watersunset.png', 'aurora'),
    'north_victory.png': ('victory.png', 'dusk'), 'north_victory_night.png': ('victory_night.png', 'aurora_overlay'),
}

def dusk(im):
    """Red sunset -> violet polar dusk."""
    def f(r, g, b, a):
        import colorsys
        h, s_, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s_ < 0.15: return None
        h = (h + 0.80) % 1 if h < 0.2 or h > 0.9 else h
        r, g, b = colorsys.hsv_to_rgb(h, s_ * 0.8, v)
        return (round(r * 255), round(g * 255), round(b * 255), a)
    out = im.convert('RGBA').copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            q = f(*px[x, y])
            if q: px[x, y] = q
    return out

def aurora_overlay(im, seed=9):
    rnd = random.Random(seed)
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255; rgb = a[..., :3]; H, W = rgb.shape[:2]
    yy = np.repeat(np.arange(H)[:, None], W, 1); xx = np.repeat(np.arange(W)[None, :], H, 0)
    sky = (rgb.max(-1) > 0.03) & (yy < 230) & (rgb[..., 2] > rgb[..., 0])
    col = np.zeros((H, W, 3))
    for k in range(3):
        cy = 30 + 28 * k + 14 * np.sin(xx * 0.012 + k * 2) + 5 * np.sin(xx * 0.04 + k)
        band = np.exp(-((yy - cy) / (8 + 3 * k)) ** 2) * (0.5 - 0.1 * k) * (0.8 + 0.2 * np.sin(xx * 0.9 + k) * np.sin(xx * 0.13))
        col += band[..., None] * np.array([[0.25, 1.0, 0.55], [0.3, 0.95, 0.85], [0.6, 0.5, 1.0]][k])
    out = np.where(sky[..., None], np.round(np.clip(rgb + col * 0.7, 0, 1) * 24) / 24, rgb)
    for _ in range(70):
        x, y = rnd.randrange(W), rnd.randrange(150)
        if sky[y, x]: out[y, x] = [0.9, 0.95, 1.0]
    res = np.concatenate([out, a[..., 3:]], -1)
    return Image.fromarray((res * 255).round().astype(np.uint8), 'RGBA')

def build_all():
    for i, (dst, (src, kind)) in enumerate(NORTH_BG.items()):
        im = Image.open(os.path.join(A, src))
        out = snowify(im) if kind == 'snow' else aurora(im, i) if kind == 'aurora' else dusk(im) if kind == 'dusk' else aurora_overlay(im)
        out.convert('RGB').save(os.path.join(A, dst), optimize=True)

# ---------------------------------------------------------------- Eastern Realm
def hsv_map(im, fn):
    """fn(h,s,v,x,y) -> (h,s,v) applied per pixel (vectorised via numpy)."""
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255; rgb = a[..., :3]; H, W = rgb.shape[:2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; mx = rgb.max(-1); mn = rgb.min(-1); d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0); v = mx
    yy = np.repeat(np.arange(H)[:, None], W, 1); xx = np.repeat(np.arange(W)[None, :], H, 0)
    h2, s2, v2 = fn(h, s, v, xx, yy); h2 = h2 % 1; s2 = np.clip(s2, 0, 1); v2 = np.clip(v2, 0, 1)
    i = np.floor(h2 * 6); f = h2 * 6 - i; p = v2 * (1 - s2); q = v2 * (1 - s2 * f); t = v2 * (1 - s2 * (1 - f)); i = i.astype(int) % 6
    out = np.stack([np.choose(i, [v2, q, p, p, t, v2]), np.choose(i, [t, v2, v2, q, p, p]), np.choose(i, [p, p, t, v2, v2, q])], -1)
    res = np.concatenate([out, a[..., 3:]], -1)
    return Image.fromarray((res * 255).round().astype(np.uint8), 'RGBA')

def east_bamboo(im):   # forest -> yellow-green bamboo, hazy sky
    return hsv_map(im, lambda h, s, v, x, y: (np.where((h > .15) & (h < .45), h * .75 + .05, h), np.where((h > .15) & (h < .45), s * .85, s), np.where((h > .5) & (h < .65) & (s < .4), v * .98, v * 1.05)))
def east_terrace(im):  # grass hills -> bright paddies
    return hsv_map(im, lambda h, s, v, x, y: (np.where((h > .15) & (h < .45), h * .8 + .03, h), np.where((h > .15) & (h < .45), s * 1.1, s), v))
def east_volcano(im):  # mountains -> ash-grey rock with lava on the snow lines, hazy sky
    def f(h, s, v, x, y):
        sky = (h > .5) & (h < .65) & (s < .45) & (y < 260) & (v > .8); rock = (s < .4) & (y < 250) & ~sky; lava = rock & (v > .96) & (y < 75)
        h = np.where(lava, .05, np.where(rock, .02, np.where(sky, .09, h))); s = np.where(lava, .95, np.where(rock, .12, np.where(sky, .22, s)))
        v = np.where(lava, .95, np.where(rock, .18 + v * .3, np.where(sky, .62 + .3 * (y / 260), v)))
        return h, s, v
    return hsv_map(im, f)
def east_coast(im):    # beach forest -> teal sea, jade hills
    return hsv_map(im, lambda h, s, v, x, y: (np.where((h > .5) & (h < .62) & (s > .35), h - .07, np.where((h > .15) & (h < .45), h * .85 + .03, h)), s, v))
def east_blossom(im):  # sunset forest -> cherry blossom
    return hsv_map(im, lambda h, s, v, x, y: (np.where((h > .6) & (h < .85), .93, np.where((h < .1) | (h > .9), .95, h)), np.where((h > .6) & (h < .85), .35 + .3 * s, s * .8), np.where((h > .6) & (h < .85), .6 + .4 * v, v)))
def east_night(im):    # mountain sunset -> violet dusk with lanterns-ish warmth kept
    return hsv_map(im, lambda h, s, v, x, y: (np.where((h < .12) | (h > .9), h + .75, h), s * .9, v * .85))

EAST_BG = {'bg_east_bamboo.png': ('bg_forest1.png', east_bamboo), 'bg_east_bamboo2.png': ('bg_forestsunset.png', east_blossom),
           'bg_east_terrace.png': ('bg_grass.png', east_terrace), 'bg_east_terrace2.png': ('bg_grass2.png', east_terrace), 'bg_east_plains.png': ('bg_plains.png', east_terrace),
           'bg_east_volcano.png': ('bg_mountains.png', east_volcano), 'bg_east_volcano2.png': ('bg_mountainsunset.png', east_night),
           'bg_east_coast.png': ('bg_beachforest.png', east_coast), 'bg_east_sea.png': ('bg_water3.png', east_coast), 'bg_east_river.png': ('bg_river.png', east_terrace),
           'bg_east_sunset.png': ('bg_watersunset.png', east_night),
           'east_victory.png': ('victory.png', east_blossom), 'east_victory_night.png': ('victory_night.png', lambda im: hsv_map(im, lambda h, s, v, x, y: (h + .09, s, v)))}
def build_east():
    for dst, (src, fn) in EAST_BG.items(): fn(Image.open(os.path.join(A, src))).convert('RGB').save(os.path.join(A, dst), optimize=True)

# ---------------------------------------------------------------- Underworld
def cave(im, seed=1, lava_water=True):
    r = random.Random(seed)
    def f(h, s, v, x, y):
        blue = (h > .5) & (h < .76)
        sky = blue & (s < .3) & (v > .6) & (y < 230)
        water = blue & ~sky & (y > 120) & (v > .4)
        green = (h > .14) & (h < .46) & (s > .12)
        warm = ((h < .14) | (h > .9)) & (s > .4) & (v > .6) & (y < 240)   # sunsets, paths
        h2 = np.where(sky, .07, np.where(water, .06, np.where(green, .07, np.where(warm, .05, h))))
        s2 = np.where(sky, .3, np.where(water, .88, np.where(green, .22, np.where(warm, .5, s))))
        v2 = np.where(sky, .14 + .06 * (y / 260), np.where(water, .55 + .3 * v, np.where(green, v * .55, np.where(warm, v * .5, v))))
        return h2, s2, v2
    out = hsv_map(im, f if lava_water else (lambda h, s, v, x, y: f(h, s, v, x, y)))
    d = __import__('PIL.ImageDraw', fromlist=['ImageDraw']).Draw(out)
    for _ in range(26):   # stalactites hanging from the ceiling
        x = r.randint(0, 479); w = r.randint(4, 12); h = r.randint(14, 48)
        d.polygon([(x - w, 0), (x + w, 0), (x, h)], fill=(74, 60, 54, 255)); d.line([(x + w, 0), (x, h)], fill=(40, 32, 30, 255)); d.line([(x - w + 2, 0), (x - 1, h - 3)], fill=(96, 80, 72, 255))
    return out

UNDER_BG = {'bg_under_cavern.png': 'bg_grass.png', 'bg_under_cavern2.png': 'bg_grass2.png', 'bg_under_lavalake.png': 'bg_water2.png', 'bg_under_lavariver.png': 'bg_river.png',
            'bg_under_fungus.png': 'bg_forest1.png', 'bg_under_crystal.png': 'bg_mountains.png', 'bg_under_deep.png': 'bg_plains.png', 'bg_under_forge.png': 'bg_mountainsunset.png',
            'bg_under_abyss.png': 'bg_sunset.png', 'bg_under_shore.png': 'bg_beachforest.png',
            'under_victory.png': 'victory.png', 'under_victory_night.png': 'victory_night.png'}
def build_under():
    for i, (dst, src) in enumerate(UNDER_BG.items()):
        im = Image.open(os.path.join(A, src))
        out = cave(im, i + 1) if not dst.startswith('under_victory') else hsv_map(im, lambda h, s, v, x, y: (np.where(s > .2, .05, h), s, v * .8))
        out.convert('RGB').save(os.path.join(A, dst), optimize=True)
