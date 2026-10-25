"""Shared helpers for the v3.1 unit redesign: head detection, hat removal, drawing headgear / hair / capes
anchored to the face so every animation frame gets the same look."""
from PIL import Image
from pix import *

O = (50, 54, 71, 255)
SKIN = {(195, 136, 70), (255, 166, 88), (236, 150, 80), (255, 180, 110)}
HAIR = {(140, 105, 8), (225, 181, 45), (178, 110, 44)}

def is_skin(p): return p[3] > 0 and p[:3] in SKIN
def opaque(p): return p[3] > 0 and p[:3] != O[:3]

def face_box(f):
    """(x0, x1, top, bottom) of the skin pixels of the face (first skin run from the top), or None."""
    px = f.load(); W, H = f.size
    rows = [y for y in range(H) for x in range(W) if is_skin(px[x, y])]
    if not rows: return None
    top = min(rows); bottom = top
    while bottom + 1 < H and any(is_skin(px[x, bottom + 1]) for x in range(W)) and bottom - top < 8: bottom += 1
    xs = [x for y in range(top, bottom + 1) for x in range(W) if is_skin(px[x, y])]
    return min(xs), max(xs), top, bottom

def body_top(f):
    """Topmost non-outline opaque row."""
    px = f.load(); W, H = f.size
    for y in range(H):
        if any(opaque(px[x, y]) for x in range(W)): return y
    return 0

def clear_above(f, y_limit, x0=None, x1=None):
    """Erase everything (outline included) above row y_limit, optionally only in [x0, x1]."""
    px = f.load(); W, H = f.size
    for y in range(0, max(0, y_limit)):
        for x in range(W):
            if x0 is not None and (x < x0 or x > x1): continue
            px[x, y] = (0, 0, 0, 0)

def blit(f, part, x, y):
    f.alpha_composite(part, (max(0, x), max(0, y))) if x >= 0 and y >= 0 else _blit_neg(f, part, x, y)

def _blit_neg(f, part, x, y):
    px = part.load()
    for j in range(part.height):
        for i in range(part.width):
            p = px[i, j]
            if p[3]: put(f, x + i, y + j, p)

def recolor_where(f, test, color_fn):
    px = f.load(); W, H = f.size
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if opaque(p) and test(x, y, p): px[x, y] = color_fn(x, y, p)

def tint_range(f, hmin, hmax, smin, fn, ymin=0, ymax=999):
    """Recolor pixels whose hue is in [hmin,hmax] and saturation >= smin (rows ymin..ymax)."""
    def test(x, y, p):
        if not (ymin <= y <= ymax): return False
        h, s, v = hsv(*p[:3]); return hmin <= h <= hmax and s >= smin
    recolor_where(f, test, fn)

def grey_range(f, smax, fn, ymin=0, ymax=999, vmin=0):
    def test(x, y, p):
        if not (ymin <= y <= ymax): return False
        h, s, v = hsv(*p[:3]); return s <= smax and v >= vmin
    recolor_where(f, test, fn)

def shade(c, k):
    return (max(0, min(255, int(c[0] * k))), max(0, min(255, int(c[1] * k))), max(0, min(255, int(c[2] * k))), 255)

# ---- headgear generators (all return RGBA parts with outline, anchored by the caller) ----
def hood(w, color):
    """Round hood: a dome of width w, 6 rows tall."""
    rows = []
    for y in range(6):
        inset = max(0, 2 - y) if y < 2 else 0
        rows.append('.' * inset + '#' * (w - 2 * inset) + '.' * inset)
    return outline(from_rows(rows, {'#': color}))

def dome_helmet(w, color, rim=None):
    rows = ['.' + '#' * (w - 2) + '.', '#' * w, '#' * w, ('r' * w) if rim else '#' * w]
    return outline(from_rows(rows, {'#': color, 'r': rim or color}))

def straw_hat(w=14):
    rows = []
    for y in range(5):
        n = 2 + y * 3
        if n > w: n = w
        pad = (w - n) // 2
        rows.append('.' * pad + ('S' if y < 2 else 's') * n + '.' * (w - n - pad))
    return outline(from_rows(rows, {'S': (236, 206, 110, 255), 's': (206, 170, 80, 255)}))

def mohawk(h=4, color=(220, 50, 40, 255)):
    rows = ['..#..'] * (h - 1) + ['.###.']
    return outline(from_rows(rows, {'#': color}))

def crest(color=(255, 214, 92, 255)):
    rows = ['#....#', '#....#', '.#..#.', '.####.']
    return outline(from_rows(rows, {'#': color}))

def halo(w=10, color=(255, 230, 120, 255)):
    return from_rows(['.' + '#' * (w - 2) + '.'], {'#': color})

def bun(color=(40, 34, 40, 255)):
    rows = ['.##.', '####', '####', '.##.']
    return outline(from_rows(rows, {'#': color}))

def lightning():
    rows = ['..#', '.#.', '##.', '.#.', '#..']
    return from_rows(rows, {'#': (255, 240, 120, 255)})

def scarf_tail(k, color=(220, 50, 40, 255)):
    wob = [0, 1, 0, -1][k % 4]
    rows = ['.....', '.....', '.....']
    im = Image.new('RGBA', (6, 3), (0, 0, 0, 0))
    for x in range(6): put(im, x, 1 + (wob if x > 2 else 0), color)
    return im
