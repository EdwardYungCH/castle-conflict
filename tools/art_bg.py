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
